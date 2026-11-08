// Dash → tarjeta «Tu semana» (src/semanaResumen.js): lunes completa, de
// martes a sábado corta, el domingo esta semana contra la pasada.
//
//   node pruebas/semana-dash.mjs
import { armarSemana } from '../src/semanaResumen.js';

let mal = 0;
const ok = (n, c, x = '') => { if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); };
// Semana pasada: 2 al 8 nov 2026 (lunes a domingo). Esta: 9 al 15 nov.
const semanas = [
  { desde: '2026-11-02', hechos: 3, planeados: 3, cardio_dias: 2, rpe_prom: 7.5 },
  { desde: '2026-11-09', hechos: 2, planeados: 3, cardio_dias: 3, rpe_prom: 7.8 },
];
const history = {};
['02', '03', '04', '05', '06', '07'].forEach(d => { history[`2026-11-${d}`] = { kcal: 2000, p: 112 }; });
['09', '10', '11', '12', '13', '14'].forEach(d => { history[`2026-11-${d}`] = { kcal: 2100, p: 128 }; });
const goals = { kcal: 2100, p: 140 };

console.log('\nlunes');
let S = armarSemana({ semanas, history, goals, hoy: '2026-11-09' });
ok('el lunes sale completa', S.modo === 'completa', S.modo);
ok('titular: «Cumpliste tus 3 rutinas. La proteína quedó corta.»', S.titular === 'Cumpliste tus 3 rutinas. La proteína quedó corta.', S.titular);
ok('la semana pasada: 3/3, 6 días, 112 g, 2 de cardio, 7,5', S.pasada.hechos === 3 && S.pasada.comida === 6 && S.pasada.proteina === 112 && S.pasada.cardio === 2 && S.pasada.rpe === 7.5, JSON.stringify(S.pasada));
ok('foco: proteína (112 de 140)', S.foco.que === 'proteina' && S.foco.meta === 140, JSON.stringify(S.foco));

console.log('\nmiércoles');
S = armarSemana({ semanas, history, goals, hoy: '2026-11-11' });
ok('de martes a sábado sale corta', S.modo === 'corta', S.modo);
ok('el foco avanza con esta semana: 128 / 140 g (91 %)', S.foco.texto === '128 / 140 g' && S.foco.pct === 91, JSON.stringify(S.foco));

console.log('\ndomingo');
S = armarSemana({ semanas, history, goals, hoy: '2026-11-15' });
ok('el domingo sale el comparativo', S.modo === 'comparativo', S.modo);
ok('esta semana: 2/3, 6 días, 128 g, 3 de cardio, 7,8', S.actual.hechos === 2 && S.actual.comida === 6 && S.actual.proteina === 128 && S.actual.cardio === 3 && S.actual.rpe === 7.8, JSON.stringify(S.actual));
ok('le dice lo que aún puede sumar: 1 rutina para igualar las 3', S.sumar && /1 rutina para igualar las 3/.test(S.sumar.texto) && S.sumar.ir === 'entreno', JSON.stringify(S.sumar));
const todo = armarSemana({ semanas: [semanas[0], { ...semanas[1], hechos: 3 }], history: { ...history, '2026-11-15': { kcal: 1800, p: 120 } }, goals, hoy: '2026-11-15' });
ok('con todo hecho, no le pide nada', todo.sumar === null, JSON.stringify(todo.sumar));
const sinComerHoy = armarSemana({ semanas: [semanas[0], { ...semanas[1], hechos: 3 }], history, goals, hoy: '2026-11-15' });
ok('rutinas completas pero sin comida hoy → «registra lo que comas hoy»', sinComerHoy.sumar && sinComerHoy.sumar.ir === 'comida', JSON.stringify(sinComerHoy.sumar));

console.log('\notros casos');
ok('cliente nuevo (nada la semana pasada) → no sale', armarSemana({ semanas: [{ desde: '2026-11-09', hechos: 1, planeados: 3 }], history: {}, goals, hoy: '2026-11-11' }) === null);
const poca = armarSemana({ semanas: [{ ...semanas[0], hechos: 1 }], history: { '2026-11-03': { kcal: 1500, p: 90 } }, goals, hoy: '2026-11-11' });
ok('pocos días de comida → titular y foco de registro', /Hiciste 1 de 3 rutinas\. Registraste comida 1 de 7 días\./.test(poca.titular) && poca.foco.que === 'registro', poca.titular + ' / ' + poca.foco.que);
const sinEntreno = armarSemana({ semanas: [], history, goals: { kcal: 2100, p: 100 }, hoy: '2026-11-11' });
ok('sin entrenamiento (solo comida) también sale, sin la fila de rutinas', sinEntreno && sinEntreno.pasada.planeados === 0 && /Buena semana de comida/.test(sinEntreno.titular), JSON.stringify(sinEntreno && sinEntreno.titular));

console.log(mal ? `\n${mal} MAL` : '\ntodo bien');
process.exit(mal ? 1 : 0);
