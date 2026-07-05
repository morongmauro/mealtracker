// /api/authorize.js
// Valida el acceso de un cliente por nombre. La FUENTE DE VERDAD es el CRM
// (tabla `clientes` en el Supabase del CRM): registrar un cliente ahí con
// estado 'activo' le da acceso automático al Meal Tracker y al centro de
// recursos; pasarlo a 'pausa' o 'finalizado' se lo suspende (sin borrar
// nada); volverlo a 'activo' lo reactiva.
//
// Config (Vercel → proyecto mealtracker → Environment Variables):
//   CRM_SUPABASE_URL          → Project URL del Supabase del CRM
//   CRM_SUPABASE_SERVICE_KEY  → key service_role del Supabase del CRM
//
// Respaldo: si el CRM no está configurado o no responde, se usa la lista
// de api/_clients.js (comportamiento anterior). Un nombre que no exista en
// el CRM pero sí en la lista también pasa (transición suave mientras
// migras a todos al CRM).
//
// POST { name } → { authorized: true|false, status: 'activo'|'pausa'|'finalizado'|'not_found'|'list' }

import { guard, checkOrigin } from './_guard.js';
import { AUTHORIZED_CLIENTS as CLIENTS_FILE } from './_clients.js';

const CRM_URL = process.env.CRM_SUPABASE_URL;
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

const ENV_CLIENTS = (process.env.AUTHORIZED_CLIENTS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const AUTHORIZED_CLIENTS = ENV_CLIENTS.length > 0 ? ENV_CLIENTS : CLIENTS_FILE;

const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

// Caché en memoria de la lista del CRM (por instancia serverless). Evita
// pegarle al CRM en cada apertura de app; 3 minutos es suficiente para que
// un cambio de estado en el CRM se sienta "inmediato".
let crmCache = { at: 0, rows: null };
const CRM_CACHE_MS = 3 * 60 * 1000;

async function fetchCrmClients() {
  if (!CRM_URL || !CRM_KEY) return null;
  const now = Date.now();
  if (crmCache.rows && now - crmCache.at < CRM_CACHE_MS) return crmCache.rows;
  try {
    const r = await fetch(`${CRM_URL}/rest/v1/clientes?select=nombre,estado`, {
      headers: { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}` },
    });
    if (!r.ok) return crmCache.rows; // usa caché vieja si la hay
    const rows = await r.json();
    if (!Array.isArray(rows)) return crmCache.rows;
    crmCache = { at: now, rows };
    return rows;
  } catch (e) {
    return crmCache.rows;
  }
}

// CORS: el CENTRO DE RECURSOS (otro dominio) valida el acceso contra este
// mismo endpoint — una sola lista (el CRM) para todo el ecosistema. Para
// habilitarlo: agrega el dominio del centro a la variable ALLOWED_ORIGINS
// en Vercel (proyecto mealtracker), separado por coma si hay varios.
// checkOrigin ya valida contra el host propio + ALLOWED_ORIGINS, así que
// solo reflejamos el Origin cuando está permitido.
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !checkOrigin(req)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!guard(req, res, { key: 'authorize', limit: 20 })) return;

  const { name } = req.body || {};
  const normalized = normalizeName(name);
  if (!normalized) return res.status(200).json({ authorized: false, status: 'not_found' });

  const inFileList = AUTHORIZED_CLIENTS.some(c => normalizeName(c) === normalized);

  const crmRows = await fetchCrmClients();
  if (crmRows) {
    const match = crmRows.find(c => normalizeName(c.nombre) === normalized);
    if (match) {
      // El CRM manda: activo pasa; pausa/finalizado bloquea (aunque el
      // nombre siga en la lista vieja del archivo).
      const estado = String(match.estado || 'activo').toLowerCase();
      return res.status(200).json({ authorized: estado === 'activo', status: estado });
    }
    // No está en el CRM: la lista del archivo sirve de puente mientras migras.
    if (inFileList) return res.status(200).json({ authorized: true, status: 'list' });
    return res.status(200).json({ authorized: false, status: 'not_found' });
  }

  // CRM no configurado o inalcanzable → comportamiento anterior (lista).
  return res.status(200).json({ authorized: inFileList, status: inFileList ? 'list' : 'not_found' });
}
