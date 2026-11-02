// ─────────────────────────────────────────────────────────────────────────
// RESUMEN DEL MES · lo que el cliente construyó el mes pasado
//
// Se abre solo una vez, la primera vez que entra en el mes nuevo, y queda
// al final del Dash todo el mes. Solo sale lo que de verdad registró:
//   · rutinas      — hechas contra las de su fase (del servidor, `ent.mes`)
//   · peso y grasa — su último registro del mes contra el último de antes
//                    (no hace falta medirse el día 1). Con las fechas, para
//                    que el número no engañe. Sin registro en el mes: su
//                    último dato, en gris, sin cambio ni regaño.
//   · 1RM          — el ejercicio que más subió (si ninguno subió, no sale)
//   · comida       — días en su meta (90–110 % de la meta que regía ese día,
//                    la misma regla del calendario de comidas)
// ─────────────────────────────────────────────────────────────────────────

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const fechaCortaMes = (iso) => `${Number(iso.slice(8, 10))} ${CORTOS[Number(iso.slice(5, 7)) - 1]}`;
const num = (v, dec = 1) => v.toFixed(dec).replace('.', ',').replace(/,0+$/, '');
const conSigno = (v, dec = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), dec);

// El mes pasado de `hoy` (AAAA-MM-DD).
export function mesPasado(hoy) {
  let a = Number(hoy.slice(0, 4)), m = Number(hoy.slice(5, 7)) - 1;
  if (m === 0) { m = 12; a--; }
  const mm = String(m).padStart(2, '0');
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { clave: `${a}-${mm}`, desde: `${a}-${mm}-01`, hasta: `${a}-${mm}-${String(dias).padStart(2, '0')}`, dias, nombre: MESES[m - 1] };
}

// La meta que regía en una fecha (misma regla que goalsVigentes de la app).
function metaDe(goalsHistory, goals, fecha) {
  if (!Array.isArray(goalsHistory) || !goalsHistory.length) return goals || null;
  let g = null;
  for (const h of goalsHistory) { if (h.since <= fecha) g = h; else break; }
  return g || goalsHistory[0] || goals || null;
}

// Peso o grasa: { valor, cambio, desde, hasta } o { valor, ultimo } (sin
// registro en el mes) o null (nunca se ha medido).
export function medidaDelMes(medidas = [], campo, desde, hasta) {
  const con = medidas.filter(m => m && m.fecha && m[campo] != null && Number.isFinite(Number(m[campo])))
    .slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const delMes = con.filter(m => m.fecha >= desde && m.fecha <= hasta);
  if (!delMes.length) {
    const ult = con.filter(m => m.fecha < desde).pop();
    return ult ? { valor: Number(ult[campo]), ultimo: ult.fecha } : null;
  }
  const fin = delMes[delMes.length - 1];
  const base = con.filter(m => m.fecha < desde).pop() || (delMes.length >= 2 ? delMes[0] : null);
  if (!base) return { valor: Number(fin[campo]), primero: fin.fecha };
  return { valor: Number(fin[campo]), cambio: Math.round((Number(fin[campo]) - Number(base[campo])) * 10) / 10, desde: base.fecha, hasta: fin.fecha };
}

