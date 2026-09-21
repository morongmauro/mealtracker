// ─────────────────────────────────────────────────────────────────────────
// VOCABULARIO DE MÚSCULOS  ·  ⚠ ARCHIVO GENERADO
//
// Esta lista es EL CONTRATO entre tres cosas que tienen que coincidir o el
// dibujo del cuerpo se pinta mal:
//   1. la tabla `musculos` del Supabase del CRM (schema.sql §1)
//   2. las formas de `figura-formas.js` (frente y espalda), que pintan
//      <FiguraMusculos> aquí y `musculos-figura.js` en el CRM
//   3. este archivo, que usa la app para saber qué pintar
//
// El campo `cara` decide en qué silueta debe existir la forma. `gen-figura.py`
// se genera contra esta lista y hay una comprobación que falla si algún slug
// queda sin forma o sobra una forma sin slug.
//
// Se generó desde schema.sql. Si agregas un músculo, agrégalo AL SQL y
// vuelve a generar — no lo edites suelto aquí.
//
//   cara: en cuál de los dos dibujos aparece (frente | espalda | ambas)
// ─────────────────────────────────────────────────────────────────────────

export const MUSCULOS = [
  { slug: 'pectoral_mayor',      nombre: 'Pectoral mayor',                  corto: 'Pecho',           grupo: 'pecho',    cara: 'frente' },
  { slug: 'pectoral_superior',   nombre: 'Pectoral superior (clavicular)',  corto: 'Pecho sup.',      grupo: 'pecho',    cara: 'frente' },
  { slug: 'deltoide_anterior',   nombre: 'Deltoide anterior',               corto: 'Deltoide ant.',   grupo: 'hombro',   cara: 'frente' },
  { slug: 'deltoide_lateral',    nombre: 'Deltoide lateral',                corto: 'Deltoide lat.',   grupo: 'hombro',   cara: 'ambas' },
  { slug: 'deltoide_posterior',  nombre: 'Deltoide posterior',              corto: 'Deltoide post.',  grupo: 'hombro',   cara: 'espalda' },
  { slug: 'biceps',              nombre: 'Bíceps braquial',                corto: 'Bíceps',         grupo: 'brazo',    cara: 'frente' },
  { slug: 'braquial',            nombre: 'Braquial anterior',               corto: 'Braquial',        grupo: 'brazo',    cara: 'frente' },
  { slug: 'triceps',             nombre: 'Tríceps braquial',               corto: 'Tríceps',        grupo: 'brazo',    cara: 'espalda' },
  { slug: 'antebrazo',           nombre: 'Antebrazo',                       corto: 'Antebrazo',       grupo: 'brazo',    cara: 'ambas' },
  { slug: 'dorsal_ancho',        nombre: 'Dorsal ancho',                    corto: 'Dorsales',        grupo: 'espalda',  cara: 'espalda' },
  { slug: 'trapecio_superior',   nombre: 'Trapecio superior',               corto: 'Trapecio sup.',   grupo: 'espalda',  cara: 'ambas' },
  { slug: 'trapecio_medio',      nombre: 'Trapecio medio',                  corto: 'Trapecio medio',  grupo: 'espalda',  cara: 'espalda' },
  { slug: 'trapecio_inferior',   nombre: 'Trapecio inferior',               corto: 'Trapecio inf.',   grupo: 'espalda',  cara: 'espalda' },
  { slug: 'romboides',           nombre: 'Romboides',                       corto: 'Romboides',       grupo: 'espalda',  cara: 'espalda' },
  { slug: 'redondo_mayor',       nombre: 'Redondo mayor',                   corto: 'Redondo',         grupo: 'espalda',  cara: 'espalda' },
  { slug: 'erectores',           nombre: 'Erectores espinales',             corto: 'Lumbares',        grupo: 'espalda',  cara: 'espalda' },
  { slug: 'recto_abdominal',     nombre: 'Recto abdominal',                 corto: 'Abdomen',         grupo: 'core',     cara: 'frente' },
  { slug: 'oblicuos',            nombre: 'Oblicuos',                        corto: 'Oblicuos',        grupo: 'core',     cara: 'frente' },
  { slug: 'transverso',          nombre: 'Transverso abdominal',            corto: 'Transverso',      grupo: 'core',     cara: 'frente' },
  { slug: 'cuadriceps',          nombre: 'Cuádriceps',                     corto: 'Cuádriceps',     grupo: 'pierna',   cara: 'frente' },
  { slug: 'isquiotibiales',      nombre: 'Isquiotibiales',                  corto: 'Isquios',         grupo: 'pierna',   cara: 'espalda' },
  { slug: 'gluteo_mayor',        nombre: 'Glúteo mayor',                   corto: 'Glúteo',         grupo: 'gluteo',   cara: 'espalda' },
  { slug: 'gluteo_medio',        nombre: 'Glúteo medio',                   corto: 'Glúteo medio',   grupo: 'gluteo',   cara: 'espalda' },
  { slug: 'aductores',           nombre: 'Aductores',                       corto: 'Aductores',       grupo: 'pierna',   cara: 'frente' },
  { slug: 'abductores',          nombre: 'Abductores',                      corto: 'Abductores',      grupo: 'pierna',   cara: 'ambas' },
  { slug: 'gemelos',             nombre: 'Gemelos / sóleo',                corto: 'Gemelos',         grupo: 'pierna',   cara: 'espalda' },
  { slug: 'tibial_anterior',     nombre: 'Tibial anterior',                 corto: 'Tibial',          grupo: 'pierna',   cara: 'frente' },
  { slug: 'psoas',               nombre: 'Psoas ilíaco',                   corto: 'Psoas',           grupo: 'core',     cara: 'frente' },
  { slug: 'manguito_rotador',    nombre: 'Manguito rotador',                corto: 'Manguito',        grupo: 'hombro',   cara: 'espalda' },
  { slug: 'cuerpo_completo',     nombre: 'Cuerpo completo',                 corto: 'Full body',       grupo: 'otro',     cara: 'ambas' },
];

// Índice por slug — la app pinta por id, así que esto es lookup caliente.
export const MUSCULO_POR_SLUG = Object.fromEntries(MUSCULOS.map(m => [m.slug, m]));

// Los slugs que deben existir como <path id="..."> en cada cara del SVG.
export const SLUGS_FRENTE = MUSCULOS.filter(m => m.cara === 'frente' || m.cara === 'ambas').map(m => m.slug);
export const SLUGS_ESPALDA = MUSCULOS.filter(m => m.cara === 'espalda' || m.cara === 'ambas').map(m => m.slug);

// Grupos, para agrupar los filtros de la galería en el constructor del CRM.
export const GRUPOS = ['pecho', 'espalda', 'hombro', 'brazo', 'core', 'pierna', 'gluteo', 'otro'];

// Etiqueta corta de una lista de slugs: 'Pecho · Tríceps · Deltoide ant.'
export const etiquetarMusculos = (slugs = []) =>
  slugs.map(s => MUSCULO_POR_SLUG[s]?.corto).filter(Boolean).join(' · ');
