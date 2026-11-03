// ─────────────────────────────────────────────────────────────────────────
// VENTANAS DE PRIMERA VEZ · visual nueva
//
// El fondo de manchas de la marca (el mismo del ícono: azul, amarillo, verde
// y naranja sobre blanco cálido), el ícono arriba y una tarjeta de cristal
// abajo con el mensaje. Lo usan la cuenta (contraseña, datos, avisos), la
// invitación al recorrido y la bienvenida a la Comunidad.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
// La letra de la marca, empaquetada aquí mismo: estas ventanas salen ANTES
// de que la app encienda su visual (y su letra), y sin esto el iPhone ponía
// la suya (se veía «rara» y con una negrita muy gruesa).
import figtreeUrl from '@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2?url';

export const GRAFITO = '#1D1D1F';
export const AMARILLO = '#F2C94C';
export const GRIS_TXT = '#5A5A5F';
// La segunda línea de los títulos, en color (como las frases de los módulos).
export const ACENTO = { azul: '#2F6CC4', verde: '#2F7F45', naranja: '#C95F17', oro: '#B98A12' };
export const Color = ({ c = 'azul', children }) => <span style={{ color: ACENTO[c] || c }}>{children}</span>;
export const Negrita = ({ c = null, children }) => <b style={{ fontWeight: 650, color: c ? (ACENTO[c] || c) : GRAFITO }}>{children}</b>;

