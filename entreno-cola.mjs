// Prueba la cola de series sin señal (src/entrenoCola.js) y los cálculos
// puros de marcar una serie (src/entrenoDatos.js). Sin red ni navegador.
//
//   node pruebas/entreno-cola.mjs

import { crearCola } from '../src/entrenoCola.js';
import { numero, descansoEnCircuito } from '../src/entrenoDatos.js';

let fallos = 0, casos = 0;
async function caso(nombre, fn) {
  casos++;
  try { await fn(); console.log('  ok   ' + nombre); }
  catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); }
}
const igual = (a, b, qué) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${qué}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

const memoria = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) }; };

// Un servidor de mentira: `red` decide si hay señal.
function servidor() {
  const s = { red: true, abiertas: [], series: [], llamadas: 0 };
  s.api = {
    abrir: async (name, rutina_id, { crear, fecha }) => {
      s.llamadas++;
      if (!s.red) return { ok: false, motivo: 'sin_red' };
      let x = s.abiertas.find(a => a.rutina_id === rutina_id && a.fecha === fecha);
      if (!x && crear) { x = { id: 'ses-' + (s.abiertas.length + 1), rutina_id, fecha }; s.abiertas.push(x); }
      return { ok: true, sesion: x || null };
    },
    serie: async (name, d) => {
      s.llamadas++;
      if (!s.red) return { ok: false, motivo: 'sin_red' };
      const i = s.series.findIndex(y => y.sesion_id === d.sesion_id && y.rutina_ejercicio_id === d.rutina_ejercicio_id && y.serie_num === d.serie_num);
      if (i >= 0) s.series[i] = d; else s.series.push(d);
      return { ok: true };
    },
  };
  return s;
}
const serie = (re, n, peso, completada = true) => ({ rutina_ejercicio_id: re, ejercicio_id: 'e', serie_num: n, reps: 8, peso, completada });

console.log('cola de series sin señal');

await caso('sin señal no se pierde nada, y al volver sube todo con UNA sola sesión', async () => {
  const sv = servidor(); sv.red = false;
  const cola = crearCola({ almacen: memoria(), api: sv.api, hoy: () => '2026-09-26' });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 1, 60) });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 2, 60) });
  igual(await cola.vaciar(), 2, 'pendientes sin red');
  sv.red = true;
  igual(await cola.vaciar(), 0, 'pendientes con red');
  igual(sv.abiertas.length, 1, 'sesiones creadas');
  igual(sv.series.length, 2, 'series en el servidor');
});

await caso('la cola sobrevive a cerrar la app (otro objeto, mismo almacén)', async () => {
  const sv = servidor(); sv.red = false;
  const alm = memoria();
  crearCola({ almacen: alm, api: sv.api, hoy: () => '2026-09-26' }).encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 1, 60) });
  sv.red = true;
  const otra = crearCola({ almacen: alm, api: sv.api, hoy: () => '2026-09-26' });
  igual(await otra.vaciar(), 0, 'pendientes');
  igual(sv.series.length, 1, 'series');
});

await caso('marcar, corregir y desmarcar sin señal deja solo lo último', async () => {
  const sv = servidor(); sv.red = false;
  const cola = crearCola({ almacen: memoria(), api: sv.api, hoy: () => '2026-09-26' });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 1, 60) });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 1, 62.5) });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 1, null, false) });
  igual(cola.pendientes().length, 1, 'entradas');
  sv.red = true; await cola.vaciar();
  igual(sv.series.map(x => x.completada), [false], 'lo que quedó');
});

await caso('la sesión se abre con la fecha en que se marcó, no la de cuando volvió la señal', async () => {
  const sv = servidor(); sv.red = false;
  let dia = '2026-09-26';
  const cola = crearCola({ almacen: memoria(), api: sv.api, hoy: () => dia });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 1, 60) });
  dia = '2026-09-27'; sv.red = true;
  await cola.vaciar();
  igual(sv.abiertas[0].fecha, '2026-09-26', 'fecha de la sesión');
});

await caso('dos vaciados a la vez no suben dos veces', async () => {
  const sv = servidor();
  const cola = crearCola({ almacen: memoria(), api: sv.api, hoy: () => '2026-09-26' });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re1', 1, 60) });
  await Promise.all([cola.vaciar(), cola.vaciar(), cola.vaciar()]);
  igual([sv.abiertas.length, sv.series.length], [1, 1], 'sesiones y series');
});

await caso('una rutina que el coach retiró no bloquea la cola para siempre', async () => {
  const sv = servidor();
  sv.api.abrir = async (n, rid) => (rid === 'vieja' ? { ok: false, motivo: 'no_enviada' } : { ok: true, sesion: { id: 'ses-x' } });
  const cola = crearCola({ almacen: memoria(), api: sv.api, hoy: () => '2026-09-26' });
  cola.encolar({ name: 'M', rutina_id: 'vieja', datos: serie('re1', 1, 60) });
  cola.encolar({ name: 'M', rutina_id: 'r1', datos: serie('re2', 1, 40) });
  igual(await cola.vaciar(), 0, 'pendientes');
  igual(sv.series.length, 1, 'la buena subió');
});

console.log('\nal marcar una serie');

await caso('el peso con coma se entiende', async () => {
  igual([numero('22,5'), numero('22.5'), numero(' 60 '), numero(''), numero('abc')], [22.5, 22.5, 60, null, null], 'números');
});

await caso('descansos de un circuito de 3 estaciones × 3 vueltas', async () => {
  const b = { descanso_entre_seg: 20, descanso_seg: 90 };
  const tabla = [0, 1, 2].map(v => [0, 1, 2].map(e => descansoEnCircuito(b, e, 3, v, 3)));
  igual(tabla, [[20, 20, 90], [20, 20, 90], [20, 20, null]], 'descansos');
  igual(descansoEnCircuito({ descanso_seg: 60 }, 0, 2, 0, 2), null, 'sin descanso entre estaciones');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
