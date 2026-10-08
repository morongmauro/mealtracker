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

// El reloj, fijo en un MARTES al mediodía de Bogotá: mover y añadir rutinas
// solo vale en la semana en curso, y así los casos no dependen del día en
// que se corran (lunes ya pasó; de miércoles a domingo, por venir).
const FIJO = Date.parse('2026-09-29T17:00:00Z');
const DateReal = Date;
globalThis.Date = class extends DateReal {
  constructor(...a) { super(...(a.length ? a : [FIJO])); }
  static now() { return FIJO; }
};

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
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Fase 1', objetivo: 'Bloque importado de Trainerize — la rutina que ya venía haciendo.', estado: 'activa', visible_cliente: true, orden: 1,
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

await caso('la nota de la importación no le llega al cliente', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const p = await llamar(handler, { accion: 'plan', name: yo });
  igual(p.fase.objetivo, null, 'objetivo en el plan');
  const r = await llamar(handler, { accion: 'rutinas', name: yo });
  igual(JSON.stringify(r).includes('rainerize') || JSON.stringify(r).includes('mportad'), false, 'nada en las rutinas');
  sb.db.fases[0].objetivo = 'Ganar fuerza en los básicos';
  igual((await llamar(handler, { accion: 'plan', name: yo })).fase.objetivo, 'Ganar fuerza en los básicos', 'un objetivo de verdad sí sale');
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

await caso('mi medida: un día de margen por la hora del teléfono', async () => {
  globalThis.fetch = base().fetch;
  igual((await llamar(handler, { accion: 'medida', name: yo, peso: 70, fecha: mas(hoy, 1) })).ok, true, 'mañana según su teléfono');
  igual((await llamar(handler, { accion: 'medida', name: yo, peso: 70, fecha: mas(hoy, 2) })).motivo, 'fecha_futura', 'pasado mañana');
});

await caso('nota al coach sobre un ejercicio: queda pegada al ejercicio', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'nota', name: yo, texto: 'Me molesta el hombro', rutina_id: 'r1', rutina_ejercicio_id: 're1' });
  igual(r.ok, true, 'ok');
  const n = sb.db.notas_entreno[0];
  igual([n.texto, n.rutina_id, n.ejercicio_id, n.user_id, n.fecha], ['Me molesta el hombro', 'r1', 'e1', 'coach-1', hoy], 'fila');
});

// El WhatsApp al coach: se captura la llamada a CallMeBot sin salir a la red.
function conWhatsapp(sb) {
  const enviados = [];
  process.env.CALLMEBOT_APIKEY = 'llave';
  globalThis.fetch = async (url, o) => {
    if (String(url).startsWith('https://api.callmebot.com/')) {
      enviados.push(new URL(url).searchParams.get('text'));
      return new Response('ok', { status: 200 });
    }
    return sb.fetch(url, o);
  };
  return enviados;
}

await caso('nota sobre un ejercicio: te llega al WhatsApp con el ejercicio y la nota', async () => {
  const sb = base(); const w = conWhatsapp(sb);
  sb.db.ejercicios[0].alias = 'Bench Press';
  await llamar(handler, { accion: 'nota', name: yo, texto: 'Me molesta el hombro', rutina_id: 'r1', rutina_ejercicio_id: 're1' });
  delete process.env.CALLMEBOT_APIKEY;
  igual(w, ['📝 Nota de Mauro Morón\nEjercicio: Bench Press (Press banca)\nRutina: Push\n«Me molesta el hombro»'], 'whatsapp');
});

await caso('nota general (sin ejercicio) y nota al cerrar: también llegan al WhatsApp', async () => {
  const sb = base(); const w = conWhatsapp(sb);
  await llamar(handler, { accion: 'nota', name: yo, texto: 'Esta semana viajo', rutina_id: 'r1' });
  await llamar(handler, { accion: 'nota', name: yo, texto: 'Todo bien' });
  const a = await llamar(handler, { accion: 'abrir', name: yo, rutina_id: 'r1' });
  await llamar(handler, { accion: 'cerrar', name: yo, sesion_id: a.sesion.id, estado: 'completada', rpe: 7, notas: 'Me costó el final' });
  delete process.env.CALLMEBOT_APIKEY;
  igual(w, [
    '📝 Nota de Mauro Morón\nSobre la rutina: Push\n«Esta semana viajo»',
    '📝 Nota de Mauro Morón\nNota general\n«Todo bien»',
    '📝 Nota de Mauro Morón\nAl cerrar la rutina: Push (terminó)\n«Me costó el final»',
  ], 'whatsapp');
});

