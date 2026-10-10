// ─────────────────────────────────────────────────────────────────────────
// LA PERFORMANCE DE CADA CLIENTE, AL DÍA (seguimiento automático)
//
// Cada hora (con el cron de los avisos) se actualiza en el CRM la SEMANA EN
// CURSO de cada cliente activo con lo que lleva registrado hasta hoy:
// entrenos hechos contra los programados de su fase, la actividad extra
// (cardio, deportes, caminatas…, con su bono), y las kcal, la proteína y
// los días que registró comida. Los lunes y martes además se cierra la
// semana anterior con todo lo que alcanzó a registrar. Así, el día que el
// coach abra el seguimiento —lunes, sábado o cuando sea— ve la semana tal
// como va hasta ese momento. Los scores salen con la misma regla del CRM
// (calcScores en app.js del CRM: si cambias la regla allá, cámbiala aquí).
//
// NUNCA pisa lo del coach: solo se actualizan las semanas que se crearon
// solas (llevan la marca NOTA_AUTO en las notas). Cuando el coach guarda la
// semana desde el CRM, la marca se quita y desde ahí esa semana es suya.
//
// No se crea la semana de quien no usa la app (sin cuenta en el Meal Tracker
// y sin entrenos marcados por él): sería un 0 % que nadie registró. Los
// entrenos que vienen de la importación de Trainerize no cuentan como
// marcados por el cliente (igual que en el CRM).
// ─────────────────────────────────────────────────────────────────────────
import { actividadExtra, bonoExtra, diasExtra } from './_actividad.js';

export const NOTA_AUTO = 'Semana registrada sola con lo que marcó en su app. Corrígela si sabes algo que la app no.';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Semana ISO (2026-W41) de una fecha YYYY-MM-DD.
export function semanaISO(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dia = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dia);
  const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - ini) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
// Lunes y domingo de una semana ISO.
export function rangoSemana(semana) {
  const [y, w] = semana.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4)); const dow = jan4.getUTCDay() || 7;
  const lunes = new Date(jan4); lunes.setUTCDate(jan4.getUTCDate() - (dow - 1) + (w - 1) * 7);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setUTCDate(lunes.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  return { ini: dias[0], fin: dias[6], dias };
}
const menosDias = (ymd, n) => { const t = new Date(Date.parse(ymd + 'T00:00:00Z')); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10); };
const diaSemana = (ymd) => (new Date(Date.parse(ymd + 'T00:00:00Z')).getUTCDay() + 6) % 7;   // 0 = lunes

// La misma regla del CRM (calcScores, con el bono de actividad extra).
export function calcScores(s, cliente) {
  const pct = (n, d) => d > 0 ? Math.min(100, (n / d) * 100) : null;
  const fuerza = pct(s.fuerza_ejecutados, s.fuerza_planeados);
  const score_entreno = fuerza !== null ? Math.min(100, fuerza + bonoExtra(s.actividad_extra)) : null;
  let score_alim_metas = null;
  if (cliente?.meta_calorias && s.kcal_promedio != null) {
    const k = Math.max(0, 100 - Math.abs((s.kcal_promedio - cliente.meta_calorias) / cliente.meta_calorias * 100));
    const p = cliente.meta_proteina_g && s.proteina_promedio_g != null ? Math.min(100, (s.proteina_promedio_g / cliente.meta_proteina_g) * 100) : null;
    score_alim_metas = p !== null ? (k + p) / 2 : k;
  }
  const score_alim_registro = s.dias_registro_alim != null ? (s.dias_registro_alim / 7) * 100 : null;
  const comp = [score_entreno, score_alim_metas, score_alim_registro].filter(v => v !== null);
  const score_global = comp.length ? comp.reduce((a, b) => a + b, 0) / comp.length : null;
  return { score_entreno, score_alim_metas, score_alim_registro, score_global };
}

