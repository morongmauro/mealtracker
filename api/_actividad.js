// ─────────────────────────────────────────────────────────────────────────
// LA ACTIVIDAD EXTRA EN LA PERFORMANCE (cardio, deportes, caminatas…)
//
// La misma regla del CRM (ACTIVIDADES_EXTRA y actBono en app.js del CRM: si
// cambias una, cambia la otra): cada DÍA con una actividad suma puntos según
// lo exigente que es, con tope de +10 sobre el % de entrenos. Premia sin
// inflar y no puede hundir una semana de fuerza cumplida.
//
//   caminata 1 · yoga / movilidad 1 · ciclismo 2 · natación 2 · deporte 2 · running 3
//
// Lo que el cliente registra en la app trae un tipo libre (caminadora,
// running en calle, fútbol, «otra actividad»…): aquí se lleva a uno de esos
// seis. Lo que no se reconoce cuenta como deporte.
// ─────────────────────────────────────────────────────────────────────────

export const PUNTOS = { caminata: 1, movilidad: 1, ciclismo: 2, natacion: 2, deporte: 2, running: 3 };
export const TOPE = 10;

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function tipoExtra(slug, nombre = '') {
  const s = norm(`${slug} ${nombre}`);
  if (/run|corr|trot|sprint/.test(s)) return 'running';
  if (/camin|cinta|walk|sender|hik/.test(s)) return 'caminata';
  if (/bici|cicl|spin|elipt|bike/.test(s)) return 'ciclismo';
  if (/nata|swim|pisc/.test(s)) return 'natacion';
  if (/yoga|movil|estira|pilates|stretch/.test(s)) return 'movilidad';
  return 'deporte';
}

// Días por tipo, de una lista de actividades { fecha, tipo }. null si no hay.
export function actividadExtra(actividades) {
  const dias = {};
  for (const a of actividades || []) {
    if (!a || !a.fecha) continue;
    const t = tipoExtra(a.tipo, a.nombre);
    (dias[t] || (dias[t] = new Set())).add(a.fecha);
  }
  const out = {};
  for (const [t, set] of Object.entries(dias)) out[t] = Math.min(7, set.size);
  return Object.keys(out).length ? out : null;
}

export const diasExtra = (detalle) => Object.values(detalle || {}).reduce((n, v) => n + (Number(v) || 0), 0);

// Los puntos que suma (0 a 10).
export function bonoExtra(detalle) {
  if (!detalle) return 0;
  const bruto = Object.entries(detalle).reduce((n, [t, v]) => n + (Number(v) || 0) * (PUNTOS[t] || 0), 0);
  return Math.min(TOPE, bruto);
}

// ─────────────────────────────────────────────────────────────────────────
// LO QUE EL COACH LE PONE EN EL CALENDARIO (eventos de tipo «actividad»)
//
// El coach elige del mismo catálogo que usa el cliente y el título empieza
// con ese nombre («Caminadora con inclinación», «Caminata larga»). Aquí se
// saca de qué actividad del catálogo es (la misma regla que el CRM,
// eventos.js → evtSlugDe) y si es de las de DESPUÉS DE ENTRENAR: esas se le
// piden dentro de la rutina, al terminar la fuerza y antes del estiramiento.
// ─────────────────────────────────────────────────────────────────────────
const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function slugDeEvento(titulo, catalogo = []) {
  const t = normTxt(titulo);
  if (!t) return null;
  const hit = (catalogo || []).filter(a => a && a.slug !== 'otro' && a.nombre && t.includes(normTxt(a.nombre)))
    .sort((a, b) => b.nombre.length - a.nombre.length)[0];
  return hit ? hit.slug : null;
}

// Una de las opciones de un cardio «a elegir» («Bicicleta», «Caminadora
// trotando»): primero como el título; si no, por la primera palabra
// («Bicicleta» → Bicicleta estática).
export function slugDeOpcion(nombre, catalogo = []) {
  const s = slugDeEvento(nombre, catalogo);
  if (s) return s;
  const primera = normTxt(nombre).split(/\s+/)[0];
  if (!primera || primera.length < 4) return null;
  const hit = (catalogo || []).find(a => a && a.slug !== 'otro' && a.nombre && normTxt(a.nombre).split(/\s+/)[0] === primera);
  return hit ? hit.slug : null;
}

// Las opciones de un cardio «a elegir» (columna `eventos.opciones`,
// carga/migracion-cardio-opciones.sql): { lista, minutos, intensidad }.
// Lo que no sirva se descarta; sin lista, null.
export function opcionesDeEvento(ev, catalogo = []) {
  const o = ev && ev.opciones;
  if (!o || typeof o !== 'object') return null;
  const lista = (Array.isArray(o.lista) ? o.lista : []).map(x => String(x || '').trim().slice(0, 60)).filter(Boolean).slice(0, 6);
  if (!lista.length) return null;
  const minutos = [...new Set((Array.isArray(o.minutos) ? o.minutos : []).map(Number).filter(n => Number.isFinite(n) && n > 0 && n <= 240))].sort((a, b) => a - b).slice(0, 8);
  const intensidad = ['suave', 'moderada', 'alta'].includes(o.intensidad) ? o.intensidad : null;
  return { lista: lista.map(nombre => ({ nombre, slug: slugDeOpcion(nombre, catalogo) })), minutos, intensidad };
}

const DESPUES = /despues de (entrenar|la rutina|la fuerza|las pesas)|al terminar|post ?entreno/;

// ¿Se hace al terminar la fuerza? Lo dice el título (o el detalle), o que la
// actividad sea de las de remate del catálogo (caminadora, elíptica…).
export function esDespuesDeEntrenar(ev, catalogo = []) {
  if (!ev || ev.tipo !== 'actividad') return false;
  if (DESPUES.test(normTxt(`${ev.titulo || ''} ${ev.detalle || ''}`))) return true;
  const slug = slugDeEvento(ev.titulo, catalogo);
  const a = (catalogo || []).find(x => x.slug === slug);
  return !!(a && a.remate);
}
