// /api/uso  (POST)
// (vercel.json lo reescribe a /api/training?modulo=uso: límite de funciones del plan)
// La app manda aquí, una vez por día y por cosa, la sección que abrió (Dash,
// Entreno, Comida, Recetas, Aprende, Comunidad, Chat) y las recetas que
// abrió. Queda en `app_uso` (SQL: sql/app-uso.sql), una fila por cliente y
// por día, y el CRM lo muestra en Enganche. Solo inserta o actualiza su
// fila del día; nunca borra nada.
import { guard } from './_guard.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const corto = (v, n) => (v == null ? '' : String(v).slice(0, n));
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });
const esDia = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const SECCIONES_USO = ['dash', 'entreno', 'comida', 'recetas', 'aprende', 'comunidad', 'chat'];
const TOPE_RECETAS = 40;

// Respira: cada vez que la termina se guarda una entrada { h: 'HH:MM',
// s: segundos, m: minutos elegidos, o: desde dónde } dentro de la misma
// fila del día (secciones.respira), sin tabla nueva.
const TOPE_RESPIRA = 20;
const MES_OK = (m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m);
// Ficha del ejercicio: { h: 'HH:MM', e: id del ejercicio, n: su nombre }, en secciones.fichas.
const TOPE_FICHAS = 40;
const fichaValida = (x) => x && /^\d{2}:\d{2}$/.test(String(x.h || '')) && (x.e || x.n);
const respiraValida = (x) => x && /^\d{2}:\d{2}$/.test(String(x.h || '')) && Number.isFinite(+x.s) && +x.s >= 0 && +x.s <= 3600;

// La fila del día con lo nuevo sumado (función pura: la prueba la usa).
export function fusionarUso(ex, { secciones = [], recetas = [], respira = [], resumen = null, fichas = [] }) {
  const s = { ...((ex && ex.secciones) || {}) };
  // El resumen del mes ya se le mostró (AAAA-MM del mes resumido): así no
  // vuelve a salir aunque abra la app en otro teléfono o en el navegador.
  if (MES_OK(resumen)) s.resumen_mes = resumen;
  secciones.filter(x => SECCIONES_USO.includes(x)).forEach(x => { s[x] = 1; });
  const nuevas = (Array.isArray(respira) ? respira : []).filter(respiraValida)
    .map(x => ({ h: String(x.h), s: Math.round(+x.s), m: [1, 3, 5].includes(+x.m) ? +x.m : null, o: corto(x.o, 20) || null }));
  if (nuevas.length) s.respira = [...(Array.isArray(s.respira) ? s.respira : []), ...nuevas].slice(-TOPE_RESPIRA);
  const nf = (Array.isArray(fichas) ? fichas : []).filter(fichaValida).map(x => ({ h: String(x.h), e: corto(x.e, 40) || null, n: corto(x.n, 80) || null }));
  if (nf.length) s.fichas = [...(Array.isArray(s.fichas) ? s.fichas : []), ...nf].slice(-TOPE_FICHAS);
  const r = [...((ex && Array.isArray(ex.recetas)) ? ex.recetas : [])];
  recetas.map(x => corto(x, 120).trim()).filter(Boolean).forEach(x => { if (!r.includes(x) && r.length < TOPE_RECETAS) r.push(x); });
  return { secciones: s, recetas: r };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });
  if (!guard(req, res, { key: 'uso', limit: 30 })) return;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Supabase env vars not configured' });
  const b = req.body || {};
  const name = corto(b.name, 120) || null;
  const user_id = isUuid(b.user_id) ? b.user_id : null;
  const clave = user_id || (name ? `n:${name}` : null);
  if (!clave || !esDia(b.hoy)) return res.status(200).json({ ok: false, error: 'sin cliente o sin día' });
  const tabla = `${SUPABASE_URL}/rest/v1/app_uso`;
  // ¿Ya vio el resumen de ese mes (en cualquier teléfono)? Por su clave o
  // por su nombre (sin importar mayúsculas), en cualquier día.
  if (b.consulta === 'resumen') {
    if (!MES_OK(b.mes)) return res.status(200).json({ ok: false });
    const q = (v) => `"${String(v).replace(/["\\]/g, '')}"`;
    const quien = [`clave.eq.${q(clave)}`, ...(name ? [`name.ilike.${q(name)}`] : [])].join(',');
    try {
      const r = await fetch(`${tabla}?select=id&or=${encodeURIComponent(`(${quien})`)}&secciones->>resumen_mes=eq.${b.mes}&limit=1`, { headers: H() });
      if (!r.ok) return res.status(200).json({ ok: false });
      const filas = await r.json();
      return res.status(200).json({ ok: true, visto: Array.isArray(filas) && filas.length > 0 });
    } catch (e) { return res.status(200).json({ ok: false }); }
  }
  const nuevo = { resumen: MES_OK(b.resumen) ? b.resumen : null, secciones: (Array.isArray(b.secciones) ? b.secciones : []).slice(0, 10).map(x => corto(x, 20)), recetas: (Array.isArray(b.recetas) ? b.recetas : []).slice(0, 10), respira: (Array.isArray(b.respira) ? b.respira : []).slice(0, 3), fichas: (Array.isArray(b.fichas) ? b.fichas : []).slice(0, 3) };
  try {
    const r = await fetch(`${tabla}?clave=eq.${encodeURIComponent(clave)}&fecha=eq.${b.hoy}&select=id,secciones,recetas`, { headers: H() });
    if (!r.ok) return res.status(200).json({ ok: false, sinTabla: r.status === 404 });
    const filas = await r.json();
    const ex = Array.isArray(filas) ? filas[0] : null;
    const f = fusionarUso(ex, nuevo);
    const ahora = new Date().toISOString();
    const w = ex
      ? await fetch(`${tabla}?id=eq.${ex.id}`, { method: 'PATCH', headers: { ...H(), Prefer: 'return=minimal' }, body: JSON.stringify({ ...f, ultima: ahora, name, ...(user_id ? { user_id } : {}) }) })
      : await fetch(tabla, { method: 'POST', headers: { ...H(), Prefer: 'return=minimal,resolution=merge-duplicates' }, body: JSON.stringify({ clave, name, user_id, fecha: b.hoy, ...f, primera: ahora, ultima: ahora }) });
    return res.status(200).json({ ok: w.ok });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}
