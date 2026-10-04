// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE CABECERA · visual nueva
//
// Un solo personaje para toda la app: la kettlebell, blanca y redonda como
// las de verdad (bola con base plana y asa gruesa), con LA MISMA cara en
// todas las secciones, al estilo Headspace: ojos cerrados en arco y una
// sonrisa ancha. En cada sección hace lo suyo:
//   Dash           saluda
//   Entrenamiento  levanta la barra
//   Alimentación   come: lleva el tenedor del plato a la boca
//   Aprendizaje    lee un libro abierto
// Al entrar a la sección se mueve un momento, sin que nada se despegue: el
// cuerpo queda quieto y cada brazo gira desde su hombro (o se dobla, en la
// barra). Los brazos van por fuera del cuerpo (blanco sobre blanco no se
// vería); lo que cruza por delante va en el color de la sección.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const B = '#FFFFFF';
const CARA = '#2B2A27';
// Dónde va el personaje en el lienzo de 200 × 124 (un poco arriba y a la
// izquierda, para que los pies nunca se corten con el borde de la cabecera).
const X = 102, Y = 60;
const CSS_KB = `
@keyframes kb-saluda { 0%, 100% { transform: rotate(0) } 50% { transform: rotate(16deg) } }
@keyframes kb-bocado { 0% { transform: rotate(-16deg) } 40%, 60% { transform: rotate(0) } 80% { transform: rotate(-9deg) } 100% { transform: rotate(0) } }
@keyframes kb-hoja { 0%, 100% { transform: scaleX(1) } 45%, 55% { transform: scaleX(-1) } }
@keyframes kb-parpadea { 0%, 92%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.15) } }
[data-ilustracion] .kb-saluda { transform-box: view-box; animation: kb-saluda .6s ease-in-out .5s 5 both; }
[data-ilustracion] .kb-bocado { transform-box: view-box; animation: kb-bocado 1.4s ease-in-out .5s 3 both; }
[data-ilustracion] .kb-hoja { transform-box: fill-box; transform-origin: 0% 50%; animation: kb-hoja 1.8s ease-in-out .7s 2 both; }
[data-ilustracion] .kb-ojos { transform-box: fill-box; transform-origin: 50% 50%; animation: kb-parpadea 4s ease-in-out 1.2s 2 both; }
@media (prefers-reduced-motion: reduce) { [data-ilustracion] * { animation: none !important; } }`;

function Lienzo({ etiqueta, children }) {
  return (
    <svg viewBox="0 0 200 124" width="100%" height="100%" aria-hidden="true" data-ilustracion={etiqueta}
      style={{ display: 'block', overflow: 'visible' }}>
      <style>{CSS_KB}</style>
      <g transform={`translate(${X} ${Y})`}>{children}</g>
    </svg>
  );
}

// La cara de siempre, al estilo Headspace: dos ojos cerrados en arco y una
// sonrisa ancha. `y` la sube o la baja (en Aprendizaje queda arriba del libro).
export function Cara({ y = 0, color = CARA }) {
  const t = { stroke: color, strokeWidth: 2.7, strokeLinecap: 'round', fill: 'none' };
  return (
    <g transform={`translate(0 ${y})`}>
      <g className="kb-ojos" {...t}><path d="M-14 -1 Q-10 3.5 -6 -1" /><path d="M6 -1 Q10 3.5 14 -1" /></g>
      <path d="M-15 7 Q0 19 15 7" {...t} />
    </g>
  );
}

// La kettlebell: bola casi completa con la base plana y el asa gruesa que
// nace de los hombros. Lisa, sin brillos ni sombras, y quieta.
function Kettlebell({ children }) {
  return (
    <g>
      <path d="M-25 -15C-32 -36 -24 -50 0 -50C24 -50 32 -36 25 -15" fill="none" stroke={B} strokeWidth="11" strokeLinecap="round" />
      <path d="M-22.6 32A36 36 0 1 1 22.6 32Z" fill={B} />
      {children}
    </g>
  );
}

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
// El punto del hombro en el lienzo, para que el brazo gire desde ahí.
const hombro = (x, y, k = 1) => `${X + x * k}px ${Y + y * k}px`;

export function IlusDash() {
  // Saluda con la mano en alto; la otra en la cintura.
  return (
    <Lienzo etiqueta="dash">
      <Piernas />
      <path d="M33 10 Q45 14 41 25" {...brazo} />
      <Kettlebell><Cara y={2} /></Kettlebell>
      <g className="kb-saluda" style={{ transformOrigin: hombro(-34, 4) }}>
        <path d="M-34 4 Q-48 -8 -50 -30" {...brazo} />
        <circle cx="-50" cy="-34" r="5" fill={B} />
      </g>
    </Lienzo>
  );
}

