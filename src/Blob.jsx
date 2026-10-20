// ─────────────────────────────────────────────────────────────────────────
// EL BLOB DE LA MARCA
//
// Un cuadrado de lados y esquinas curvos (superelipse), girado 12° para que
// el giro se note. El mismo que aparece detrás del ícono en la entrada
// (index.html). Pintado del color del módulo, con una sombra suave de su
// propio color debajo.
// ─────────────────────────────────────────────────────────────────────────
import React, { useId } from 'react';

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

// VIDRIO (a prueba, ver vistaApp.js): blanco lechoso que deja ver borroso lo
// de atrás, la mancha del color saliendo muy tenue de la esquina de abajo,
// un brillo interno arriba a la izquierda y una sombra interna apenas marcada
// abajo a la derecha. `color` es el de la mancha. Va dentro de una caja con
// position relative (el vidrio se pinta detrás, del mismo tamaño).
const rgba = (h, a) => { const n = parseInt(String(h).slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
export function BlobVidrio({ color, segundo = null, tam = 120, intensidad = 0.2, style }) {
  const id = 'bv' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const k = tam / 200, A = intensidad;
  return (
    <>
      <div aria-hidden="true" data-blob-vidrio style={{
        position: 'absolute', left: 0, top: 0, width: 200, height: 200, transformOrigin: '0 0', pointerEvents: 'none',
        transform: `translate(${tam / 2}px, ${tam / 2}px) scale(${k}) rotate(${BLOB_GIRO}deg) translate(-100px, -100px)`,
        clipPath: `path('${BLOB_PATH}')`, WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
      }} />
      <svg data-blob data-vidrio width={tam} height={tam} viewBox="0 0 200 200" aria-hidden="true" style={{
        display: 'block', overflow: 'visible', position: 'relative', transform: `rotate(${BLOB_GIRO}deg)`,
        filter: `drop-shadow(0 14px 24px ${rgba(color, 0.16)}) drop-shadow(0 2px 4px rgba(30,30,40,.06))`, ...style,
      }}>
        <defs>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".93" /><stop offset="1" stopColor="#fff" stopOpacity=".86" />
          </linearGradient>
          <radialGradient id={`${id}m`} cx="76%" cy="88%" r="70%">
            <stop offset="0" stopColor={rgba(color, A)} /><stop offset=".45" stopColor={rgba(color, A * 0.35)} /><stop offset="1" stopColor={rgba(color, 0)} />
          </radialGradient>
          {segundo && <radialGradient id={`${id}s`} cx="14%" cy="96%" r="48%">
            <stop offset="0" stopColor={rgba(segundo, A * 0.6)} /><stop offset="1" stopColor={rgba(segundo, 0)} />
          </radialGradient>}
          <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset=".42" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b" />
            <feOffset in="b" dx="-4" dy="-5" result="o1" /><feComposite in="SourceAlpha" in2="o1" operator="out" result="r1" />
            <feFlood floodColor={rgba(color, 0.2)} /><feComposite in2="r1" operator="in" result="sombra" />
            <feOffset in="b" dx="4" dy="5" result="o2" /><feComposite in="SourceAlpha" in2="o2" operator="out" result="r2" />
            <feFlood floodColor="#ffffff" /><feComposite in2="r2" operator="in" result="brillo" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="sombra" /><feMergeNode in="brillo" /></feMerge>
          </filter>
        </defs>
        <path d={BLOB_PATH} fill={`url(#${id}b)`} filter={`url(#${id}f)`} />
        <path d={BLOB_PATH} fill={`url(#${id}m)`} />
        {segundo && <path d={BLOB_PATH} fill={`url(#${id}s)`} />}
        <path d={BLOB_PATH} fill={`url(#${id}h)`} transform="translate(100 100) scale(.94) translate(-100 -100)" />
      </svg>
    </>
  );
}