// Las filas del resumen, en orden. Cada una: { clave, etiqueta, valor, sub,
// color, gris, corto } (corto: la etiqueta chiquita de la tarjeta del Dash).
export function resumenDelMes({ hoy, mes = null, medidas = [], history = {}, goals = {}, goalsHistory = null }) {
  const m = mesPasado(hoy);
  const filas = [];
  const r = mes && mes.desde === m.desde ? mes.rutinas : null;
  if (r && (r.planeados > 0 || r.hechos > 0)) {
    filas.push({ clave: 'rutinas', etiqueta: 'Rutinas hechas', corto: 'rutinas hechas',
      valor: r.planeados > 0 ? `${r.hechos} de ${r.planeados}` : String(r.hechos), color: '#1F1F1F' });
  }
  const medida = (campo, etiqueta, unidad, corto) => {
    const d = medidaDelMes(medidas, campo, m.desde, m.hasta);
    if (!d) return;
    const fmt = (v) => `${num(v)}${unidad === 'pts' ? ' %' : ` ${unidad}`}`;
    if (d.cambio != null) {
      filas.push({ clave: campo, etiqueta, corto, color: '#1F1F1F',
        valor: d.cambio === 0 ? 'Sin cambio' : `${conSigno(d.cambio)} ${unidad}`,
        sub: `del ${fechaCortaMes(d.desde)} al ${fechaCortaMes(d.hasta)}` });
    } else if (d.primero) {
      filas.push({ clave: campo, etiqueta, corto, color: '#1F1F1F', valor: fmt(d.valor), sub: `Primer registro · ${fechaCortaMes(d.primero)}` });
    } else {
      filas.push({ clave: campo, etiqueta, corto: `${corto} · último ${fechaCortaMes(d.ultimo)}`, color: '#737373', gris: true,
        valor: fmt(d.valor), sub: `Último registro · ${fechaCortaMes(d.ultimo)}` });
    }
  };
  medida('peso', 'Peso', 'kg', 'de peso');
  medida('grasa_pct', '% de grasa', 'pts', 'de % de grasa');
  const f = mes && mes.desde === m.desde ? mes.fuerza : null;
  if (f && f.sube > 0) {
    const nombre = String(f.nombre || '').toLowerCase();
    filas.push({ clave: 'fuerza', etiqueta: `1RM estimado · ${nombre}`, corto: `1RM en ${nombre}`, valor: `+${num(f.sube)} kg`, color: '#2F7F45' });
  }
  let registrados = 0, enMeta = 0;
  for (let i = 1; i <= m.dias; i++) {
    const fecha = `${m.clave}-${String(i).padStart(2, '0')}`;
    const t = history && history[fecha];
    if (!t || !(Number(t.kcal) > 0)) continue;
    registrados++;
    const g = metaDe(goalsHistory, goals, fecha);
    const pct = g && g.kcal ? (Number(t.kcal) / Number(g.kcal)) * 100 : null;
    if (pct != null && pct >= 90 && pct <= 110) enMeta++;
  }
  if (registrados > 0 && metaDe(goalsHistory, goals, m.hasta)?.kcal) {
    filas.push({ clave: 'comida', etiqueta: 'Días en tu meta de comida', corto: 'días en tu meta de comida', valor: `${enMeta} de ${m.dias}`, color: '#1F1F1F' });
  }
  return { ...m, filas };
}

// Lo que se manda al coach por WhatsApp.
export function textoParaCoach(res) {
  const lineas = res.filas.map(f => `• ${f.etiqueta}: ${f.valor}${f.sub ? ` (${f.sub.charAt(0).toLowerCase()}${f.sub.slice(1)})` : ''}`);
  return `Hola Mau! Mi resumen de ${res.nombre}:\n${lineas.join('\n')}`;
}

// Una sola vez por mes y por persona. Se guarda en el teléfono y también en
// el servidor (/api/uso): así no vuelve a salir si abre la app en otro
// teléfono, en el navegador o después de volver a entrar.
const llave = (nombre) => `mt:resumenMes:${nombre || ''}`;
const usuario = () => { try { return localStorage.getItem('cloudUserId') || null; } catch (e) { return null; } };
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const usoPost = (cuerpo) => fetch('/api/uso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
  body: JSON.stringify({ user_id: usuario(), hoy: hoyLocal(), ...cuerpo }) });
// ¿Ya lo vio en otro lado? true / false; null si no se pudo saber (sin red).
export async function resumenVistoEnServidor(nombre, clave) {
  try {
    const r = await usoPost({ name: nombre, consulta: 'resumen', mes: clave });
    const x = await r.json();
    return x && x.ok ? !!x.visto : null;
  } catch (e) { return null; }
}
export function marcarResumenEnServidor(nombre, clave) {
  try { usoPost({ name: nombre, resumen: clave }).catch(() => {}); } catch (e) { /* nada */ }
}
export function resumenVisto(nombre, clave) {
  try { return localStorage.getItem(llave(nombre)) === clave; } catch (e) { return true; }
}
export function marcarResumenVisto(nombre, clave) {
  try { localStorage.setItem(llave(nombre), clave); } catch (e) { /* sin almacenamiento: no pasa nada */ }
}

// Los días de esta semana con la comida registrada (para el cierre de la
// semana en el entreno). La app deja aquí su historial al cargarlo.
let historia = {};
export function fijarHistoriaComida(h) { historia = h || {}; }
export function diasConComida(desde, hasta) {
  let n = 0;
  for (const [f, t] of Object.entries(historia)) if (f >= desde && f <= hasta && t && Number(t.kcal) > 0) n++;
  return n;
}