await caso('sin llave de CallMeBot no se intenta el WhatsApp y la nota se guarda igual', async () => {
  const sb = base(); const w = conWhatsapp(sb); delete process.env.CALLMEBOT_APIKEY;
  const r = await llamar(handler, { accion: 'nota', name: yo, texto: 'hola', rutina_id: 'r1' });
  igual([r.ok, w.length, sb.db.notas_entreno.length], [true, 0, 1], 'nota sin whatsapp');
});

await caso('nota al coach: no se cuelga de la rutina de otro cliente', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'nota', name: yo, texto: 'hola', rutina_id: 'r9' });
  igual([r.ok, r.motivo], [false, 'no_es_suya'], 'rechazo');
});

await caso('el mes marca el inicio del ciclo y la fecha de corte de pago', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.clientes[0].dia_pago = 31;
  const ini = sb.db.fases[0].fecha_inicio;
  const r = await llamar(handler, { accion: 'mes', name: yo, ym: ini.slice(0, 7) });
  const diaIni = r.dias.find(d => d.fecha === ini);
  igual(diaIni.inicio_ciclo, true, 'inicio del ciclo');
  igual(r.dias.filter(d => d.inicio_ciclo).length, 1, 'un solo inicio');
  const ultimo = r.dias[r.dias.length - 1];
  igual([ultimo.corte_pago, r.dias.filter(d => d.corte_pago).length], [true, 1], 'corte el 31 → último día del mes');
  sb.db.clientes[0].estado = 'pausado';
  const r2 = await llamar(handler, { accion: 'mes', name: yo, ym: ini.slice(0, 7) });
  igual(r2.dias.some(d => d.corte_pago), false, 'sin corte si no está activo');
});

await caso('las fotos están apagadas', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'fotos', name: yo })).motivo, 'desactivado', 'ver');
  igual((await llamar(handler, { accion: 'foto_borrar', name: yo, id: 'x' })).motivo, 'desactivado', 'borrar');
});

// Semana en curso (hoy martes): L Push (ya pasó) · M Lower (hoy) · X libre ·
// J Push · V Lower · S y D libres.
const mesDe = async (fechas) => {
  const dias = {};
  for (const ym of new Set(fechas.map(f => f.slice(0, 7)))) {
    (await llamar(handler, { accion: 'mes', name: yo, ym })).dias.forEach(d => { dias[d.fecha] = d; });
  }
  return dias;
};

await caso('mover de día: el Push del jueves pasa al miércoles, y solo esa semana', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const J = mas(lunes, 3), X = mas(lunes, 2);
  const r = await llamar(handler, { accion: 'mover', name: yo, desde: J, hasta: X, rutina_id: 'r1' });
  igual([r.ok, r.intercambio], [true, null], 'movida');
  igual(sb.db.rutina_movimientos[0].user_id, 'coach-1', 'con el coach del cliente');
  const dias = await mesDe([J, X, mas(lunes, 10)]);
  igual([dias[J].rutina, dias[X].rutina && dias[X].rutina.nombre, dias[X].movida], [null, 'Push', true], 'esa semana');
  igual(dias[mas(lunes, 10)].rutina && dias[mas(lunes, 10)].rutina.nombre, 'Push', 'la semana siguiente vuelve al jueves');
  igual(sb.db.rutinas.find(x => x.id === 'r1').dias_semana, ['L', 'J'], 'el plan del coach no se toca');
});

await caso('mover de día: si el destino tiene rutina, se intercambian', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const V = mas(lunes, 4), J = mas(lunes, 3);
  const r = await llamar(handler, { accion: 'mover', name: yo, desde: V, hasta: J });
  igual([r.ok, r.intercambio && r.intercambio.nombre], [true, 'Push'], 'intercambio');
  const dias = await mesDe([V, J]);
  igual([dias[V].rutina.nombre, dias[J].rutina.nombre], ['Push', 'Lower'], 'viernes y jueves');
});

