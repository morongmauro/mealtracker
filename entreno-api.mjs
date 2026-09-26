// Prueba api/training.js de punta a punta contra un Supabase en memoria.
//
//   node pruebas/entreno-api.mjs                 → prueba el archivo actual
//   node pruebas/entreno-api.mjs <otro.js>       → prueba otra versión (p. ej.
//                                                  la anterior, para ver qué
//                                                  casos fallaban antes)
//
// Cada caso es un fallo que un cliente habría visto de verdad.

import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';

const archivo = path.resolve(process.argv[2] || new URL('../api/training.js', import.meta.url).pathname);
const { default: handler } = await import(pathToFileURL(archivo).href);

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const mas = (ymd, n) => { const t = new Date(Date.parse(ymd + 'T00:00:00Z')); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const lunes = (() => { const t = new Date(Date.parse(hoy + 'T00:00:00Z')); return mas(hoy, -((t.getUTCDay() + 6) % 7)); })();

function base({ conDescansoEntre = true } = {}) {
  return crearSupabaseFalso({
    columnas: {
      rutina_bloques: ['id', 'rutina_id', 'nombre', 'tipo', 'vueltas', 'descanso_seg', 'orden', 'notas',
        ...(conDescansoEntre ? ['descanso_entre_seg'] : [])],
    },
    porDefecto: { sesiones: { estado: 'en_curso' }, series_log: { completada: true } },
    tablas: {
      clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Mauro Morón', estado: 'activo' }, { id: 'c2', nombre: 'Otra Persona', estado: 'activo' }],
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Fase 1', estado: 'activa', visible_cliente: true, orden: 1,
        fecha_inicio: mas(lunes, -14), semanas: 8, dias_semana: ['L', 'M', 'J', 'V'] }],
      rutinas: [
        { id: 'r1', cliente_id: 'c1', fase_id: 'f1', nombre: 'Push', dia_orden: 1, dias_semana: ['L', 'J'], archivada: false, visible_cliente: null },
        { id: 'r2', cliente_id: 'c1', fase_id: 'f1', nombre: 'Lower', dia_orden: 2, dias_semana: ['M', 'V'], archivada: false, visible_cliente: null },
        { id: 'r9', cliente_id: 'c2', fase_id: null, nombre: 'De otro', archivada: false, visible_cliente: true },
      ],
      rutina_bloques: [
        { id: 'b1', rutina_id: 'r2', nombre: 'Final', tipo: 'circuito', vueltas: 3, descanso_seg: 90, descanso_entre_seg: 20, orden: 1 },
      ],
      rutina_ejercicios: [
        { id: 're1', rutina_id: 'r1', ejercicio_id: 'e1', orden: 1, series: 3, reps: '8', descanso_seg: 120 },
        { id: 're2', rutina_id: 'r1', ejercicio_id: 'e2', orden: 2, series: 3, reps: '10' },
        // El MISMO press otra vez, de remate.
        { id: 're3', rutina_id: 'r1', ejercicio_id: 'e1', orden: 3, series: 2, reps: '15' },
        { id: 're4', rutina_id: 'r2', ejercicio_id: 'e2', bloque_id: 'b1', orden: 1, series: 1, reps: '12' },
      ],
      ejercicios: [{ id: 'e1', nombre: 'Press banca' }, { id: 'e2', nombre: 'Remo' }],
      sesiones: [
        { id: 's0', cliente_id: 'c1', rutina_id: 'r1', fase_id: 'f1', fecha: mas(lunes, -7), estado: 'completada' },
      ],
      series_log: [
        { id: 'l0', sesion_id: 's0', rutina_ejercicio_id: 're1', ejercicio_id: 'e1', serie_num: 1, reps: 8, peso: 60, unidad: 'kg', completada: true, created_at: '2020-01-01T10:00:00Z' },
      ],
    },
  });
}

let fallos = 0, casos = 0;
async function caso(nombre, fn) {
  casos++;
  try { await fn(); console.log('  ok   ' + nombre); }
  catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); }
}
const igual = (a, b, qué) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${qué}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };
const yo = 'Mauro Morón';

console.log(`api/training.js · ${path.relative(process.cwd(), archivo)} · hoy ${hoy}`);

await caso('mirar una rutina no crea una sesión «a medias»', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  await llamar(handler, { accion: 'rutina', name: yo, id: 'r2' });
  await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', crear: false });
  igual(sb.db.sesiones.filter(s => s.rutina_id === 'r2').length, 0, 'sesiones de r2');
});

