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
    // IDENTIDAD POR NOMBRE — clave para "Agregar a inicio" (iOS le da a la
    // app instalada un almacén SEPARADO de Safari) y para teléfonos nuevos:
    // sin esto, la app generaba un user_id nuevo y el cliente veía todo
    // vacío ("se me borró todo"). Devuelve el user_id EXISTENTE del cliente
    // con ese nombre (normalizado como en authorize: sin tildes/mayúsculas),
    // ignorando cuentas marcadas como duplicadas y prefiriendo la más
    // recientemente actualizada. { user_id } o { user_id: null }.
    if (req.query.identity_for) {
      const normalizeName = (str) => String(str || '')
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ').trim();
      const buscado = normalizeName(req.query.identity_for);
      if (!buscado) return res.status(200).json({ user_id: null });
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?select=user_id,name,updated_at,coach_notes`,
          { headers }
        );
        const rows = await r.json();
        if (!Array.isArray(rows)) return res.status(200).json({ user_id: null });
        const match = rows
          .filter(x => normalizeName(x.name) === buscado)
          .filter(x => !(x.coach_notes && x.coach_notes.duplicate_of))
          .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0];
        return res.status(200).json({ user_id: match ? match.user_id : null });
      } catch (e) {
        // 500 y no {user_id:null}: el frontend distingue "no existe cuenta"
        // (crear una nueva está bien) de "no pude verificar" (NO crear una
        // nueva — se reintenta luego; evita partir la identidad en dos).
        return res.status(500).json({ error: 'lookup failed' });
      }
    }

    const userId = req.query.user_id;
    if (!isUuid(userId)) {
      return res.status(400).json({ error: 'invalid user_id' });
    }
    // Sondeo liviano de metas: devuelve solo goals + goals_updated para que la
    // app pueda chequear cada minuto sin bajar todo el historial.
    if (req.query.goals_only) {
      try {
        // Incluye también los recordatorios del coach: el mismo sondeo liviano
        // que detecta cambios de meta entrega recordatorios nuevos casi en vivo.
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=goals:data->goals,goals_updated:data->goals_updated,coach_reminders:data->coach_reminders,reminders_updated:data->reminders_updated,coach_day_edits:data->coach_day_edits,coach_edits_updated:data->coach_edits_updated`,
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
          `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${user_id}&select=goals:data->goals,goals_updated:data->goals_updated,favorites:data->favorites,favorites_deleted:data->favoritesDeleted,history_deleted:data->historyDeleted,history_day_ops:data->historyDayOps,coach_reminders:data->coach_reminders,reminders_updated:data->reminders_updated,coach_day_edits:data->coach_day_edits,coach_edits_updated:data->coach_edits_updated,pwa_installed_at:data->pwa_installed_at,push_enabled_at:data->push_enabled_at,recetario_menus:data->recetario_menus,novedades_vistas:data->novedades_vistas`,
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

        // Señales de dispositivo (app instalada / push activo): las marca UN
        // dispositivo; si otro sincroniza sin traerlas, se conserva la del
        // server — nunca se "des-instala" por un push de otro teléfono.
        if (existing) {
          if (existing.pwa_installed_at && !dataToWrite.pwa_installed_at) dataToWrite.pwa_installed_at = existing.pwa_installed_at;
          if (existing.push_enabled_at && !dataToWrite.push_enabled_at) dataToWrite.push_enabled_at = existing.push_enabled_at;
          // Menús del Recetario: los guarda UN dispositivo en su localStorage.
          // Si otro sincroniza sin ellos, se conservan los del server (mismo
          // criterio que las señales de arriba) — si no, el segundo teléfono
          // los borraba del CRM.
          if (Array.isArray(existing.recetario_menus) && existing.recetario_menus.length
              && !(Array.isArray(dataToWrite.recetario_menus) && dataToWrite.recetario_menus.length)) {
            dataToWrite.recetario_menus = existing.recetario_menus;
          }
          // Novedades ya vistas: UNIÓN entre lo que hay y lo que llega. Nunca
          // se quita nada — si se perdiera un "ya visto", al cliente le
          // volvería a salir una ventana que ya cerró.
          {
            const va = Array.isArray(existing.novedades_vistas) ? existing.novedades_vistas : [];
            const vb = Array.isArray(dataToWrite.novedades_vistas) ? dataToWrite.novedades_vistas : [];
            if (va.length || vb.length) {
              dataToWrite.novedades_vistas = Array.from(new Set([...va, ...vb])).slice(-50);
            }
          }
        }

        // Anti-pisado de RECORDATORIOS del coach: si el server tiene una
        // versión MÁS NUEVA (el coach los cambió y este dispositivo aún no la
        // aplicó), se conserva la del server. Mismo patrón que las metas.
        const remExistAt = existing?.reminders_updated?.at || '';
        const remInAt = dataToWrite.reminders_updated?.at || '';
        if (existing && remExistAt && remExistAt > remInAt) {
          dataToWrite.coach_reminders = existing.coach_reminders;
          dataToWrite.reminders_updated = existing.reminders_updated;
        }

        // Cola de EDICIONES DEL COACH (coach_day_edits, escrita por
        // coach-data action=day_edit): el cliente NO la incluye en su push,
        // así que sin esta fusión cada push del cliente la borraba. Unión
        // por id de op; el sello coach_edits_updated conserva el más nuevo.
        if (existing) {
          const opsServer = Array.isArray(existing.coach_day_edits) ? existing.coach_day_edits : [];
          const opsClient = Array.isArray(dataToWrite.coach_day_edits) ? dataToWrite.coach_day_edits : [];
          if (opsServer.length || opsClient.length) {
            const opsById = new Map();
            for (const o of opsClient) { if (o && o.id) opsById.set(o.id, o); }
            for (const o of opsServer) { if (o && o.id && !opsById.has(o.id)) opsById.set(o.id, o); }
            dataToWrite.coach_day_edits = Array.from(opsById.values())
              .sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))).slice(-100);
          }
          const ceExistAt = existing.coach_edits_updated?.at || '';
          const ceInAt = dataToWrite.coach_edits_updated?.at || '';
          if (ceExistAt && ceExistAt > ceInAt) dataToWrite.coach_edits_updated = existing.coach_edits_updated;

          // Re-aplicar ADDS del coach pendientes sobre el snapshot entrante:
          // un cliente que aún no aplicó la op (app cerrada o versión vieja)
          // empuja su historial SIN esa comida y borraría lo que el coach
          // agregó. Guardado por lápida: si el cliente la borró a propósito
          // después de aplicarla, la lápida fecha#id existe y NO se resucita.
          const opsFinal = Array.isArray(dataToWrite.coach_day_edits) ? dataToWrite.coach_day_edits : [];
          const tombsForCoach = new Set([
            ...(Array.isArray(existing.history_deleted) ? existing.history_deleted : []),
            ...(Array.isArray(dataToWrite.historyDeleted) ? dataToWrite.historyDeleted : []),
          ]);
          for (const o of opsFinal) {
            if (!o || o.op !== 'add' || !o.entry || o.entry.id == null || !o.date) continue;
            if (o.date === dataToWrite.today) continue; // el día vivo lo gobierna la app
            if (tombsForCoach.has(`${o.date}#${o.entry.id}`) || tombsForCoach.has(o.date)) continue;
            if (!dataToWrite.historyDetail || typeof dataToWrite.historyDetail !== 'object') continue;
            const arr = Array.isArray(dataToWrite.historyDetail[o.date]) ? dataToWrite.historyDetail[o.date] : [];
            if (arr.some(e => e && e.id === o.entry.id)) continue;
            const next = [...arr, o.entry];
            dataToWrite.historyDetail[o.date] = next;
            if (dataToWrite.history && typeof dataToWrite.history === 'object') {
              const t = next.reduce((a, e) => ({ kcal: a.kcal + (e.kcal || 0), p: a.p + (e.p || 0), c: a.c + (e.c || 0), g: a.g + (e.g || 0) }), { kcal: 0, p: 0, c: 0, g: 0 });
              const water = dataToWrite.history[o.date]?.water || 0;
              dataToWrite.history[o.date] = { kcal: Math.round(t.kcal), p: Math.round(t.p * 10) / 10, c: Math.round(t.c * 10) / 10, g: Math.round(t.g * 10) / 10, water };
            }
          }
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

          // Lápidas de HISTORIAL + bitácora por día (historyDayOps:
          // { 'YYYY-MM-DD': { op:'del'|'add', at:ISO } }). La bitácora manda:
          // entre "borrado" y "re-registrado" GANA LA ACCIÓN MÁS RECIENTE.
          // Sin esto, la unión de lápidas re-mataba un día que el cliente
          // había borrado y luego vuelto a registrar (bug días 20/24).
          const opsExist = (existing.history_day_ops && typeof existing.history_day_ops === 'object') ? existing.history_day_ops : {};
          const opsIn = (dataToWrite.historyDayOps && typeof dataToWrite.historyDayOps === 'object') ? dataToWrite.historyDayOps : {};
          const mergedOps = { ...opsExist };
          for (const [day, op] of Object.entries(opsIn)) {
            if (!op || !op.at) continue;
            if (!mergedOps[day] || String(op.at) > String(mergedOps[day].at || '')) mergedOps[day] = op;
          }
          // Poda: solo los últimos ~200 días con actividad de borrado
          const opDays = Object.keys(mergedOps).sort();
          if (opDays.length > 200) for (const day of opDays.slice(0, opDays.length - 200)) delete mergedOps[day];
          dataToWrite.historyDayOps = mergedOps;

          const histTombs = new Set([
            ...(Array.isArray(existing.history_deleted) ? existing.history_deleted : []),
            ...(Array.isArray(dataToWrite.historyDeleted) ? dataToWrite.historyDeleted : []),
          ]);
          // Un día cuya última acción fue 'add' está VIVO: su lápida de DÍA
          // COMPLETO se descarta de la unión. Las de comidas sueltas
          // (fecha#id) se conservan: en un día re-registrado apuntan a ids
          // que ya no existen (inofensivas) y protegen borrados puntuales
          // hechos después del re-registro.
          for (const t of Array.from(histTombs)) {
            if (String(t).includes('#')) continue;
            if (mergedOps[t] && mergedOps[t].op === 'add') histTombs.delete(t);
          }
          // Y un día con op 'del' explícita está muerto aunque su lápida
          // legada se haya perdido por el límite de 400.
          for (const [day, op] of Object.entries(mergedOps)) {
            if (op && op.op === 'del') histTombs.add(day);
          }
          dataToWrite.historyDeleted = Array.from(histTombs).slice(-400);
          if (histTombs.size > 0) {
            const deadDays = new Set(Array.from(histTombs).filter(t => !String(t).includes('#')));
            if (dataToWrite.history && typeof dataToWrite.history === 'object') {
              for (const day of deadDays) delete dataToWrite.history[day];
            }
            if (dataToWrite.historyDetail && typeof dataToWrite.historyDetail === 'object') {
              for (const day of Object.keys(dataToWrite.historyDetail)) {
                if (deadDays.has(day)) { delete dataToWrite.historyDetail[day]; continue; }
                const arr = dataToWrite.historyDetail[day];
                if (Array.isArray(arr)) {
                  const filtered = arr.filter(e => !histTombs.has(`${day}#${e && e.id}`));
                  if (filtered.length !== arr.length) dataToWrite.historyDetail[day] = filtered;
                }
              }
            }
          }
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
