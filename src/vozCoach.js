// ─────────────────────────────────────────────────────────────────────────
// LA VOZ DEL COACH · visual nueva
//
// Lo que dice la cabecera de cada «Hoy». La personalidad de la app no la
// ponen los dibujos: la pone lo que el coach le dice a cada persona según lo
// que le pasa HOY (le toca pierna, ya entrenó, descansa, le quedan 600 kcal,
// lleva la mitad del material…). Cada frase tiene dos partes:
//
//   a — lo que pasa (en negro)          «Hoy toca Pierna.»
//   b — lo que diría el coach (en color) «La semana se gana aquí.»
//
// Las variantes rotan por día: el mismo día dice siempre lo mismo (no cambia
// al volver a abrir) y al día siguiente cambia. Sin género gramatical: le
// habla igual a todos («hoy descansas», no «descansa tranquilo»).
//
// Todo es puro (sin React ni almacenamiento) para poder probarlo:
//   node pruebas/voz-coach.mjs
// ─────────────────────────────────────────────────────────────────────────

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const diaNum = (fecha) => Math.floor(Date.parse(String(fecha).slice(0, 10) + 'T00:00:00Z') / 86400000);
const diaSemana = (fecha) => new Date(Date.parse(String(fecha).slice(0, 10) + 'T12:00:00Z')).getUTCDay();

// Elige la variante del día. `sal` separa las secciones para que no roten
// juntas (el lunes no dicen las tres «la primera»).
export { V as VARIANTES };
export function delDia(lista, fecha, sal = 0) {
  if (!lista.length) return '';
  const n = diaNum(fecha) + sal;
  return lista[((n % lista.length) + lista.length) % lista.length];
}

const miles = (n) => Math.round(n).toLocaleString('es-CO');

// «MARTES 2 · SEMANA 3 DE 8»
export function etiquetaDia(fecha, extra = '') {
  const d = Number(String(fecha).slice(8, 10));
  const t = `${DIAS[diaSemana(fecha)]} ${d}`.toUpperCase();
  return extra ? `${t} · ${extra.toUpperCase()}` : t;
}

// ── ENTRENAMIENTO ─────────────────────────────────────────────────────────

// La semana del plan: cuántas rutinas tiene y cuántas van hechas.
export function semanaDelPlan(plan) {
  const dias = (plan && plan.dias) || [];
  const conRutina = dias.filter(d => d.rutina);
  return { planeados: conRutina.length, hechos: conRutina.filter(d => d.hecha).length };
}

// Cada situación tiene varias frases: rotan por día para no repetir siempre
// la misma cuando la situación se repite (el lunes de cada semana, el día
// sin registro…).
const V = {
  completa:      ['Todo lo del plan, hecho. Así se progresa.', 'Semana cumplida de punta a punta.', 'Cada entreno de la semana, hecho. Eso es constancia.'],
  completaDesc:  ['Hoy descansas sin culpa.', 'Te lo ganaste: hoy toca recuperar.', 'Descansa: el trabajo ya está hecho.'],
  aMedias:       ['Termínalo, ya hiciste lo difícil.', 'Te falta poco: ciérralo hoy.', 'Lo empezaste: lo que queda es lo más fácil.'],
  cierra:        ['Con este cierras la semana.', 'El último de la semana: a cerrarla bien.', 'Este completa tu semana.'],
  lunes:         ['Empieza la semana con fuerza.', 'Primer entreno de la semana: marca el ritmo.', 'Arrancar bien es la mitad del trabajo.'],
  ayer:          ['Lo de ayer puedes moverlo a otro día.', 'Si ayer no se pudo, muévelo en tu calendario.', 'Ayer quedó algo: acomódalo en tu semana.'],
  mitad:         ['Hoy pasas la mitad de la semana.', 'Con este ya vas más de la mitad.', 'Mitad de la semana: sigue igual.'],
  libreAyer:     ['Buen día para lo que quedó de ayer.', 'Si quieres, recupera hoy lo de ayer.', 'Día libre: ideal para lo pendiente.'],
  sinMeta:       ['Registra lo que comes y te guío.', 'Anota tus comidas y lo vemos juntos.'],
  desayuno:      ['Empieza registrando tu desayuno.', 'Anota tu desayuno y arranca con datos.', 'Un registro temprano ordena el día.'],
  primera:       ['Anota tu primera comida, es un minuto.', 'Registra lo que llevas, aunque sea en una línea.', 'Lo que no se anota no se puede ajustar.'],
  sinRegistro:   ['Anota lo que comiste, aunque sea aproximado.', 'Un registro aproximado vale más que ninguno.', 'Anota lo principal; el detalle no importa hoy.'],
  pasado:        ['Pasa. Mañana se equilibra.', 'Un día no define nada: mañana vuelves al plan.', 'Tranquilidad: lo que cuenta es la semana.'],
  metaNoche:     ['Así se cierra un día.', 'Día cerrado en tu meta. Eso es constancia.', 'Así, día tras día.'],
  metaDia:       ['Lo que queda, ligero y con proteína.', 'Vas justo: lo que falta, sencillo.', 'Bien encaminado: cierra con algo ligero.'],
  cena:          ['Úsalas en una cena con proteína.', 'Una cena con proteína y verdura las cubre bien.', 'Cierra el día con una buena cena.'],
};

