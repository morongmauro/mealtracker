// El resumen del mes pasado (src/resumenMes.js):
//   · peso y grasa: el último registro del mes contra el último de antes,
//     con sus fechas; sin registro en el mes, el último dato en gris;
//   · días en meta de comida contra la meta que regía cada día;
//   · solo sale lo que hay: sin datos, sin fila.
//
//   node pruebas/resumen-mes.mjs

import { mesPasado, medidaDelMes, resumenDelMes, textoParaCoach } from '../src/resumenMes.js';

let fallos = 0, casos = 0;
function caso(nombre, fn) {
  casos++;
  try { fn(); console.log('  ok   ' + nombre); }
  catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); }
}
const igual = (a, b, qué) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${qué}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

caso('el mes pasado, también al cruzar de año', () => {
  igual(mesPasado('2026-11-01'), { clave: '2026-10', desde: '2026-10-01', hasta: '2026-10-31', dias: 31, nombre: 'octubre' }, 'noviembre');
  igual(mesPasado('2027-01-15').clave, '2026-12', 'enero');
  igual(mesPasado('2028-03-02').dias, 29, 'febrero bisiesto');
});

const medidas = [
  { fecha: '2026-07-27', peso: 84.6, grasa_pct: 21.4 },
  { fecha: '2026-08-17', peso: 84.1, grasa_pct: 20.6 },
  { fecha: '2026-08-24', peso: 83.9, grasa_pct: null },
];

caso('peso y grasa: contra el último de antes del mes, con fechas', () => {
  igual(medidaDelMes(medidas, 'peso', '2026-08-01', '2026-08-31'), { valor: 83.9, cambio: -0.7, desde: '2026-07-27', hasta: '2026-08-24' }, 'peso');
  igual(medidaDelMes(medidas, 'grasa_pct', '2026-08-01', '2026-08-31'), { valor: 20.6, cambio: -0.8, desde: '2026-07-27', hasta: '2026-08-17' }, 'grasa');
});

caso('sin registro en el mes: su último dato; nunca medido: nada', () => {
  igual(medidaDelMes(medidas, 'peso', '2026-09-01', '2026-09-30'), { valor: 83.9, ultimo: '2026-08-24' }, 'septiembre');
  igual(medidaDelMes([], 'peso', '2026-09-01', '2026-09-30'), null, 'sin medidas');
  igual(medidaDelMes([{ fecha: '2026-09-10', peso: 70 }], 'peso', '2026-09-01', '2026-09-30'), { valor: 70, primero: '2026-09-10' }, 'primer registro');
});

caso('el resumen: filas en orden y solo con datos', () => {
  const history = { '2026-08-01': { kcal: 2000 }, '2026-08-02': { kcal: 2600 }, '2026-08-20': { kcal: 1900 }, '2026-09-01': { kcal: 2000 } };
  const goalsHistory = [{ since: '2026-01-01', kcal: 2000 }, { since: '2026-08-15', kcal: 2500 }];
  const r = resumenDelMes({ hoy: '2026-09-03', mes: { desde: '2026-08-01', rutinas: { hechos: 12, planeados: 13 }, fuerza: { nombre: 'Press banca', sube: 2.5 } },
    medidas, history, goals: { kcal: 2500 }, goalsHistory });
  igual(r.nombre, 'agosto', 'mes');
  igual(r.filas.map(f => [f.clave, f.valor]), [['rutinas', '12 de 13'], ['peso', '−0,7 kg'], ['grasa_pct', '−0,8 pts'], ['fuerza', '+2,5 kg'], ['comida', '1 de 31']], 'filas');
  igual(r.filas[1].sub, 'del 27 jul al 24 ago', 'fechas del peso');
  const vacio = resumenDelMes({ hoy: '2026-09-03', mes: { desde: '2026-08-01', rutinas: { hechos: 0, planeados: 0 }, fuerza: null } });
  igual(vacio.filas, [], 'nada que contar');
  const viejo = resumenDelMes({ hoy: '2026-10-03', mes: { desde: '2026-08-01', rutinas: { hechos: 5, planeados: 5 } } });
  igual(viejo.filas, [], 'datos de otro mes no cuentan');
});

caso('sin registro en el mes: en gris y sin cambio', () => {
  const r = resumenDelMes({ hoy: '2026-10-02', mes: { desde: '2026-09-01', rutinas: { hechos: 3, planeados: 12 } }, medidas });
  const p = r.filas.find(f => f.clave === 'peso');
  igual([p.valor, p.sub, p.gris], ['83,9 kg', 'Último registro · 24 ago', true], 'peso en gris');
  igual(r.filas.find(f => f.clave === 'grasa_pct').valor, '20,6 %', 'grasa en gris');
});

caso('el texto para el coach', () => {
  const r = resumenDelMes({ hoy: '2026-09-03', mes: { desde: '2026-08-01', rutinas: { hechos: 12, planeados: 13 } }, medidas });
  igual(textoParaCoach(r), 'Hola Mau! Mi resumen de agosto:\n• Rutinas hechas: 12 de 13\n• Peso: −0,7 kg (del 27 jul al 24 ago)\n• % de grasa: −0,8 pts (del 27 jul al 17 ago)', 'texto');
});

console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
