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
export const BG = '#F9F7F1';             // crema — EL crema, único en toda la app
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

// Sombras — escala de 3 niveles. No inventar más variantes inline.
export const SHADOW_CARD = '0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 30px rgba(60,70,50,0.10), 0 2px 8px rgba(60,70,50,0.05)';
export const SHADOW_RAISED = '0 6px 20px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.10)';
export const SHADOW_OVERLAY = '0 -8px 40px rgba(0,0,0,0.18)';

// Tipografía
export const FONT_UI = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
export const FONT_DISPLAY = "'Bebas Neue', 'Inter', sans-serif";
