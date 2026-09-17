// /api/payment-status.js
// Estado de pago del cliente, leído del CRM (la MISMA fuente que authorize.js:
// la tabla `clientes` del Supabase del CRM). Sirve para mostrar en la app un
// recordatorio de pago cuando la fecha de corte del mes ya pasó y el coach
// todavía no marcó el pago.
//
// Regla ("debe pagar") — se evalúa sobre TODOS los meses del historial
// reciente, no solo el mes en curso:
//   - cliente activo con dia_pago configurado, y
//   - de cada mes desde que arrancó (máx. 12 atrás) cuya fecha de corte ya
//     pasó, se descartan los que están cubiertos (pago marcado como pagado o
//     mes de cortesía en $0); lo que queda es la deuda.
// El recordatorio PERSISTE día a día hasta que el coach marca los pagos en el
// CRM (tabla `pagos`); en cuanto los marca, este endpoint devuelve due:false y
// el aviso desaparece solo. No expone datos de otros clientes.
//
// OJO (bug que esto corrige): antes solo se miraba el MES ACTUAL y se salía
// con due:false si el día de hoy aún no había pasado el día de corte. Un
// cliente con dos meses vencidos y corte el día 15 no veía NADA entre el 1 y
// el 15 de cada mes — justo el caso reportado.
//
// Config (Vercel → proyecto mealtracker → Environment Variables) — las MISMAS
// que ya usa authorize.js:
//   CRM_SUPABASE_URL          → Project URL del Supabase del CRM
//   CRM_SUPABASE_SERVICE_KEY  → key service_role del Supabase del CRM
//
// GET  /api/payment-status?name=...   (o POST { name })
//   → { due: bool, dia_corte?, dias_vencido?, meses_deuda?, monto?,
//       monto_total?, moneda?, meses? }

import { guard, checkOrigin } from './_guard.js';
// La regla de cobro vive en _pagos.js, compartida con push-cron.js: el banner
// de la app y el recordatorio push tienen que decirle LO MISMO al cliente.
import { normalizeName, leerContexto, evaluarCliente } from './_pagos.js';

const CRM_URL = (process.env.CRM_SUPABASE_URL || '').replace(/\/+$/, ''); // sin barra final: '...supabase.co/' rompia la URL (doble // -> 404)
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

