// ─────────────────────────────────────────────────────────────────────────
// GRÁFICAS DE LA VISUAL NUEVA
//
// Las piezas de las gráficas del Dash (tarjeta, columnas, leyenda, globo),
// aparte para que el calendario de comidas use EXACTAMENTE las mismas: el
// Dash va en su propio chunk y el calendario vive en la app principal.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';
import { useCapaActiva } from './capaActiva.js';
import { enPrueba } from './vistaApp.js';

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
function Tarjeta({ titulo, detalle, accion, children, style, colorTitulo = TEXT }) {
  return (
    <section data-tarjeta={typeof titulo === 'string' ? titulo : undefined} style={{
      background: TARJETA, borderRadius: 24, padding: '18px 18px 16px', marginTop: 12,
      boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 10px 28px rgba(60,60,40,0.07)', ...style,
    }}>
      {(titulo || accion) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 750, color: colorTitulo, letterSpacing: '-0.015em' }}>{titulo}</h3>
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
  // Las barras crecen desde el piso al aparecer (y cada vez que la sección
  // vuelve al frente), como los aros.
  const crece = useDesdeCero(1, 80);
  const arriba = 26, abajo = 20, izq = 26;
  const alturaUtil = alto - arriba - abajo;
  const max = Math.max(1, maximo || 0, ...datos.map(d => d.valor || 0), ...datos.map(d => (marca ? marca(d) : 0) || 0));
  // `tope` fija el eje (los días de una semana van de 0 a 7, no a 8).
  const topeEje = tope || niceTope(max);
  const paso = (ancho - izq) / datos.length;
  const barra = Math.min(22, Math.max(6, paso - 6));
  const y = (v) => arriba + alturaUtil - (v / topeEje) * alturaUtil;
  const marcas = tope ? [0, tope] : [0, topeEje / 2, topeEje];
  // Vista en prueba: resalta la última barra CON dato (antes la última del
  // todo, que en una semana a medias es un día vacío, y todas quedaban
  // lavadas), y las barras llevan su color pleno con un degradado suave.
  const prueba = enPrueba();
  let ultimaConDato = datos.length - 1;
  if (prueba) { ultimaConDato = -1; datos.forEach((d, i) => { if ((d.valor || 0) > 0) ultimaConDato = i; }); }
  const idGrad = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 8, width: '100%', minWidth: 0, minHeight: alto }}>
      {ancho > 0 && <svg width={ancho} height={alto} style={{ display: 'block', overflow: 'visible' }}>
        {prueba && <defs><linearGradient id={`cg${idGrad}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} /><stop offset="1" stopColor={color} stopOpacity="0.72" /></linearGradient></defs>}
        {marcas.map(m => (
          <g key={m}>
            <line x1={izq} x2={ancho} y1={y(m)} y2={y(m)} stroke={REJILLA} strokeWidth="1" strokeOpacity="0.6" />
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
                  fill={prueba ? `url(#cg${idGrad})` : color} opacity={(sel == null ? i === ultimaConDato : sel === i) ? 1 : (prueba ? 0.62 : 0.42)}
                  style={{ transform: `scaleY(${crece})`, transformBox: 'fill-box', transformOrigin: '50% 100%', transition: `transform .9s cubic-bezier(.22,.8,.24,1) ${Math.min(i * 25, 400)}ms` }} />
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


// ── EL ANILLO DE LA MARCA ─────────────────────────────────────────────────
// Trazo redondeado sobre su riel crema y el punto blanco en la punta, como
// el ícono. Al aparecer se LLENA desde cero (una vez, ~1 s, sin rebote) y el
// punto viaja con la punta; quien pide menos movimiento lo ve ya lleno.
// Todos los anillos grandes de la visual nueva son este.
const RIEL = '#F4F1EB';
const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Arranca en cero y sube a su valor. Y cada vez que la sección vuelve al
// frente (ver capaActiva.js) vuelve a cero mientras está escondida y se llena
// de nuevo al aparecer: las gráficas de todos los módulos se «despliegan» al
// navegar, aunque la sección siga montada por detrás.
export function useDesdeCero(valor, retardo = 60) {
  const activa = useCapaActiva();
  const [v, setV] = useState(() => (sinMovimiento() ? valor : 0));
  useEffect(() => {
    if (sinMovimiento()) { setV(valor); return; }
    // Vista en prueba: se llena solo la primera vez; al cambiar de sección no
    // se vacía ni se vuelve a llenar (se veía como un temblor en el cambio).
    if (!activa) { if (!enPrueba()) setV(0); return; }
    const t = setTimeout(() => setV(valor), retardo);
    return () => clearTimeout(t);
  }, [valor, retardo, activa]);
  return v;
}

// ── ESTILO APPLE ──────────────────────────────────────────────────────────
// Como los anillos de Actividad: el aro lleva un degradado A LO LARGO del
// trazo (del tono oscuro al claro de su color), el riel es su mismo color muy
// suave y la punta tiene una sombrita; el punto blanco de la marca sigue en
// la punta. Sin vidrio: los datos van nítidos.
const aRGB = (c) => {
  const s = String(c || '').trim();
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) return m[1].split('').map(h => parseInt(h + h, 16));
  m = s.match(/^#([0-9a-f]{6})/i);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  m = s.match(/^rgba?\(([^)]+)\)/i);
  if (m) return m[1].split(',').slice(0, 3).map(Number);
  return null;
};
const mezcla = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(', ')})`;
// El riel (o el fondo de una barrita): su mismo color, muy suave.
export const rielDe = (color, alfa = 0.07, porDefecto = '#F4F1EB') => {
  const c = aRGB(color);
  return c ? `rgba(${c.join(', ')}, ${alfa})` : porDefecto;
};
const tonos = (color) => {
  const c = aRGB(color);
  return c ? { osc: mezcla(c, [0, 0, 0], 0.18), cla: mezcla(c, [255, 255, 255], 0.3) } : null;
};

// El trazo del aro (opción B de Mauro): el color pleno del módulo y, solo
// en el último tramo, una luz suave que se aclara hasta la punta, donde va
// el punto blanco. `frac` es lo que se ve (se anima); `objetivo`, hasta dónde
// llega (de ahí sale dónde empieza la luz). El centro en (m, m); empieza
// arriba y va en el sentido del reloj.
// El degradado va en tajadas de medio grado que se montan un poco entre sí:
// con las de 4° de antes se veían los escalones de tono a lo largo del trazo.
const TRAMO_LUZ = 110;   // grados que dura la luz antes de la punta
export function ArcoApple({ m, r, grosor, frac, objetivo = frac, color, transicion }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = tonos(color);
  const L = 2 * Math.PI * r;
  const visible = frac > 0 ? 1 : 0;
  const G = Math.max(0.0001, Math.min(1, objetivo)) * 360;
  const R = r + grosor;
  const cuñas = useMemo(() => {
    if (!t) return null;
    const p = (a) => { const rad = a * Math.PI / 180; return `${(m + R * Math.sin(rad)).toFixed(2)},${(m - R * Math.cos(rad)).toFixed(2)}`; };
    const desde = Math.max(0, G - TRAMO_LUZ), base = aRGB(color), luz = aRGB(t.cla);
    const capa = ((grosor / 2) / r) * (180 / Math.PI) + 2;
    const out = [];
    for (let a = desde; a < G; a += 0.5) {
      out.push(<path key={a} d={`M${m},${m} L${p(a)} A${R},${R} 0 0 1 ${p(Math.min(G + 0.3, a + 0.9))} Z`} fill={mezcla(base, luz, (a + 0.25 - desde) / (G - desde))} />);
    }
    // La tapa redonda de la punta, ya en el tono de la luz.
    out.push(<path key="tapa" d={`M${m},${m} L${p(G)} A${R},${R} 0 0 1 ${p(Math.min(359.9, G + capa))} Z`} fill={t.cla} />);
    return out;
  }, [color, G, m, r, R, grosor]);
  if (!t) {
    return <circle cx={m} cy={m} r={r} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" transform={`rotate(-90 ${m} ${m})`}
      strokeDasharray={L} strokeDashoffset={L * (1 - frac)} style={{ transition: transicion, opacity: visible }} />;
  }
  return (
    <g>
      <defs>
        <mask id={`ma${id}`} maskUnits="userSpaceOnUse" x={m - R} y={m - R} width={2 * R} height={2 * R}>
          <circle cx={m} cy={m} r={r} fill="none" stroke="#fff" strokeWidth={grosor} strokeLinecap="round" transform={`rotate(-90 ${m} ${m})`}
            strokeDasharray={L} strokeDashoffset={L * (1 - frac)} style={{ transition: transicion }} />
        </mask>
      </defs>
      <g mask={`url(#ma${id})`} style={{ opacity: visible, transition: 'opacity .2s' }}>
        <circle cx={m} cy={m} r={R} fill={color} />
        {cuñas}
      </g>
    </g>
  );
}

// La punta: la tapa redonda con su sombrita y, encima, el punto blanco.
// Va dentro de un grupo ya girado -90° (la punta en (m + r, m) al inicio).
export function PuntaApple({ m, r, grosor, frac, color, transicion, radioPunto, sombra = true }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = tonos(color);
  return (
    <g style={{ transform: `rotate(${frac * 360}deg)`, transformOrigin: `${m}px ${m}px`, transition: `transform ${transicion}, opacity .2s`, opacity: frac > 0.02 ? 1 : 0 }}>
      {t && (
        <>
          {sombra && (
            <defs>
              <filter id={`so${id}`} x="-100%" y="-100%" width="300%" height="300%">
                <feDropShadow dx="0" dy="0" stdDeviation={Math.max(0.6, grosor * 0.16)} floodColor="#000" floodOpacity="0.3" />
              </filter>
            </defs>
          )}
          <circle cx={m + r} cy={m} r={grosor / 2} fill={t.cla} filter={sombra ? `url(#so${id})` : undefined} />
        </>
      )}
      {/* Vista en prueba: el punto blanco más grande (casi el ancho del trazo). */}
      <circle data-punta-blanca cx={m + r} cy={m} r={enPrueba() ? Math.max(2.2, grosor / 2 - 1) : (radioPunto ?? Math.max(1.5, grosor / 2 - 2.5))} fill="#FFFFFF" />
    </g>
  );
}

// `plano` (las cabeceras, junto al objeto 3D): el mismo trazo con su luz
// hacia la punta, sobre un riel casi blanco y sin sombras. El punto blanco de
// la punta se queda siempre.
export function AnilloMarca({ frac, color, tam = 118, grosor = 11, riel = null, etiqueta, plano = false, children }) {
  const objetivo = Math.max(0, Math.min(1, Number(frac) || 0));
  const f = useDesdeCero(objetivo);
  const r = (tam - grosor) / 2, m = tam / 2;
  const curva = '1s cubic-bezier(.22,.8,.24,1)';
  return (
    <div data-anillo data-plano={plano ? '1' : undefined} style={{ position: 'relative', width: tam, height: tam, flex: 'none' }}>
      <svg width={tam} height={tam} role="img" aria-label={etiqueta} style={{ overflow: 'visible' }}>
        <circle cx={m} cy={m} r={r} fill="none" stroke={riel || rielDe(color, 0.07, RIEL)} strokeWidth={grosor} />
        <ArcoApple m={m} r={r} grosor={grosor} frac={f} objetivo={objetivo} color={color} transicion={`stroke-dashoffset ${curva}`} />
        <g transform={`rotate(-90 ${m} ${m})`}>
          <PuntaApple m={m} r={r} grosor={grosor} frac={f} color={color} transicion={curva}
            radioPunto={plano ? grosor * 0.22 : undefined} sombra={!plano} />
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>{children}</div>
      </div>
    </div>
  );
}

// Una línea suave entre puntos (sin picos): curva monotónica, que nunca se
// pasa por encima ni por debajo de los valores reales.
export function curvaSuave(pts) {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const dx = [], dy = [], s = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; s[i] = dx[i] ? dy[i] / dx[i] : 0; }
  const tg = [s[0]];
  for (let i = 1; i < n - 1; i++) tg[i] = s[i - 1] * s[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / s[i - 1] + (dx[i] + 2 * dx[i - 1]) / s[i]);
  tg[n - 1] = s[n - 2];
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + tg[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - tg[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}
