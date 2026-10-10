// ─────────────────────────────────────────────────────────────────────────
// RESPIRA · respiración guiada (visual nueva)
//
// 1, 3 o 5 minutos. Un disco de cristal que crece al inhalar (4 s) y se
// encoge al exhalar (6 s): seis respiraciones por minuto, el ritmo que más
// calma. Alrededor, el aro que se va llenando con el tiempo, con el punto
// amarillo en la punta. En cada cambio, una vibración corta (en los
// teléfonos que la permiten).
//
// No guarda nada: ni registros ni rachas. Es para usarla y ya.
// Se abre desde el Dash («Respira»), al terminar la rutina («¿Bajamos
// pulsaciones?») y en los días de descanso.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { FondoManchas, GRAFITO, AMARILLO, GRIS_TXT } from './VentanaMarca.jsx';

const INHALA = 4000, EXHALA = 6000, CICLO = INHALA + EXHALA;
const OPCIONES = [1, 3, 5];

const CSS = `
@keyframes rs-entra { from { opacity: 0 } to { opacity: 1 } }
@keyframes rs-ciclo {
  0% { transform: scale(.6); animation-timing-function: cubic-bezier(.45,0,.4,1) }
  40% { transform: scale(1); animation-timing-function: cubic-bezier(.45,0,.4,1) }
  100% { transform: scale(.6) }
}
@keyframes rs-texto { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
[data-respira] { animation: rs-entra .35s ease both }
[data-respira] .rs-disco.anda { animation: rs-ciclo ${CICLO}ms infinite }
[data-respira] .rs-fase { animation: rs-texto .5s ease both }
@media (prefers-reduced-motion: reduce) { [data-respira] .rs-disco.anda { animation-duration: ${CICLO * 2}ms } }`;

