// ─────────────────────────────────────────────────────────────────────────
// RECORRIDO GUIADO DE LA APP · visual nueva
//
// La primera vez (y cuando la persona quiera repetirlo desde «Acerca del
// programa»): paso a paso por la app de verdad. En cada paso se abre la
// sección de la que se habla y se ilumina su botón en la barra; lo demás
// queda en penumbra.
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

// sec: la sección que se abre en ese paso · foco: lo que se ilumina.
const PASOS = [
  { sec: null, foco: null, color: '#1F1F1F', etiqueta: 'BIENVENIDA', titulo: 'Esta es tu app del programa.',
    texto: 'Tu entrenamiento, tu alimentación y tu aprendizaje, en un solo lugar. Te muestro dónde está cada cosa: son dos minutos.' },
  { sec: null, foco: 'nav', color: '#1F1F1F', etiqueta: 'LA BARRA', titulo: 'Cuatro secciones, abajo.',
    texto: 'Dash, Entrenamiento, Alimentación y Aprendizaje. Al tocar una se abre en su «Hoy», y a su lado aparecen sus opciones.' },
  { sec: 'entreno', foco: 'Entrenamiento', color: SECCION.entreno.base, etiqueta: 'ENTRENAMIENTO', titulo: 'Lo que te toca hoy.',
    texto: 'Abres tu rutina, ves el video de cada ejercicio y marcas cada serie con su peso y repeticiones. El entreno arranca solo con la primera serie. En Calendario ves tu semana y puedes mover un día.' },
  { sec: 'comida', foco: 'Alimentación', color: SECCION.comida.base, etiqueta: 'ALIMENTACIÓN', titulo: 'Escribe o dicta lo que comiste.',
    texto: 'Queda registrado frente a tu meta del día y ves cuánto llevas. En Recetas tienes ideas que encajan en tu meta; en el calendario, cómo te fue cada día.' },
  { sec: 'aprende', foco: 'Aprendizaje', color: SECCION.aprende.base, etiqueta: 'APRENDIZAJE', titulo: 'Lo que te ayuda a entender.',
    texto: 'Lecturas (cápsulas y guía de alimentación), Videos y «Acerca del programa». En «Hoy» te digo qué ver primero.' },
  { sec: 'dash', foco: 'Dash', color: SECCION.dash.base, etiqueta: 'DASH', titulo: 'Tu avance, en números.',
    texto: 'Tu constancia de entreno, qué tan cerca vas de tu meta de comida, tus pesos y tu composición corporal. Desde aquí también me escribes por WhatsApp.' },
  { sec: null, foco: null, color: '#1F1F1F', etiqueta: 'LISTO', titulo: 'Ya conoces tu app.',
    texto: 'Cuando el calendario te pida pesarte, fotos o medidas, la app te avisa al abrirla. Cualquier duda, me escribes. Vamos.' },
];

export default function RecorridoApp({ nombre, alIr, alTerminar }) {
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState(null);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  useEffect(() => { if (paso.sec && alIr) alIr(paso.sec); }, [i]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Dónde está lo que se ilumina (se vuelve a medir al cambiar de paso y al
  // girar el teléfono; la barra se acomoda un instante después de abrir).
  useLayoutEffect(() => {
    if (!paso.foco) { setCaja(null); return; }
    const medir = () => {
      const nav = document.querySelector('nav[aria-label="Secciones"]');
      const el = paso.foco === 'nav' ? nav : nav && nav.querySelector(`[aria-label="${paso.foco}"]`);
      if (!el) { setCaja(null); return; }
      const r = el.getBoundingClientRect();
      setCaja({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
    };
    medir();
    const t1 = setTimeout(medir, 260), t2 = setTimeout(medir, 700);
    window.addEventListener('resize', medir);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', medir); };
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
          position: 'fixed', left: caja.x, top: caja.y, width: caja.w, height: caja.h, borderRadius: 999,
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
        top: caja ? 'auto' : '50%', bottom: caja ? `calc(${Math.max(16, (window.innerHeight - caja.y) + 14)}px)` : 'auto',
        marginTop: caja ? 0 : -150,
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
