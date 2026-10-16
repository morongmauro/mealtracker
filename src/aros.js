// ─────────────────────────────────────────────────────────────────────────
// LOS AROS DE LAS CABECERAS (visual nueva)
//
// El aro es el PROGRESO DE LA SEMANA: se va llenando con lo que haces, y el
// pie dice si vas al día o cuánto se quedó atrás.
//   Dash           % de la semana completada (entreno + comida)
//   Entrenamiento  rutinas hechas de las planeadas (Entrenamiento.jsx)
//   Alimentación   días registrados de 7
//   Aprendizaje    material visto (AprendeHoy.jsx)
// Antes medía «sin deuda» contra lo que tocaba hasta hoy: un lunes antes de
// entrenar salía 100 % y el aro no decía nada. Ahora el aro llena con la
// semana y el «al día / N sin hacer» es lo que dice si vas bien.
// Aparte del Dash para no cargarlo entero en la pantalla de comida.
// ─────────────────────────────────────────────────────────────────────────
import { hoyLocal, sumarDias, aFecha } from './entrenoDatos.js';

const lunesDe = (hoy) => sumarDias(hoy, -((aFecha(hoy).getDay() + 6) % 7));

// Qué tan cerca quedó la comida de sus metas en la semana (lunes a hoy), de
// 0 a 1: cada día vale qué tan cerca quedó de sus cuatro metas (calorías,
// proteína, carbos y grasas; la proteína cuenta hasta llegar a la meta,
// pasarse no resta). Un día sin registro vale 0; hoy cuenta solo si ya
// registró algo. Es el detalle de la explicación, no lo que llena el aro.
export function cumplimientoComidaSemana(history = {}, goals = {}, hoy = hoyLocal()) {
  const metas = ['kcal', 'p', 'c', 'g'].filter(k => Number(goals && goals[k]) > 0);
  if (!metas.length) return null;
  let suma = 0, dias = 0;
  for (let f = lunesDe(hoy); f <= hoy; f = sumarDias(f, 1)) {
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

// La comida de la semana: cuántos días registró (de 7) y cuántos de los que
// ya pasaron se quedaron sin registrar (hoy no cuenta como atrasado).
export function progresoComida(history = {}, goals = {}, hoy = hoyLocal()) {
  let registrados = 0, pendientes = 0;
  for (let f = lunesDe(hoy); f <= hoy; f = sumarDias(f, 1)) {
    const t = history[f];
    if (t && Number(t.kcal) > 0) registrados++;
    else if (f < hoy) pendientes++;
  }
  return { registrados, total: 7, pendientes, cerca: cumplimientoComidaSemana(history, goals, hoy) };
}

// El entreno de la semana, con lo que manda el servidor (semana del Dash:
// hechos, planeados, planeados_hoy): rutinas hechas de las planeadas y
// cuántas de las que ya tocaban se quedaron sin hacer.
export function progresoEntreno(semana) {
  if (!semana || !semana.planeados) return null;
  const hasta = semana.planeados_hoy != null ? semana.planeados_hoy : semana.planeados;
  return { hechas: semana.hechos, planeadas: semana.planeados, pendientes: Math.max(0, hasta - semana.hechos) };
}

// Lo mismo, pero desde el plan de la sección de Entrenamiento (dias[]).
export function progresoEntrenoDelPlan(plan) {
  const dias = (plan && plan.dias) || [];
  const conRutina = dias.filter(d => d.rutina);
  if (!conRutina.length) return null;
  const hoy = (plan && plan.hoy) || hoyLocal();
  const hechas = conRutina.filter(d => d.hecha).length;
  // Se quedó sin hacer: tocaba un día que ya pasó y no está hecha.
  const pendientes = conRutina.filter(d => d.fecha < hoy && !d.hecha).length;
  return { hechas, planeadas: conRutina.length, pendientes };
}

// Adherencia clásica (hechas de las que tocaban hasta hoy, con bono y
// penalización): la misma regla del CRM. Queda para quien la necesite.
export const adherenciaEntreno = (semana) => {
  if (!semana || !semana.planeados) return null;
  const extra = ((Number(semana.bono) || 0) - (Number(semana.penal) || 0)) / 100;
  const hasta = semana.planeados_hoy != null ? semana.planeados_hoy : semana.planeados;
  const base = hasta > 0 ? semana.hechos / hasta : 1;
  return Math.max(0, Math.min(1, base + extra));
};

// El pie del aro: «al día» o, en neutro, lo que YA se hizo. Nunca lo que
// falta: el blob no regaña al entrar (lo que quedó atrás se ve al tocarlo
// y en su sección); solo puntualiza lo hecho.
export const pieSemana = (pendientes, hechas = 0, cosa = 'hechas') => (pendientes > 0
  ? (hechas > 0 ? `Semana · ${hechas} ${cosa}` : 'Semana · en marcha')
  : 'Semana · al día');

// Sin datos todavía (sin fase, sin metas) el aro sale igual, vacío y con
// «—»: antes desaparecía y la cabecera cambiaba de forma.
export const aroVacio = (pie) => ({ frac: 0, centro: '—', pie });
export const aroDe = (frac, pie) => (frac == null ? aroVacio(pie) : { frac, centro: `${Math.round(frac * 100)}%`, pie });

export const aroEntrenoDe = (prog) => (prog
  ? { frac: prog.planeadas ? prog.hechas / prog.planeadas : 0, centro: `${prog.hechas}/${prog.planeadas}`, pie: pieSemana(prog.pendientes, prog.hechas, prog.hechas === 1 ? 'hecha' : 'hechas') }
  : aroVacio('Semana · entreno'));

export function aroComida(history, goals, hoy) {
  const c = progresoComida(history, goals, hoy);
  return { frac: c.registrados / c.total, centro: `${c.registrados}/${c.total}`, pie: pieSemana(c.pendientes, c.registrados, c.registrados === 1 ? 'día registrado' : 'días registrados') };
}

// El aro del Dash: el % de la semana completada, promedio del entreno (rutinas
// hechas de las planeadas) y la comida (días registrados de 7). El
// aprendizaje va aparte: es material de todo el programa, no de la semana.
const pct = (f) => (f == null ? '—' : `${Math.round(f * 100)}%`);
export function partesSemana(semana, history, goals, hoy) {
  const e = progresoEntreno(semana);
  const c = progresoComida(history, goals, hoy);
  return [
    { id: 'entreno', nombre: 'Entrenamiento', frac: e ? (e.planeadas ? e.hechas / e.planeadas : 0) : null, pendientes: e ? e.pendientes : 0,
      detalle: e ? `${e.hechas} de ${e.planeadas} rutinas de la semana` : 'Sin rutinas planeadas esta semana.',
      atras: e && e.pendientes ? `${e.pendientes} que ya tocaba${e.pendientes === 1 ? '' : 'n'} sin hacer` : '' },
    { id: 'comida', nombre: 'Alimentación', frac: c.registrados / c.total, pendientes: c.pendientes,
      detalle: `${c.registrados} de 7 días registrados${c.cerca != null ? ` · ${pct(c.cerca)} cerca de tus metas` : ''}`,
      atras: c.pendientes ? `${c.pendientes} día${c.pendientes === 1 ? '' : 's'} sin registrar` : '' },
  ];
}
export function aroSemana(semana, history, goals, aprende, hoy) {
  const partes = partesSemana(semana, history, goals, hoy);
  const con = partes.map(p => p.frac).filter(x => x != null);
  const pendientes = partes.reduce((a, p) => a + (p.pendientes || 0), 0);
  const frac = con.length ? con.reduce((a, x) => a + x, 0) / con.length : null;
  // En el Dash no hay una sola cosa que contar: «al día» o «en marcha».
  return { frac: frac == null ? 0 : frac, centro: pct(frac), pie: pendientes > 0 ? 'Semana · en marcha' : 'Semana · al día' };
}
