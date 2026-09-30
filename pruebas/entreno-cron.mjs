// El cron de avisos (api/push-cron.js) en lo que toca al entrenamiento:
//   · cierra solas las sesiones olvidadas (y solo esas);
//   · en la mañana solo sale la medición (con el texto que corresponde);
//   · al final del día, UN mensaje con lo que falte: el entreno (solo a la
//     beta, si tenía rutina y no entrenó) y la comida (bajo la meta).
// Sin red: base en memoria y los envíos push interceptados.
//
//   node pruebas/entreno-cron.mjs

import { crearSupabaseFalso } from './_supabase-falso.mjs';
import { createRequire } from 'node:module';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
process.env.SUPABASE_URL = 'https://mt.test';
process.env.SUPABASE_SERVICE_KEY = 'k2';
process.env.CRON_SECRET = 'secreto';

const require_ = createRequire(import.meta.url);
const webpush = require_('web-push');
const claves = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = claves.publicKey;
process.env.VAPID_PRIVATE_KEY = claves.privateKey;
const enviados = [];
webpush.sendNotification = async (sub, payload) => { enviados.push({ a: sub.quien, ...JSON.parse(payload) }); return {}; };

const { cerrarOlvidadas, agendaDeHoy, hoyBogota } = await import('../api/_entreno.js');
const { default: cron } = await import('../api/push-cron.js');

