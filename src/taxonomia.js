// ─────────────────────────────────────────────────────────────────────────
// TAXONOMÍA DE LA GALERÍA DE EJERCICIOS
//
// Los filtros del constructor de rutinas (CRM) y las etiquetas que ve el
// cliente salen todos de aquí. En la base son columnas `text`/`text[]` y no
// enums a propósito: agregar una categoría no debe exigir una migración de
// Postgres. El precio es que la validación vive en la UI — o sea, aquí.
//
// Debe coincidir con los comentarios de la tabla `ejercicios` (schema.sql §2).
// ─────────────────────────────────────────────────────────────────────────

// Patrón de movimiento — el filtro grueso: "muéstrame todo lo de empuje"
export const PATRONES = [
  { id: 'push',       label: 'Empuje (push)' },
  { id: 'pull',       label: 'Tracción (pull)' },
  { id: 'rodilla',    label: 'Dominante de rodilla' },   // sentadillas, zancadas
  { id: 'cadera',     label: 'Dominante de cadera' },    // peso muerto, hip thrust
  { id: 'core',       label: 'Core / antimovimiento' },
  { id: 'carry',      label: 'Transporte (carry)' },
  { id: 'locomocion', label: 'Locomoción' },             // correr, saltar la cuerda
];

// Segmento — tren superior / inferior, como lo pediste
export const SEGMENTOS = [
  { id: 'tren_superior', label: 'Tren superior' },
  { id: 'tren_inferior', label: 'Tren inferior' },
  { id: 'core',          label: 'Core' },
  { id: 'full_body',     label: 'Cuerpo completo' },
];

// Tipo de trabajo — el filtro que separa fuerza de movilidad, pliometría,
// agilidad, estiramientos y cardio.
export const TIPOS = [
  { id: 'fuerza',              label: 'Fuerza' },
  { id: 'hipertrofia',         label: 'Hipertrofia' },
  { id: 'potencia',            label: 'Potencia' },
  { id: 'pliometrico',         label: 'Pliométrico' },
  { id: 'agilidad',            label: 'Agilidad' },
  { id: 'movilidad',           label: 'Movilidad' },
  { id: 'estiramiento_pasivo', label: 'Estiramiento pasivo' },
  { id: 'estiramiento_activo', label: 'Estiramiento activo' },
  { id: 'cardio',              label: 'Cardio' },
  { id: 'core',                label: 'Core' },
  { id: 'rehabilitacion',      label: 'Rehabilitación' },
  { id: 'calentamiento',       label: 'Calentamiento' },
];

export const EQUIPO = [
  { id: 'peso_corporal', label: 'Peso corporal' },
  { id: 'barra',         label: 'Barra' },
  { id: 'mancuerna',     label: 'Mancuernas' },
  { id: 'kettlebell',    label: 'Kettlebell' },
  { id: 'polea',         label: 'Polea' },
  { id: 'maquina',       label: 'Máquina' },
  { id: 'banda',         label: 'Banda elástica' },
  { id: 'trx',           label: 'TRX / anillas' },
  { id: 'balon',         label: 'Balón medicinal' },
  { id: 'banco',         label: 'Banco' },
  { id: 'caja',          label: 'Cajón' },
  { id: 'cuerda',        label: 'Cuerda' },
];

// Cruza con clientes.lugar_entreno del CRM: si un cliente entrena en casa,
// la galería puede esconder de entrada todo lo que exige gimnasio.
export const LUGARES = [
  { id: 'gym',        label: 'Gimnasio' },
  { id: 'casa',       label: 'Casa' },
  { id: 'aire_libre', label: 'Aire libre' },
];

export const NIVELES = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio',   label: 'Intermedio' },
  { id: 'avanzado',     label: 'Avanzado' },
];

// Tipos de bloque dentro de una rutina
export const TIPOS_BLOQUE = [
  { id: 'normal',     label: 'Series normales' },
  { id: 'superserie', label: 'Superserie' },
  { id: 'circuito',   label: 'Circuito' },
  { id: 'emom',       label: 'EMOM' },
  { id: 'amrap',      label: 'AMRAP' },
];

// Días de la semana — MISMO código que clientes.dias_entreno del CRM
// ('L','M','X','J','V','S','D'). No cambiarlo: cruza con datos existentes.
export const DIAS = [
  { id: 'L', label: 'Lun' }, { id: 'M', label: 'Mar' }, { id: 'X', label: 'Mié' },
  { id: 'J', label: 'Jue' }, { id: 'V', label: 'Vie' }, { id: 'S', label: 'Sáb' },
  { id: 'D', label: 'Dom' },
];

const etiquetar = (lista) => Object.fromEntries(lista.map(x => [x.id, x.label]));
export const LABEL = {
  patron: etiquetar(PATRONES),
  segmento: etiquetar(SEGMENTOS),
  tipo: etiquetar(TIPOS),
  equipo: etiquetar(EQUIPO),
  lugar: etiquetar(LUGARES),
  nivel: etiquetar(NIVELES),
  bloque: etiquetar(TIPOS_BLOQUE),
  dia: etiquetar(DIAS),
};
