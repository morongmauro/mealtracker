// /api/authorize.js
// Valida si un nombre está en la lista de clientes autorizados.
// La lista vive SOLO aquí (servidor): antes viajaba dentro del bundle de JS
// público y cualquiera podía leer los nombres reales de todos los clientes
// con "ver código fuente".
//
// POST { name } → { authorized: true|false }

import { guard } from './_guard.js';
// La lista vive en su propio archivo para editarla sin tocar lógica:
// api/_clients.js (ahí están las instrucciones). También puede definirse
// la variable de entorno AUTHORIZED_CLIENTS en Vercel (nombres separados
// por coma) y, si existe, manda sobre el archivo.
import { AUTHORIZED_CLIENTS as CLIENTS_FILE } from './_clients.js';

const AUTHORIZED_CLIENTS = (process.env.AUTHORIZED_CLIENTS || '')
  .split(',').map(s => s.trim()).filter(Boolean).length > 0
  ? process.env.AUTHORIZED_CLIENTS.split(',').map(s => s.trim()).filter(Boolean)
  : CLIENTS_FILE;

const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!guard(req, res, { key: 'authorize', limit: 20 })) return;

  const { name } = req.body || {};
  const normalized = normalizeName(name);
  const authorized = AUTHORIZED_CLIENTS.some(c => normalizeName(c) === normalized);
  return res.status(200).json({ authorized });
}