await caso('mover de día: la semana de Hoy lo refleja', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const libre = mas(lunes, 1), destino = mas(lunes, 6);
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: libre, hasta: destino })).ok, true, 'movida');
  const p = await llamar(handler, { accion: 'plan', name: yo });
  const a = p.dias.find(d => d.fecha === libre), b = p.dias.find(d => d.fecha === destino);
  igual([a.rutina, !!b.rutina, b.movida], [null, true, true], 'semana');
});

await caso('mover de día: un día que ya pasó de ESTA semana sí se mueve (para compensar)', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  if (hoy === lunes) return; // el lunes aún no ha pasado: el caso no se puede montar hoy
  const X = mas(lunes, 2);
  const r = await llamar(handler, { accion: 'mover', name: yo, desde: lunes, hasta: X });
  igual([r.ok, r.movida && r.movida.nombre], [true, 'Push'], 'el Push perdido del lunes pasa al miércoles');
  const dias = await mesDe([lunes, X]);
  igual([dias[lunes].rutina, dias[X].rutina && dias[X].rutina.nombre], [null, 'Push'], 'lunes libre, miércoles con Push');
});

await caso('mover de día: también en las semanas que vienen, dentro del ciclo', async () => {
  let sb = base(); globalThis.fetch = sb.fetch;
  const r1 = await llamar(handler, { accion: 'mover', name: yo, desde: mas(lunes, 7), hasta: mas(lunes, 9) });
  igual([r1.ok, r1.movida && r1.movida.nombre], [true, 'Push'], 'el lunes que viene pasa al miércoles que viene');
  sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: mas(lunes, 3), hasta: mas(lunes, 8) })).ok, true, 'de esta semana a la otra');
  sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: mas(lunes, 35), hasta: mas(lunes, 44) })).motivo, 'fuera_de_fase', 'no más allá del ciclo');
});

await caso('mover de día: ni las semanas que ya pasaron, ni lo que no está ese día', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: mas(lunes, -7), hasta: mas(lunes, 2) })).motivo, 'semana_pasada', 'de la semana pasada');
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: mas(lunes, 3), hasta: mas(lunes, -1) })).motivo, 'semana_pasada', 'al domingo pasado');
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: mas(lunes, 2), hasta: mas(lunes, 5) })).motivo, 'no_esta_ese_dia', 'miércoles vacío');
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: mas(lunes, 3), hasta: mas(lunes, 2), rutina_id: 'r2' })).motivo, 'no_esta_ese_dia', 'otra rutina');
  igual((sb.db.rutina_movimientos || []).length, 0, 'no se guardó nada');
});

await caso('añadir rutina: a un día libre de esta semana, sin tocar el plan', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const S = mas(lunes, 5);
  const r = await llamar(handler, { accion: 'agregar_rutina', name: yo, fecha: S, rutina_id: 'r1' });
  igual([r.ok, r.agregada && r.agregada.nombre], [true, 'Push'], 'añadida');
  const m = await llamar(handler, { accion: 'mes', name: yo, ym: S.slice(0, 7) });
  const d = m.dias.find(x => x.fecha === S);
  igual([d.rutina && d.rutina.nombre, d.extra, d.movida], ['Push', true, false], 'el sábado tiene Push añadido');
  igual(m.rutinas.map(x => x.id).sort(), ['r1', 'r2'], 'el mes trae las rutinas del ciclo para elegir');
  igual(m.semana.desde, lunes, 'y la semana en la que se puede cambiar');
  const p = await llamar(handler, { accion: 'plan', name: yo });
  igual(!!p.dias.find(x => x.fecha === S).rutina, true, 'Hoy también lo ve');
  igual(sb.db.rutinas.find(x => x.id === 'r1').dias_semana, ['L', 'J'], 'el plan del coach no se toca');
  igual((await llamar(handler, { accion: 'mover', name: yo, desde: S, hasta: mas(lunes, 6) })).motivo, 'es_extra', 'lo añadido no se arrastra');
  igual((await llamar(handler, { accion: 'quitar_rutina', name: yo, fecha: S })).ok, true, 'se quita');
  const m2 = await llamar(handler, { accion: 'mes', name: yo, ym: S.slice(0, 7) });
  igual(m2.dias.find(x => x.fecha === S).rutina, null, 'y el sábado vuelve a estar libre');
});

