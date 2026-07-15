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
  if (!normalized) return res.status(200).json({ due: false });

  const headers = { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}` };

  try {
    // 1) Buscar al cliente en el CRM por nombre normalizado.
    const rc = await fetch(
      `${CRM_URL}/rest/v1/clientes?select=id,nombre,estado,dia_pago,monto,moneda`,
      { headers }
    );
    if (!rc.ok) return res.status(200).json({ due: false });
    const clientes = await rc.json();
    if (!Array.isArray(clientes)) return res.status(200).json({ due: false });
    const cliente = clientes.find(c => normalizeName(c.nombre) === normalized);
    if (!cliente) return res.status(200).json({ due: false });

    // Solo clientes activos con día de pago válido reciben recordatorio.
    const estado = String(cliente.estado || 'activo').toLowerCase();
    const diaPago = Number(cliente.dia_pago);
    if (estado !== 'activo' || !Number.isFinite(diaPago) || diaPago < 1 || diaPago > 31) {
      return res.status(200).json({ due: false });
    }

    // 2) ¿La fecha de corte de este mes ya pasó? Recordatorio DESDE EL DÍA
    //    SIGUIENTE: en el día de corte todavía no molestamos. Fechas en hora
    //    de Colombia (ver todayInBogota).
    const { mes, dia: diaHoy } = todayInBogota();
    if (diaHoy <= diaPago) {
      return res.status(200).json({ due: false, dia_corte: diaPago });
    }

    // 3) ¿Ya hay un pago marcado como pagado para el mes actual?
    const rp = await fetch(
      `${CRM_URL}/rest/v1/pagos?select=pagado&cliente_id=eq.${cliente.id}&mes=eq.${mes}`,
      { headers }
    );
    let pagado = false;
    if (rp.ok) {
      const pagos = await rp.json();
      if (Array.isArray(pagos)) pagado = pagos.some(p => p.pagado === true);
    }
    if (pagado) {
      return res.status(200).json({ due: false, dia_corte: diaPago });
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
