// ─────────────────────────────────────────────────────────────────────────
// CABECERA DE «HOY» · visual nueva
//
// Una banda de color de lado a lado, con curvas como olas (azules para
// entrenar, verdes para comer), un dibujo del tema (kettlebell y mancuernas;
// aguacate, huevos, pescado y pollo) y el borde de abajo ovalado.
//
// `sangria` y `arriba` cancelan el relleno del contenedor para que la banda
// llegue a los bordes y al techo de la pantalla.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TEXT, TEXT_MUTED } from './theme.js';

const TEMAS = {
  entreno: { fondo: ['#CFE0F7', '#E8F0FB'], ola1: '#B5CEF1', ola2: '#8FB3E8', ola3: '#6F9DE0', acento: '#3C7BD6', tinta: '#1E3F73', claro: '#9EBFEE' },
  comida:  { fondo: ['#D3EBD8', '#ECF6EE'], ola1: '#BCDDC3', ola2: '#98CAA3', ola3: '#79B687', acento: '#46965A', tinta: '#1F4D2C', claro: '#A9D4B2' },
};

// El fondo: curvas de color, como olas, que se estiran a lo ancho de
// cualquier pantalla (preserveAspectRatio none). Sin sol ni nubes.
function Olas({ tema, t }) {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`fondo-${tema}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.fondo[0]} />
          <stop offset="1" stopColor={t.fondo[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#fondo-${tema})`} />
      <path d="M0 0 H400 V58 C320 96 250 20 160 48 C90 70 40 40 0 62 Z" fill="#FFFFFF" opacity="0.28" />
      <path d="M0 132 C80 104 170 150 250 124 C320 102 360 118 400 104 V200 H0 Z" fill={t.ola1} />
      <path d="M0 158 C100 132 190 178 290 150 C340 136 372 142 400 136 V200 H0 Z" fill={t.ola2} />
      <path d="M0 184 C120 164 230 200 400 170 V200 H0 Z" fill={t.ola3} />
      <path d="M-10 100 C70 74 150 118 230 92 S360 64 410 84" stroke="#FFFFFF" strokeWidth="2.5" fill="none" opacity="0.55" vectorEffect="non-scaling-stroke" />
      <path d="M-10 118 C90 96 170 134 260 110 S370 88 410 100" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.35" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Kettlebell y mancuernas.
function Pesas({ t }) {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="pesas" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* mancuerna de atrás, más chica y ladeada */}
      <g transform="translate(118 58) rotate(-16) scale(0.78)">
        <rect x="14" y="6" width="62" height="7" rx="3.5" fill={t.tinta} opacity="0.85" />
        <rect x="4" y="-4" width="14" height="27" rx="4.5" fill={t.claro} />
        <rect x="72" y="-4" width="14" height="27" rx="4.5" fill={t.claro} />
        <rect x="-3" y="1" width="9" height="17" rx="3" fill={t.tinta} opacity="0.85" />
        <rect x="84" y="1" width="9" height="17" rx="3" fill={t.tinta} opacity="0.85" />
      </g>
      {/* kettlebell */}
      <g transform="translate(58 70)">
        <path d="M-20 -14 C-22 -46 22 -46 20 -14" stroke={t.tinta} strokeWidth="9" fill="none" strokeLinecap="round" />
        <circle cx="0" cy="12" r="34" fill={t.acento} />
        <ellipse cx="-12" cy="0" rx="9" ry="13" fill="#FFFFFF" opacity="0.22" />
        <rect x="-22" y="40" width="44" height="8" rx="4" fill={t.tinta} />
      </g>
      {/* mancuerna acostada */}
      <g transform="translate(96 100)">
        <rect x="14" y="6" width="62" height="7" rx="3.5" fill={t.tinta} />
        <rect x="4" y="-4" width="14" height="27" rx="4.5" fill={t.acento} />
        <rect x="72" y="-4" width="14" height="27" rx="4.5" fill={t.acento} />
        <rect x="-3" y="1" width="9" height="17" rx="3" fill={t.tinta} />
        <rect x="84" y="1" width="9" height="17" rx="3" fill={t.tinta} />
      </g>
    </svg>
  );
}

