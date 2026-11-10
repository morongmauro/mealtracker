// «Cambió tu rutina»: qué le dice la campanita al cliente cuando el coach
// edita el plan. Compara la huella guardada con la nueva (src/cambiosRutina.js).
import { compararHuellas } from '../src/cambiosRutina.js';

let mal = 0;
const ok = (n, c, extra = '') => { if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + extra}`); };
const ej = (n, p) => ({ n, p });
const base = { fase: 'f1', faseNombre: 'Ciclo 6', rutinas: {
  r1: { nombre: 'Push', ejs: { e1: ej('Bench Press', '3x8'), e2: ej('Fly', '3x12'), e3: ej('Dips', '3x10') } },
  r2: { nombre: 'Pull', ejs: { e4: ej('Row', '3x10') } },
} };
const copia = () => JSON.parse(JSON.stringify(base));

ok('sin nada guardado no avisa (la primera vez solo guarda)', compararHuellas(null, base).length === 0);
ok('sin cambios no avisa', compararHuellas(base, copia()).length === 0);

let n = copia(); n.rutinas.r1.ejs.e9 = ej('Hip Thrust', '3x12'); delete n.rutinas.r1.ejs.e2; n.rutinas.r1.ejs.e3.p = '4x10';
let a = compararHuellas(base, n);
ok('ejercicio nuevo, uno quitado y uno con otras series: un solo aviso de esa rutina, con el detalle',
  a.length === 1 && a[0].texto === 'Cambió tu rutina Push' && a[0].sub === 'Nuevo: Hip Thrust · 1 quitado · 1 con series o repeticiones distintas', JSON.stringify(a));
const clave1 = a[0].clave;
n.rutinas.r1.ejs.e10 = ej('Push Up', '3x15');
ok('otra edición después es otro aviso (clave distinta)', compararHuellas(base, n)[0].clave !== clave1);

n = copia(); ['a', 'b', 'c', 'd'].forEach((k, i) => { n.rutinas.r2.ejs[`x${k}`] = ej(`Nuevo ${i + 1}`, '3x10'); });
a = compararHuellas(base, n);
ok('muchos nuevos: nombra dos y cuenta el resto', a[0].sub === 'Nuevo: Nuevo 1, Nuevo 2 y 2 más', JSON.stringify(a));

n = copia(); n.rutinas.r3 = { nombre: 'Legs', ejs: { e7: ej('Squat', '3x6'), e8: ej('RDL', '3x8') } }; delete n.rutinas.r2;
a = compararHuellas(base, n);
ok('rutina nueva y rutina quitada', a.some(x => x.texto === 'Rutina nueva: Legs' && x.sub === '2 ejercicios') && a.some(x => x.texto === 'Quitó la rutina Pull'), JSON.stringify(a));

n = copia(); n.fase = 'f2'; n.faseNombre = 'Ciclo 7'; n.rutinas.r1.ejs.e9 = ej('Hip Thrust', '3x12');
a = compararHuellas(base, n);
ok('ciclo nuevo: un solo aviso (no uno por rutina)', a.length === 1 && a[0].texto === 'Te envió un ciclo nuevo: Ciclo 7', JSON.stringify(a));

console.log(mal ? `\n${mal} MAL` : '\ntodo bien');
process.exit(mal ? 1 : 0);
