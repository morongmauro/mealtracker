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
// Respira: cada vez que la termina (no una vez por día), al momento.
// `origen`: desde dónde la abrió (fin de entreno, descanso, ajustes).
export function usoRespira({ segundos, minutos, origen }) {
  if (enVerComo() || !(segundos >= 15)) return;
  const name = nombre();
  if (!name) return;
  const d = new Date();
  const h = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  try {
    fetch('/api/uso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ name, user_id: usuario(), hoy: hoyLocal(), respira: [{ h, s: Math.round(segundos), m: minutos, o: origen || null }] }) }).catch(() => {});
  } catch (e) { /* nada */ }
}
export const usoReceta = (nombreReceta) => anotar('r', String(nombreReceta || '').slice(0, 120));
// La ventana de la última semana del ciclo le salió (o ya la había visto):
// que el coach lo sepa en Toques. Una vez por día y por ciclo.
export function usoAvisoCiclo(clave) {
  if (!clave || enVerComo()) return;
  const name = nombre();
  if (!name) return;
  const hoy = hoyLocal(), marca = `${hoy}|${clave}`;
  try { if (localStorage.getItem('mt:usoAvisoCiclo') === marca) return; localStorage.setItem('mt:usoAvisoCiclo', marca); } catch (e) { /* sin almacenamiento */ }
  try {
    fetch('/api/uso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ name, user_id: usuario(), hoy, aviso_ciclo: String(clave) }) }).catch(() => {});
  } catch (e) { /* nada */ }
}

// Ficha del ejercicio: cada vez que la abre (para el coach: quién mira la
// técnica y con qué frecuencia). La misma ficha dentro de un minuto cuenta
// una sola vez.
let ultimaFicha = { id: null, t: 0 };
export function usoFicha(ejercicio) {
  if (!ejercicio || enVerComo()) return;
  const id = String(ejercicio.id || '');
  if (ultimaFicha.id === id && Date.now() - ultimaFicha.t < 60000) return;
  ultimaFicha = { id, t: Date.now() };
  const name = nombre();
  if (!name) return;
  const d = new Date();
  const h = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const n = String(ejercicio.nombre || '').slice(0, 80);
  try {
    fetch('/api/uso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ name, user_id: usuario(), hoy: hoyLocal(), fichas: [{ h, e: id.slice(0, 40), n }] }) }).catch(() => {});
  } catch (e) { /* nada */ }
}
