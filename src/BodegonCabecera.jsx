// ─────────────────────────────────────────────────────────────────────────
// BODEGÓN DE CABECERA · visual nueva
//
// Un objeto real por sección, iluminado como foto de producto (luz arriba a
// la izquierda, sombra suave en el piso), en el material de la marca:
// grafito, cerámica blanca y el amarillo del ícono como acento.
//   Dash           el cronómetro, con el aro azul de tu semana en la esfera
//   Entrenamiento  la kettlebell de grafito con su punto amarillo
//   Alimentación   el bowl de cerámica con la ensalada
//   Aprendizaje    el libro abierto con la cinta amarilla
// Al entrar a la sección cada objeto se mueve un momento, como si lo
// acabaran de poner sobre la mesa: la kettlebell cae y se mece, el bowl se
// llena y echa vapor, el libro se abre y pasa una hoja, el cronómetro
// arranca. Una sola vez; quien pide menos movimiento lo ve ya quieto.
//
// Lienzo de 200 × 124 (el mismo de las ilustraciones de antes, así la
// cabecera no cambia de medidas); el objeto se dibuja en 120 × 120 y va
// centrado en (110, 48).
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const CSS = `
[data-bodegon] .bd-todo { transform-box: view-box; }
[data-bodegon] .bd-sombra { transform-box: fill-box; transform-origin: 50% 50%; }
/* Kettlebell: cae, rebota y se mece sobre su base */
@keyframes bd-cae { 0% { transform: translateY(-34px); opacity: 0 } 12% { opacity: 1 } 46% { transform: translateY(0) } 58% { transform: translateY(-7px) } 70% { transform: translateY(0) } 100% { transform: translateY(0) } }
@keyframes bd-mece { 0%, 40% { transform: rotate(0) } 52% { transform: rotate(-7deg) } 66% { transform: rotate(5deg) } 80% { transform: rotate(-2.5deg) } 92% { transform: rotate(1deg) } 100% { transform: rotate(0) } }
@keyframes bd-sombra-cae { 0% { transform: scale(.4); opacity: 0 } 46% { transform: scale(1.06); opacity: 1 } 58% { transform: scale(.86) } 70%, 100% { transform: scale(1); opacity: 1 } }
@keyframes bd-punto { 0%, 70% { transform: scale(1) } 80% { transform: scale(1.35) } 100% { transform: scale(1) } }
[data-bodegon="entreno"] .bd-cae { animation: bd-cae 1.5s cubic-bezier(.3,.7,.3,1) .15s both; }
[data-bodegon="entreno"] .bd-mece { transform-box: fill-box; transform-origin: 50% 100%; animation: bd-mece 1.9s ease-in-out .15s both; }
[data-bodegon="entreno"] .bd-sombra { animation: bd-sombra-cae 1.5s cubic-bezier(.3,.7,.3,1) .15s both; }
[data-bodegon] .bd-punto { transform-box: fill-box; transform-origin: 50% 50%; animation: bd-punto 1.6s ease-out .3s both; }
/* Bowl: sube, los ingredientes caen uno a uno y sale vapor */
@keyframes bd-sube { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes bd-pop { 0% { transform: translateY(-16px) scale(.3); opacity: 0 } 60% { transform: translateY(1px) scale(1.12); opacity: 1 } 100% { transform: none; opacity: 1 } }
@keyframes bd-vapor { 0% { transform: translateY(6px) scaleY(.6); opacity: 0 } 30% { opacity: .55 } 100% { transform: translateY(-18px) scaleY(1); opacity: 0 } }
[data-bodegon="comida"] .bd-sube { animation: bd-sube .6s cubic-bezier(.2,.8,.2,1) .1s both; }
[data-bodegon="comida"] .bd-pop > * { transform-box: fill-box; transform-origin: 50% 100%; animation: bd-pop .5s cubic-bezier(.3,1.4,.5,1) both; }
[data-bodegon="comida"] .bd-pop > :nth-child(1) { animation-delay: .45s } [data-bodegon="comida"] .bd-pop > :nth-child(2) { animation-delay: .55s }
[data-bodegon="comida"] .bd-pop > :nth-child(3) { animation-delay: .65s } [data-bodegon="comida"] .bd-pop > :nth-child(4) { animation-delay: .75s }
[data-bodegon="comida"] .bd-pop > :nth-child(5) { animation-delay: .85s } [data-bodegon="comida"] .bd-pop > :nth-child(6) { animation-delay: .95s }
[data-bodegon="comida"] .bd-vapor > * { transform-box: fill-box; transform-origin: 50% 100%; opacity: 0; animation: bd-vapor 1.8s ease-out 3 both; }
[data-bodegon="comida"] .bd-vapor > :nth-child(1) { animation-delay: 1.1s } [data-bodegon="comida"] .bd-vapor > :nth-child(2) { animation-delay: 1.5s } [data-bodegon="comida"] .bd-vapor > :nth-child(3) { animation-delay: 1.9s }
/* Libro: sube, se abre y pasa una hoja; la cinta se balancea */
@keyframes bd-abre { from { transform: scaleX(.12); } to { transform: scaleX(1); } }
@keyframes bd-hoja { 0%, 100% { transform: scaleX(1) } 50% { transform: scaleX(-1) } }
@keyframes bd-cinta { 0%, 100% { transform: rotate(0) } 30% { transform: rotate(9deg) } 60% { transform: rotate(-5deg) } 80% { transform: rotate(2deg) } }
[data-bodegon="aprende"] .bd-sube { animation: bd-sube .6s cubic-bezier(.2,.8,.2,1) .1s both; }
[data-bodegon="aprende"] .bd-abre { transform-box: fill-box; transform-origin: 50% 50%; animation: bd-abre .7s cubic-bezier(.2,.9,.25,1.15) .25s both; }
[data-bodegon="aprende"] .bd-hoja { transform-box: fill-box; transform-origin: 0% 50%; animation: bd-hoja 1.1s ease-in-out 1s both; }
[data-bodegon="aprende"] .bd-cinta { transform-box: fill-box; transform-origin: 50% 0%; animation: bd-cinta 1.4s ease-in-out .7s both; }
/* Cronómetro: aparece, se presiona el botón y la aguja da su vuelta */
@keyframes bd-aparece { 0% { transform: scale(.7); opacity: 0 } 60% { transform: scale(1.05); opacity: 1 } 100% { transform: none; opacity: 1 } }
@keyframes bd-boton { 0%, 100% { transform: none } 40% { transform: translateY(3px) } }
@keyframes bd-aguja { from { transform: rotate(-360deg) } to { transform: rotate(0) } }
@keyframes bd-arco { from { stroke-dashoffset: var(--bd-l) } to { stroke-dashoffset: var(--bd-o) } }
[data-bodegon="dash"] .bd-aparece { transform-box: fill-box; transform-origin: 50% 60%; animation: bd-aparece .7s cubic-bezier(.3,1.3,.5,1) .1s both; }
[data-bodegon="dash"] .bd-boton { animation: bd-boton .35s ease-in-out .7s both; }
[data-bodegon="dash"] .bd-aguja { transform-box: view-box; transform-origin: 60px 66px; animation: bd-aguja 1.4s cubic-bezier(.4,0,.2,1) .85s both; }
[data-bodegon="dash"] .bd-arco { animation: bd-arco 1.4s cubic-bezier(.4,0,.2,1) .85s both; }
@media (prefers-reduced-motion: reduce) { [data-bodegon] * { animation: none !important; } }`;