await caso('el mismo ejercicio dos veces en la rutina no se pisa', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const a = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1' });
  const sid = a.sesion.id;
  await llamar(handler, { accion: 'serie', name: yo, sesion_id: sid, rutina_ejercicio_id: 're1', ejercicio_id: 'e1', serie_num: 1, reps: 8, peso: 62.5 });
  await llamar(handler, { accion: 'serie', name: yo, sesion_id: sid, rutina_ejercicio_id: 're3', ejercicio_id: 'e1', serie_num: 1, reps: 15, peso: 40 });
  const mias = sb.db.series_log.filter(l => l.sesion_id === sid);
  igual(mias.length, 2, 'filas guardadas');
  igual(mias.map(l => l.peso).sort(), [40, 62.5], 'pesos');
});

await caso('corregir una serie la actualiza, no la duplica', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const a = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1' });
  const b = { accion: 'serie', name: yo, sesion_id: a.sesion.id, rutina_ejercicio_id: 're1', ejercicio_id: 'e1', serie_num: 2 };
  await llamar(handler, { ...b, reps: 8, peso: 60 });
  await llamar(handler, { ...b, reps: 7, peso: 60 });
  igual(sb.db.series_log.filter(l => l.sesion_id === a.sesion.id).map(l => l.reps), [7], 'reps');
});

await caso('una serie desmarcada no vuelve marcada al retomar', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const a = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1' });
  const b = { accion: 'serie', name: yo, sesion_id: a.sesion.id, rutina_ejercicio_id: 're1', ejercicio_id: 'e1', serie_num: 1 };
  await llamar(handler, { ...b, reps: 8, peso: 60 });
  await llamar(handler, { ...b, reps: null, peso: null, completada: false });
  const otra = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1' });
  igual(otra.series.filter(x => x.completada !== false).length, otra.series.length, 'devuelve solo marcadas');
  igual(otra.series.length, 0, 'series devueltas');
});

await caso('al retomar, «la última vez» es la semana pasada, no lo de hace diez minutos', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const a = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1' });
  await llamar(handler, { accion: 'serie', name: yo, sesion_id: a.sesion.id, rutina_ejercicio_id: 're1', ejercicio_id: 'e1', serie_num: 1, reps: 5, peso: 70 });
  const r = await llamar(handler, { accion: 'rutina', name: yo, id: 'r1' });
  const press = r.rutina.ejercicios.find(x => x.id === 're1');
  igual(press.ultima_vez.fecha, mas(lunes, -7), 'fecha de «la última vez»');
  igual(press.ultima_vez.mejor_peso, 60, 'peso sugerido');
});

await caso('el circuito trae sus dos descansos', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'rutina', name: yo, id: 'r2' });
  igual([r.rutina.bloques[0].descanso_seg, r.rutina.bloques[0].descanso_entre_seg], [90, 20], 'descansos');
});

await caso('sin la columna nueva en la base, la rutina abre igual', async () => {
  const sb = base({ conDescansoEntre: false }); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'rutina', name: yo, id: 'r2' });
  igual(r.ok, true, 'ok');
  igual(r.rutina.bloques.length, 1, 'bloques');
});

await caso('series marcadas sin señal ayer suben con la fecha de ayer; más atrás no', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const ayer = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', fecha: mas(hoy, -1) });
  igual(ayer.sesion.fecha, mas(hoy, -1), 'ayer');
  const vieja = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1', fecha: mas(hoy, -3) });
  igual(vieja.sesion.fecha, hoy, 'hace tres días → hoy');
  const futura = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2', fecha: mas(hoy, 2) });
  igual(futura.sesion.fecha, hoy, 'futuro → hoy');
});

await caso('«No pude entrenar hoy» deja la sesión como saltada', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const a = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r2' });
  const c = await llamar(handler, { accion: 'cerrar', name: yo, sesion_id: a.sesion.id, estado: 'saltada', notas: 'viaje' });
  igual([c.ok, c.sesion.estado], [true, 'saltada'], 'estado');
});

await caso('no se abre la rutina de otro cliente mandando su id', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'rutina', name: yo, id: 'r9' });
  igual(r.ok, false, 'ok');
});

await caso('la semana: el Push del lunes hecho el martes cuenta, y el martes no se roba', async () => {
  if (hoy === lunes) return; // el martes aún no ha pasado: el caso no se puede montar hoy
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.sesiones.push({ id: 'sx', cliente_id: 'c1', rutina_id: 'r1', fase_id: 'f1', fecha: mas(lunes, 1), estado: 'completada' });
  const p = await llamar(handler, { accion: 'plan', name: yo });
  const L = p.dias.find(d => d.dia === 'L'), M = p.dias.find(d => d.dia === 'M');
  igual([L.hecha, L.hecha_el], [true, mas(lunes, 1)], 'lunes');
  igual(M.hecha, false, 'martes (tocaba Lower)');
});

