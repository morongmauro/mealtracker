// ─────────────────────────────────────────────────────────────────────────
// CIERRE DE CICLO y TU BALANCE · los dos resúmenes del cliente
//
//   · Cierre de ciclo — se abre UNA vez cuando termina su ciclo y empieza el
//     nuevo. Solo lo que dependió de él: entrenos hechos, semanas completas,
//     récords (peso × reps y 1RM estimado), días en su meta de calorías y de
//     proteína. Nada de peso corporal: sin medición nueva daría un mensaje
//     errado. El tono cambia: felicitación si lo logró, aliento si le faltó.
//   · Tu balance — se abre UNA vez por medición nueva (peso y/o % de grasa,
//     la registre él o se la cargue el coach), contra la anterior, con los
//     días que pasaron. La primera vez: «Tu punto de partida».
// ─────────────────────────────────────────────────────────────────────────
// Las mismas reglas de «cumple» del Dash: calorías ±10 %, proteína ≥ 90 %.
const CUMPLE = { kcal: (v, m) => Math.abs(v - m) <= m * 0.10, p: (v, m) => v >= m * 0.90 };

const DIAS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fechaCortaC = (iso) => `${Number(iso.slice(8, 10))} ${DIAS[Number(iso.slice(5, 7)) - 1]}`;
const sumar = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const entre = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
// Sin ceros de sobra al final: 1,50 → 1,5; 2,00 → 2.
export const num = (v, dec = 1) => Number(v).toFixed(dec).replace('.', ',').replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');
// Las restas de peso y % de grasa van con 2 decimales (66,15 → 64,5 = −1,65),
// para que cuadren con la cuenta que hace el cliente o su báscula.
export const conSigno = (v, dec = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), dec);

function metaDe(goalsHistory, goals, fecha) {
  if (!Array.isArray(goalsHistory) || !goalsHistory.length) return goals || null;
  let g = null;
  for (const h of goalsHistory) { if (h.since <= fecha) g = h; else break; }
  return g || goalsHistory[0] || goals || null;
}

// ── Cierre de ciclo ──
export function cierreDelCiclo({ ciclo, history = {}, goals = {}, goalsHistory = null }) {
  if (!ciclo || !ciclo.desde || !ciclo.hasta) return null;
  const r = ciclo.rutinas || { hechos: 0, planeados: 0 };
  let dias = 0, registrados = 0, kcalOk = 0, protOk = 0, conMetaP = false, conMetaK = false;
  for (let f = ciclo.desde; f <= ciclo.hasta; f = sumar(f, 1)) {
    dias++;
    const t = history && history[f];
    const g = metaDe(goalsHistory, goals, f) || {};
    if (Number(g.kcal) > 0) conMetaK = true;
    if (Number(g.p) > 0) conMetaP = true;
    if (!t || !(Number(t.kcal) > 0)) continue;
    registrados++;
    if (Number(g.kcal) > 0 && CUMPLE.kcal(Number(t.kcal), Number(g.kcal))) kcalOk++;
    if (Number(g.p) > 0 && CUMPLE.p(Number(t.p) || 0, Number(g.p))) protOk++;
  }
  const pEntreno = r.planeados > 0 ? r.hechos / r.planeados : null;
  const pComida = conMetaK ? kcalOk / dias : null;
  const partes = [pEntreno, pComida].filter(x => x != null);
  if (!partes.length) return null;
  const ok = (x) => x == null || x >= 0.8;
  const tono = pEntreno != null && pEntreno >= 0.8 && (pComida == null || pComida >= 0.6) ? 'logro'
    : partes.some(x => x >= 0.5) ? 'medio' : 'aliento';
  const titulo = { logro: ['Ciclo cumplido.', 'Felicitaciones: hiciste el trabajo.'],
    medio: ['Buen ciclo,', 'con margen para más.'],
    aliento: ['Este ciclo costó.', 'El que empieza hoy es tuyo.'] }[tono];
  const bajada = { logro: 'Cumpliste tu plan y eso se nota. Así se construye: un ciclo a la vez.',
    medio: 'Lo que sí hiciste suma. En el ciclo nuevo, sube un paso donde más te costó.',
    aliento: 'Pasa, y no borra lo que llevas. Elige una sola cosa y cúmplela esta semana: con eso arrancas.' }[tono];
  // Dónde poner el foco: lo más flojo de los dos.
  const foco = pEntreno != null && (pComida == null || pEntreno <= pComida) && pEntreno < 0.8
    ? `Tu foco: tus ${r.planeados && ciclo.semanas ? Math.round(r.planeados / ciclo.semanas) : ''} entrenos de cada semana. Si un día se complica, muévelo a otro día de la misma semana.`.replace('tus  entrenos', 'tus entrenos')
    : pComida != null && pComida < 0.6
      ? 'Tu foco: registrar tu comida y quedar cerca de tu meta de calorías. Con 5 días a la semana ya cambia el resultado.'
      : null;
  const filas = [];
  if (r.planeados > 0) filas.push({ clave: 'rutinas', valor: `${r.hechos} de ${r.planeados}`, etiqueta: 'entrenos hechos', pct: pEntreno, color: '#3C7BD6' });
  if (ciclo.semanas) filas.push({ clave: 'semanas', valor: `${ciclo.semanas_completas || 0} de ${ciclo.semanas}`, etiqueta: 'semanas completas', pct: (ciclo.semanas_completas || 0) / ciclo.semanas, color: '#3C7BD6' });
  if (conMetaK) filas.push({ clave: 'kcal', valor: `${kcalOk} de ${dias}`, etiqueta: 'días en tu meta de calorías', pct: kcalOk / dias, color: '#46965A' });
  if (conMetaP) filas.push({ clave: 'proteina', valor: `${protOk} de ${dias}`, etiqueta: 'días con tu proteína', pct: protOk / dias, color: '#46965A' });
  const records = (ciclo.records || []).map(x => ({ nombre: x.alias || x.nombre, kg: x.kg, reps: x.reps, sube: x.sube }));
  return { clave: `c:${ciclo.id}`, ciclo, tono, titulo, bajada, foco, filas, records, records_n: ciclo.records_n || records.length, registrados, dias, ok };
}

