// El cardio, la caminata y los deportes en la performance: lo que se hace
// suma (hasta +10) y lo que el coach programó y no se marcó resta POQUITO
// (−0,5 cada uno, hasta −5). Siempre suma más de lo que resta. La misma regla
// en la app (Dash, Entreno), en la semana automática y en el CRM.
//
//   node pruebas/performance-cardio.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
// Jueves 1 de octubre, mediodía de Bogotá.
const FIJO = Date.parse('2026-10-01T17:00:00Z');
const DateReal = Date;
globalThis.Date = class extends DateReal {
  constructor(...a) { super(...(a.length ? a : [FIJO])); }
  static now() { return FIJO; }
};
const { default: handler } = await import('../api/training.js');
const { penalSinMarcar, cardioDelCoach, bonoExtra, PENAL_TOPE } = await import('../api/_actividad.js');
const { calcScores } = await import('../api/_semana.js');
const { adherenciaEntreno } = await import('../src/aros.js');

let mal = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };

// ── La regla ──
ok('nada programado: no resta', penalSinMarcar(null) === 0 && penalSinMarcar({ programadas: 0, hechas: 0 }) === 0);
ok('3 programadas, 1 hecha: resta 1 (0,5 cada una)', penalSinMarcar({ programadas: 3, hechas: 1 }) === 1);
ok('20 sin marcar: resta como mucho 5 (no castiga al 100 %)', penalSinMarcar({ programadas: 20, hechas: 0 }) === PENAL_TOPE && PENAL_TOPE === 5);
ok('suma más de lo que resta: la caminata hecha suma 1, sin marcar resta 0,5', bonoExtra({ caminata: 1 }) === 1 && penalSinMarcar({ programadas: 1, hechas: 0 }) === 0.5);
const cal = { '2026-09-28': [{ id: 'a', tipo: 'actividad' }, { id: 'p', tipo: 'peso' }], '2026-09-29': [{ id: 'a', tipo: 'actividad' }], '2026-09-30': [{ id: 'a', tipo: 'actividad' }], '2026-10-01': [{ id: 'a', tipo: 'actividad' }] };
const c = cardioDelCoach(cal, new Set(['a:2026-09-29']), '2026-09-28', '2026-10-01');
ok('solo cuentan los días ya pasados (hoy no) y solo lo de cardio/deporte (no el peso)', c.programadas === 3 && c.hechas === 1, JSON.stringify(c));

// ── El aro: suma, resta poquito, nunca de 0 a 100 de golpe ──
ok('el aro: 3/4 de fuerza +4 de bono −2 sin marcar = 77 %', Math.round(adherenciaEntreno({ hechos: 3, planeados: 4, bono: 4, penal: 2 }) * 100) === 77);
ok('el aro no baja de 0 ni pasa de 100', adherenciaEntreno({ hechos: 0, planeados: 4, bono: 0, penal: 5 }) === 0 && adherenciaEntreno({ hechos: 4, planeados: 4, bono: 10, penal: 0 }) === 1);
ok('sin «penal» (versión vieja del servidor) el aro sale como antes', Math.round(adherenciaEntreno({ hechos: 3, planeados: 4, bono: 4 }) * 100) === 79);

// ── La semana automática (lo que va al CRM) ──
const s0 = { fuerza_planeados: 4, fuerza_ejecutados: 3, actividad_extra: { caminata: 2 } };
const s1 = { ...s0, actividad_extra: { caminata: 2, _coach: { programadas: 4, hechas: 2 } } };
ok('semana automática sin lo del coach: como antes (75 + 2 = 77)', Math.round(calcScores(s0, {}).score_entreno) === 77);
ok('con 2 sin marcar: 75 + 2 − 1 = 76', Math.round(calcScores(s1, {}).score_entreno) === 76);
ok('…y el texto (jsonb como texto) también', Math.round(calcScores({ ...s1, actividad_extra: JSON.stringify(s1.actividad_extra) }, {}).score_entreno) === 76);

