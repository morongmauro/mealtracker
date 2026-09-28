// ¿Qué ejercicios piden solo reps (peso corporal) y cuáles piden peso?
//   node pruebas/peso-corporal.mjs
import { sinPeso } from '../src/entrenoDatos.js';

const casos = [
  // [ejercicio, ¿solo reps?]
  [{ alias: 'Push Up', nombre: 'Flexión de brazos' }, true],
  [{ alias: 'Pull Up', nombre: 'Dominada' }, true],
  [{ alias: 'Burpee', nombre: 'Burpee' }, true],
  [{ alias: 'Glute Bridge', nombre: 'Puente de glúteo' }, true],
  [{ alias: 'Bodyweight Deadlift', nombre: 'Peso muerto sin carga' }, true],
  [{ alias: 'Body Weight Calf Raise', nombre: 'Elevación de talones sin carga' }, true],
  [{ alias: 'Mini Band Delt Raises', nombre: 'Elevación de deltoides con banda' }, true],
  [{ alias: 'Band Anchored Single Arm Incline Curl', nombre: 'Curl inclinado a una mano con banda' }, true],
  [{ alias: 'Dip Machine Straight Leg Raise', nombre: 'Elevación de piernas rectas en paralelas' }, true],
  [{ alias: 'Squat Jump', nombre: 'Sentadilla con salto' }, true],
  [{ alias: 'Dumbbell Bench Press', nombre: 'Press banca con mancuernas' }, false],
  [{ alias: 'Wide Grip Lat Pulldown', nombre: 'Jalón al pecho agarre ancho' }, false],
  [{ alias: 'Plate Weighted Dip', nombre: 'Fondos lastrados' }, false],
  [{ alias: 'Bench Plank Single Arm Row', nombre: 'Remo a una mano en plancha sobre banco' }, false],
  [{ alias: 'Extensión muñeca', nombre: 'Extensión de muñeca' }, false],
  // Sin nombre en inglés ni equipo: ante la duda, se pide peso.
  [{ nombre: 'Press banca' }, false],
  [{ nombre: 'Curl de bíceps' }, false],
  // Lo que marque el coach en «Equipo» manda sobre el nombre.
  [{ alias: 'Pull Up', nombre: 'Dominada', equipo: ['lastre'] }, false],
  [{ nombre: 'Press banca', equipo: ['peso_corporal'] }, true],
  [{ alias: 'Push Up', equipo: ['peso_corporal', 'mancuerna'] }, false],
  [{ nombre: 'Remo', equipo: ['trx'] }, true],
];
let mal = 0;
for (const [e, esperado] of casos) {
  const r = sinPeso(e);
  if (r !== esperado) { mal++; console.log(`  MAL  ${e.alias || e.nombre} ${JSON.stringify(e.equipo || [])}: salió ${r ? 'solo reps' : 'con peso'}`); }
}
console.log(mal ? `\n${mal} fallo(s)` : `${casos.length}/${casos.length} bien`);
process.exit(mal ? 1 : 0);
