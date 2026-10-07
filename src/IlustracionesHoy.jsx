// ─────────────────────────────────────────────────────────────────────────
// LOS PERSONAJES · visual nueva · SOLO PARA LOS MOMENTOS
//
// Ya no van en las cabeceras (allí habla el coach, ver CabeceraHoy.jsx):
// salen cuando hay algo que celebrar (terminar el entreno, un récord, ver
// todo el material). Formas planas y redondas, colores llenos, SIN CARA: sin
// ojos ni boca se leen como un objeto con energía, no como un muñeco.
//
//   Alimentación  — un AGUACATE saludando
//   Entrenamiento — una KETTLEBELL levantando una barra
//   Aprendizaje   — un CEREBRO levantando dos mancuernas
//
// Mismo tamaño para todos: 200 × 124.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const PIEL = '#3F8A43';
const PIEL_OSCURA = '#2F6F33';
const PULPA = '#D2EA8C';
const PULPA_BORDE = '#E6F4B6';
const HUESO = '#9C6238';
const HUESO_LUZ = '#BE8252';
const DISCO = '#2C313A';
const BARRA = '#B9C1CC';

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
      </g>
      {/* un par de hojitas que caen, para darle aire */}
      <path d="M58 70 q8 -10 18 -4 q-8 10 -18 4 Z" fill="#6DB36F" />
      <path d="M170 44 q6 -8 14 -3 q-6 8 -14 3 Z" fill="#6DB36F" opacity="0.85" />
    </svg>
  );
}

// La kettlebell de «Entreno hecho»: cuerpo redondo apenas plano abajo, asa
// de kettlebell de verdad (cuernos curvos y tope plano), brazos y piernas en
// línea negra y la barra bien arriba, separada del asa. Colores lisos: el
// volumen lo dan manchas grandes de sombra en grises distintos (luz, medio y
// sombra), sin líneas de brillo. Sin puntitos flotando alrededor.
const KB_LUZ_G = '#7E8690', KB_MEDIO = '#646C76', KB_SOMBRA = '#4E555E';
const ASA_G = '#5D646E', ASA_SOMBRA = '#464C55';
const NEGRO = '#23272D';
const CUERPO_KB = 'M-17 31 C-38 25 -42 -2 -31 -18 C-22 -31 -11 -35 0 -35 C11 -35 22 -31 31 -18 C42 -2 38 25 17 31 C6 33.4 -6 33.4 -17 31 Z';

export function IlustracionPesas() {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="pesas" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id={`${id}c`}><path d={CUERPO_KB} /></clipPath>
        <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
      </defs>
      <circle cx="120" cy="64" r="56" fill="#FFFFFF" opacity="0.45" />
      {/* sombra en el piso, suave */}
      <ellipse cx="120" cy="120.5" rx="32" ry="4.4" fill="#1E2228" opacity="0.16" filter={`url(#${id}b)`} />
      <g transform="translate(120 76) scale(0.9)">
        {/* asa: cuernos curvos y tope plano; el cuerno derecho, en sombra */}
        <path d="M-20 -26 C-25.5 -38 -24 -50 -13 -55.5 L13 -55.5 C24 -50 25.5 -38 20 -26" fill="none" stroke={ASA_G} strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 -55.5 L13 -55.5 C24 -50 25.5 -38 20 -26" fill="none" stroke={ASA_SOMBRA} strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* la barra, bien arriba, con sus discos (cada uno con su canto) */}
        <g transform="translate(0 -72)">
          <rect x="-70" y="-2.6" width="140" height="5.2" rx="2.6" fill="#B9C1CC" />
          <rect x="-70" y="0" width="140" height="2.6" rx="1.3" fill="#9AA3AE" />
          <rect x="-60" y="-16" width="9" height="32" rx="4" fill="#1C2026" />
          <rect x="-62" y="-16" width="9" height="32" rx="4" fill="#2E333B" />
          <rect x="-50" y="-11.5" width="7" height="23" rx="3.2" fill="#D4A72C" />
          <rect x="-52" y="-11.5" width="7" height="23" rx="3.2" fill="#F2C94C" />
          <rect x="53" y="-16" width="9" height="32" rx="4" fill="#1C2026" />
          <rect x="51" y="-16" width="9" height="32" rx="4" fill="#2E333B" />
          <rect x="45" y="-11.5" width="7" height="23" rx="3.2" fill="#D4A72C" />
          <rect x="43" y="-11.5" width="7" height="23" rx="3.2" fill="#F2C94C" />
        </g>
        {/* brazos y piernas: una línea negra (detrás del cuerpo) */}
        <g stroke={NEGRO} strokeWidth="5.5" strokeLinecap="round" fill="none">
          <path d="M-30 -6 Q-56 -34 -38 -71" />
          <path d="M30 -6 Q56 -34 38 -71" />
          <path d="M-11 30 L-14 43" />
          <path d="M11 30 L14 43" />
        </g>
        <ellipse cx="-18" cy="45.5" rx="7" ry="3.3" fill={NEGRO} />
        <ellipse cx="18" cy="45.5" rx="7" ry="3.3" fill={NEGRO} />
        {/* cuerpo: sombra abajo a la derecha, tono medio y la cara iluminada */}
        <path d={CUERPO_KB} fill={KB_SOMBRA} />
        <g clipPath={`url(#${id}c)`}>
          <circle cx="-4" cy="-5" r="36" fill={KB_MEDIO} />
          <circle cx="-11" cy="-12" r="29" fill={KB_LUZ_G} />
        </g>
        {/* manos sobre la barra */}
        <circle cx="-38" cy="-72" r="4.8" fill={NEGRO} />
        <circle cx="38" cy="-72" r="4.8" fill={NEGRO} />
      </g>
    </svg>
  );
}

