// La rutina que quedó abierta (marcó sus series y no tocó «Terminar»):
//   · al abrirla otro día, la API dice que está a medias (con cuántas series)
//     en vez de devolverla vacía;
//   · «Terminarla» trae la sesión de ese día con sus series, y al cerrarla la
//     duración es la del entreno (no hasta el día siguiente);
//   · nunca se crea una sesión vieja;
//   · el cron avisa al teléfono 2 h después de la última serie (de noche,
//     a las 7 am) y el aviso abre esa rutina.
//
//   node pruebas/rutina-abierta.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';
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

const { default: handler } = await import('../api/training.js');
const { default: cron } = await import('../api/push-cron.js');
const { rutinasAbiertas, tocaAvisarAbierta, hoyBogota, sumarDiasISO } = await import('../api/_entreno.js');

const hoy = hoyBogota();
const ayer = sumarDiasISO(hoy, -1);
const yo = 'David Forero';

function base({ ultima = `${ayer}T02:28:00Z` } = {}) {
  const series = [];
  for (let s = 1; s <= 4; s++) series.push({ id: 'x' + s, sesion_id: 'sMar', rutina_ejercicio_id: 're1', ejercicio_id: 'e1', serie_num: s, reps: 10, peso: 80, unidad: 'kg', completada: true, created_at: s === 4 ? ultima : `${ayer}T01:3${s}:00Z` });
  return crearSupabaseFalso({
    porDefecto: { sesiones: { estado: 'en_curso' }, series_log: { completada: true } },
    tablas: {
      clientes: [{ id: 'c1', user_id: 'coach', nombre: yo, estado: 'activo' }],
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Ciclo 18', estado: 'activa', visible_cliente: true, orden: 1, fecha_inicio: sumarDiasISO(hoy, -20), semanas: 8, dias_semana: ['M', 'X'] }],
      rutinas: [{ id: 'r2', cliente_id: 'c1', fase_id: 'f1', nombre: 'Lower Body + Core Training', dia_orden: 1, dias_semana: ['M'], archivada: false, visible_cliente: null }],
      rutina_ejercicios: [{ id: 're1', rutina_id: 'r2', ejercicio_id: 'e1', orden: 1, series: 4, reps: '10' }],
      ejercicios: [{ id: 'e1', nombre: 'Hip thrust en máquina' }],
      sesiones: [{ id: 'sMar', cliente_id: 'c1', rutina_id: 'r2', fase_id: 'f1', fecha: ayer, estado: 'en_curso', origen: 'cliente' }],
      series_log: series,
      push_subs: [{ endpoint: 'e1', name: yo, tz: 'America/Bogota', sub: { quien: 'David' } }],
      user_data: [],
    },
  });
}
const sbDe = (db) => async (p, opts = {}) => {
  const r = await db.fetch(`https://crm.test/rest/v1/${p}`, opts);
  if (!r.ok) throw new Error('sb ' + r.status);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};

let fallos = 0;
async function caso(nombre, fn) {
  try { await fn(); console.log('  ok   ' + nombre); }
  catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); }
}
const igual = (a, b, que) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${que}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

console.log(`rutina abierta · hoy ${hoy}`);

await caso('abrirla hoy: no la da vacía sin más, dice que quedó a medias ayer con 4 series', async () => {
  const db = base(); globalThis.fetch = db.fetch;
  const r = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', crear: false });
  igual([r.ok, r.sesion, r.pendiente], [true, null, { fecha: ayer, series: 4 }], 'respuesta');
});

await caso('«Terminarla»: trae la sesión de ayer con sus 4 series (sin crear nada)', async () => {
  const db = base(); globalThis.fetch = db.fetch;
  const r = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', crear: false, fecha: ayer, retomar: true });
  igual([r.ok, r.sesion && r.sesion.id, r.series.length], [true, 'sMar', 4], 'retomada');
  igual(db.db.sesiones.length, 1, 'sesiones');
});

await caso('nunca crea una sesión vieja: retomar un día sin sesión no crea nada', async () => {
  const db = base(); globalThis.fetch = db.fetch;
  const r = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', crear: true, fecha: sumarDiasISO(hoy, -3), retomar: true });
  igual([r.ok, r.motivo, db.db.sesiones.length], [false, 'no_hay', 1], 'sin crear');
});

