// ─────────────────────────────────────────────────────────────────────────
// CABECERA DE «HOY» · visual nueva
//
// Una banda de color de lado a lado con un dibujo del tema (pesas y montañas
// para entrenar; hojas y un tazón para comer) y el borde de abajo ovalado,
// como un cielo que se abre sobre la pantalla. Arriba queda sitio para la
// píldora con el nombre de la sección.
//
// `sangria` y `arriba` cancelan el relleno del contenedor para que la banda
// llegue a los bordes y al techo de la pantalla.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TEXT, TEXT_MUTED } from './theme.js';

const TEMAS = {
  entreno: { cielo: ['#BFD6F5', '#E3EDFB'], lejos: '#9DBDEB', cerca: '#7FA7E2', acento: '#3C7BD6', tinta: '#1E3F73' },
  comida:  { cielo: ['#C9E6CF', '#EAF5EC'], lejos: '#A8D3B1', cerca: '#86BF93', acento: '#46965A', tinta: '#1F4D2C' },
};

function Dibujo({ tema, t }) {
  // viewBox ancho y bajo; se estira a lo ancho y se recorta abajo.
  return (
    <svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`cielo-${tema}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.cielo[0]} />
          <stop offset="1" stopColor={t.cielo[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="170" fill={`url(#cielo-${tema})`} />
      {/* sol y nubes */}
      <circle cx="318" cy="58" r="26" fill="#FFFFFF" opacity="0.55" />
      <g fill="#FFFFFF" opacity="0.8">
        <ellipse cx="70" cy="62" rx="34" ry="12" /><ellipse cx="95" cy="55" rx="22" ry="12" />
        <ellipse cx="238" cy="40" rx="26" ry="9" /><ellipse cx="256" cy="34" rx="16" ry="9" />
      </g>
      {tema === 'entreno' ? (
        <>
          <path d="M0 150 L70 92 L118 128 L178 70 L250 138 L300 104 L400 150 Z" fill={t.lejos} opacity="0.75" />
          <path d="M0 170 L0 142 Q90 118 170 140 T400 132 L400 170 Z" fill={t.cerca} />
          {/* una pesa apoyada en la colina */}
          <g transform="translate(262 108) rotate(-8)">
            <rect x="0" y="9" width="62" height="7" rx="3.5" fill={t.tinta} />
            <rect x="4" y="0" width="11" height="25" rx="4" fill={t.acento} />
            <rect x="47" y="0" width="11" height="25" rx="4" fill={t.acento} />
            <rect x="-4" y="4" width="8" height="17" rx="3" fill={t.tinta} />
            <rect x="58" y="4" width="8" height="17" rx="3" fill={t.tinta} />
          </g>
        </>
      ) : (
        <>
          <path d="M0 170 L0 136 Q110 108 210 132 T400 120 L400 170 Z" fill={t.lejos} opacity="0.8" />
          <path d="M0 170 L0 150 Q120 132 230 150 T400 146 L400 170 Z" fill={t.cerca} />
          {/* un tazón con hojas */}
          <g transform="translate(262 92)">
            <path d="M8 10 C4 -14 26 -24 34 -6" fill={t.acento} opacity="0.9" />
            <path d="M34 8 C40 -18 66 -16 62 6" fill={t.cerca} />
            <circle cx="46" cy="4" r="9" fill="#F2B84B" />
            <path d="M0 10 H72 Q70 44 36 46 Q2 44 0 10 Z" fill="#FFFFFF" />
            <path d="M0 10 H72" stroke={t.tinta} strokeWidth="3" strokeLinecap="round" />
            <path d="M8 22 Q36 30 64 22" stroke={t.acento} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
          </g>
        </>
      )}
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
      <Dibujo tema={tema} t={t} />
      <div style={{ position: 'relative', padding: `0 ${sangria} 58px` }}>
        {fecha && <div style={{ fontSize: 15, color: TEXT_MUTED, fontWeight: 500 }}>{fecha}</div>}
        {titulo && <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2, maxWidth: '62%' }}>{titulo}</div>}
        {children}
      </div>
    </div>
  );
}
