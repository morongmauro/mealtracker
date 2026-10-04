// ─────────────────────────────────────────────────────────────────────────
// /api/relojes · Relojes y anillos (Fitbit, Oura, Whoop, Polar)
//
// No es una función aparte: el plan de Vercel permite 12 y ya estaban todas.
// vercel.json lleva /api/relojes a /api/training?modulo=relojes y training.js
// entrega la petición a este archivo (el _ delante = no es función propia).
//
//   GET  ?accion=estado&name=…              → qué tiene conectado, qué marcas
//                                              están disponibles y los últimos
//                                              7 días que trajeron los relojes
//   GET  ?accion=conectar&proveedor=…&name=… → lleva a la página de la marca
//                                              para dar permiso
//   GET  ?code=…&state=…                     → la marca vuelve aquí: se canjea el
//                                              código, se guarda y se vuelve a
//                                              la app (/?relojes=<marca>)
//   POST { accion:'desconectar', name, proveedor }
//   POST { accion:'sincronizar', name }      → trae los últimos 7 días de cada
//                                              reloj (como mucho cada 3 horas)
//
// Cada marca necesita su app de desarrollador: <MARCA>_CLIENT_ID y
// <MARCA>_CLIENT_SECRET en Vercel (FITBIT_, OURA_, WHOOP_, POLAR_). Sin
// ellas esa marca sale como «Pronto» en la app y nada se rompe.
// La dirección de regreso que se registra en cada marca es la misma para
// todas: https://<dominio>/api/relojes
//
// Las llaves de acceso se guardan en relojes_conexiones (Supabase del CRM)
// y solo las lee este servidor: el CRM no puede verlas.
// ─────────────────────────────────────────────────────────────────────────
import crypto from 'node:crypto';
import { guard, cors } from './_guard.js';
import { normalizeName, hoyBogota, sumarDiasISO } from './_entreno.js';

