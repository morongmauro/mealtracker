// /api/bitacora  (POST)
// (vercel.json lo reescribe a /api/training?modulo=bitacora: límite de funciones del plan)
// La app manda aquí lo que le falla al cliente (un error de JavaScript, una
// promesa rota, una llamada a /api que contestó 5xx o no contestó) con la
// pantalla donde estaba, el teléfono y la hora. Queda en `app_errores` (SQL:
// sql/app-errores.sql) y el CRM lo muestra en la ficha del cliente, para
// no pedir pantallazos. Solo escribe filas nuevas; nunca borra nada.
import { guard } from './_guard.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const corto = (v, n) => (v == null ? '' : String(v).slice(0, n));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });
  // 20 por minuto por IP: un bucle de errores no inunda la tabla.
  if (!guard(req, res, { key: 'bitacora', limit: 20 })) return;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Supabase env vars not configured' });
  const b = req.body || {};
  const fila = {
    name: corto(b.name, 120) || null,
    user_id: isUuid(b.user_id) ? b.user_id : null,
    tipo: corto(b.tipo, 20) || 'error',
    mensaje: corto(b.mensaje, 400),
    detalle: corto(b.detalle, 1500) || null,
    pantalla: corto(b.pantalla, 160) || null,
    url: corto(b.url, 200) || null,
    ua: corto(b.ua, 200) || null,
    version: corto(b.version, 80) || null,
  };
  if (!fila.mensaje) return res.status(200).json({ ok: false, error: 'sin mensaje' });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_errores`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(fila),
    });
    return res.status(200).json({ ok: r.ok });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}
