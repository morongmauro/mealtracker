// ─────────────────────────────────────────────────────────────────────────
// APRENDIZAJE · cuánto ha visto del Centro de Recursos
//
// El centro registra cada lectura en su Supabase (vista `reading_state`) con
// el nombre del cliente: onboarding, capítulos de la guía, cápsulas y
// episodios del podcast. Aquí se lee lo SUYO con la llave pública de solo
// lectura (la misma que usan el centro y el CRM) y se cruza con lo publicado.
//
// Los catálogos son copia de los del CRM (app.js · CENTRO_*). Si se publica
// algo nuevo en el centro, se añade en los dos lados.
// ─────────────────────────────────────────────────────────────────────────

const CENTRO_URL = 'https://kkoayfexdhpazufmyeoj.supabase.co';
const CENTRO_KEY = 'sb_publishable_9UimuwTGp2aIhe-4oSwJpw_ORwmzzhn';

// «Acerca del programa» (visual nueva): el método, el trayecto, las dudas y
// el recorrido de la app. Las claves son las del centro (programa, journey,
// faq), así lo que ya leyó allá cuenta aquí; «recorrido» se marca al
// terminar el recorrido guiado. Las piezas viejas de «cómo usar cada app»
// ya no existen: es una sola app y la explica el recorrido.
const HUB = [
  ['programa',  'El método y sus pilares'],
  ['journey',   'Tu trayecto: las 6 fases'],
  ['faq',       'Preguntas frecuentes'],
  ['recorrido', 'Recorrido de la app'],
];

const CAPSULAS = [
  { id: 'ent-01-capacidades',   cat: 'Entrenamiento',     title: 'Las cinco capacidades' },
  { id: 'ent-02-crece-musculo', cat: 'Entrenamiento',     title: 'Cómo crece el músculo' },
  { id: 'ent-03-lenguaje-rutina', cat: 'Entrenamiento',   title: 'El lenguaje de tu rutina' },
  { id: 'ent-04-subir-peso',    cat: 'Entrenamiento',     title: 'Cuándo subir el peso' },
  { id: 'ent-05-orden-sesion',  cat: 'Entrenamiento',     title: 'El orden de la sesión' },
  { id: 'ent-06-entiende-rutina', cat: 'Entrenamiento',   title: 'Entiende tu rutina' },
  { id: 'nut-07-cada-macro',    cat: 'Nutrición',         title: 'Cuánto de cada macro' },
  { id: 'nut-08-grasa-y-musculo', cat: 'Nutrición',       title: 'Perder grasa y ganar músculo' },
  { id: 'nut-09-comer-sin-pesar', cat: 'Nutrición',       title: 'Comer bien sin pesar' },
  { id: 'bie-10-dormir-mejor',  cat: 'Bienestar general', title: 'Dormir mejor con lo que tienes' },
  { id: 'bie-11-muevete-fuera', cat: 'Bienestar general', title: 'Muévete fuera del gimnasio' },
];