// Las comidas de esa semana (hasta hoy), fusionando las cuentas del mismo
// cliente: la más reciente gana cada fecha; nada se suma entre cuentas. Un
// día cuenta si tiene registro en su historial (o es hoy y ya registró).
export function resumenComida(datas, dias) {
  const history = {};
  for (const d of datas) {   // ya en orden: la más reciente primero
    const h = { ...(d.history || {}) };
    if (d.today && d.today_totals && !h[d.today]) h[d.today] = d.today_totals;
    for (const f of dias) if (history[f] === undefined && h[f] && typeof h[f] === 'object') history[f] = h[f];
  }
  const con = dias.filter(f => history[f] && typeof history[f] === 'object');
  if (!con.length) return { dias: 0, kcal: null, prote: null };
  const prom = (k) => Math.round(con.reduce((a, f) => a + Number(history[f]?.[k] || 0), 0) / con.length);
  return { dias: con.length, kcal: prom('kcal'), prote: prom('p') };
}

const enLotes = (lista, n = 60) => { const out = []; for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n)); return out; };

// Arma (sin guardar) las filas de una semana para los clientes dados.
async function filasDeSemana({ crm, mt, clientes, semana, hoy }) {
  const { ini, fin, dias } = rangoSemana(semana);
  const hasta = dias.filter(f => f <= hoy);
  const ids = clientes.map(c => c.id);
  const todas = async (tabla, campos, filtro) => {
    const out = [];
    for (const l of enLotes(ids)) out.push(...((await crm(`${tabla}?select=${campos}&cliente_id=in.(${l.join(',')})${filtro}`)) || []));
    return out;
  };
  // Entrenos, actividad extra y fases de todos, en pocas consultas.
  const ses = await todas('sesiones', 'cliente_id,estado,origen', `&fecha=gte.${ini}&fecha=lte.${fin}`);
  let acts = [];
  try { acts = await todas('actividades', 'cliente_id,fecha,tipo', `&fecha=gte.${ini}&fecha=lte.${fin}`); } catch (e) { acts = []; }
  const fases = await todas('fases', 'id,cliente_id,orden', '&estado=eq.activa');
  const faseDe = new Map();
  for (const f of fases) { const p = faseDe.get(f.cliente_id); if (!p || (f.orden || 0) > (p.orden || 0)) faseDe.set(f.cliente_id, f); }
  const rutinasPorFase = new Map();
  const faseIds = [...new Set([...faseDe.values()].map(f => f.id))];
  for (const l of enLotes(faseIds)) {
    for (const r of ((await crm(`rutinas?select=fase_id&fase_id=in.(${l.join(',')})&archivada=eq.false`)) || [])) rutinasPorFase.set(r.fase_id, (rutinasPorFase.get(r.fase_id) || 0) + 1);
  }
  // Comida: las cuentas del Meal Tracker por nombre (y la vinculada en el CRM).
  let cuentas = [];
  if (mt) { try { cuentas = (await mt('user_data?select=user_id,name,updated_at')) || []; } catch (e) { cuentas = []; } }
  const idsDe = new Map();
  for (const c of clientes) {
    const l = cuentas.filter(u => norm(u.name) === norm(c.nombre)).sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).map(u => u.user_id);
    if (c.mealtracker_id && !l.includes(c.mealtracker_id)) l.unshift(c.mealtracker_id);
    idsDe.set(c.id, l);
  }
  const datos = new Map();
  const todosMt = [...new Set([...idsDe.values()].flat())];
  if (mt && todosMt.length) {
    for (const l of enLotes(todosMt, 40)) {
      for (const f of ((await mt(`user_data?select=user_id,history:data->history,today:data->today,today_totals:data->today_totals&user_id=in.(${l.join(',')})`)) || [])) datos.set(f.user_id, f);
    }
  }

  const filas = [];
  let sinUso = 0;
  for (const c of clientes) {
    const suyas = ses.filter(s => s.cliente_id === c.id);
    const hechas = suyas.filter(s => s.estado === 'completada' && (s.origen || 'cliente') === 'cliente').length;
    const fase = faseDe.get(c.id);
    const planeadas = fase ? (rutinasPorFase.get(fase.id) || null) : null;
    const extra = actividadExtra(acts.filter(a => a.cliente_id === c.id));
    const mtIds = idsDe.get(c.id) || [];
    const comida = resumenComida(mtIds.map(i => datos.get(i)).filter(Boolean), hasta);
    const usaApp = mtIds.length > 0 || suyas.some(s => (s.origen || 'cliente') === 'cliente') || !!extra;
    if (!usaApp) { sinUso++; continue; }
    const seg = {
      fuerza_planeados: planeadas, fuerza_ejecutados: planeadas != null || hechas ? hechas : null,
      cardio_ejecutados: diasExtra(extra), actividad_extra: extra,
      kcal_promedio: comida.kcal, proteina_promedio_g: comida.prote, dias_registro_alim: comida.dias,
    };
    filas.push({
      user_id: c.user_id, cliente_id: c.id, semana, fecha: hoy, ...seg,
      dias_planeados: seg.fuerza_planeados, dias_asistidos: seg.fuerza_planeados != null ? (seg.fuerza_ejecutados ?? 0) : null,
      ...calcScores(seg, c), estado: 'hecho', notas: NOTA_AUTO,
    });
  }
  return { filas, sinUso };
}

