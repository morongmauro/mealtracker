// Bloques complementarios (un recovery) el mismo día que la fuerza, contra
// un Supabase en memoria: la fuerza sigue mandando y el bloque va aparte, en
// la semana, el mes y el Dash. Y sin la columna (SQL sin correr), todo como
// antes.
//
//   node pruebas/bloques-api.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
// Martes 29 de septiembre, mediodía de Bogotá.
const FIJO = Date.parse('2026-09-29T17:00:00Z');
const DateReal = Date;
globalThis.Date = class extends DateReal {
  constructor(...a) { super(...(a.length ? a : [FIJO])); }
  static now() { return FIJO; }
};
const { default: handler } = await import('../api/training.js');
const { agendaDeHoy } = await import('../api/_entreno.js');

let mal = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };

function base({ conColumna = true, sesiones = [] } = {}) {
  const rutinas = [
    { id: 'r1', cliente_id: 'c1', fase_id: 'f1', nombre: 'Push', dia_orden: 1, dias_semana: ['L', 'J'], archivada: false },
    { id: 'r2', cliente_id: 'c1', fase_id: 'f1', nombre: 'Lower', dia_orden: 2, dias_semana: ['M', 'V'], archivada: false },
    { id: 'rb', cliente_id: 'c1', fase_id: 'f1', nombre: 'Elbow Recovery', dia_orden: 3, dias_semana: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], archivada: false, duracion_estimada_min: 9 },
  ].map(r => (conColumna ? { ...r, complementaria: r.id === 'rb' } : r));
  return crearSupabaseFalso({
    columnas: conColumna ? {} : { rutinas: ['id', 'cliente_id', 'fase_id', 'nombre', 'descripcion', 'dia_orden', 'dia_semana', 'dias_semana', 'tipo_sesion', 'duracion_estimada_min', 'visible_cliente', 'archivada'] },
    porDefecto: { sesiones: { estado: 'en_curso' }, series_log: { completada: true } },
    tablas: {
      clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Santiago F', estado: 'activo' }],
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Ciclo 2', estado: 'activa', visible_cliente: true, orden: 2, fecha_inicio: '2026-09-21', semanas: 4, dias_semana: ['L', 'M', 'J', 'V'] }],
      rutinas,
      rutina_ejercicios: [
        { id: 'x1', rutina_id: 'r1', ejercicio_id: 'e1', orden: 1, series: 3, reps: '8' },
        { id: 'x2', rutina_id: 'r2', ejercicio_id: 'e1', orden: 1, series: 3, reps: '8' },
        { id: 'x3', rutina_id: 'rb', ejercicio_id: 'e2', orden: 1, series: 3, reps: '6-8' },
        { id: 'x4', rutina_id: 'rb', ejercicio_id: 'e3', orden: 2, series: 3, reps: '6-8' },
      ],
      ejercicios: [{ id: 'e1', nombre: 'Sentadilla' }, { id: 'e2', nombre: 'Supinación' }, { id: 'e3', nombre: 'Pronación' }],
      sesiones, series_log: [], actividades: [], eventos: [], evento_registros: [], mediciones_corporales: [], actividades_catalogo: [],
    },
  });
}
const pedir = async (db, cuerpo) => { globalThis.fetch = db.fetch; return llamar(handler, { name: 'Santiago F', ...cuerpo }); };

