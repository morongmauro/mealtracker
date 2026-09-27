// ─────────────────────────────────────────────────────────────────────────
// VISUAL NUEVA (v2) · en prueba
//
// La barra de secciones, la letra y el Dash nuevos los ve SOLO quien esté en
// esta lista. El resto sigue con la app de siempre, byte a byte. Para
// abrírsela a todos: VISUAL_V2_TODOS = true.
// ─────────────────────────────────────────────────────────────────────────

export const VISUAL_V2 = ['mauro moron'];
export const VISUAL_V2_TODOS = false;

// El WhatsApp del coach para el botón «Escríbele a tu coach» del Dash, solo
// números con indicativo (Colombia: 57…). Vacío = el botón no aparece.
export const WHATSAPP_COACH = '';

const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

export const esV2 = (nombre) => VISUAL_V2_TODOS || VISUAL_V2.includes(normal(nombre));

// Para los componentes que no reciben el nombre (la figura muscular): ¿está
// encendida la visual nueva en este documento?
export const v2Activa = () => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-v2');

// Nombre del ejercicio en inglés (el de Trainerize, en `alias`), para ponerlo
// chico y en gris debajo del español: hay traducciones que suenan raras y el
// original ayuda a reconocerlo. Solo con la visual nueva, y solo si dice algo
// distinto al español.
export const nombreIngles = (ej) => (v2Activa() && ej && ej.alias && normal(ej.alias) !== normal(ej.nombre)) ? ej.alias : null;