const CSS = `
@font-face { font-family: 'ECM Ventana'; font-style: normal; font-display: block; font-weight: 300 900; src: url(${figtreeUrl}) format('woff2-variations'); }
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
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'linear-gradient(180deg, #FBFAF7, #F3F1EB)' }}>
      {m({ width: 540, height: 450, left: -210, top: -160 }, '60,123,214', 0.26, { '--r': '-8deg', '--dx': '18px', '--dy': '14px' })}
      {m({ width: 500, height: 420, right: -200, top: -130 }, '242,201,76', 0.30, { '--r': '10deg', '--dx': '-16px', '--dy': '18px', animationDelay: '-4s' })}
      {m({ width: 540, height: 440, left: -220, bottom: -160 }, '70,150,90', 0.22, { '--r': '6deg', '--dx': '14px', '--dy': '-16px', animationDelay: '-8s' })}
      {m({ width: 500, height: 440, right: -210, bottom: -120 }, '238,132,52', 0.22, { '--r': '-12deg', '--dx': '-18px', '--dy': '-12px', animationDelay: '-11s' })}
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
      <g transform="translate(256 262) scale(0.900) translate(-256 -248.7)" fill="none" filter="url(#vm-s)">
        <path className="vm-traza" d="M148.0 217.3 C122.7 96.0 153.1 61.3 256 61.3 C358.9 61.3 389.3 96.0 364.0 217.3" pathLength="100" stroke="url(#vm-t)" strokeWidth="46" strokeLinecap="round" />
        <path className="vm-traza" d="M148.0 217.3 A136 136 0 1 1 120.0 300.0" pathLength="100" stroke="url(#vm-t)" strokeWidth="46" strokeLinecap="round" />
        <circle className="vm-punto" cx="120.0" cy="300.0" r="40" fill={AMARILLO} />
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

// El ícono de la app (el de la pantalla de inicio), grande e inclinado como
// el blob de la intro, asomado sobre la esquina de la tarjeta.
export function IconoEsquina() {
  return (
    <img src="/icon-512.png?v=4" alt="" aria-hidden="true" data-icono-esquina width="96" height="96" style={{
      position: 'absolute', right: 14, top: -40, width: 96, height: 96, borderRadius: 23, transform: 'rotate(-8deg)',
      boxShadow: '0 14px 26px rgba(60,60,40,0.16), 0 2px 5px rgba(30,30,40,0.06)', pointerEvents: 'none',
    }} />
  );
}

// «Paso 1 de 3»: las rayitas y el texto (la entrada: instalar, cuenta, datos).
function EtapaEntrada({ n, de }) {
  return (
    <div data-etapa-entrada style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14, fontSize: 13, fontWeight: 650, color: GRIS_TXT }}>
      {Array.from({ length: de }, (_, i) => <i key={i} style={{ display: 'block', width: 20, height: 4, borderRadius: 4, background: i < n ? GRAFITO : 'rgba(29,29,31,0.14)' }} />)}
      <span style={{ marginLeft: 4 }}>Paso {n} de {de}</span>
    </div>
  );
}

// `paso`/`pasos`: los puntitos de avance (sin ellos, no se muestran).
// `sinIcono`: sin el ícono de la app arriba (la de la contraseña ya lleva el candado).
// `esquina`: el ícono de la app asomado en la esquina de la tarjeta y el
// texto a la izquierda (la entrada: instalar y bienvenida). `etapa`: [n, de].
export default function VentanaMarca({ paso = null, pasos = 0, simbolo = null, titulo, texto, children, z = 9000, sinIcono = false, esquina = false, etapa = null, ...resto }) {
  const alinear = esquina ? 'left' : 'center';
  return (
    <div data-ventana-marca {...resto} role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined} style={{
      position: 'fixed', inset: 0, zIndex: z, overflowY: 'auto', color: GRAFITO,
      fontFamily: "'ECM Ventana', var(--f-ui, 'ECM Sans'), system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased', fontWeight: 450,
    }}>
      <style>{CSS}</style>
      <FondoManchas />
      {/* Centrada en la pantalla (antes iba abajo y quedaba escondida): el
          ícono y la tarjeta juntos, en el medio. Si no cabe, se desliza. */}
      <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 460, margin: '0 auto',
        padding: 'calc(env(safe-area-inset-top, 0px) + 28px) 16px calc(env(safe-area-inset-bottom, 0px) + 24px)', boxSizing: 'border-box' }}>
        {!sinIcono && !esquina && <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 20 }}><IconoApp tam={78} /></div>}
        <div className="vm-tarjeta" style={{ position: 'relative', marginTop: esquina ? 44 : 0,
          background: 'rgba(255,255,255,0.72)', WebkitBackdropFilter: 'blur(30px) saturate(1.4)', backdropFilter: 'blur(30px) saturate(1.4)',
          borderRadius: 32, boxShadow: '0 30px 60px rgba(40,40,50,0.12), inset 0 0 0 1px rgba(255,255,255,0.7)', padding: esquina ? '24px 22px 18px' : '26px 22px 18px',
        }}>
          {esquina && <IconoEsquina />}
          {esquina && etapa && <EtapaEntrada n={etapa[0]} de={etapa[1]} />}
          {!esquina && pasos > 1 && paso !== null && (
            <div data-pasos style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
              {Array.from({ length: pasos }, (_, i) => (
                <i key={i} style={{ height: 6, width: i === paso ? 18 : 6, borderRadius: 3, background: i <= paso ? GRAFITO : 'rgba(29,29,31,0.18)', transition: 'width .3s' }} />
              ))}
            </div>
          )}
          {simbolo && <SimboloVentana>{simbolo}</SimboloVentana>}
          {/* Títulos más grandes y una negrita menos pesada (750, no 800):
              en grande se lee mejor y se parece a las frases de los módulos. */}
          {titulo && <h1 style={{ margin: esquina && !etapa ? '18px 0 0' : 0, textAlign: alinear, fontSize: 31, fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.08, textWrap: 'balance' }}>{titulo}</h1>}
          {texto && <p style={{ margin: '10px 0 0', textAlign: alinear, fontSize: 16.5, fontWeight: 450, color: GRIS_TXT, lineHeight: 1.45, textWrap: 'pretty' }}>{texto}</p>}
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
      fontSize: 17, fontWeight: 650, fontFamily: 'inherit', opacity: cargando ? 0.6 : 1,
    }}>{cargando ? 'Un momento…' : children}</button>
  );
}
