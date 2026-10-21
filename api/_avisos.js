// /api/_avisos.js
// Interruptores de avisos por tipo (Configuración → Notificaciones en la app).
//
// El cliente elige qué recibir: recordatorio del día, comentarios de su
// coach, ciclo nuevo, fin del descanso. La elección vive en su teléfono
// (localStorage mt:avisos, un JSON {dia,coach,ciclo,descanso}) y viaja con
// las demás preferencias del dispositivo (user_data.data.prefs_dispositivo).
// Aquí se lee ANTES de enviar: lo que apagó no le llega. Sin preferencia
// guardada, todo llega (como siempre).
//
// Tipos:
//   dia      · «hoy te toca» de la mañana y el cierre del día (push-cron)
//   coach    · comentario puntual, respuesta a una nota, mensaje manual
//   ciclo    · al enviarle un ciclo o rutina nueva desde el CRM
//   descanso · la alarma de fin de descanso con la app minimizada

export const TIPOS_AVISO = ['dia', 'coach', 'ciclo', 'descanso'];

export function avisosDe(prefs) {
  try {
    const crudo = prefs && typeof prefs === 'object' ? prefs['mt:avisos'] : null;
    const o = typeof crudo === 'string' ? JSON.parse(crudo) : crudo;
    return o && typeof o === 'object' ? o : {};
  } catch (e) { return {}; }
}

export const permiteAviso = (avisos, tipo) => !TIPOS_AVISO.includes(tipo) || !avisos || avisos[tipo] !== false;

// user_id → avisos, para una lista de usuarios (los de las suscripciones).
export async function avisosPorUsuario(SUPABASE_URL, KEY, userIds) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  const mapa = new Map();
  if (!ids.length || !SUPABASE_URL || !KEY) return mapa;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_data?select=user_id,prefs:data->prefs_dispositivo&user_id=in.(${ids.map(encodeURIComponent).join(',')})`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const filas = r.ok ? await r.json() : [];
    for (const f of (Array.isArray(filas) ? filas : [])) mapa.set(f.user_id, avisosDe(f.prefs));
  } catch (e) { /* sin preferencias: llega todo */ }
  return mapa;
}
