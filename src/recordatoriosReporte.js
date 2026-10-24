// ─────────────────────────────────────────────────────────────────────────
// LO QUE LE SALE COMO RECORDATORIO (para el coach)
// El Dash le muestra recordatorios (lo de hoy, la medida del mes, los del
// coach, la cápsula que sigue…). Aquí se le cuenta a /api/recordatorios qué
// le salió, si le apareció en pantalla o quedó escondido en «Ver todo», y
// cuándo toca uno. Así el coach ve en el CRM qué está viendo y si lo ignora.
// Se manda solo cuando la lista cambia (y una vez al día); nunca en «ver
// como cliente» (sería el coach, no el cliente).
// ─────────────────────────────────────────────────────────────────────────
import { enVerComo } from './verComo.js';

const CLAVE = 'mt:recEnviado';
let ultimo = '';

const nombre = () => { try { return JSON.parse(localStorage.getItem('mt:name') || '""') || ''; } catch (e) { return ''; } };
const usuario = () => { try { return localStorage.getItem('cloudUserId') || null; } catch (e) { return null; } };

function enviar(cuerpo) {
  try {
    fetch('/api/recordatorios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), keepalive: true }).catch(() => {});
  } catch (e) { /* nada */ }
}

// lista: [{ id, texto, hecho, visible, tipo: 'hoy' | 'coach' | 'app' }]
export function reportarRecordatorios(hoy, lista) {
  if (enVerComo() || !hoy || !Array.isArray(lista) || !lista.length) return;
  const firma = `${hoy}|${lista.map(i => `${i.id}:${i.hecho ? 1 : 0}${i.visible ? 1 : 0}`).join(',')}`;
  if (firma === ultimo) return;
  ultimo = firma;
  try { if (localStorage.getItem(CLAVE) === firma) return; localStorage.setItem(CLAVE, firma); } catch (e) { /* sin almacenamiento */ }
  enviar({ name: nombre(), user_id: usuario(), hoy, items: lista.map(i => ({ id: i.id, texto: String(i.texto || '').slice(0, 200), hecho: !!i.hecho, visible: !!i.visible, tipo: i.tipo })) });
}

export function reportarToque(hoy, id, tipo) {
  if (enVerComo() || !id) return;
  enviar({ name: nombre(), user_id: usuario(), hoy, toque: { id, tipo } });
}
