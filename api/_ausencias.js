// ─────────────────────────────────────────────────────────────────────────
// AUSENCIAS (viaje, enfermedad…) Y BIENESTAR CADA 15 DÍAS
//
// Tablas del CRM: CRM_entrenaconmetodo/migraciones/ausencias-bienestar.sql.
//
// Ausencias: las marca el cliente («Voy a estar fuera») o el coach en el
// CRM, hacia adelante o hacia atrás. Esos días no cuentan en su semana: la
// rutina de ese día no se pide (salvo que igual entrene). Quitarla no
// borra la fila: queda `anulada_en`. Lo que marca el cliente le llega al
// coach en el CRM (Bandeja y «Hoy»): `vista_en` vacío hasta que lo ve.
//
// Bienestar: cada 15 días, sueño, energía y estrés de 1 a 5 (5 es lo
// mejor en los tres: estrés 5 = tranquilo). Sale desde su segunda semana.
// ─────────────────────────────────────────────────────────────────────────

export const MOTIVOS = ['viaje', 'enfermedad', 'lesion', 'trabajo', 'otro'];
export const BIENESTAR_CADA = 14;      // días entre un check-in y el siguiente
const MAX_DIAS = 120;                  // una ausencia, como mucho
const ATRAS = 60;                      // se puede marcar algo que pasó hasta hace 60 días