// crm(path, opts) y mt(path) → JSON (o lanzan). hoy: YYYY-MM-DD en Bogotá.
export async function cerrarSemana({ crm, mt, hoy }) {
  const semanas = [semanaISO(hoy)];
  if (diaSemana(hoy) <= 1) semanas.push(semanaISO(menosDias(hoy, 7)));   // lunes y martes: cerrar la anterior
  const clientes = ((await crm('clientes?select=id,user_id,nombre,estado,meta_calorias,meta_proteina_g,mealtracker_id&estado=eq.activo')) || []).filter(c => c && c.id);
  const res = { semanas: {}, errores: 0 };
  for (const semana of semanas) {
    const r = { creadas: 0, actualizadas: 0, delCoach: 0, sinUso: 0 };
    try {
      // Las del coach (sin la marca) no se tocan.
      const existentes = (await crm(`seguimientos?select=cliente_id,notas&semana=eq.${semana}`)) || [];
      const delCoach = new Set(existentes.filter(s => !String(s.notas || '').startsWith(NOTA_AUTO)).map(s => s.cliente_id));
      const auto = new Set(existentes.filter(s => String(s.notas || '').startsWith(NOTA_AUTO)).map(s => s.cliente_id));
      r.delCoach = delCoach.size;
      const lista = clientes.filter(c => !delCoach.has(c.id));
      if (lista.length) {
        const { filas, sinUso } = await filasDeSemana({ crm, mt, clientes: lista, semana, hoy });
        r.sinUso = sinUso;
        for (const fila of filas) {
          try { await guardar(crm, fila); if (auto.has(fila.cliente_id)) r.actualizadas++; else r.creadas++; } catch (e) { res.errores++; }
        }
      }
    } catch (e) { res.errores++; r.error = String(e && e.message || e).slice(0, 80); }
    res.semanas[semana] = r;
  }
  return res;
}

// Crea o actualiza la semana automática. Si la base no tiene alguna columna,
// se reintenta sin ella.
async function guardar(crm, fila, intento = 0) {
  try {
    await crm('seguimientos?on_conflict=user_id,cliente_id,semana', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(fila),
    });
  } catch (e) {
    const m = String(e && e.message || e).match(/'([a-z_]+)' column/);
    if (m && intento < 6 && m[1] in fila) { const f = { ...fila }; delete f[m[1]]; return guardar(crm, f, intento + 1); }
    throw e;
  }
}
