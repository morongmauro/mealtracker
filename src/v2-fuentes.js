// ─────────────────────────────────────────────────────────────────────────
// VISUAL NUEVA · la letra
//
// Aparte de v2.js a propósito: importa el archivo de la fuente, que solo
// entiende el empaquetador. v2.js lo usan también las pruebas en Node.
// ─────────────────────────────────────────────────────────────────────────
import figtreeUrl from '@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2?url';

// La letra: Figtree. Geométrica y amable, de la familia de las que usan las
// apps de bienestar más cuidadas: títulos en negrita, texto normal, sin
// letras condensadas. Una sola familia en dos papeles: texto (grosor libre) y
// títulos (siempre en negrita), declarados aparte para que un título nunca
// salga delgado aunque la pantalla pida 400.
const FUENTES = `
@font-face { font-family: 'ECM Sans'; font-style: normal; font-display: swap;
  font-weight: 300 900; src: url(${figtreeUrl}) format('woff2-variations'); }
@font-face { font-family: 'ECM Display'; font-style: normal; font-display: swap;
  font-weight: 800; src: url(${figtreeUrl}) format('woff2-variations'); }
html[data-v2] { --f-ui: 'ECM Sans'; --f-display: 'ECM Display';
  --ent-accent: #3C7BD6; --ent-accent-dark: #1E58A6; --ent-accent-light: #E4EDF9; --ent-accent-pastel: #D5E3F6;
  --ent-ok: #3C7BD6; --ent-boton: #1F1F1F;
  --rec-accent: #46965A; --rec-accent-dark: #2A6A3A; --rec-accent-pastel: rgba(70,150,90,0.15); --rec-accent-light: rgba(70,150,90,0.08); }
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