// ── El CRM dice lo mismo (calcScores de app.js) ──
{
  const src = readFileSync(new URL('../../CRM_entrenaconmetodo/app.js', import.meta.url), 'utf8');
  const trozo = (a, z) => { const i = src.indexOf(a), j = src.indexOf(z, i); if (i < 0 || j < 0) throw new Error('no encuentro ' + a); return src.slice(i, j); };
  const ctx = vm.createContext({ console });
  vm.runInContext(trozo('const ACTIVIDADES_EXTRA = [', '// ===== Streaks') + '\nglobalThis.crm = calcScores;', ctx);
  const casos = [s0, s1, { ...s1, actividad_extra: { running: 1, _coach: { programadas: 9, hechas: 0 } } }, { fuerza_planeados: 3, fuerza_ejecutados: 3, actividad_extra: { _coach: { programadas: 2, hechas: 2 } } }];
  const iguales = casos.every(x => Math.round(ctx.crm(x, {}).score_entreno) === Math.round(calcScores(x, {}).score_entreno));
  ok('el CRM y la semana automática dan el mismo score de entreno', iguales, casos.map(x => `${Math.round(ctx.crm(x, {}).score_entreno)}/${Math.round(calcScores(x, {}).score_entreno)}`).join(' '));
  ok('semana del CRM con fuerza cumplida y lo del coach hecho: 100', Math.round(ctx.crm(casos[3], {}).score_entreno) === 100);
}

// ── El Dash y el Entreno de la app ──
function base() {
  return crearSupabaseFalso({
    porDefecto: { sesiones: { estado: 'en_curso' } },
    tablas: {
      clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Juan', estado: 'activo' }],
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Ciclo 5', estado: 'activa', visible_cliente: true, orden: 5, fecha_inicio: '2026-09-21', semanas: 4, dias_semana: ['L', 'X', 'V'] }],
      rutinas: [], rutina_ejercicios: [], ejercicios: [], series_log: [], evento_registros: [], mediciones_corporales: [],
      sesiones: [{ id: 's1', cliente_id: 'c1', fecha: '2026-09-28', estado: 'completada' }],
      // Caminata corta del coach de lunes a viernes: marcó la del martes.
      eventos: [{ id: 'ev1', cliente_id: 'c1', fase_id: 'f1', tipo: 'actividad', titulo: 'Caminata corta', fecha: null, dias_semana: ['L', 'M', 'X', 'J', 'V'], semanas: null, visible_cliente: true }],
      actividades: [{ id: 'a1', cliente_id: 'c1', fecha: '2026-09-29', tipo: 'caminata', evento_id: 'ev1', duracion_min: 20 }],
      actividades_catalogo: [{ slug: 'caminata', nombre: 'Caminata', categoria: 'cardio', orden: 70, activo: true }],
    },
  });
}
const pedir = async (db, cuerpo) => { globalThis.fetch = db.fetch; return llamar(handler, { name: 'Juan', ...cuerpo }); };
{
  const db = base();
  const d = await pedir(db, { accion: 'dash' });
  ok('Dash: lunes y miércoles sin marcar (el jueves es hoy y no cuenta): resta 1, la caminata suma 1', d.semana && d.semana.penal === 1 && d.semana.bono === 1
    && d.semana.cardio_coach.programadas === 3 && d.semana.cardio_coach.hechas === 1, JSON.stringify(d.semana && { penal: d.semana.penal, bono: d.semana.bono, c: d.semana.cardio_coach }));
  const p = await pedir(db, { accion: 'plan' });
  ok('Entreno (la semana): trae el mismo −1', p.extra && p.extra.penal === 1 && p.extra.bono === 1, JSON.stringify(p.extra));
}

console.log(mal ? `\n${mal} fallo(s)` : `\n${n}/${n} bien`);
process.exit(mal ? 1 : 0);
