// Cardio a elegir: el coach deja varias opciones (caminadora trotando o con
// inclinación o bicicleta), tiempos e intensidad; la app las recibe con su
// actividad del catálogo, y lo que el cliente marca guarda cuál hizo.
//
//   node pruebas/cardio-opciones-api.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const FIJO = Date.parse('2026-09-29T17:00:00Z');
const DateReal = Date;
globalThis.Date = class extends DateReal {
  constructor(...a) { super(...(a.length ? a : [FIJO])); }
  static now() { return FIJO; }
};
const { default: handler } = await import('../api/training.js');

let mal = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };

const opciones = { lista: ['Caminadora trotando', 'Caminadora caminando con inclinación', 'Bicicleta'], minutos: [10, 15, 20, 25, 30], intensidad: 'moderada' };
function base({ conColumna = true } = {}) {
  const ev = { id: 'ev1', cliente_id: 'c1', fase_id: 'f1', tipo: 'actividad', titulo: 'Cardio después de entrenar', detalle: null, duracion_min: 20,
    fecha: null, dias_semana: ['L', 'M', 'X', 'J', 'V'], semanas: null, visible_cliente: true, ...(conColumna ? { opciones } : {}) };
  return crearSupabaseFalso({
    columnas: conColumna ? {} : { eventos: ['id', 'cliente_id', 'fase_id', 'tipo', 'titulo', 'detalle', 'hora', 'fecha', 'dias_semana', 'semanas', 'visible_cliente', 'duracion_min', 'fechas_excluidas'] },
    porDefecto: { sesiones: { estado: 'en_curso' } },
    tablas: {
      clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Juan', estado: 'activo' }],
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Ciclo 5', estado: 'activa', visible_cliente: true, orden: 5, fecha_inicio: '2026-09-21', semanas: 4, dias_semana: ['L', 'X', 'V'] }],
      rutinas: [], rutina_ejercicios: [], ejercicios: [], sesiones: [], series_log: [], actividades: [], evento_registros: [], mediciones_corporales: [],
      eventos: [ev],
      actividades_catalogo: [
        { slug: 'cinta', nombre: 'Caminadora', categoria: 'cardio', remate: true, orden: 10, activo: true },
        { slug: 'bici_estatica', nombre: 'Bicicleta estática', categoria: 'cardio', remate: true, orden: 30, activo: true },
        { slug: 'otro', nombre: 'Otra actividad', categoria: 'otro', orden: 900, activo: true },
      ],
    },
  });
}
const pedir = async (db, cuerpo) => { globalThis.fetch = db.fetch; return llamar(handler, { name: 'Juan', ...cuerpo }); };

{
  const db = base();
  const m = await pedir(db, { accion: 'mes', ym: '2026-09' });
  const ev = m.dias.find(d => d.fecha === '2026-09-29').eventos.find(e => e.id === 'ev1');
  ok('el martes trae el cardio con sus 3 opciones, cada una con su actividad (caminadora, caminadora, bicicleta)', ev && ev.opciones
    && ev.opciones.lista.map(o => o.slug).join() === 'cinta,cinta,bici_estatica' && ev.opciones.minutos.join() === '10,15,20,25,30' && ev.opciones.intensidad === 'moderada', JSON.stringify(ev));
  ok('…y es de «después de entrenar» (se le pide al terminar la rutina)', ev.despues === true);
  const r = await pedir(db, { accion: 'actividad', tipo: 'cinta', fecha: '2026-09-29', titulo: 'Caminadora caminando con inclinación', duracion_min: 25, intensidad: 'moderada', evento_id: 'ev1' });
  const guardada = db.db.actividades[0];
  ok('al marcarlo se guarda cuál hizo, cuánto y que fue lo del coach', r.ok && guardada && guardada.tipo === 'cinta' && guardada.titulo === 'Caminadora caminando con inclinación'
    && Number(guardada.duracion_min) === 25 && guardada.evento_id === 'ev1', JSON.stringify(r) + JSON.stringify(guardada));
  const m2 = await pedir(db, { accion: 'mes', ym: '2026-09' });
  ok('y ese día queda hecho', m2.dias.find(d => d.fecha === '2026-09-29').eventos.find(e => e.id === 'ev1').hecho === true);
}
{
  const db = base({ conColumna: false });
  const m = await pedir(db, { accion: 'mes', ym: '2026-09' });
  const ev = m.ok && m.dias.find(d => d.fecha === '2026-09-29').eventos.find(e => e.id === 'ev1');
  ok('sin la columna: el cardio sale igual, como una actividad normal', ev && !ev.opciones && ev.titulo === 'Cardio después de entrenar', JSON.stringify(m).slice(0, 300));
}

console.log(mal ? `\n${mal} fallo(s)` : `\n${n}/${n} bien`);
process.exit(mal ? 1 : 0);
