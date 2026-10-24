// /api/recordatorios  (POST)
// (vercel.json lo reescribe a /api/training?modulo=recordatorios: límite de funciones del plan)
// La app manda aquí lo que le muestra el Dash como recordatorio (cada vez que
// cambia, no más de eso) y cuando el cliente toca uno. Queda en
// `app_recordatorios` (SQL: sql/recordatorios-app.sql) y el CRM lo muestra en
// Seguimiento: qué le sale, desde cuándo, si le aparece en pantalla, si lo
// tocó y si lo hizo. Solo inserta o actualiza sus filas; nunca borra nada.
import { guard } from './_guard.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const corto = (v, n) => (v == null ? '' : String(v).slice(0, n));
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });
const esDia = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// La fila de cada recordatorio: los de «Hoy» son de ese día; los demás, uno solo.
export const claveRec = (it, hoy) => (it.tipo === 'hoy' ? `${it.id}@${hoy}` : it.id);

// Lo nuevo a partir de lo que había (función pura: la prueba la usa).
export function fusionar(ex, it, { clave, name, user_id, hoy, ahora }) {
  const visible = !!it.visible;
  return {
    clave, name, user_id, rec_id: claveRec(it, hoy), tipo: it.tipo, texto: it.texto,
    primera_vez: ex ? ex.primera_vez : ahora,
    ultima_vez: ahora,
    ultimo_dia: hoy,
    dias_lista: ex ? (ex.ultimo_dia === hoy ? ex.dias_lista : ex.dias_lista + 1) : 1,
    dias_pantalla: visible ? (ex ? (ex.ultimo_pantalla === hoy ? ex.dias_pantalla : ex.dias_pantalla + 1) : 1) : (ex ? ex.dias_pantalla : 0),
    ultimo_pantalla: visible ? hoy : (ex ? ex.ultimo_pantalla : null),
    toques: ex ? ex.toques : 0,
    ultimo_toque: ex ? ex.ultimo_toque : null,
    hecho_en: it.hecho ? (ex && ex.hecho_en ? ex.hecho_en : ahora) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });
  if (!guard(req, res, { key: 'recordatorios', limit: 30 })) return;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Supabase env vars not configured' });
  const b = req.body || {};
  const name = corto(b.name, 120) || null;
  const user_id = isUuid(b.user_id) ? b.user_id : null;
  const clave = user_id || (name ? `n:${name}` : null);
  const hoy = esDia(b.hoy) ? b.hoy : new Date().toISOString().slice(0, 10);
  if (!clave) return res.status(200).json({ ok: false, error: 'sin cliente' });
  const ahora = new Date().toISOString();
  const tabla = `${SUPABASE_URL}/rest/v1/app_recordatorios`;
  try {
    // Tocó uno: se le suma el toque a su fila (si existe).
    if (b.toque) {
      const it = { id: corto(b.toque.id, 80), tipo: b.toque.tipo === 'hoy' ? 'hoy' : 'otro' };
      const rec = claveRec(it, hoy);
      const r = await fetch(`${tabla}?clave=eq.${encodeURIComponent(clave)}&rec_id=eq.${encodeURIComponent(rec)}&select=id,toques`, { headers: H() });
      const filas = r.ok ? await r.json() : [];
      if (!Array.isArray(filas) || !filas[0]) return res.status(200).json({ ok: false });
      const p = await fetch(`${tabla}?id=eq.${filas[0].id}`, { method: 'PATCH', headers: { ...H(), Prefer: 'return=minimal' }, body: JSON.stringify({ toques: (filas[0].toques || 0) + 1, ultimo_toque: ahora }) });
      return res.status(200).json({ ok: p.ok });
    }
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 30).map(x => ({
      id: corto(x && x.id, 80), texto: corto(x && x.texto, 200), hecho: !!(x && x.hecho), visible: !!(x && x.visible),
      tipo: ['hoy', 'coach', 'app'].includes(x && x.tipo) ? x.tipo : 'app',
    })).filter(x => x.id);
    if (!items.length) return res.status(200).json({ ok: true, n: 0 });
    const recs = items.map(it => claveRec(it, hoy));
    const lista = recs.map(r => `"${r.replace(/"/g, '')}"`).join(',');
    const r = await fetch(`${tabla}?clave=eq.${encodeURIComponent(clave)}&rec_id=in.(${encodeURIComponent(lista)})&select=*`, { headers: H() });
    if (!r.ok) return res.status(200).json({ ok: false, sinTabla: r.status === 404 });
    const previas = await r.json();
    const porRec = Object.fromEntries((Array.isArray(previas) ? previas : []).map(f => [f.rec_id, f]));
    const filas = items.map(it => fusionar(porRec[claveRec(it, hoy)], it, { clave, name, user_id, hoy, ahora }));
    const u = await fetch(`${tabla}?on_conflict=clave,rec_id`, {
      method: 'POST',
      headers: { ...H(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(filas),
    });
    return res.status(200).json({ ok: u.ok, n: filas.length });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}
