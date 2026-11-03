// El ícono del Dash en la barra: un anillo de progreso en cuatro tramos (tres
// llenos y uno tenue). Antes era la brújula, que se leía como «ubicación».
// Misma forma de uso que los íconos de Phosphor (size, color, weight).
import React from 'react';

const R = 82, GAP = 16;
const TRAMOS = [0, 1, 2, 3].map((i) => {
  const a0 = (i * 90 + GAP / 2 - 90) * Math.PI / 180, a1 = ((i + 1) * 90 - GAP / 2 - 90) * Math.PI / 180;
  const p = (a) => `${(128 + R * Math.cos(a)).toFixed(1)} ${(128 + R * Math.sin(a)).toFixed(1)}`;
  return `M${p(a0)} A${R} ${R} 0 0 1 ${p(a1)}`;
});

export function AnilloDash({ size = 24, color = 'currentColor', weight, style, ...resto }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" fill="none" style={style} aria-hidden="true" {...resto}>
      {TRAMOS.map((d, i) => <path key={i} d={d} stroke={color} strokeWidth={weight === 'regular' ? 26 : 38} strokeLinecap="round" opacity={i === 3 ? 0.3 : 1} />)}
    </svg>
  );
}
