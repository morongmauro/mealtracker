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
    if (planeados && hechos >= planeados) return { etiqueta, a: 'Semana completa.', b: 'Todo lo del plan, hecho. Así se progresa.' };
    return { etiqueta, a: 'Hecho por hoy.', b: delDia(HECHO, hoy, 1) };
  }
  if (dia && dia.rutina && dia.en_curso) {
    return { etiqueta, a: 'Tienes un entreno a medias.', b: 'Termínalo, ya hiciste lo difícil.' };
  }
  if (dia && dia.rutina) {
    const n = nombreParaFrase(dia.rutina.nombre);
    const a = n ? `Hoy toca ${n}.` : 'Hoy toca entrenar.';
    let b;
    if (planeados > 1 && hechos === planeados - 1) b = 'Con este cierras la semana.';
    else if (hechos === 0 && diaSemana(hoy) === 1) b = 'Empieza la semana con fuerza.';
    else if (ayerPendiente) b = 'Lo de ayer puedes moverlo a otro día.';
    else if (planeados >= 4 && hechos === Math.floor(planeados / 2)) b = 'Hoy pasas la mitad de la semana.';
    else b = delDia(RUTINA_GENERICA, hoy);
    return { etiqueta, a, b };
  }
  // Descanso (o día sin rutina)
  if (planeados && hechos >= planeados) return { etiqueta, a: 'Semana completa.', b: 'Hoy descansas sin culpa.' };
  if (ayerPendiente) return { etiqueta, a: 'Hoy no te toca nada.', b: 'Buen día para lo que quedó de ayer.' };
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
  if (!meta) return { etiqueta, a: 'Así va tu día.', b: 'Registra lo que comes y te guío.' };
  if (!comidas || kcal <= 0) {
    if (hora < 11) return { etiqueta, a: 'Buen día.', b: 'Empieza registrando tu desayuno.' };
    if (hora < 17) return { etiqueta, a: 'Empieza tu día.', b: 'Anota tu primera comida, es un minuto.' };
    return { etiqueta, a: 'Hoy va sin registro.', b: 'Anota lo que comiste, aunque sea aproximado.' };
  }
  const f = kcal / meta;
  if (f > 1.1) return { etiqueta, a: 'Hoy te pasaste un poco.', b: 'Pasa. Mañana se equilibra.' };
  if (f >= 0.9) return { etiqueta, a: 'Día en tu meta.', b: hora >= 18 ? 'Así se cierra un día.' : 'Lo que queda, ligero y con proteína.' };
  const a = `Te quedan ${miles(meta - kcal)} kcal.`;
  if (hora >= 18) return { etiqueta, a, b: 'Úsalas en una cena con proteína.' };
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
