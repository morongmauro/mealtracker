// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE CABECERA · visual nueva
//
// Una por sección, en línea blanca gruesa sobre las manchas de color. Cada
// una es UNA idea que se entiende de un vistazo, con su movimiento propio y
// nada suelto alrededor (sin cruces, puntos ni gotas de relleno):
//   Entrenamiento  la kettlebell en pleno swing, con la estela del movimiento
//   Alimentación   un aguacate abierto: la mitad con la semilla y la otra
//   Aprendizaje    una mente que se enciende
//   Dash           los anillos de progreso (la gráfica circular de la app)
//
// Todo en un lienzo de 220×170. El grosor de la línea no escala con el
// tamaño (vector-effect), así que se ve igual de firme en cualquier teléfono.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const RELLENO = 'rgba(255,255,255,0.24)';

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

export function IlusEntreno() {
  // La kettlebell sube en un swing: viene de abajo a la izquierda, y detrás
  // le quedan tres arcos de estela, paralelos a su borde.
  const cx = 128, cy = 104;
  return (
    <Lienzo etiqueta="entreno">
      <path d={arco(cx, cy, 58, 205, 268)} strokeWidth="6" />
      <path d={arco(cx, cy, 74, 212, 262)} strokeWidth="5" opacity="0.8" />
      <path d={arco(cx, cy, 90, 220, 256)} strokeWidth="4" opacity="0.6" />
      <g transform={`rotate(8 ${cx} ${cy})`}>
        {/* El asa */}
        <path d="M98.5 82C92 58 104 38 128 38C152 38 164 58 157.5 82" />
        {/* El cuerpo: bola con base plana */}
        <path d="M95 132A40 40 0 1 1 161 132Z" fill={RELLENO} />
        {/* El brillo */}
        <path d="M108 100a24 24 0 0 1 13-15" strokeWidth="5" />
      </g>
    </Lienzo>
  );
}

// Media pera de aguacate (vista de frente), apoyada en su base.
const MITAD = 'M0 -64C17 -64 25 -46 29 -28C34 -6 42 6 42 22C42 46 23 62 0 62C-23 62 -42 46 -42 22C-42 6 -34 -6 -29 -28C-25 -46 -17 -64 0 -64Z';

export function IlusComida() {
  // Recién abierto: las dos mitades se separan un poco. Una se queda con la
  // semilla; la otra muestra el hueco donde estaba.
  return (
    <Lienzo etiqueta="comida">
      <g transform="translate(58 98) rotate(-6) scale(0.84)">
        <path d={MITAD} fill={RELLENO} />
        <path d={MITAD} transform="scale(0.76) translate(0 5)" strokeWidth="4" />
        <circle cx="0" cy="22" r="17" fill="currentColor" stroke="none" />
      </g>
      <g transform="translate(150 84) rotate(8) scale(0.84)">
        <path d={MITAD} fill={RELLENO} />
        <path d={MITAD} transform="scale(0.76) translate(0 5)" strokeWidth="4" />
        <circle cx="0" cy="22" r="17" strokeWidth="5" />
      </g>
    </Lienzo>
  );
}

export function IlusAprende() {
  // La mente, y sobre ella la idea que se enciende: tres rayos.
  return (
    <Lienzo etiqueta="aprende">
      <g transform="translate(54 40) scale(4.6)">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" fill={RELLENO} />
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" fill={RELLENO} />
        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
        <path d="M12 5v13" />
      </g>
      <path d="M109 22V6M80 30l-9-12M138 30l9-12" strokeWidth="6" />
    </Lienzo>
  );
}

export function IlusDash() {
  // Los anillos de progreso, como el ícono de la app: dos vueltas que se
  // van cerrando sobre su pista.
  const cx = 112, cy = 88;
  return (
    <Lienzo etiqueta="dash">
      <circle cx={cx} cy={cy} r="62" strokeWidth="4" opacity="0.45" />
      <path d={arco(cx, cy, 62, 0, 290)} strokeWidth="11" />
      <circle cx={cx} cy={cy} r="38" strokeWidth="4" opacity="0.45" />
      <path d={arco(cx, cy, 38, 0, 215)} strokeWidth="9" />
      <circle cx={cx} cy={cy} r="7" fill="currentColor" stroke="none" />
    </Lienzo>
  );
}

export const ILUSTRACION = { entreno: IlusEntreno, comida: IlusComida, aprende: IlusAprende, dash: IlusDash };
