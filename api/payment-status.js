// /api/payment-status.js
// Estado de pago del cliente, leído del CRM (la MISMA fuente que authorize.js:
// la tabla `clientes` del Supabase del CRM). Sirve para mostrar en la app un
// recordatorio de pago cuando la fecha de corte del mes ya pasó y el coach
// todavía no marcó el pago.
//
// Regla ("debe pagar"):
//   - cliente activo con dia_pago configurado, y
//   - hoy ya pasó su fecha de corte de ESTE mes (desde el día siguiente), y
//   - no hay un pago marcado como pagado para el mes actual.
// El recordatorio PERSISTE día a día hasta que el coach marca el pago en el
// CRM (tabla `pagos`); en cuanto lo marca, este endpoint devuelve due:false y
// el banner desaparece solo. No expone datos de otros clientes.
//
// Config (Vercel → proyecto mealtracker → Environment Variables) — las MISMAS
// que ya usa authorize.js:
//   CRM_SUPABASE_URL          → Project URL del Supabase del CRM
//   CRM_SUPABASE_SERVICE_KEY  → key service_role del Supabase del CRM
//
// GET  /api/payment-status?name=...   (o POST { name })
//   → { due: bool, dia_corte?: number, monto?: number, moneda?: string }

import { guard } from './_guard.js';

const CRM_URL = process.env.CRM_SUPABASE_URL;
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

// Igual que en authorize.js: ignora mayúsculas, tildes y espacios de más.
const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

// Fecha de HOY en hora de Colombia. Los servidores de Vercel corren en UTC
// (5 horas adelante de Bogotá): sin esto, desde las ~7pm hora local el server
// ya cree que es "mañana" y el recordatorio aparecería la noche del MISMO día
// de corte (debe empezar al día siguiente), y el cambio de mes se adelantaría
// 5 horas. en-CA da el formato YYYY-MM-DD directo; Colombia no tiene horario
// de verano, así que la zona es estable todo el año.
function todayInBogota() {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })
    .format(new Date()); // "YYYY-MM-DD"
  const [y, m, d] = ymd.split('-');
  return { mes: `${y}-${m}`, dia: Number(d) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  // GET puede venir sin Origin (navegadores con privacidad endurecida); no
  // escribe nada, solo lee, así que lo permitimos igual que en /api/sync.
  if (!guard(req, res, { key: 'payment-status', limit: 40, allowNoOrigin: req.method === 'GET' })) return;

  // Sin CRM configurado no molestamos con recordatorios (fail-safe).
  if (!CRM_URL || !CRM_KEY) {
    return res.status(200).json({ due: false });
  }

  const rawName = req.method === 'POST' ? req.body?.name : req.query.name;
  const normalized = normalizeName(rawName);
  // Modo diagnóstico (solo para el coach): ?debug=1 añade un campo "reason"
  // que explica POR QUÉ due=false. No revela datos de otros clientes.
  const debug = req.method === 'GET' && (req.query.debug === '1' || req.query.debug === 'true');
  const out = (obj, reason) => res.status(200).json(debug ? { ...obj, reason } : obj);
  if (!normalized) return out({ due: false }, 'nombre vacío en la petición');

  const headers = { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}` };

  try {
    // 1) Buscar al cliente en el CRM por nombre normalizado.
    const rc = await fetch(
      `${CRM_URL}/rest/v1/clientes?select=id,nombre,estado,dia_pago,monto,moneda`,
      { headers }
    );
    if (!rc.ok) return out({ due: false }, `no pude leer la tabla clientes del CRM (HTTP ${rc.status})`);
    const clientes = await rc.json();
    if (!Array.isArray(clientes)) return out({ due: false }, 'respuesta inesperada de clientes');
    const cliente = clientes.find(c => normalizeName(c.nombre) === normalized);
    if (!cliente) return out({ due: false }, `ningún cliente del CRM coincide con el nombre "${rawName}" (revisa que el nombre en la app sea igual al del CRM)`);

    // Solo clientes activos con día de pago válido reciben recordatorio.
    const estado = String(cliente.estado || 'activo').toLowerCase();
    const diaPago = Number(cliente.dia_pago);
    if (estado !== 'activo') {
      return out({ due: false }, `el cliente está en estado "${estado}", no "activo"`);
    }
    if (!Number.isFinite(diaPago) || diaPago < 1 || diaPago > 31) {
      return out({ due: false }, `el cliente NO tiene "día de pago" (fecha de corte) configurado en el CRM — este es el motivo más común. Ábrele la ficha en el CRM y ponle su día de corte.`);
    }

    // 2) ¿La fecha de corte de este mes ya pasó? Recordatorio DESDE EL DÍA
    //    SIGUIENTE: en el día de corte todavía no molestamos. Fechas en hora
    //    de Colombia (ver todayInBogota).
    const { mes, dia: diaHoy } = todayInBogota();
    if (diaHoy <= diaPago) {
      return out({ due: false, dia_corte: diaPago }, `hoy es día ${diaHoy} y su corte es el ${diaPago}: el aviso empieza al día SIGUIENTE del corte (mañana o después)`);
    }

    // 3) ¿El mes ya está cubierto? Cubierto = pago marcado como pagado, O un
    //    registro con monto 0 (mes sin cobro: premio del reto, cortesía…).
    const rp = await fetch(
      `${CRM_URL}/rest/v1/pagos?select=pagado,monto&cliente_id=eq.${cliente.id}&mes=eq.${mes}`,
      { headers }
    );
    let cubierto = false;
    if (rp.ok) {
      const pagos = await rp.json();
      if (Array.isArray(pagos) && pagos.length) {
        // Cubierto SOLO si: hay un pago marcado como pagado, O el mes ENTERO es
        // sin cobro (TODOS los registros en 0 → cortesía/premio). Antes bastaba
        // con que UN registro tuviera monto 0: si el mes tenía un placeholder en
        // $0 junto al cobro real, el cliente en deuda dejaba de recibir el aviso.
        const anyPaid = pagos.some(p => p.pagado === true);
        const maxMonto = Math.max(0, ...pagos.map(p => Number(p.monto) || 0));
        cubierto = anyPaid || maxMonto === 0;
      }
    }
    if (cubierto) {
      return out({ due: false, dia_corte: diaPago }, `el mes ${mes} ya figura CUBIERTO en la tabla pagos (marcado como pagado o con monto 0). Si crees que debe, revisa si hay un pago marcado por error.`);
    }

    // Debe: la fecha de corte pasó y no hay pago del mes.
    return res.status(200).json({
      due: true,
      dia_corte: diaPago,
      monto: (cliente.monto != null && Number(cliente.monto) > 0) ? Number(cliente.monto) : null,
      moneda: cliente.moneda || 'COP',
    });
  } catch (e) {
    // Ante cualquier fallo, no mostramos recordatorio (nunca bloqueamos la app).
    return res.status(200).json({ due: false });
  }
}