export function textoCierre(c) {
  const l = c.filas.map(f => `• ${f.etiqueta.charAt(0).toUpperCase() + f.etiqueta.slice(1)}: ${f.valor}`);
  c.records.forEach(x => l.push(`• Récord en ${x.nombre}${x.kg ? `: ${num(x.kg)} kg${x.reps ? ` × ${x.reps}` : ''}` : ''} (+${num(x.sube)} kg de 1RM estimado)`));
  return `Hola Mau! Cerré mi ciclo (${fechaCortaC(c.ciclo.desde)} al ${fechaCortaC(c.ciclo.hasta)}):\n${l.join('\n')}`;
}

// ── Tu balance ──
// medidas: [{ fecha, peso, grasa_pct }] (en cualquier orden). La última de
// los últimos 21 días contra la anterior que tenga el mismo dato.
export function balanceDe(medidas = [], hoy) {
  const l = (medidas || []).filter(m => m && m.fecha && (m.peso != null || m.grasa_pct != null)).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (!l.length) return null;
  const ult = l[l.length - 1];
  if (hoy && entre(ult.fecha, hoy) > 21) return null;
  const antes = l.slice(0, -1);
  const prevDe = (campo) => antes.filter(m => m[campo] != null).pop() || null;
  const magra = (m) => (m && m.peso != null && m.grasa_pct != null ? Number(m.peso) * (1 - Number(m.grasa_pct) / 100) : null);
  const fila = (clave, etiqueta, unidad, actual, previo, bueno) => {
    if (actual == null) return null;
    const cambio = previo == null ? null : Math.round((actual - previo) * 100) / 100;
    return { clave, etiqueta, unidad, actual, previo, cambio, color: cambio == null || cambio === 0 ? '#1F1F1F' : (bueno(cambio) ? '#2F7F45' : '#B5561A') };
  };
  const pPeso = prevDe('peso'), pGrasa = prevDe('grasa_pct');
  const filas = [
    fila('peso', 'Peso', 'kg', ult.peso != null ? Number(ult.peso) : null, pPeso ? Number(pPeso.peso) : null, () => true),
    fila('grasa', '% de grasa', '%', ult.grasa_pct != null ? Number(ult.grasa_pct) : null, pGrasa ? Number(pGrasa.grasa_pct) : null, (c) => c < 0),
    fila('magra', 'Masa magra', 'kg', magra(ult), pGrasa && pPeso ? magra(antes.filter(m => m.peso != null && m.grasa_pct != null).pop()) : null, (c) => c > 0),
  ].filter(Boolean);
  // La fila del peso nunca va en rojo: subir o bajar depende del objetivo.
  filas.forEach(f => { if (f.clave === 'peso') f.color = '#1F1F1F'; });
  const previo = [pPeso, pGrasa].filter(Boolean).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0] || null;
  const g = filas.find(f => f.clave === 'grasa'), p = filas.find(f => f.clave === 'peso'), m = filas.find(f => f.clave === 'magra');
  let titulo;
  if (!previo) titulo = ['Tu punto', 'de partida.'];
  else if (g && g.cambio != null && g.cambio < 0 && p && p.cambio != null && Math.abs(p.cambio) <= 0.5) titulo = ['Mismo peso,', 'menos grasa.'];
  else if (g && g.cambio != null && g.cambio < 0) titulo = ['Menos grasa.', 'Vas bien.'];
  else if (m && m.cambio != null && m.cambio > 0) titulo = ['Más masa magra.', 'Estás construyendo.'];
  else titulo = ['Tu balance', 'de hoy.'];
  const bajada = !previo ? 'Desde aquí medimos tu avance. La próxima medición se compara con esta.'
    : g && g.cambio != null && g.cambio < 0 && p && Math.abs(p.cambio || 0) <= 0.5 ? 'Estás cambiando de qué está hecho tu cuerpo: eso es recomposición.'
      : g && g.cambio != null && g.cambio > 0 ? 'Un dato no define el proceso. Tu coach lo revisa contigo y ajusta lo que haga falta.'
        : 'Así va tu cuerpo desde tu medición anterior.';
  return { clave: `b:${ult.fecha}`, fecha: ult.fecha, previo: previo ? previo.fecha : null, dias: previo ? entre(previo.fecha, ult.fecha) : null, filas, titulo, bajada };
}

export function textoBalance(b) {
  const l = b.filas.map(f => `• ${f.etiqueta}: ${num(f.actual)} ${f.unidad}${f.cambio != null ? ` (${conSigno(f.cambio)})` : ''}`);
  return `Hola Mau! Mi balance del ${fechaCortaC(b.fecha)}${b.previo ? ` (contra el ${fechaCortaC(b.previo)})` : ''}:\n${l.join('\n')}`;
}

// Visto una sola vez (teléfono y servidor, igual que el resumen del mes).
const llave = (tipo, nombre) => `mt:${tipo}:${nombre || ''}`;
export function vistoLocal(tipo, nombre, clave) { try { return (localStorage.getItem(llave(tipo, nombre)) || '') === clave; } catch (e) { return true; } }
export function marcarLocal(tipo, nombre, clave) { try { localStorage.setItem(llave(tipo, nombre), clave); } catch (e) { /* nada */ } }