// CORS. Hasta ahora este endpoint solo lo llamaba la app del cliente, que vive
// en el MISMO dominio, así que no hacía falta. Ahora también lo llama el CRM
// —otro dominio— para la columna "En su app" de la tabla de pagos, y sin estas
// cabeceras el navegador ni siquiera llega a preguntar: manda un OPTIONS de
// permiso, este archivo respondía 405, y el CRM solo veía "Failed to fetch".
//
// El Origin se refleja SOLO si checkOrigin lo aprueba (el dominio propio, más
// lo que haya en ALLOWED_ORIGINS de Vercel). Mismo patrón que coach-auth.js y
// coach-data.js, que es como el CRM ya lee los datos de la app.
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !checkOrigin(req)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  // GET puede venir sin Origin (navegadores con privacidad endurecida); no
  // escribe nada, solo lee, así que lo permitimos igual que en /api/sync.
  if (!guard(req, res, { key: 'payment-status', limit: 40, allowNoOrigin: req.method === 'GET' })) return;

  // Modo diagnóstico (solo para el coach): ?debug=1 añade "reason" y "crm_host"
  // (el host del Supabase que la función está usando). Así verificas que apunte
  // al CRM correcto sin tener que ver la variable en Vercel (que la oculta por
  // seguridad). NO expone la key ni datos de otros clientes: el host del
  // Supabase ya viaja al navegador en config.js, no es secreto.
  const debug = req.method === 'GET' && (req.query.debug === '1' || req.query.debug === 'true');
  const crmHost = (() => { try { return new URL(CRM_URL).host; } catch (e) { return CRM_URL || '(vacío)'; } })();
  const out = (obj, reason) => res.status(200).json(debug ? { ...obj, reason, crm_host: crmHost } : obj);

  // Sin CRM configurado no molestamos con recordatorios (fail-safe).
  if (!CRM_URL || !CRM_KEY) {
    return out({ due: false }, 'CRM_SUPABASE_URL o CRM_SUPABASE_SERVICE_KEY no están configuradas en Vercel');
  }

  // Prueba de escritura en ia_uso (?testlog=1): inserta una fila marcada
  // '__PRUEBA__' y devuelve el resultado HTTP. Sirve para saber si el tablero
  // puede grabar, sin depender del flujo del chat. Borra esa fila del tablero
  // o en Supabase cuando confirmes que funciona.
  if (req.method === 'GET' && (req.query.testlog === '1' || req.query.testlog === 'true')) {
    try {
      const r = await fetch(`${CRM_URL}/rest/v1/ia_uso`, {
        method: 'POST',
        headers: {
          'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          cliente_nombre: '__PRUEBA__', modelo: 'test', accion: 'test',
          input_tokens: 1, output_tokens: 1, costo_usd: 0, mensaje: 'prueba de escritura',
        }),
      });
      const body = await r.text();
      return res.status(200).json({
        escritura_ok: r.ok, http: r.status, crm_host: crmHost,
        detalle: body ? body.slice(0, 300) : '(vacío = insert exitoso)',
      });
    } catch (e) {
      return res.status(200).json({ escritura_ok: false, error: String(e).slice(0, 200), crm_host: crmHost });
    }
  }

  const headers = { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}` };

  // ── "LO VIO" ─────────────────────────────────────────────────────────
  // La app avisa cuando el banner de pago se le PINTÓ en pantalla al cliente.
  // Se guarda la hora en clientes.aviso_pago_visto_at del CRM, para que el
  // coach pueda ver en su tablero si el recordatorio llegó a los ojos del
  // cliente o si está reclamando algo que nunca vio.
  //
  // Solo marca la hora: ni un dato más. Y si la columna todavía no existe
  // (falta correr el SQL), no pasa nada — la app nunca se entera.
  if (req.method === 'POST' && req.body?.visto === true) {
    const n = normalizeName(req.body?.name);
    if (!n) return res.status(200).json({ ok: false });
    try {
      const rc = await fetch(`${CRM_URL}/rest/v1/clientes?select=id,nombre`, { headers });
      const cs = rc.ok ? await rc.json() : [];
      const c = Array.isArray(cs) ? cs.find(x => normalizeName(x.nombre) === n) : null;
      if (c) {
        await fetch(`${CRM_URL}/rest/v1/clientes?id=eq.${c.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ aviso_pago_visto_at: new Date().toISOString() }),
        });
      }
    } catch (e) { /* nunca rompe la app del cliente */ }
    return res.status(200).json({ ok: true });
  }

  // ── MODO LOTE (para el CRM) ──────────────────────────────────────────
  // El coach necesita ver de un vistazo a QUIÉN le está apareciendo el aviso.
  // Preguntar cliente por cliente serían 30 viajes; con `names` va uno solo.
  // Corre EXACTAMENTE el mismo cálculo que ve el cliente — no una copia de la
  // regla en el CRM, que tarde o temprano se despegaría de esta.
  if (req.method === 'POST' && Array.isArray(req.body?.names)) {
    const nombres = req.body.names.slice(0, 200).map(x => String(x || ''));
    const salida = {};
    try {
      const ctx = await leerContexto(headers);
      for (const nom of nombres) salida[nom] = await evaluarCliente(nom, ctx, headers);
    } catch (e) {
      return res.status(200).json({ error: 'no pude leer el CRM', clientes: {} });
    }
    return res.status(200).json({ clientes: salida });
  }

  const rawName = req.method === 'POST' ? req.body?.name : req.query.name;
  const normalized = normalizeName(rawName);
  if (!normalized) return out({ due: false }, 'nombre vacío en la petición');

  try {
    const ctx = await leerContexto(headers);
    if (ctx.error) return out({ due: false }, ctx.error);
    const cliente = ctx.clientes.find(c => normalizeName(c.nombre) === normalized);
    if (!cliente) return out({ due: false }, `ningún cliente del CRM coincide con el nombre "${rawName}" (revisa que el nombre en la app sea igual al del CRM)`);

    const v = await evaluarCliente(cliente.nombre, ctx, headers);
    if (!v.due) return out({ due: false, dia_corte: v.dia_corte, detalle: v.detalle }, v.motivo);

    const payload = {
      due: true,
      dia_corte: v.dia_corte,
      dias_vencido: v.dias_vencido,
      meses_deuda: v.meses_deuda,
      meses: v.meses,
      monto: v.monto,
      monto_total: v.monto_total,
      moneda: v.moneda,
    };
    if (debug) {
      payload.debug = {
        crm_host: crmHost,
        cliente: { nombre: cliente.nombre, monto_ficha: cliente.monto, dia_pago: v.dia_corte, fecha_inicio: cliente.fecha_inicio || null },
        hoy: ctx.hoyYmd,
        meses_evaluados: v.meses_evaluados,
        detalle: v.detalle,
        suma: v.monto_total,
      };
    }
    return res.status(200).json(payload);
  } catch (e) {
    // Ante cualquier fallo, no mostramos recordatorio (nunca bloqueamos la app).
    return res.status(200).json({ due: false });
  }
}
