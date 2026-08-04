// ─────────────────────────────────────────────────────────────────────────
// THEME — única fuente de verdad de color, sombra y tipografía.
// Antes cada archivo (MealTracker, Recetario, CoachDashboard) declaraba su
// propia copia de la paleta y los valores fueron derivando: tres cremas de
// fondo distintos, dos verdes ACCENT_DARK, dos SUCCESS… Importar desde aquí
// garantiza que las tres superficies se vean como UNA sola app.
//
// Regla de CTAs: GRAFITO (#1F1F1F) = acción primaria (registrar, enviar,
// continuar). OLIVA (ACCENT) = confirmación/éxito y elementos de marca.
// ─────────────────────────────────────────────────────────────────────────

// Marca
export const ACCENT = '#8A9558';         // oliva firma — CTAs de marca, labels
export const ACCENT_DARK = '#4A5238';    // oliva profundo para texto sobre claro
export const ACCENT_PASTEL = '#D4DAB8';
export const ACCENT_LIGHT = '#F1F3E5';

// Macros — desaturados, con pasteles para fondos
export const C_PROTEIN = '#D77A61';      // terracota
export const C_PROTEIN_PASTEL = '#F2CBBE';
export const C_CARBS = '#D4B581';        // mostaza miel
export const C_CARBS_PASTEL = '#EDDCBC';
export const C_FAT = '#6B7A8F';          // azul humo
export const C_FAT_PASTEL = '#CDD2DB';
export const C_WATER = '#5BA3C7';

// Neutros
export const BG = '#F1F0EA';             // gris cálido claro — EL fondo, único en toda
                                         // la app. Con gris suficiente para que las
                                         // tarjetas blancas contrasten, un grano más
                                         // claro que la v2 (#EDECE6).

// Manchas orgánicas del fondo (Hoy, Chat y Recetario) — CINCO tonalidades:
// verde azulado, rosado anaranjado, amarillo suave, gris y blanco luminoso,
// dos manchas de cada una repartidas por toda la pantalla incluido el centro. Es una capa
// fixed: al hacer scroll siempre están presentes. Definida aquí para que
// las tres vistas usen byte a byte el mismo fondo.
export const BG_STAINS = `radial-gradient(48% 34% at 90% 0%, rgba(126,188,168,0.50), transparent 70%),
  radial-gradient(42% 30% at -4% 14%, rgba(238,168,138,0.42), transparent 70%),
  radial-gradient(40% 30% at 34% 10%, rgba(246,218,156,0.30), transparent 70%),
  radial-gradient(50% 36% at 55% 36%, rgba(255,255,255,0.85), transparent 70%),
  radial-gradient(44% 32% at 0% 66%, rgba(146,151,144,0.42), transparent 72%),
  radial-gradient(48% 36% at 103% 54%, rgba(126,188,168,0.36), transparent 70%),
  radial-gradient(42% 30% at 100% 84%, rgba(246,218,156,0.26), transparent 72%),
  radial-gradient(44% 32% at 26% 100%, rgba(238,168,138,0.36), transparent 72%),
  radial-gradient(42% 32% at 74% 96%, rgba(255,255,255,0.75), transparent 72%),
  radial-gradient(38% 28% at 100% 26%, rgba(146,151,144,0.30), transparent 72%)`;

// Capas EXTRA de "pensando" (solo chat): mientras el modelo responde se
// encienden encima del fondo y derivan en direcciones opuestas — los tonos
// cálidos y fríos se cruzan e iluminan (efecto Gemini). Al terminar se
// apagan con un fade y queda solo BG_STAINS estático.
export const BG_STAINS_WARM = `radial-gradient(52% 40% at 80% 10%, rgba(244,196,110,0.65), transparent 70%),
  radial-gradient(48% 38% at 12% 40%, rgba(240,158,120,0.60), transparent 70%),
  radial-gradient(46% 36% at 60% 90%, rgba(244,196,110,0.52), transparent 72%)`;
export const BG_STAINS_COOL = `radial-gradient(50% 40% at 16% 12%, rgba(126,188,168,0.62), transparent 70%),
  radial-gradient(46% 36% at 88% 55%, rgba(152,190,232,0.45), transparent 70%),
  radial-gradient(52% 40% at 45% 100%, rgba(255,255,255,0.95), transparent 72%)`;
export const SURFACE = '#FFFFFF';
export const SURFACE_2 = '#EFEBE0';
export const BORDER = '#E2DECC';
export const BORDER_SOFT = '#EEEBE0';
export const TEXT = '#1F1F1F';           // grafito, nunca negro puro
export const TEXT_MUTED = '#6B6B6B';
export const TEXT_LIGHT = '#9A9A9A';

// Estados
export const SUCCESS = '#7A9579';
export const WARN = '#B8732B';
export const DANGER = '#C75A4A';
export const DANGER_SOFT = '#D08A7D';    // rojo pastel para textos de exceso —
                                         // avisa sin castigar (los aros nunca
                                         // cambian de color, solo el texto).

// Sombras — escala de 3 niveles. No inventar más variantes inline.
export const SHADOW_CARD = '0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 30px rgba(60,70,50,0.10), 0 2px 8px rgba(60,70,50,0.05)';
export const SHADOW_RAISED = '0 6px 20px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.10)';
export const SHADOW_OVERLAY = '0 -8px 40px rgba(0,0,0,0.18)';

// Tipografía
export const FONT_UI = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
export const FONT_DISPLAY = "'Bebas Neue', 'Inter', sans-serif";
