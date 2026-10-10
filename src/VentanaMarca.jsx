// ─────────────────────────────────────────────────────────────────────────
// VENTANAS DE PRIMERA VEZ · visual nueva
//
// El fondo de manchas de la marca (el mismo del ícono: azul, amarillo, verde
// y naranja sobre blanco cálido), el ícono arriba y una tarjeta de cristal
// abajo con el mensaje. Lo usan la cuenta (contraseña, datos, avisos), la
// invitación al recorrido y la bienvenida a la Comunidad.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

export const GRAFITO = '#1D1D1F';
export const AMARILLO = '#F2C94C';
export const GRIS_TXT = '#5A5A5F';

const CSS = `
@keyframes vm-entra { from { opacity: 0 } to { opacity: 1 } }
@keyframes vm-sube { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes vm-deriva { 0%, 100% { transform: translate(0, 0) rotate(var(--r)) scale(1) } 50% { transform: translate(var(--dx), var(--dy)) rotate(var(--r)) scale(1.06) } }
@keyframes vm-traza { to { stroke-dashoffset: 0 } }
@keyframes vm-punto { from { transform: scale(0) } to { transform: scale(1) } }
[data-ventana-marca] { animation: vm-entra .35s ease both; }
[data-ventana-marca] .vm-mancha { position: absolute; border-radius: 46% 54% 52% 48% / 55% 45% 55% 45%; filter: blur(10px); animation: vm-deriva 14s ease-in-out infinite; }
[data-ventana-marca] .vm-tarjeta { animation: vm-sube .5s cubic-bezier(.2,.8,.2,1) .08s both; }
[data-ventana-marca] .vm-traza { stroke-dasharray: 100 100; stroke-dashoffset: 100; animation: vm-traza .8s cubic-bezier(.45,0,.3,1) .1s forwards; }
[data-ventana-marca] .vm-punto { transform-box: fill-box; transform-origin: center; transform: scale(0); animation: vm-punto .45s cubic-bezier(.3,1.8,.5,1) .75s forwards; }
[data-ventana-marca] input { font: inherit; }
[data-ventana-marca] input:focus { outline: none; box-shadow: inset 0 0 0 1.5px ${GRAFITO}; }
@media (prefers-reduced-motion: reduce) { [data-ventana-marca] *, [data-ventana-marca] { animation-duration: .01s !important; animation-delay: 0s !important; } }`;

// Las manchas, como en el ícono, moviéndose muy lento.
export function FondoManchas() {
  const m = (st, color, a, extra) => (
    <div className="vm-mancha" style={{ ...st, background: `radial-gradient(closest-side, rgba(${color},${a}), rgba(${color},0))`, ...extra }} />
  );
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(180deg, #FFFFFF, #EEECE7)' }}>
      {m({ width: 540, height: 450, left: -210, top: -160 }, '60,123,214', 0.5, { '--r': '-8deg', '--dx': '18px', '--dy': '14px' })}
      {m({ width: 500, height: 420, right: -200, top: -130 }, '242,201,76', 0.58, { '--r': '10deg', '--dx': '-16px', '--dy': '18px', animationDelay: '-4s' })}
      {m({ width: 540, height: 440, left: -220, bottom: -160 }, '70,150,90', 0.46, { '--r': '6deg', '--dx': '14px', '--dy': '-16px', animationDelay: '-8s' })}
      {m({ width: 500, height: 440, right: -210, bottom: -120 }, '238,132,52', 0.42, { '--r': '-12deg', '--dx': '-18px', '--dy': '-12px', animationDelay: '-11s' })}
      <div style={{ position: 'absolute', inset: '0 0 auto 0', height: '55%', background: 'radial-gradient(90% 100% at 50% 0%, rgba(255,255,255,.35), rgba(255,255,255,0))' }} />
    </div>
  );
}

