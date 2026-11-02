// Lo que abre cada cliente en su app (api/_uso.js): una fila por día, las
// secciones que abrió (solo las conocidas) y las recetas, sin repetir.
//   node pruebas/uso-app.mjs
import { fusionarUso } from '../api/_uso.js';
import { recetasDe } from '../api/coach-data.js';

let fallos = 0, casos = 0;
const caso = (n, fn) => { casos++; try { fn(); console.log('  ok   ' + n); } catch (e) { fallos++; console.log('  MAL  ' + n + '\n         ' + e.message); } };
const igual = (a, b, q) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${q}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

caso('el primer reporte del día crea la fila', () => {
  igual(fusionarUso(null, { secciones: ['dash', 'recetas'], recetas: ['Bowl burrito de pollo'] }), { secciones: { dash: 1, recetas: 1 }, recetas: ['Bowl burrito de pollo'] }, 'fila');
});
caso('los siguientes suman sin repetir y sin secciones inventadas', () => {
  const ex = { secciones: { dash: 1 }, recetas: ['Bowl burrito de pollo'] };
  igual(fusionarUso(ex, { secciones: ['dash', 'chat', 'hackeo'], recetas: ['Bowl burrito de pollo', 'Wrap de carne'] }), { secciones: { dash: 1, chat: 1 }, recetas: ['Bowl burrito de pollo', 'Wrap de carne'] }, 'fila');
});
caso('las recetas que cocinó salen de lo que registró desde una receta (28 días)', () => {
  const r = recetasDe({ recetario_menus: [1, 2], favorites: [1], historyDetail: { '2026-10-30': [{ rawInput: 'receta: Bowl burrito de pollo' }, { rawInput: 'huevos' }], '2026-09-01': [{ rawInput: 'receta: Vieja' }] }, today: '2026-11-01', today_entries: [{ rawInput: 'receta: Huevos con atún' }] }, '2026-11-01');
  igual(r, { menus_creados: 2, favoritos: 1, recetas_registradas: [{ fecha: '2026-10-30', nombre: 'Bowl burrito de pollo' }, { fecha: '2026-11-01', nombre: 'Huevos con atún' }] }, 'recetas');
});
caso('Respira: cada vez que la termina suma una entrada (hora, segundos, minutos y desde dónde)', () => {
  let f = fusionarUso({ secciones: { dash: 1 }, recetas: [] }, { respira: [{ h: '07:10', s: 180, m: 3, o: 'fin-entreno' }] });
  f = fusionarUso(f, { respira: [{ h: '21:05', s: 61.4, m: 1, o: 'dash' }, { h: 'mal', s: 20 }, { h: '22:00', s: 99999 }] });
  igual(f.secciones, { dash: 1, respira: [{ h: '07:10', s: 180, m: 3, o: 'fin-entreno' }, { h: '21:05', s: 61, m: 1, o: 'dash' }] }, 'respira');
});
caso('Respira: como mucho 20 por día', () => {
  let f = null;
  for (let i = 0; i < 25; i++) f = fusionarUso(f, { respira: [{ h: '10:00', s: 60, m: 1 }] });
  igual(f.secciones.respira.length, 20, 'tope');
});
console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
