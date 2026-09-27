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

// Los dos nombres del ejercicio. Con la visual nueva manda el INGLÉS (el
// original de Trainerize, guardado en `alias`), grande y en negro, y el
// español va chico y en gris debajo: hay traducciones que suenan raras y la
// gente ya reconoce el ejercicio por su nombre original. Sin alias, o si dice
// lo mismo, solo el que haya.
export const nombresEj = (ej) => {
  const es = (ej && ej.nombre) || 'Ejercicio';
  const en = ej && ej.alias && String(ej.alias).trim();
  if (!v2Activa() || !en || normal(en) === normal(es)) return { grande: es, chico: null };
  return { grande: en, chico: es };
};
