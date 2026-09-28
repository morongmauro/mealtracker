// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE «HOY» · visual nueva
//
// Estilo ícono-ilustración: formas limpias y redondeadas, con volumen
// (degradados suaves, una luz arriba a la izquierda y su sombra en el piso),
// sin contornos. Mismo tamaño para las dos: 200 × 124.
//
//   Entrenamiento — kettlebell azul y dos mancuernas grafito
//   Alimentación  — aguacate, brócoli y huevo
//
// Los ids de los degradados llevan prefijo propio: si las dos cabeceras
// estuvieran en el DOM a la vez no se pisan.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

function Destellos({ color = '#FFFFFF' }) {
  // Estrellitas de cuatro puntas y puntos sueltos: el «brillo» de ilustración.
  const estrella = (x, y, r, o = 1) => (
    <path key={`${x}-${y}`} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`}
      fill={color} opacity={o} />
  );
  return (
    <g>
      {estrella(18, 34, 6, 0.95)}
      {estrella(190, 16, 5, 0.9)}
      {estrella(102, 10, 3.5, 0.8)}
      <circle cx="30" cy="12" r="2.2" fill={color} opacity="0.8" />
      <circle cx="176" cy="40" r="1.8" fill={color} opacity="0.75" />
    </g>
  );
}

export function IlustracionPesas() {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="pesas" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id="ip-kb" cx="0.34" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#6FA6F0" />
          <stop offset="0.45" stopColor="#3C7BD6" />
          <stop offset="1" stopColor="#1C4C99" />
        </radialGradient>
        <linearGradient id="ip-asa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F66BB" />
          <stop offset="1" stopColor="#163C78" />
        </linearGradient>
        <linearGradient id="ip-disco" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A505B" />
          <stop offset="1" stopColor="#1C1F25" />
        </linearGradient>
        <linearGradient id="ip-disco-az" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5C95E6" />
          <stop offset="1" stopColor="#2256A6" />
        </linearGradient>
        <linearGradient id="ip-barra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4F6F9" />
          <stop offset="0.5" stopColor="#A7B0BD" />
          <stop offset="1" stopColor="#DCE1E8" />
        </linearGradient>
        <filter id="ip-sombra" x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* disco de luz detrás */}
      <circle cx="100" cy="64" r="56" fill="#FFFFFF" opacity="0.35" />
      <Destellos />

      {/* sombras en el piso */}
      <ellipse cx="66" cy="117" rx="38" ry="4.5" fill="#1E3F73" opacity="0.22" filter="url(#ip-sombra)" />
      <ellipse cx="148" cy="118" rx="48" ry="4" fill="#1E3F73" opacity="0.2" filter="url(#ip-sombra)" />

      {/* mancuerna de atrás, ladeada */}
      <g transform="translate(112 58) rotate(-14) scale(0.74)">
        <rect x="12" y="15" width="70" height="7" rx="3.5" fill="url(#ip-barra)" />
        <rect x="4" y="0" width="14" height="37" rx="5" fill="url(#ip-disco)" />
        <rect x="-5" y="6" width="10" height="25" rx="4" fill="url(#ip-disco)" />
        <rect x="76" y="0" width="14" height="37" rx="5" fill="url(#ip-disco)" />
        <rect x="89" y="6" width="10" height="25" rx="4" fill="url(#ip-disco)" />
        <rect x="6" y="3" width="3" height="20" rx="1.5" fill="#FFFFFF" opacity="0.18" />
        <rect x="78" y="3" width="3" height="20" rx="1.5" fill="#FFFFFF" opacity="0.18" />
      </g>

      {/* kettlebell */}
      <g>
        <path d="M45 64 C42 24 90 24 87 64" stroke="url(#ip-asa)" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M49 52 C50 34 70 30 80 38" stroke="#FFFFFF" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.28" />
        <path d="M66 50 C94 50 106 70 104 90 C102 106 90 114 66 114 C42 114 30 106 28 90 C26 70 38 50 66 50 Z" fill="url(#ip-kb)" />
        <rect x="42" y="110" width="48" height="7" rx="3.5" fill="#163C78" />
        <ellipse cx="50" cy="72" rx="8" ry="14" transform="rotate(-28 50 72)" fill="#FFFFFF" opacity="0.3" />
        <circle cx="58" cy="60" r="3" fill="#FFFFFF" opacity="0.45" />
      </g>

      {/* mancuerna de adelante, acostada */}
      <g transform="translate(104 88)">
        <rect x="14" y="13" width="66" height="7" rx="3.5" fill="url(#ip-barra)" />
        {[36, 42, 48, 54].map(x => <rect key={x} x={x} y="13" width="1.5" height="7" fill="#8C96A4" opacity="0.6" />)}
        <rect x="6" y="-2" width="14" height="37" rx="5" fill="url(#ip-disco-az)" />
        <rect x="-3" y="4" width="10" height="25" rx="4" fill="url(#ip-disco)" />
        <rect x="74" y="-2" width="14" height="37" rx="5" fill="url(#ip-disco-az)" />
        <rect x="87" y="4" width="10" height="25" rx="4" fill="url(#ip-disco)" />
        <rect x="8" y="1" width="3.2" height="22" rx="1.6" fill="#FFFFFF" opacity="0.32" />
        <rect x="76" y="1" width="3.2" height="22" rx="1.6" fill="#FFFFFF" opacity="0.32" />
      </g>
    </svg>
  );
}

// Un floreto del brócoli: círculo con su luz, y puntitos de textura.
function Floreto({ x, y, r }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="url(#ic-brocoli)" />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.22} fill="#9BD58E" opacity="0.55" />
      <circle cx={x + r * 0.3} cy={y + r * 0.1} r={r * 0.12} fill="#23592C" opacity="0.35" />
      <circle cx={x - r * 0.05} cy={y + r * 0.42} r={r * 0.1} fill="#23592C" opacity="0.3" />
    </g>
  );
}

export function IlustracionComida() {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="comida" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="ic-piel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3F8045" />
          <stop offset="1" stopColor="#1C4526" />
        </linearGradient>
        <radialGradient id="ic-pulpa" cx="0.45" cy="0.42" r="0.7">
          <stop offset="0" stopColor="#F6FAD0" />
          <stop offset="0.55" stopColor="#D8EA93" />
          <stop offset="1" stopColor="#A9CF5E" />
        </radialGradient>
        <radialGradient id="ic-hueso" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#D49A68" />
          <stop offset="0.55" stopColor="#9A5E36" />
          <stop offset="1" stopColor="#6A3E21" />
        </radialGradient>
        <radialGradient id="ic-brocoli" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6CC070" />
          <stop offset="0.6" stopColor="#3E9148" />
          <stop offset="1" stopColor="#2A6B34" />
        </radialGradient>
        <linearGradient id="ic-tallo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C4E39A" />
          <stop offset="1" stopColor="#86B95C" />
        </linearGradient>
        <radialGradient id="ic-clara" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EDE8DC" />
        </radialGradient>
        <radialGradient id="ic-yema" cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFE38F" />
          <stop offset="0.6" stopColor="#FFB63D" />
          <stop offset="1" stopColor="#EE9420" />
        </radialGradient>
        <filter id="ic-sombra" x="-30%" y="-100%" width="160%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <circle cx="104" cy="62" r="56" fill="#FFFFFF" opacity="0.35" />
      <Destellos />

      {/* sombras */}
      <ellipse cx="64" cy="118" rx="32" ry="4.5" fill="#1F4D2C" opacity="0.22" filter="url(#ic-sombra)" />
      <ellipse cx="160" cy="117" rx="30" ry="4" fill="#1F4D2C" opacity="0.2" filter="url(#ic-sombra)" />
      <ellipse cx="116" cy="118" rx="24" ry="3.5" fill="#1F4D2C" opacity="0.2" filter="url(#ic-sombra)" />

      {/* brócoli, atrás a la derecha */}
      <g>
        <path d="M150 116 C153 100 151 88 145 78 L158 74 L172 78 C167 90 165 102 168 116 Z" fill="url(#ic-tallo)" />
        <path d="M152 88 C146 84 140 82 134 82" stroke="#9FCB72" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M165 88 C171 84 177 83 182 84" stroke="#9FCB72" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M155 96 C156 104 156 110 156 114" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <Floreto x={134} y={76} r={12} />
        <Floreto x={184} y={77} r={11} />
        <Floreto x={143} y={60} r={16} />
        <Floreto x={176} y={60} r={16} />
        <Floreto x={160} y={46} r={18} />
        <Floreto x={159} y={70} r={13} />
      </g>

      {/* aguacate partido, adelante a la izquierda */}
      <g transform="translate(62 72) rotate(-14)">
        <path d="M0 -48 C19 -48 27 -27 31 -6 C37 23 23 46 0 46 C-23 46 -37 23 -31 -6 C-27 -27 -19 -48 0 -48 Z" fill="url(#ic-piel)" />
        <path d="M0 -41 C15 -41 22 -23 25 -5 C30 19 18 39 0 39 C-18 39 -30 19 -25 -5 C-22 -23 -15 -41 0 -41 Z" fill="#CFE58A" />
        <path d="M0 -37 C13 -37 19 -21 22 -4 C27 17 16 35 0 35 C-16 35 -27 17 -22 -4 C-19 -21 -13 -37 0 -37 Z" fill="url(#ic-pulpa)" />
        <circle cx="0" cy="12" r="13.5" fill="url(#ic-hueso)" />
        <ellipse cx="-4.5" cy="6.5" rx="4" ry="3" fill="#FFFFFF" opacity="0.4" />
        <path d="M-10 -30 C-14 -20 -16 -10 -16 0" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.45" />
      </g>

      {/* huevo cocido partido, adelante al medio */}
      <g transform="translate(116 100)">
        <ellipse cx="0" cy="0" rx="25" ry="17" fill="url(#ic-clara)" />
        <ellipse cx="0" cy="3" rx="25" ry="14" fill="none" stroke="#DDD6C6" strokeWidth="1.2" opacity="0.7" />
        <circle cx="1" cy="1" r="10.5" fill="url(#ic-yema)" />
        <ellipse cx="-2.5" cy="-2.5" rx="3.2" ry="2.3" fill="#FFFFFF" opacity="0.55" />
      </g>
    </svg>
  );
}
