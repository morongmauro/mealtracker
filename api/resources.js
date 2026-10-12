// /api/resources.js
// Devuelve el link del centro de recursos ("Material de aprendizaje") del
// cliente. Los links viven en api/_clients.js (CLIENT_RESOURCES), en el
// servidor — así los nombres y links de tus clientes no viajan dentro del
// JS público.
//
// POST { name } → { url, training }
//   url      = '' si el cliente no tiene centro de recursos
//   training = true si el cliente tiene un ciclo ENVIADO en el CRM (o está
//              en TRAINING_BETA de _clients.js). Se decide AQUÍ, en el
//              servidor.

import { guard } from './_guard.js';
import { tienePlanVisible } from './_entreno.js';
import {
  CLIENT_RESOURCES, DEFAULT_RESOURCES_URL,
  TRAINING_BETA, TRAINING_PARA_TODOS,
} from './_clients.js';

const CRM_URL = process.env.CRM_SUPABASE_URL;
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;
const sbCrm = async (path) => {
  const r = await fetch(`${CRM_URL}/rest/v1/${path}`, { headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}` } });
  if (!r.ok) throw new Error(`crm ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!guard(req, res, { key: 'resources', limit: 30 })) return;

  const { name } = req.body || {};
  const normalized = normalizeName(name);
  let url = '';
  for (const [client, link] of Object.entries(CLIENT_RESOURCES)) {
    if (normalizeName(client) === normalized && typeof link === 'string' && link.startsWith('http')) {
      url = link;
      break;
    }
  }
  if (!url && typeof DEFAULT_RESOURCES_URL === 'string' && DEFAULT_RESOURCES_URL.startsWith('http')) {
    url = DEFAULT_RESOURCES_URL;
  }

  // Módulo de entrenamiento: lo ve quien tiene un ciclo ENVIADO en el CRM
  // (rutinas listas), además de la lista de prueba. Sin ciclo enviado no se
  // muestra: sería un módulo vacío.
  let training = TRAINING_PARA_TODOS === true
    || (Array.isArray(TRAINING_BETA) && TRAINING_BETA.some(c => normalizeName(c) === normalized));
  if (!training && CRM_URL && CRM_KEY && normalized) training = await tienePlanVisible(sbCrm, name);

  return res.status(200).json({ url, training });
}
