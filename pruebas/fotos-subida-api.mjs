// Subida de fotos de progreso (api/training.js) contra un Supabase en
// memoria con un storage que se porta como el de verdad: rechaza (400) un
// pedido marcado «Content-Type: application/json» que llega SIN cuerpo.
// Era la causa de «No pude subir la foto»: pedir el permiso de subida no
// lleva cuerpo.
//
//   node pruebas/fotos-subida-api.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const { default: handler } = await import('../api/training.js');

let mal = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); if (!c) mal++; };

let bucket = true, poseOtra = false;
const pedidos = [];
function preparar() {
  const sb = crearSupabaseFalso({ tablas: { clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Ana Pérez', estado: 'activo' }], fotos_progreso: [], eventos: [], push_subs: [] } });
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.startsWith('https://crm.test/storage/v1/')) {
      const h = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
      pedidos.push({ u, metodo: opts.method, tipo: h['content-type'] || null, cuerpo: opts.body ?? null });
      const res = (status, o) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o) });
      // Como el storage real (Fastify): JSON declarado + cuerpo vacío = 400.
      if (/json/.test(h['content-type'] || '') && (opts.body == null || opts.body === '')) return res(400, { statusCode: '400', error: 'FST_ERR_CTP_EMPTY_JSON_BODY', message: "Body cannot be empty when content-type is set to 'application/json'" });
      if (!bucket) return res(400, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' });
      if (u.includes('/object/upload/sign/')) return res(200, { url: u.replace('https://crm.test/storage/v1', '') + '?token=t1', token: 't1' });
      if (u.includes('/object/sign/')) return res(200, { signedURL: '/object/sign/progreso/x?token=v' });
      return res(200, {});
    }
    // La tabla vieja no acepta la pose «otra» (regla frente/lado/espalda).
    if (u.startsWith('https://crm.test/rest/v1/fotos_progreso') && opts.method === 'POST' && !poseOtra && /"pose":"otra"/.test(String(opts.body))) {
      return { ok: false, status: 400, json: async () => ({ message: 'violates check constraint "fotos_progreso_pose_check"' }), text: async () => '{"message":"violates check constraint"}' };
    }
    return sb.fetch(url, opts);
  };
  return sb;
}

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
let sb = preparar();
let r = await llamar(handler, { accion: 'foto_subir', name: 'Ana Pérez', tipo: 'image/jpeg', pose: 'frente', fecha: hoy });
const firma = pedidos.find(p => p.u.includes('/object/upload/sign/'));
ok('el permiso de subida sale bien (antes: 400 del storage)', r.ok === true && /\/storage\/v1\/object\/upload\/sign\/progreso\/c1\//.test(r.url || ''), JSON.stringify(r));
ok('…y se pide SIN marcarlo JSON (no lleva cuerpo)', firma && firma.tipo === null, JSON.stringify(firma));
r = await llamar(handler, { accion: 'foto_guardar', name: 'Ana Pérez', ruta: r.ruta, pose: 'frente', fecha: hoy });
ok('registrar la foto deja la fila guardada', r.ok === true && sb.db.fotos_progreso.length === 1 && sb.db.fotos_progreso[0].pose === 'frente', JSON.stringify(r));
const ver = pedidos.filter(p => p.u.includes('/object/sign/'));
ok('el enlace para verla (con cuerpo) sigue yendo como JSON', ver.length > 0 && ver.every(p => /json/.test(p.tipo || '') && p.cuerpo), JSON.stringify(ver));

// Borrar: DELETE sin cuerpo, tampoco marcado JSON.
r = await llamar(handler, { accion: 'foto_borrar', name: 'Ana Pérez', id: sb.db.fotos_progreso[0].id });
const borrar = pedidos.find(p => p.metodo === 'DELETE');
ok('borrar la foto también funciona (DELETE sin JSON vacío)', r.ok === true && borrar && borrar.tipo === null, JSON.stringify({ r, borrar }));

// Pose «otra» con la tabla vieja: motivo claro (falta la SQL), no «error».
sb = preparar();
let p2 = await llamar(handler, { accion: 'foto_subir', name: 'Ana Pérez', tipo: 'image/jpeg', pose: 'otra', fecha: hoy });
r = await llamar(handler, { accion: 'foto_guardar', name: 'Ana Pérez', ruta: p2.ruta, pose: 'otra', fecha: hoy });
ok('pose «Otra» sin la SQL nueva: dice que falta (falta_pose_otra)', r.ok === false && r.motivo === 'falta_pose_otra', JSON.stringify(r));
poseOtra = true;
r = await llamar(handler, { accion: 'foto_guardar', name: 'Ana Pérez', ruta: p2.ruta, pose: 'otra', fecha: hoy });
ok('pose «Otra» con la SQL corrida: se guarda', r.ok === true && sb.db.fotos_progreso.some(f => f.pose === 'otra'), JSON.stringify(r));

// Sin la carpeta (bucket) en Supabase: motivo claro.
bucket = false; sb = preparar();
r = await llamar(handler, { accion: 'foto_subir', name: 'Ana Pérez', tipo: 'image/jpeg', pose: 'lado', fecha: hoy });
ok('sin la carpeta de fotos: motivo «sin_carpeta»', r.ok === false && r.motivo === 'sin_carpeta', JSON.stringify(r));

console.log(mal ? `\n${mal} falla(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