const RUTINA_GENERICA = [
  'La semana se gana aquí.',
  'Una buena sesión a la vez.',
  'Técnica primero, el peso viene solo.',
  'Hoy suma. Siempre suma.',
  'Calienta bien y a lo tuyo.',
  'Que la última serie cueste.',
  'Hazlo bien antes que hacerlo pesado.',
];
const DESCANSO = [
  'Recuperar también es entrenar.',
  'Camina, estira y duerme bien.',
  'Hoy el músculo crece en silencio.',
  'Come bien y descansa en serio.',
];
const HECHO = [
  'Ahora toca comer bien y dormir.',
  'Eso es constancia.',
  'Uno más en la cuenta.',
  'Lo de hoy ya nadie te lo quita.',
];

// Nombre corto para la frase: «Pierna», «Push A». Si es largo, la frase no
// lo nombra (ya sale completo en la tarjeta de abajo).
const nombreParaFrase = (n) => {
  const s = String(n || '').trim();
  return s && s.length <= 18 ? s : '';
};

export function vozEntreno({ plan, hoy }) {
  const fase = plan && plan.fase;
  const extra = fase && fase.semana_actual ? `Semana ${fase.semana_actual} de ${fase.semanas}` : '';
  const etiqueta = etiquetaDia(hoy, extra);
  if (!plan || !plan.ok || !fase) {
    return { etiqueta, a: 'Tu plan viene en camino.', b: 'Mientras, muévete a tu manera.' };
  }
  const dias = plan.dias || [];
  const dia = dias.find(d => d.es_hoy) || dias.find(d => d.fecha === hoy) || null;
  const { planeados, hechos } = semanaDelPlan(plan);
  const ayerFecha = new Date((diaNum(hoy) - 1) * 86400000).toISOString().slice(0, 10);
  const ayer = dias.find(d => d.fecha === ayerFecha);   // solo si ayer es de esta semana
  const ayerPendiente = !!(ayer && ayer.rutina && !ayer.hecha && !ayer.saltada);

  if (dia && dia.rutina && dia.hecha) {
    if (planeados && hechos >= planeados) return { etiqueta, a: 'Semana completa.', b: delDia(V.completa, hoy) };
    return { etiqueta, a: 'Hecho por hoy.', b: delDia(HECHO, hoy, 1) };
  }
  if (dia && dia.rutina && dia.en_curso) {
    return { etiqueta, a: 'Tienes un entreno a medias.', b: delDia(V.aMedias, hoy) };
  }
  if (dia && dia.rutina) {
    const n = nombreParaFrase(dia.rutina.nombre);
    const a = n ? `Hoy toca ${n}.` : 'Hoy toca entrenar.';
    let b;
    if (planeados > 1 && hechos === planeados - 1) b = delDia(V.cierra, hoy);
    else if (hechos === 0 && diaSemana(hoy) === 1) b = delDia(V.lunes, hoy);
    else if (ayerPendiente) b = delDia(V.ayer, hoy);
    else if (planeados >= 4 && hechos === Math.floor(planeados / 2)) b = delDia(V.mitad, hoy);
    else b = delDia(RUTINA_GENERICA, hoy);
    return { etiqueta, a, b };
  }
  // Descanso (o día sin rutina)
  if (planeados && hechos >= planeados) return { etiqueta, a: 'Semana completa.', b: delDia(V.completaDesc, hoy) };
  if (ayerPendiente) return { etiqueta, a: 'Hoy no te toca nada.', b: delDia(V.libreAyer, hoy) };
  return { etiqueta, a: 'Día de descanso.', b: delDia(DESCANSO, hoy, 2) };
}

// ── ALIMENTACIÓN ──────────────────────────────────────────────────────────

