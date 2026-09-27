// El cron de avisos (api/push-cron.js) en lo que toca al entrenamiento:
//   · cierra solas las sesiones olvidadas (y solo esas);
//   · «hoy te toca Push» solo a quien está en la beta y no la hizo ya;
//   · el recordatorio de medición, con el texto que corresponde.
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

// Una zona horaria donde AHORA sean las 9 de la mañana: el turno de mañana.
const tzNueve = (() => {
  for (let n = -14; n <= 12; n++) {
    const tz = n === 0 ? 'Etc/GMT' : `Etc/GMT${n > 0 ? '+' : ''}${n}`;
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date()));
    if (h === 9) return tz;
  }
})();

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
  igual(a.get('mauro moron'), { rutina: 'Push', medicion: false }, 'Mauro');
  igual(a.get('otra persona'), { rutina: 'Push', medicion: true }, 'Otra');
  igual(a.get('ya entreno'), { rutina: null, medicion: false }, 'la hizo hoy: no se insiste');
});

await caso('el aviso «hoy te toca» sale solo a la beta; la medición a quien la tiene', async () => {
  const db = base();
  globalThis.fetch = db.fetch;
  enviados.length = 0;
  let json = null;
  await cron({ method: 'GET', query: { key: 'secreto' }, headers: {} },
    { status() { return this; }, json(j) { json = j; return this; }, setHeader() {}, end() { return this; } });
  const de = (q, tag) => enviados.filter(e => e.a === q && e.tag === tag);
  igual(de('Mauro', 'ecm-t').length, 1, 'Mauro recibe «hoy te toca»');
  if (!/Push/.test(de('Mauro', 'ecm-t')[0].body)) throw new Error('el aviso no nombra la rutina');
  igual(de('Otra', 'ecm-t').length, 0, 'Otra no está en la beta');
  igual(de('Otra', 'ecm-med').length, 1, 'Otra recibe la medición');
  if (!/WhatsApp/.test(de('Otra', 'ecm-med')[0].body)) throw new Error('sin la app, la medición debe pedir el pantallazo por WhatsApp');
  igual(de('Ya', 'ecm-t').length, 0, 'quien ya entrenó no recibe aviso');
  igual(json.olvidadas, { cerradas: 1, borradas: 1 }, 'el cron también cerró las olvidadas');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
