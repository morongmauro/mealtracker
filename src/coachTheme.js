// ─────────────────────────────────────────────────────────────────────────
// COACH THEME — paleta del CRM (crm_entrenaconmetodo), SOLO para el
// dashboard del coach. La app del cliente y el recetario siguen usando
// src/theme.js (oliva/crema); este archivo replica los tokens del CRM
// (styles.css del CRM: slate + emerald de Tailwind) para que el panel del
// coach se vea como una extensión del CRM.
//
// Regla de CTAs del CRM: ESMERALDA (#10b981) = acción primaria;
// PIZARRA (#0f172a) = chips/tabs activos y énfasis oscuro.
// ─────────────────────────────────────────────────────────────────────────

// Marca (emerald)
export const ACCENT = '#10b981';         // esmeralda — botón primario, labels de marca
export const ACCENT_DARK = '#065f46';    // esmeralda profundo para texto sobre claro
export const ACCENT_PASTEL = '#d1fae5';  // fondo de tags/badges verdes
export const ACCENT_LIGHT = '#ecfdf5';

// Info — intermedio en barras/heatmap (azul de las gráficas del CRM)
export const INFO = '#3b82f6';

// Macros — serie de colores de gráficas/tags del CRM
export const C_PROTEIN = '#3b82f6';      // azul
export const C_CARBS = '#f59e0b';        // ámbar
export const C_FAT = '#8b5cf6';          // violeta
export const C_WATER = '#06b6d4';        // cian

// Neutros (slate)
export const BG = '#f1f5f9';             // slate-100 — fondo de página del CRM
export const SURFACE = '#ffffff';
export const SURFACE_2 = '#f1f5f9';      // inputs, chips inactivos, filas zebra
export const BORDER = '#e2e8f0';         // bordes de inputs/chips
export const BORDER_SOFT = '#f1f5f9';    // borde casi invisible de las cards
export const TEXT = '#0f172a';           // slate-900 — también fondo de chip activo
export const TEXT_MUTED = '#64748b';     // slate-500
export const TEXT_LIGHT = '#94a3b8';     // slate-400

// Estados
export const SUCCESS = '#10b981';
export const WARN = '#f59e0b';
export const DANGER = '#ef4444';
export const DANGER_DARK = '#991b1b';    // texto de error sobre DANGER_BG
export const DANGER_BG = '#fee2e2';

// Sombras y marca
export const SHADOW_CARD = '0 1px 2px rgba(0,0,0,0.04)';
export const SHADOW_BTN = '0 1px 3px rgba(16,185,129,0.3)';
export const GRADIENT_BRAND = 'linear-gradient(to bottom right, #34d399, #059669)'; // badge "EM"

// Tipografía — el CRM usa Inter para todo
export const FONT_UI = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