const VAS_BIEN = [
  'Prioriza la proteína en la próxima.',
  'Vas bien. Sigue así.',
  'Agua, proteína y verdura. Lo básico funciona.',
  'Cada comida registrada es una decisión mejor.',
];

// `hora` en 0–23. `kcal` lo comido hoy, `meta` la meta del día, `comidas`
// cuántas registró hoy y `racha` los días seguidos registrando.
export function vozComida({ hoy, hora, kcal = 0, meta = 0, comidas = 0, racha = 0 }) {
  const etiqueta = etiquetaDia(hoy, racha >= 3 ? `${racha} días registrando` : '');
  if (!meta) return { etiqueta, a: 'Así va tu día.', b: delDia(V.sinMeta, hoy) };
  if (!comidas || kcal <= 0) {
    if (hora < 11) return { etiqueta, a: 'Buen día.', b: delDia(V.desayuno, hoy) };
    if (hora < 17) return { etiqueta, a: 'Empieza tu día.', b: delDia(V.primera, hoy) };
    return { etiqueta, a: 'Hoy va sin registro.', b: delDia(V.sinRegistro, hoy) };
  }
  const f = kcal / meta;
  if (f > 1.1) return { etiqueta, a: 'Hoy te pasaste un poco.', b: delDia(V.pasado, hoy) };
  if (f >= 0.9) return { etiqueta, a: 'Día en tu meta.', b: delDia(hora >= 18 ? V.metaNoche : V.metaDia, hoy) };
  const a = `Te quedan ${miles(meta - kcal)} kcal.`;
  if (hora >= 18) return { etiqueta, a, b: delDia(V.cena, hoy) };
  if (racha >= 3 && diaNum(hoy) % 3 === 0) return { etiqueta, a, b: `Llevas ${racha} días seguidos. Eso es lo que funciona.` };
  return { etiqueta, a, b: delDia(VAS_BIEN, hoy, 3) };
}

// ── APRENDIZAJE ───────────────────────────────────────────────────────────

const APRENDER = [
  'Lo que entiendes, lo sostienes.',
  'Saber por qué lo haces cambia cómo lo haces.',
  'Un tema a la vez.',
  'Diez minutos hoy te ahorran meses.',
];

// `avance`: undefined (cargando), null (sin datos) o { pct, vistas, total }.
export function vozAprende({ hoy, avance, quedan = 0 }) {
  const etiqueta = etiquetaDia(hoy);
  if (!avance) return { etiqueta, a: 'Tu aprendizaje.', b: delDia(APRENDER, hoy, 4) };
  if (avance.total && avance.vistas >= avance.total && !quedan) {
    return { etiqueta, a: 'Ya viste todo.', b: 'Lo nuevo aparece aquí primero.' };
  }
  if (!avance.vistas) return { etiqueta, a: 'Empieza por lo básico.', b: 'Diez minutos hoy te ahorran meses.' };
  return { etiqueta, a: `Llevas el ${avance.pct} %.`, b: delDia(APRENDER, hoy, 4) };
}

// ── DASH ──────────────────────────────────────────────────────────────────

const ANIMO = [
  'Hoy toca avanzar un poco. Con eso basta.',
  'Lo que hagas hoy es lo que se ve en un mes.',
  'Tienes tu plan y me tienes a mí. Vamos.',
  'Un buen día son pocas decisiones bien tomadas.',
  'La constancia gana. Siempre.',
  'Mejor que ayer. Ese es todo el juego.',
  'Hoy no hace falta ser perfecto, hace falta estar.',
];

export function vozDash({ hoy, racha = 0 }) {
  if (racha >= 7) return `Llevas ${racha} días seguidos registrando. Eso ya es un hábito.`;
  if (racha >= 3) return `${racha} días seguidos registrando. ${delDia(ANIMO, hoy, 5)}`;
  return delDia(ANIMO, hoy, 5);
}

// ── AL TERMINAR UN ENTRENO ────────────────────────────────────────────────

export function vozFinEntreno({ hoy, hechos = 0, total = 0, records = 0 }) {
  if (records > 1) return `${records} récords hoy. Eso es progreso de verdad.`;
  if (records === 1) return 'Récord nuevo. Así se progresa.';
  if (total && hechos >= total) return delDia(['Todo hecho. Ahora come y descansa.', 'Rutina completa. Así se construye.', 'Completo. Eso es constancia.'], hoy, 6);
  if (hechos > 0) return 'Hecho lo que se pudo. Eso también cuenta.';
  return 'Registrado. Mañana más.';
}
