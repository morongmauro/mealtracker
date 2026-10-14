// «Ver como cliente» y la bitácora, del lado del servidor, con fetch de mentira.
//   node pruebas/ver-como-api.mjs
process.env.SUPABASE_URL = 'https://app.test';
process.env.SUPABASE_SERVICE_KEY = 'k';
process.env.COACH_PASSWORD = 'clave-de-prueba';
const UID = '11111111-2222-3333-4444-555555555555';
const escritos = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const json = (o) => ({ ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o) });
  if (u.startsWith('https://app.test/rest/v1/user_data')) return json(u.includes(UID) ? [{ name: 'Ana Pérez' }] : []);
  if (u.startsWith('https://app.test/rest/v1/app_errores')) {
    if (init.method === 'POST') { escritos.push(JSON.parse(init.body)); return json({}); }
    return json([{ id: 1, creado_at: new Date().toISOString(), tipo: 'error', mensaje: 'x is not a function', pantalla: 'Dash' }]);
  }
  return json([]);
};
const { firmarPase, leerPase } = await import('../api/_verComo.js');
const { default: verComo } = await import('../api/ver-como.js');
const { default: coachData } = await import('../api/coach-data.js');
const { default: bitacora } = await import('../api/bitacora.js');
const { default: coachAuth } = await import('../api/coach-auth.js');

async function llamar(handler, { metodo = 'GET', query = {}, body = {}, headers = {} } = {}) {
  let salida = null, estado = 200;
  const req = { method: metodo, query, body, headers: { host: 'app.test', origin: 'https://app.test', 'x-forwarded-proto': 'https', 'x-forwarded-for': `9.9.9.${Math.floor(Math.random() * 250)}`, ...headers } };
  const res = { status(c) { estado = c; return this; }, json(o) { salida = o; return this; }, end() { return this; }, setHeader() {} };
  await handler(req, res);
  return { estado, ...(salida || {}) };
}
let mal = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); if (!c) mal++; };

// El pase: firmado, con quién y hasta cuándo.
const pase = firmarPase({ user_id: UID, name: 'Ana Pérez' });
const leido = leerPase(pase);
ok('el pase dice de quién es y dura 15 minutos', leido && leido.user_id === UID && leido.name === 'Ana Pérez' && leido.exp - Date.now() > 14 * 60 * 1000, JSON.stringify(leido));
ok('un pase alterado no vale', leerPase(pase.slice(0, -2) + 'xx') === null && leerPase('cualquier.cosa') === null && leerPase('') === null);
const vencido = (() => { const [c] = pase.split('.'); const p = JSON.parse(Buffer.from(c, 'base64url').toString()); p.exp = Date.now() - 1000; const c2 = Buffer.from(JSON.stringify(p)).toString('base64url'); return `${c2}.${pase.split('.')[1]}`; })();
ok('un pase con la fecha cambiada tampoco (la firma ya no cuadra)', leerPase(vencido) === null);

// /api/ver-como: la app pregunta de quién es.
let r = await llamar(verComo, { query: { token: pase } });
ok('/api/ver-como contesta el cliente del pase', r.ok && r.name === 'Ana Pérez' && r.user_id === UID, JSON.stringify(r));
r = await llamar(verComo, { query: { token: 'nada' } });
ok('/api/ver-como con pase malo: ok:false, sin romper', r.ok === false && r.error === 'pase_vencido');

// El CRM pide el pase con su token de coach.
const login = await llamar(coachAuth, { metodo: 'POST', body: { password: 'clave-de-prueba' } });
ok('el coach entra', !!login.token);
r = await llamar(coachData, { metodo: 'POST', query: { action: 'ver_como', user_id: UID }, headers: { authorization: `Bearer ${login.token}` } });
ok('coach-data ver_como devuelve la dirección con el pase, para ese cliente', r.ok && /^https:\/\/app\.test\/\?ver_como=/.test(r.url) && r.name === 'Ana Pérez' && r.minutos === 15, JSON.stringify(r));
const token2 = decodeURIComponent(r.url.split('ver_como=')[1]);
ok('…y ese pase vale en /api/ver-como', (await llamar(verComo, { query: { token: token2 } })).name === 'Ana Pérez');
r = await llamar(coachData, { metodo: 'POST', query: { action: 'ver_como', user_id: UID }, headers: { authorization: 'Bearer malo' } });
ok('sin token de coach, no hay pase', r.estado === 401);
r = await llamar(coachData, { metodo: 'POST', query: { action: 'ver_como', user_id: 'no-es-uuid' }, headers: { authorization: `Bearer ${login.token}` } });
ok('con un id raro, 400', r.estado === 400);

// La bitácora: lo que reporta la app queda guardado, recortado.
r = await llamar(bitacora, { metodo: 'POST', body: { name: 'Ana Pérez', user_id: UID, tipo: 'error', mensaje: 'x'.repeat(900), detalle: 'pila', pantalla: 'Entreno › Hoy', ua: 'Android', version: 'index-abc.js' } });
ok('bitácora: guarda la fila con el cliente, la pantalla y el mensaje recortado', r.ok && escritos.length === 1 && escritos[0].mensaje.length === 400 && escritos[0].user_id === UID && escritos[0].pantalla === 'Entreno › Hoy', JSON.stringify(escritos[0] || null).slice(0, 200));
r = await llamar(bitacora, { metodo: 'POST', body: { name: 'Ana Pérez' } });
ok('bitácora: sin mensaje no guarda nada', r.ok === false && escritos.length === 1);
r = await llamar(coachData, { query: { action: 'errores', user_id: UID }, headers: { authorization: `Bearer ${login.token}` } });
ok('coach-data errores: el CRM lee la bitácora del cliente', r.ok && r.errores.length === 1 && r.errores[0].mensaje === 'x is not a function', JSON.stringify(r));

console.log(mal ? `\n${mal} fallo(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
