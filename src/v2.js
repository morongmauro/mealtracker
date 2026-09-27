// ─────────────────────────────────────────────────────────────────────────
// VISUAL NUEVA (v2) · en prueba
//
// La barra de secciones, la letra y el Dash nuevos los ve SOLO quien esté en
// esta lista. El resto sigue con la app de siempre, byte a byte. Para
// abrírsela a todos: VISUAL_V2_TODOS = true.
// ─────────────────────────────────────────────────────────────────────────
import archivoUrl from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';

export const VISUAL_V2 = ['mauro moron'];
export const VISUAL_V2_TODOS = false;

const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

export const esV2 = (nombre) => VISUAL_V2_TODOS || VISUAL_V2.includes(normal(nombre));

// La letra: Archivo, una sola familia en dos cortes. Texto en ancho normal;
// títulos y números grandes en su versión condensada y gruesa (el papel que
// hacía Bebas). Se declaran como familias propias para que el grosor y el
// ancho de los títulos no dependan de lo que pida cada pantalla.
const FUENTES = `
@font-face { font-family: 'ECM Sans'; font-style: normal; font-display: swap;
  font-weight: 100 900; font-stretch: 100%;
  src: url(${archivoUrl}) format('woff2-variations'); }
@font-face { font-family: 'ECM Display'; font-style: normal; font-display: swap;
  font-weight: 760; font-stretch: 74%;
  src: url(${archivoUrl}) format('woff2-variations'); }
html[data-v2] { --f-ui: 'ECM Sans'; --f-display: 'ECM Display'; }
`;

// Enciende o apaga la visual nueva en el documento. Solo toca variables y un
// atributo: los componentes de siempre leen la letra de theme.js, que ya
// mira estas variables con Inter y Bebas de respaldo.
export function aplicarV2(on) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (on) {
    if (!document.getElementById('ecm-v2-fuentes')) {
      const st = document.createElement('style');
      st.id = 'ecm-v2-fuentes';
      st.textContent = FUENTES;
      document.head.appendChild(st);
    }
    html.setAttribute('data-v2', '');
  } else {
    html.removeAttribute('data-v2');
  }
}

// Para los componentes que no reciben el nombre (la figura muscular): ¿está
// encendida la visual nueva en este documento?
export const v2Activa = () => typeof document !== 'undefined' && document.documentElement.hasAttribute('data-v2');
