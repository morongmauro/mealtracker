// ─────────────────────────────────────────────────────────────────────────
// DASH · cómo vas en todo, en una pantalla
//
// Entrenamiento y comida viven en secciones distintas, y está bien para
// registrar; pero para saber cómo vas había que mirar en dos sitios y sumar
// de cabeza. Aquí va junto, en el orden en que se pregunta:
//
//   1. Esta semana       — entrenos, días con comida registrada, proteína
//   2. Consistencia      — 12 semanas: entrenos hechos contra lo planeado
//   3. Fuerza            — el 1RM estimado de sus ejercicios más hechos
//   4. Volumen           — kilos movidos por semana
//   5. Proteína          — 14 días contra la meta
//   6. Calorías          — 14 días: cuántos cayeron dentro de ±10 % de la meta
//   7. Cuerpo            — peso y % de grasa
//
// Igual que el resumen de la semana: NO se pone nota. Se enseñan los números
// y la persona saca su conclusión. La fuerza va arriba de la comida a
// propósito — es la que manda en la pantalla.
//
// Las gráficas son SVG a mano: una serie por gráfica, marcas finas, ejes y
// rejilla en gris de un paso, y al tocar una barra o un punto sale su valor.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { api, hoyLocal, sumarDias, aFecha } from './entrenoDatos.js';
import { HojaMedida } from './EntrenoMedidas.jsx';
import {
  SURFACE, BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT, SHADOW_CARD,
  FONT_DISPLAY, C_PROTEIN, SECCION,
} from './theme.js';

const AZUL = SECCION.dash.base;
const NARANJA = SECCION.entreno.base;
const VERDE = SECCION.comida.base;
const REJILLA = '#E4E1D6';
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fmt = (n, dec = 0) => (n == null || !Number.isFinite(Number(n)) ? '—'
  : Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: dec }));
