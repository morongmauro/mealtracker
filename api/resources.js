// /api/resources.js
// Devuelve el link del centro de recursos ("Material de aprendizaje") del
// cliente. Los links viven en api/_clients.js (CLIENT_RESOURCES), en el
// servidor — así los nombres y links de tus clientes no viajan dentro del
// JS público.
//
// POST { name } → { url } (url = '' si el cliente no tiene recursos)

import { guard } from './_guard.js';
import { CLIENT_RESOURCES, DEFAULT_RESOURCES_URL } from './_clients.js';

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
  return res.status(200).json({ url });
}
