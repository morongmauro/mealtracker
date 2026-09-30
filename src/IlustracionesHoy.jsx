// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE «HOY» · visual nueva
//
// Un personaje, al estilo de las apps de bienestar (Headspace): formas
// planas y redondas, colores llenos, sin contornos, y una cara tranquila
// (ojos cerrados en arco y sonrisa, sin mejillas rosadas). Dos personajes:
//
//   Alimentación  — un AGUACATE contento, saludando
//   Entrenamiento — una KETTLEBELL con cara, brazos y piernas, levantando
//                   una barra, sonriendo y con una gota de sudor en la frente
//   Aprendizaje   — un CEREBRO con gafas y sonrisa, levantando dos mancuernas
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
const KB = '#5B95E6';
const KB_OSCURA = '#2F66B8';
const KB_LUZ = '#8DB8F2';
const DISCO = '#2C313A';
const BARRA = '#B9C1CC';

// La cara: ojos cerrados en arco (tranquilo) y sonrisa.
function Cara({ x, y, grande = false }) {
  const s = grande ? 1.1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={TINTA} strokeWidth="2.6" strokeLinecap="round">
      <path d="M-11 -2 Q-7 2 -3 -2" />
      <path d="M3 -2 Q7 2 11 -2" />
      <path d="M-5 5 Q0 10 5 5" />
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

// La kettlebell: cuerpo redondo con la base plana, asa gruesa arriba y un
// brillo. Centro del cuerpo en (0,0); mide ~70 × 96 con el asa.
function Kettlebell() {
  return (
    <g>
      <path d="M-15 -22 C-17 -52 17 -52 15 -22" fill="none" stroke={KB_OSCURA} strokeWidth="10" strokeLinecap="round" />
      <path d="M-26 34 C-40 22 -40 -8 -26 -20 C-16 -28 16 -28 26 -20 C40 -8 40 22 26 34 Z" fill={KB} />
      <path d="M-24 -10 C-20 -18 -12 -21 -6 -21" fill="none" stroke={KB_LUZ} strokeWidth="4" strokeLinecap="round" />
      <rect x="-24" y="32" width="48" height="5" rx="2.5" fill={KB_OSCURA} />
    </g>
  );
}

export function IlustracionPesas() {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="pesas" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <Fondo color="#3C7BD6" />
      <ellipse cx="120" cy="120" rx="30" ry="4" fill="#1E3F73" opacity="0.2" />
      <g transform="translate(120 72)">
        {/* piernas cortas, abiertas, bien plantadas */}
        <g stroke={KB_OSCURA} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-12 36 L-16 46" />
          <path d="M12 36 L16 46" />
        </g>
        <ellipse cx="-19" cy="47.5" rx="6.5" ry="3" fill={KB_OSCURA} />
        <ellipse cx="19" cy="47.5" rx="6.5" ry="3" fill={KB_OSCURA} />
        {/* brazos arriba, sosteniendo la barra sobre el asa */}
        <g stroke={KB_OSCURA} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-33 0 Q-46 -26 -36 -58" />
          <path d="M33 0 Q46 -26 36 -58" />
        </g>
        <Kettlebell />
        <Cara x={0} y={4} grande />
        {/* gota de sudor en la frente */}
        <path d="M14 -14 q4.5 6.5 0 9.5 q-4.5 -3 0 -9.5 Z" fill="#FFFFFF" />
        <path d="M44 -30 q3 5 0 7 q-3 -2 0 -7 Z" fill="#7FB2F0" />
        {/* la barra con sus discos */}
        <g transform="translate(0 -61)">
          <rect x="-66" y="-2.5" width="132" height="5" rx="2.5" fill={BARRA} />
          <rect x="-62" y="-15" width="9" height="30" rx="3.5" fill={DISCO} />
          <rect x="-52" y="-11" width="7" height="22" rx="3" fill="#3C7BD6" />
          <rect x="53" y="-15" width="9" height="30" rx="3.5" fill={DISCO} />
          <rect x="45" y="-11" width="7" height="22" rx="3" fill="#3C7BD6" />
          <circle cx="-36" cy="0" r="4.5" fill={KB_OSCURA} />
          <circle cx="36" cy="0" r="4.5" fill={KB_OSCURA} />
        </g>
      </g>
    </svg>
  );
}

