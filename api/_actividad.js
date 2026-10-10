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
