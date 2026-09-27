// El Dash del entrenamiento (accion 'dash' de api/training.js):
//   · 12 semanas, con lo planeado de la fase que cubría cada una;
//   · el volumen y la fuerza (1RM estimado) salen de TODAS las series, aunque
//     pasen de las 1.000 que devuelve Supabase por consulta;
//   · las libras se pasan a kg y las series de más de 15 reps no estiman 1RM.
//
//   node pruebas/entreno-dash.mjs

import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const { default: handler, e1rm, armarDash } = await import('../api/training.js');
const { hoyBogota, lunesDe, sumarDiasISO } = await import('../api/_entreno.js');

const hoy = hoyBogota();
const lunes = lunesDe(hoy);
const hace = (sem, dia = 0) => sumarDiasISO(lunes, -7 * sem + dia);

let fallos = 0, casos = 0;
async function caso(nombre, fn) {
  casos++;
  try { await fn(); console.log('  ok   ' + nombre); }
  catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); }
}
const igual = (a, b, qué) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${qué}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

console.log(`dash · hoy ${hoy}`);

await caso('1RM estimado: Epley, y nada con más de 15 reps o sin peso', async () => {
  igual(e1rm(100, 1), 103.3, '100 × 1');
  igual(e1rm(60, 10), 80, '60 × 10');
  igual(e1rm(40, 16), null, '16 reps');
  igual(e1rm(0, 8), null, 'sin peso');
});

await caso('semanas: lo planeado sale de la fase que las cubría', async () => {
  const d = armarDash({
    hoy,
    fases: [
      { fecha_inicio: hace(11), semanas: 4, dias_semana: ['L', 'X', 'V'] },
      { fecha_inicio: hace(3), semanas: 8, dias_semana: ['L', 'M', 'J', 'V'] },
    ],
  });
  igual(d.semanas.length, 12, 'doce semanas');
  igual(d.semanas[11].desde, lunes, 'la última es la de hoy');
  igual(d.semanas.map(w => w.planeados), [3, 3, 3, 3, 0, 0, 0, 0, 4, 4, 4, 4], 'planeados');
});

// Una base con más de mil series para obligar a paginar.
function base() {
  const sesiones = [], series_log = [];
  let n = 0;
  for (let sem = 7; sem >= 0; sem--) {
    for (const dia of [0, 2]) {
      const fecha = hace(sem, dia);
      if (fecha > hoy) continue;
      const id = `s${sem}-${dia}`;
      sesiones.push({ id, cliente_id: 'c1', fecha, estado: 'completada' });
      // 70 series por sesión de un ejercicio de relleno (para pasar de 1.000)
      for (let k = 0; k < 70; k++) series_log.push({ id: `r${n++}`, sesion_id: id, ejercicio_id: 'relleno', reps: 20, peso: 5, unidad: 'kg', completada: true });
      // Sentadilla: sube 2,5 kg por semana, en kg
      series_log.push({ id: `r${n++}`, sesion_id: id, ejercicio_id: 'sent', reps: 5, peso: 80 + (7 - sem) * 2.5, unidad: 'kg', completada: true });
      // Press en libras
      series_log.push({ id: `r${n++}`, sesion_id: id, ejercicio_id: 'press', reps: 8, peso: 100, unidad: 'lb', completada: true });
      // Una serie sin marcar no cuenta
      series_log.push({ id: `r${n++}`, sesion_id: id, ejercicio_id: 'sent', reps: 5, peso: 500, unidad: 'kg', completada: false });
    }
  }
  sesiones.push({ id: 'saltada', cliente_id: 'c1', fecha: hace(1, 1), estado: 'saltada' });
  sesiones.push({ id: 'ajena', cliente_id: 'c2', fecha: hace(1, 1), estado: 'completada' });
  series_log.push({ id: 'ajena-1', sesion_id: 'ajena', ejercicio_id: 'sent', reps: 1, peso: 300, unidad: 'kg', completada: true });
  return crearSupabaseFalso({
    tablas: {
      clientes: [{ id: 'c1', user_id: 'u', nombre: 'Mauro Morón' }, { id: 'c2', user_id: 'u', nombre: 'Otra' }],
      fases: [{ id: 'f1', cliente_id: 'c1', estado: 'activa', visible_cliente: true, orden: 1, fecha_inicio: hace(7), semanas: 10, dias_semana: ['L', 'X'] }],
      sesiones, series_log,
      ejercicios: [{ id: 'sent', nombre: 'Sentadilla' }, { id: 'press', nombre: 'Press banca' }, { id: 'relleno', nombre: 'Relleno' }],
      actividades: [{ id: 'a1', cliente_id: 'c1', fecha: hace(0, 0) > hoy ? hace(1) : hace(0, 0), duracion_min: 30 }],
      mediciones_corporales: [
        { id: 'm2', cliente_id: 'c1', fecha: hace(0), peso: 81.2, grasa_pct: 17.5 },
        { id: 'm1', cliente_id: 'c1', fecha: hace(6), peso: 83, grasa_pct: 19 },
      ],
    },
  });
}

await caso('la API junta todo: series de más de 1.000, libras, solo lo suyo', async () => {
  const db = base();
  globalThis.fetch = db.fetch;
  const total = db.db.series_log.length;
  if (total <= 1000) throw new Error('la base de prueba debería pasar de 1.000 series: ' + total);
  const r = await llamar(handler, { accion: 'dash', name: 'mauro moron' });
  if (!r.ok) throw new Error('respuesta: ' + JSON.stringify(r));

  const ult = r.semanas.slice(-8);
  const hechas = db.db.sesiones.filter(x => x.cliente_id === 'c1' && x.estado === 'completada');
  igual(ult.reduce((a, w) => a + w.hechos, 0), hechas.length, 'sesiones hechas (sin la saltada ni la ajena)');
  igual(r.semanas.slice(-8).every(w => w.planeados === 2), true, 'planeados de la fase activa');

  const sent = r.ejercicios.find(e => e.nombre === 'Sentadilla');
  if (!sent) throw new Error('falta la sentadilla: ' + JSON.stringify(r.ejercicios.map(e => e.nombre)));
  igual(sent.inicio, e1rm(80, 5), 'primer 1RM de la sentadilla');
  igual(sent.actual, e1rm(97.5, 5), 'último 1RM (la serie sin marcar de 500 kg y la ajena no cuentan)');

  const press = r.ejercicios.find(e => e.nombre === 'Press banca');
  igual(press.actual, e1rm(45.359, 8), 'press de 100 lb pasado a kg');
  igual(r.ejercicios.some(e => e.nombre === 'Relleno'), false, 'el de 20 reps no estima 1RM');

  // Volumen de la última semana completa: incluye el relleno (70 × 20 × 5)
  const w = r.semanas[10];
  const esperado = Math.round(2 * (70 * 20 * 5 + 5 * (80 + 6 * 2.5) + 8 * 45.359237 * 1));
  igual(w.volumen_kg, esperado, 'volumen de la semana pasada');

  igual(r.medidas.map(m => m.peso), [83, 81.2], 'medidas de la más vieja a la más nueva');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
