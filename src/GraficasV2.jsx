// ─────────────────────────────────────────────────────────────────────────
// GRÁFICAS DE LA VISUAL NUEVA
//
// Las piezas de las gráficas del Dash (tarjeta, columnas, leyenda, globo),
// aparte para que el calendario de comidas use EXACTAMENTE las mismas: el
// Dash va en su propio chunk y el calendario vive en la app principal.
// ─────────────────────────────────────────────────────────────────────────
import React, { useLayoutEffect, useRef, useState } from 'react';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

export const REJILLA = '#E7E3D9';
const TARJETA = '#FFFFFF';
const fmt = (n, dec = 0) => (n == null || !Number.isFinite(Number(n)) ? '—'
  : Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: dec }));

export function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setAncho(Math.max(80, Math.round(el.getBoundingClientRect().width)));
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

export // Tarjeta blanca, esquinas amplias y sin borde: la sombra apenas la separa
// del fondo. Título en negrita y la explicación en gris normal debajo.
function Tarjeta({ titulo, detalle, accion, children, style }) {
  return (
    <section style={{
      background: TARJETA, borderRadius: 24, padding: '18px 18px 16px', marginTop: 12,
      boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 10px 28px rgba(60,60,40,0.07)', ...style,
    }}>
      {(titulo || accion) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 750, color: TEXT, letterSpacing: '-0.015em' }}>{titulo}</h3>
          {accion}
        </div>
      )}
      {detalle && <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 3, lineHeight: 1.45 }}>{detalle}</div>}
      {children}
    </section>
  );
}

export function Leyenda({ items }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 11.5, color: TEXT_MUTED }}>
      {items.map(it => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {it.tipo === 'linea'
            ? <span style={{ width: 14, height: 2, background: it.color, borderRadius: 2 }} />
            : it.tipo === 'banda'
              ? <span style={{ width: 12, height: 10, background: it.color, borderRadius: 3 }} />
              : <span style={{ width: 10, height: 10, background: it.color, borderRadius: 3 }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}

// El valor que se tocó, encima de la gráfica. Un solo globo por gráfica.
export function Globo({ x, ancho, texto }) {
  if (texto == null) return null;
  const w = Math.min(170, 18 + texto.length * 6.6);
  const left = Math.max(0, Math.min(ancho - w, x - w / 2));
  return (
    <div role="status" style={{
      position: 'absolute', top: 0, left, width: w, textAlign: 'center',
      background: TEXT, color: '#fff', fontSize: 11.5, fontWeight: 650, borderRadius: 8,
      padding: '4px 6px', pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>{texto}</div>
  );
}

// Columnas desde una sola línea base. `marca` (opcional) es la meta de cada
// columna, dibujada como una raya fina a su altura.
export function Columnas({ datos, color, alto = 128, marca, etiquetaX, textoValor, maximo, tope }) {
  const [ref, ancho] = useAncho();
  const [sel, setSel] = useState(null);
  const arriba = 26, abajo = 20, izq = 26;
  const alturaUtil = alto - arriba - abajo;
  const max = Math.max(1, maximo || 0, ...datos.map(d => d.valor || 0), ...datos.map(d => (marca ? marca(d) : 0) || 0));
  // `tope` fija el eje (los días de una semana van de 0 a 7, no a 8).
  const topeEje = tope || niceTope(max);
  const paso = (ancho - izq) / datos.length;
  const barra = Math.min(22, Math.max(6, paso - 6));
  const y = (v) => arriba + alturaUtil - (v / topeEje) * alturaUtil;
  const marcas = tope ? [0, tope] : [0, topeEje / 2, topeEje];
  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 8, width: '100%', minWidth: 0, minHeight: alto }}>
      {ancho > 0 && <svg width={ancho} height={alto} style={{ display: 'block', overflow: 'visible' }}>
        {marcas.map(m => (
          <g key={m}>
            <line x1={izq} x2={ancho} y1={y(m)} y2={y(m)} stroke={REJILLA} strokeWidth="1" />
            <text x={izq - 6} y={y(m) + 3.5} textAnchor="end" fontSize="10" fill={TEXT_LIGHT} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(m)}</text>
          </g>
        ))}
        {datos.map((d, i) => {
          const cx = izq + paso * i + paso / 2;
          const v = d.valor || 0;
          const h = Math.max(0, y(0) - y(v));
          const r = Math.min(4, h, barra / 2);
          const x0 = cx - barra / 2, y0 = y(v);
          const meta = marca ? marca(d) : null;
          return (
            <g key={i} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
              <rect x={cx - paso / 2} y={arriba - 6} width={paso} height={alturaUtil + 6} fill="transparent" />
              {v > 0 && (
                <path d={`M${x0},${y(0)} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + barra - r} Q${x0 + barra},${y0} ${x0 + barra},${y0 + r} V${y(0)} Z`}
                  fill={color} opacity={sel == null || sel === i ? 1 : 0.45} />
              )}
              {meta > 0 && (
                <line x1={cx - barra / 2 - 3} x2={cx + barra / 2 + 3} y1={y(meta)} y2={y(meta)} stroke={TEXT} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
              )}
              {etiquetaX && etiquetaX(d, i) && (
                <text x={cx} y={alto - 5} textAnchor="middle" fontSize="10" fill={TEXT_LIGHT}>{etiquetaX(d, i)}</text>
              )}
            </g>
          );
        })}
      </svg>}
      {sel != null && <Globo x={izq + paso * sel + paso / 2} ancho={ancho} texto={textoValor(datos[sel])} />}
    </div>
  );
}

export function niceTope(v) {
  if (v <= 4) return 4;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

