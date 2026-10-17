// ─────────────────────────────────────────────────────────────────────────
// CUÁNTO DURA UNA RUTINA · el mismo cálculo del constructor del CRM
// (entrenamiento.js, «CUÁNTO DURA»), aterrizado con lo que tarda el cliente.
//
// 1. El estimado, como pasa en el gimnasio y no como en el papel:
//    · cada serie: las reps × el tempo (sin tempo, ~3,5 s por rep) + ~20 s de
//      prepararse; «30 s» / «2 min» cuentan ese tiempo; AMRAP ~40 s; «por
//      lado» ×2;
//    · el descanso entre series (el del coach; sin nada, 90 s);
//    · ~75 s de cambio entre un ejercicio y el siguiente;
//    · un circuito: cada vuelta recorre sus ejercicios (con su descanso entre
//      estaciones, o ~15 s) y descansa entre vueltas;
//    · una fila «Rest» de Trainerize es solo su descanso.
// 2. Aterrizado: si ya hizo ESA rutina, pesa sobre todo lo que tardó de
//    verdad (la mediana de sus últimas veces). Si no, se ajusta con su ritmo:
//    cuánto suele tardar él frente al estimado en sus otras rutinas (un
//    cliente que descansa de más tarda un 20 % más en todas).
// ─────────────────────────────────────────────────────────────────────────
export const T = { seg_rep: 3.5, prep_serie: 20, descanso: 90, cambio: 75, cambio_circuito: 15, amrap: 40 };

function segPorRep(tempo) {
  const t = String(tempo || '').trim();
  if (!t) return T.seg_rep;
  const partes = t.split(/[-–/:]/).map(x => (/x/i.test(x) ? 1 : Number(x))).filter(n => Number.isFinite(n));
  const suma = partes.reduce((a, n) => a + n, 0);
  return suma > 0 && suma < 20 ? suma : T.seg_rep;
}

const esDescanso = (re) => /^\s*(rest|descanso)\s*$/i.test(String(re?.nombre_ej || ''));