const GUIA = [
  { id: 'no-es-una-decision-aislada-es-un-sistema', cat: 'Apertura', title: 'No es una decisión aislada, es un sistema' },
  { id: 'como-leer-esta-guia', cat: 'Apertura', title: 'Cómo leer esta guía' },
  { id: 'capitulo-1-antes-de-cambiar-tu-alimentacion-entiende-tu-cuer', cat: 'Capítulos', title: 'Cap. 1 · Antes de cambiar tu alimentación, entiende tu cuerpo' },
  { id: 'capitulo-2-nutrientes-y-alimentos-como-tomar-buenas-decision', cat: 'Capítulos', title: 'Cap. 2 · Nutrientes y alimentos: cómo tomar buenas decisiones' },
  { id: 'capitulo-3-como-gestionar-tu-alimentacion-en-la-vida-real', cat: 'Capítulos', title: 'Cap. 3 · Cómo gestionar tu alimentación en la vida real' },
  { id: 'capitulo-4-adherencia-lo-que-sostiene-los-resultados', cat: 'Capítulos', title: 'Cap. 4 · Adherencia: lo que sostiene los resultados' },
  { id: 'capitulo-5-dormir-y-recuperar-el-motor-de-tu-progreso', cat: 'Capítulos', title: 'Cap. 5 · Dormir y recuperar: el motor de tu progreso' },
  { id: 'capitulo-6-salud-digestiva-funcional', cat: 'Capítulos', title: 'Cap. 6 · Salud digestiva funcional' },
  { id: 'capitulo-7-suplementos-menos-ruido-mas-criterio', cat: 'Capítulos', title: 'Cap. 7 · Suplementos: menos ruido, más criterio' },
  { id: 'bonus-1-alcohol-la-variable-subestimada', cat: 'Bonus', title: 'Bonus 1 · Alcohol: la variable subestimada' },
  { id: 'bonus-2-ayuno-cuando-tiene-sentido', cat: 'Bonus', title: 'Bonus 2 · Ayuno: cuándo tiene sentido' },
  { id: 'bonus-3-como-leer-etiquetas-y-no-caer-en-marketing', cat: 'Bonus', title: 'Bonus 3 · Cómo leer etiquetas y no caer en marketing' },
  { id: 'cierre-criterio-metodo-y-aplicacion', cat: 'Cierre', title: 'Cierre: criterio, método y aplicación' },
  { id: 'aviso-legal-y-uso-del-material', cat: 'Cierre', title: 'Aviso legal y uso del material' },
  { id: 'referencias-y-fuentes', cat: 'Cierre', title: 'Referencias y fuentes' },
];

const PODCASTS = [
  { id: 'etiquetas-leer-1', cat: 'Nutrición', title: 'Leer etiquetas sin que te engañen (1 de 2)' },
  { id: 'etiquetas-leer-2', cat: 'Nutrición', title: 'Leer etiquetas: el tutorial (2 de 2)' },
  { id: 'compra-yogures', cat: 'Nutrición', title: 'Kéfir, griego, proteico o desnatado: cuál elegir' },
  { id: 'compra-cafe', cat: 'Nutrición', title: 'Qué café comprar y cuál no' },
  { id: 'cafe-beneficios', cat: 'Nutrición', title: 'Los beneficios del café, uno por uno' },
  { id: 'vinagre-manzana', cat: 'Nutrición', title: 'Vinagre de manzana: ¿es para tanto?' },
  { id: 'suple-colageno', cat: 'Nutrición', title: 'Qué colágeno elegir, según para qué lo quieres' },
  { id: 'suple-creatina-mayores', cat: 'Nutrición', title: 'Creatina después de los 70' },
  { id: 'suple-magnesio-senales', cat: 'Nutrición', title: 'Calambres, insomnio y antojos de dulce: ¿te falta magnesio?' },
  { id: 'suple-magnesio-cual', cat: 'Nutrición', title: 'Qué magnesio tomar y cuál no' },
  { id: 'nutricion-ayuno', cat: 'Nutrición', title: '¿Qué rompe el ayuno intermitente?' },
  { id: 'ayuno-siete-dias', cat: 'Nutrición', title: 'Qué pasa en el cuerpo con siete días de ayuno' },
  { id: 'hormona-hambre', cat: 'Nutrición', title: 'La hormona del hambre: por qué no paras de comer' },
  { id: 'nutricion-grasas', cat: 'Nutrición', title: 'Las grasas, más allá de las calorías' },
  { id: 'salud-metabolica-inmune', cat: 'Nutrición', title: 'Salud metabólica y sistema inmune' },
  { id: 'hub-esencial-grasa', cat: 'Nutrición', title: 'Perder grasa: lo que de verdad mueve la aguja' },
  { id: 'hub-norton-comer', cat: 'Nutrición', title: 'Comer para perder grasa y ganar músculo' },
  { id: 'hub-lustig-azucar', cat: 'Nutrición', title: 'Qué le hace el azúcar añadido a tu cuerpo' },
  { id: 'deportistas', cat: 'Entrenamiento', title: 'Si entrenas en serio, esto va para ti' },
  { id: 'hub-cavaliere-plan', cat: 'Entrenamiento', title: 'Cómo se arma un plan de entrenamiento que sirve' },
  { id: 'dormir-descanso', cat: 'Bienestar general', title: 'Duermes ocho horas y sigues cansado' },
  { id: 'dolor-menstrual', cat: 'Bienestar general', title: 'Dolor menstrual: alimentos y suplementos que ayudan' },
  { id: 'hormonas-testosterona', cat: 'Bienestar general', title: 'Testosterona: qué la baja y qué la sostiene' },
  { id: 'hub-walker-sueno', cat: 'Bienestar general', title: 'Cuántas horas necesitas dormir tú' },
  { id: 'hub-calor-sauna', cat: 'Bienestar general', title: 'Sauna y calor: qué gana el cuerpo' },
  { id: 'hub-goggins-fuerza', cat: 'Bienestar general', title: 'De dónde sale la fuerza mental' },
  { id: 'hub-conti-salud-mental', cat: 'Bienestar general', title: 'Cuidar tu salud mental, en concreto' },
  { id: 'hub-suzuki-memoria', cat: 'Bienestar general', title: 'Atención y memoria: cómo se entrenan' },
  { id: 'hub-ferriss-aprender', cat: 'Bienestar general', title: 'Aprender mejor y elegir tu rumbo' },
  { id: 'hub-musica-animo', cat: 'Bienestar general', title: 'La música como palanca de ánimo' },
];

