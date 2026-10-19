// ─────────────────────────────────────────────────────────────────────────
// VISTA DE LA APP · completa (la de siempre) o compacta
//
// La compacta deja abajo solo Entrenamiento, Alimentación y «Más»: para
// quien siente la app llena de cosas. La elige el cliente en Configuración
// o la pone el coach desde el CRM. Viaja a la nube en
// user_data.data.vista_app = { modo, desde, por } y, entre el teléfono y el
// CRM, gana la más reciente (`desde`).
//
// Por ahora solo para probarla: la ven y la pueden activar los nombres de
// VISTA_COMPACTA_PRUEBA. Para el resto la app sigue completa aunque el CRM
// diga otra cosa.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

export const VISTA_COMPACTA_PRUEBA = ['mauro moron'];

const CLAVE = 'mt:vistaApp';
const EVENTO = 'mt:vista';
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

export const puedeCompacta = (nombre) => VISTA_COMPACTA_PRUEBA.includes(normal(nombre));

const valida = (v) => !!v && typeof v === 'object' && (v.modo === 'compacta' || v.modo === 'completa') && typeof v.desde === 'string';

export function leerVista() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) || 'null'); return valida(v) ? v : null; } catch (e) { return null; }
}

function escribir(v) {
  try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: vale mientras esté abierta */ }
  try { window.dispatchEvent(new CustomEvent(EVENTO, { detail: v })); } catch (e) { /* nada */ }
}

// El cliente la cambia desde la app.
export function guardarVista(modo) {
  const v = { modo, desde: new Date().toISOString(), por: 'cliente' };
  escribir(v);
  return v;
}

// Lo que llega de la nube (puede ser lo que puso el coach): solo si es más
// nuevo que lo de este teléfono.
export function adoptarVistaNube(v) {
  if (!valida(v)) return;
  const aqui = leerVista();
  if (!aqui || String(v.desde) > String(aqui.desde)) escribir(v);
}

// ¿Esta persona ve la app compacta?
export function useVistaCompacta(nombre) {
  const [v, setV] = useState(leerVista);
  useEffect(() => {
    const alCambiar = () => setV(leerVista());
    window.addEventListener(EVENTO, alCambiar);
    window.addEventListener('storage', alCambiar);
    return () => { window.removeEventListener(EVENTO, alCambiar); window.removeEventListener('storage', alCambiar); };
  }, []);
  return puedeCompacta(nombre) && !!v && v.modo === 'compacta';
}