// Aguacate, huevos, pescado y pollo.
function Comida({ t }) {
  return (
    <svg viewBox="0 0 200 124" aria-hidden="true" data-dibujo="comida" style={{ width: '100%', height: '100%', display: 'block' }}>
      {/* pescado */}
      <g transform="translate(96 14)">
        <path d="M0 18 C18 -4 58 -4 76 18 C58 40 18 40 0 18 Z" fill="#7FAFCB" />
        <path d="M74 18 L96 4 L92 18 L96 32 Z" fill="#5E93B3" />
        <path d="M30 6 C34 12 34 24 30 30" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
        <circle cx="14" cy="15" r="3" fill={t.tinta} />
      </g>
      {/* aguacate partido */}
      <g transform="translate(40 72) rotate(-12)">
        <path d="M0 -44 C16 -44 22 -24 26 -6 C32 18 20 42 0 42 C-20 42 -32 18 -26 -6 C-22 -24 -16 -44 0 -44 Z" fill="#2F6B3A" />
        <path d="M0 -36 C12 -36 16 -20 19 -5 C24 15 14 34 0 34 C-14 34 -24 15 -19 -5 C-16 -20 -12 -36 0 -36 Z" fill="#D6EA9C" />
        <circle cx="0" cy="12" r="11" fill="#9A6440" />
        <circle cx="-3" cy="8" r="3" fill="#FFFFFF" opacity="0.35" />
      </g>
      {/* huevo frito y huevo entero */}
      <g transform="translate(106 96)">
        <path d="M-26 2 C-30 -14 -10 -22 2 -18 C16 -26 32 -12 28 2 C34 16 14 26 0 22 C-14 28 -32 16 -26 2 Z" fill="#FFFFFF" />
        <circle cx="0" cy="1" r="10" fill="#F2B84B" />
        <circle cx="-3" cy="-2" r="3" fill="#FFFFFF" opacity="0.5" />
      </g>
      <ellipse cx="72" cy="104" rx="10" ry="13" fill="#FFF4DE" stroke="#E9D6B0" strokeWidth="1.5" />
      {/* muslo de pollo */}
      <g transform="translate(160 80) rotate(-35)">
        <rect x="-4" y="14" width="8" height="24" rx="4" fill="#FBF3E4" />
        <circle cx="-5" cy="40" r="6" fill="#FBF3E4" />
        <circle cx="5" cy="40" r="6" fill="#FBF3E4" />
        <path d="M0 -26 C18 -26 24 -6 18 8 C14 16 8 18 0 18 C-8 18 -14 16 -18 8 C-24 -6 -18 -26 0 -26 Z" fill="#C98242" />
        <path d="M-8 -16 C-2 -20 6 -18 10 -12" stroke="#FFFFFF" strokeWidth="2.2" fill="none" opacity="0.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function CabeceraHoy({ tema = 'entreno', fecha, titulo, sangria = '20px', arriba = '0px', children }) {
  const t = TEMAS[tema] || TEMAS.entreno;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      margin: `calc(-1 * ${arriba}) calc(-1 * ${sangria}) 16px`,
      paddingTop: `calc(${arriba} + 8px)`,
      minHeight: `calc(${arriba} + 150px)`,
      // El borde de abajo ovalado: el «cielo» se abre sobre la pantalla.
      borderRadius: '0 0 50% 50% / 0 0 34px 34px',
    }}>
      <Olas tema={tema} t={t} />
      {/* El dibujo va abajo a la derecha, a tamaño fijo: no se deforma ni se
          recorta según el ancho del teléfono. */}
      <div style={{ position: 'absolute', right: `calc(${sangria} - 6px)`, bottom: 14, width: 176, height: 109 }}>
        {tema === 'comida' ? <Comida t={t} /> : <Pesas t={t} />}
      </div>
      <div style={{ position: 'relative', padding: `0 ${sangria} 58px` }}>
        {fecha && <div style={{ fontSize: 15, color: TEXT_MUTED, fontWeight: 500 }}>{fecha}</div>}
        {titulo && <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2, maxWidth: '62%' }}>{titulo}</div>}
        {children}
      </div>
    </div>
  );
}
