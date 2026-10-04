// ─────────────────────────────────────────────────────────────────────────
// RECORRIDO GUIADO DE LA APP · visual nueva
//
// La primera vez (y cuando la persona quiera repetirlo desde «Sobre el
// programa»): paso a paso por la app de verdad, parte por parte: rutina y
// videos, calendario, galería, chat, recetas, lecturas, gráficas del Dash.
// En cada paso se abre esa parte y se ilumina; lo demás queda en penumbra.
//
// No tiene «X» ni se cierra tocando afuera: termina solo con «Finalizar»
// (así lo pidió el coach). Se puede ir hacia atrás.
//
// Por ahora NO sale solo: se lanza a mano. Cuando el coach lo diga, se
// prende RECORRIDO_AUTO (recorridoEstado.js) y sale a quien no lo ha hecho.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from '@phosphor-icons/react';
import { registrarLectura } from './aprendizaje.js';
import { vibrar } from './Celebraciones.jsx';
import { TEXT, TEXT_MUTED, SECCION } from './theme.js';

import { CLAVE_RECORRIDO as CLAVE } from './recorridoEstado.js';

// En cada paso: qué se abre (sec y op, como la barra) y qué se ilumina.
//   foco: 'nav' · { barra: 'aria-label de un botón de la barra' } · { el: 'selector' }
const E = SECCION.entreno.base, C = SECCION.comida.base, A = SECCION.aprende.base, D = SECCION.dash.base;
const PASOS = [
  { color: '#1F1F1F', etiqueta: 'BIENVENIDA', titulo: 'Esta es tu app del programa.',
    texto: 'Tu entrenamiento, tu alimentación y tu aprendizaje, en un solo lugar. Te muestro dónde está cada cosa.' },
  { foco: 'nav', color: '#1F1F1F', etiqueta: 'LA BARRA', titulo: 'Cuatro secciones, abajo.',
    texto: 'Dash, Entrenamiento, Alimentación y Aprendizaje. Al tocar una, a su lado aparecen sus opciones.' },
  // Entrenamiento
  { sec: 'entreno', op: 'hoy', foco: { barra: 'Hoy' }, color: E, etiqueta: 'ENTRENAMIENTO · HOY', titulo: 'Lo que te toca hoy.',
    texto: 'Tu rutina del día y, debajo, cómo va tu semana.' },
  { sec: 'entreno', op: 'hoy', foco: { el: '[data-hoy-rutina], [data-hoy-te-toca]' }, color: E, etiqueta: 'TU RUTINA', titulo: 'Tócala y entrenas.',
    texto: 'Cada ejercicio con su video, sus series, repeticiones y descanso. Marcas cada serie con su peso y el entreno arranca solo.' },
  { sec: 'entreno', op: 'mes', foco: { barra: 'Calendario' }, color: E, etiqueta: 'CALENDARIO', titulo: 'Tu mes y tu semana.',
    texto: 'Lo que te toca cada día. Si algo cambia, mueves la rutina a otro día de la semana o añades un cardio o un deporte.' },
  { sec: 'entreno', op: 'galeria', foco: { barra: 'Galería' }, color: E, etiqueta: 'GALERÍA', titulo: 'Todos tus ejercicios.',
    texto: 'Cada ejercicio de tu plan con su video y los músculos que trabaja.' },
  // Alimentación
  { sec: 'comida', op: 'hoy', foco: { barra: 'Hoy' }, color: C, etiqueta: 'ALIMENTACIÓN · HOY', titulo: 'Cómo vas con tu meta.',
    texto: 'Tus calorías y macros del día, en anillos que se llenan con cada comida.' },
  { sec: 'comida', op: 'chat', foco: { el: '.msg-input' }, color: C, etiqueta: 'CHAT', titulo: 'Escribe o dicta lo que comiste.',
    texto: '«Dos huevos y una arepa» y listo: queda registrado contra tu meta. También le puedes preguntar qué comer.' },
  { sec: 'comida', op: 'recetas', foco: { barra: 'Recetas' }, color: C, etiqueta: 'RECETAS', titulo: 'Ideas que encajan en tu meta.',
    texto: 'Cada receta al tamaño que te toca, y tu día o tu semana organizados con su lista de mercado.' },
  { sec: 'comida', op: 'hoy', foco: { barra: 'Calendario' }, color: C, etiqueta: 'CALENDARIO DE COMIDAS', titulo: 'Cada día, cómo te fue.',
    texto: 'Qué comiste cada día y qué tan cerca quedaste de tu meta, por mes, semana y día.' },
  // Aprendizaje
  { sec: 'aprende', op: 'lecturas', foco: { barra: 'Lecturas' }, color: A, etiqueta: 'LECTURAS', titulo: 'Cápsulas y guía de alimentación.',
    texto: 'Temas cortos de entrenamiento, nutrición y bienestar, y la guía, capítulo a capítulo.' },
  { sec: 'aprende', op: 'videos', foco: { barra: 'Videos' }, color: A, etiqueta: 'VIDEOS', titulo: 'Para ver o escuchar.',
    texto: 'Los episodios que te recomiendo, cuando quieras.' },
  { sec: 'aprende', op: 'programa', foco: { barra: 'Sobre el programa' }, color: A, etiqueta: 'SOBRE EL PROGRAMA', titulo: 'Cómo funciona tu proceso.',
    texto: 'El método, sus pilares, las fases de tu trayecto y las preguntas frecuentes.' },
  // Dash
  { sec: 'dash', foco: { el: '[data-tarjeta="Entrenamiento"]' }, color: D, etiqueta: 'DASH', titulo: 'Tu avance, en gráficas.',
    texto: 'Tu constancia de entreno y qué tan cerca vas de tu meta de comida, semana a semana.' },
  { sec: 'dash', foco: { barra: 'Dash' }, color: D, etiqueta: 'DASH', titulo: 'Y mucho más.',
    texto: 'Tus pesos, tu composición corporal, tu aprendizaje y el botón para escribirme por WhatsApp.' },
  { color: '#1F1F1F', etiqueta: 'LISTO', titulo: 'Ya conoces tu app.',
    texto: 'Cuando el calendario te pida pesarte, fotos o medidas, la app te avisa al abrirla. Cualquier duda, me escribes. Vamos.' },
];

