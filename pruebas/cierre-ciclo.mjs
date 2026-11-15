// Fin de ciclo: el primer día de la última semana le toca actualizar su
// composición corporal y su registro fotográfico. Desde ese día el Dash le
// trae el recordatorio, y se queda hasta que registre su composición.
//
//   node pruebas/cierre-ciclo.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
let FIJO = Date.parse('2026-10-01T17:00:00Z');   // jueves 1 de octubre
const DateReal = Date;
globalThis.Date = class extends DateReal {
  constructor(...a) { super(...(a.length ? a : [FIJO])); }
  static now() { return FIJO; }
};
const { default: handler, fechaCierreCiclo } = await import('../api/training.js');

let mal = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };

ok('el cierre es el primer día de la última semana (3 semanas desde el 28 sep → 12 oct)', fechaCierreCiclo({ fecha_inicio: '2026-09-28', semanas: 3 }) === '2026-10-12');
ok('sin fecha o sin semanas, no hay cierre', fechaCierreCiclo({ fecha_inicio: null, semanas: 3 }) === null && fechaCierreCiclo({ fecha_inicio: '2026-09-28', semanas: 0 }) === null);

function base({ medidas = [], registros = [] } = {}) {
  return crearSupabaseFalso({
    tablas: {
      clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Juan', estado: 'activo' }],
      // Ciclo de 2 semanas desde el 21 de sep: cierra el lunes 28.
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Ciclo 5', estado: 'activa', visible_cliente: true, orden: 5, fecha_inicio: '2026-09-21', semanas: 2, dias_semana: ['L', 'X', 'V'] }],
      eventos: [
        { id: 'ec', cliente_id: 'c1', fase_id: 'f1', tipo: 'medidas', titulo: 'Actualizar composición corporal', fecha: '2026-09-28', dias_semana: [], visible_cliente: null, auto: 'cierre_composicion' },
        { id: 'ef', cliente_id: 'c1', fase_id: 'f1', tipo: 'fotos', titulo: 'Registro fotográfico', fecha: '2026-09-28', dias_semana: [], visible_cliente: null, auto: 'cierre_fotos' },
      ],
      evento_registros: registros, mediciones_corporales: medidas,
      rutinas: [], rutina_ejercicios: [], ejercicios: [], sesiones: [], series_log: [], actividades: [], actividades_catalogo: [],
    },
  });
}
const pedir = async (db, cuerpo) => { globalThis.fetch = db.fetch; return llamar(handler, { name: 'Juan', ...cuerpo }); };

{
  const d = await pedir(base(), { accion: 'dash' });
  ok('3 días después del cierre y sin registrar: recordatorio de composición y fotos', d.cierre && d.cierre.fecha === '2026-09-28' && !d.cierre.composicion && !d.cierre.fotos, JSON.stringify(d.cierre));
}
{
  const d = await pedir(base({ registros: [{ evento_id: 'ef', cliente_id: 'c1', fecha: '2026-09-28', estado: 'hecho' }] }), { accion: 'dash' });
  ok('marcó las fotos: el recordatorio sigue (solo composición)', d.cierre && d.cierre.fotos === true && d.cierre.composicion === false, JSON.stringify(d.cierre));
}
{
  const d = await pedir(base({ medidas: [{ id: 'm1', cliente_id: 'c1', user_id: 'x', fecha: '2026-09-30', peso: 80, grasa_pct: 18 }] }), { accion: 'dash' });
  ok('registró su composición después del cierre: ya no sale', d.cierre && d.cierre.composicion === true, JSON.stringify(d.cierre));
}
{
  const d = await pedir(base({ medidas: [{ id: 'm0', cliente_id: 'c1', user_id: 'x', fecha: '2026-09-20', peso: 80 }] }), { accion: 'dash' });
  ok('una medición de ANTES del cierre no cuenta', d.cierre && d.cierre.composicion === false);
}
{
  FIJO = Date.parse('2026-09-25T17:00:00Z');   // antes del cierre
  const d = await pedir(base(), { accion: 'dash' });
  ok('antes del cierre no hay recordatorio', d.cierre === null, JSON.stringify(d.cierre));
  FIJO = Date.parse('2026-11-05T17:00:00Z');   // más de 4 semanas después
  const d2 = await pedir(base(), { accion: 'dash' });
  ok('más de 4 semanas después, ya no insiste', d2.cierre === null, JSON.stringify(d2.cierre));
}

console.log(mal ? `\n${mal} fallo(s)` : `\n${n}/${n} bien`);
process.exit(mal ? 1 : 0);
