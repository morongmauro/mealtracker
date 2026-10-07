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
// Nombres: se compara normalizado (sin tildes ni mayúsculas) contra
// `clientes.nombre` Y contra `clientes.nombres_alternos` — los nombres que
// el cliente tuvo antes de que el coach se lo corrigiera en el CRM. Sin
// esto, arreglar una errata en el nombre dejaba al cliente fuera de su app.
//
// POST { name } → { authorized: true|false, status: 'activo'|'pausa'|'finalizado'|'not_found'|'list' }
//
// CUENTA CON CONTRASEÑA (visual nueva, por ahora solo Mauro). La llave sigue
// siendo el NOMBRE; la contraseña va encima, atada al correo que el cliente
// ya tiene en el CRM. No se crea un usuario nuevo ni se toca su información.
// Se guarda solo el hash (scrypt + sal) en clientes.app_clave_hash
// (migración: CRM_entrenaconmetodo/migraciones/app-contrasena.sql).
//   POST { accion: 'cuenta', name }               → { ok, nombre, email, tieneClave }
//   POST { accion: 'crear',  name, clave, email? } → { ok, sesion, nombre }
//   POST { accion: 'entrar', name|email, clave }   → { ok, sesion, nombre }
//   POST { name, sesion }                          → … + { sesion: 'ok'|'invalida' }
// La sesión es un sello HMAC (nombre + fecha + hash de la clave) firmado con
// la llave del servidor: no caduca sola, y cambiar la contraseña la anula.

