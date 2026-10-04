// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE CABECERA · visual nueva
//
// Una por sección, en línea blanca gruesa sobre las manchas de color, con
// varias cosas pasando a la vez (como las piezas gráficas de una marca
// deportiva): no un ícono suelto, sino una escena corta del tema.
//   Entrenamiento  kettlebell en pleno swing: su trayectoria, velocidad y chispa
//   Alimentación   aguacate abierto, su otra mitad, una hoja y gotas
//   Aprendizaje    una mente con una idea encendida y lo que gira alrededor
//   Dash           una gráfica circular con la tendencia que sale hacia arriba
//
// Todo en un lienzo de 220×170. El grosor de la línea no escala con el
// tamaño (vector-effect), así que se ve igual de firme en cualquier teléfono.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const RELLENO = 'rgba(255,255,255,0.22)';

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

const Chispa = ({ x, y, r = 7 }) => (
  <g transform={`translate(${x} ${y})`} strokeWidth="3.5">
    <path d={`M0 ${-r}V${r}M${-r} 0H${r}`} />
  </g>
);

export function IlusEntreno() {
  return (
    <Lienzo etiqueta="entreno">
      {/* La trayectoria del swing, en puntos */}
      <path d="M26 150 A132 132 0 0 1 152 24" strokeWidth="4" strokeDasharray="0.1 13" />
      {/* Velocidad */}
      <path d="M40 92H66M30 108H62M44 124H68" />
      {/* La kettlebell, un poco inclinada en el aire: asa ancha y cuerpo de bola con base plana */}
      <g transform="rotate(-8 122 100)">
        <path d="M94 84C88 62 96 44 122 44C148 44 156 62 150 84" />
        <path d="M108 84C106 70 110 62 122 62C134 62 138 70 136 84" strokeWidth="5" />
        <path d="M90 136A38 38 0 1 1 154 136Z" fill={RELLENO} />
        <path d="M100 104a24 24 0 0 1 12-16" strokeWidth="5" />
      </g>
      {/* La chispa del esfuerzo */}
      <path d="M176 36l9-11M184 54l14-3M178 70l11 6" strokeWidth="4.5" />
      <Chispa x={58} y={46} />
    </Lienzo>
  );
}

const PERA = 'M100 30C121 30 131 50 135 70C141 98 150 110 150 128C150 151 128 165 100 165C72 165 50 151 50 128C50 110 59 98 65 70C69 50 79 30 100 30Z';

export function IlusComida() {
  return (
    <Lienzo etiqueta="comida">
      {/* La otra mitad, detrás */}
      <g transform="translate(58 -6) rotate(18 100 100) scale(0.86)" opacity="0.75">
        <path d={PERA} fill={RELLENO} />
      </g>
      {/* La mitad de adelante, con su semilla */}
      <g transform="translate(-14 0)">
        <path d={PERA} fill={RELLENO} />
        <path d={PERA} transform="translate(100 112) scale(0.74) translate(-100 -112)" strokeWidth="4" />
        <circle cx="100" cy="124" r="19" fill="currentColor" />
      </g>
      {/* Hoja */}
      <g transform="translate(140 2) scale(2.6)">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill={RELLENO} />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </g>
      {/* Gotas y frescura */}
      <path d="M22 70c-5 7-7 11-7 14a7 7 0 0 0 14 0c0-3-2-7-7-14Z" strokeWidth="4" />
      <path d="M34 108c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8Z" strokeWidth="3.5" />
      <Chispa x={186} y={120} />
    </Lienzo>
  );
}

export function IlusAprende() {
  return (
    <Lienzo etiqueta="aprende">
      {/* La órbita de lo que se va aprendiendo */}
      <ellipse cx="110" cy="92" rx="98" ry="30" transform="rotate(-16 110 92)" strokeWidth="3.5" strokeDasharray="0.1 12" />
      <circle cx="22" cy="118" r="7" fill="currentColor" stroke="none" />
      {/* La mente */}
      <g transform="translate(50 30) scale(4.7)">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" fill={RELLENO} />
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" fill={RELLENO} />
        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
        <path d="M12 5v13" />
      </g>
      {/* La idea que se enciende */}
      <g transform="translate(166 0) scale(1.9)">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" fill={RELLENO} />
        <path d="M9 18h6M10 22h4" />
      </g>
      <path d="M160 14l-8-6M204 14l8-6M182 -4v-8" strokeWidth="4" />
      <Chispa x={34} y={40} />
    </Lienzo>
  );
}

// Un arco de la dona entre dos ángulos (en grados, 0 = arriba).
const arco = (cx, cy, r, a0, a1) => {
  const p = (a) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

export function IlusDash() {
  return (
    <Lienzo etiqueta="dash">
      {/* La gráfica circular, en tres partes */}
      <path d={arco(80, 96, 52, 10, 130)} strokeWidth="10" />
      <path d={arco(80, 96, 52, 144, 236)} />
      <path d={arco(80, 96, 52, 250, 346)} strokeWidth="5" strokeDasharray="0.1 12" />
      <circle cx="80" cy="96" r="7" fill="currentColor" stroke="none" />
      {/* La tendencia que sale de la gráfica hacia arriba */}
      <path d="M134 112L152 86L166 98L188 56" />
      <path d="M172 56H188V72" />
      {/* Barras que crecen */}
      <path d="M140 160V146M158 160V134M176 160V120M194 160V104" strokeWidth="7.5" />
      <Chispa x={40} y={44} />
    </Lienzo>
  );
}

export const ILUSTRACION = { entreno: IlusEntreno, comida: IlusComida, aprende: IlusAprende, dash: IlusDash };
