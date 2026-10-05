// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE CABECERA · visual nueva
//
// Un solo personaje para toda la app: la kettlebell, blanca y redonda como
// las de verdad (bola con base plana y asa gruesa), con LA MISMA cara en
// todas las secciones, al estilo Headspace: ojos cerrados en arco y una
// sonrisa ancha. En cada sección hace lo suyo:
//   Dash           levanta la bandera «HEY CHAMP!» con papelillo de celebración
//   Entrenamiento  levanta la barra
//   Alimentación   tenedor con el bocado en una mano y el plato en la otra
//   Aprendizaje    sostiene el libro abierto en alto; se le prende el foco
// Todas con la misma composición: brazos largos hacia arriba y el objeto
// grande en alto, que es lo que mejor se lee en la cabecera.
// Al entrar a la sección se mueve un momento, sin que nada se despegue: el
// cuerpo queda quieto y los brazos se doblan y estiran desde los hombros
// (se anima el trazo del brazo, no se gira: así nunca se suelta). Los brazos van por fuera del cuerpo (blanco sobre blanco no se
// vería); lo que cruza por delante va en el color de la sección.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const B = '#FFFFFF';
const CARA = '#2B2A27';
// Dónde va el personaje en el lienzo de 200 × 124 (un poco arriba y a la
// izquierda, para que los pies nunca se corten con el borde de la cabecera).
const X = 102, Y = 60;
const CSS_KB = `
@keyframes kb-hoja { 0%, 100% { transform: scaleX(1) } 45%, 55% { transform: scaleX(-1) } }
@keyframes kb-foco { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
@keyframes kb-papel { 0% { transform: translate(0, -40px) scale(.2); opacity: 0 } 15% { opacity: 1 } 70% { opacity: 1 } 100% { transform: translate(var(--x), calc(var(--y) + 14px)) scale(1); opacity: 0 } }
@keyframes kb-parpadea { 0%, 92%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.15) } }
[data-ilustracion] .kb-hoja { transform-box: fill-box; transform-origin: 0% 50%; animation: kb-hoja 1.8s ease-in-out .7s 2 both; }
[data-ilustracion] .kb-foco > * { transform-box: fill-box; transform-origin: 50% 80%; animation: kb-foco .6s cubic-bezier(.3,1.4,.5,1) 1.1s both; }
[data-ilustracion] .kb-papel > g { opacity: 0; animation: kb-papel 1.5s cubic-bezier(.2,.7,.3,1) 2 both; }
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
// A PRUEBA (pedido de Mauro): sin ojos, solo la sonrisa, para ver si los
// ojos la hacen infantil o agradable. Para volver a ponerlos: true.
const CON_OJOS = false;

export function Cara({ y = 0, color = CARA }) {
  const t = { stroke: color, strokeWidth: 2.7, strokeLinecap: 'round', fill: 'none' };
  return (
    <g transform={`translate(0 ${y})`}>
      {CON_OJOS && <g className="kb-ojos" {...t}><path d="M-11 -1 Q-7 3.5 -3 -1" /><path d="M3 -1 Q7 3.5 11 -1" /></g>}
      <path d="M-15 7 Q0 19 15 7" {...t} />
    </g>
  );
}

// La kettlebell: bola casi completa con la base plana y el asa gruesa que
// nace de los hombros. Lisa, sin brillos ni sombras, y quieta.
function Kettlebell({ children }) {
  return (
    <g>
      <path d="M-21 -17C-27 -36 -20 -49 0 -49C20 -49 27 -36 21 -17" fill="none" stroke={B} strokeWidth="11" strokeLinecap="round" />
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

export function IlusDash() {
  // Levanta una bandera de ánimo —«HEY CHAMP!»— con los dos brazos, como la
  // barra de Entrenamiento, y a los lados salta papelillo de celebración en
  // los colores de los cuatro módulos.
  const abajo = ['M-35 2 Q-60 -18 -44 -58', 'M35 2 Q60 -18 44 -58'];
  const arriba = ['M-35 2 Q-58 -24 -44 -67', 'M35 2 Q58 -24 44 -67'];
  const anim = { dur: '2.4s', begin: '0.5s', repeatCount: '2', calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' };
  // Papelillo: [x, y, color, forma, giro]; sale desde el centro hacia afuera.
  const papel = [
    [-86, -64, '#2F6CC4', 'r', 20], [-96, -38, '#E8B931', 'c', 0], [-80, -14, '#D9732E', 'r', -30], [-104, -60, '#46965A', 'c', 0],
    [86, -66, '#46965A', 'r', -20], [98, -40, '#D9732E', 'c', 0], [82, -16, '#2F6CC4', 'r', 35], [104, -62, '#E8B931', 'r', 10],
  ];
  return (
    <Lienzo etiqueta="dash">
      <g transform="translate(0 10) scale(0.86)">
        <g className="kb-papel">
          {papel.map(([x, y, c, forma, giro], i) => (
            <g key={i} style={{ '--x': `${x}px`, '--y': `${y}px`, animationDelay: `${0.55 + (i % 4) * 0.06}s` }}>
              {forma === 'r'
                ? <rect x="-3.5" y="-6.5" width="7" height="13" rx="1.6" fill={c} transform={`rotate(${giro})`} />
                : <circle r="4.3" fill={c} />}
            </g>
          ))}
        </g>
        <Piernas />
        <Kettlebell><Cara y={-7} /></Kettlebell>
        {abajo.map((d, i) => (
          <path key={i} d={d} {...brazo}>
            <animate attributeName="d" values={`${d};${arriba[i]};${d}`} {...anim} />
          </path>
        ))}
        <g transform="translate(0 -70)">
          <animateTransform attributeName="transform" type="translate" values="0 -70;0 -79;0 -70" {...anim} />
          {/* La bandera: tela amarilla (el color del Dash), con un vaivén */}
          <path d="M-60 -14 H60 L54 0 L60 14 H-60 L-54 0 Z" fill="#F2C94C" />
          <text x="0" y="5.2" textAnchor="middle" fontFamily="'Figtree Variable', Figtree, system-ui, sans-serif" fontWeight="900" fontSize="14.5" letterSpacing="0.2" fill="#2B2A27">HEY CHAMP!</text>
          <circle cx="-44" cy="12" r="4.8" fill={B} /><circle cx="44" cy="12" r="4.8" fill={B} />
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusEntreno() {
  // Levanta la barra por encima del asa: la barra sube y los brazos se
  // estiran con ella, sin soltarse de los hombros.
  const abajo = ['M-35 2 Q-62 -18 -46 -62', 'M35 2 Q62 -18 46 -62'];
  const arriba = ['M-35 2 Q-60 -24 -46 -71', 'M35 2 Q60 -24 46 -71'];
  const anim = { dur: '2.4s', begin: '0.5s', repeatCount: '2', calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' };
  return (
    <Lienzo etiqueta="entreno">
      <g transform="translate(0 10) scale(0.86)">
        <Piernas />
        <Kettlebell><Cara y={-7} /></Kettlebell>
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
  // Come con ganas: en una mano el tenedor en alto con el bocado y en la
  // otra el plato hondo servido parejo, los dos bien arriba (como la barra
  // de Entrenamiento). Al entrar, los dos suben un poco, como un brindis.
  const anim = { dur: '2.4s', begin: '0.5s', repeatCount: '2', calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' };
  const tenedorArriba = 'M-35 2 Q-62 -18 -44 -56';
  const tenedorMas = 'M-35 2 Q-60 -24 -44 -64';
  const platoArriba = 'M35 2 Q60 -14 46 -40';
  const platoMas = 'M35 2 Q60 -18 46 -45';
  return (
    <Lienzo etiqueta="comida">
      <g transform="translate(0 10) scale(0.86)">
        <Piernas />
        <Kettlebell><Cara y={-7} /></Kettlebell>
        {/* El plato, en la mano derecha */}
        <path d={platoArriba} {...brazo}>
          <animate attributeName="d" values={`${platoArriba};${platoMas};${platoArriba}`} {...anim} />
        </path>
        <g transform="translate(46 -52)">
          <animateTransform attributeName="transform" type="translate" values="46 -52;46 -57;46 -52" {...anim} />
          <path d="M-19 -4 C-19 -18 19 -18 19 -4 Z" fill={comida} />
          <path d="M-22 -4 H22 A22 15 0 0 1 -22 -4 Z" fill={fuerte} />
          <circle cx="0" cy="12" r="4.8" fill={B} />
        </g>
        {/* El tenedor con el bocado, en la izquierda */}
        <path d={tenedorArriba} {...brazo}>
          <animate attributeName="d" values={`${tenedorArriba};${tenedorMas};${tenedorArriba}`} {...anim} />
        </path>
        <g transform="translate(-44 -60)">
          <animateTransform attributeName="transform" type="translate" values="-44 -60;-44 -68;-44 -60" {...anim} />
          <g transform="rotate(12)">
            <animateTransform attributeName="transform" type="rotate" values="12;-4;12" {...anim} />
            <path d="M0 4 V-22" stroke={fuerte} strokeWidth="3.6" strokeLinecap="round" />
            <path d="M-5 -20 V-30 M0 -20 V-31 M5 -20 V-30 M-5 -20 H5" stroke={fuerte} strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <circle cx="0" cy="-35" r="5.2" fill={comida} />
          </g>
          <circle cx="0" cy="4" r="4.8" fill={B} />
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusAprende({ fuerte = '#D9732E' }) {
  // Lee: el libro abierto, grande, sostenido con los brazos estirados hacia
  // arriba (la misma energía que la barra de Entrenamiento); arriba, el
  // foco de la idea se prende al entrar.
  const anim = { dur: '2.4s', begin: '0.5s', repeatCount: '2', calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' };
  const abajo = ['M-35 2 Q-58 -14 -40 -40', 'M35 2 Q58 -14 40 -40'];
  const arriba = ['M-35 2 Q-57 -18 -40 -46', 'M35 2 Q57 -18 40 -46'];
  return (
    <Lienzo etiqueta="aprende">
      <g transform="translate(0 10) scale(0.86)">
        <Piernas />
        <Kettlebell><Cara y={-7} /></Kettlebell>
        {abajo.map((d, i) => (
          <path key={i} d={d} {...brazo}>
            <animate attributeName="d" values={`${d};${arriba[i]};${d}`} {...anim} />
          </path>
        ))}
        <g transform="translate(0 -52)">
          <animateTransform attributeName="transform" type="translate" values="0 -52;0 -58;0 -52" {...anim} />
          <path d="M0 -10 C-14 -18 -32 -18 -46 -11 V18 C-32 12 -14 12 0 19 C14 12 32 12 46 18 V-11 C32 -18 14 -18 0 -10 Z" fill={fuerte} />
          <path d="M0 -13 C-12 -20 -28 -20 -41 -14 V13 C-28 7 -12 7 0 14 Z" fill={B} />
          <path d="M0 -13 C12 -20 28 -20 41 -14 V13 C28 7 12 7 0 14 Z" fill={B} />
          <path className="kb-hoja" d="M0 -13 C9 -19 21 -20 31 -17 V10 C21 8 9 9 0 14 Z" fill={B} stroke={fuerte} strokeOpacity="0.3" strokeWidth="1.4" />
          <circle cx="-40" cy="12" r="4.5" fill={B} /><circle cx="40" cy="12" r="4.5" fill={B} />
        </g>
        {/* El foco de la idea, arriba a la derecha */}
        <g className="kb-foco" transform="translate(64 -66)">
          <path d="M0 -12 C-8 -12 -12 -6 -12 -1 C-12 4 -8 7 -6 10 H6 C8 7 12 4 12 -1 C12 -6 8 -12 0 -12 Z" fill="#F2C14E" />
          <rect x="-5" y="11" width="10" height="5" rx="2" fill={B} />
          <g stroke="#F2C14E" strokeWidth="3" strokeLinecap="round">
            <path d="M0 -18 V-23" /><path d="M-14 -12 L-18 -16" /><path d="M14 -12 L18 -16" />
          </g>
        </g>
      </g>
    </Lienzo>
  );
}

export const ILUSTRACION = { entreno: IlusEntreno, comida: IlusComida, aprende: IlusAprende, dash: IlusDash };
