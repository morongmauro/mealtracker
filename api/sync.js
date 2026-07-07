// /api/sync.js
// Sincroniza los datos del cliente (favoritos, ingredientes, historial, etc.)
// con la tabla user_data en Supabase. Usa la service_role key del servidor
// para escribir sin exponer credenciales al navegador.
//
// GET  /api/sync?user_id=xxx              → la fila { name, data, updated_at } o null
// GET  /api/sync?user_id=xxx&goals_only=1 → solo { goals, goals_updated } (payload
//                                           mínimo; la app lo sondea para detectar
//                                           cambios de meta hechos por el coach)
// POST /api/sync                          → upsert con { user_id, name, data }

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
    // Sondeo liviano de metas: devuelve solo goals + goals_updated para que la
    // app pueda chequear cada minuto sin bajar todo el historial.
    if (req.query.goals_only) {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=goals:data->goals,goals_updated:data->goals_updated`,
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
      // Anti-pisado de metas: si en el server hay una meta MÁS NUEVA que la
      // que trae este push (p.ej. el coach la cambió y este dispositivo aún
      // no la aplicó), conservamos la del server. Sin esto, el push debounced
      // del cliente revertía la meta del coach a los segundos de guardada.
      const dataToWrite = { ...data };
      try {
        const r0 = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${user_id}&select=goals:data->goals,goals_updated:data->goals_updated,favorites:data->favorites,favorites_deleted:data->favoritesDeleted`,
          { headers }
        );
        const rows0 = await r0.json();
        const existing = Array.isArray(rows0) ? rows0[0] : null;
        const existingAt = existing?.goals_updated?.at || '';
        const incomingAt = dataToWrite.goals_updated?.at || '';
        if (existing && existingAt && existingAt > incomingAt) {
          dataToWrite.goals = existing.goals;
          dataToWrite.goals_updated = existing.goals_updated;
        }

        // Anti-pisado de FAVORITOS: el push trae el snapshot completo del
        // dispositivo, y un dispositivo con una copia vieja (caché borrada,
        // versión antigua de la app, segundo teléfono) podía SOBRESCRIBIR la
        // lista del server y perder menús guardados — era la causa de "guardé
        // mis favoritos y se me borraron algunos". Ahora el server FUSIONA:
        // unión por id de lo existente + lo entrante (lo entrante gana en
        // conflicto, p.ej. renombres), y solo desaparece lo que tenga lápida
        // en favoritesDeleted (borrado explícito del cliente). No hay límite
        // de cantidad ni borrado por antigüedad: un favorito solo se va si el
        // cliente lo borra.
        if (existing) {
          const existingFavs = Array.isArray(existing.favorites) ? existing.favorites : [];
          const incomingFavs = Array.isArray(dataToWrite.favorites) ? dataToWrite.favorites : [];
          const tombstones = new Set([
            ...(Array.isArray(existing.favorites_deleted) ? existing.favorites_deleted : []),
            ...(Array.isArray(dataToWrite.favoritesDeleted) ? dataToWrite.favoritesDeleted : []),
          ]);
          const byId = new Map();
          for (const f of existingFavs) { if (f && f.id != null) byId.set(f.id, f); }
          for (const f of incomingFavs) { if (f && f.id != null) byId.set(f.id, f); }
          dataToWrite.favorites = Array.from(byId.values()).filter(f => !tombstones.has(f.id));
          dataToWrite.favoritesDeleted = Array.from(tombstones).slice(-300);
        }
      } catch (e) { /* si falla el chequeo, seguimos con el push normal */ }

      const body = JSON.stringify([{
        user_id,
        name: typeof name === 'string' ? name : null,
        data: dataToWrite,
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