const CRM_URL = process.env.CRM_SUPABASE_URL;
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;
const H = () => ({ apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json' });
const sb = async (path, opts = {}) => {
  const r = await fetch(`${CRM_URL}/rest/v1/${path}`, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

// ── Las marcas ────────────────────────────────────────────────────────────
// `basic`: el canje del código va con usuario:clave en la cabecera (Fitbit,
// Polar); las demás los mandan en el cuerpo.
export const PROVEEDORES = {
  fitbit: {
    autorizar: 'https://www.fitbit.com/oauth2/authorize',
    token: 'https://api.fitbit.com/oauth2/token',
    alcance: 'activity heartrate sleep',
    basic: true,
  },
  oura: {
    autorizar: 'https://cloud.ouraring.com/oauth/authorize',
    token: 'https://api.ouraring.com/oauth/token',
    alcance: 'daily heartrate workout personal',
  },
  whoop: {
    autorizar: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    token: 'https://api.prod.whoop.com/oauth/oauth2/token',
    alcance: 'offline read:recovery read:sleep read:cycles read:workout',
  },
  polar: {
    autorizar: 'https://flow.polar.com/oauth2/authorization',
    token: 'https://polarremote.com/v2/oauth2/token',
    alcance: 'accesslink.read_all',
    basic: true,
  },
};
const credenciales = (p) => {
  const K = p.toUpperCase();
  const id = process.env[`${K}_CLIENT_ID`], secreto = process.env[`${K}_CLIENT_SECRET`];
  return id && secreto ? { id, secreto } : null;
};
export const disponibles = () => Object.fromEntries(Object.keys(PROVEEDORES).map(p => [p, !!credenciales(p)]));

// ── El «state» firmado: quién y qué marca, sin poder falsificarlo ─────────
const SECRETO = () => process.env.RELOJES_SECRET || CRM_KEY || 'sin-secreto';
export function firmarEstado(clienteId, proveedor, ahora = Date.now()) {
  const base = `${clienteId}.${proveedor}.${ahora}`;
  const firma = crypto.createHmac('sha256', SECRETO()).update(base).digest('base64url');
  return Buffer.from(`${base}.${firma}`).toString('base64url');
}
export function leerEstado(state, ahora = Date.now()) {
  try {
    const [clienteId, proveedor, ts, firma] = Buffer.from(String(state || ''), 'base64url').toString().split('.');
    const esperada = crypto.createHmac('sha256', SECRETO()).update(`${clienteId}.${proveedor}.${ts}`).digest('base64url');
    if (!firma || firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
    if (ahora - Number(ts) > 30 * 60 * 1000) return null;   // 30 minutos para dar el permiso
    if (!PROVEEDORES[proveedor]) return null;
    return { clienteId, proveedor };
  } catch (e) { return null; }
}

const regreso = (req) => `${(process.env.APP_URL || `https://${req.headers.host}`).replace(/\/+$/, '')}/api/relojes`;

async function buscarCliente(nombre) {
  const buscado = normalizeName(nombre);
  if (!buscado) return null;
  const cl = await sb('clientes?select=id,user_id,nombre');
  return (Array.isArray(cl) ? cl : []).find(c => normalizeName(c.nombre) === buscado) || null;
}

// ── Canjear el código o renovar la llave ─────────────────────────────────
async function pedirToken(proveedor, campos) {
  const P = PROVEEDORES[proveedor], c = credenciales(proveedor);
  const cuerpo = new URLSearchParams(campos);
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (P.basic) headers.Authorization = 'Basic ' + Buffer.from(`${c.id}:${c.secreto}`).toString('base64');
  else { cuerpo.set('client_id', c.id); cuerpo.set('client_secret', c.secreto); }
  const r = await fetch(P.token, { method: 'POST', headers, body: cuerpo.toString() });
  if (!r.ok) throw new Error(`token ${r.status}`);
  return r.json();
}
const vence = (t) => (t.expires_in ? new Date(Date.now() + Number(t.expires_in) * 1000).toISOString() : null);

// La llave vigente (la renueva si está por vencer).
async function llaveVigente(con) {
  if (!con.expira_en || Date.parse(con.expira_en) - Date.now() > 60 * 1000 || !con.refresh_token) return con.access_token;
  const t = await pedirToken(con.proveedor, { grant_type: 'refresh_token', refresh_token: con.refresh_token });
  const cambios = { access_token: t.access_token, refresh_token: t.refresh_token || con.refresh_token, expira_en: vence(t), estado: 'conectado' };
  await sb(`relojes_conexiones?id=eq.${con.id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
  Object.assign(con, cambios);
  return con.access_token;
}

// ── Lo que trae cada marca, un renglón por día ───────────────────────────
const getJSON = async (url, llave, opts = {}) => {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${llave}`, Accept: 'application/json', ...(opts.headers || {}) } });
  if (r.status === 401) { const e = new Error('vencido'); e.vencido = true; throw e; }
  if (!r.ok) throw new Error(`${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};
const dia = (m, f) => (m[f] = m[f] || { fecha: f });
const num = (x) => (x == null || x === '' || !Number.isFinite(Number(x)) ? null : Number(x));

export const LEER = {
  async fitbit(llave, desde, hasta) {
    const m = {};
    const base = 'https://api.fitbit.com';
    const pasos = await getJSON(`${base}/1/user/-/activities/steps/date/${desde}/${hasta}.json`, llave);
    (pasos?.['activities-steps'] || []).forEach(x => { dia(m, x.dateTime).pasos = num(x.value); });
    const cal = await getJSON(`${base}/1/user/-/activities/activityCalories/date/${desde}/${hasta}.json`, llave).catch(() => null);
    (cal?.['activities-activityCalories'] || []).forEach(x => { dia(m, x.dateTime).calorias_activas = num(x.value); });
    const fc = await getJSON(`${base}/1/user/-/activities/heart/date/${desde}/${hasta}.json`, llave).catch(() => null);
    (fc?.['activities-heart'] || []).forEach(x => { if (x.value && x.value.restingHeartRate) dia(m, x.dateTime).fc_reposo = num(x.value.restingHeartRate); });
    const sueno = await getJSON(`${base}/1.2/user/-/sleep/date/${desde}/${hasta}.json`, llave).catch(() => null);
    (sueno?.sleep || []).forEach(x => { if (x.isMainSleep !== false) { const d = dia(m, x.dateOfSleep); d.sueno_min = (d.sueno_min || 0) + (num(x.minutesAsleep) || 0); } });
    return Object.values(m);
  },
  async oura(llave, desde, hasta) {
    const m = {};
    const base = 'https://api.ouraring.com/v2/usercollection';
    const q = `start_date=${desde}&end_date=${hasta}`;
    const act = await getJSON(`${base}/daily_activity?${q}`, llave);
    (act?.data || []).forEach(x => { const d = dia(m, x.day); d.pasos = num(x.steps); d.calorias_activas = num(x.active_calories); });
    const sue = await getJSON(`${base}/sleep?${q}`, llave).catch(() => null);
    (sue?.data || []).filter(x => !x.type || x.type === 'long_sleep').forEach(x => {
      const d = dia(m, x.day);
      d.sueno_min = num(x.total_sleep_duration) != null ? Math.round(x.total_sleep_duration / 60) : null;
      d.fc_reposo = num(x.lowest_heart_rate);
      d.hrv = num(x.average_hrv);
    });
    const ready = await getJSON(`${base}/daily_readiness?${q}`, llave).catch(() => null);
    (ready?.data || []).forEach(x => { dia(m, x.day).recuperacion = num(x.score); });
    return Object.values(m);
  },
  async whoop(llave, desde, hasta) {
    const m = {};
    const base = 'https://api.prod.whoop.com/developer/v2';
    const q = `start=${desde}T00:00:00.000Z&end=${sumarDiasISO(hasta, 1)}T00:00:00.000Z&limit=25`;
    const rec = await getJSON(`${base}/recovery?${q}`, llave);
    (rec?.records || []).forEach(x => {
      if (!x.score) return;
      const d = dia(m, String(x.created_at || x.updated_at || '').slice(0, 10));
      d.recuperacion = num(x.score.recovery_score); d.fc_reposo = num(x.score.resting_heart_rate); d.hrv = num(x.score.hrv_rmssd_milli);
    });
    const sue = await getJSON(`${base}/activity/sleep?${q}`, llave).catch(() => null);
    (sue?.records || []).filter(x => !x.nap && x.score && x.score.stage_summary).forEach(x => {
      const s = x.score.stage_summary;
      const min = Math.round(((num(s.total_in_bed_time_milli) || 0) - (num(s.total_awake_time_milli) || 0)) / 60000);
      if (min > 0) dia(m, String(x.end || '').slice(0, 10)).sueno_min = min;
    });
    return Object.values(m).filter(d => d.fecha);
  },
  // Polar entrega por «transacciones»: se abre una, se leen los días nuevos
  // y se confirma (si no se confirma, vuelve a darlos la próxima vez).
  async polar(llave, desde, hasta, con) {
    const base = `https://www.polaraccesslink.com/v3/users/${con.proveedor_usuario}/activity-transactions`;
    const r = await fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${llave}`, Accept: 'application/json' } });
    if (r.status === 204) return [];
    if (r.status === 401) { const e = new Error('vencido'); e.vencido = true; throw e; }
    if (!r.ok) throw new Error(`${r.status}`);
    const t = await r.json();
    const lista = await getJSON(`${base}/${t['transaction-id']}`, llave);
    const filas = [];
    for (const url of (lista?.['activity-log'] || []).slice(0, 14)) {
      const a = await getJSON(url, llave).catch(() => null);
      if (a && a.date) filas.push({ fecha: String(a.date).slice(0, 10), pasos: num(a['active-steps']), calorias_activas: num(a['active-calories']) });
    }
    await fetch(`${base}/${t['transaction-id']}`, { method: 'PUT', headers: { Authorization: `Bearer ${llave}` } }).catch(() => {});
    return filas.filter(f => f.fecha >= desde && f.fecha <= hasta);
  },
};

async function sincronizar(cliente, { forzar = false } = {}) {
  const cons = await sb(`relojes_conexiones?select=*&cliente_id=eq.${cliente.id}&estado=eq.conectado`).catch(() => []);
  const hasta = hoyBogota(), desde = sumarDiasISO(hasta, -6);
  let dias = 0;
  for (const con of Array.isArray(cons) ? cons : []) {
    if (!credenciales(con.proveedor)) continue;
    if (!forzar && con.ultima_sync && Date.now() - Date.parse(con.ultima_sync) < 3 * 3600 * 1000) continue;
    try {
      const llave = await llaveVigente(con);
      const filas = await LEER[con.proveedor](llave, desde, hasta, con);
      const renglones = filas.filter(f => f.fecha).map(f => ({
        cliente_id: cliente.id, user_id: cliente.user_id, proveedor: con.proveedor, fecha: f.fecha,
        pasos: f.pasos ?? null, sueno_min: f.sueno_min ?? null, fc_reposo: f.fc_reposo ?? null,
        calorias_activas: f.calorias_activas ?? null, hrv: f.hrv ?? null, recuperacion: f.recuperacion ?? null,
        entrenos: f.entrenos ?? null, actualizado_en: new Date().toISOString(),
      }));
      if (renglones.length) {
        await sb('relojes_dias?on_conflict=cliente_id,fecha,proveedor', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(renglones),
        });
        dias += renglones.length;
      }
      await sb(`relojes_conexiones?id=eq.${con.id}`, { method: 'PATCH', body: JSON.stringify({ ultima_sync: new Date().toISOString() }) });
    } catch (e) {
      if (e.vencido) await sb(`relojes_conexiones?id=eq.${con.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'vencido' }) }).catch(() => {});
    }
  }
  return dias;
}