import { guard, checkOrigin } from './_guard.js';
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
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
    const r = await fetch(`${CRM_URL}/rest/v1/clientes?select=nombre,estado,nombres_alternos`, {
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

// ── Cuenta con contraseña ──────────────────────────────────────────────
const enCrm = (ruta, opts = {}) => fetch(`${CRM_URL}/rest/v1/${ruta}`, {
  ...opts,
  headers: { apikey: CRM_KEY, Authorization: `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
});

// La fila del cliente (sin caché: la clave puede haber cambiado hace un
// segundo), por nombre (actual o anterior) o por correo.
async function filaCliente({ name, email }) {
  const r = await enCrm('clientes?select=id,nombre,email,estado,nombres_alternos,app_clave_hash');
  if (!r.ok) return { error: r.status === 400 ? 'sin_migracion' : 'crm' };
  const filas = await r.json();
  const n = normalizeName(name), e = String(email || '').trim().toLowerCase();
  const fila = filas.find(c => (n && (normalizeName(c.nombre) === n
      || (Array.isArray(c.nombres_alternos) && c.nombres_alternos.some(a => normalizeName(a) === n))))
    || (e && String(c.email || '').trim().toLowerCase() === e));
  return { fila: fila || null };
}

export function hashClave(clave, sal = randomBytes(16).toString('hex')) {
  return `scrypt$${sal}$${scryptSync(String(clave), sal, 32).toString('hex')}`;
}
export function claveCorrecta(clave, guardado) {
  const [tipo, sal, hash] = String(guardado || '').split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const a = Buffer.from(hashClave(clave, sal).split('$')[2], 'hex'), b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
const firma = (nombre, ts, hash) => createHmac('sha256', String(CRM_KEY || 'sin-llave'))
  .update(`${normalizeName(nombre)}|${ts}|${hash || ''}`).digest('base64url');
export const crearSesion = (nombre, hash) => {
  const ts = Date.now().toString(36);
  return `v1.${Buffer.from(normalizeName(nombre)).toString('base64url')}.${ts}.${firma(nombre, ts, hash)}`;
};
export function sesionValida(sesion, nombre, hash) {
  const [v, n, ts, sello] = String(sesion || '').split('.');
  if (v !== 'v1' || !n || !ts || !sello || !hash) return false;
  if (Buffer.from(n, 'base64url').toString() !== normalizeName(nombre)) return false;
  const a = Buffer.from(firma(nombre, ts, hash)), b = Buffer.from(sello);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function cuenta(req, res, body) {
  if (!CRM_URL || !CRM_KEY) return res.status(200).json({ ok: false, error: 'crm' });
  const { accion, name, email, clave } = body;
  const { fila, error } = await filaCliente({ name, email: accion === 'entrar' ? email : null });
  if (error) return res.status(200).json({ ok: false, error });
  if (!fila) return res.status(200).json({ ok: false, error: 'no_existe' });
  if (String(fila.estado || 'activo').toLowerCase() !== 'activo') return res.status(200).json({ ok: false, error: 'inactivo', estado: fila.estado });

  if (accion === 'cuenta') {
    return res.status(200).json({ ok: true, nombre: fila.nombre, email: fila.email || null, tieneClave: !!fila.app_clave_hash });
  }
  const c = String(clave || '');
  if (accion === 'crear') {
    if (fila.app_clave_hash) return res.status(200).json({ ok: false, error: 'ya_tiene' });
    if (c.length < 6) return res.status(200).json({ ok: false, error: 'corta' });
    const hash = hashClave(c);
    const cambios = { app_clave_hash: hash, app_clave_at: new Date().toISOString() };
    // Si en el CRM no había correo, se guarda el que puso el cliente.
    const correo = String(email || '').trim().toLowerCase();
    if (!fila.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) cambios.email = correo;
    const r = await enCrm(`clientes?id=eq.${encodeURIComponent(fila.id)}`, { method: 'PATCH', body: JSON.stringify(cambios) });
    if (!r.ok) return res.status(200).json({ ok: false, error: 'crm' });
    return res.status(200).json({ ok: true, nombre: fila.nombre, sesion: crearSesion(fila.nombre, hash) });
  }
  if (accion === 'entrar') {
    if (!fila.app_clave_hash) return res.status(200).json({ ok: false, error: 'sin_clave', nombre: fila.nombre });
    if (!claveCorrecta(c, fila.app_clave_hash)) return res.status(200).json({ ok: false, error: 'clave' });
    return res.status(200).json({ ok: true, nombre: fila.nombre, sesion: crearSesion(fila.nombre, fila.app_clave_hash) });
  }
  return res.status(400).json({ ok: false, error: 'accion' });
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

  const body = req.body || {};
  if (body.accion) return cuenta(req, res, body);
  const { name, sesion } = body;
  const normalized = normalizeName(name);
  if (!normalized) return res.status(200).json({ authorized: false, status: 'not_found' });

  const inFileList = AUTHORIZED_CLIENTS.some(c => normalizeName(c) === normalized);

  const crmRows = await fetchCrmClients();
  if (crmRows) {
    // Se acepta el nombre ACTUAL o cualquiera de los anteriores. Si el coach
    // corrige un apellido mal escrito en el CRM, el cliente sigue entrando
    // con el nombre que siempre ha tecleado: renombrar es cambiar una
    // etiqueta, no echar a alguien de su propia app.
    const match = crmRows.find(c => normalizeName(c.nombre) === normalized
      || (Array.isArray(c.nombres_alternos)
          && c.nombres_alternos.some(a => normalizeName(a) === normalized)));
    if (match) {
      // El CRM manda: activo pasa; pausa/finalizado bloquea (aunque el
      // nombre siga en la lista vieja del archivo).
      const estado = String(match.estado || 'activo').toLowerCase();
      // Con cuenta: ¿la sesión del teléfono sigue valiendo? (si cambió la
      // contraseña, ya no). Solo se mira si el teléfono manda una.
      let estadoSesion;
      if (sesion) {
        const { fila } = await filaCliente({ name }).catch(() => ({}));
        if (fila) estadoSesion = sesionValida(sesion, fila.nombre, fila.app_clave_hash) || sesionValida(sesion, name, fila.app_clave_hash) ? 'ok' : 'invalida';
      }
      return res.status(200).json({ authorized: estado === 'activo', status: estado, ...(estadoSesion ? { sesion: estadoSesion } : {}) });
    }
    // No está en el CRM: la lista del archivo sirve de puente mientras migras.
    if (inFileList) return res.status(200).json({ authorized: true, status: 'list' });
    return res.status(200).json({ authorized: false, status: 'not_found' });
  }

  // CRM no configurado o inalcanzable → comportamiento anterior (lista).
  return res.status(200).json({ authorized: inFileList, status: inFileList ? 'list' : 'not_found' });
}
