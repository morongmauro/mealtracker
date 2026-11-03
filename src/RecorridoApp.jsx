// ─────────────────────────────────────────────────────────────────────────
// RECORRIDO GUIADO DE LA APP · visual nueva
//
// La primera vez (y cuando la persona quiera repetirlo desde la
// configuración): paso a paso por la app de verdad, solo lo principal y en
// orden de prioridad. En cada paso se abre esa parte, se marca en la página
// y en la barra, y la explicación sale en una burbuja que apunta al botón.
//
// No tiene «X» ni se cierra tocando afuera: termina solo con «Finalizar»
// (así lo pidió el coach). Se puede ir hacia atrás.
//
// Por ahora NO sale solo: se lanza a mano. Cuando el coach lo diga, se
// prende RECORRIDO_AUTO (recorridoEstado.js) y sale a quien no lo ha hecho.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from '@phosphor-icons/react';
import { registrarLectura } from './aprendizaje.js';
import { vibrar } from './Celebraciones.jsx';
import { TEXT, TEXT_MUTED, SECCION, DASH_AZUL } from './theme.js';

import { CLAVE_RECORRIDO as CLAVE } from './recorridoEstado.js';

// En cada paso: qué se abre (sec y op, como la barra), qué botón de la barra
// se marca (barra: su aria-label) y qué parte de la página se marca (area).
// Solo lo principal, en orden de prioridad (9 pasos); las herramientas se
// mencionan al final. La página queda a la vista: se marca, no se oscurece.
const E = SECCION.entreno.base, C = SECCION.comida.base, A = SECCION.aprende.base, D = DASH_AZUL.base;
const CENTRO = 'iframe[title="Centro de aprendizaje"]';
const PASOS = [
  { color: '#1F1F1F', etiqueta: 'Bienvenida', titulo: 'Esta es tu app del programa.',
    texto: 'Te muestro lo principal en 9 pasos: dónde está cada cosa y para qué sirve.' },
  { sec: 'dash', barra: 'Dash', area: '[data-tarjeta="Entrenamiento"], [data-tarjeta="Alimentación"], [data-cabecera-hoy="dash"]', color: D, etiqueta: 'Dash', titulo: 'Tu avance, en gráficas.',
    texto: 'Cómo vas semana a semana con tu entreno y tu comida. Arriba, el resumen de tu semana.' },
  { sec: 'entreno', op: 'hoy', barra: 'Hoy', area: '[data-hoy-te-toca], [data-hoy-rutina]', color: E, etiqueta: 'Entrenamiento · hoy', titulo: 'Lo que te toca hoy.',
    texto: 'Tu rutina del día. La tocas y entras a entrenar.' },
  // La rutina abierta (solo se mira: abrirla no empieza el entreno; empieza
  // al marcar la primera serie). Si hoy no hay rutina, se explica igual.
  { sec: 'entreno', op: 'hoy', abrir: '[data-hoy-rutina]', area: '[data-ejercicio]', unir: 3, color: E, etiqueta: 'Tu rutina', titulo: 'Tus ejercicios, uno a uno.',
    texto: 'Cada ejercicio con su video, sus series, repeticiones y descanso. Marcas cada serie con su peso y el entreno avanza solo.' },
  { sec: 'entreno', op: 'mes', barra: 'Calendario', area: '[data-calendario-v2]', color: E, etiqueta: 'Calendario de entreno', titulo: 'Tu mes de entreno.',
    texto: 'Qué te toca cada día. Si algo cambia, mueves la rutina de día o añades un cardio o un deporte.' },
  { sec: 'comida', op: 'hoy', barra: 'Hoy', area: '[data-prota-comida], [data-dia-comidas], [data-cabecera-hoy="comida"]', color: C, etiqueta: 'Alimentación · hoy', titulo: 'Anota lo que comes.',
    texto: 'Aquí mismo la dices o la escribes, y tus anillos del día se llenan con cada comida.' },
  { sec: 'comida', op: 'chat', barra: 'Chat', area: '.msg-input', color: C, etiqueta: 'Chat', titulo: 'Escribe o dicta lo que comiste.',
    texto: '«Dos huevos y una arepa» y listo: queda registrado contra tu meta. También le puedes preguntar qué comer.' },
  { sec: 'comida', op: 'recetas', barra: 'Recetas', area: '[data-receta-foto]', unir: 2, tarjeta: true, color: C, etiqueta: 'Recetas', titulo: 'Recetas que encajan en tu meta.',
    texto: 'Cada receta al tamaño que te toca, y tu día o tu semana organizados con su lista de mercado.' },
  { sec: 'aprende', op: 'lecturas', barra: 'Lecturas', area: CENTRO, color: A, etiqueta: 'Cápsulas', titulo: 'Aprende en un minuto.',
    texto: 'Cápsulas cortas de entrenamiento, nutrición y bienestar, y la guía de alimentación.' },
  { sec: 'aprende', op: 'videos', barra: 'Videos', area: CENTRO, color: A, etiqueta: 'Podcast', titulo: 'Para ver o escuchar.',
    texto: 'Los episodios recomendados, cuando quieras.' },
  { color: '#1F1F1F', etiqueta: 'Listo', titulo: 'Ya conoces lo principal.',
    texto: 'Las herramientas (pesarte, medidas, lista de mercado…) están en cada sección, en el botón de cuadritos. Cualquier duda, escríbele a tu coach.' },
];
const NUCLEO = PASOS.length - 2;   // los pasos numerados (sin bienvenida ni cierre)

