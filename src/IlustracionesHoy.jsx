// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE «HOY» · visual nueva
//
// Un personaje, al estilo de las apps de bienestar (Headspace): formas
// planas y redondas, colores llenos, sin contornos, y una cara tranquila
// (ojos cerrados en arco, sonrisa, mejillas). El personaje es un AGUACATE:
//
//   Alimentación  — el aguacate solo, contento, saludando
//   Entrenamiento — el mismo aguacate levantando una mancuerna
//
// Mismo tamaño para las dos: 200 × 124. Los ids llevan prefijo propio para
// que las dos cabeceras no se pisen si conviven en el DOM.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const PIEL = '#3F8A43';
const PIEL_OSCURA = '#2F6F33';
const PULPA = '#D2EA8C';
const PULPA_BORDE = '#E6F4B6';
const HUESO = '#9C6238';
const HUESO_LUZ = '#BE8252';
const TINTA = '#2A2A28';
const MEJILLA = '#F29B8F';

// La cara: ojos cerrados en arco (tranquilo), sonrisa y mejillas.
function Cara({ x, y, grande = false }) {
  const s = grande ? 1.1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={TINTA} strokeWidth="2.6" strokeLinecap="round">
      <path d="M-11 -2 Q-7 2 -3 -2" />
      <path d="M3 -2 Q7 2 11 -2" />
      <path d="M-5 5 Q0 10 5 5" />
      <circle cx="-14" cy="4" r="3.4" fill={MEJILLA} stroke="none" opacity="0.85" />
      <circle cx="14" cy="4" r="3.4" fill={MEJILLA} stroke="none" opacity="0.85" />
    </g>
  );
}

// El cuerpo del aguacate partido: piel, borde claro de la pulpa, pulpa y
// hueso (la «panza»). Centro en (0,0); mide ~64 × 92.
function Aguacate() {
  return (
    <g>
      <path d="M0 -48 C19 -48 27 -27 31 -6 C37 23 23 44 0 44 C-23 44 -37 23 -31 -6 C-27 -27 -19 -48 0 -48 Z" fill={PIEL} />
      <path d="M0 -42 C15 -42 22 -24 25 -5 C30 19 18 38 0 38 C-18 38 -30 19 -25 -5 C-22 -24 -15 -42 0 -42 Z" fill={PULPA_BORDE} />
      <path d="M0 -38 C13 -38 19 -22 22 -4 C27 16 16 34 0 34 C-16 34 -27 16 -22 -4 C-19 -22 -13 -38 0 -38 Z" fill={PULPA} />
      <circle cx="0" cy="16" r="13" fill={HUESO} />
      <circle cx="-4" cy="11" r="3.4" fill={HUESO_LUZ} />
    </g>
  );
}

function Piernas() {
  return (
    <g stroke={PIEL_OSCURA} strokeWidth="6" strokeLinecap="round" fill="none">
      <path d="M-9 42 L-11 54" />
      <path d="M9 42 L11 54" />
      <ellipse cx="-13" cy="55.5" rx="6" ry="3" fill={PIEL_OSCURA} stroke="none" />
      <ellipse cx="13" cy="55.5" rx="6" ry="3" fill={PIEL_OSCURA} stroke="none" />
    </g>
  );
}

function Fondo({ color }) {
  return (
    <g>
      <circle cx="120" cy="60" r="54" fill="#FFFFFF" opacity="0.4" />
      <circle cx="40" cy="30" r="5" fill="#FFFFFF" opacity="0.7" />
      <circle cx="186" cy="22" r="3.5" fill="#FFFFFF" opacity="0.7" />
      <circle cx="176" cy="96" r="4" fill={color} opacity="0.35" />
    </g>
  );
}

export function IlustracionComida() {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="comida" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <Fondo color="#46965A" />
      <ellipse cx="120" cy="120" rx="30" ry="4" fill="#1F4D2C" opacity="0.18" />
      <g transform="translate(120 62) rotate(-4)">
        {/* brazos: uno saludando, otro en la cintura */}
        <g stroke={PIEL_OSCURA} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-28 4 Q-40 -6 -42 -22" />
          <path d="M28 8 Q38 14 34 24" />
        </g>
        <circle cx="-42" cy="-25" r="4.5" fill={PIEL_OSCURA} />
        <Piernas />
        <Aguacate />
        <Cara x={0} y={-16} />
      </g>
      {/* un par de hojitas que caen, para darle aire */}
      <path d="M58 70 q8 -10 18 -4 q-8 10 -18 4 Z" fill="#6DB36F" />
      <path d="M170 44 q6 -8 14 -3 q-6 8 -14 3 Z" fill="#6DB36F" opacity="0.85" />
    </svg>
  );
}

export function IlustracionPesas() {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="pesas" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <Fondo color="#3C7BD6" />
      <ellipse cx="120" cy="120" rx="30" ry="4" fill="#1E3F73" opacity="0.2" />
      <g transform="translate(120 68)">
        {/* brazos arriba, sosteniendo la mancuerna sobre la cabeza */}
        <g stroke={PIEL_OSCURA} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-27 -2 Q-36 -26 -26 -52" />
          <path d="M27 -2 Q36 -26 26 -52" />
        </g>
        <Piernas />
        <Aguacate />
        <Cara x={0} y={-16} />
        {/* gotitas de esfuerzo */}
        <path d="M36 -30 q4 6 0 9 q-4 -3 0 -9 Z" fill="#7FB2F0" />
        <path d="M-40 -18 q3 5 0 7 q-3 -2 0 -7 Z" fill="#7FB2F0" />
        {/* la mancuerna */}
        <g transform="translate(0 -56)">
          <rect x="-40" y="-2.5" width="80" height="5" rx="2.5" fill="#B9C1CC" />
          <rect x="-44" y="-11" width="10" height="22" rx="4" fill="#3C7BD6" />
          <rect x="34" y="-11" width="10" height="22" rx="4" fill="#3C7BD6" />
          <rect x="-51" y="-7" width="7" height="14" rx="3" fill="#2C313A" />
          <rect x="44" y="-7" width="7" height="14" rx="3" fill="#2C313A" />
          <circle cx="-26" cy="0" r="4.5" fill={PIEL_OSCURA} />
          <circle cx="26" cy="0" r="4.5" fill={PIEL_OSCURA} />
        </g>
      </g>
    </svg>
  );
}
