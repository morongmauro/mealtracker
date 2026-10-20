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

// La rutina más liviana EN LA VISTA NORMAL (a prueba): Ficha · Historial ·
// Nota como íconos junto a lo recetado, en una sola fila, y al terminar un
// ejercicio la pantalla baja sola al siguiente. Para todos: TODOS en true.
export const RUTINA_LIGERA_PRUEBA = ['mauro moron'];
export const RUTINA_LIGERA_TODOS = false;
export const rutinaLigera = (nombre) => RUTINA_LIGERA_TODOS || RUTINA_LIGERA_PRUEBA.includes(normal(nombre));

// Fondo blanco con el color del módulo (y un segundo color muy suave), sin
// la píldora negra de arriba y con la franja curva más corta (a prueba).
// Para todos: FONDO_BLANCO_TODOS en true.
export const FONDO_BLANCO_PRUEBA = ['mauro moron'];
export const FONDO_BLANCO_TODOS = false;
export function fondoBlanco() {
  if (FONDO_BLANCO_TODOS) return true;
  try { return FONDO_BLANCO_PRUEBA.includes(normal(JSON.parse(localStorage.getItem('mt:name') || '""'))); } catch (e) { return false; }
}
// El color de cada módulo (p) y el segundo, muy suave (q), en «r,g,b».
export const COLORES_MODULO = {
  dash:    { p: '60,123,214', q: '242,201,76' },   // azul + amarillo
  entreno: { p: '95,102,112', q: '242,201,76' },   // gris + amarillo
  comida:  { p: '70,150,90',  q: '242,201,76' },   // verde + amarillo
  aprende: { p: '238,132,52', q: '60,123,214' },   // naranja + azul
};
// Un color del módulo aclarado con blanco (para las manchas, que van en hex).
export const aclarar = (rgb, cuanto) => '#' + rgb.split(',').map(Number)
  .map(c => Math.round(c * cuanto + 255 * (1 - cuanto)).toString(16).padStart(2, '0')).join('');

// El blob de vidrio en las cabeceras (a prueba). Para todos: TODOS en true.
export const BLOB_VIDRIO_PRUEBA = ['mauro moron'];
export const BLOB_VIDRIO_TODOS = false;
export function blobVidrio() {
  if (BLOB_VIDRIO_TODOS) return true;
  try { return BLOB_VIDRIO_PRUEBA.includes(normal(JSON.parse(localStorage.getItem('mt:name') || '""'))); } catch (e) { return false; }
}

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