await caso('añadir rutina: ni en un día con rutina, ni en semanas que ya pasaron, ni fuera del ciclo, ni una rutina ajena', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'agregar_rutina', name: yo, fecha: mas(lunes, 3), rutina_id: 'r2' })).motivo, 'ocupado', 'jueves tiene Push');
  igual((await llamar(handler, { accion: 'agregar_rutina', name: yo, fecha: mas(lunes, 5), rutina_id: 'r9' })).motivo, 'no_es_suya', 'de otro cliente');
  igual((await llamar(handler, { accion: 'agregar_rutina', name: yo, fecha: mas(lunes, -3), rutina_id: 'r1' })).motivo, 'semana_pasada', 'la semana pasada');
  igual((await llamar(handler, { accion: 'agregar_rutina', name: yo, fecha: mas(lunes, 44), rutina_id: 'r1' })).motivo, 'fuera_de_fase', 'después del ciclo');
  igual((sb.db.rutina_extras || []).length, 0, 'no se guardó nada');
});

await caso('añadir rutina: en la semana que viene sí', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const r = await llamar(handler, { accion: 'agregar_rutina', name: yo, fecha: mas(lunes, 12), rutina_id: 'r1' });
  igual([r.ok, r.agregada && r.agregada.fecha], [true, mas(lunes, 12)], 'el sábado que viene');
});

await caso('semanas que ya pasaron: no se llenan (actividad ni registro)', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  igual((await llamar(handler, { accion: 'actividad', name: yo, tipo: 'caminata', fecha: mas(lunes, -1), duracion_min: 30 })).motivo, 'semana_pasada', 'caminata del domingo pasado');
  igual((await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'x', fecha: mas(lunes, -2) })).motivo, 'semana_pasada', 'registro del sábado pasado');
});

await caso('el mes trae los músculos de cada rutina (para avisar si se repiten días seguidos)', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.ejercicios[0].musculos_primarios = ['pectoral_mayor', 'triceps'];
  const m = await llamar(handler, { accion: 'mes', name: yo, ym: hoy.slice(0, 7) });
  igual(m.rutinas.find(r => r.id === 'r1').musculos.sort(), ['pectoral_mayor', 'triceps'], 'Push trabaja pecho y tríceps');
});

await caso('peso en el calendario: se marca con su peso, sale hecho en el mes y no se duplica', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.eventos = [
    { id: 'evp', cliente_id: 'c1', fase_id: null, tipo: 'peso', titulo: 'Pesarse', fecha: hoy, visible_cliente: true },
    { id: 'evn', cliente_id: 'c1', fase_id: null, tipo: 'actividad', titulo: 'Natación', fecha: hoy, visible_cliente: true },
    { id: 'evo', cliente_id: 'c2', fase_id: null, tipo: 'fotos', titulo: 'Fotos', fecha: hoy, visible_cliente: true },
  ];
  const r = await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evp', fecha: hoy, valor: '78,4' });
  igual([r.ok, r.tipo], [true, 'peso'], 'marcado');
  await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evp', fecha: hoy, valor: '78,2' });
  igual(sb.db.evento_registros.length, 1, 'corregir el peso no duplica');
  igual(Number(sb.db.evento_registros[0].valor), 78.2, 'queda el último peso');
  const m = await llamar(handler, { accion: 'mes', name: yo, ym: hoy.slice(0, 7) });
  const ev = m.dias.find(d => d.fecha === hoy).eventos.find(e => e.id === 'evp');
  igual([ev.registra, ev.hecho, Number(ev.valor)], [true, true, 78.2], 'en el mes');
  igual(m.dias.find(d => d.fecha === hoy).eventos.find(e => e.id === 'evn').registra, false, 'la natación no se «registra»');
});

