// Lo que dice el coach en la cabecera de cada «Hoy», según el día.
//   node pruebas/voz-coach.mjs
import { vozEntreno, vozComida, vozAprende, vozDash, vozFinEntreno, etiquetaDia, delDia, semanaDelPlan } from '../src/vozCoach.js';

let fallos = 0;
const caso = (n, fn) => { try { fn(); console.log('  ok   ' + n); } catch (e) { fallos++; console.log('  MAL  ' + n + '\n         ' + e.message); } };
const igual = (a, b, q) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${q}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };
const cierto = (c, q) => { if (!c) throw new Error(q); };

// Semana del martes 2026-09-29 (lunes 28): Push lunes, Pierna martes, Pull jueves, Full sábado.
const LUN = '2026-09-28', MAR = '2026-09-29', MIE = '2026-09-30', JUE = '2026-10-01', SAB = '2026-10-03';
const fechas = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'];
function plan(hoy, cambios = {}) {
  const rut = { 0: 'Push', 1: 'Pierna', 3: 'Pull', 5: 'Full body' };
  return {
    ok: true, hoy,
    fase: { nombre: 'Fuerza', semanas: 8, semana_actual: 3 },
    dias: fechas.map((f, i) => ({
      dia: 'LMXJVSD'[i], fecha: f, es_hoy: f === hoy,
      descanso: !rut[i], rutina: rut[i] ? { id: i, nombre: rut[i] } : null,
      hecha: false, en_curso: false, saltada: false, ...(cambios[f] || {}),
    })),
  };
}

caso('la etiqueta: día en mayúsculas y la semana de la fase', () => {
  igual(vozEntreno({ plan: plan(MAR), hoy: MAR }).etiqueta, 'MARTES 29 · SEMANA 3 DE 8', 'etiqueta');
  igual(etiquetaDia('2026-10-02'), 'VIERNES 2', 'sin extra');
});

caso('le toca rutina: dice cuál', () => {
  const v = vozEntreno({ plan: plan(MAR, { [LUN]: { hecha: true } }), hoy: MAR });
  igual(v.a, 'Hoy toca Pierna.', 'a');
  cierto(v.b && v.b.endsWith('.'), 'b vacío');
});

caso('lunes con la semana en cero: arranque', () => {
  igual(vozEntreno({ plan: plan(LUN), hoy: LUN }).b, 'Empieza la semana con fuerza.', 'b');
});

caso('ayer quedó pendiente: lo dice sin regañar', () => {
  igual(vozEntreno({ plan: plan(MAR), hoy: MAR }).b, 'Lo de ayer puedes moverlo a otro día.', 'con rutina hoy');
  igual(vozEntreno({ plan: plan(MIE, { [LUN]: { hecha: true } }), hoy: MIE }).a, 'Hoy no te toca nada.', 'descanso tras pendiente');
});

caso('la última de la semana: «con este cierras»', () => {
  const p = plan(SAB, { [LUN]: { hecha: true }, [MAR]: { hecha: true }, [JUE]: { hecha: true } });
  igual(vozEntreno({ plan: p, hoy: SAB }).b, 'Con este cierras la semana.', 'b');
});

caso('ya entrenó hoy / semana completa', () => {
  igual(vozEntreno({ plan: plan(MAR, { [LUN]: { hecha: true }, [MAR]: { hecha: true } }), hoy: MAR }).a, 'Hecho por hoy.', 'hecho');
  const todo = plan(SAB, { [LUN]: { hecha: true }, [MAR]: { hecha: true }, [JUE]: { hecha: true }, [SAB]: { hecha: true } });
  igual(vozEntreno({ plan: todo, hoy: SAB }).a, 'Semana completa.', 'completa');
  igual(semanaDelPlan(todo), { planeados: 4, hechos: 4 }, 'conteo');
});

caso('entreno a medias', () => {
  igual(vozEntreno({ plan: plan(MAR, { [MAR]: { en_curso: true } }), hoy: MAR }).a, 'Tienes un entreno a medias.', 'a');
});

caso('descanso normal y sin plan', () => {
  igual(vozEntreno({ plan: plan(MIE, { [LUN]: { hecha: true }, [MAR]: { hecha: true } }), hoy: MIE }).a, 'Día de descanso.', 'descanso');
  igual(vozEntreno({ plan: { ok: true, fase: null, dias: [] }, hoy: MIE }).a, 'Tu plan viene en camino.', 'sin plan');
  igual(vozEntreno({ plan: null, hoy: MIE }).a, 'Tu plan viene en camino.', 'sin datos');
});

