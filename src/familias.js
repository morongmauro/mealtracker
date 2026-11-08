// ─────────────────────────────────────────────────────────────────────────
// LAS 5 FAMILIAS DE EJERCICIOS
//
// Salen del «Tipo» que el coach le pone a cada ejercicio en el CRM:
//   · Fuerza (con core): fuerza, hipertrofia, core, rehabilitación…
//   · Potencia: potencia, pliométrico (explotar: saltar, lanzar, empujar rápido)
//   · Agilidad y velocidad: agilidad, velocidad (cambiar de dirección, frenar,
//     reaccionar)
//   · Resistencia: cardio (aguante)
//   · Movilidad y estiramientos: movilidad, calentamiento y estiramientos
//     (la tarjeta dice «Movilidad» o «Estiramiento»)
// La familia decide el estante de la galería y lo que dice la ficha.
// ─────────────────────────────────────────────────────────────────────────
const FAMILIAS = {
  movilidad:   { texto: 'Movilidad y estiramientos', corto: 'Movilidad', color: '#178A8F', tinte: '#DFF2F2', fondo: ['#6FC3C7', '#2C9196'] },
  agilidad:    { texto: 'Agilidad y velocidad', corto: 'Agilidad', color: '#B5701A', tinte: '#FBEBD3', fondo: ['#E8B46A', '#C27E22'] },
  resistencia: { texto: 'Resistencia', color: '#C23D78', tinte: '#F9E3EE', fondo: ['#E68DB8', '#BF4A82'] },
  potencia:    { texto: 'Potencia',    color: '#C2413B', tinte: '#FAE5E3', fondo: ['#E8908A', '#C2463F'] },
  fuerza:      { texto: 'Fuerza',      color: '#454B54', tinte: '#E9EBEE', fondo: ['#A7ADB5', '#7B828B'] },
};

export function familiaDe(e) {
  const tipo = e?.tipo;
  if (tipo === 'cardio') return 'resistencia';
  if (['movilidad', 'calentamiento', 'estiramiento', 'estiramiento_pasivo', 'estiramiento_activo'].includes(tipo)) return 'movilidad';
  if (['agilidad', 'velocidad'].includes(tipo)) return 'agilidad';
  if (['potencia', 'pliometrico'].includes(tipo)) return 'potencia';
  return 'fuerza';
}
// La etiqueta de cada tarjeta: la de su familia, salvo en «Movilidad y
// estiramientos», donde dice cuál de las dos es.
export function etiquetaDe(e) {
  const f = familiaDe(e);
  if (f === 'movilidad') return /^estiramiento/.test(e?.tipo || '') ? 'Estiramiento' : 'Movilidad';
  return FAMILIAS[f].corto || FAMILIAS[f].texto;
}
export { FAMILIAS };