// ── La semana ──
{
  const db = base({ sesiones: [
    { id: 's1', cliente_id: 'c1', rutina_id: 'rb', fase_id: 'f1', fecha: '2026-09-28', estado: 'completada' },
    { id: 's2', cliente_id: 'c1', rutina_id: 'r1', fase_id: 'f1', fecha: '2026-09-28', estado: 'completada', rpe: 8 },
  ] });
  const r = await pedir(db, { accion: 'plan' });
  const dia = (d) => r.dias.find(x => x.dia === d);
  ok('semana: el lunes la fuerza sigue siendo Push (el bloque no le quita el día)', dia('L').rutina?.nombre === 'Push' && dia('L').hecha, JSON.stringify(dia('L')));
  ok('semana: el lunes, debajo, el bloque «Elbow Recovery» hecho, con sus 2 ejercicios y 9 min', dia('L').complementarias?.length === 1 && dia('L').complementarias[0].nombre === 'Elbow Recovery'
    && dia('L').complementarias[0].hecha && dia('L').complementarias[0].ejercicios === 2 && dia('L').complementarias[0].minutos === 9, JSON.stringify(dia('L').complementarias));
  ok('semana: el miércoles no hay fuerza (descanso) y el bloque sale igual, sin hacer', dia('X').descanso && dia('X').complementarias.length === 1 && !dia('X').complementarias[0].hecha);
  ok('semana: el bloque con días no sale en «También en tu ciclo»', !(r.sueltas || []).some(x => x.id === 'rb'), JSON.stringify(r.sueltas));

  const m = await pedir(db, { accion: 'mes', ym: '2026-09' });
  const md = (f) => m.dias.find(x => x.fecha === f);
  ok('mes: el lunes 28 Push hecho y el bloque hecho (no sale como «entrenó otra rutina»)', md('2026-09-28').rutina?.nombre === 'Push' && md('2026-09-28').estado === 'completada'
    && md('2026-09-28').complementarias[0].estado === 'completada' && !md('2026-09-28').hecho, JSON.stringify(md('2026-09-28')));
  ok('mes: antes del ciclo (20 sep) no hay bloque', md('2026-09-20').complementarias.length === 0);
  ok('mes: el bloque no se ofrece para «añadir a un día libre»', !m.rutinas.some(x => x.id === 'rb'));

  const d = await pedir(db, { accion: 'dash' });
  const sem = (d.entreno?.semanas || d.semanas || []).slice(-1)[0];
  ok('Dash: esta semana cuenta 1 entreno de fuerza, no 2 (el bloque no suma)', sem && sem.hechos === 1, JSON.stringify(sem));
}

// Solo hizo el bloque: en el mes no aparece como si hubiera entrenado su fuerza.
{
  const db = base({ sesiones: [{ id: 's1', cliente_id: 'c1', rutina_id: 'rb', fase_id: 'f1', fecha: '2026-09-28', estado: 'completada' }] });
  const m = await pedir(db, { accion: 'mes', ym: '2026-09' });
  const x = m.dias.find(d => d.fecha === '2026-09-28');
  ok('solo el bloque: Push queda por hacer y el bloque hecho', x.estado !== 'completada' && !x.hecho && x.complementarias[0].estado === 'completada', JSON.stringify(x));
  globalThis.fetch = db.fetch;
  const ag = await agendaDeHoy(db.fetch ? async (p) => { const r = await db.fetch(`https://crm.test/rest/v1/${p}`); if (!r.ok) throw new Error(String(r.status)); const t = await r.text(); return t ? JSON.parse(t) : null; } : null, '2026-09-28');
  const s = ag.get('santiago f');
  ok('aviso de la noche: hacer solo el bloque no cuenta como «ya entrenó hoy»', s && s.entrenoHoy === false && s.rutina === 'Push', JSON.stringify(s));
}

// Sin la columna (migración sin correr): todo como antes.
{
  const db = base({ conColumna: false });
  const r = await pedir(db, { accion: 'plan' });
  ok('sin la columna: la semana responde igual que antes (sin bloques)', r.ok && r.dias.every(x => (x.complementarias || []).length === 0) && r.dias.find(x => x.dia === 'L').rutina?.nombre === 'Push', JSON.stringify(r).slice(0, 300));
  const m = await pedir(db, { accion: 'mes', ym: '2026-09' });
  ok('sin la columna: el mes responde', m.ok && m.dias.length === 30);
}

console.log(mal ? `\n${mal} fallo(s)` : `\n${n}/${n} bien`);
process.exit(mal ? 1 : 0);
