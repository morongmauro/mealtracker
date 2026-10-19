// La alarma del descanso con la app minimizada (api/_descanso.js), contra un
// Supabase en memoria: programar, cancelar y enviar solo lo que ya toca.
//
//   node pruebas/descanso-api.mjs

import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';
import webpush from 'web-push';

process.env.SUPABASE_URL = 'https://app.supabase.test';
process.env.SUPABASE_SERVICE_KEY = 'k';
const llaves = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = llaves.publicKey;
process.env.VAPID_PRIVATE_KEY = llaves.privateKey;

const enviadas = [];
webpush.sendNotification = async (sub, carga) => { enviadas.push({ endpoint: sub.endpoint, ...JSON.parse(carga) }); return { statusCode: 201 }; };

const { default: manejarDescanso, enviarPendientes } = await import('../api/_descanso.js');

let fallos = 0, casos = 0;
async function caso(nombre, fn) {
  casos++;
  try { await fn(); console.log('  ok   ' + nombre); }
  catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); }
}
const igual = (a, b, que) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${que}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };
const con = (q) => (h) => (cuerpo) => {
  const req = { method: 'POST', headers: { host: 'app.test', origin: 'https://app.test', 'x-forwarded-for': '2.2.2.' + Math.floor(Math.random() * 250) }, body: cuerpo, query: { descanso: q } };
  let estado = 200, json = null;
  const res = { status(s) { estado = s; return this; }, json(j) { json = j; return this; }, setHeader() {}, end() { return this; } };
  return h(req, res).then(() => ({ estado, ...json }));
};
const programar = con('programar')(manejarDescanso);
const cancelar = con('cancelar')(manejarDescanso);

function base() {
  enviadas.length = 0;
  const sb = crearSupabaseFalso({
    tablas: {
      avisos_descanso: [],
      push_subs: [
        { endpoint: 'https://push.test/mauro', name: 'Mauro Morón', sub: { endpoint: 'https://push.test/mauro', keys: {} } },
        { endpoint: 'https://push.test/ana', name: 'Ana Pérez', sub: { endpoint: 'https://push.test/ana', keys: {} } },
      ],
    },
  });
  globalThis.fetch = sb.fetch;
  return sb;
}

console.log('api/_descanso.js');

await caso('programar deja el aviso con su hora', async () => {
  const sb = base();
  const fin = Date.now() + 90000;
  const r = await programar({ id: 'dprueba1', name: 'Mauro Morón', fin, cuerpo: 'A la siguiente serie.' });
  igual(r.ok, true, 'ok');
  igual(sb.db.avisos_descanso.map(a => [a.id, a.name, a.cuando, a.titulo]), [['dprueba1', 'Mauro Morón', new Date(fin).toISOString(), 'Descanso listo']], 'fila');
});

await caso('antes de la hora no se manda nada', async () => {
  const sb = base();
  await programar({ id: 'dprueba2', name: 'Mauro Morón', fin: Date.now() + 60000 });
  const r = await enviarPendientes();
  igual([r.enviados, enviadas.length, sb.db.avisos_descanso[0].enviado_en || null], [0, 0, null], 'nada');
});

await caso('a la hora llega SOLO a los teléfonos de ese cliente, una vez', async () => {
  const sb = base();
  sb.db.avisos_descanso.push({ id: 'dya', name: 'Mauro Morón', cuando: new Date(Date.now() - 2000).toISOString(), titulo: 'Descanso listo', cuerpo: 'A la siguiente serie.', cancelado: false, enviado_en: null });
  const r = await enviarPendientes();
  igual([r.enviados, enviadas.map(e => [e.endpoint, e.title, e.body])], [1, [['https://push.test/mauro', 'Descanso listo', 'A la siguiente serie.']]], 'enviada');
  const r2 = await enviarPendientes();
  igual([r2.enviados, enviadas.length], [0, 1], 'no se repite');
  igual(!!sb.db.avisos_descanso[0].enviado_en, true, 'marcado');
});

await caso('cancelado (volvió a la app o lo saltó) no llega', async () => {
  const sb = base();
  await programar({ id: 'dcancelado', name: 'Mauro Morón', fin: Date.now() + 30000 });
  const c = await cancelar({ id: 'dcancelado' });
  igual(c.ok, true, 'cancelado');
  sb.db.avisos_descanso[0].cuando = new Date(Date.now() - 1000).toISOString();
  const r = await enviarPendientes();
  igual([r.enviados, enviadas.length], [0, 0], 'nada');
});

await caso('uno viejo (más de 3 min tarde) ya no se manda', async () => {
  const sb = base();
  sb.db.avisos_descanso.push({ id: 'dviejo', name: 'Mauro Morón', cuando: new Date(Date.now() - 10 * 60000).toISOString(), cancelado: false, enviado_en: null });
  const r = await enviarPendientes();
  igual(r.enviados, 0, 'nada');
});

await caso('el de un ejercicio por tiempo dice «Tiempo cumplido»', async () => {
  const sb = base();
  await programar({ id: 'dtiempo', name: 'Mauro Morón', fin: Date.now() + 10000, titulo: 'Tiempo cumplido', cuerpo: 'Plank: listo.' });
  sb.db.avisos_descanso[0].cuando = new Date(Date.now() - 500).toISOString();
  await enviarPendientes();
  igual(enviadas.map(e => [e.title, e.body]), [['Tiempo cumplido', 'Plank: listo.']], 'texto');
});

await caso('datos raros (sin nombre, hora pasada o de más de 15 min) no se guardan', async () => {
  const sb = base();
  const a = await programar({ id: 'draro1', name: '', fin: Date.now() + 60000 });
  const b = await programar({ id: 'draro2', name: 'Mauro Morón', fin: Date.now() - 60000 });
  const c = await programar({ id: 'draro3', name: 'Mauro Morón', fin: Date.now() + 60 * 60000 });
  igual([a.estado, b.estado, c.estado, sb.db.avisos_descanso.length], [400, 400, 400, 0], 'rechazados');
});

await caso('desde otra página no se puede programar', async () => {
  base();
  const req = { method: 'POST', headers: { host: 'app.test', origin: 'https://otro.test' }, body: { id: 'dajeno', name: 'Mauro Morón', fin: Date.now() + 60000 }, query: { descanso: 'programar' } };
  let estado = 200;
  await manejarDescanso(req, { status(s) { estado = s; return this; }, json() { return this; }, setHeader() {}, end() { return this; } });
  igual(estado, 403, 'rechazado');
});

await caso('sin la tabla (SQL sin correr) responde sin romper', async () => {
  const sb = crearSupabaseFalso({ tablas: {}, columnas: { avisos_descanso: ['nada'] } });
  globalThis.fetch = sb.fetch;
  const r = await enviarPendientes();
  igual(r.ok === false || r.enviados === 0, true, 'sin romper');
});

void llamar;
console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