const vibrar = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* nada */ } };
const reloj = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function Respira({ alCerrar, inicial = 1, titulo = 'Respira' }) {
  const [min, setMin] = useState(OPCIONES.includes(inicial) ? inicial : 1);
  const [estado, setEstado] = useState('elegir');   // elegir | anda | fin
  const [ahora, setAhora] = useState(0);
  const desde = useRef(0);
  const total = min * 60 * 1000;

  useEffect(() => {
    if (estado !== 'anda') return;
    let faseAntes = 'inhala';
    vibrar(18);
    const id = setInterval(() => {
      const t = Date.now() - desde.current;
      setAhora(t);
      const fase = (t % CICLO) < INHALA ? 'inhala' : 'exhala';
      if (fase !== faseAntes) { faseAntes = fase; vibrar(fase === 'inhala' ? 18 : [10, 60, 10]); }
      if (t >= total) { clearInterval(id); vibrar([20, 60, 20]); setEstado('fin'); }
    }, 100);
    return () => clearInterval(id);
  }, [estado, total]);

  // Escape cierra (en el computador).
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') alCerrar && alCerrar(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [alCerrar]);

  const empezar = () => { desde.current = Date.now(); setAhora(0); setEstado('anda'); };
  const fase = estado === 'anda' ? ((ahora % CICLO) < INHALA ? 'inhala' : 'exhala') : null;
  const avance = estado === 'fin' ? 1 : estado === 'anda' ? Math.min(1, ahora / total) : 0;

  // El aro del tiempo, con el punto amarillo en la punta.
  const R = 128, C = 2 * Math.PI * R, ang = avance * 2 * Math.PI - Math.PI / 2;
  const tam = 'min(78vw, 300px)';

  // Directo en el body: así queda encima de la barra y de la píldora de arriba
  // (dentro de una sección la tapaban).
  return createPortal(
    <div data-respira={estado} role="dialog" aria-modal="true" aria-label={titulo} style={{
      position: 'fixed', inset: 0, zIndex: 9990, color: GRAFITO, overflow: 'hidden',
      fontFamily: "var(--f-ui, 'Figtree Variable'), Figtree, system-ui, sans-serif",
    }}>
      <style>{CSS}</style>
      <FondoManchas />
      <button onClick={alCerrar} aria-label="Cerrar" data-respira-cerrar style={{
        position: 'absolute', zIndex: 2, top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: 16, width: 40, height: 40, borderRadius: 99, border: 0,
        background: 'rgba(255,255,255,0.7)', WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)', display: 'grid', placeItems: 'center', cursor: 'pointer',
      }}><X size={18} weight="bold" color={GRAFITO} /></button>

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 40px) 20px calc(env(safe-area-inset-bottom, 0px) + 24px)', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: GRIS_TXT }}>{titulo}</div>
        <div key={fase || estado} className="rs-fase" data-fase={fase || estado} style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', marginTop: 6, minHeight: 38 }}>
          {estado === 'elegir' ? '¿Cuánto tiempo?' : estado === 'fin' ? 'Listo.' : fase === 'inhala' ? 'Inhala' : 'Exhala'}
        </div>

        <div style={{ position: 'relative', width: tam, height: tam, margin: '26px 0 22px' }}>
          <svg viewBox="0 0 300 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} aria-hidden="true">
            <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(29,29,31,0.10)" strokeWidth="6" />
            <circle cx="150" cy="150" r={R} fill="none" stroke={GRAFITO} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - avance)} transform="rotate(-90 150 150)"
              style={{ transition: estado === 'anda' ? 'stroke-dashoffset .1s linear' : 'stroke-dashoffset .6s ease' }} />
            {avance > 0 && <circle cx={150 + R * Math.cos(ang)} cy={150 + R * Math.sin(ang)} r="9" fill={AMARILLO} />}
          </svg>
          <div className={`rs-disco${estado === 'anda' ? ' anda' : ''}`} data-disco style={{
            position: 'absolute', inset: '13%', borderRadius: '50%', transform: estado === 'fin' ? 'scale(.8)' : 'scale(.6)', transition: 'transform .8s ease',
            background: 'radial-gradient(circle at 50% 38%, rgba(255,255,255,0.95), rgba(255,255,255,0.55) 62%, rgba(60,123,214,0.22))',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)', backdropFilter: 'blur(20px) saturate(1.5)',
            boxShadow: '0 30px 60px rgba(40,60,90,0.16), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 0 1px rgba(255,255,255,0.6)',
          }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 750, fontVariantNumeric: 'tabular-nums', color: GRAFITO }}>
            {estado === 'anda' ? reloj(total - ahora) : estado === 'fin' ? `${min} min` : ''}
          </div>
        </div>

        {estado === 'elegir' && (
          <>
            <div role="radiogroup" aria-label="Minutos" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 99, background: 'rgba(118,118,128,0.14)' }}>
              {OPCIONES.map(m => (
                <button key={m} role="radio" aria-checked={min === m} data-minutos={m} onClick={() => setMin(m)} style={{
                  minWidth: 74, height: 38, borderRadius: 99, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                  background: min === m ? '#FFFFFF' : 'transparent', color: GRAFITO, boxShadow: min === m ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                }}>{m} min</button>
              ))}
            </div>
            <div style={{ fontSize: 14.5, color: GRIS_TXT, marginTop: 14, textAlign: 'center', lineHeight: 1.45, maxWidth: 300 }}>
              Sigue el círculo: crece cuando inhalas, se encoge cuando exhalas.
            </div>
            <button onClick={empezar} data-respira-empezar style={boton}>Empezar</button>
          </>
        )}
        {estado === 'anda' && (
          <button onClick={() => setEstado('fin')} style={{ ...boton, background: 'rgba(255,255,255,0.75)', color: GRAFITO }}>Terminar</button>
        )}
        {estado === 'fin' && (
          <>
            <div style={{ fontSize: 15, color: GRIS_TXT, textAlign: 'center', lineHeight: 1.45, maxWidth: 300 }}>Tómate un momento antes de seguir.</div>
            <button onClick={alCerrar} data-respira-volver style={boton}>Volver</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

const boton = {
  width: '100%', maxWidth: 340, height: 54, borderRadius: 27, border: 0, cursor: 'pointer', marginTop: 22,
  background: GRAFITO, color: '#FFFFFF', fontSize: 17, fontWeight: 700, fontFamily: 'inherit',
};
