// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE CABECERA · visual nueva
//
// Un solo personaje para toda la app: la kettlebell, blanca y redonda como
// las de verdad (bola con base plana y asa gruesa), con una cara sencilla al
// estilo Headspace: dos ojos y una boca, nada más. En cada sección hace lo
// suyo:
//   Dash           saluda, contenta
//   Entrenamiento  levanta la barra, con esfuerzo
//   Alimentación   come: el tenedor va del plato a la boca
//   Aprendizaje    lee un libro abierto, mirando hacia abajo
// Al entrar a la sección se mueve un momento. Los brazos van por fuera del
// cuerpo (blanco sobre blanco no se vería); lo que cruza por delante (el
// tenedor, el libro, el plato) va en el color de la sección.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const B = '#FFFFFF';
const CARA = '#2B2A27';
const CSS_KB = `
@keyframes kb-sube { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes kb-saluda { 0%, 100% { transform: rotate(0) } 50% { transform: rotate(18deg) } }
@keyframes kb-bocado { 0% { transform: rotate(-18deg) } 40%, 60% { transform: rotate(0) } 80% { transform: rotate(-10deg) } 100% { transform: rotate(0) } }
@keyframes kb-mastica { 0%, 100% { transform: scaleY(1) } 50% { transform: scaleY(.45) } }
@keyframes kb-hoja { 0%, 100% { transform: scaleX(1) } 45%, 55% { transform: scaleX(-1) } }
@keyframes kb-respira { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.03) } }
@keyframes kb-parpadea { 0%, 92%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.1) } }
[data-ilustracion] .kb-sube { animation: kb-sube 1.6s ease-in-out .5s 3 both; }
[data-ilustracion] .kb-saluda { transform-box: fill-box; transform-origin: 50% 100%; animation: kb-saluda .6s ease-in-out .5s 5 both; }
[data-ilustracion] .kb-bocado { animation: kb-bocado 1.4s ease-in-out .5s 3 both; }
[data-ilustracion] .kb-mastica { transform-box: fill-box; transform-origin: 50% 0%; animation: kb-mastica .35s ease-in-out 1.1s 6 both; }
[data-ilustracion] .kb-hoja { transform-box: fill-box; transform-origin: 0% 50%; animation: kb-hoja 1.8s ease-in-out .7s 2 both; }
[data-ilustracion] .kb-cuerpo { transform-box: fill-box; transform-origin: 50% 100%; animation: kb-respira 1.6s ease-in-out .5s 3 both; }
[data-ilustracion] .kb-ojo { transform-box: fill-box; transform-origin: 50% 50%; animation: kb-parpadea 4s ease-in-out 1.2s 2 both; }
@media (prefers-reduced-motion: reduce) { [data-ilustracion] * { animation: none !important; } }`;

function Lienzo({ etiqueta, children }) {
  return (
    <svg viewBox="0 0 200 124" width="100%" height="100%" aria-hidden="true" data-ilustracion={etiqueta}
      style={{ display: 'block', overflow: 'visible' }}>
      <style>{CSS_KB}</style>
      {children}
    </svg>
  );
}

// La kettlebell: bola casi completa con la base plana y el asa gruesa que
// nace de los hombros. Lisa, sin brillos ni líneas de sombra.
function Kettlebell({ children }) {
  return (
    <g className="kb-cuerpo">
      <path d="M-25 -15C-32 -36 -24 -50 0 -50C24 -50 32 -36 25 -15" fill="none" stroke={B} strokeWidth="11" strokeLinecap="round" />
      <path d="M-22.6 32A36 36 0 1 1 22.6 32Z" fill={B} />
      {children}
    </g>
  );
}