export const BLOQUES = [
  { k: 'hub', titulo: 'Sobre el programa', bajada: 'El método, tu trayecto y la app', fuentes: ['hub'], prefijo: /^$/,
    catalogo: HUB.map(([id, title]) => ({ id, title })) },
  { k: 'guia', titulo: 'Guía de alimentación', bajada: 'Los capítulos de la guía', fuentes: ['guia', 'ga'], prefijo: /^$/, catalogo: GUIA },
  { k: 'capsula', titulo: 'Cápsulas', bajada: 'Láminas cortas de entrenamiento, nutrición y bienestar', fuentes: ['capsula'], prefijo: /^cap:/, catalogo: CAPSULAS },
  { k: 'podcast', titulo: 'Videos', bajada: 'Episodios y videos recomendados', fuentes: ['podcast'], prefijo: /^pod:/, catalogo: PODCASTS },
];

const normal = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Puro: de las filas del centro al avance por bloque.
export function avanceAprendizaje(filas, nombre) {
  const yo = normal(nombre);
  const mias = (filas || []).filter(f => normal(f.client_name) === yo);
  const bloques = BLOQUES.map(b => {
    const vistos = new Set(mias.filter(f => b.fuentes.includes(f.source)).map(f => String(f.section_key || '').replace(b.prefijo, '')));
    const piezas = b.catalogo.map(c => ({ ...c, vista: vistos.has(c.id) }));
    const vistas = piezas.filter(p => p.vista).length;
    return { k: b.k, titulo: b.titulo, bajada: b.bajada, piezas, vistas, total: piezas.length };
  });
  const vistas = bloques.reduce((a, b) => a + b.vistas, 0);
  const total = bloques.reduce((a, b) => a + b.total, 0);
  return { bloques, vistas, total, pct: total ? Math.round((vistas / total) * 100) : 0 };
}

// Lee solo sus filas. `ilike` sin comodines: mismo nombre sin importar
// mayúsculas; las tildes se comparan después, en avanceAprendizaje.
export async function leerAprendizaje(nombre) {
  if (!nombre) return null;
  const h = { apikey: CENTRO_KEY, Authorization: `Bearer ${CENTRO_KEY}` };
  const q = `select=client_name,source,section_key&client_name=ilike.${encodeURIComponent(nombre)}`;
  try {
    let r = await fetch(`${CENTRO_URL}/rest/v1/reading_state?${q}`, { headers: h });
    if (!r.ok) r = await fetch(`${CENTRO_URL}/rest/v1/reading_events?${q}`, { headers: h });
    if (!r.ok) return null;
    return avanceAprendizaje(await r.json(), nombre);
  } catch (e) {
    return null;
  }
}

