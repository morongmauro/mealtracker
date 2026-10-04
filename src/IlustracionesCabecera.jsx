// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE CABECERA · visual nueva
//
// En blanco, sobre las manchas de color de cada sección:
//   Entrenamiento  la kettlebell levantando la barra
//   Alimentación   el aguacate partido, saludando
//   Aprendizaje    el cerebro con sus mancuernas
//   Dash           los anillos de progreso (la gráfica circular de la app)
// Los tres personajes son los de la marca, sin cara y en silueta blanca; al
// entrar a la sección se mueven un momento. Los anillos se dibujan solos.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

function Lienzo({ children, grosor = 7, etiqueta }) {
  return (
    <svg viewBox="0 0 220 170" width="100%" height="100%" fill="none" stroke="currentColor"
      strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      data-ilustracion={etiqueta} style={{ display: 'block', overflow: 'visible' }}>
      <style>{'[data-ilustracion] *{vector-effect:non-scaling-stroke}'}</style>
      {children}
    </svg>
  );
}

// Un arco entre dos ángulos (en grados, 0 = arriba, sentido del reloj).
const arco = (cx, cy, r, a0, a1) => {
  const p = (a) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

// ── Los personajes de la marca, en blanco y sin cara ─────────────────────
// Los mismos de antes (la kettlebell que levanta la barra, el aguacate que
// saluda y el cerebro con sus mancuernas), ahora como silueta blanca: el
// cuerpo en blanco y los detalles en un tono suave del color de la sección.
// Al entrar a la sección se mueven: la barra sube, el aguacate saluda, las
// mancuernas suben. Lienzo propio de 200 × 124.
function Personaje({ etiqueta, children }) {
  return (
    <svg viewBox="0 0 200 124" width="100%" height="100%" aria-hidden="true" data-ilustracion={etiqueta}
      style={{ display: 'block', overflow: 'visible' }}>
      <style>{CSS_PERSONAJES}</style>
      {children}
    </svg>
  );
}
const B = '#FFFFFF';
const CSS_PERSONAJES = `
@keyframes pj-sube { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
@keyframes pj-saluda { 0%, 100% { transform: rotate(0) } 50% { transform: rotate(-16deg) } }
@keyframes pj-respira { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.025) } }
[data-ilustracion] .pj-sube { animation: pj-sube 1.6s ease-in-out .5s 3 both; }
[data-ilustracion] .pj-saluda { transform-box: fill-box; transform-origin: 100% 100%; animation: pj-saluda .7s ease-in-out .5s 4 both; }
[data-ilustracion] .pj-respira { transform-box: fill-box; transform-origin: 50% 100%; animation: pj-respira 1.6s ease-in-out .5s 3 both; }
@media (prefers-reduced-motion: reduce) { [data-ilustracion] .pj-sube, [data-ilustracion] .pj-saluda, [data-ilustracion] .pj-respira { animation: none !important; } }`;

export function IlusEntreno({ tono = 'rgba(47,108,196,0.35)' }) {
  // La kettlebell levantando la barra por encima del asa.
  return (
    <Personaje etiqueta="entreno">
      <g transform="translate(110 72)">
        <g stroke={B} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-12 36 L-16 46" /><path d="M12 36 L16 46" />
        </g>
        <ellipse cx="-19" cy="47.5" rx="6.5" ry="3" fill={B} />
        <ellipse cx="19" cy="47.5" rx="6.5" ry="3" fill={B} />
        <g className="pj-respira">
          <path d="M-15 -22 C-17 -52 17 -52 15 -22" fill="none" stroke={B} strokeWidth="10" strokeLinecap="round" />
          <path d="M-26 34 C-40 22 -40 -8 -26 -20 C-16 -28 16 -28 26 -20 C40 -8 40 22 26 34 Z" fill={B} />
          <path d="M-24 -10 C-20 -18 -12 -21 -6 -21" fill="none" stroke={tono} strokeWidth="4" strokeLinecap="round" />
          <rect x="-24" y="30" width="48" height="5" rx="2.5" fill={tono} />
        </g>
        {/* Brazos y barra suben juntos */}
        <g className="pj-sube">
          <g stroke={B} strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M-33 0 Q-46 -26 -36 -58" /><path d="M33 0 Q46 -26 36 -58" />
          </g>
          <g transform="translate(0 -61)">
            <rect x="-66" y="-2.5" width="132" height="5" rx="2.5" fill={B} />
            <rect x="-62" y="-15" width="9" height="30" rx="3.5" fill={B} />
            <rect x="-52" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
            <rect x="53" y="-15" width="9" height="30" rx="3.5" fill={B} />
            <rect x="45" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
            <circle cx="-36" cy="0" r="4.5" fill={B} /><circle cx="36" cy="0" r="4.5" fill={B} />
          </g>
        </g>
      </g>
    </Personaje>
  );
}

export function IlusComida({ tono = 'rgba(47,127,69,0.30)' }) {
  // El aguacate partido, saludando, con su semilla.
  return (
    <Personaje etiqueta="comida">
      <g transform="translate(112 62) rotate(-4)">
        <path d="M28 8 Q38 14 34 24" stroke={B} strokeWidth="6" strokeLinecap="round" fill="none" />
        <g className="pj-saluda">
          <path d="M-28 4 Q-40 -6 -42 -22" stroke={B} strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="-42" cy="-25" r="4.5" fill={B} />
        </g>
        <g stroke={B} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-9 42 L-11 54" /><path d="M9 42 L11 54" />
        </g>
        <ellipse cx="-13" cy="55.5" rx="6" ry="3" fill={B} />
        <ellipse cx="13" cy="55.5" rx="6" ry="3" fill={B} />
        <g className="pj-respira">
          <path d="M0 -48 C19 -48 27 -27 31 -6 C37 23 23 44 0 44 C-23 44 -37 23 -31 -6 C-27 -27 -19 -48 0 -48 Z" fill={B} />
          <path d="M0 -38 C13 -38 19 -22 22 -4 C27 16 16 34 0 34 C-16 34 -27 16 -22 -4 C-19 -22 -13 -38 0 -38 Z" fill={tono} />
          <circle cx="0" cy="16" r="13" fill={B} />
        </g>
      </g>
    </Personaje>
  );
}

export function IlusAprende({ tono = 'rgba(201,95,23,0.30)' }) {
  // El cerebro con una mancuerna en cada mano.
  const Mancuerna = ({ x, y }) => (
    <g transform={`translate(${x} ${y})`} fill={B}>
      <rect x="-13" y="-2.2" width="26" height="4.4" rx="2.2" />
      <rect x="-17" y="-8" width="7" height="16" rx="3" />
      <rect x="10" y="-8" width="7" height="16" rx="3" />
    </g>
  );
  return (
    <Personaje etiqueta="aprende">
      <g transform="translate(110 70)">
        <g stroke={B} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-10 30 L-13 42" /><path d="M10 30 L13 42" />
        </g>
        <ellipse cx="-16" cy="43.5" rx="6.5" ry="3" fill={B} />
        <ellipse cx="16" cy="43.5" rx="6.5" ry="3" fill={B} />
        <g className="pj-sube">
          <g stroke={B} strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M-32 4 Q-50 -2 -50 -26" /><path d="M32 4 Q50 -2 50 -26" />
          </g>
          <Mancuerna x={-50} y={-31} /><Mancuerna x={50} y={-31} />
        </g>
        <g className="pj-respira">
          <g fill={B}>
            <circle cx="-22" cy="-8" r="18" /><circle cx="-8" cy="-20" r="18" /><circle cx="9" cy="-20" r="18" />
            <circle cx="23" cy="-8" r="18" /><circle cx="-19" cy="10" r="18" /><circle cx="19" cy="10" r="18" />
            <circle cx="0" cy="8" r="22" />
          </g>
          <g stroke={tono} strokeWidth="2.8" strokeLinecap="round" fill="none">
            <path d="M0 -37 Q-5 -28 0 -20 Q4 -14 0 -9" />
            <path d="M-33 -12 q7 -7 14 -1" /><path d="M-22 -28 q6 5 1 11" /><path d="M19 -30 q-5 6 1 11" />
            <path d="M20 -12 q7 -6 14 0" /><path d="M-35 14 q6 -5 11 1" /><path d="M24 15 q6 -6 11 0" />
          </g>
        </g>
      </g>
    </Personaje>
  );
}

export function IlusDash() {
  // Los anillos de progreso, como el ícono de la app: dos vueltas que se
  // van cerrando sobre su pista.
  const cx = 112, cy = 88;
  return (
    <Lienzo etiqueta="dash">
      <style>{'@keyframes anillo-dibuja{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}[data-ilustracion] .anillo-dibuja{stroke-dasharray:1;animation:anillo-dibuja 1.1s cubic-bezier(.3,.7,.2,1) .3s both}@media (prefers-reduced-motion: reduce){[data-ilustracion] .anillo-dibuja{animation:none}}'}</style>
      <circle cx={cx} cy={cy} r="62" strokeWidth="4" opacity="0.45" />
      <path className="anillo-dibuja" pathLength="1" d={arco(cx, cy, 62, 0, 290)} strokeWidth="11" />
      <circle cx={cx} cy={cy} r="38" strokeWidth="4" opacity="0.45" />
      <path className="anillo-dibuja" pathLength="1" d={arco(cx, cy, 38, 0, 215)} strokeWidth="9" style={{ animationDelay: '.45s' }} />
      <circle cx={cx} cy={cy} r="7" fill="currentColor" stroke="none" />
    </Lienzo>
  );
}

export const ILUSTRACION = { entreno: IlusEntreno, comida: IlusComida, aprende: IlusAprende, dash: IlusDash };