export default function RecorridoApp({ nombre, alIr, alTerminar }) {
  const [i, setI] = useState(0);
  const [marcas, setMarcas] = useState(null);   // { area, boton, nav }
  const [altoTarjeta, setAltoTarjeta] = useState(230);
  const tarjeta = useRef(null);
  const abrio = useRef(false);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  useEffect(() => {
    if (paso.sec && alIr) alIr(paso.sec, paso.op);
    // La rutina se abre solo en su paso; en los demás se cierra.
    // (Solo cierra la que abrió el recorrido: si estaba entrenando, no la toca.)
    if (!paso.abrir) { if (abrio.current) { abrio.current = false; window.dispatchEvent(new Event('mt:cerrarRutina')); } return undefined; }
    const t = setTimeout(() => { const el = document.querySelector(paso.abrir); if (el) { abrio.current = true; el.click(); } }, 650);
    return () => clearTimeout(t);
  }, [i]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (abrio.current) window.dispatchEvent(new Event('mt:cerrarRutina')); }, []);
  useLayoutEffect(() => { if (tarjeta.current) setAltoTarjeta(tarjeta.current.getBoundingClientRect().height); }, [i]);

  // Dónde está lo que se marca (se vuelve a medir al cambiar de paso y al
  // girar el teléfono; la página y la barra se acomodan un instante después).
  useLayoutEffect(() => {
    if (!paso.sec) { setMarcas(null); return; }
    let movido = false;
    const medir = () => {
      const nav = document.querySelector('nav[aria-label="Secciones"]');
      const boton = paso.barra && nav ? nav.querySelector(`[aria-label="${paso.barra}"]`) : null;
      // La primera parte que se ve de la lista de selectores (en su orden);
      // con `unir`, las primeras N juntas (los ejercicios, las recetas).
      let partes = [];
      for (const sel of (paso.area ? paso.area.split(',') : [])) {
        partes = [...document.querySelectorAll(sel.trim())].filter(x => x.getBoundingClientRect().height > 0);
        if (partes.length) break;
      }
      if (paso.tarjeta) partes = partes.map(x => x.closest('button, a, [role="button"]') || x.parentElement || x);
      partes = partes.slice(0, paso.unir || 1);
      if (partes[0] && !movido) { movido = true; try { partes[0].scrollIntoView({ block: 'start' }); } catch (e) { /* nada */ } }
      const r = (el) => { if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; };
      let area = null;
      if (partes.length) {
        const qs = partes.map(x => x.getBoundingClientRect());
        const x0 = Math.min(...qs.map(q => q.left)), y0 = Math.min(...qs.map(q => q.top));
        const x1 = Math.max(...qs.map(q => q.right)), y1 = Math.max(...qs.map(q => q.bottom));
        area = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      setMarcas({ area, boton: r(boton), nav: r(nav) });
    };
    medir();
    const t1 = setTimeout(medir, 260), t2 = setTimeout(medir, 700), t3 = setTimeout(medir, 1300), t4 = setTimeout(medir, 2000);
    window.addEventListener('resize', medir);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); window.removeEventListener('resize', medir); };
  }, [i, paso.sec, paso.area, paso.barra, paso.unir, paso.tarjeta]);

  const terminar = () => {
    try { localStorage.setItem(CLAVE, new Date().toISOString()); } catch (e) { /* sin almacenamiento */ }
    registrarLectura(nombre, 'hub', 'recorrido', 'Recorrido de la app');
    vibrar([16, 40, 16]);
    alTerminar && alTerminar();
  };

  // La burbuja va justo encima de la barra, con su pico hacia el botón. Si lo
  // marcado de la página queda abajo (el chat), la burbuja sube arriba.
  const H = typeof window !== 'undefined' ? window.innerHeight : 800;
  const W = typeof window !== 'undefined' ? window.innerWidth : 390;
  const ancho = Math.min(W * 0.9, 380), izq = (W - ancho) / 2;
  const techoBarra = marcas?.nav ? marcas.nav.y : H - 16;
  const areaAbajo = !!(marcas?.area && marcas.area.y + marcas.area.h / 2 > H * 0.55);
  const arriba = !!marcas && areaAbajo;
  const posTarjeta = !marcas ? { top: '50%', marginTop: -altoTarjeta / 2 }
    : arriba ? { top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }
    : { bottom: Math.max(16, H - techoBarra + 14) };
  // Lo marcado de la página, recortado a lo que queda a la vista.
  let caja = null;
  if (marcas?.area) {
    const a = marcas.area;
    const tope = arriba ? 14 + altoTarjeta + 12 : 8;
    const piso = arriba ? techoBarra - 8 : H - Math.max(16, H - techoBarra + 14) - altoTarjeta - 12;
    const y0 = Math.max(a.y - 6, tope), y1 = Math.min(a.y + a.h + 6, piso);
    if (y1 - y0 > 40) caja = { x: Math.max(8, a.x - 6), y: y0, w: Math.min(W - 16, a.w + 12), h: y1 - y0 };
  }
  const b = marcas?.boton;
  const pico = b && !arriba ? Math.min(ancho - 34, Math.max(20, b.x + b.w / 2 - izq - 13)) : null;
  const n = i >= 1 && i <= NUCLEO ? i : null;

  return (
    <div data-recorrido role="dialog" aria-modal="true" aria-label="Recorrido de la app" style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
      <style>{CSS}</style>
      {/* La página queda a la vista: solo un velo claro y suave. */}
      <div style={{ position: 'fixed', inset: 0, background: marcas ? 'rgba(243,241,235,0.28)' : 'rgba(243,241,235,0.55)', WebkitBackdropFilter: marcas ? 'none' : 'blur(6px)', backdropFilter: marcas ? 'none' : 'blur(6px)' }} />
      {caja && (
        <div data-foco-area style={{
          position: 'fixed', left: caja.x, top: caja.y, width: caja.w, height: caja.h, borderRadius: 24, pointerEvents: 'none',
          boxShadow: `0 0 0 3px ${paso.color}, 0 0 0 10px ${paso.color}2E`, transition: 'all .35s cubic-bezier(.2,.8,.2,1)',
        }} />
      )}
      {b && (
        <div data-foco-boton style={{
          position: 'fixed', left: b.x - 6, top: b.y - 6, width: b.w + 12, height: b.h + 12, borderRadius: 999, pointerEvents: 'none',
          boxShadow: `0 0 0 3px ${paso.color}, 0 0 0 12px ${paso.color}38`, transition: 'all .35s cubic-bezier(.2,.8,.2,1)',
        }} className="rec-pulso" />
      )}
      {/* Bloquea los toques en la app mientras dura el recorrido */}
      <div style={{ position: 'fixed', inset: 0 }} />

      <div key={i} ref={tarjeta} className="rec-tarjeta" style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: ancho, boxSizing: 'border-box', ...posTarjeta,
        background: '#FFFFFF', borderRadius: 24, padding: '18px 18px 14px', boxShadow: '0 14px 40px rgba(40,40,30,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: paso.color }} />
          <span style={{ fontSize: 12.5, fontWeight: 750, color: TEXT_MUTED }}>{paso.etiqueta}</span>
          {n && <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>{n} de {NUCLEO}</span>}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12, color: TEXT, marginTop: 6 }}>{paso.titulo}</div>
        <p style={{ fontSize: 15, lineHeight: 1.45, color: TEXT_MUTED, margin: '6px 0 0' }}>{paso.texto}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {i > 0 && (
            <button onClick={() => setI(i - 1)} aria-label="Atrás" style={{ ...boton, flex: 'none', width: 48, background: '#F1EFE9', color: TEXT }}>
              <ArrowLeft size={20} weight="bold" />
            </button>
          )}
          <button data-rec-siguiente onClick={() => (ultimo ? terminar() : setI(i + 1))} style={{ ...boton, flex: 1, background: '#1F1F1F', color: '#fff' }}>
            {ultimo ? <>Finalizar <Check size={19} weight="bold" /></> : i === 0 ? <>Empezar <ArrowRight size={19} weight="bold" /></> : <>Siguiente <ArrowRight size={19} weight="bold" /></>}
          </button>
        </div>
        {pico !== null && (
          <svg aria-hidden="true" width="26" height="14" style={{ position: 'absolute', bottom: -13, left: pico }}><path d="M0 0 L13 14 L26 0Z" fill="#FFFFFF" /></svg>
        )}
      </div>
    </div>
  );
}

const boton = { height: 46, borderRadius: 14, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 750, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const CSS = `
@keyframes rec-entra { from { opacity: 0; transform: translate(-50%, 12px) scale(.98) } to { opacity: 1; transform: translate(-50%, 0) scale(1) } }
.rec-tarjeta { animation: rec-entra .35s cubic-bezier(.2,.8,.2,1) both; }
@keyframes rec-pulso { 0%, 100% { opacity: 1 } 50% { opacity: .55 } }
.rec-pulso { animation: rec-pulso 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .rec-tarjeta, .rec-pulso { animation: none } }`;
