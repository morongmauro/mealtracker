// Prueba api/relojes.js contra un Supabase en memoria y unas marcas de
// mentira (Oura y Fitbit): conectar, volver con el permiso, traer los días,
// renovar la llave vencida, desconectar, y que una marca sin llaves del coach
// salga como «Pronto».
//   node pruebas/relojes.mjs
import { crearSupabaseFalso } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
process.env.APP_URL = 'https://app.test';
process.env.OURA_CLIENT_ID = 'oura-id'; process.env.OURA_CLIENT_SECRET = 'oura-secreto';
process.env.FITBIT_CLIENT_ID = 'fb-id'; process.env.FITBIT_CLIENT_SECRET = 'fb-secreto';
delete process.env.WHOOP_CLIENT_ID; delete process.env.POLAR_CLIENT_ID;

const { firmarEstado, leerEstado } = await import('../api/_relojes.js');
// Como en Vercel: /api/relojes llega a training.js con ?modulo=relojes.
const { default: training } = await import('../api/training.js');
const handler = (req, res) => training({ ...req, query: { ...(req.query || {}), modulo: 'relojes' } }, res);

let casos = 0, fallos = 0;
const igual = (a, b, q) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${q}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };
async function caso(n, fn) { casos++; try { await fn(); console.log('  ok   ' + n); } catch (e) { fallos++; console.log('  MAL  ' + n + '\n         ' + e.message); } }

// Llama al handler y guarda también cabeceras y HTML (las redirecciones).
async function llamar(cuerpo, { metodo = 'POST', origen = true } = {}) {
  const cab = {};
  let estado = 200, json = null, html = null;
  const req = { method: metodo, headers: { host: 'app.test', ...(origen ? { origin: 'https://app.test' } : {}), 'x-forwarded-for': '2.2.2.' + Math.floor(Math.random() * 250) },
    body: metodo === 'POST' ? cuerpo : undefined, query: metodo === 'GET' ? cuerpo : {} };
  const res = { status(s) { estado = s; return this; }, json(j) { json = j; return this; }, send(h) { html = h; return this; }, setHeader(k, v) { cab[k] = v; }, end() { return this; } };
  await handler(req, res);
  return { estado, cab, html, ...(json || {}) };
}

function base() {
  const sb = crearSupabaseFalso({ tablas: {
    clientes: [{ id: 'c1', user_id: 'coach', nombre: 'Mauro Morón' }],
    relojes_conexiones: [], relojes_dias: [],
  } });
  const pedidos = [];
  // Las marcas
  const marcas = async (u, o = {}) => {
    const url = String(u);
    pedidos.push({ url, o });
    const json = (j, status = 200) => ({ ok: status < 300, status, json: async () => j, text: async () => JSON.stringify(j) });
    if (url === 'https://api.ouraring.com/oauth/token') {
      const b = new URLSearchParams(o.body);
      if (b.get('grant_type') === 'authorization_code') return json({ access_token: 'oura-1', refresh_token: 'oura-r1', expires_in: 3600, user_id: 'u-oura' });
      if (b.get('grant_type') === 'refresh_token') return json({ access_token: 'oura-2', refresh_token: 'oura-r2', expires_in: 3600 });
    }
    if (url.startsWith('https://api.ouraring.com/v2/usercollection/daily_activity')) return json({ data: [{ day: '2026-10-03', steps: 9120, active_calories: 410 }] });
    if (url.startsWith('https://api.ouraring.com/v2/usercollection/sleep')) return json({ data: [{ day: '2026-10-03', type: 'long_sleep', total_sleep_duration: 26100, lowest_heart_rate: 52, average_hrv: 61 }] });
    if (url.startsWith('https://api.ouraring.com/v2/usercollection/daily_readiness')) return json({ data: [{ day: '2026-10-03', score: 84 }] });
    return sb.fetch(u, o);
  };
  globalThis.fetch = marcas;
  return { sb, pedidos };
}

await caso('estado: Oura y Fitbit disponibles; Whoop y Polar sin llaves del coach', async () => {
  base();
  const r = await llamar({ accion: 'estado', name: 'Mauro Morón' }, { metodo: 'GET' });
  igual([r.ok, r.disponibles.oura, r.disponibles.fitbit, r.disponibles.whoop, r.disponibles.polar], [true, true, true, false, false], 'disponibles');
  igual(r.conectados, {}, 'nada conectado');
});