// ── Aprendizaje: el cerebro que entrena ──────────────────────────────────
const SESO = '#F4A574';
const SESO_PLIEGUE = '#DE7F45';
const SESO_BRAZO = '#D2703A';

function Mancuerna({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-13" y="-2.2" width="26" height="4.4" rx="2.2" fill={BARRA} />
      <rect x="-17" y="-8" width="7" height="16" rx="3" fill={DISCO} />
      <rect x="10" y="-8" width="7" height="16" rx="3" fill={DISCO} />
      <rect x="-19.5" y="-5" width="3.5" height="10" rx="1.6" fill="#EE8434" />
      <rect x="16" y="-5" width="3.5" height="10" rx="1.6" fill="#EE8434" />
    </g>
  );
}

export function IlustracionCerebro() {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="cerebro" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <Fondo color="#EE8434" />
      <ellipse cx="120" cy="120" rx="32" ry="4" fill="#7A3A12" opacity="0.18" />
      <g transform="translate(120 70)">
        {/* piernas */}
        <g stroke={SESO_BRAZO} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-10 30 L-13 42" />
          <path d="M10 30 L13 42" />
        </g>
        <ellipse cx="-16" cy="43.5" rx="6.5" ry="3" fill={SESO_BRAZO} />
        <ellipse cx="16" cy="43.5" rx="6.5" ry="3" fill={SESO_BRAZO} />
        {/* brazos arriba, una mancuerna en cada mano */}
        <g stroke={SESO_BRAZO} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M-32 4 Q-50 -2 -50 -26" />
          <path d="M32 4 Q50 -2 50 -26" />
        </g>
        <Mancuerna x={-50} y={-31} />
        <Mancuerna x={50} y={-31} />
        <circle cx="-50" cy="-29" r="4.5" fill={SESO_BRAZO} />
        <circle cx="50" cy="-29" r="4.5" fill={SESO_BRAZO} />
        {/* el cerebro: lóbulos redondos, un solo color */}
        <g fill={SESO}>
          <circle cx="-22" cy="-8" r="18" />
          <circle cx="-8" cy="-20" r="18" />
          <circle cx="9" cy="-20" r="18" />
          <circle cx="23" cy="-8" r="18" />
          <circle cx="-19" cy="10" r="18" />
          <circle cx="19" cy="10" r="18" />
          <circle cx="0" cy="8" r="22" />
        </g>
        {/* pliegues */}
        <g stroke={SESO_PLIEGUE} strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d="M0 -37 Q-5 -28 0 -20 Q4 -14 0 -9" />
          <path d="M-33 -12 q7 -7 14 -1" />
          <path d="M-22 -28 q6 5 1 11" />
          <path d="M19 -30 q-5 6 1 11" />
          <path d="M20 -12 q7 -6 14 0" />
          <path d="M-35 14 q6 -5 11 1" />
          <path d="M24 15 q6 -6 11 0" />
        </g>
        {/* la cara con gafas */}
        <g stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <circle cx="-10.5" cy="6" r="8" fill="#FFFFFF" fillOpacity="0.35" />
          <circle cx="10.5" cy="6" r="8" fill="#FFFFFF" fillOpacity="0.35" />
          <path d="M-2.5 5 Q0 3 2.5 5" />
          <path d="M-14 7 Q-10.5 10 -7 7" />
          <path d="M7 7 Q10.5 10 14 7" />
          <path d="M-5.5 18 Q0 23 5.5 18" />
        </g>
      </g>
    </svg>
  );
}
