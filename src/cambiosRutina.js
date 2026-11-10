// ─────────────────────────────────────────────────────────────────────────
// «CAMBIÓ TU RUTINA» · el aviso con detalle, en la campanita
//
// Cuando el coach edita el plan en el CRM (por donde sea: el constructor, el
// agente, copiar un ciclo), al cliente le llega QUÉ cambió: «Cambió tu rutina
// Push · Nuevo: Hip thrust · 1 quitado». No hace falta que el CRM anote nada:
// el plan trae la «huella» de cada rutina (sus ejercicios con series y reps) y
// la app la compara con la que vio la última vez en este teléfono.
//
// La primera vez (sin nada guardado) no avisa: solo guarda lo que hay. Los
// avisos viven 14 días y como mucho quedan los 8 más recientes.
// ─────────────────────────────────────────────────────────────────────────
import { Barbell } from '@phosphor-icons/react';
import { publicarAvisos, hace } from './avisosCoach.js';
import { enVerComo } from './verComo.js';

const K_HUELLA = (n) => `mt:huellaPlan:${String(n || '').toLowerCase()}`;
const K_AVISOS = (n) => `mt:cambiosRutina:${String(n || '').toLowerCase()}`;
const VIDA_MS = 14 * 24 * 3600 * 1000;

const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };

const lista = (xs, tope = 2) => (xs.length <= tope ? xs.join(', ') : `${xs.slice(0, tope).join(', ')} y ${xs.length - tope} más`);

// Compara la huella guardada con la nueva y devuelve los avisos nuevos.
export function compararHuellas(antes, ahora) {
  if (!antes || !ahora) return [];
  const out = [];
  if (antes.fase !== ahora.fase) {
    out.push({ clave: `fase:${ahora.fase}`, texto: `Te envió un ciclo nuevo${ahora.faseNombre ? `: ${ahora.faseNombre}` : ''}`, sub: 'Mira tus rutinas en Entreno' });
    return out;
  }
  Object.entries(ahora.rutinas || {}).forEach(([id, r]) => {
    const a = (antes.rutinas || {})[id];
    if (!a) { out.push({ clave: `nueva:${id}`, texto: `Rutina nueva: ${r.nombre}`, sub: `${Object.keys(r.ejs).length} ejercicios` }); return; }
    const nuevos = Object.keys(r.ejs).filter(e => !(e in a.ejs));
    const quitados = Object.keys(a.ejs).filter(e => !(e in r.ejs));
    const distintos = Object.keys(r.ejs).filter(e => e in a.ejs && r.ejs[e].p !== a.ejs[e].p);
    if (!nuevos.length && !quitados.length && !distintos.length) return;
    const partes = [];
    if (nuevos.length) partes.push(`Nuevo: ${lista(nuevos.map(e => r.ejs[e].n || 'un ejercicio'))}`);
    if (quitados.length) partes.push(`${quitados.length} quitado${quitados.length === 1 ? '' : 's'}`);
    if (distintos.length) partes.push(`${distintos.length} con series o repeticiones distintas`);
    // La clave cambia con el contenido: otra edición después es otro aviso.
    const firma = [...nuevos, '-', ...quitados, '~', ...distintos.map(e => `${e}=${r.ejs[e].p}`)].join(',');
    out.push({ clave: `cambio:${id}:${firma}`, texto: `Cambió tu rutina ${r.nombre}`, sub: partes.join(' · ') });
  });
  Object.entries(antes.rutinas || {}).forEach(([id, a]) => {
    if (!(ahora.rutinas || {})[id]) out.push({ clave: `fuera:${id}`, texto: `Quitó la rutina ${a.nombre}`, sub: 'Ya no está en tu plan' });
  });
  return out;
}

// La huella del plan tal como llega del servidor (plan.huella).
function huellaDe(plan) {
  if (!plan || !plan.ok || !plan.fase || !plan.huella) return null;
  const rutinas = {};
  (plan.huella || []).forEach(r => {
    const ejs = {};
    (r.ejercicios || []).forEach(x => { ejs[String(x[0])] = { n: x[1] || '', p: `${x[2] == null ? '' : x[2]}x${x[3] == null ? '' : x[3]}` }; });
    rutinas[String(r.id)] = { nombre: r.nombre, ejs };
  });
  return { fase: String(plan.fase.id || plan.fase.nombre || ''), faseNombre: plan.fase.nombre || '', rutinas };
}

// Cómo se va a Entreno: lo da la app una vez y sirve para las demás llamadas.
let irGuardado = null;
function publicar(name, alIr) {
  if (alIr) irGuardado = alIr;
  const ahora = Date.now();
  const vivos = leer(K_AVISOS(name), []).filter(a => ahora - a.t < VIDA_MS);
  publicarAvisos('cambios', vivos.map(a => ({
    id: `plan:${a.clave}`, texto: a.texto, sub: a.sub, cuando: hace(new Date(a.t).toISOString()),
    Icono: Barbell, color: '#5F6670', ir: irGuardado,
  })));
}

// Se llama cada vez que llega el plan. `alIr` lleva a Entreno.
export function registrarCambiosPlan(name, plan, alIr = null) {
  if (!name) return;
  const nueva = huellaDe(plan);
  if (nueva && !enVerComo()) {
    const antes = leer(K_HUELLA(name), null);
    const nuevos = compararHuellas(antes, nueva);
    if (nuevos.length) {
      const ahora = Date.now();
      const previos = leer(K_AVISOS(name), []).filter(a => ahora - a.t < VIDA_MS && !nuevos.some(n => n.clave === a.clave));
      guardar(K_AVISOS(name), [...nuevos.map(n => ({ ...n, t: ahora })), ...previos].slice(0, 8));
    }
    guardar(K_HUELLA(name), nueva);
  }
  publicar(name, alIr);
}