// Materiales (los mismos en todos los objetos).
function Materiales({ id }) {
  return (
    <defs>
      <radialGradient id={`${id}so`}><stop offset="0" stopColor="#000" stopOpacity=".26" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}gr`} cx=".34" cy=".28" r=".95"><stop offset="0" stopColor="#77756F" /><stop offset=".45" stopColor="#3A3935" /><stop offset="1" stopColor="#141413" /></radialGradient>
      <linearGradient id={`${id}gh`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5E5C57" /><stop offset="1" stopColor="#1C1B19" /></linearGradient>
      <radialGradient id={`${id}ce`} cx=".38" cy=".22" r=".95"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".6" stopColor="#EEEBE5" /><stop offset="1" stopColor="#C8C3B8" /></radialGradient>
      <linearGradient id={`${id}pg`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F2EEE4" /><stop offset="1" stopColor="#FCFAF5" /></linearGradient>
      <radialGradient id={`${id}am`} cx=".36" cy=".3" r=".8"><stop offset="0" stopColor="#FFE9A6" /><stop offset=".55" stopColor="#F2C94C" /><stop offset="1" stopColor="#D9A41C" /></radialGradient>
      <linearGradient id={`${id}na`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F29A55" /><stop offset="1" stopColor="#C95F17" /></linearGradient>
      <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#2B2A27" floodOpacity=".16" /></filter>
    </defs>
  );
}

function Lienzo({ tema, children }) {
  const id = `bd${tema}`;
  return (
    <svg viewBox="0 0 200 124" width="100%" height="100%" aria-hidden="true" data-ilustracion={tema} data-bodegon={tema}
      style={{ display: 'block', overflow: 'visible' }}>
      {/* El primer grupo es el objeto entero (lo mide la prueba visual). */}
      <g transform="translate(50 -12)">
        <style>{CSS}</style>
        <Materiales id={id} />
        {children(id)}
      </g>
    </svg>
  );
}

const Sombra = ({ id, rx = 40 }) => <ellipse className="bd-sombra" cx="60" cy="114" rx={rx} ry="6" fill={`url(#${id}so)`} />;

export function BodegonEntreno() {
  return (
    <Lienzo tema="entreno">{(id) => (<>
      <Sombra id={id} rx={38} />
      <g className="bd-cae"><g className="bd-mece" filter={`url(#${id}f)`}>
        <path d="M37 54 C32 22 43 11 60 11 C77 11 88 22 83 54" fill="none" stroke={`url(#${id}gh)`} strokeWidth="12" strokeLinecap="round" />
        <path d="M39 47 C36 24 46 15 60 15" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M60 44 C88 44 101 63 101 80 C101 99 88 110 60 110 C32 110 19 99 19 80 C19 63 32 44 60 44 Z" fill={`url(#${id}gr)`} />
        <ellipse cx="42" cy="62" rx="11" ry="5.5" fill="#fff" opacity=".2" transform="rotate(-30 42 62)" />
        <path d="M24 92 C30 104 42 109 58 110" fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="3" strokeLinecap="round" />
        <circle className="bd-punto" cx="30" cy="88" r="7" fill="#F2C94C" />
      </g></g>
    </>)}</Lienzo>
  );
}

export function BodegonComida() {
  return (
    <Lienzo tema="comida">{(id) => (<>
      <Sombra id={id} rx={44} />
      <g className="bd-vapor" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9">
        <path d="M44 46 C40 38 48 34 44 26" /><path d="M60 42 C56 34 64 30 60 22" /><path d="M76 46 C72 38 80 34 76 26" />
      </g>
      <g className="bd-sube" filter={`url(#${id}f)`}>
        <path d="M14 66 H106 C106 93 87 110 60 110 C33 110 14 93 14 66 Z" fill={`url(#${id}ce)`} />
        <ellipse cx="60" cy="66" rx="46" ry="10.5" fill="#F6F4EF" />
        <ellipse cx="60" cy="65" rx="40" ry="8" fill="#3E8E52" />
        <g className="bd-pop">
          <path d="M34 63 C38 54 48 54 50 62 C46 66 38 67 34 63 Z" fill="#6DB27E" />
          <path d="M70 61 C74 52 86 53 87 61 C83 65 74 66 70 61 Z" fill="#8CC79A" />
          <circle cx="58" cy="58" r="6.5" fill={`url(#${id}am)`} />
          <path d="M44 66 a6 6 0 0 1 12 0 Z" fill="#EE8434" />
          <circle cx="76" cy="66" r="4.2" fill="#2F7F45" />
          <path d="M60 64 a5 5 0 0 1 10 0 Z" fill="#F7D774" />
        </g>
        <path d="M20 73 C24 94 38 105 55 107" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" />
      </g>
    </>)}</Lienzo>
  );
}

export function BodegonAprende() {
  return (
    <Lienzo tema="aprende">{(id) => (<>
      <Sombra id={id} rx={48} />
      <g className="bd-sube"><g className="bd-abre" filter={`url(#${id}f)`}>
        <path d="M60 40 C46 32 25 32 10 38 V98 C25 92 46 92 60 100 C74 92 95 92 110 98 V38 C95 32 74 32 60 40 Z" fill={`url(#${id}na)`} />
        <path d="M60 43 C47 36 30 36 16 41 V93 C30 88 47 88 60 95 Z" fill={`url(#${id}pg)`} />
        <path d="M60 43 C73 36 90 36 104 41 V93 C90 88 73 88 60 95 Z" fill="#FCFAF5" />
        <path d="M24 54 H50 M24 62 H50 M24 70 H44 M24 78 H48" stroke="#D9D2C3" strokeWidth="2" strokeLinecap="round" />
        <path d="M70 54 H96 M70 62 H96 M70 70 H90" stroke="#D9D2C3" strokeWidth="2" strokeLinecap="round" />
        <path className="bd-hoja" d="M60 43 C70 37 82 36 93 38 V90 C82 88 70 89 60 95 Z" fill="#FFFFFF" stroke="#E6DFD0" strokeWidth="1" />
        <path d="M60 43 V95" stroke="#C95F17" strokeOpacity=".3" strokeWidth="1.4" />
        <path className="bd-cinta" d="M86 35 V60 L92.5 54.5 L99 60 V35 Z" fill={`url(#${id}am)`} />
      </g></g>
    </>)}</Lienzo>
  );
}

export function BodegonDash({ frac = 0.46 }) {
  const r = 24, L = 2 * Math.PI * r;
  return (
    <Lienzo tema="dash">{(id) => (<>
      <Sombra id={id} rx={38} />
      <g className="bd-aparece" filter={`url(#${id}f)`}>
        <g className="bd-boton"><rect x="53" y="14" width="14" height="11" rx="3.5" fill={`url(#${id}gh)`} /></g>
        <path d="M60 25 V30" stroke="#3A3935" strokeWidth="5" />
        <path d="M86 32 L92 26" stroke="#3A3935" strokeWidth="5" strokeLinecap="round" />
        <circle cx="60" cy="68" r="42" fill={`url(#${id}ce)`} />
        <circle cx="60" cy="68" r="33" fill="#F8F7F3" />
        {Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return <circle key={i} cx={60 + 28.5 * Math.sin(a)} cy={68 - 28.5 * Math.cos(a)} r={i % 3 ? 1.1 : 1.9} fill="#A39F96" />; })}
        {/* El aro de tu semana, en el azul del Dash */}
        <circle cx="60" cy="68" r={r} fill="none" stroke="#3C7BD6" strokeOpacity=".1" strokeWidth="5" />
        <circle className="bd-arco" cx="60" cy="68" r={r} fill="none" stroke="#3C7BD6" strokeWidth="5" strokeLinecap="round" transform="rotate(-90 60 68)"
          strokeDasharray={L} strokeDashoffset={L * (1 - frac)} style={{ '--bd-l': L, '--bd-o': L * (1 - frac) }} />
        <g className="bd-aguja"><path d="M60 68 L60 46" stroke="#232322" strokeWidth="3.4" strokeLinecap="round" /></g>
        <circle className="bd-punto" cx="60" cy="68" r="4.6" fill="#F2C94C" />
        <path d="M27 54 C30 42 40 33 52 30" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="3" strokeLinecap="round" />
      </g>
    </>)}</Lienzo>
  );
}

export const BODEGON = { entreno: BodegonEntreno, comida: BodegonComida, aprende: BodegonAprende, dash: BodegonDash };