await caso('registrar: ni lo de otro cliente, ni una actividad, ni otro día, ni el futuro', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.eventos = [
    { id: 'evf', cliente_id: 'c1', fase_id: null, tipo: 'fotos', titulo: 'Fotos', fecha: hoy, visible_cliente: true },
    { id: 'evn', cliente_id: 'c1', fase_id: null, tipo: 'actividad', titulo: 'Natación', fecha: hoy, visible_cliente: true },
    { id: 'evo', cliente_id: 'c2', fase_id: null, tipo: 'fotos', titulo: 'Fotos', fecha: hoy, visible_cliente: true },
  ];
  igual((await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evo', fecha: hoy })).motivo, 'no_es_suyo', 'de otro');
  igual((await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evn', fecha: hoy })).motivo, 'no_se_registra', 'actividad');
  igual((await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evf', fecha: mas(hoy, -1) })).motivo, 'no_cae_ese_dia', 'otro día');
  igual((await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evf', fecha: mas(hoy, 5) })).motivo, 'fecha_futura', 'futuro');
  igual((sb.db.evento_registros || []).length, 0, 'nada guardado');
  igual((await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evf', fecha: hoy })).ok, true, 'fotos marcadas');
  igual((await llamar(handler, { accion: 'registrar', name: yo, evento_id: 'evf', fecha: hoy, hecho: false })).hecho, false, 'y desmarcadas');
  igual(sb.db.evento_registros[0].estado, 'saltado', 'desmarcar no borra: queda «saltado»');
});

await caso('comunidad: solo lo de su coach, con sus reacciones; reaccionar pone y quita', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.comunidad_posts = [
    { id: 'p1', user_id: 'coach-1', texto: 'Semana nueva', fijado: false, publicado_en: '2026-09-28T10:00:00Z', borrado_en: null },
    { id: 'p2', user_id: 'coach-1', texto: 'Fijado', fijado: true, publicado_en: '2026-09-20T10:00:00Z', borrado_en: null },
    { id: 'p3', user_id: 'coach-1', texto: 'Borrado', fijado: false, publicado_en: '2026-09-27T10:00:00Z', borrado_en: '2026-09-27T11:00:00Z' },
    { id: 'p9', user_id: 'otro-coach', texto: 'De otro coach', fijado: false, publicado_en: '2026-09-29T10:00:00Z', borrado_en: null },
  ];
  sb.db.comunidad_reacciones = [{ post_id: 'p1', cliente_id: 'cX', tipo: 'fuego' }];
  sb.db.comunidad_vistas = [];
  const r = await llamar(handler, { accion: 'comunidad', name: yo });
  igual(r.posts.map(p => p.id), ['p2', 'p1'], 'fijado primero, sin borrados ni de otro coach');
  igual([r.posts[1].reacciones.fuego, r.posts[1].mias], [1, []], 'cuenta las de otros');
  igual((await llamar(handler, { accion: 'reaccionar', name: yo, post_id: 'p9', tipo: 'fuego' })).motivo, 'no_es_de_su_coach', 'de otro coach no');
  igual((await llamar(handler, { accion: 'reaccionar', name: yo, post_id: 'p1', tipo: 'baile' })).motivo, 'tipo', 'tipo raro no');
  await llamar(handler, { accion: 'reaccionar', name: yo, post_id: 'p1', tipo: 'fuerza' });
  await llamar(handler, { accion: 'reaccionar', name: yo, post_id: 'p1', tipo: 'fuerza' });
  igual(sb.db.comunidad_reacciones.filter(x => x.cliente_id === 'c1').length, 1, 'dos toques no duplican');
  const r2 = await llamar(handler, { accion: 'comunidad', name: yo });
  igual([r2.posts[1].reacciones.fuerza, r2.posts[1].mias], [1, ['fuerza']], 'la suya cuenta y se marca');
  await llamar(handler, { accion: 'reaccionar', name: yo, post_id: 'p1', tipo: 'fuerza', quitar: true });
  igual(sb.db.comunidad_reacciones.filter(x => x.cliente_id === 'c1').length, 0, 'y se quita');
  await llamar(handler, { accion: 'comunidad_visto', name: yo, ids: ['p1', 'p2', 'p9'] });
  await llamar(handler, { accion: 'comunidad_visto', name: yo, ids: ['p1'] });
  igual(sb.db.comunidad_vistas.map(v => v.post_id).sort(), ['p1', 'p2'], 'vistas: las suyas, una vez, nunca las de otro coach');
});

await caso('comunidad: comentarios de todos visibles, miembros con nombre corto, borrar solo lo suyo', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  sb.db.clientes.push({ id: 'c3', user_id: 'coach-1', nombre: 'laura méndez ruiz', estado: 'activo' },
    { id: 'c4', user_id: 'coach-1', nombre: 'Pedro Gil', estado: 'pausa' }, { id: 'c5', user_id: 'otro-coach', nombre: 'Ana Ajena', estado: 'activo' });
  sb.db.comunidad_posts = [
    { id: 'p1', user_id: 'coach-1', texto: 'Semana nueva', fijado: false, publicado_en: '2026-09-28T10:00:00Z', borrado_en: null },
    { id: 'p9', user_id: 'otro-coach', texto: 'De otro coach', fijado: false, publicado_en: '2026-09-29T10:00:00Z', borrado_en: null },
  ];
  sb.db.comunidad_reacciones = []; sb.db.comunidad_vistas = [];
  sb.db.comunidad_comentarios = [
    { id: 'k1', post_id: 'p1', cliente_id: 'c3', texto: '¡Vamos!', creado_en: '2026-09-28T11:00:00Z', borrado_en: null },
    { id: 'k2', post_id: 'p1', cliente_id: null, texto: 'Así es, Laura', creado_en: '2026-09-28T12:00:00Z', borrado_en: null },
    { id: 'k3', post_id: 'p1', cliente_id: 'c3', texto: 'borrado', creado_en: '2026-09-28T13:00:00Z', borrado_en: '2026-09-28T14:00:00Z' },
  ];
  const r = await llamar(handler, { accion: 'comunidad', name: yo });
  igual(r.miembros.map(m => [m.nombre, m.iniciales, m.tu]), [['Mauro M.', 'MM', true], ['Laura M.', 'LM', false]], 'miembros: activos de su coach, tú primero, sin apellido');
  igual(r.posts[0].comentarios.map(c => [c.autor, c.coach, c.mio, c.texto]), [['Laura M.', false, false, '¡Vamos!'], ['Mauro · coach', true, false, 'Así es, Laura']], 'comentarios sin borrados, con autor corto');
  igual(JSON.stringify(r).includes('Méndez'), false, 'nunca el apellido completo');
  igual((await llamar(handler, { accion: 'comentar', name: yo, post_id: 'p9', texto: 'hola' })).motivo, 'no_es_de_su_coach', 'no comenta en otro coach');
  igual((await llamar(handler, { accion: 'comentar', name: yo, post_id: 'p1', texto: '   ' })).motivo, 'vacio', 'vacío no');
  igual((await llamar(handler, { accion: 'comentar', name: yo, post_id: 'p1', texto: 'x'.repeat(601) })).motivo, 'largo', 'largo no');
  const c = await llamar(handler, { accion: 'comentar', name: yo, post_id: 'p1', texto: ' Listo el reto ' });
  igual([c.ok, c.comentario.autor, c.comentario.mio], [true, 'Mauro M.', true], 'comenta');
  const nuevo = sb.db.comunidad_comentarios.find(x => x.texto === 'Listo el reto');
  igual([nuevo.cliente_id, nuevo.post_id], ['c1', 'p1'], 'guardado a su nombre');
  igual((await llamar(handler, { accion: 'borrar_comentario', name: yo, id: 'k1' })).motivo, 'no_es_suyo', 'no borra el de otra persona');
  nuevo.id = 'k4';
  igual((await llamar(handler, { accion: 'borrar_comentario', name: yo, id: 'k4' })).ok, true, 'borra el suyo');
  igual(!!nuevo.borrado_en, true, 'queda marcado borrado');
  igual((await llamar(handler, { accion: 'comunidad', name: yo })).posts[0].comentarios.length, 2, 'y ya no sale');
});

await caso('comunidad: sin la tabla todavía, no se rompe', async () => {
  const sb = base(); globalThis.fetch = sb.fetch;
  const f0 = sb.fetch;
  globalThis.fetch = (u, o) => (String(u).includes('comunidad_posts') ? Promise.resolve({ ok: false, status: 404, text: async () => '' }) : f0(u, o));
  igual((await llamar(handler, { accion: 'comunidad', name: yo })).ok, false, 'ok:false, sin error');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
