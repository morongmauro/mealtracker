// ─────────────────────────────────────────────────────────────────────────
// LA SEMANA DE CADA CLIENTE, SOLA (seguimiento automático)
//
// Cada lunes (y el martes, por si el cron del lunes se saltó) se crea en el
// CRM la semana que acaba de cerrar de cada cliente activo, con lo que marcó
// en su app: entrenos hechos contra los programados de su fase, y las kcal,
// la proteína y los días que registró comida en el Meal Tracker. Con eso se
// calculan los mismos scores que calcula el CRM (calcScores en app.js del
// CRM: si cambias la regla allá, cámbiala aquí).
//
// NUNCA pisa nada: si esa semana ya existe (la guardó el coach, o ya se creó
// sola), no se toca. El coach la puede corregir después en el CRM y su
// corrección manda. Lo que la app no sabe (ánimo, descanso, avances, notas)
// queda vacío para que lo llene si quiere.
//
// No se crea la semana de quien no usa la app (sin cuenta en el Meal Tracker
// y sin entrenos marcados por él): sería un 0 % que nadie registró. Los
// entrenos que vienen de la importación de Trainerize no cuentan como
// marcados por el cliente (igual que en el CRM).
// ─────────────────────────────────────────────────────────────────────────

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

// La misma regla del CRM (calcScores). Sin actividad extra: la app aún no la
// separa por tipo como el formulario del coach, así que el bono queda en 0.
export function calcScores(s, cliente) {
  const pct = (n, d) => d > 0 ? Math.min(100, (n / d) * 100) : null;
  const score_entreno = pct(s.fuerza_ejecutados, s.fuerza_planeados);
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

// Las comidas de esa semana, fusionando las cuentas del mismo cliente (la
// más reciente gana cada fecha; nada se suma entre cuentas), con la misma
// regla de «día registrado» del CRM: la fecha está en history o tiene detalle.
export function resumenComida(datas, dias) {
  const history = {}, detalle = {};
  for (const d of datas) {   // ya en orden: la más reciente primero
    const h = { ...(d.history || {}) };
    if (d.today && d.today_totals && !h[d.today]) h[d.today] = d.today_totals;
    for (const f of dias) {
      if (history[f] === undefined && h[f] && typeof h[f] === 'object') history[f] = h[f];
      const det = (d.historyDetail || {})[f];
      if (detalle[f] === undefined && Array.isArray(det) && det.length) detalle[f] = det;
    }
  }
  const con = dias.filter(f => (detalle[f] && detalle[f].length) || (history[f] && typeof history[f] === 'object'));
  if (!con.length) return { dias: 0, kcal: null, prote: null };
  const prom = (k) => Math.round(con.reduce((a, f) => a + Number(history[f]?.[k] || 0), 0) / con.length);
  return { dias: con.length, kcal: prom('kcal'), prote: prom('p') };
}

// crm(path, opts) y mt(path) → JSON (o lanzan). hoy: YYYY-MM-DD en Bogotá.
// forzar: correr aunque no sea lunes/martes (pruebas y el botón del coach).
export async function cerrarSemana({ crm, mt, hoy, forzar = false }) {
  const dow = diaSemana(hoy);
  if (!forzar && dow > 1) return { omitido: 'no es lunes ni martes' };
  const semana = semanaISO(menosDias(hoy, 7));
  const { ini, fin, dias } = rangoSemana(semana);

  const clientes = (await crm('clientes?select=id,user_id,nombre,estado,meta_calorias,meta_proteina_g,mealtracker_id&estado=eq.activo')) || [];
  const ya = new Set(((await crm(`seguimientos?select=cliente_id&semana=eq.${semana}`)) || []).map(s => s.cliente_id));
  const pendientes = clientes.filter(c => c && c.id && !ya.has(c.id));
  if (!pendientes.length) return { semana, creadas: 0, ya: ya.size };

  // Las cuentas del Meal Tracker (solo nombre e id; los datos se traen
  // después, de las que hagan falta).
  let cuentas = [];
  if (mt) { try { cuentas = (await mt('user_data?select=user_id,name,updated_at')) || []; } catch (e) { cuentas = []; } }

  const res = { semana, creadas: 0, ya: ya.size, sinUso: 0, errores: 0 };
  for (const c of pendientes) {
    try {
      // Entrenos de esa semana, marcados por el cliente (no los importados).
      const ses = (await crm(`sesiones?select=id,estado,origen&cliente_id=eq.${c.id}&fecha=gte.${ini}&fecha=lte.${fin}`)) || [];
      const hechas = ses.filter(s => s.estado === 'completada' && (s.origen || 'cliente') === 'cliente').length;
      // Lo programado: las rutinas de su fase activa (como el CRM).
      let planeadas = null;
      const fases = (await crm(`fases?select=id&cliente_id=eq.${c.id}&estado=eq.activa&order=orden.desc&limit=1`)) || [];
      if (fases[0]) {
        const rr = (await crm(`rutinas?select=id&fase_id=eq.${fases[0].id}&archivada=eq.false`)) || [];
        if (rr.length) planeadas = rr.length;
      }
      // Comida: sus cuentas por nombre (y la vinculada en el CRM).
      const ids = cuentas.filter(u => norm(u.name) === norm(c.nombre))
        .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).map(u => u.user_id);
      if (c.mealtracker_id && !ids.includes(c.mealtracker_id)) ids.unshift(c.mealtracker_id);
      let comida = { dias: 0, kcal: null, prote: null };
      if (ids.length && mt) {
        const filas = (await mt(`user_data?select=user_id,data&user_id=in.(${ids.join(',')})`)) || [];
        const porId = new Map(filas.map(f => [f.user_id, f.data || {}]));
        comida = resumenComida(ids.map(i => porId.get(i)).filter(Boolean), dias);
      }
      const usaApp = ids.length > 0 || ses.some(s => (s.origen || 'cliente') === 'cliente');
      if (!usaApp) { res.sinUso++; continue; }

      const seg = {
        fuerza_planeados: planeadas, fuerza_ejecutados: planeadas != null || hechas ? hechas : null,
        kcal_promedio: comida.kcal, proteina_promedio_g: comida.prote, dias_registro_alim: comida.dias,
      };
      const sc = calcScores(seg, c);
      const fila = {
        user_id: c.user_id, cliente_id: c.id, semana, fecha: hoy, ...seg,
        cardio_ejecutados: 0,
        dias_planeados: seg.fuerza_planeados, dias_asistidos: seg.fuerza_planeados != null ? (seg.fuerza_ejecutados ?? 0) : null,
        ...sc, estado: 'hecho',
        notas: 'Semana registrada sola con lo que marcó en su app. Corrígela si sabes algo que la app no.',
      };
      await insertar(crm, fila);
      res.creadas++;
    } catch (e) { res.errores++; }
  }
  return res;
}

// Inserta sin pisar (si la semana ya existe, no hace nada). Si la base no
// tiene alguna columna, se reintenta sin ella.
async function insertar(crm, fila, intento = 0) {
  try {
    await crm('seguimientos?on_conflict=user_id,cliente_id,semana', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(fila),
    });
  } catch (e) {
    const m = String(e && e.message || e).match(/'([a-z_]+)' column/);
    if (m && intento < 6 && m[1] in fila) { const f = { ...fila }; delete f[m[1]]; return insertar(crm, f, intento + 1); }
    throw e;
  }
}
