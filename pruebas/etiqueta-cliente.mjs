// Lo que el cliente dicta de SU etiqueta manda: la tabla de alimentos solo
// completa lo que él no dijo. Caso real: «380 g de yogur griego que aportan
// 24 g de proteína» quedaba en 38 g (la tabla, 10 g por 100 g).
//
//   node pruebas/etiqueta-cliente.mjs
import { canonicalizeItem, macrosDeclarados } from '../src/foods.js';
let mal = 0;
const ok = (t, c, extra = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${t}${c ? '' : '  ' + extra}`); if (!c) mal++; };
const ig = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

ok('dictado por voz: «veinticuatro gramos de proteína» → proteína', ig(macrosDeclarados('trescientos ochenta gramos de yogur griego yogurísimo que aportan veinticuatro gramos de proteína.'), ['p']));
ok('«24g de proteina por yogurt griego» → proteína', ig(macrosDeclarados('24g de proteina por yogurt griego'), ['p']));
ok('«una barra de 210 kcal» → calorías', ig(macrosDeclarados('una barra de 210 kcal'), ['kcal']));
ok('«proteína: 30g, carbos 12 g, grasa 5g, 220 calorías» → los cuatro', ig(macrosDeclarados('proteína: 30g, carbos 12 g, grasa 5g, 220 calorías'), ['p', 'c', 'g', 'kcal']));
ok('sin números de macros → nada («200g de pollo y 2 huevos»)', macrosDeclarados('me comí 200g de pollo y 2 huevos').length === 0);

const y = canonicalizeItem({ name: 'yogur griego', amount: '380g', kcal: 150, p: 24, c: 13.7, g: 1.5, declarado: ['p'] });
ok('yogur con proteína de su etiqueta: queda en 24 g (no 38)', y.p === 24, JSON.stringify(y));
ok('…carbos y grasa los completa la tabla y las kcal salen de los macros', y.c === 13.7 && y.g === 1.5 && y.kcal === Math.round(24 * 4 + 13.7 * 4 + 1.5 * 9), JSON.stringify(y));
const b = canonicalizeItem({ name: 'yogur griego', amount: '200g', kcal: 130, p: 20, c: 8, g: 2, declarado: ['kcal', 'p', 'c', 'g'] });
ok('si dio todo, queda todo como lo dijo', b.kcal === 130 && b.p === 20 && b.c === 8 && b.g === 2, JSON.stringify(b));
const k = canonicalizeItem({ name: 'yogur griego', amount: '200g', kcal: 140, p: 20, c: 7.2, g: 0.8, declarado: ['kcal'] });
ok('si solo dio las kcal, las kcal quedan y los macros salen de la tabla', k.kcal === 140 && k.p === 20, JSON.stringify(k));
const n = canonicalizeItem({ name: 'yogur griego', amount: '380g', kcal: 150, p: 24, c: 13.7, g: 1.5 });
ok('sin datos suyos, la tabla sigue mandando (38 g)', n.p === 38 && n.canon === true, JSON.stringify(n));
console.log(mal ? `\n${mal} MAL` : '\ntodo bien');
process.exit(mal ? 1 : 0);