await caso('el mes: entrenar otra rutina ese día se ve', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  // Push hecho en un día de Lower (martes de la semana pasada).
  const dia = mas(lunes, -6);
  sb.db.sesiones.push({ id: 'sy', cliente_id: 'c1', rutina_id: 'r1', fase_id: 'f1', fecha: dia, estado: 'completada' });
  const m = await llamar(handler, { accion: 'mes', name: yo, ym: dia.slice(0, 7) });
  const d = m.dias.find(x => x.fecha === dia);
  igual([d.rutina && d.rutina.nombre, d.hecho && d.hecho.nombre], ['Lower', 'Push'], 'lo que tocaba y lo que hizo');
});

await caso('récords en kg y lb: 120 lb no le gana a 60 kg; 140 lb sí', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const a = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1' });
  const b = { accion: 'serie', name: yo, sesion_id: a.sesion.id, rutina_ejercicio_id: 're1', ejercicio_id: 'e1', reps: 8, unidad: 'lb' };
  await llamar(handler, { ...b, serie_num: 1, peso: 120 });
  let c = await llamar(handler, { accion: 'cerrar', name: yo, sesion_id: a.sesion.id });
  igual(c.records.length, 0, '120 lb (54 kg) < 60 kg');
  await llamar(handler, { ...b, serie_num: 2, peso: 140 });
  c = await llamar(handler, { accion: 'cerrar', name: yo, sesion_id: a.sesion.id });
  igual([c.records.length, c.records[0] && c.records[0].unidad, c.records[0] && c.records[0].antes.unidad], [1, 'lb', 'kg'], '140 lb (63.5 kg) > 60 kg');
  igual(!!sb.db.sesiones.find(x => x.id === a.sesion.id).records, true, 'los récords quedan guardados en la sesión');
});

await caso('la última vez en libras: la app lo sabe', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.series_log.push({ id: 'l1', sesion_id: 's0', rutina_ejercicio_id: 're2', ejercicio_id: 'e2', serie_num: 1, reps: 10, peso: 50, unidad: 'lb', completada: true });
  const r = await llamar(handler, { accion: 'rutina', name: yo, id: 'r1' });
  const remo = r.rutina.ejercicios.find(x => x.id === 're2');
  igual([remo.ultima_vez.mejor_peso, remo.ultima_vez.unidad], [50, 'lb'], 'peso y unidad');
});

await caso('mi medida: se guarda con coma, marcada como del cliente, y con su coach', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'medida', name: yo, peso: '72,5', grasa_pct: '18' });
  igual(r.ok, true, 'ok');
  const m = sb.db.mediciones_corporales[0];
  igual([m.peso, m.grasa_pct, m.origen, m.user_id, m.cliente_id], [72.5, 18, 'cliente', 'coach-1', 'c1'], 'fila');
  const l = await llamar(handler, { accion: 'medidas', name: yo });
  igual(l.medidas.length, 1, 'la ve en su lista');
});

await caso('mi medida: rechaza lo absurdo y el futuro', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'medida', name: yo, peso: 7 })).motivo, 'peso_fuera_de_rango', '7 kg');
  igual((await llamar(handler, { accion: 'medida', name: yo, grasa_pct: 90 })).motivo, 'grasa_fuera_de_rango', '90%');
  igual((await llamar(handler, { accion: 'medida', name: yo, peso: 70, fecha: mas(hoy, 3) })).motivo, 'fecha_futura', 'futuro');
  igual((await llamar(handler, { accion: 'medida', name: yo })).motivo, 'vacia', 'vacía');
  igual((sb.db.mediciones_corporales || []).length, 0, 'nada guardado');
});

await caso('nota al coach sobre un ejercicio: queda pegada al ejercicio', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'nota', name: yo, texto: 'Me molesta el hombro', rutina_id: 'r1', rutina_ejercicio_id: 're1' });
  igual(r.ok, true, 'ok');
  const n = sb.db.notas_entreno[0];
  igual([n.texto, n.rutina_id, n.ejercicio_id, n.user_id, n.fecha], ['Me molesta el hombro', 'r1', 'e1', 'coach-1', hoy], 'fila');
});

await caso('nota al coach: no se cuelga de la rutina de otro cliente', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'nota', name: yo, texto: 'hola', rutina_id: 'r9' });
  igual([r.ok, r.motivo], [false, 'no_es_suya'], 'rechazo');
});

await caso('las fotos están apagadas', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'fotos', name: yo })).motivo, 'desactivado', 'ver');
  igual((await llamar(handler, { accion: 'foto_borrar', name: yo, id: 'x' })).motivo, 'desactivado', 'borrar');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
