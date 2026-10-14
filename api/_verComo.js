// El PASE de «Ver como cliente»: el coach, desde el CRM, abre la app tal
// como la ve un cliente, en solo lectura. El pase es un token firmado con la
// contraseña del coach (la misma llave que firma su sesión), dura 15 minutos
// y nombra a UN cliente. Nunca viaja una contraseña ni una llave de Supabase
// al navegador: la app solo recibe el pase y lo valida en /api/ver-como.
import crypto from 'node:crypto';

const COACH_PASSWORD = process.env.COACH_PASSWORD;
// La dirección nueva de la app (la misma de src/mudanza.js): ahí abre el pase.
export const DOMINIO_NUEVO = 'entrenaconmetodoapp.vercel.app';
const PASE_TTL_MS = 15 * 60 * 1000;

const b64 = (s) => Buffer.from(s).toString('base64url');
const firma = (cuerpo) => crypto.createHmac('sha256', String(COACH_PASSWORD)).update(cuerpo).digest('base64url');

export function firmarPase({ user_id, name }) {
  if (!COACH_PASSWORD) return null;
  const cuerpo = b64(JSON.stringify({ t: 'ver_como', u: user_id, n: name, exp: Date.now() + PASE_TTL_MS }));
  return `${cuerpo}.${firma(cuerpo)}`;
}

// Devuelve { user_id, name, exp } o null si no es válido o ya venció.
export function leerPase(token) {
  if (!COACH_PASSWORD || typeof token !== 'string') return null;
  const [cuerpo, sig] = token.split('.');
  if (!cuerpo || !sig) return null;
  const esperada = firma(cuerpo);
  const a = Buffer.from(sig), b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(cuerpo, 'base64url').toString()); } catch (e) { return null; }
  if (!p || p.t !== 'ver_como' || !p.u || !p.n || !(p.exp > Date.now())) return null;
  return { user_id: p.u, name: p.n, exp: p.exp };
}