await caso('al cerrarla hoy, la duración es la del entreno (primera a última serie), no hasta ahora', async () => {
  const db = base(); globalThis.fetch = db.fetch;
  const r = await llamar(handler, { accion: 'cerrar', name: yo, sesion_id: 'sMar' });
  const s = db.db.sesiones.find(x => x.id === 'sMar');
  igual([r.ok, s.estado], [true, 'completada'], 'cerrada');
  const esperado = Math.round((Date.parse(`${ayer}T02:28:00Z`) - Date.parse(`${ayer}T01:31:00Z`)) / 1000);
  igual([s.duracion_seg, s.finalizada_en], [esperado, new Date(`${ayer}T02:28:00Z`).toISOString()], 'duración');
});

await caso('si ya entrenó hoy esa rutina, no se le ofrece la de ayer', async () => {
  const db = base(); globalThis.fetch = db.fetch;
  db.db.sesiones.push({ id: 'sHoy', cliente_id: 'c1', rutina_id: 'r2', fase_id: 'f1', fecha: hoy, estado: 'en_curso', origen: 'cliente' });
  const r = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', crear: false });
  igual([r.sesion && r.sesion.id, r.pendiente], ['sHoy', undefined], 'hoy manda');
});

await caso('sin series marcadas no está «a medias» (abrirla para mirar no cuenta)', async () => {
  const db = base(); globalThis.fetch = db.fetch;
  db.db.series_log.length = 0;
  const r = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', crear: false });
  igual(r.pendiente, undefined, 'pendiente');
});

await caso('cuándo avisar: 2 h después de la última serie; si cae de noche, a las 7 am', async () => {
  const u = '2026-11-04T02:28:00Z';  // 9:28 pm en Bogotá
  igual([tocaAvisarAbierta(u, Date.parse('2026-11-04T04:00:00Z')), tocaAvisarAbierta(u, Date.parse('2026-11-04T12:10:00Z')), tocaAvisarAbierta(u, Date.parse('2026-11-04T13:10:00Z'))],
    [false, true, false], 'de noche → 7 am');
  const t = '2026-11-04T20:00:00Z';  // 3 pm
  igual([tocaAvisarAbierta(t, Date.parse('2026-11-04T21:30:00Z')), tocaAvisarAbierta(t, Date.parse('2026-11-04T22:10:00Z')), tocaAvisarAbierta(t, Date.parse('2026-11-04T23:30:00Z'))],
    [false, true, false], 'de tarde → a las 2 h');
});

for (const [que, horaUTC, debe] of [['de día (3 pm)', '20:00', true], ['de noche (11 pm)', '04:00', false]]) {
  await caso(`el cron ${debe ? 'manda' : 'NO manda'} el aviso ${que}, y abre esa rutina`, async () => {
    // El reloj fijo: hoy a esa hora; la última serie, 2 h 10 min antes.
    const DateReal = Date;
    const fijo = DateReal.parse(`${horaUTC === '04:00' ? sumarDiasISO(hoy, 1) : hoy}T${horaUTC}:00Z`);
    globalThis.Date = class extends DateReal { constructor(...a) { if (a.length) super(...a); else super(fijo); } static now() { return fijo; } };
    try {
      const db = base({ ultima: new DateReal(fijo - 130 * 60e3).toISOString() }); globalThis.fetch = db.fetch;
      // La sesión, del día del reloj fijo (hoy o ayer: las dos valen).
      db.db.sesiones[0].fecha = hoyBogota();
      const ab = await rutinasAbiertas(sbDe(db), hoyBogota());
      igual(ab.map(a => [a.sesion_id, a.rutina, a.nombre]), [['sMar', 'Lower Body + Core Training', yo]], 'abiertas');
      enviados.length = 0;
      let json = null;
      await cron({ method: 'GET', query: { key: 'secreto' }, headers: {} }, { status() { return this; }, json(j) { json = j; return this; }, setHeader() {}, end() { return this; } });
      const aviso = enviados.find(e => /quedó abierta/.test(e.body || ''));
      if (debe) {
        igual([!!aviso, aviso && aviso.a, aviso && aviso.url, aviso && aviso.tag], [true, 'David', '/?ir=' + encodeURIComponent('rutina:r2'), 'ecm-abierta-sMar'], 'aviso');
        if (!/^Tu Lower Body \+ Core Training quedó abierta\. Toca para terminarla/.test(aviso.body)) throw new Error(aviso.body);
        igual(json.abiertas, 1, 'resumen del cron');
      } else igual([!!aviso, json.abiertas], [false, 0], 'de noche no sale');
    } finally { globalThis.Date = DateReal; }
  });
}

console.log(fallos ? `\n${fallos} falla(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
