// ─────────────────────────────────────────────────────────────────────────
// BITÁCORA DE ERRORES
// Cuando algo falla en el teléfono del cliente (un error de JavaScript, una
// promesa rota, una llamada a /api que contestó 5xx o no contestó con red),
// se manda a /api/bitacora con la pantalla donde estaba. El coach lo ve en
// la ficha del cliente en el CRM, sin pedir pantallazos.
// Máximo 6 reportes por apertura: un bucle de errores no inunda nada. En
// «ver como cliente» no se reporta (sería el coach, no el cliente).
// ─────────────────────────────────────────────────────────────────────────
import { enVerComo } from './verComo.js';

const TOPE = 6;
let enviados = 0;
let instalada = false;

const nombre = () => { try { return JSON.parse(localStorage.getItem('mt:name') || '""') || ''; } catch (e) { return ''; } };
const usuario = () => { try { return localStorage.getItem('cloudUserId') || null; } catch (e) { return null; } };
// Dónde estaba: la sección y la pestaña marcadas en la barra de abajo.
const pantalla = () => {
  try {
    const partes = [...document.querySelectorAll('nav[aria-label="Secciones"] [aria-current="page"]')].map(b => b.textContent.trim()).filter(Boolean);
    return partes.join(' › ') || (document.querySelector('[data-view]:not([hidden])')?.getAttribute('data-view') || location.pathname);
  } catch (e) { return '?'; }
};
const version = () => {
  try { const s = document.querySelector('script[type="module"][src*="/assets/"]'); return s ? s.getAttribute('src').split('/').pop() : ''; } catch (e) { return ''; }
};

export function reportar(tipo, mensaje, detalle = '') {
  if (enviados >= TOPE || !mensaje) return;
  enviados++;
  const cuerpo = {
    name: nombre(), user_id: usuario(), tipo,
    mensaje: String(mensaje).slice(0, 400), detalle: String(detalle || '').slice(0, 1500),
    pantalla: pantalla(), url: String(location.href).slice(0, 200), ua: navigator.userAgent.slice(0, 200), version: version(),
  };
  try {
    fetch('/api/bitacora', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), keepalive: true }).catch(() => {});
  } catch (e) { /* nada */ }
}

export function instalarBitacora() {
  if (instalada || typeof window === 'undefined' || enVerComo()) return;
  instalada = true;
  window.addEventListener('error', (e) => reportar('error', e.message || 'error', e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    reportar('promesa', (r && r.message) || String(r || 'promesa rota'), r && r.stack);
  });
  // Llamadas a la API que contestan 5xx, o que no contestan con red.
  const fetch0 = window.fetch.bind(window);
  window.fetch = async (url, init) => {
    const u = typeof url === 'string' ? url : (url && url.url) || String(url);
    const mia = /\/api\//.test(u) && !u.includes('/api/bitacora');
    try {
      const r = await fetch0(url, init);
      if (mia && r.status >= 500) reportar('api', `${r.status} en ${u.split('?')[0]}`);
      return r;
    } catch (e) {
      if (mia && navigator.onLine) reportar('red', `${u.split('?')[0]}: ${e && e.message ? e.message : 'sin respuesta'}`);
      throw e;
    }
  };
}