const fechaCorta = (iso) => { const d = aFecha(iso); return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`; };
const DIA_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// ── Datos de comida: salen del propio teléfono ────────────────────────────
// `history[fecha]` son los totales del día que el cliente ve en su pantalla;
// no se recalcula nada, solo se agrupa.
export function datosComida(history = {}, goals = {}, hoy = hoyLocal()) {
  const dia = (f) => {
    const t = history[f];
    return t && typeof t === 'object' && Number(t.kcal) > 0
      ? { kcal: Number(t.kcal) || 0, p: Number(t.p) || 0 } : null;
  };
  const ultimos = [];
  for (let i = 13; i >= 0; i--) {
    const f = sumarDias(hoy, -i);
    ultimos.push({ fecha: f, ...(dia(f) || { kcal: null, p: null }) });
  }
  // Semanas de lunes a domingo, las mismas 12 del entrenamiento.
  const lunes = sumarDias(hoy, -((aFecha(hoy).getDay() + 6) % 7));
  const semanas = [];
  for (let s = 11; s >= 0; s--) {
    const desde = sumarDias(lunes, -7 * s);
    let dias = 0;
    for (let k = 0; k < 7; k++) {
      const f = sumarDias(desde, k);
      if (f <= hoy && dia(f)) dias++;
    }
    const transcurridos = s === 0 ? Math.min(7, (aFecha(hoy).getDay() + 6) % 7 + 1) : 7;
    semanas.push({ desde, dias, transcurridos });
  }
  const metaK = Number(goals && goals.kcal) || null;
  const metaP = Number(goals && goals.p) || null;
  const conDato = ultimos.filter(d => d.kcal != null);
  const enRango = metaK ? conDato.filter(d => Math.abs(d.kcal - metaK) <= metaK * 0.1).length : null;
  const semanaActual = semanas[semanas.length - 1];
  const estaSemana = ultimos.filter(d => d.fecha >= semanaActual.desde && d.p != null);
  return {
    ultimos, semanas, metaK, metaP, enRango, conDato: conDato.length,
    proteinaSemana: estaSemana.length ? Math.round(estaSemana.reduce((a, d) => a + d.p, 0) / estaSemana.length) : null,
  };
}

// ── Piezas ────────────────────────────────────────────────────────────────
function useAncho() {
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

function Tarjeta({ titulo, detalle, accion, children, style }) {
  return (
    <section style={{
      background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 22,
      boxShadow: SHADOW_CARD, padding: '16px 16px 14px', marginTop: 12, ...style,
    }}>
      {(titulo || accion) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 750, color: TEXT, letterSpacing: '-0.01em' }}>{titulo}</h2>
          {accion}
        </div>
      )}
      {detalle && <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2, lineHeight: 1.45 }}>{detalle}</div>}
      {children}
    </section>
  );
}

function Dato({ etiqueta, valor, unidad, pie, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} style={{
      flex: 1, minWidth: 0, textAlign: 'left', border: `1px solid ${BORDER_SOFT}`, background: 'rgba(255,255,255,0.6)',
      borderRadius: 16, padding: '11px 12px', fontFamily: 'inherit', cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ fontSize: 11.5, fontWeight: 650, color: TEXT_MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{etiqueta}</div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 26, fontWeight: 750, color: TEXT, lineHeight: 1, letterSpacing: '-0.02em' }}>{valor}</span>
        {unidad && <span style={{ fontSize: 12.5, fontWeight: 600, color: TEXT_MUTED }}>{unidad}</span>}
      </div>
      {pie && <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pie}</div>}
    </Tag>
  );
}

function Leyenda({ items }) {
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
function Globo({ x, ancho, texto }) {
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
function Columnas({ datos, color, alto = 128, marca, etiquetaX, textoValor, maximo, tope }) {
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

// Una línea de 2px con su punto final. Sin ejes: es una tendencia, y el número
// que importa va escrito al lado.
function Linea({ puntos, color, alto = 46, textoValor }) {
  const [ref, ancho] = useAncho();
  const [sel, setSel] = useState(null);
  const vals = puntos.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const rango = max - min || 1;
  const pad = 6;
  const x = (i) => pad + (puntos.length === 1 ? 0 : (i / (puntos.length - 1)) * (ancho - pad * 2));
  const y = (v) => pad + (1 - (v - min) / rango) * (alto - pad * 2);
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const ult = puntos.length - 1;
  const area = `${d} L${x(ult)},${alto} L${x(0)},${alto} Z`;
  const tocar = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left);
    let mejor = 0;
    puntos.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(mejor) - px)) mejor = i; });
    setSel(sel === mejor ? null : mejor);
  };
  return (
    <div ref={ref} style={{ position: 'relative', paddingTop: textoValor ? 24 : 0, width: '100%', minWidth: 0, minHeight: alto }}>
      {ancho > 0 && <svg width={ancho} height={alto} style={{ display: 'block', overflow: 'visible', cursor: textoValor ? 'pointer' : 'default' }}
        onClick={textoValor ? tocar : undefined}>
        <path d={area} fill={color} opacity="0.10" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {sel != null && <line x1={x(sel)} x2={x(sel)} y1={0} y2={alto} stroke={REJILLA} strokeWidth="1" />}
        <circle cx={x(sel ?? ult)} cy={y(puntos[sel ?? ult].v)} r="4.5" fill={color} stroke={SURFACE} strokeWidth="2" />
      </svg>}
      {textoValor && sel != null && <Globo x={x(sel)} ancho={ancho} texto={textoValor(puntos[sel])} />}
    </div>
  );
}

function niceTope(v) {
  if (v <= 4) return 4;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

const Cambio = ({ desde, hasta, unidad, bueno = 'sube' }) => {
  if (desde == null || hasta == null) return null;
  const dif = Math.round((hasta - desde) * 10) / 10;
  if (dif === 0) return <span style={{ color: TEXT_MUTED }}>igual</span>;
  const sube = dif > 0;
  const esBueno = bueno === 'sube' ? sube : bueno === 'baja' ? !sube : null;
  return (
    <span style={{ color: esBueno == null ? TEXT_MUTED : esBueno ? '#3E6B3D' : TEXT_MUTED, fontWeight: 650 }}>
      {sube ? '▲' : '▼'} {fmt(Math.abs(dif), 1)} {unidad}
    </span>
  );
};

// ── La pantalla ───────────────────────────────────────────────────────────
export default function Dash({ name, history, goals, entrenoOn = true, alIr }) {
  const hoy = hoyLocal();
  const [ent, setEnt] = useState(null);
  const [falloEnt, setFalloEnt] = useState(false);
  const [midiendo, setMidiendo] = useState(false);

  const cargar = async () => {
    setFalloEnt(false);
    const r = await api.dash(name);
    if (r && r.ok) setEnt(r); else setFalloEnt(true);
  };
  useEffect(() => { if (name) cargar(); /* eslint-disable-next-line */ }, [name]);

  const comida = useMemo(() => datosComida(history, goals, hoy), [history, goals, hoy]);
  const semana = ent?.semanas?.[ent.semanas.length - 1];

  return (
    <div style={{
      position: 'relative', maxWidth: 560, margin: '0 auto', padding: '0 16px',
      paddingTop: 'calc(58px + env(safe-area-inset-top, 0px))',
      paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
    }}>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 34, lineHeight: 1, margin: '6px 2px 2px', color: TEXT, fontWeight: 400, letterSpacing: '0.01em' }}>
        Cómo vas
      </h1>
      <div style={{ fontSize: 13, color: TEXT_MUTED, margin: '0 2px' }}>Semana del {fechaCorta(comida.semanas[11].desde)} · hoy {fechaCorta(hoy)}</div>

      {/* 1. Esta semana */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {entrenoOn && (
          <Dato etiqueta="Entrenos"
            valor={semana ? semana.hechos : '—'} unidad={semana && semana.planeados ? `de ${semana.planeados}` : null}
            pie={semana ? (semana.cardio_min ? `+${fmt(semana.cardio_min)} min cardio` : 'esta semana') : 'cargando…'}
            onClick={alIr ? () => alIr('entreno', 'hoy') : undefined} />
        )}
        <Dato etiqueta="Comida"
          valor={comida.semanas[11].dias} unidad={`de ${comida.semanas[11].transcurridos}`}
          pie="días registrados" onClick={alIr ? () => alIr('comida', 'hoy') : undefined} />
        <Dato etiqueta="Proteína"
          valor={comida.proteinaSemana != null ? fmt(comida.proteinaSemana) : '—'} unidad="g"
          pie={comida.metaP ? `al día · meta ${fmt(comida.metaP)}` : 'al día, promedio'} />
      </div>

      {entrenoOn && falloEnt && (
        <Tarjeta titulo="Entrenamiento" detalle="No pude traer tus datos de entrenamiento. Revisa tu señal.">
          <button onClick={cargar} style={{ marginTop: 10, border: `1px solid ${BORDER}`, background: 'transparent', borderRadius: 999, padding: '7px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, color: TEXT, cursor: 'pointer' }}>Reintentar</button>
        </Tarjeta>
      )}

      {/* 2. Consistencia */}
      {entrenoOn && ent && (
        <Tarjeta titulo="Consistencia" detalle="Entrenos hechos por semana, contra los que tenías planeados.">
          <Columnas
            datos={ent.semanas.map(w => ({ ...w, valor: w.hechos }))}
            color={NARANJA}
            marca={(w) => w.planeados}
            etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
            textoValor={(w) => `${fechaCorta(w.desde)}: ${w.hechos}${w.planeados ? ` de ${w.planeados}` : ''}`}
          />
          <Leyenda items={[{ label: 'Hechos', color: NARANJA }, { label: 'Planeados', color: 'rgba(31,31,31,0.55)', tipo: 'linea' }]} />
          <div style={{ height: 1, background: BORDER_SOFT, margin: '14px 0 2px' }} />
          <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 10 }}>Días con la comida registrada</div>
          <Columnas
            datos={comida.semanas.map(w => ({ ...w, valor: w.dias }))}
            color={VERDE} alto={104} tope={7}
            marca={(w) => w.transcurridos}
            etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
            textoValor={(w) => `${fechaCorta(w.desde)}: ${w.dias} de ${w.transcurridos} días`}
          />
        </Tarjeta>
      )}

      {/* 3. Fuerza */}
      {entrenoOn && ent && (
        <Tarjeta titulo="Fuerza"
          detalle="Tu 1RM estimado: lo que levantarías a una repetición, calculado con tu mejor serie de cada día. Deja comparar 60 × 10 con 65 × 6.">
          {ent.ejercicios.length === 0 ? (
            <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 12 }}>Aparece cuando repitas un mismo ejercicio en dos sesiones.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
              {ent.ejercicios.map(e => (
                <div key={e.id} style={{ border: `1px solid ${BORDER_SOFT}`, borderRadius: 16, padding: '11px 12px 8px', minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 650, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
                    <span style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em' }}>{fmt(e.actual, 1)}</span>
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>kg</span>
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 1 }}>
                    <Cambio desde={e.inicio} hasta={e.actual} unidad="kg" />
                    <span style={{ color: TEXT_LIGHT }}> desde {fechaCorta(e.puntos[0].fecha)}</span>
                  </div>
                  <Linea puntos={e.puntos.map(p => ({ v: p.e1rm, fecha: p.fecha }))} color={NARANJA}
                    textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} />
                </div>
              ))}
            </div>
          )}
        </Tarjeta>
      )}

      {/* 4. Volumen */}
      {entrenoOn && ent && ent.semanas.some(w => w.volumen_kg > 0) && (
        <Tarjeta titulo="Volumen" detalle="Kilos movidos por semana (peso × repeticiones de todas tus series).">
          <Columnas
            datos={ent.semanas.map(w => ({ ...w, valor: w.volumen_kg }))}
            color={NARANJA}
            etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
            textoValor={(w) => `${fechaCorta(w.desde)}: ${fmt(w.volumen_kg)} kg`}
          />
        </Tarjeta>
      )}

      {/* 5. Proteína */}
      <Tarjeta titulo="Proteína"
        detalle={comida.metaP ? `Últimos 14 días. La raya es tu meta de ${fmt(comida.metaP)} g.` : 'Últimos 14 días.'}>
        {comida.conDato === 0 ? (
          <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 12 }}>Registra tu comida en el chat y aquí ves tu proteína día a día.</div>
        ) : (
          <Columnas
            datos={comida.ultimos.map(d => ({ ...d, valor: d.p }))}
            color={C_PROTEIN}
            marca={() => comida.metaP}
            etiquetaX={(d) => DIA_LETRA[aFecha(d.fecha).getDay()]}
            textoValor={(d) => (d.p == null ? `${fechaCorta(d.fecha)}: sin registro` : `${fechaCorta(d.fecha)}: ${fmt(d.p)} g`)}
          />
        )}
      </Tarjeta>

      {/* 6. Calorías: alineación a la meta */}
      {comida.metaK && comida.conDato > 0 && (
        <Tarjeta titulo="Alineación a tu meta"
          detalle={`Calorías de los últimos 14 días. La franja es tu meta de ${fmt(comida.metaK)} kcal, ±10 %.`}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 30, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1 }}>{comida.enRango}</span>
            <span style={{ fontSize: 13, color: TEXT_MUTED }}>de {comida.conDato} días registrados dentro de la franja</span>
          </div>
          <Alineacion dias={comida.ultimos} meta={comida.metaK} />
          <Leyenda items={[{ label: 'Tus calorías', color: VERDE }, { label: 'Meta ±10 %', color: 'rgba(79,106,28,0.14)', tipo: 'banda' }]} />
        </Tarjeta>
      )}

      {/* 7. Cuerpo */}
      <Cuerpo medidas={ent?.medidas || []} cargando={entrenoOn && !ent && !falloEnt} alMedir={() => setMidiendo(true)} />
      <HojaMedida abierta={midiendo} nombre={name} alCerrar={() => setMidiendo(false)}
        alGuardar={() => { setMidiendo(false); cargar(); }} />
    </div>
  );
}

// Puntos de calorías sobre la franja de la meta. Puntos y no barras: lo que
// se lee es la distancia a la franja, no el tamaño.
function Alineacion({ dias, meta }) {
  const [ref, ancho] = useAncho();
  const [sel, setSel] = useState(null);
  const alto = 104, arriba = 14, abajo = 20, izq = 34;
  const vals = dias.filter(d => d.kcal != null).map(d => d.kcal);
  const min = Math.min(meta * 0.7, ...vals), max = Math.max(meta * 1.3, ...vals);
  const y = (v) => arriba + (1 - (v - min) / (max - min)) * (alto - arriba - abajo);
  const paso = (ancho - izq) / dias.length;
  const cx = (i) => izq + paso * i + paso / 2;
  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 8, width: '100%', minWidth: 0, minHeight: alto }}>
      {ancho > 0 && <svg width={ancho} height={alto} style={{ display: 'block', overflow: 'visible' }}>
        <rect x={izq} width={ancho - izq} y={y(meta * 1.1)} height={y(meta * 0.9) - y(meta * 1.1)} fill="rgba(79,106,28,0.14)" rx="6" />
        <line x1={izq} x2={ancho} y1={y(meta)} y2={y(meta)} stroke="rgba(79,106,28,0.35)" strokeWidth="1" />
        <text x={izq - 6} y={y(meta) + 3.5} textAnchor="end" fontSize="10" fill={TEXT_LIGHT}>{fmt(meta)}</text>
        {dias.map((d, i) => (
          <g key={d.fecha} onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }}>
            <rect x={cx(i) - paso / 2} y={0} width={paso} height={alto - abajo} fill="transparent" />
            {d.kcal != null && (
              <>
                <line x1={cx(i)} x2={cx(i)} y1={y(meta)} y2={y(d.kcal)} stroke={VERDE} strokeWidth="2" opacity="0.35" />
                <circle cx={cx(i)} cy={y(d.kcal)} r={sel === i ? 5.5 : 4.5} fill={VERDE} stroke={SURFACE} strokeWidth="2" />
              </>
            )}
            <text x={cx(i)} y={alto - 5} textAnchor="middle" fontSize="10" fill={TEXT_LIGHT}>{DIA_LETRA[aFecha(d.fecha).getDay()]}</text>
          </g>
        ))}
      </svg>}
      {sel != null && (
        <Globo x={cx(sel)} ancho={ancho}
          texto={dias[sel].kcal == null ? `${fechaCorta(dias[sel].fecha)}: sin registro`
            : `${fechaCorta(dias[sel].fecha)}: ${fmt(dias[sel].kcal)} kcal`} />
      )}
    </div>
  );
}

function Cuerpo({ medidas, cargando, alMedir }) {
  const conPeso = medidas.filter(m => m.peso != null);
  const conGrasa = medidas.filter(m => m.grasa_pct != null);
  const ultPeso = conPeso[conPeso.length - 1];
  const ultGrasa = conGrasa[conGrasa.length - 1];
  return (
    <Tarjeta titulo="Cuerpo"
      accion={<button onClick={alMedir} style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: AZUL, cursor: 'pointer' }}>+ Registrar</button>}>
      {cargando ? (
        <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 12 }}>Cargando…</div>
      ) : !medidas.length ? (
        <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 10, lineHeight: 1.5 }}>Aún no hay medidas. Registra tu peso y tu % de grasa cuando te midas, y aquí ves cómo cambian.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Dato etiqueta="Peso" valor={ultPeso ? fmt(ultPeso.peso, 1) : '—'} unidad="kg"
              pie={ultPeso ? <><Cambio desde={conPeso[0].peso} hasta={ultPeso.peso} unidad="kg" bueno={null} /> <span>· {fechaCorta(ultPeso.fecha)}</span></> : null} />
            <Dato etiqueta="% de grasa" valor={ultGrasa ? fmt(ultGrasa.grasa_pct, 1) : '—'} unidad="%"
              pie={ultGrasa ? <><Cambio desde={conGrasa[0].grasa_pct} hasta={ultGrasa.grasa_pct} unidad="pts" bueno="baja" /> <span>· {fechaCorta(ultGrasa.fecha)}</span></> : null} />
          </div>
          {conPeso.length >= 2 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>Peso desde el {fechaCorta(conPeso[0].fecha)}</div>
              <Linea puntos={conPeso.map(m => ({ v: m.peso, fecha: m.fecha }))} color={AZUL} alto={64}
                textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} />
            </div>
          )}
        </>
      )}
    </Tarjeta>
  );
}
