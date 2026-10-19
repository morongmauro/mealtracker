// /api/_descanso.js
// La alarma del descanso cuando la app está minimizada.
//
// El iPhone congela la app en segundo plano: el pitido programado no suena
// hasta que se vuelve. Para eso, al minimizar con un descanso corriendo la
// app deja un aviso con la hora en que termina (avisos_descanso, en el
// Supabase de la app) y, cada 10 s, la base (pg_cron, ver
// sql/avisos-descanso.sql) llama a ?descanso=enviar si alguno ya toca. Ese
// llamado manda la notificación a los teléfonos del cliente.
//
// Vive dentro de push-cron.js (el plan de Vercel permite 12 funciones y ya
// están todas). Rutas, todas por /api/push-cron?descanso=…:
//   POST programar { id, name, fin (ms), titulo, cuerpo } → la app, al minimizar
//   POST cancelar  { id }                           → al volver o saltarlo
//   GET  enviar                                     → la base, cada 10 s
// Sin la tabla (el SQL sin correr) responde ok:false y la app sigue igual.

import webpush from 'web-push';
import { checkOrigin, rateLimit } from './_guard.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });
const sb = (path, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });

const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const MAX_MS = 15 * 60000;   // un descanso de más de 15 min no es un descanso

export default async function manejarDescanso(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(200).json({ ok: false, motivo: 'sin_config' });
  const que = String(req.query.descanso || '');

  if (que === 'enviar') {
    if (!rateLimit(req, 'descanso-enviar', { limit: 30 })) return res.status(429).json({ ok: false });
    return res.status(200).json(await enviarPendientes());
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!checkOrigin(req) || !rateLimit(req, 'descanso', { limit: 60 })) return res.status(403).json({ ok: false });
  const b = (req.body && typeof req.body === 'object') ? req.body : (() => { try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } })();
  const id = String(b.id || '').slice(0, 64);
  if (!/^[\w-]{6,64}$/.test(id)) return res.status(400).json({ ok: false, motivo: 'id' });

  if (que === 'cancelar') {
    const r = await sb(`avisos_descanso?id=eq.${encodeURIComponent(id)}&enviado_en=is.null`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ cancelado: true }),
    }).catch(() => null);
    return res.status(200).json({ ok: !!(r && r.ok) });
  }

  if (que === 'programar') {
    const fin = Number(b.fin);
    const name = String(b.name || '').trim().slice(0, 120);
    if (!name || !Number.isFinite(fin) || fin < Date.now() - 5000 || fin > Date.now() + MAX_MS) return res.status(400).json({ ok: false, motivo: 'datos' });
    const titulo = b.titulo === 'Tiempo cumplido' ? 'Tiempo cumplido' : 'Descanso listo';
    const fila = { id, name, cuando: new Date(fin).toISOString(), titulo, cuerpo: String(b.cuerpo || '').slice(0, 120) || null, cancelado: false };
    const r = await sb('avisos_descanso?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(fila),
    }).catch(() => null);
    return res.status(200).json({ ok: !!(r && r.ok), ...(r && !r.ok ? { motivo: 'sin_tabla' } : {}) });
  }

  return res.status(400).json({ ok: false });
}

// Los que ya tocan (hasta 3 s antes, hasta 3 min tarde): la notificación a
// cada teléfono suscrito del cliente y la marca de enviado.
export async function enviarPendientes() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return { ok: false, motivo: 'sin_vapid' };
  const ahora = Date.now();
  const r = await sb(`avisos_descanso?select=id,name,titulo,cuerpo,cuando&enviado_en=is.null&cancelado=is.false`
    + `&cuando=lte.${new Date(ahora + 3000).toISOString()}&cuando=gte.${new Date(ahora - 3 * 60000).toISOString()}&limit=50`).catch(() => null);
  if (!r || !r.ok) return { ok: false, motivo: 'sin_tabla' };
  const pendientes = await r.json();
  if (!Array.isArray(pendientes) || !pendientes.length) return { ok: true, enviados: 0 };
  webpush.setVapidDetails('mailto:morongmauro@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const rs = await sb('push_subs?select=name,sub').catch(() => null);
  const subs = rs && rs.ok ? await rs.json() : [];
  let enviados = 0;
  for (const a of pendientes) {
    // Primero se marca: si dos llamados se cruzan, el segundo ya no lo manda.
    const m = await sb(`avisos_descanso?id=eq.${encodeURIComponent(a.id)}&enviado_en=is.null`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ enviado_en: new Date().toISOString() }),
    }).catch(() => null);
    const marcadas = m && m.ok ? await m.json().catch(() => []) : [];
    if (!Array.isArray(marcadas) || !marcadas.length) continue;
    const suyas = (Array.isArray(subs) ? subs : []).filter(s => normal(s.name) === normal(a.name));
    for (const s of suyas) {
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({
          title: a.titulo || 'Descanso listo', body: a.cuerpo || 'A la siguiente serie.', tag: 'ecm-descanso', url: '/', descanso: true,
        }), { TTL: 120, urgency: 'high' });
        enviados++;
      } catch (e) { /* suscripción vieja: la limpia el cron de siempre */ }
    }
  }
  return { ok: true, enviados };
}
