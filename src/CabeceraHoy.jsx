// ─────────────────────────────────────────────────────────────────────────
// CABECERA DE «HOY» · visual nueva
//
// Una banda de color de lado a lado, con curvas como olas (azules para
// entrenar, verdes para comer), un dibujo del tema (kettlebell y mancuernas;
// aguacate, brócoli y huevo) y el borde de abajo ovalado. Los dibujos
// viven en IlustracionesHoy.jsx.
//
// `sangria` y `arriba` cancelan el relleno del contenedor para que la banda
// llegue a los bordes y al techo de la pantalla.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TEXT, TEXT_MUTED } from './theme.js';
import { IlustracionPesas, IlustracionComida } from './IlustracionesHoy.jsx';

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
      <div style={{ position: 'absolute', right: `calc(${sangria} - 2px)`, bottom: 24, width: 178, height: 110 }}>
        {tema === 'comida' ? <IlustracionComida /> : <IlustracionPesas />}
      </div>
      <div style={{ position: 'relative', padding: `0 ${sangria} 58px` }}>
        {fecha && <div style={{ fontSize: 15, color: TEXT_MUTED, fontWeight: 500 }}>{fecha}</div>}
        {titulo && <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2, maxWidth: '62%' }}>{titulo}</div>}
        {children}
      </div>
    </div>
  );
}