// Las caras: trazos simples en grafito.
const trazo = { stroke: CARA, strokeWidth: 2.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
// Ojos felices (arquitos hacia arriba).
const OjosFelices = ({ y = 0, dx = 9 }) => (
  <g {...trazo}><path d={`M${-dx - 4} ${y + 1.5} Q${-dx} ${y - 3.5} ${-dx + 4} ${y + 1.5}`} /><path d={`M${dx - 4} ${y + 1.5} Q${dx} ${y - 3.5} ${dx + 4} ${y + 1.5}`} /></g>
);
// Ojos apretados por el esfuerzo (> <).
const OjosEsfuerzo = ({ y = 0, dx = 9 }) => (
  <g {...trazo}><path d={`M${-dx - 4} ${y - 3} L${-dx + 2} ${y} L${-dx - 4} ${y + 3}`} /><path d={`M${dx + 4} ${y - 3} L${dx - 2} ${y} L${dx + 4} ${y + 3}`} /></g>
);
// Ojos que miran hacia abajo (leyendo): medias lunas.
const OjosLeyendo = ({ y = 0, dx = 9 }) => (
  <g {...trazo}><path d={`M${-dx - 4} ${y} Q${-dx} ${y + 4} ${-dx + 4} ${y}`} /><path d={`M${dx - 4} ${y} Q${dx} ${y + 4} ${dx + 4} ${y}`} /></g>
);
const Sonrisa = ({ y = 10, w = 7 }) => <path d={`M${-w} ${y} Q0 ${y + 7} ${w} ${y}`} {...trazo} />;

function Piernas() {
  return (
    <>
      <g stroke={B} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M-11 31 L-14 43" /><path d="M11 31 L14 43" />
      </g>
      <ellipse cx="-17" cy="44.5" rx="6.5" ry="3" fill={B} />
      <ellipse cx="17" cy="44.5" rx="6.5" ry="3" fill={B} />
    </>
  );
}

const brazo = { stroke: B, strokeWidth: 6, strokeLinecap: 'round', fill: 'none' };

export function IlusDash() {
  // Saluda con la mano en alto, contenta; la otra en la cintura.
  return (
    <Lienzo etiqueta="dash">
      <g transform="translate(110 70)">
        <Piernas />
        <path d="M33 10 Q45 14 41 25" {...brazo} />
        <Kettlebell>
          <OjosFelices y={2} />
          <Sonrisa y={10} w={8} />
        </Kettlebell>
        <g className="kb-saluda">
          <path d="M-34 4 Q-48 -8 -50 -30" {...brazo} />
          <circle cx="-50" cy="-34" r="5" fill={B} />
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusEntreno() {
  // Levanta la barra por encima del asa, con cara de esfuerzo.
  return (
    <Lienzo etiqueta="entreno">
      <g transform="translate(110 80) scale(0.86)">
        <Piernas />
        <Kettlebell>
          <OjosEsfuerzo y={2} dx={10} />
          <ellipse cx="0" cy="13" rx="4" ry="4.6" fill={CARA} />
        </Kettlebell>
        <g className="kb-sube">
          <path d="M-35 2 Q-62 -18 -46 -62" {...brazo} /><path d="M35 2 Q62 -18 46 -62" {...brazo} />
          <g transform="translate(0 -66)">
            <rect x="-74" y="-2.5" width="148" height="5" rx="2.5" fill={B} />
            <rect x="-72" y="-15" width="9" height="30" rx="3.5" fill={B} />
            <rect x="-62" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
            <rect x="63" y="-15" width="9" height="30" rx="3.5" fill={B} />
            <rect x="55" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
            <circle cx="-46" cy="0" r="4.5" fill={B} /><circle cx="46" cy="0" r="4.5" fill={B} />
          </g>
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusComida({ fuerte = '#3E8E57', bocado = '#F2B544' }) {
  // Come: el plato en la mano derecha, por fuera del cuerpo; con la otra
  // mano lleva el tenedor (verde, para que se vea sobre el blanco) a la boca.
  return (
    <Lienzo etiqueta="comida">
      <g transform="translate(104 70)">
        <Piernas />
        {/* El plato: brazo por fuera y el plato al lado */}
        <path d="M34 8 Q44 14 47 9" {...brazo} />
        <g transform="translate(60 8)">
          <circle cx="-8" cy="-4" r="5.5" fill={bocado} /><circle cx="2" cy="-6" r="6.5" fill={fuerte} opacity="0.75" /><circle cx="11" cy="-3.5" r="4.5" fill={bocado} opacity="0.85" />
          <path d="M-16 0 H17 A16.5 12 0 0 1 -16 0 Z" fill={fuerte} />
        </g>
        <Kettlebell>
          <OjosFelices y={-2} />
          {/* La boca abierta, que mastica */}
          <ellipse className="kb-mastica" cx="2" cy="11" rx="5.5" ry="5" fill={CARA} />
        </Kettlebell>
        {/* El brazo con el tenedor, por fuera del cuerpo: gira desde el
            hombro y lleva el bocado hasta la boca */}
        <g className="kb-bocado" style={{ transformOrigin: '69px 79px' }}>
          <path d="M-35 9 Q-45 11 -47 4" {...brazo} />
          <circle cx="-47" cy="2" r="4.8" fill={B} />
          <g transform="translate(-45 3) rotate(100)">
            <path d="M0 0 V-31" stroke={fuerte} strokeWidth="3.4" strokeLinecap="round" />
            <path d="M-4.5 -29 V-38 M0 -29 V-39 M4.5 -29 V-38 M-4.5 -29 H4.5" stroke={fuerte} strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <circle cx="0" cy="-42" r="4.6" fill={bocado} />
          </g>
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusAprende({ fuerte = '#D9732E' }) {
  // Lee: el libro abierto en las dos manos, delante del cuerpo, con la
  // tapa de color; los ojos miran hacia abajo, a la página.
  return (
    <Lienzo etiqueta="aprende">
      <g transform="translate(110 70)">
        <Piernas />
        <Kettlebell>
          <OjosLeyendo y={-9} />
          <Sonrisa y={-1} w={5} />
        </Kettlebell>
        <g transform="translate(0 17)">
          <path d="M-35 -10 Q-45 0 -37 8" {...brazo} /><path d="M35 -10 Q45 0 37 8" {...brazo} />
          {/* Tapa */}
          <path d="M0 -10 C-12 -17 -28 -17 -40 -11 V14 C-28 9 -12 9 0 15 C12 9 28 9 40 14 V-11 C28 -17 12 -17 0 -10 Z" fill={fuerte} />
          {/* Hojas */}
          <path d="M0 -13 C-11 -19 -25 -19 -35 -14 V9 C-25 4 -11 4 0 10 Z" fill={B} />
          <path d="M0 -13 C11 -19 25 -19 35 -14 V9 C25 4 11 4 0 10 Z" fill={B} />
          <g stroke={fuerte} strokeWidth="2" strokeLinecap="round" opacity="0.55">
            <path d="M-28 -9 H-7 M-28 -3 H-7 M-28 3 H-15" /><path d="M7 -9 H28 M7 -3 H28 M7 3 H21" />
          </g>
          <path d="M0 -13 V10" stroke={fuerte} strokeWidth="1.8" opacity="0.6" />
          {/* La hoja que pasa */}
          <path className="kb-hoja" d="M0 -13 C8 -18 18 -19 27 -16 V7 C18 5 8 6 0 10 Z" fill={B} stroke={fuerte} strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx="-37" cy="8" r="4.5" fill={B} /><circle cx="37" cy="8" r="4.5" fill={B} />
        </g>
      </g>
    </Lienzo>
  );
}

export const ILUSTRACION = { entreno: IlusEntreno, comida: IlusComida, aprende: IlusAprende, dash: IlusDash };
