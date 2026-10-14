// /api/ver-como?token=…  → { ok, name, user_id, exp }
// La app, al abrirse con ?ver_como=<pase>, pregunta aquí de quién es el pase.
// Solo lee; no cambia nada. Si venció o no es válido, { ok: false }.
import { guard } from './_guard.js';
import { leerPase } from './_verComo.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method not allowed' });
  if (!guard(req, res, { key: 'ver-como', limit: 60, allowNoOrigin: true })) return;
  const p = leerPase(String(req.query.token || ''));
  if (!p) return res.status(200).json({ ok: false, error: 'pase_vencido' });
  return res.status(200).json({ ok: true, name: p.name, user_id: p.user_id, exp: p.exp });
}