// El ícono de la app, en grafito, que se dibuja al aparecer.
export function IconoApp({ tam = 96 }) {
  return (
    <svg viewBox="0 0 512 512" width={tam} height={tam} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="vm-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B3A37" /><stop offset="1" stopColor="#1F1E1C" /></linearGradient>
        <filter id="vm-s" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000" floodOpacity=".16" /></filter>
      </defs>
      <g transform="translate(256 262) scale(0.9) translate(-256 -248)" fill="none" filter="url(#vm-s)">
        <path className="vm-traza" d="M128 162 C96 72 160 18 256 18 C352 18 416 72 384 162" pathLength="100" stroke="url(#vm-t)" strokeWidth="40" strokeLinecap="round" />
        <path className="vm-traza" d="M256 164 A136 136 0 1 1 120 300" pathLength="100" stroke="url(#vm-t)" strokeWidth="40" strokeLinecap="round" />
        <circle className="vm-punto" cx="120" cy="300" r="28.8" fill={AMARILLO} />
      </g>
    </svg>
  );
}

// El círculo blanco con el símbolo de la ventana (candado, escudo…).
export function SimboloVentana({ children }) {
  return (
    <div style={{ width: 60, height: 60, borderRadius: 99, background: 'rgba(255,255,255,0.88)', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
      {children}
    </div>
  );
}

// `paso`/`pasos`: los puntitos de avance (sin ellos, no se muestran).
export default function VentanaMarca({ paso = null, pasos = 0, simbolo = null, titulo, texto, children, z = 9000, ...resto }) {
  return (
    <div data-ventana-marca {...resto} role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined} style={{
      position: 'fixed', inset: 0, zIndex: z, overflowY: 'auto', color: GRAFITO,
      fontFamily: "var(--f-ui, 'Figtree Variable'), Figtree, system-ui, sans-serif",
    }}>
      <style>{CSS}</style>
      <FondoManchas />
      <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto',
        padding: 'calc(env(safe-area-inset-top, 0px) + 64px) 14px calc(env(safe-area-inset-bottom, 0px) + 14px)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'center', flex: '1 0 auto', alignItems: 'flex-start', paddingBottom: 24 }}><IconoApp /></div>
        <div className="vm-tarjeta" style={{
          background: 'rgba(255,255,255,0.72)', WebkitBackdropFilter: 'blur(30px) saturate(1.4)', backdropFilter: 'blur(30px) saturate(1.4)',
          borderRadius: 32, boxShadow: '0 30px 60px rgba(40,40,50,0.12), inset 0 0 0 1px rgba(255,255,255,0.7)', padding: '22px 20px 16px',
        }}>
          {pasos > 1 && paso !== null && (
            <div data-pasos style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
              {Array.from({ length: pasos }, (_, i) => (
                <i key={i} style={{ height: 6, width: i === paso ? 18 : 6, borderRadius: 3, background: i <= paso ? GRAFITO : 'rgba(29,29,31,0.18)', transition: 'width .3s' }} />
              ))}
            </div>
          )}
          {simbolo && <SimboloVentana>{simbolo}</SimboloVentana>}
          {titulo && <h1 style={{ margin: 0, textAlign: 'center', fontSize: 27, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>{titulo}</h1>}
          {texto && <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 16, color: GRIS_TXT, lineHeight: 1.45 }}>{texto}</p>}
          <div style={{ marginTop: 14 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function BotonVentana({ children, onClick, secundario, cargando, ...resto }) {
  return (
    <button onClick={onClick} disabled={cargando} {...resto} style={{
      width: '100%', height: 54, borderRadius: 27, border: 0, cursor: 'pointer', marginTop: secundario ? 4 : 14,
      background: secundario ? 'transparent' : GRAFITO, color: secundario ? GRAFITO : '#FFFFFF',
      fontSize: 17, fontWeight: 700, fontFamily: 'inherit', opacity: cargando ? 0.6 : 1,
    }}>{cargando ? 'Un momento…' : children}</button>
  );
}
