// ─────────────────────────────────────────────────────────────────────────
// EL BLOB DE LA MARCA
//
// Un cuadrado de lados y esquinas curvos (superelipse), girado 12° para que
// el giro se note. El mismo que aparece detrás del ícono en la entrada
// (index.html). Pintado del color del módulo, con una sombra suave de su
// propio color debajo.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

function superelipse(n = 3.8, S = 200, N = 72) {
  const c = S / 2, r = S / 2, pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * 2 * Math.PI;
    const x = c + r * Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 2 / n);
    const y = c + r * Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 2 / n);
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
export const BLOB_PATH = superelipse();
export const BLOB_GIRO = -12;

// `color`: el del relleno. `sombra`: true pinta la sombra suave; `sombraColor`
// (por defecto el mismo del relleno) es el color de esa sombra.
export default function Blob({ color, tam = 120, sombra = true, sombraColor = null, style, ...resto }) {
  return (
    <svg data-blob width={tam} height={tam} viewBox="0 0 200 200" aria-hidden="true" {...resto} style={{
      display: 'block', overflow: 'visible', transform: `rotate(${BLOB_GIRO}deg)`,
      // Con `sombraColor` (las cabeceras): una sombra corta y tenue, que
      // apenas separa el blob del fondo (la de antes era grande y pesaba).
      filter: !sombra ? undefined : sombraColor
        ? `drop-shadow(0 6px 12px ${sombraColor}2E) drop-shadow(0 1px 3px rgba(30,30,40,.05))`
        : `drop-shadow(0 16px 28px ${color}66) drop-shadow(0 2px 6px rgba(30,30,40,.06))`,
      ...style,
    }}>
      <path d={BLOB_PATH} fill={color} />
    </svg>
  );
}