caso('nombre largo: la frase no lo nombra', () => {
  const p = plan(MAR, { [MAR]: { rutina: { id: 9, nombre: 'Tren inferior con énfasis en glúteo' } } });
  igual(vozEntreno({ plan: p, hoy: MAR }).a, 'Hoy toca entrenar.', 'a');
});

caso('comida: según lo registrado y la hora', () => {
  igual(vozComida({ hoy: MAR, hora: 8, kcal: 0, meta: 2000, comidas: 0 }).b, 'Empieza registrando tu desayuno.', 'mañana sin nada');
  igual(vozComida({ hoy: MAR, hora: 21, kcal: 0, meta: 2000, comidas: 0 }).a, 'Hoy va sin registro.', 'noche sin nada');
  igual(vozComida({ hoy: MAR, hora: 13, kcal: 1400, meta: 2000, comidas: 2 }).a, 'Te quedan 600 kcal.', 'quedan');
  igual(vozComida({ hoy: MAR, hora: 19, kcal: 1400, meta: 2000, comidas: 2 }).b, 'Úsalas en una cena con proteína.', 'noche');
  igual(vozComida({ hoy: MAR, hora: 20, kcal: 1950, meta: 2000, comidas: 4 }).a, 'Día en tu meta.', 'en meta');
  igual(vozComida({ hoy: MAR, hora: 20, kcal: 2400, meta: 2000, comidas: 4 }).a, 'Hoy te pasaste un poco.', 'pasado');
  igual(vozComida({ hoy: MAR, hora: 9, meta: 0 }).a, 'Así va tu día.', 'sin meta');
  igual(vozComida({ hoy: '2026-10-02', hora: 9, kcal: 0, meta: 2000, racha: 5 }).etiqueta, 'VIERNES 2 · 5 DÍAS REGISTRANDO', 'racha en la etiqueta');
  igual(vozComida({ hoy: MAR, hora: 13, kcal: 12345.6, meta: 20000, comidas: 2 }).a, 'Te quedan 7.654 kcal.', 'miles con punto');
});

caso('aprendizaje', () => {
  igual(vozAprende({ hoy: MAR, avance: { pct: 0, vistas: 0, total: 40 } }).a, 'Empieza por lo básico.', 'nada visto');
  igual(vozAprende({ hoy: MAR, avance: { pct: 35, vistas: 14, total: 40 } }).a, 'Llevas el 35 %.', 'a medias');
  igual(vozAprende({ hoy: MAR, avance: { pct: 100, vistas: 40, total: 40 } }).a, 'Ya viste todo.', 'todo');
  igual(vozAprende({ hoy: MAR, avance: undefined }).a, 'Tu aprendizaje.', 'cargando');
});

caso('rota por día y no cambia dentro del mismo día', () => {
  const l = ['a', 'b', 'c'];
  igual([delDia(l, LUN), delDia(l, LUN)], [delDia(l, LUN), delDia(l, LUN)], 'estable');
  cierto(new Set(fechas.map(f => delDia(l, f))).size === 3, 'no rota');
  cierto(vozDash({ hoy: MAR }).length > 10, 'dash');
  cierto(vozDash({ hoy: MAR, racha: 9 }).includes('9 días'), 'dash con racha');
});

caso('al terminar el entreno', () => {
  igual(vozFinEntreno({ hoy: MAR, records: 1 }), 'Récord nuevo. Así se progresa.', 'récord');
  cierto(vozFinEntreno({ hoy: MAR, hechos: 6, total: 6 }).length > 5, 'completo');
  igual(vozFinEntreno({ hoy: MAR, hechos: 3, total: 6 }), 'Hecho lo que se pudo. Eso también cuenta.', 'parcial');
});

caso('sin género: ninguna frase dice «tranquilo/a» ni «listo/a»', () => {
  const todas = [];
  for (const f of fechas) {
    for (const c of [{}, { [LUN]: { hecha: true } }, { [MAR]: { hecha: true } }]) todas.push(Object.values(vozEntreno({ plan: plan(f, c), hoy: f })).join(' '));
    for (const h of [8, 13, 20]) for (const k of [0, 900, 1950, 2600]) todas.push(Object.values(vozComida({ hoy: f, hora: h, kcal: k, meta: 2000, comidas: k ? 2 : 0, racha: 4 })).join(' '));
    todas.push(vozDash({ hoy: f }), vozDash({ hoy: f, racha: 4 }));
  }
  const mal = todas.filter(t => /\b(tranquil[oa]|list[oa]|cansad[oa])\b/i.test(t));
  igual(mal, [], 'frases con género');
});

console.log(fallos ? `\n${fallos} MAL` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
