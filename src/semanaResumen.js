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
  // ── LOS 7 CÍRCULOS: la semana en curso, día por día, según el foco ──────
  //   ok     — cumplido ese día (amarillo con visto)
  //   hoy    — hoy, aún sin cumplir (anillo)
  //   corto  — pasó, hizo algo y no llegó (anillo gris claro)
  //   nada   — pasó sin nada (vacío; nunca rojo)
  //   futuro — aún no llega
  //   libre  — ese día no toca (un puntito; solo en rutinas)
  const diasF = Array.isArray(wa && wa.dias_fuerza) && wa.dias_fuerza.length === 7 ? wa.dias_fuerza : null;
  const umbralP = metaP ? metaP * 0.9 : null;
  const deComida = (f) => { const t = history && history[f]; return t && typeof t === 'object' && Number(t.kcal) > 0 ? t : null; };
  const estadoDia = (i) => {
    const f = sumarDias(lunes, i);
    const esHoy = f === hoy, paso = f < hoy;
    if (foco.que === 'proteina') {
      const t = deComida(f), ok = !!(t && umbralP && Number(t.p) >= umbralP);
      return ok ? 'ok' : esHoy ? 'hoy' : !paso ? 'futuro' : t ? 'corto' : 'nada';
    }
    if (foco.que === 'registro') return deComida(f) ? 'ok' : esHoy ? 'hoy' : paso ? 'nada' : 'futuro';
    if (!diasF) return esHoy ? 'hoy' : paso ? 'nada' : 'futuro';
    const d = diasF[i];
    if (d.hecho) return 'ok';
    if (!d.plan) return esHoy ? 'hoy' : 'libre';
    return esHoy ? 'hoy' : paso ? 'nada' : 'futuro';
  };
  const dias = Array.from({ length: 7 }, (_, i) => estadoDia(i));

  // La frase de tu coach para hoy: concreta y alcanzable, nunca un regaño.
  const hoyComida = deComida(hoy), ayer = sumarDias(hoy, -1), ayerComida = ayer >= lunes ? deComida(ayer) : null;
  const pRest = (x) => Math.max(0, Math.round(x));
  let frase = '';
  if (foco.que === 'proteina') {
    const hoyP = hoyComida ? Number(hoyComida.p) || 0 : 0;
    if (umbralP && hoyP >= umbralP) frase = 'Hoy ya llegaste a tu meta. Así se hace.';
    else if (hoyP > 0) frase = `Hoy llevas ${pRest(hoyP)} g: te faltan ${pRest(metaP - hoyP)} g para tu meta.`;
    else if (ayerComida && umbralP && Number(ayerComida.p) >= umbralP) frase = 'Ayer llegaste a tu meta. Hoy, proteína en cada comida y vas igual.';
    else frase = `Proteína en cada comida y llegas a tus ${metaP} g.`;
  } else if (foco.que === 'registro') {
    frase = hoyComida ? `Hoy ya registraste. Llevas ${actual.comida} de 7 días.` : `Registra lo de hoy, aunque sea en una línea. Llevas ${actual.comida} de 7 días.`;
  } else {
    const h = actual.hechos || 0, p = actual.planeados || pasada.planeados || 0;
    const hoyD = diasF ? diasF[dow] : null;
    const quedo = diasF ? diasF.some((d, i) => i < dow && d.plan && !d.hecho) : false;
    if (p && h >= p) frase = `Semana cumplida: ${p} de ${p}. Lo que sumes es extra.`;
    else if (hoyD && hoyD.hecho) frase = `Hoy ya entrenaste. Vas ${h} de ${p}.`;
    else if (hoyD && hoyD.plan) frase = `Hoy te toca entrenar: con esa vas ${h + 1} de ${p}.`;
    else if (quedo) frase = `Te quedó una rutina: hazla hoy y vas ${h + 1} de ${p}.`;
    else frase = `Hoy descansas. Vas ${h} de ${p}.`;
  }

  // Lo que se muestra del foco: el nombre grande y su cifra a la derecha.
  const cifra = foco.que === 'proteina' ? { num: actual.proteina != null ? String(actual.proteina) : '—', de: `/ ${metaP} g al día` }
    : foco.que === 'registro' ? { num: String(actual.comida), de: '/ 7 días' }
    : { num: String(actual.hechos || 0), de: `/ ${actual.planeados || pasada.planeados || 0}` };
  const nombreFoco = { proteina: 'Proteína', registro: 'Registrar tu comida', rutinas: 'Tus rutinas', mantener: 'Tus rutinas' }[foco.que] || 'Tu semana';

  // Lunes: primero el logro; lo que faltó se vuelve el foco (sin regaño).
  const logros = [];
  if (pasada.planeados > 0 && pasada.hechos >= pasada.planeados) logros.push(`Cumpliste tus ${pasada.planeados} rutinas.`);
  if (pasada.comida >= 6) logros.push(`Registraste tu comida ${pasada.comida} de 7 días.`);
  if (metaP && pasada.proteina != null && !protCorta) logros.push('Llegaste a tu proteína.');
  const logro = logros[0] || (pasada.hechos > 0 ? `Entrenaste ${pasada.hechos} ${pasada.hechos === 1 ? 'vez' : 'veces'}.` : 'Semana nueva: empezamos de cero.');
  const fichasDe = (W, ref) => {
    const out = [];
    if ((W.planeados || 0) > 0) out.push({ que: 'rutinas', num: `${W.hechos || 0}/${W.planeados}`, txt: 'rutinas', ok: ref ? (W.hechos || 0) > (ref.hechos || 0) : (W.hechos || 0) >= W.planeados });
    out.push({ que: 'comida', num: `${W.comida}/7`, txt: 'días de comida', ok: ref ? W.comida > ref.comida : W.comida >= 7 });
    if (W.proteina != null) out.push({ que: 'proteina', num: `${W.proteina} g`, txt: ref ? 'proteína' : (metaP ? `proteína · meta ${metaP}` : 'proteína'), ok: ref ? (ref.proteina != null && W.proteina > ref.proteina) : !!(umbralP && W.proteina >= umbralP) });
    // Lo que subió (o se cumplió) va primero.
    return out.sort((x, y) => (y.ok ? 1 : 0) - (x.ok ? 1 : 0)).map(x => (ref && x.ok ? { ...x, txt: `${x.txt} · subió` } : x));
  };
  const tipLunes = { proteina: 'Es lo que se quedó corto. Suma una porción en el desayuno.', registro: 'Registra aunque sea en una línea: así te puedo ayudar mejor.',
    rutinas: 'Agenda tus rutinas desde hoy: cada una cuenta.', mantener: 'Repite lo de la semana pasada.' }[foco.que] || '';

  // Domingo: un paso que sí se puede hacer hoy (una rutina, o registrar hoy).
  let paso = null;
  if (dow === 6 && sumar) {
    paso = sumar.ir === 'entreno'
      ? { texto: `Una rutina hoy y cierras con ${(actual.hechos || 0) + 1} de ${actual.planeados}.`, boton: sumar.boton, ir: sumar.ir }
      : { texto: `Registra lo de hoy y cierras con ${actual.comida + 1} de 7 días de comida.`, boton: sumar.boton, ir: sumar.ir };
  }

  return { modo: dow === 0 ? 'completa' : dow === 6 ? 'comparativo' : 'corta', dow, hoy, lunes, lunesPasado, domingoPasado, pasada, actual, metaP, titular, foco, sumar, protCorta,
    dias, frase, cifra, nombreFoco, logro, fichasPasada: fichasDe(pasada, null), fichasActual: fichasDe(actual, pasada), tipLunes, paso };
}