const hoy = hoyBogota();
const mas = (ymd, n) => { const t = new Date(Date.parse(ymd + 'T00:00:00Z')); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const letra = 'LMXJVSD'[(new Date(Date.parse(hoy + 'T00:00:00Z')).getUTCDay() + 6) % 7];
const lunes = mas(hoy, -((new Date(Date.parse(hoy + 'T00:00:00Z')).getUTCDay() + 6) % 7));

// Una zona horaria donde AHORA sea cierta hora: las 9 (mañana) o las 20
// (cierre del día).
const tzA = (hora) => {
  for (let n = -14; n <= 12; n++) {
    const tz = n === 0 ? 'Etc/GMT' : `Etc/GMT${n > 0 ? '+' : ''}${n}`;
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date()));
    if (h === hora) return tz;
  }
};
const tzNueve = tzA(9), tzVeinte = tzA(20);
const fechaEn = (tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function base() {
  return crearSupabaseFalso({
    porDefecto: { sesiones: { estado: 'en_curso' } },
    tablas: {
      clientes: [
        { id: 'c1', user_id: 'coach', nombre: 'Mauro Morón', estado: 'activo' },
        { id: 'c2', user_id: 'coach', nombre: 'Otra Persona', estado: 'activo' },
        { id: 'c3', user_id: 'coach', nombre: 'Ya Entrenó', estado: 'activo' },
      ],
      fases: ['c1', 'c2', 'c3'].map(c => ({ id: 'f-' + c, cliente_id: c, estado: 'activa', visible_cliente: true, orden: 1,
        fecha_inicio: mas(lunes, -7), semanas: 6, dias_semana: [letra] })),
      rutinas: ['c1', 'c2', 'c3'].map(c => ({ id: 'r-' + c, fase_id: 'f-' + c, cliente_id: c, nombre: 'Push', dias_semana: [letra], archivada: false })),
      sesiones: [
        { id: 'olvidada', cliente_id: 'c1', rutina_id: 'r-c1', fecha: mas(lunes, -3), estado: 'en_curso', origen: 'cliente' },
        { id: 'vacia', cliente_id: 'c1', rutina_id: 'r-c1', fecha: mas(lunes, -4), estado: 'en_curso', origen: 'cliente' },
        { id: 'de-ayer', cliente_id: 'c1', rutina_id: 'r-c1', fecha: mas(hoy, -1), estado: 'en_curso', origen: 'cliente' },
        { id: 'importada', cliente_id: 'c1', rutina_id: 'r-c1', fecha: mas(lunes, -5), estado: 'en_curso', origen: 'importada' },
        { id: 'hecha', cliente_id: 'c3', rutina_id: 'r-c3', fecha: hoy, estado: 'completada', origen: 'cliente' },
      ],
      series_log: [
        { id: 'a', sesion_id: 'olvidada', serie_num: 1, completada: true, created_at: '2026-01-01T10:00:00Z' },
        { id: 'b', sesion_id: 'olvidada', serie_num: 2, completada: true, created_at: '2026-01-01T10:40:00Z' },
        { id: 'c', sesion_id: 'de-ayer', serie_num: 1, completada: true, created_at: '2026-01-01T10:00:00Z' },
      ],
      eventos: [{ id: 'ev', cliente_id: 'c2', tipo: 'medicion', titulo: 'Medición', fecha: hoy, visible_cliente: true }],
      push_subs: [
        { endpoint: 'e1', name: 'Mauro Morón', tz: tzNueve, sub: { quien: 'Mauro' } },
        { endpoint: 'e2', name: 'Otra Persona', tz: tzNueve, sub: { quien: 'Otra' } },
        { endpoint: 'e3', name: 'Ya Entrenó', tz: tzNueve, sub: { quien: 'Ya' } },
      ],
      user_data: [],
    },
  });
}

const sbDe = (db) => async (path, opts = {}) => {
  const r = await db.fetch(`https://crm.test/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error('sb ' + r.status);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};

let fallos = 0, casos = 0;
async function caso(nombre, fn) {
  casos++;
  try { await fn(); console.log('  ok   ' + nombre); }
  catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); }
}
const igual = (a, b, qué) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${qué}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

console.log(`cron de entrenamiento · hoy ${hoy} (${letra}) · turno de mañana en ${tzNueve}`);

await caso('cierra la olvidada con series, borra la vacía y no toca ni la de ayer ni la importada', async () => {
  const db = base();
  const r = await cerrarOlvidadas(sbDe(db), hoy);
  const est = Object.fromEntries(db.db.sesiones.map(s => [s.id, s.estado]));
  igual(r, { cerradas: 1, borradas: 1 }, 'resumen');
  igual([est.olvidada, est.vacia, est['de-ayer'], est.importada], ['completada', undefined, 'en_curso', 'en_curso'], 'estados');
  const o = db.db.sesiones.find(s => s.id === 'olvidada');
  igual([o.cerrada_auto, o.duracion_seg], [true, 2400], 'marca y duración (de la 1ª a la última serie)');
});

await caso('qué toca hoy: la rutina si no la hizo, y la medición', async () => {
  const db = base();
  const a = await agendaDeHoy(sbDe(db), hoy);
  igual(a.get('mauro moron'), { rutina: 'Push', medicion: false, registros: [], entrenoHoy: false }, 'Mauro');
  igual(a.get('otra persona'), { rutina: 'Push', medicion: true, registros: ['medicion'], entrenoHoy: false }, 'Otra');
  igual(a.get('ya entreno'), { rutina: null, medicion: false, registros: [], entrenoHoy: true }, 'la hizo hoy: no se insiste');
});

await caso('peso y fotos el mismo día: el aviso dice las dos cosas', async () => {
  const db = base();
  db.db.eventos.push(
    { id: 'ev2', cliente_id: 'c1', tipo: 'peso', titulo: 'Pesarse', fecha: hoy, visible_cliente: true },
    { id: 'ev3', cliente_id: 'c1', tipo: 'fotos', titulo: 'Fotos', fecha: hoy, visible_cliente: true },
    { id: 'ev4', cliente_id: 'c1', tipo: 'actividad', titulo: 'Natación', fecha: hoy, visible_cliente: true },
  );
  const a = await agendaDeHoy(sbDe(db), hoy);
  igual(a.get('mauro moron').registros, ['peso', 'fotos'], 'lo que toca registrar (la natación no)');
  globalThis.fetch = db.fetch;
  enviados.length = 0;
  await cron({ method: 'GET', query: { key: 'secreto' }, headers: {} },
    { status() { return this; }, json() { return this; }, setHeader() {}, end() { return this; } });
  const m = enviados.find(e => e.a === 'Mauro' && e.tag === 'ecm-med');
  if (!m || !/pesarte y tu registro fotográfico/.test(m.body)) throw new Error('aviso: ' + (m && m.body));
});

const correr = async () => {
  let json = null;
  await cron({ method: 'GET', query: { key: 'secreto' }, headers: {} },
    { status() { return this; }, json(j) { json = j; return this; }, setHeader() {}, end() { return this; } });
  return json;
};

await caso('en la mañana: solo la medición; nada de «registra tu comida» ni «hoy te toca»', async () => {
  const db = base();
  globalThis.fetch = db.fetch;
  enviados.length = 0;
  const json = await correr();
  const de = (q, tag) => enviados.filter(e => e.a === q && (!tag || e.tag === tag));
  igual(de('Mauro').length, 0, 'Mauro no recibe nada en la mañana');
  igual(de('Otra', 'ecm-med').length, 1, 'Otra recibe la medición');
  igual(de('Otra').length, 1, '…y solo eso');
  if (!/WhatsApp/.test(de('Otra', 'ecm-med')[0].body)) throw new Error('sin la app, la medición debe pedir el pantallazo por WhatsApp');
  igual(de('Ya').length, 0, 'Ya no recibe nada');
  igual(json.olvidadas, { cerradas: 1, borradas: 1 }, 'el cron también cerró las olvidadas');
});

// Al cierre del día (20h locales). El falso de Supabase no proyecta
// `data->today`: las filas de user_data van ya con esas columnas.
function baseNoche() {
  const db = base();
  db.db.push_subs.forEach((s, i) => { s.tz = tzVeinte; s.user_id = 'u' + (i + 1); });
  return db;
}

await caso('cierre del día: entreno pendiente y comida sin registrar van en UN solo mensaje', async () => {
  const db = baseNoche();
  globalThis.fetch = db.fetch;
  enviados.length = 0;
  await correr();
  const m = enviados.filter(e => e.a === 'Mauro');
  igual(m.length, 1, 'un solo mensaje a Mauro');
  if (m[0].tag !== 'ecm-n' || !/Push/.test(m[0].body) || !/comi/.test(m[0].body)) throw new Error('mensaje: ' + m[0].body);
  const o = enviados.filter(e => e.a === 'Otra');
  igual(o.length, 1, 'Otra (sin el módulo de entreno) recibe solo lo de comida');
  if (/Push/.test(o[0].body)) throw new Error('a Otra no se le habla de entreno: ' + o[0].body);
});

await caso('cierre del día: con la meta cumplida solo se recuerda el entreno', async () => {
  const db = baseNoche();
  db.db.user_data = [{ user_id: 'u1', today: fechaEn(tzVeinte), today_entries: [1, 2, 3], goals: { kcal: 2000 }, totals: { kcal: 1900 } }];
  globalThis.fetch = db.fetch;
  enviados.length = 0;
  await correr();
  const m = enviados.filter(e => e.a === 'Mauro');
  igual(m.length, 1, 'un mensaje');
  if (!/Push/.test(m[0].body) || /%/.test(m[0].body)) throw new Error('debía ser solo el entreno: ' + m[0].body);
});

await caso('cierre del día: si ya entrenó hoy y va bajo la meta, solo la comida con su %', async () => {
  const db = baseNoche();
  db.db.sesiones.push({ id: 'hoy-otra', cliente_id: 'c1', rutina_id: 'r-x', fecha: hoy, estado: 'completada', origen: 'cliente' });
  db.db.user_data = [{ user_id: 'u1', today: fechaEn(tzVeinte), today_entries: [1], goals: { kcal: 2000 }, totals: { kcal: 900 } }];
  globalThis.fetch = db.fetch;
  enviados.length = 0;
  await correr();
  const m = enviados.filter(e => e.a === 'Mauro');
  igual(m.length, 1, 'un mensaje');
  if (/Push/.test(m[0].body) || !/45%/.test(m[0].body)) throw new Error('debía ser solo la comida al 45%: ' + m[0].body);
});

await caso('cierre del día: entrenó y cumplió la meta → no se le molesta', async () => {
  const db = baseNoche();
  db.db.sesiones.push({ id: 'hoy-push', cliente_id: 'c1', rutina_id: 'r-c1', fecha: hoy, estado: 'completada', origen: 'cliente' });
  db.db.user_data = [{ user_id: 'u1', today: fechaEn(tzVeinte), today_entries: [1, 2, 3], goals: { kcal: 2000 }, totals: { kcal: 1800 } }];
  globalThis.fetch = db.fetch;
  enviados.length = 0;
  await correr();
  igual(enviados.filter(e => e.a === 'Mauro').length, 0, 'nada para Mauro');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
