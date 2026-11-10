// ─────────────────────────────────────────────────────────────────────────
// AVISOS DE TU COACH · lo que vive en la campanita
//
// La primera tarjeta del Dash es «lo que haces hoy». Todo lo demás (te
// respondió una nota, cambió tu entrenamiento, te pidió un video, hay
// aprendizaje por ver, la encuesta…) son avisos para leer cuando se pueda:
// viven en la campanita, con un punto azul mientras no se han leído.
//
// Cada pantalla publica su parte (el Dash, la respuesta del coach, la app) y
// la campanita las junta en un orden fijo. «Leído» se guarda en el teléfono.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

const ORDEN = ['respuesta', 'cambios', 'app', 'dash'];
const partes = {};
const oyentes = new Set();
const CLAVE = 'mt:avisosLeidos';

const avisar = () => { oyentes.forEach(f => { try { f(); } catch (e) { /* un oyente roto no tumba a los demás */ } }); };

// Publica (o reemplaza) los avisos de una parte. Cada aviso:
// { id, texto, sub?, Icono, color, ir?, enDash? }.
export function publicarAvisos(parte, lista) {
  partes[parte] = Array.isArray(lista) ? lista : [];
  avisar();
}

export function todosLosAvisos() {
  const claves = [...ORDEN, ...Object.keys(partes).filter(k => !ORDEN.includes(k))];
  return claves.flatMap(k => partes[k] || []);
}

function leidos() {
  try { const v = JSON.parse(localStorage.getItem(CLAVE) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); }
}

export const avisoLeido = (id) => leidos().has(String(id));

export function marcarAvisosLeidos(ids) {
  const s = leidos();
  let cambio = false;
  (ids || []).forEach(id => { if (!s.has(String(id))) { s.add(String(id)); cambio = true; } });
  if (!cambio) return;
  // Solo los últimos 200: la lista no crece sin fin.
  try { localStorage.setItem(CLAVE, JSON.stringify([...s].slice(-200))); } catch (e) { /* sin almacenamiento */ }
  avisar();
}

export function avisosSinLeer() {
  const s = leidos();
  return todosLosAvisos().filter(a => !s.has(String(a.id))).length;
}

// «hace 2 h», «ayer», «hace 3 días».
export function hace(iso) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 60) return min <= 1 ? 'hace un momento' : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

// Para pintar: la lista y cuántos faltan por leer, al día.
export function useAvisosCoach() {
  const [, tic] = useState(0);
  useEffect(() => {
    const f = () => tic(n => n + 1);
    oyentes.add(f);
    return () => { oyentes.delete(f); };
  }, []);
  const s = leidos();
  const lista = todosLosAvisos().map(a => ({ ...a, leido: s.has(String(a.id)) }));
  return { lista, sinLeer: lista.filter(a => !a.leido).length };
}
