// TU SEMANA · lo que muestra la tarjeta de la semana del Dash (TarjetaSemana.jsx).
// Puro: se prueba con node (pruebas/semana-dash.mjs).
import { sumarDias, aFecha } from './entrenoDatos.js';

// La comida de una semana (hasta `hasta`): días registrados y proteína promedio.
function comidaSemana(history, desde, hasta) {
  let dias = 0, sumaP = 0;
  for (let k = 0; k < 7; k++) {
    const f = sumarDias(desde, k);
    if (f > hasta) break;
    const t = history && history[f];
    if (t && typeof t === 'object' && Number(t.kcal) > 0) { dias++; sumaP += Number(t.p) || 0; }
  }
  return { dias, proteina: dias ? Math.round(sumaP / dias) : null };
}

// Puro (se prueba solo): todo lo que la tarjeta muestra.
export function armarSemana({ semanas = [], history = {}, goals = {}, hoy }) {
  if (!hoy) return null;
  const dow = (aFecha(hoy).getDay() + 6) % 7;            // 0 = lunes … 6 = domingo
  const lunes = sumarDias(hoy, -dow);
  const lunesPasado = sumarDias(lunes, -7), domingoPasado = sumarDias(lunes, -1);
  const w = (desde) => (Array.isArray(semanas) ? semanas.find(x => x.desde === desde) : null) || null;
  const wp = w(lunesPasado), wa = w(lunes);
  const cp = comidaSemana(history, lunesPasado, domingoPasado), ca = comidaSemana(history, lunes, hoy);
  const metaP = Number(goals && goals.p) || null;
  const pasada = {
    hechos: wp ? wp.hechos : null, planeados: wp ? wp.planeados : 0,
    cardio: wp ? (wp.cardio_dias ?? null) : null, rpe: wp ? (wp.rpe_prom ?? null) : null,
    comida: cp.dias, proteina: cp.proteina,
  };
  const actual = {
    hechos: wa ? wa.hechos : null, planeados: wa ? wa.planeados : 0,
    cardio: wa ? (wa.cardio_dias ?? null) : null, rpe: wa ? (wa.rpe_prom ?? null) : null,
    comida: ca.dias, proteina: ca.proteina,
  };
  // Nada que contar de la semana pasada: no sale.
  if (!(pasada.planeados > 0) && !pasada.comida && !(pasada.hechos > 0)) return null;

  // El titular: la fuerza y lo de la comida que más falló.
  const partes = [];
  if (pasada.planeados > 0) partes.push(pasada.hechos >= pasada.planeados ? `Cumpliste tus ${pasada.planeados} rutinas.` : `Hiciste ${pasada.hechos} de ${pasada.planeados} rutinas.`);
  const protCorta = metaP && pasada.proteina != null && pasada.proteina < metaP * 0.9;
  if (pasada.comida < 5) partes.push(pasada.comida ? `Registraste comida ${pasada.comida} de 7 días.` : 'No registraste comida.');
  else if (protCorta) partes.push('La proteína quedó corta.');
  else if (pasada.comida) partes.push('Buena semana de comida.');
  const titular = partes.join(' ') || 'Así te fue la semana pasada.';

  // El foco de esta semana: lo que más se quedó corto.
  let foco;
  if (pasada.comida < 5) foco = { que: 'registro', titulo: 'registrar tu comida', valor: actual.comida, meta: 7, texto: `${actual.comida} / 7 días`, tip: 'Registra aunque sea en una línea: así te puedo ayudar mejor.' };
  else if (protCorta) foco = { que: 'proteina', titulo: 'proteína', valor: actual.proteina || 0, meta: metaP, texto: `${actual.proteina ?? 0} / ${metaP} g`, tip: 'Tu promedio de esta semana. Suma una porción en el desayuno.' };
  else if (pasada.planeados > 0 && pasada.hechos < pasada.planeados) foco = { que: 'rutinas', titulo: 'tus rutinas', valor: actual.hechos || 0, meta: actual.planeados || pasada.planeados, texto: `${actual.hechos || 0} / ${actual.planeados || pasada.planeados} rutinas`, tip: 'Agenda tus días de entreno desde el lunes.' };
  else if (pasada.planeados > 0) foco = { que: 'mantener', titulo: 'repetir tu semana', valor: actual.hechos || 0, meta: actual.planeados || pasada.planeados, texto: `${actual.hechos || 0} / ${actual.planeados || pasada.planeados} rutinas`, tip: 'Vas bien: la idea es sostenerlo.' };
  else foco = { que: 'registro', titulo: 'registrar tu comida', valor: actual.comida, meta: 7, texto: `${actual.comida} / 7 días`, tip: 'Registra aunque sea en una línea.' };
  foco.pct = foco.meta ? Math.max(0, Math.min(100, Math.round((foco.valor / foco.meta) * 100))) : 0;

  // Domingo: lo que todavía puede sumar hoy.
  let sumar = null;
  if (dow === 6) {
    const comioHoy = !!(history && history[hoy] && Number(history[hoy].kcal) > 0);
    if (actual.planeados > 0 && (actual.hechos || 0) < actual.planeados) {
      const faltan = actual.planeados - (actual.hechos || 0);
      const igualar = pasada.hechos != null && (actual.hechos || 0) < pasada.hechos;
      sumar = { texto: igualar ? `te falta${faltan === 1 ? '' : 'n'} ${faltan} rutina${faltan === 1 ? '' : 's'} para igualar las ${pasada.hechos} de la semana pasada.` : `te falta${faltan === 1 ? '' : 'n'} ${faltan} rutina${faltan === 1 ? '' : 's'} para completar tu semana.`, boton: 'Ir a entrenar', ir: 'entreno' };
    } else if (!comioHoy) sumar = { texto: 'registra lo que comas hoy para cerrar tu semana completa.', boton: 'Registrar comida', ir: 'comida' };
  }
  return { modo: dow === 0 ? 'completa' : dow === 6 ? 'comparativo' : 'corta', dow, hoy, lunes, lunesPasado, domingoPasado, pasada, actual, metaP, titular, foco, sumar, protCorta };
}