export function IlusEntreno() {
  // Levanta la barra por encima del asa: la barra sube y los brazos se
  // estiran con ella, sin soltarse de los hombros.
  const abajo = ['M-35 2 Q-62 -18 -46 -62', 'M35 2 Q62 -18 46 -62'];
  const arriba = ['M-35 2 Q-60 -24 -46 -71', 'M35 2 Q60 -24 46 -71'];
  const anim = { dur: '1.6s', begin: '0.5s', repeatCount: '3', calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' };
  return (
    <Lienzo etiqueta="entreno">
      <g transform="translate(0 10) scale(0.86)">
        <Piernas />
        <Kettlebell><Cara y={2} /></Kettlebell>
        {abajo.map((d, i) => (
          <path key={i} d={d} {...brazo}>
            <animate attributeName="d" values={`${d};${arriba[i]};${d}`} {...anim} />
          </path>
        ))}
        <g transform="translate(0 -66)">
          <animateTransform attributeName="transform" type="translate" values="0 -66;0 -75;0 -66" {...anim} />
          <rect x="-74" y="-2.5" width="148" height="5" rx="2.5" fill={B} />
          <rect x="-72" y="-15" width="9" height="30" rx="3.5" fill={B} />
          <rect x="-62" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
          <rect x="63" y="-15" width="9" height="30" rx="3.5" fill={B} />
          <rect x="55" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
          <circle cx="-46" cy="0" r="4.5" fill={B} /><circle cx="46" cy="0" r="4.5" fill={B} />
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusComida({ fuerte = '#3E8E57', comida = '#F2C14E' }) {
  // Come: el plato hondo en la mano derecha, por fuera del cuerpo, con la
  // comida servida pareja; con la otra mano lleva el tenedor a la boca.
  return (
    <Lienzo etiqueta="comida">
      <Piernas />
      <path d="M34 8 Q44 14 47 9" {...brazo} />
      <g transform="translate(60 8)">
        <path d="M-15 0 C-15 -11 15 -11 15 0 Z" fill={comida} />
        <path d="M-17 0 H17 A17 12 0 0 1 -17 0 Z" fill={fuerte} />
      </g>
      <Kettlebell><Cara y={0} /></Kettlebell>
      <g className="kb-bocado" style={{ transformOrigin: hombro(-35, 9) }}>
        <path d="M-35 9 Q-45 11 -47 4" {...brazo} />
        <circle cx="-47" cy="2" r="4.8" fill={B} />
        <g transform="translate(-45 3) rotate(100)">
          <path d="M0 0 V-29" stroke={fuerte} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M-4.5 -27 V-36 M0 -27 V-37 M4.5 -27 V-36 M-4.5 -27 H4.5" stroke={fuerte} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <circle cx="0" cy="-40.5" r="4.4" fill={comida} />
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusAprende({ fuerte = '#D9732E' }) {
  // Lee: el libro abierto en las dos manos, delante del cuerpo, con la tapa
  // de color y las hojas lisas.
  return (
    <Lienzo etiqueta="aprende">
      <Piernas />
      <Kettlebell><Cara y={-12} /></Kettlebell>
      <g transform="translate(0 17)">
        <path d="M-35 -10 Q-45 0 -37 8" {...brazo} /><path d="M35 -10 Q45 0 37 8" {...brazo} />
        <path d="M0 -10 C-12 -17 -28 -17 -40 -11 V14 C-28 9 -12 9 0 15 C12 9 28 9 40 14 V-11 C28 -17 12 -17 0 -10 Z" fill={fuerte} />
        <path d="M0 -13 C-11 -19 -25 -19 -35 -14 V9 C-25 4 -11 4 0 10 Z" fill={B} />
        <path d="M0 -13 C11 -19 25 -19 35 -14 V9 C25 4 11 4 0 10 Z" fill={B} />
        <path className="kb-hoja" d="M0 -13 C8 -18 18 -19 27 -16 V7 C18 5 8 6 0 10 Z" fill={B} stroke={fuerte} strokeOpacity="0.3" strokeWidth="1.4" />
        <circle cx="-37" cy="8" r="4.5" fill={B} /><circle cx="37" cy="8" r="4.5" fill={B} />
      </g>
    </Lienzo>
  );
}

export const ILUSTRACION = { entreno: IlusEntreno, comida: IlusComida, aprende: IlusAprende, dash: IlusDash };