// La hermana de la de «Entreno hecho», para la meta de comida cumplida: la
// misma kettlebell (manchas grandes de sombra, sin brillos), en el verde de
// Alimentación, con el tenedor y el bocado en alto en una mano y el plato
// servido en la otra.
const KV_LUZ = '#6DAF7E', KV_MEDIO = '#4F9462', KV_SOMBRA = '#3B7A4D';
const KV_ASA = '#4A8C5C', KV_ASA_SOMBRA = '#386E48';

export function IlustracionMetaComida() {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="meta-comida" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id={`${id}c`}><path d={CUERPO_KB} /></clipPath>
        <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
      </defs>
      <circle cx="100" cy="64" r="56" fill="#FFFFFF" opacity="0.45" />
      <ellipse cx="100" cy="120.5" rx="32" ry="4.4" fill="#1E2228" opacity="0.16" filter={`url(#${id}b)`} />
      <g transform="translate(100 76) scale(0.9)">
        <path d="M-20 -26 C-25.5 -38 -24 -50 -13 -55.5 L13 -55.5 C24 -50 25.5 -38 20 -26" fill="none" stroke={KV_ASA} strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 -55.5 L13 -55.5 C24 -50 25.5 -38 20 -26" fill="none" stroke={KV_ASA_SOMBRA} strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* brazos y piernas en línea negra, por detrás del cuerpo */}
        <g stroke={NEGRO} strokeWidth="5.5" strokeLinecap="round" fill="none">
          <path d="M-30 -6 Q-62 -28 -46 -58" />
          <path d="M30 -6 Q62 -22 50 -44" />
          <path d="M-11 30 L-14 43" />
          <path d="M11 30 L14 43" />
        </g>
        <ellipse cx="-18" cy="45.5" rx="7" ry="3.3" fill={NEGRO} />
        <ellipse cx="18" cy="45.5" rx="7" ry="3.3" fill={NEGRO} />
        <path d={CUERPO_KB} fill={KV_SOMBRA} />
        <g clipPath={`url(#${id}c)`}>
          <circle cx="-4" cy="-5" r="36" fill={KV_MEDIO} />
          <circle cx="-11" cy="-12" r="29" fill={KV_LUZ} />
        </g>
        {/* el plato servido, en la mano derecha */}
        <g transform="translate(50 -52)">
          <path d="M-18 -3 C-18 -16 18 -16 18 -3 Z" fill="#F2C14E" />
          <path d="M2 -14.5 C12 -13 18 -9 18 -3 L2 -3 Z" fill="#E0A93A" />
          <path d="M-22 -3 H22 A22 15 0 0 1 -22 -3 Z" fill="#F4EFE4" />
          <path d="M4 -3 H22 A22 15 0 0 1 4 11.6 Z" fill="#DCD5C6" />
          <circle cx="0" cy="8" r="4.8" fill={NEGRO} />
        </g>
        {/* el tenedor con el bocado, en la izquierda */}
        <g transform="translate(-46 -62) rotate(10)">
          <path d="M0 4 V-20" stroke="#3D434B" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M-5 -18 V-27 M0 -18 V-28 M5 -18 V-27 M-5 -18 H5" stroke="#3D434B" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <circle cx="0" cy="-32" r="5.4" fill="#F2C14E" />
          <path d="M0 -37.4 A5.4 5.4 0 0 1 0 -26.6 Z" fill="#E0A93A" />
          <circle cx="0" cy="4" r="4.8" fill={NEGRO} />
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
      </g>
    </svg>
  );
}
