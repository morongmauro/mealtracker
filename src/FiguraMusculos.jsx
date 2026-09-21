// ─────────────────────────────────────────────────────────────────────────
// FIGURA MUSCULAR · qué trabaja este ejercicio
//
// Dos siluetas, frente y espalda, con los músculos PRIMARIOS pintados fuerte
// y los SECUNDARIOS suaves. Va al lado de la descripción del ejercicio:
// la gente quiere aprender qué está entrenando, y un dibujo lo dice en un
// segundo donde una lista de nombres no dice nada.
//
// Las formas salen de `figura-formas.js`, que es un archivo GENERADO y
// compartido con el CRM (`musculos-figura.js`): así el mismo ejercicio se ve
// idéntico en los dos lados. El generador vive en el repo del módulo de
// entrenamiento (entrenamientoecm/carga/gen-figura.py); si lo vuelves a
// correr, copia el `figura-formas.js` resultante también aquí.
//
// USO
//   <FiguraMusculos primarios={ej.musculos_primarios}
//                   secundarios={ej.musculos_secundarios} />
// ─────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { FIG_CUERPO, FIG_FRENTE, FIG_ESPALDA } from './figura-formas.js';
import { MUSCULO_POR_SLUG } from './musculos.js';
import { ACCENT, ACCENT_PASTEL, BORDER, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

const PIEL = '#F7F4ED';   // relleno de la silueta

function Cara({ formas, prim, sec, titulo, idClip, etiqueta }) {
  const todoElCuerpo = prim.has('cuerpo_completo') || sec.has('cuerpo_completo');
  const relleno = todoElCuerpo
    ? (prim.has('cuerpo_completo') ? ACCENT : ACCENT_PASTEL)
    : PIEL;

  // Solo se dibuja lo que el ejercicio trabaja. Pintar además los 30 músculos
  // en gris llenaba el cuerpo de placas pálidas y costaba ver de un vistazo
  // cuál era el principal, que es lo único que hay que ver.
  const piezas = [];
  for (const [slug, paths] of Object.entries(formas)) {
    const esPrim = prim.has(slug), esSec = sec.has(slug);
    if (!paths.length || (!esPrim && !esSec)) continue;
    const nombre = MUSCULO_POR_SLUG[slug]?.nombre || slug;
    paths.forEach((d, i) => piezas.push(
      <path key={`${slug}-${i}`} d={d} fill={esPrim ? ACCENT : ACCENT_PASTEL} data-musculo={slug}>
        <title>{nombre}</title>
      </path>
    ));
  }

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg viewBox="0 0 100 220" role="img" aria-label={titulo}
           preserveAspectRatio="xMidYMid meet" style={{ height: '100%', width: 'auto', display: 'block' }}>
        <defs>
          <clipPath id={idClip}>
            {FIG_CUERPO.map((d, i) => <path key={i} d={d} />)}
          </clipPath>
        </defs>
        {FIG_CUERPO.map((d, i) => <path key={`f${i}`} d={d} fill={relleno} />)}
        {/* El recorte es lo que impide que un músculo se salga del cuerpo:
            las formas se dibujan generosas a propósito y el contorno manda. */}
        <g clipPath={`url(#${idClip})`}>{piezas}</g>
        {FIG_CUERPO.map((d, i) => (
          <path key={`c${i}`} d={d} fill="none" stroke={BORDER}
                strokeWidth="0.9" strokeLinejoin="round" />
        ))}
      </svg>
      {etiqueta && (
        <figcaption style={{
          fontSize: '.6rem', letterSpacing: '.04em', textTransform: 'uppercase',
          color: TEXT_LIGHT,
        }}>{titulo}</figcaption>
      )}
    </figure>
  );
}

let _seq = 0;

// `etiquetas`: el "FRENTE"/"ESPALDA" bajo cada silueta. Con las dos caras
// hace falta para saber cuál es cuál; en una miniatura es solo ruido, así que
// por defecto sigue a `cara`.
export default function FiguraMusculos({
  primarios = [], secundarios = [], cara = 'ambas', leyenda = true, alto = 150,
  etiquetas = null,
}) {
  const p = useMemo(() => (primarios || []).filter(Boolean), [primarios]);
  const s = useMemo(
    () => (secundarios || []).filter(Boolean).filter(x => !p.includes(x)),
    [secundarios, p]);

  // Un id por instancia: dos figuras con el mismo clipPath harían que la
  // segunda recortara con la silueta de la primera.
  const base = useMemo(() => `fig-${++_seq}`, []);

  if (!p.length && !s.length) return null;

  const prim = new Set(p), sec = new Set(s);
  const conPie = etiquetas == null ? (cara === 'ambas') : !!etiquetas;
  const nombres = (l) => l.map(x => MUSCULO_POR_SLUG[x]?.corto || x).join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, height: alto }}>
        {cara !== 'espalda' && (
          <Cara formas={FIG_FRENTE} prim={prim} sec={sec} titulo="Frente" idClip={`${base}-f`} etiqueta={conPie} />
        )}
        {cara !== 'frente' && (
          <Cara formas={FIG_ESPALDA} prim={prim} sec={sec} titulo="Espalda" idClip={`${base}-e`} etiqueta={conPie} />
        )}
      </div>

      {leyenda && (
        <div style={{ fontSize: '.7rem', lineHeight: 1.5, color: TEXT_MUTED }}>
          {!!p.length && (
            <div>
              <Punto color={ACCENT} /><b>Principal:</b> {nombres(p)}
            </div>
          )}
          {!!s.length && (
            <div>
              <Punto color={ACCENT_PASTEL} /><b>También trabaja:</b> {nombres(s)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Punto = ({ color }) => (
  <span style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: 2,
    background: color, marginRight: 6, verticalAlign: 'baseline',
  }} />
);
