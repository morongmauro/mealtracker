// ─────────────────────────────────────────────────────────────────────────
// ILUSTRACIONES DE CABECERA · visual nueva
//
// Un solo personaje para toda la app: la kettlebell, en blanco y sin cara,
// redonda como las de verdad (bola con base plana y asa gruesa). En cada
// sección hace lo suyo:
//   Dash           saluda
//   Entrenamiento  levanta la barra
//   Alimentación   come (tenedor del plato a la boca)
//   Aprendizaje    lee un libro abierto
// Al entrar a la sección se mueve un momento; los detalles van en un tono
// suave del color de la sección.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';

const B = '#FFFFFF';
const CSS_KB = `
@keyframes kb-sube { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes kb-saluda { 0%, 100% { transform: rotate(0) } 50% { transform: rotate(18deg) } }
@keyframes kb-come { 0%, 15%, 100% { transform: rotate(0) } 50%, 65% { transform: rotate(-38deg) } }
@keyframes kb-hoja { 0%, 100% { transform: scaleX(1) } 45%, 55% { transform: scaleX(-1) } }
@keyframes kb-respira { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.03) } }
[data-ilustracion] .kb-sube { animation: kb-sube 1.6s ease-in-out .5s 3 both; }
[data-ilustracion] .kb-saluda { transform-box: fill-box; transform-origin: 50% 100%; animation: kb-saluda .6s ease-in-out .5s 5 both; }
[data-ilustracion] .kb-come { transform-box: view-box; animation: kb-come 1.5s ease-in-out .5s 3 both; }
[data-ilustracion] .kb-hoja { transform-box: fill-box; transform-origin: 0% 50%; animation: kb-hoja 1.8s ease-in-out .7s 2 both; }
[data-ilustracion] .kb-cuerpo { transform-box: fill-box; transform-origin: 50% 100%; animation: kb-respira 1.6s ease-in-out .5s 3 both; }
@media (prefers-reduced-motion: reduce) { [data-ilustracion] * { animation: none !important; } }`;

function Lienzo({ etiqueta, children }) {
  return (
    <svg viewBox="0 0 200 124" width="100%" height="100%" aria-hidden="true" data-ilustracion={etiqueta}
      style={{ display: 'block', overflow: 'visible' }}>
      <style>{CSS_KB}</style>
      {children}
    </svg>
  );
}

// La kettlebell: bola casi completa con la base plana, asa gruesa que nace
// de los hombros, un brillo y la línea de la base en el tono de la sección.
function Kettlebell({ tono }) {
  return (
    <g className="kb-cuerpo">
      <path d="M-25 -15C-32 -36 -24 -50 0 -50C24 -50 32 -36 25 -15" fill="none" stroke={B} strokeWidth="11" strokeLinecap="round" />
      <path d="M-22.6 32A36 36 0 1 1 22.6 32Z" fill={B} />
      <path d="M-25 2C-24 -11 -16 -21 -5 -24" fill="none" stroke={tono} strokeWidth="4" strokeLinecap="round" />
      <path d="M-20 29H20" stroke={tono} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  );
}

function Piernas() {
  return (
    <>
      <g stroke={B} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M-11 31 L-14 43" /><path d="M11 31 L14 43" />
      </g>
      <ellipse cx="-17" cy="44.5" rx="6.5" ry="3" fill={B} />
      <ellipse cx="17" cy="44.5" rx="6.5" ry="3" fill={B} />
    </>
  );
}

const brazo = { stroke: B, strokeWidth: 6, strokeLinecap: 'round', fill: 'none' };

