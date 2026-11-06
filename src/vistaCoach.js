// ─────────────────────────────────────────────────────────────────────────
// VISTA COACH · el CRM dentro de la app, solo para el coach (Mauro Morón)
//
// Una sola app en el teléfono: Mauro entra como cliente (para usar y probar
// la app) y con el botón «Coach» del Dash abre el CRM a pantalla completa,
// dentro de la misma app. Arriba, «‹ Vista cliente» lo devuelve a donde
// estaba. El CRM queda cargado: volver a abrirlo es instantáneo.
//
// Los avisos de sus clientes le llegan a esta app; al tocarlos se abre esta
// vista directo en ese cliente (?coach=?seg=… / ?coach=?ver=bandeja).
// La primera vez se entra al CRM con el correo de siempre y queda guardado.
// ─────────────────────────────────────────────────────────────────────────
import { conPase } from './entrenoDatos.js';

const COACH = 'mauro moron';
const quitarTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const esCoach = (name) => quitarTildes(name) === COACH;
const nombreGuardado = () => { try { return JSON.parse(localStorage.getItem('mt:name') || '""') || ''; } catch (e) { return ''; } };

let urlCRM = null;
let capa = null, marco = null;

async function pedirURL(name) {
  if (urlCRM) return urlCRM;
  try { const g = localStorage.getItem('mt:crmUrl'); if (g && /^https:\/\//.test(g)) urlCRM = g; } catch (e) { /* nada */ }
  try {
    const r = await fetch('/api/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conPase({ accion: 'crm', name })) });
    const d = r.ok ? await r.json() : null;
    if (d && d.ok && d.url) { urlCRM = d.url; try { localStorage.setItem('mt:crmUrl', d.url); } catch (e) { /* nada */ } }
  } catch (e) { /* sin señal: se usa la guardada */ }
  return urlCRM;
}

function armar() {
  if (capa) return;
  capa = document.createElement('div');
  capa.dataset.vistaCoach = '';
  capa.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#F7F4ED;display:none;flex-direction:column';
  const barra = document.createElement('div');
  barra.style.cssText = 'flex:none;display:flex;align-items:center;justify-content:center;gap:10px;padding:calc(env(safe-area-inset-top, 0px) + 6px) 12px 6px;background:#1F1F1F;color:#fff;font-family:inherit';
  barra.innerHTML = '<span style="font-size:13px;font-weight:700;opacity:.8">Vista coach</span>'
    + '<button type="button" data-vista-cliente style="border:0;border-radius:999px;padding:7px 14px;background:#F2C94C;color:#1F1F1F;font:inherit;font-size:13.5px;font-weight:800;cursor:pointer">‹ Vista cliente</button>';
  barra.querySelector('[data-vista-cliente]').addEventListener('click', cerrarVistaCoach);
  marco = document.createElement('iframe');
  marco.title = 'CRM';
  marco.setAttribute('allow', 'clipboard-read; clipboard-write; camera; microphone; fullscreen');
  marco.style.cssText = 'flex:1;width:100%;border:0;background:#F7F4ED';
  capa.append(barra, marco);
  document.body.appendChild(capa);
}

export async function abrirVistaCoach(name = nombreGuardado(), ir = '') {
  if (!esCoach(name)) return false;
  const url = await pedirURL(name);
  if (!url) {
    alert('No encontré la dirección del CRM. Agrega CRM_APP_URL (la dirección del CRM) en las variables de Vercel del proyecto de la app.');
    return false;
  }
  armar();
  const destino = `${url}/${String(ir || '').replace(/^\/+/, '')}`;
  // Ya cargado y sin un destino nuevo: se muestra como quedó.
  if (!marco.src || (ir && marco.src !== destino)) marco.src = destino;
  capa.style.display = 'flex';
  document.documentElement.style.overflow = 'hidden';
  return true;
}

export function cerrarVistaCoach() {
  if (!capa) return;
  capa.style.display = 'none';
  document.documentElement.style.overflow = '';
}

// Al tocar un aviso de un cliente: la app abre (o ya estaba abierta) con
// ?coach=<a dónde>. Se abre la vista coach ahí.
if (typeof window !== 'undefined') {
  const abrirDesde = (ir) => { if (ir != null && esCoach(nombreGuardado())) abrirVistaCoach(nombreGuardado(), ir); };
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('coach')) {
      const ir = q.get('coach') || '';
      q.delete('coach');
      history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : '') + location.hash);
      const ir2 = ir;
      if (document.readyState === 'complete') abrirDesde(ir2); else window.addEventListener('load', () => abrirDesde(ir2), { once: true });
    }
  } catch (e) { /* nada */ }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.coach != null) abrirDesde(e.data.coach); });
  }
}
