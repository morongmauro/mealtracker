// ─────────────────────────────────────────────────────────────────────────
// RESPUESTAS DEL COACH A UNA NOTA DE SESIÓN («Al terminar … te dijo»)
//
// Tabla del CRM: CRM_entrenaconmetodo/migraciones/respuestas-notas.sql
// (respuestas_coach). El coach responde desde la Bandeja del CRM con «A su
// app»: le llega un aviso al teléfono y en su inicio sale la tarjeta «Te
// respondió» con su nota y la respuesta, hasta que toca «Entendido».
// Sin la tabla (SQL sin correr) no sale nada y nada se rompe.
// ─────────────────────────────────────────────────────────────────────────

const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Las que todavía no vio (de los últimos 21 días), la más nueva primero.
export async function verRespuestas(sb, cliente, hoy) {
  const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 21);
  const desde = d.toISOString().slice(0, 10);
  try {
    // Las que el coach retiró desde el CRM («Mensajes enviados») no salen.
    // Si la columna retirado_en todavía no existe, se pide como antes.
    const base = `respuestas_coach?select=id,contexto,nota,texto,created_at&cliente_id=eq.${cliente.id}&visto_en=is.null&created_at=gte.${desde}&order=created_at.desc&limit=3`;
    const r = await sb(`${base}&retirado_en=is.null`).catch(() => sb(base));
    return { ok: true, respuestas: Array.isArray(r) ? r : [] };
  } catch (e) { return { ok: true, respuestas: [] }; }
}

// «Entendido»: queda vista (solo las suyas).
export async function respuestaVista(sb, cliente, cuerpo) {
  const id = String((cuerpo || {}).id || '');
  if (!isUuid(id)) return { ok: false };
  try {
    await sb(`respuestas_coach?id=eq.${id}&cliente_id=eq.${cliente.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ visto_en: new Date().toISOString() }) });
    return { ok: true };
  } catch (e) { return { ok: false }; }
}