// Segundos de trabajo de UNA serie.
export function segTrabajo(re) {
  if (esDescanso(re)) return 0;
  const reps = String(re.reps ?? '').toLowerCase().trim();
  const lados = /c\/?\s*l|lado|pierna|brazo|ea\.?\s*side|each/.test(reps) ? 2 : 1;
  const prom = (m) => (m[2] ? (Number(m[1].replace(',', '.')) + Number(m[2].replace(',', '.'))) / 2 : Number(m[1].replace(',', '.')));
  const min = reps.match(/(\d+(?:[.,]\d+)?)(?:\s*[-–a]\s*(\d+(?:[.,]\d+)?))?\s*min/);
  if (min) return Math.round(prom(min) * 60) * lados;
  const seg = reps.match(/(\d+)(?:\s*[-–a]\s*(\d+))?\s*(?:s\b|seg|sec|")/);
  if (seg) return Math.round(prom(seg)) * lados;
  if (/amrap|fallo|max/.test(reps)) return T.amrap;
  const nums = (reps.match(/\d+/g) || []).map(Number).slice(0, 2);
  const n = nums.length ? nums.reduce((a, x) => a + x, 0) / nums.length : 10;
  return Math.max(10, Math.min(120, Math.round(n * segPorRep(re.tempo) * lados)));
}

// Segundos estimados de la rutina. `ejercicios` en orden, con bloque_id.
export function segundosRutina(ejercicios = [], bloques = []) {
  const porId = Object.fromEntries((bloques || []).map(b => [b.id, b]));
  const tramos = [];
  [...ejercicios].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).forEach(re => {
    const ult = tramos[tramos.length - 1];
    const b = re.bloque_id && porId[re.bloque_id] ? re.bloque_id : null;
    if (b && ult && ult.b === b) ult.items.push(re);
    else tramos.push({ b, items: [re] });
  });
  let total = 0;
  tramos.forEach((t, k) => {
    if (!t.b) {
      t.items.forEach((re, i) => {
        const primero = k === 0 && i === 0;
        if (esDescanso(re)) { total += Math.max(1, Number(re.series) || 1) * (re.descanso_seg ?? 30); return; }
        const series = Math.max(1, Number(re.series) || 1);
        const desc = re.descanso_seg ?? T.descanso;
        total += series * (segTrabajo(re) + T.prep_serie) + (series - 1) * desc + (primero ? 0 : T.cambio);
      });
      return;
    }
    const b = porId[t.b];
    const vueltas = Math.max(1, Number(b.vueltas) || Math.max(...t.items.map(x => Number(x.series) || 1)));
    const entre = b.descanso_entre_seg ?? T.cambio_circuito;
    const trabajo = t.items.filter(re => !esDescanso(re));
    const pausas = t.items.filter(esDescanso).reduce((a, re) => a + (re.descanso_seg ?? 30), 0);
    const porVuelta = trabajo.reduce((a, re) => a + segTrabajo(re) + 10, 0) + Math.max(0, trabajo.length - 1) * entre + pausas;
    total += vueltas * porVuelta + (vueltas - 1) * (b.descanso_seg ?? 60) + (k === 0 ? 0 : T.cambio);
  });
  return total;
}

const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Lo que se le muestra al cliente: redondeado como se dice (1 en 1 hasta 15,
// de 5 en 5 después).
export function redondear(min) {
  if (!Number.isFinite(min) || min <= 0) return null;
  return min < 15 ? Math.max(1, Math.round(min)) : Math.round(min / 5) * 5;
}

// Una duración real cuenta si es creíble: entre 5 min y 3 h (una sesión que
// se quedó abierta toda la tarde no enseña nada).
const creible = (seg) => Number.isFinite(seg) && seg >= 300 && seg <= 3 * 3600;

// estSeg: el estimado; reales: segundos de SUS sesiones de esta rutina (las
// más recientes primero); ritmo: real/estimado típico del cliente (o null).
export function minutosAterrizados(estSeg, reales = [], ritmo = null) {
  if (!estSeg) return null;
  const est = estSeg * (ritmo || 1);
  const r = reales.filter(creible).slice(0, 6);
  if (!r.length) return redondear(est / 60);
  const peso = Math.min(0.85, 0.35 * r.length);   // 1 vez: 35 %; 3 o más: 85 %
  return redondear((peso * mediana(r) + (1 - peso) * est) / 60);
}

// { rutinaId: minutos } para un cliente. `sb` es el cliente REST de la API.
export async function minutosDeRutinas(sb, clienteId, rutinaIds) {
  const ids = [...new Set((rutinaIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const lista = ids.join(',');
  const [reRaw, bloques, ses] = await Promise.all([
    sb(`rutina_ejercicios?select=rutina_id,bloque_id,orden,series,reps,tempo,descanso_seg,ejercicios(alias,nombre)&rutina_id=in.(${lista})`)
      .catch(() => sb(`rutina_ejercicios?select=rutina_id,bloque_id,orden,series,reps,tempo,descanso_seg&rutina_id=in.(${lista})`)),
    sb(`rutina_bloques?select=id,rutina_id,vueltas,descanso_seg,descanso_entre_seg&rutina_id=in.(${lista})`)
      .catch(() => sb(`rutina_bloques?select=id,rutina_id,vueltas,descanso_seg&rutina_id=in.(${lista})`)),
    // Sus sesiones terminadas con duración (de cualquier rutina: el ritmo
    // personal sale de todas), las más recientes primero.
    clienteId ? sb(`sesiones?select=rutina_id,duracion_seg&cliente_id=eq.${clienteId}&estado=eq.completada&duracion_seg=not.is.null&order=fecha.desc&limit=80`).catch(() => []) : [],
  ]);
  const re = (Array.isArray(reRaw) ? reRaw : []).map(x => ({ ...x, nombre_ej: x.ejercicios ? (x.ejercicios.alias || x.ejercicios.nombre) : null }));
  const porRut = {}, bloqPorRut = {};
  re.forEach(x => (porRut[x.rutina_id] || (porRut[x.rutina_id] = [])).push(x));
  (Array.isArray(bloques) ? bloques : []).forEach(b => (bloqPorRut[b.rutina_id] || (bloqPorRut[b.rutina_id] = [])).push(b));
  const est = {};
  ids.forEach(id => { est[id] = segundosRutina(porRut[id] || [], bloqPorRut[id] || []); });
  const sesiones = (Array.isArray(ses) ? ses : []).filter(s => creible(Number(s.duracion_seg)));
  // Ritmo personal: con las rutinas de las que ya hay estimado.
  const ratios = sesiones.filter(s => est[s.rutina_id]).map(s => Number(s.duracion_seg) / est[s.rutina_id]);
  const ritmo = ratios.length >= 2 ? Math.max(0.75, Math.min(1.4, mediana(ratios))) : null;
  const out = {};
  ids.forEach(id => {
    const reales = sesiones.filter(s => s.rutina_id === id).map(s => Number(s.duracion_seg));
    const m = minutosAterrizados(est[id], reales, ritmo);
    if (m) out[id] = m;
  });
  return out;
}