const paginaFin = (res, url, texto) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta http-equiv="refresh" content="1;url=${url}"><body style="font-family:system-ui;background:#EDECE5;color:#1F1F1F;display:grid;place-items:center;height:100vh;margin:0">`
    + `<p style="font-size:18px;font-weight:700">${texto}</p></body>`);
};

export default async function manejarRelojes(req, res) {
  if (cors(req, res)) return;
  const esGet = req.method === 'GET';
  if (!esGet && req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  // Ir y volver de la página de la marca son navegaciones: no traen Origin.
  if (!guard(req, res, { key: 'relojes', limit: 40, allowNoOrigin: esGet })) return;
  if (!CRM_URL || !CRM_KEY) return res.status(200).json({ ok: false, motivo: 'sin_crm' });
  const q = esGet ? req.query : (req.body || {});

  try {
    // La marca vuelve con ?code&state (o ?error si dijo que no).
    if (esGet && (q.code || q.error) && q.state) {
      const st = leerEstado(q.state);
      if (!st || q.error) return paginaFin(res, '/?relojes=cancelado', 'No se conectó. Volviendo a la app…');
      const t = await pedirToken(st.proveedor, { grant_type: 'authorization_code', code: String(q.code), redirect_uri: regreso(req) });
      const cl = await sb(`clientes?select=id,user_id&id=eq.${st.clienteId}&limit=1`);
      const cliente = Array.isArray(cl) ? cl[0] : null;
      if (!cliente) return paginaFin(res, '/?relojes=cancelado', 'No se conectó. Volviendo a la app…');
      let usuario = t.user_id || t.x_user_id || null;
      // Polar pide registrar a la persona en AccessLink antes de leer nada.
      if (st.proveedor === 'polar' && t.x_user_id) {
        await fetch('https://www.polaraccesslink.com/v3/users', {
          method: 'POST', headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ 'member-id': cliente.id }),
        }).catch(() => {});
        usuario = String(t.x_user_id);
      }
      const fila = {
        user_id: cliente.user_id, cliente_id: cliente.id, proveedor: st.proveedor, estado: 'conectado',
        access_token: t.access_token, refresh_token: t.refresh_token || null, expira_en: vence(t),
        proveedor_usuario: usuario ? String(usuario) : null, conectado_en: new Date().toISOString(), ultima_sync: null,
      };
      await sb(`relojes_conexiones?cliente_id=eq.${cliente.id}&proveedor=eq.${st.proveedor}`, { method: 'DELETE' }).catch(() => {});
      await sb('relojes_conexiones', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(fila) });
      sincronizar(cliente, { forzar: true }).catch(() => {});
      return paginaFin(res, `/?relojes=${st.proveedor}`, '¡Listo! Tu reloj quedó conectado. Volviendo a la app…');
    }

    const cliente = await buscarCliente(q.name);
    if (!cliente) return res.status(200).json({ ok: false, motivo: 'sin_cliente' });
    const accion = String(q.accion || 'estado');

    if (esGet && accion === 'conectar') {
      const p = String(q.proveedor || '');
      const c = PROVEEDORES[p] && credenciales(p);
      if (!c) return paginaFin(res, '/?relojes=pronto', 'Esta marca todavía no está disponible. Volviendo a la app…');
      const url = new URL(PROVEEDORES[p].autorizar);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', c.id);
      url.searchParams.set('redirect_uri', regreso(req));
      url.searchParams.set('scope', PROVEEDORES[p].alcance);
      url.searchParams.set('state', firmarEstado(cliente.id, p));
      res.setHeader('Location', url.toString());
      return res.status(302).end();
    }

    if (accion === 'estado') {
      const cons = await sb(`relojes_conexiones?select=proveedor,estado,ultima_sync,conectado_en&cliente_id=eq.${cliente.id}`).catch(() => null);
      if (cons === null) return res.status(200).json({ ok: false, motivo: 'sin_tabla', disponibles: disponibles(), conectados: {} });
      const conectados = Object.fromEntries(cons.filter(c => c.estado !== 'desconectado').map(c => [c.proveedor, { estado: c.estado, ultima_sync: c.ultima_sync }]));
      const dias = await sb(`relojes_dias?select=fecha,proveedor,pasos,sueno_min,fc_reposo,calorias_activas,hrv,recuperacion&cliente_id=eq.${cliente.id}&fecha=gte.${sumarDiasISO(hoyBogota(), -6)}&order=fecha.desc`).catch(() => []);
      return res.status(200).json({ ok: true, disponibles: disponibles(), conectados, dias: Array.isArray(dias) ? dias : [] });
    }

    if (!esGet && accion === 'sincronizar') return res.status(200).json({ ok: true, dias: await sincronizar(cliente) });

    if (!esGet && accion === 'desconectar') {
      const p = String(q.proveedor || '');
      if (!PROVEEDORES[p]) return res.status(200).json({ ok: false, motivo: 'proveedor' });
      // Se borran las llaves (quedan los días que ya trajo, que son suyos).
      await sb(`relojes_conexiones?cliente_id=eq.${cliente.id}&proveedor=eq.${p}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ ok: false, motivo: 'accion_desconocida' });
  } catch (e) {
    return res.status(200).json({ ok: false, motivo: 'error' });
  }
}