export default function RecorridoApp({ nombre, alIr, alTerminar }) {
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState(null);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  useEffect(() => { if (paso.sec && alIr) alIr(paso.sec, paso.op); }, [i]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Dónde está lo que se ilumina (se vuelve a medir al cambiar de paso y al
  // girar el teléfono; la barra se acomoda un instante después de abrir).
  useLayoutEffect(() => {
    if (!paso.foco) { setCaja(null); return; }
    const buscar = () => {
      const nav = document.querySelector('nav[aria-label="Secciones"]');
      if (paso.foco === 'nav') return nav;
      if (paso.foco.barra) return nav && nav.querySelector(`[aria-label="${paso.foco.barra}"]`);
      return [...document.querySelectorAll(paso.foco.el)].find(x => x.getBoundingClientRect().height > 0) || null;
    };
    let movido = false;
    const medir = () => {
      const el = buscar();
      if (!el) { setCaja(null); return; }
      // Lo de la pantalla se trae a la vista antes de iluminarlo.
      if (paso.foco.el && !movido) { movido = true; try { el.scrollIntoView({ block: 'center' }); } catch (e) { /* nada */ } }
      const r = el.getBoundingClientRect();
      setCaja({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12, redondo: !paso.foco.el });
    };
    medir();
    const t1 = setTimeout(medir, 260), t2 = setTimeout(medir, 700), t3 = setTimeout(medir, 1300);
    window.addEventListener('resize', medir);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); window.removeEventListener('resize', medir); };
  }, [i, paso.foco]);

  const terminar = () => {
    try { localStorage.setItem(CLAVE, new Date().toISOString()); } catch (e) { /* sin almacenamiento */ }
    registrarLectura(nombre, 'hub', 'recorrido', 'Recorrido de la app');
    vibrar([16, 40, 16]);
    alTerminar && alTerminar();
  };

  return (
    <div data-recorrido role="dialog" aria-modal="true" aria-label="Recorrido de la app" style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
      <style>{CSS}</style>
      {/* Penumbra con un hueco sobre lo que se explica */}
      {caja ? (
        <div data-foco style={{
          position: 'fixed', left: caja.x, top: caja.y, width: caja.w, height: caja.h, borderRadius: caja.redondo ? 999 : 22,
          boxShadow: '0 0 0 9999px rgba(20,20,18,0.66)', outline: `3px solid ${paso.color}`, outlineOffset: 0,
          transition: 'left .35s cubic-bezier(.2,.8,.2,1), top .35s, width .35s, height .35s', pointerEvents: 'none',
        }} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,18,0.66)' }} />
      )}
      {/* Bloquea los toques en la app mientras dura el recorrido */}
      <div style={{ position: 'fixed', inset: 0 }} />

      <div key={i} className="rec-tarjeta" style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: 'min(90vw, 380px)',
        // Arriba de lo iluminado si está en la mitad de abajo; si no, debajo.
        ...(!caja ? { top: '50%', marginTop: -150 }
          : caja.y > window.innerHeight / 2 ? { bottom: Math.max(16, window.innerHeight - caja.y + 14) }
          : { top: Math.min(window.innerHeight - 300, caja.y + caja.h + 14) }),
        background: '#FFFFFF', borderRadius: 24, padding: '20px 20px 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.30)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: paso.color }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', color: TEXT_MUTED }}>{paso.etiqueta}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>{i + 1} de {PASOS.length}</span>
        </div>
        <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12, color: TEXT, marginTop: 8 }}>{paso.titulo}</div>
        <p style={{ fontSize: 15.5, lineHeight: 1.5, color: TEXT_MUTED, margin: '8px 0 0' }}>{paso.texto}</p>
        {/* Avance */}
        <div style={{ display: 'flex', gap: 5, marginTop: 16 }}>
          {PASOS.map((_, k) => (
            <span key={k} style={{ flex: 1, height: 4, borderRadius: 99, background: k <= i ? paso.color : '#ECEAE3', transition: 'background .3s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {i > 0 && (
            <button onClick={() => setI(i - 1)} aria-label="Atrás" style={{ ...boton, flex: 'none', width: 50, background: '#F1EFE9', color: TEXT }}>
              <ArrowLeft size={20} weight="bold" />
            </button>
          )}
          <button data-rec-siguiente onClick={() => (ultimo ? terminar() : setI(i + 1))} style={{ ...boton, flex: 1, background: '#1F1F1F', color: '#fff' }}>
            {ultimo ? <>Finalizar <Check size={19} weight="bold" /></> : i === 0 ? <>Empezar <ArrowRight size={19} weight="bold" /></> : <>Siguiente <ArrowRight size={19} weight="bold" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

const boton = { height: 50, borderRadius: 15, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 750, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
const CSS = `
@keyframes rec-entra { from { opacity: 0; transform: translate(-50%, 12px) scale(.98) } to { opacity: 1; transform: translate(-50%, 0) scale(1) } }
.rec-tarjeta { animation: rec-entra .35s cubic-bezier(.2,.8,.2,1) both; }
@media (prefers-reduced-motion: reduce) { .rec-tarjeta { animation: none } }`;