const fechaOk = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) && !Number.isNaN(Date.parse(f));
const masDias = (f, n) => { const d = new Date(`${f}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const entre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// Los días (YYYY-MM-DD) que cubren las ausencias, dentro de [desde, hasta].
export function diasAusente(lista, desde = null, hasta = null) {
  const out = new Set();
  (Array.isArray(lista) ? lista : []).forEach(a => {
    if (!a || a.anulada_en || !fechaOk(a.desde) || !fechaOk(a.hasta)) return;
    let f = desde && a.desde < desde ? desde : a.desde;
    const fin = hasta && a.hasta > hasta ? hasta : a.hasta;
    for (let i = 0; f <= fin && i <= MAX_DIAS + 400; i++, f = masDias(f, 1)) out.add(f);
  });
  return out;
}
// La ausencia que cubre una fecha (para su motivo en el calendario).
export function ausenciaDe(lista, fecha) {
  return (Array.isArray(lista) ? lista : []).find(a => a && !a.anulada_en && a.desde <= fecha && a.hasta >= fecha) || null;
}

// Las de un cliente que tocan [desde, hasta]. Sin la tabla (SQL sin correr), ninguna.
export async function leerAusencias(sb, clienteId, desde, hasta) {
  try {
    const r = await sb(`ausencias?select=id,desde,hasta,motivo,nota,origen,anulada_en&cliente_id=eq.${clienteId}`
      + `&anulada_en=is.null&hasta=gte.${desde}&desde=lte.${hasta}&order=desde.asc`);
    return Array.isArray(r) ? r : [];
  } catch (e) { return []; }
}
const publica = (a) => ({ id: a.id, desde: a.desde, hasta: a.hasta, motivo: a.motivo, nota: a.nota || '', origen: a.origen });

// Las que vienen o están en curso (y las de los últimos 60 días): lo que
// ve en su calendario y puede editar.
export async function verAusencias(sb, cliente, hoy) {
  const lista = await leerAusencias(sb, cliente.id, masDias(hoy, -ATRAS), masDias(hoy, 400));
  return { ok: true, ausencias: lista.map(publica) };
}

export function validarAusencia(cuerpo, hoy) {
  const desde = String(cuerpo.desde || ''), hasta = String(cuerpo.hasta || '');
  if (!fechaOk(desde) || !fechaOk(hasta)) return { error: 'fechas' };
  if (hasta < desde) return { error: 'orden' };
  if (entre(desde, hasta) + 1 > MAX_DIAS) return { error: 'muy_larga' };
  if (hasta < masDias(hoy, -ATRAS)) return { error: 'muy_atras' };
  if (desde > masDias(hoy, 365)) return { error: 'muy_adelante' };
  const motivo = MOTIVOS.includes(String(cuerpo.motivo)) ? String(cuerpo.motivo) : 'otro';
  const nota = String(cuerpo.nota || '').trim().slice(0, 400) || null;
  return { desde, hasta, motivo, nota };
}

export async function guardarAusencia(sb, cliente, cuerpo, hoy) {
  const v = validarAusencia(cuerpo, hoy);
  if (v.error) return { ok: false, motivo: v.error };
  const ahora = new Date().toISOString();
  try {
    if (cuerpo.id) {
      // Solo las suyas. Al editarla vuelve a llegarle al coach como nueva.
      const r = await sb(`ausencias?id=eq.${encodeURIComponent(cuerpo.id)}&cliente_id=eq.${cliente.id}&anulada_en=is.null`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ desde: v.desde, hasta: v.hasta, motivo: v.motivo, nota: v.nota, vista_en: null, updated_at: ahora }),
      });
      if (!Array.isArray(r) || !r.length) return { ok: false, motivo: 'no_es_suya' };
      return { ok: true, ausencia: publica(r[0]) };
    }
    const r = await sb('ausencias', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: cliente.user_id, cliente_id: cliente.id, ...v, origen: 'cliente' }),
    });
    return { ok: true, ausencia: publica(Array.isArray(r) ? r[0] : r) };
  } catch (e) { return { ok: false, motivo: 'sin_tabla' }; }
}

export async function quitarAusencia(sb, cliente, cuerpo) {
  if (!cuerpo.id) return { ok: false, motivo: 'sin_id' };
  try {
    const r = await sb(`ausencias?id=eq.${encodeURIComponent(cuerpo.id)}&cliente_id=eq.${cliente.id}&anulada_en=is.null`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ anulada_en: new Date().toISOString(), updated_at: new Date().toISOString() }),
    });
    return { ok: Array.isArray(r) && r.length > 0 };
  } catch (e) { return { ok: false, motivo: 'sin_tabla' }; }
}

// ── Bienestar ────────────────────────────────────────────────────────────
// ¿Le toca? Activo, desde su segunda semana (inicio hace 7 días o más) y
// 14 días o más desde el último. `inicio`: su fecha de inicio en el CRM.
export function tocaBienestar({ activo, inicio, ultima, hoy }) {
  if (!activo) return false;
  if (!fechaOk(inicio) || entre(inicio, hoy) < 7) return false;
  return !ultima || entre(ultima, hoy) >= BIENESTAR_CADA;
}
export async function verBienestar(sb, cliente, hoy, inicio) {
  let ultima = null;
  try {
    const r = await sb(`bienestar?select=fecha&cliente_id=eq.${cliente.id}&order=fecha.desc&limit=1`);
    ultima = Array.isArray(r) && r[0] ? r[0].fecha : null;
  } catch (e) { return { ok: false, toca: false, motivo: 'sin_tabla' }; }
  const activo = String(cliente.estado || 'activo').toLowerCase() === 'activo';
  return { ok: true, toca: tocaBienestar({ activo, inicio, ultima, hoy }), ultima };
}
export async function responderBienestar(sb, cliente, cuerpo, hoy) {
  const n = (v) => { const x = Number(v); return Number.isInteger(x) && x >= 1 && x <= 5 ? x : null; };
  const fila = { user_id: cliente.user_id, cliente_id: cliente.id, fecha: hoy, sueno: n(cuerpo.sueno), energia: n(cuerpo.energia), estres: n(cuerpo.estres) };
  if ([fila.sueno, fila.energia, fila.estres].some(v => v === null)) return { ok: false, motivo: 'incompleta' };
  try {
    await sb('bienestar?on_conflict=cliente_id,fecha', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(fila) });
    return { ok: true };
  } catch (e) { return { ok: false, motivo: 'sin_tabla' }; }
}