await caso('conectar: lleva a Oura con la dirección de regreso y un state firmado', async () => {
  base();
  const r = await llamar({ accion: 'conectar', proveedor: 'oura', name: 'Mauro Morón' }, { metodo: 'GET', origen: false });
  igual(r.estado, 302, 'redirige');
  const u = new URL(r.cab.Location);
  igual([u.origin + u.pathname, u.searchParams.get('client_id'), u.searchParams.get('redirect_uri')],
    ['https://cloud.ouraring.com/oauth/authorize', 'oura-id', 'https://app.test/api/relojes'], 'a dónde');
  igual(leerEstado(u.searchParams.get('state')), { clienteId: 'c1', proveedor: 'oura' }, 'state');
});

await caso('conectar una marca sin llaves: página de «todavía no»', async () => {
  base();
  const r = await llamar({ accion: 'conectar', proveedor: 'whoop', name: 'Mauro Morón' }, { metodo: 'GET', origen: false });
  igual(/todavía no está disponible/.test(r.html || ''), true, 'aviso');
});

await caso('state: falsificado o vencido no sirve', async () => {
  igual(leerEstado('basura'), null, 'basura');
  const st = firmarEstado('c1', 'oura', Date.now() - 31 * 60 * 1000);
  igual(leerEstado(st), null, 'vencido');
  const bueno = Buffer.from(Buffer.from(firmarEstado('c1', 'oura'), 'base64url').toString().replace('c1', 'c9')).toString('base64url');
  igual(leerEstado(bueno), null, 'cambiado');
});

await caso('volver de Oura: guarda la conexión, trae los días y vuelve a la app', async () => {
  const { sb } = base();
  const r = await llamar({ code: 'abc', state: firmarEstado('c1', 'oura') }, { metodo: 'GET', origen: false });
  igual(/relojes=oura/.test(r.html || ''), true, 'vuelve a la app');
  const con = sb.db.relojes_conexiones[0];
  igual([con.cliente_id, con.user_id, con.proveedor, con.access_token, con.estado], ['c1', 'coach', 'oura', 'oura-1', 'conectado'], 'conexión');
  await new Promise(res => setTimeout(res, 50));
  const d = sb.db.relojes_dias.find(x => x.fecha === '2026-10-03');
  igual([d.pasos, d.sueno_min, d.fc_reposo, d.hrv, d.recuperacion, d.calorias_activas], [9120, 435, 52, 61, 84, 410], 'el día');
  const e = await llamar({ accion: 'estado', name: 'Mauro Morón' }, { metodo: 'GET' });
  igual([e.conectados.oura.estado, e.dias.length >= 1], ['conectado', true], 'estado con días');
});

await caso('llave vencida: se renueva antes de leer', async () => {
  const { sb, pedidos } = base();
  sb.db.relojes_conexiones.push({ id: 'x1', cliente_id: 'c1', user_id: 'coach', proveedor: 'oura', estado: 'conectado', access_token: 'viejo', refresh_token: 'oura-r1', expira_en: new Date(Date.now() - 1000).toISOString(), ultima_sync: null });
  await llamar({ accion: 'sincronizar', name: 'Mauro Morón' });
  igual(sb.db.relojes_conexiones[0].access_token, 'oura-2', 'llave nueva guardada');
  const lectura = pedidos.find(p => p.url.includes('daily_activity'));
  igual(lectura.o.headers.Authorization, 'Bearer oura-2', 'lee con la nueva');
});

await caso('si la marca dice 401, queda «vencido» (hay que volver a conectar)', async () => {
  const { sb } = base();
  sb.db.relojes_conexiones.push({ id: 'x2', cliente_id: 'c1', user_id: 'coach', proveedor: 'oura', estado: 'conectado', access_token: 'malo', expira_en: null, ultima_sync: null });
  const f0 = globalThis.fetch;
  globalThis.fetch = (u, o) => (String(u).includes('usercollection') ? Promise.resolve({ ok: false, status: 401, text: async () => '' }) : f0(u, o));
  await llamar({ accion: 'sincronizar', name: 'Mauro Morón' });
  igual(sb.db.relojes_conexiones[0].estado, 'vencido', 'vencido');
});

await caso('desconectar: se borran las llaves', async () => {
  const { sb } = base();
  sb.db.relojes_conexiones.push({ id: 'x3', cliente_id: 'c1', user_id: 'coach', proveedor: 'oura', estado: 'conectado', access_token: 't' });
  igual((await llamar({ accion: 'desconectar', name: 'Mauro Morón', proveedor: 'oura' })).ok, true, 'ok');
  igual(sb.db.relojes_conexiones.length, 0, 'sin llaves');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
