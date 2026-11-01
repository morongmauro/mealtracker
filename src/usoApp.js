// ─────────────────────────────────────────────────────────────────────────
// QUÉ ABRE EN LA APP (para el coach, sección Enganche del CRM)
// Una vez por día y por cosa se le cuenta a /api/uso la sección que abrió
// (dash, entreno, comida, recetas, aprende, comunidad, chat) y las recetas
// que abrió. Nada más: ni cuánto tiempo, ni qué escribió. Nunca en «ver como
// cliente» (sería el coach, no el cliente).
// ─────────────────────────────────────────────────────────────────────────
import { enVerComo } from './verComo.js';
import { hoyLocal } from './entrenoDatos.js';

const nombre = () => { try { return JSON.parse(localStorage.getItem('mt:name') || '""') || ''; } catch (e) { return ''; } };
const usuario = () => { try { return localStorage.getItem('cloudUserId') || null; } catch (e) { return null; } };

// Lo ya contado hoy (en memoria y en el teléfono, para no repetirlo al reabrir).
let dia = '', ya = null;
const pendiente = { secciones: new Set(), recetas: new Set() };
let reloj = null;

function contado() {
  const hoy = hoyLocal();
  if (dia !== hoy || !ya) {
    dia = hoy;
    try { ya = JSON.parse(localStorage.getItem('mt:uso') || 'null'); } catch (e) { ya = null; }
    if (!ya || ya.dia !== hoy) ya = { dia: hoy, s: [], r: [] };
  }
  return ya;
}

function enviar() {
  reloj = null;
  const c = contado();
  const secciones = [...pendiente.secciones], recetas = [...pendiente.recetas];
  pendiente.secciones.clear(); pendiente.recetas.clear();
  if (!secciones.length && !recetas.length) return;
  const name = nombre();
  if (!name) return;
  try {
    fetch('/api/uso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ name, user_id: usuario(), hoy: c.dia, secciones, recetas }) }).catch(() => {});
  } catch (e) { /* nada */ }
}

function anotar(tipo, valor) {
  if (!valor || enVerComo()) return;
  const c = contado();
  const lista = tipo === 's' ? c.s : c.r;
  if (lista.includes(valor)) return;
  lista.push(valor);
  try { localStorage.setItem('mt:uso', JSON.stringify(c)); } catch (e) { /* sin almacenamiento */ }
  (tipo === 's' ? pendiente.secciones : pendiente.recetas).add(valor);
  if (!reloj) reloj = setTimeout(enviar, 1500);
}

export const usoSeccion = (seccion) => anotar('s', seccion);
export const usoReceta = (nombreReceta) => anotar('r', String(nombreReceta || '').slice(0, 120));
