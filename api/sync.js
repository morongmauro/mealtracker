// /api/sync.js
// Sincroniza los datos del cliente (favoritos, ingredientes, historial, etc.)
// con la tabla user_data en Supabase. Usa la service_role key del servidor
// para escribir sin exponer credenciales al navegador.
//
// GET  /api/sync?user_id=xxx  → devuelve la fila { name, data, updated_at } o null
// POST /api/sync              → upsert con { user_id, name, data }

import { guard } from './_guard.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  // GET permite requests sin Origin/Referer (navegadores con privacidad
  // endurecida); el POST — que puede SOBRESCRIBIR datos — no.
  const isGet = req.method === 'GET';
  if (!guard(req, res, { key: 'sync', limit: isGet ? 60 : 30, allowNoOrigin: isGet })) return;

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  if (req.method === 'GET') {
    const userId = req.query.user_id;
    if (!isUuid(userId)) {
      return res.status(400).json({ error: 'invalid user_id' });
    }
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=name,data,updated_at`,
        { headers }
      );
      const rows = await r.json();
      if (!Array.isArray(rows)) {
        return res.status(500).json({ error: 'supabase response invalid', detail: rows });
      }
      return res.status(200).json(rows[0] || null);
    } catch (e) {
      return res.status(500).json({ error: 'fetch failed', detail: String(e) });
    }
  }

  if (req.method === 'POST') {
    const { user_id, name, data } = req.body || {};
    if (!isUuid(user_id)) {
      return res.status(400).json({ error: 'invalid user_id' });
    }
    if (typeof data !== 'object' || data === null) {
      return res.status(400).json({ error: 'data must be an object' });
    }
    try {
      const body = JSON.stringify([{
        user_id,
        name: typeof name === 'string' ? name : null,
        data,
        updated_at: new Date().toISOString(),
      }]);
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id`,
        {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body,
        }
      );
      if (!r.ok) {
        const detail = await r.text();
        return res.status(500).json({ error: 'supabase write failed', detail });
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'fetch failed', detail: String(e) });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}
