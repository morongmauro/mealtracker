// ─────────────────────────────────────────────────────────────────────────
// LOS AROS DE LAS CABECERAS (visual nueva)
//
// La gráfica clave de cada sección, en un aro al lado de la kettlebell:
//   Dash           performance global semanal (promedio de las tres)
//   Entrenamiento  adherencia semanal (Entrenamiento.jsx, aroEntreno)
//   Alimentación   cumplimiento semanal de calorías y macros
//   Aprendizaje    material visto (AprendeHoy.jsx)
// Aparte del Dash para no cargarlo entero en la pantalla de comida.
// ─────────────────────────────────────────────────────────────────────────
import { hoyLocal, sumarDias, aFecha } from './entrenoDatos.js';

// Cumplimiento de la comida en la semana (lunes a hoy), de 0 a 1: cada día
// vale qué tan cerca quedó de sus cuatro metas (calorías, proteína, carbos y
// grasas; la proteína cuenta hasta llegar a la meta, pasarse no resta). Un
// día sin registro vale 0; hoy cuenta solo si ya registró algo.
export function cumplimientoComidaSemana(history = {}, goals = {}, hoy = hoyLocal()) {
  const metas = ['kcal', 'p', 'c', 'g'].filter(k => Number(goals && goals[k]) > 0);
  if (!metas.length) return null;
  const lunes = sumarDias(hoy, -((aFecha(hoy).getDay() + 6) % 7));
  let suma = 0, dias = 0;
  for (let f = lunes; f <= hoy; f = sumarDias(f, 1)) {
    const t = history[f];
    const tiene = t && Number(t.kcal) > 0;
    if (f === hoy && !tiene) continue;
    dias++;
    if (!tiene) continue;
    suma += metas.reduce((a, k) => {
      const v = Number(t[k]) || 0, m = Number(goals[k]);
      return a + (k === 'p' ? Math.min(1, v / m) : Math.max(0, 1 - Math.abs(v - m) / m));
    }, 0) / metas.length;
  }
  return dias ? suma / dias : null;
}

// La adherencia al entreno de la semana (rutinas hechas de las planeadas),
// más el bono de la actividad extra (cardio, deportes…: hasta +10 puntos, la
// misma regla del CRM; lo calcula el servidor, api/_actividad.js).
export const adherenciaEntreno = (semana) => (semana && semana.planeados
  ? Math.min(1, semana.hechos / semana.planeados + (Number(semana.bono) || 0) / 100) : null);

export const aroDe = (frac, pie) => (frac == null ? null : { frac, centro: `${Math.round(frac * 100)}%`, pie });

// El aro de la cabecera del Dash: el performance global de la semana, el
// promedio del entreno, la alimentación y el aprendizaje.
export function aroSemana(semana, history, goals, aprende, hoy) {
  const partes = [adherenciaEntreno(semana), cumplimientoComidaSemana(history, goals, hoy), aprende && aprende.pct != null ? aprende.pct / 100 : null]
    .filter(x => x != null);
  return partes.length ? aroDe(partes.reduce((a, x) => a + x, 0) / partes.length, 'Performance global semanal') : null;
}
export const aroComida = (history, goals, hoy) => aroDe(cumplimientoComidaSemana(history, goals, hoy), 'Performance semanal');

