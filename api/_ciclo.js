// ─────────────────────────────────────────────────────────────────────────
// MI CICLO · el registro del ciclo menstrual (opcional y privado)
//
// Tabla del CRM: CRM_entrenaconmetodo/migraciones/ciclo-menstrual.sql
// (ciclo_registros + clientes.ciclo_activo).
//
// Lo activa ella en Configuración («Mi ciclo»). Cada día que quiera registra
// tres cosas: si tiene el período, su energía (baja / normal / alta) y sus
// molestias. No cambia la rutina sola: lo ven ella (en su calendario) y su
// coach. Por ahora a prueba (src/vistaApp.js › cicloPrueba).
// ─────────────────────────────────────────────────────────────────────────

export const ENERGIAS = ['baja', 'normal', 'alta'];
export const MOLESTIAS = ['colicos', 'lumbar', 'hinchazon', 'cabeza', 'durmio_mal'];
const ATRAS = 120;                       // se puede registrar hasta 120 días atrás

const fechaOk = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) && !Number.isNaN(Date.parse(f));
const masDias = (f, n) => { const d = new Date(`${f}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Sin la tabla o la columna (SQL sin correr) PostgREST contesta 404 o 400.
const motivoDe = (e) => { const m = String(e && e.message || ''); console.error('[ciclo]', m); return /supabase (404|400)/.test(m) ? 'sin_tabla' : 'error'; };
const publico = (r) => ({ fecha: r.fecha, periodo: !!r.periodo, energia: r.energia || null, molestias: Array.isArray(r.molestias) ? r.molestias : [] });

// Si lo tiene activado y sus registros entre [desde, hasta].
export async function verCiclo(sb, cliente, { desde, hasta } = {}, hoy) {
  const fin = fechaOk(hasta) ? hasta : hoy;
  const ini = fechaOk(desde) ? desde : masDias(fin, -62);
  try {
    const c = await sb(`clientes?select=ciclo_activo&id=eq.${cliente.id}`);
    const activo = !!(Array.isArray(c) && c[0] && c[0].ciclo_activo);
    const r = await sb(`ciclo_registros?select=fecha,periodo,energia,molestias&cliente_id=eq.${cliente.id}&fecha=gte.${ini}&fecha=lte.${fin}&order=fecha.asc`);
    return { ok: true, activo, registros: (Array.isArray(r) ? r : []).map(publico) };
  } catch (e) { return { ok: false, activo: false, registros: [], motivo: motivoDe(e) }; }
}

export async function activarCiclo(sb, cliente, cuerpo) {
  try {
    await sb(`clientes?id=eq.${cliente.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ciclo_activo: !!cuerpo.activo }) });
    return { ok: true, activo: !!cuerpo.activo };
  } catch (e) { return { ok: false, motivo: motivoDe(e) }; }
}

export function validarCiclo(cuerpo, hoy) {
  const fecha = fechaOk(cuerpo.fecha) ? cuerpo.fecha : hoy;
  if (fecha > hoy) return { error: 'futuro' };
  if (fecha < masDias(hoy, -ATRAS)) return { error: 'muy_atras' };
  const energia = ENERGIAS.includes(String(cuerpo.energia)) ? String(cuerpo.energia) : null;
  const molestias = (Array.isArray(cuerpo.molestias) ? cuerpo.molestias : []).map(String).filter(m => MOLESTIAS.includes(m));
  return { fecha, periodo: !!cuerpo.periodo, energia, molestias: [...new Set(molestias)] };
}

// Guarda (o corrige) el registro de ese día: uno por día.
export async function guardarCiclo(sb, cliente, cuerpo, hoy) {
  const v = validarCiclo(cuerpo, hoy);
  if (v.error) return { ok: false, motivo: v.error };
  const fila = { user_id: cliente.user_id, cliente_id: cliente.id, ...v, updated_at: new Date().toISOString() };
  try {
    await sb('ciclo_registros?on_conflict=cliente_id,fecha', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(fila) });
    return { ok: true, registro: publico(v) };
  } catch (e) { return { ok: false, motivo: motivoDe(e) }; }
}
