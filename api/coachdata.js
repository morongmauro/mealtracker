// /api/coach-data.js
// Endpoints del dashboard de coach. Todos requieren Authorization: Bearer <token>
// donde el token viene de /api/coach-auth.
//
// GET  /api/coach-data?action=list                → lista resumida de TODOS los clientes
// GET  /api/coach-data?action=detail&user_id=...  → detalle completo de un cliente
// PATCH /api/coach-data?action=goals&user_id=...  → actualiza solo .goals dentro de .data
// PATCH /api/coach-data?action=mark_duplicate&user_id=...&duplicate_of=... → marca duplicado

import { verifyCoachToken } from './coach-auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function supaHeaders() {
  return {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// Compute a quick summary for the list view from a client's `data` blob
function summarize(row) {
  const data = row.data || {};
  const goals = data.goals || null;
  const history = data.history || {}; // { 'YYYY-MM-DD': { kcal, p, c, g, water } }
  // Today key in LOCAL server time is not the client's local — best we can do.
  const dates = Object.keys(history).sort().reverse();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayInHistory = history[todayStr] || null;

  // Adherence últimos 7 días: cuántos días registró algo
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().slice(0, 10));
  }
  const adherence7 = last7Days.filter(d => history[d]).length;

  // Última fecha activa real (la más nueva en history)
  const lastActive = dates[0] || null;

  // Status (verde / amarillo / rojo)
  let status = 'inactive';
  if (lastActive) {
    const lastActiveDate = new Date(lastActive + 'T00:00:00');
    const daysSince = Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) status = 'active';
    else if (daysSince <= 3) status = 'recent';
    else if (daysSince <= 7) status = 'at_risk';
    else status = 'inactive';
  }

  return {
    user_id: row.user_id,
    name: row.name || '(sin nombre)',
    updated_at: row.updated_at,
    last_active: lastActive,
    status,
    adherence_7d: adherence7,
    today: todayInHistory ? {
      kcal: todayInHistory.kcal || 0,
      p: todayInHistory.p || 0,
      c: todayInHistory.c || 0,
      g: todayInHistory.g || 0,
      water: todayInHistory.water || 0,
    } : null,
    goals,
    coach_notes: row.coach_notes || {},
  };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  // Auth check
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyCoachToken(token);
  if (!payload) return res.status(401).json({ error: 'unauthorized' });

  const action = req.query.action;

  // LIST — resumen de TODOS los clientes
  if (req.method === 'GET' && action === 'list') {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?select=user_id,name,data,updated_at,coach_notes&order=updated_at.desc`,
        { headers: supaHeaders() }
      );
      const rows = await r.json();
      if (!Array.isArray(rows)) {
        return res.status(500).json({ error: 'supabase response invalid', detail: rows });
      }
      const summarized = rows.map(summarize);
      return res.status(200).json({ clients: summarized });
    } catch (e) {
      return res.status(500).json({ error: 'list failed', detail: String(e) });
    }
  }

  // DETAIL — todos los datos de un cliente
  if (req.method === 'GET' && action === 'detail') {
    const userId = req.query.user_id;
    if (!isUuid(userId)) return res.status(400).json({ error: 'invalid user_id' });
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=user_id,name,data,updated_at,coach_notes`,
        { headers: supaHeaders() }
      );
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ error: 'client not found' });
      }
      return res.status(200).json({ client: rows[0] });
    } catch (e) {
      return res.status(500).json({ error: 'detail failed', detail: String(e) });
    }
  }

  // UPDATE GOALS — modifica solo .data.goals
  if (req.method === 'PATCH' && action === 'goals') {
    const userId = req.query.user_id;
    if (!isUuid(userId)) return res.status(400).json({ error: 'invalid user_id' });
    const { kcal, p, c, g } = req.body || {};
    const numericOk = [kcal, p, c, g].every(v => typeof v === 'number' && v >= 0 && v < 100000);
    if (!numericOk) return res.status(400).json({ error: 'invalid goals (must be numbers)' });

    try {
      // Read current data
      const r1 = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=data`,
        { headers: supaHeaders() }
      );
      const rows = await r1.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ error: 'client not found' });
      }
      const currentData = rows[0].data || {};
      const newData = { ...currentData, goals: { kcal, p, c, g } };

      // Write back
      const r2 = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { ...supaHeaders(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ data: newData, updated_at: new Date().toISOString() }),
        }
      );
      if (!r2.ok) {
        const detail = await r2.text();
        return res.status(500).json({ error: 'goals update failed', detail });
      }
      return res.status(200).json({ ok: true, goals: { kcal, p, c, g } });
    } catch (e) {
      return res.status(500).json({ error: 'goals failed', detail: String(e) });
    }
  }

  // MARK DUPLICATE — etiqueta a un cliente como duplicado de otro
  if (req.method === 'PATCH' && action === 'mark_duplicate') {
    const userId = req.query.user_id;
    const duplicateOf = req.query.duplicate_of || null;
    if (!isUuid(userId)) return res.status(400).json({ error: 'invalid user_id' });
    if (duplicateOf && !isUuid(duplicateOf)) return res.status(400).json({ error: 'invalid duplicate_of' });

    try {
      const r1 = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=coach_notes`,
        { headers: supaHeaders() }
      );
      const rows = await r1.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(404).json({ error: 'client not found' });
      }
      const current = rows[0].coach_notes || {};
      const newNotes = { ...current };
      if (duplicateOf) newNotes.duplicate_of = duplicateOf;
      else delete newNotes.duplicate_of;

      const r2 = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { ...supaHeaders(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ coach_notes: newNotes }),
        }
      );
      if (!r2.ok) {
        const detail = await r2.text();
        return res.status(500).json({ error: 'mark_duplicate failed', detail });
      }
      return res.status(200).json({ ok: true, coach_notes: newNotes });
    } catch (e) {
      return res.status(500).json({ error: 'mark_duplicate failed', detail: String(e) });
    }
  }

  return res.status(400).json({ error: 'unknown action' });
}