// ── Lo próximo por leer, ver o escuchar ──────────────────────────────────
// Puro. Del avance a una lista ordenada de recomendaciones:
//   1. lo que falte del onboarding, en su orden: es la base;
//   2. seguir lo empezado: en cada bloque a medias (el más avanzado
//      primero), la siguiente pieza sin ver, del tema que más ha visto;
//   3. algo nuevo de cada bloque que aún no ha tocado;
//   4. el resto de lo que falta, en orden.
// `destino` es lo que entiende openLearning de la app para abrir la pieza.
const DESTINO = {
  hub: (p) => `hub:${p.id}`,
  guia: () => 'guia',
  capsula: (p) => `cap:${p.id}`,
  podcast: (p) => `pod:${p.id}`,
};
const temaFavorito = (b) => {
  const cuenta = {};
  b.piezas.filter(p => p.vista && p.cat).forEach(p => { cuenta[p.cat] = (cuenta[p.cat] || 0) + 1; });
  return Object.entries(cuenta).sort((a, c) => c[1] - a[1])[0]?.[0] || null;
};
const siguienteDe = (b) => {
  const pendientes = b.piezas.filter(p => !p.vista);
  if (!pendientes.length) return null;
  if (b.k === 'guia') {
    // En la guía se sigue el orden: la primera sin leer después de la
    // última leída (y si no, la primera sin leer).
    const ult = b.piezas.map(p => p.vista).lastIndexOf(true);
    return b.piezas.slice(ult + 1).find(p => !p.vista) || pendientes[0];
  }
  const tema = temaFavorito(b);
  return (tema && pendientes.find(p => p.cat === tema)) || pendientes[0];
};

export function recomendarAprendizaje(avance, n = 4) {
  if (!avance || !Array.isArray(avance.bloques)) return [];
  const out = [];
  const ya = new Set();
  const add = (b, p, motivo) => {
    if (!p) return;
    const k = `${b.k}:${p.id}`;
    if (ya.has(k)) return;
    ya.add(k);
    out.push({ bloque: b.k, bloqueTitulo: b.titulo, id: p.id, title: p.title, cat: p.cat || null, motivo, destino: DESTINO[b.k](p) });
  };
  const de = (k) => avance.bloques.find(b => b.k === k);
  const hub = de('hub');
  if (hub) hub.piezas.filter(p => !p.vista).forEach(p => add(hub, p, 'Empieza por aquí'));
  const resto = avance.bloques.filter(b => b.k !== 'hub');
  resto.filter(b => b.vistas > 0 && b.vistas < b.total)
    .sort((a, c) => c.vistas - a.vistas)
    .forEach(b => add(b, siguienteDe(b), 'Sigue donde ibas'));
  const orden = ['capsula', 'guia', 'podcast'].map(de).filter(Boolean);
  orden.filter(b => b.vistas === 0).forEach(b => add(b, b.piezas[0], 'Nuevo para ti'));
  orden.forEach(b => b.piezas.filter(p => !p.vista).forEach(p => add(b, p, 'Te falta')));
  return out.slice(0, n);
}

// Última lectura, por nombre, en esta visita: al volver a Aprendizaje se
// pinta al instante y se refresca por detrás.
const cacheAvance = new Map();
export const avanceGuardado = (nombre) => cacheAvance.get(nombre);
export async function leerAprendizajeConCache(nombre) {
  const r = await leerAprendizaje(nombre);
  if (r) cacheAvance.set(nombre, r);
  return r || cacheAvance.get(nombre) || null;
}

// Marca una pieza como vista en el centro (la misma tabla que usa el centro
// al leer: reading_events). Así cuenta en su avance y el coach la ve en el
// CRM. Si no hay red no pasa nada: se vuelve a marcar la próxima vez.
const marcadas = new Set();
// Lo que esta persona ya marcó como visto en esta sesión (aunque el centro
// todavía no lo devuelva al leer).
export const marcadaLocal = (nombre, source, key) => marcadas.has(`${nombre}|${source}|${key}`);
export function registrarLectura(nombre, source, key, label) {
  if (!nombre || !key) return;
  const id = `${nombre}|${source}|${key}`;
  if (marcadas.has(id)) return;
  marcadas.add(id);
  cacheAvance.delete(nombre);
  try {
    fetch(`${CENTRO_URL}/rest/v1/reading_events`, {
      method: 'POST', keepalive: true,
      headers: { apikey: CENTRO_KEY, Authorization: `Bearer ${CENTRO_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ client_name: nombre, source, section_key: key, section_label: label || key }),
    }).catch(() => { marcadas.delete(id); });
  } catch (e) { marcadas.delete(id); }
}