export function IlusDash({ tono = 'rgba(122,85,0,0.30)' }) {
  // Saluda con la mano en alto; la otra en la cintura.
  return (
    <Lienzo etiqueta="dash">
      <g transform="translate(110 70)">
        <Piernas />
        <path d="M32 10 Q44 14 40 25" {...brazo} />
        <Kettlebell tono={tono} />
        <g className="kb-saluda">
          <path d="M-33 4 Q-48 -8 -50 -30" {...brazo} />
          <circle cx="-50" cy="-34" r="5" fill={B} />
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusEntreno({ tono = 'rgba(47,108,196,0.35)' }) {
  // Levanta la barra por encima del asa.
  return (
    <Lienzo etiqueta="entreno">
      <g transform="translate(110 80) scale(0.86)">
        <Piernas />
        <Kettlebell tono={tono} />
        <g className="kb-sube">
          <path d="M-35 2 Q-62 -18 -46 -62" {...brazo} /><path d="M35 2 Q62 -18 46 -62" {...brazo} />
          <g transform="translate(0 -66)">
            <rect x="-74" y="-2.5" width="148" height="5" rx="2.5" fill={B} />
            <rect x="-72" y="-15" width="9" height="30" rx="3.5" fill={B} />
            <rect x="-62" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
            <rect x="63" y="-15" width="9" height="30" rx="3.5" fill={B} />
            <rect x="55" y="-11" width="7" height="22" rx="3" fill={B} opacity="0.85" />
            <circle cx="-46" cy="0" r="4.5" fill={B} /><circle cx="46" cy="0" r="4.5" fill={B} />
          </g>
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusComida({ tono = 'rgba(47,127,69,0.35)', fuerte = '#3E8E57' }) {
  // Come: el plato hondo delante, en una mano; el tenedor sube con el bocado.
  return (
    <Lienzo etiqueta="comida">
      <g transform="translate(110 70)">
        <Piernas />
        <Kettlebell tono={tono} />
        {/* El plato, delante del cuerpo */}
        <g transform="translate(14 14)">
          <circle cx="-8" cy="-3" r="6" fill={fuerte} opacity="0.55" /><circle cx="4" cy="-5" r="7" fill={fuerte} opacity="0.7" /><circle cx="14" cy="-2" r="4.5" fill={fuerte} opacity="0.55" />
          <path d="M-21 0 H25 A23 15 0 0 1 -21 0 Z" fill={fuerte} />
          <path d="M-14 5 Q2 10 17 5" stroke={B} strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.5" />
        </g>
        <path d="M35 4 Q46 14 38 20" {...brazo} />
        <circle cx="38" cy="21" r="4.5" fill={B} />
        {/* El brazo con el tenedor: baja al plato y sube con el bocado */}
        <g className="kb-come" style={{ transformOrigin: '75px 74px' }}>
          <path d="M-35 4 Q-50 -6 -46 -26" {...brazo} />
          <circle cx="-45" cy="-29" r="4.5" fill={B} />
          <g transform="translate(-44 -32) rotate(30)">
            <path d="M0 0 V-18" stroke={B} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M-4.5 -16 V-26 M0 -16 V-27 M4.5 -16 V-26 M-4.5 -16 H4.5" stroke={B} strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <circle cx="0" cy="-30" r="5" fill={fuerte} />
          </g>
        </g>
      </g>
    </Lienzo>
  );
}

export function IlusAprende({ tono = 'rgba(201,95,23,0.35)', fuerte = '#D9732E' }) {
  // Lee: el libro abierto en las dos manos, delante del cuerpo, con la
  // tapa de color para que se lea sobre el blanco.
  return (
    <Lienzo etiqueta="aprende">
      <g transform="translate(110 70)">
        <Piernas />
        <Kettlebell tono={tono} />
        <g transform="translate(0 12)">
          <path d="M-35 -8 Q-44 2 -36 8" {...brazo} /><path d="M35 -8 Q44 2 36 8" {...brazo} />
          {/* Tapa */}
          <path d="M0 -10 C-12 -17 -28 -17 -40 -11 V14 C-28 9 -12 9 0 15 C12 9 28 9 40 14 V-11 C28 -17 12 -17 0 -10 Z" fill={fuerte} />
          {/* Hojas */}
          <path d="M0 -13 C-11 -19 -25 -19 -35 -14 V9 C-25 4 -11 4 0 10 Z" fill={B} />
          <path d="M0 -13 C11 -19 25 -19 35 -14 V9 C25 4 11 4 0 10 Z" fill={B} />
          <g stroke={fuerte} strokeWidth="2" strokeLinecap="round" opacity="0.55">
            <path d="M-28 -9 H-7 M-28 -3 H-7 M-28 3 H-15" /><path d="M7 -9 H28 M7 -3 H28 M7 3 H21" />
          </g>
          <path d="M0 -13 V10" stroke={fuerte} strokeWidth="1.8" opacity="0.6" />
          {/* La hoja que pasa */}
          <path className="kb-hoja" d="M0 -13 C8 -18 18 -19 27 -16 V7 C18 5 8 6 0 10 Z" fill={B} stroke={fuerte} strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx="-37" cy="8" r="4.5" fill={B} /><circle cx="37" cy="8" r="4.5" fill={B} />
        </g>
      </g>
    </Lienzo>
  );
}

export const ILUSTRACION = { entreno: IlusEntreno, comida: IlusComida, aprende: IlusAprende, dash: IlusDash };
