// ─────────────────────────────────────────────────────────────────────────
// VIDEOS DE YOUTUBE ROTOS · revisión automática, cada video una vez por semana
//
// Corre con el cron de cada hora (push-cron.js): en cada pasada revisa una
// tanda chica de los videos de YouTube de la galería que no se han revisado
// en 7 días, así cada video se revisa una vez por semana sin cargar ninguna
// pasada. Pregunta a YouTube (oEmbed) si el video existe y si deja verlo
// dentro de otra página, como lo ve la app del cliente:
//   200 → se ve                  401/403 → el dueño no deja insertarlo
//   404 → ya no existe o es privado      400 → el enlace no es válido
// Lo anota en `ejercicio_video_estado` del CRM (la misma tabla del botón
// «Revisar YouTube»), y el CRM avisa en Seguimiento.
//
// Lo que NO ve un servidor: los bloqueos por país (el servidor no está en
// Colombia). Esos los sigue encontrando el botón del CRM, que revisa desde el
// navegador del coach; por eso un «problema» que anotó el botón (códigos del
// reproductor: 100, 101, 150…) no lo borra esta revisión aunque aquí se vea.
// Los códigos de aquí son los de la respuesta de YouTube (400, 401, 403, 404).
// ─────────────────────────────────────────────────────────────────────────

export const TANDA = 25;
const SEMANA_MS = 7 * 86400000;
export const CODIGOS_SERVIDOR = [400, 401, 403, 404];

// Un video: 'ok', 'problema' (con el código) o null si YouTube no contestó
// claro (red, límite de consultas): se reintenta en la próxima pasada.
export async function revisarUno(ref, pedir = fetch) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ref}`)}`;
  try {
    const r = await pedir(url, { signal: AbortSignal.timeout(5000) });
    if (r.status === 200) return { estado: 'ok', codigo: null };
    if (CODIGOS_SERVIDOR.includes(r.status)) return { estado: 'problema', codigo: r.status };
    return null;
  } catch (e) {
    return null;
  }
}

const delBoton = (f) => !!f && f.estado === 'problema' && !CODIGOS_SERVIDOR.includes(Number(f.codigo));

// Qué toca revisar: los que nunca se revisaron primero, luego los más viejos.
export function porRevisar(refs, estados, ahora = Date.now(), tanda = TANDA) {
  const de = new Map(estados.map(f => [f.video_ref, f]));
  return refs
    // Los problemas que anotó el botón del CRM son suyos: no se repasan aquí.
    .filter(r => { const f = de.get(r.ref); return !f || (!delBoton(f) && !(Date.parse(f.revisado_en) > ahora - SEMANA_MS)); })
    .sort((a, b) => String(de.get(a.ref)?.revisado_en || '').localeCompare(String(de.get(b.ref)?.revisado_en || '')))
    .slice(0, tanda);
}

// Lo que se anota. Un problema que encontró el botón del CRM (bloqueo por país
// u otro que solo se ve desde el navegador) no se pisa con un «se ve».
export function filaNueva(previa, ref, resultado, ahora = new Date().toISOString()) {
  if (resultado.estado === 'ok' && delBoton(previa)) return null;
  return {
    user_id: ref.user_id, video_ref: ref.ref, ejercicio_id: ref.ejercicio_id,
    estado: resultado.estado, codigo: resultado.codigo, revisado_en: ahora,
  };
}

// crm(path, opts) → JSON (o lanza). Nunca borra nada: solo crea o actualiza
// filas de ejercicio_video_estado.
export async function revisarVideos({ crm, pedir = fetch, ahora = Date.now(), tanda = TANDA }) {
  let estados;
  try { estados = (await crm('ejercicio_video_estado?select=video_ref,estado,codigo,revisado_en,user_id')) || []; }
  catch (e) { return { sinTabla: true }; }
  // Los videos de YouTube de la galería (sin los archivados). Si ejercicios
  // no trae user_id, se usa el del coach (el dueño de los clientes).
  let ejs;
  try { ejs = (await crm('ejercicios?select=id,user_id,video_ref,archivado&video_fuente=eq.youtube&video_ref=not.is.null')) || []; }
  catch (e) {
    ejs = (await crm('ejercicios?select=id,video_ref,archivado&video_fuente=eq.youtube&video_ref=not.is.null')) || [];
    const coach = ((await crm('clientes?select=user_id&limit=1')) || [])[0];
    ejs = ejs.map(x => ({ ...x, user_id: coach && coach.user_id }));
  }
  const vistos = new Set();
  const refs = [];
  for (const x of ejs) {
    if (x.archivado || !x.video_ref || !x.user_id || vistos.has(x.video_ref)) continue;
    vistos.add(x.video_ref);
    refs.push({ ref: x.video_ref, ejercicio_id: String(x.id), user_id: x.user_id });
  }
  const tocan = porRevisar(refs, estados, ahora, tanda);
  const previa = new Map(estados.map(f => [f.video_ref, f]));
  const filas = [];
  let sinRespuesta = 0;
  for (let i = 0; i < tocan.length; i += 8) {
    const res = await Promise.all(tocan.slice(i, i + 8).map(r => revisarUno(r.ref, pedir)));
    res.forEach((x, k) => {
      if (!x) { sinRespuesta++; return; }
      const f = filaNueva(previa.get(tocan[i + k].ref), tocan[i + k], x, new Date(ahora).toISOString());
      if (f) filas.push(f);
    });
  }
  if (filas.length) {
    await crm('ejercicio_video_estado?on_conflict=user_id,video_ref', {
      method: 'POST', body: JSON.stringify(filas),
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
  }
  return { videos: refs.length, revisados: filas.length, problemas: filas.filter(f => f.estado === 'problema').length, sinRespuesta };
}
