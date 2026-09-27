// ─────────────────────────────────────────────────────────────────────────
// DASH · cómo vas en todo, en una pantalla
//
// Es la portada de la app con la visual nueva. Arriba el saludo y los atajos
// que se usan a diario (recordatorios, el reto, escribirle al coach); luego
// las DOS gráficas protagonistas, en anillo como el logo de la marca:
//
//   · Constancia en el entrenamiento — entrenos hechos contra planeados
//   · Constancia en la alimentación  — días dentro de la meta de calorías,
//                                      y cómo va cada macro
//
// Todo lo demás (12 semanas, fuerza, volumen, proteína día a día, calorías
// contra la franja, el calendario de comidas) vive un toque más adentro, en
// «Profundiza». Anillos solo en los dos protagonistas: si todo es anillo,
// ninguno destaca.
//
// Igual que el resumen de la semana: NO se pone nota ni semáforo. Se enseñan
// los números y la persona saca su conclusión.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Bell, Mountains, WhatsappLogo, CaretRight, CaretLeft, CalendarBlank } from '@phosphor-icons/react';
import { api, hoyLocal, sumarDias, aFecha } from './entrenoDatos.js';
import { HojaMedida } from './EntrenoMedidas.jsx';
import { WHATSAPP_COACH, nombresEj } from './v2.js';
import { Pastilla } from './PastillaV2.jsx';
import {
  SURFACE, TEXT, TEXT_MUTED, TEXT_LIGHT, DANGER,
  FONT_DISPLAY, C_PROTEIN, C_CARBS, C_FAT, SECCION,
} from './theme.js';

const AZUL = SECCION.entreno.base;       // el entrenamiento, en todo el Dash
const VERDE = SECCION.comida.base;       // la alimentación
const AMBAR = '#C98A0B';                  // el cuerpo (peso), en el tono del Dash
const REJILLA = '#E7E3D9';
const TARJETA = '#FFFFFF';
const CREMA = '#F4F1EB';                  // pastillas y bloques internos
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const fmt = (n, dec = 0) => (n == null || !Number.isFinite(Number(n)) ? '—'
  : Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: dec }));
const fechaCorta = (iso) => { const d = aFecha(iso); return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`; };
const fechaLarga = (iso) => { const d = aFecha(iso); const t = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; return t[0].toUpperCase() + t.slice(1); };
const DIA_LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// ── Datos de comida: salen del propio teléfono ────────────────────────────
// `history[fecha]` son los totales del día que el cliente ve en su pantalla;
// no se recalcula nada, solo se agrupa.
//
// Un día CUMPLE una meta así (y así lo dice la pantalla de «Profundiza»):
//   calorías  ±10 % de la meta
//   proteína  al menos el 90 % de la meta (pasarse de proteína no es fallar)
//   carbos    ±15 %
//   grasas    ±15 %
// La ventana son los 7 días ANTERIORES a hoy: hoy aún no termina y contarlo
// castigaría a quien apenas desayunó.
export const CUMPLE = {
  kcal: (v, m) => Math.abs(v - m) <= m * 0.10,
  p:    (v, m) => v >= m * 0.90,
  c:    (v, m) => Math.abs(v - m) <= m * 0.15,
  g:    (v, m) => Math.abs(v - m) <= m * 0.15,
};

export function datosComida(history = {}, goals = {}, hoy = hoyLocal()) {
  const dia = (f) => {
    const t = history[f];
    return t && typeof t === 'object' && Number(t.kcal) > 0
      ? { kcal: Number(t.kcal) || 0, p: Number(t.p) || 0, c: Number(t.c) || 0, g: Number(t.g) || 0 } : null;
  };
  const ultimos = [];
  for (let i = 13; i >= 0; i--) {
    const f = sumarDias(hoy, -i);
    ultimos.push({ fecha: f, ...(dia(f) || { kcal: null, p: null, c: null, g: null }) });
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
  const meta = {
    kcal: Number(goals && goals.kcal) || null, p: Number(goals && goals.p) || null,
    c: Number(goals && goals.c) || null, g: Number(goals && goals.g) || null,
  };
  const conDato = ultimos.filter(d => d.kcal != null);
  const enRango = meta.kcal ? conDato.filter(d => CUMPLE.kcal(d.kcal, meta.kcal)).length : null;

  // Los 7 días antes de hoy: cuántos cumplieron cada meta.
  const siete = ultimos.filter(d => d.fecha < hoy).slice(-7);
  const cumplidos = {};
  ['kcal', 'p', 'c', 'g'].forEach(k => {
    cumplidos[k] = meta[k] ? siete.filter(d => d.kcal != null && CUMPLE[k](d[k], meta[k])).length : null;
  });
  const semanaActual = semanas[semanas.length - 1];
  const estaSemana = ultimos.filter(d => d.fecha >= semanaActual.desde && d.p != null);
  return {
    ultimos, semanas, meta, metaK: meta.kcal, metaP: meta.p, enRango, conDato: conDato.length,
    siete, cumplidos, registrados7: siete.filter(d => d.kcal != null).length,
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

// Tarjeta blanca, esquinas amplias y sin borde: la sombra apenas la separa
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

function Dato({ etiqueta, valor, unidad, pie }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: CREMA, borderRadius: 18, padding: '12px 13px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_MUTED }}>{etiqueta}</div>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 26, fontWeight: 750, color: TEXT, lineHeight: 1, letterSpacing: '-0.02em' }}>{valor}</span>
        {unidad && <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MUTED }}>{unidad}</span>}
      </div>
      {pie && <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pie}</div>}
    </div>
  );
}

// Pastilla crema con ícono y texto en negrita: los atajos de arriba.

// Botón de «Profundiza»: toda la fila se toca.
function Profundiza({ children, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: CREMA, border: 'none', borderRadius: 16, padding: '13px 14px 13px 16px', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 15, fontWeight: 650, color: TEXT, textAlign: 'left',
    }}>
      <span>{children}</span>
      <CaretRight size={18} weight="bold" color={color} />
    </button>
  );
}

// El anillo de la marca: trazo redondeado sobre su riel, y el punto blanco en
// la punta, como en el logo. Es el único lugar del Dash que lo usa.
function Anillo({ valor, total, color, tam = 118, grosor = 11, centro, pie }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, valor / total)) : 0;
  const ang = frac * 2 * Math.PI - Math.PI / 2;
  const cx = tam / 2 + r * Math.cos(ang), cy = tam / 2 + r * Math.sin(ang);
  return (
    <div style={{ position: 'relative', width: tam, height: tam, flex: 'none' }}>
      <svg width={tam} height={tam} role="img" aria-label={`${valor} de ${total}`}>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={CREMA} strokeWidth={grosor} />
        {frac > 0 && (
          <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={color} strokeWidth={grosor}
            strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`}
            transform={`rotate(-90 ${tam / 2} ${tam / 2})`} />
        )}
        {frac > 0 && frac < 1 && <circle cx={cx} cy={cy} r={grosor / 2 - 2.5} fill="#FFFFFF" />}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, lineHeight: 1, letterSpacing: '-0.02em' }}>{centro}</div>
          {pie && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3, fontWeight: 600 }}>{pie}</div>}
        </div>
      </div>
    </div>
  );
}

// Una barrita por macro: cuántos de los 7 días cumplió.
function BarraMeta({ etiqueta, valor, total, color }) {
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: TEXT }}>
        <span style={{ fontWeight: 600 }}>{etiqueta}</span>
        <span style={{ color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>{valor == null ? '—' : `${valor}/${total}`}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: CREMA, marginTop: 5, overflow: 'hidden' }}>
        <div style={{ width: `${valor == null ? 0 : (valor / total) * 100}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
    </div>
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
        <defs>
          <linearGradient id={`g-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g-${color.slice(1)})`} />
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

// FUERA del componente a propósito: definido dentro, cada render de la app
// crearía un componente nuevo y se perdería lo que se tocó en las gráficas.
const Marco = React.forwardRef(({ children }, ref) => (
  <div ref={ref} style={{
    position: 'relative', maxWidth: 560, margin: '0 auto', padding: '0 16px',
    paddingTop: 'calc(62px + env(safe-area-inset-top, 0px))',
    paddingBottom: 'calc(104px + env(safe-area-inset-bottom, 0px))',
  }}>{children}</div>
));

// ── La pantalla ───────────────────────────────────────────────────────────
// `acciones`: { recordatorios, reto, calendarioComida } — las abre la app.
export default function Dash({ name, history, goals, entrenoOn = true, alIr, racha = 0, pendientes = 0, acciones = {} }) {
  const hoy = hoyLocal();
  const [ent, setEnt] = useState(null);
  const [falloEnt, setFalloEnt] = useState(false);
  const [midiendo, setMidiendo] = useState(false);
  const [vista, setVista] = useState('inicio');
  const [sinRetos, setSinRetos] = useState(false);
  const raizRef = useRef(null);

  const cargar = async () => {
    setFalloEnt(false);
    const r = await api.dash(name);
    if (r && r.ok) setEnt(r); else setFalloEnt(true);
  };
  useEffect(() => { if (name) cargar(); /* eslint-disable-next-line */ }, [name]);
  // Al entrar o salir de «Profundiza» se sube al principio.
  useEffect(() => {
    const sc = raizRef.current && raizRef.current.closest('[data-view="dash"]');
    if (sc) sc.scrollTo({ top: 0 });
  }, [vista]);

  const comida = useMemo(() => datosComida(history, goals, hoy), [history, goals, hoy]);
  const semana = ent?.semanas?.[ent.semanas.length - 1];
  const nombre = String(name || '').split(' ')[0];
  const wa = WHATSAPP_COACH
    ? `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent(`Hola coach, soy ${nombre || 'tu cliente'}. `)}`
    : null;

  if (vista === 'entreno') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleEntreno ent={ent} falloEnt={falloEnt} cargar={cargar} /></Marco>;
  if (vista === 'comida') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleComida comida={comida} alCalendario={acciones.calendarioComida} /></Marco>;

  // Constancia del entrenamiento en las últimas 8 semanas (% de lo planeado).
  const ochoSemanas = (ent?.semanas || []).slice(-8).filter(w => w.planeados > 0)
    .map(w => ({ v: Math.min(100, Math.round((w.hechos / w.planeados) * 100)), fecha: w.desde }));
  const promedio8 = ochoSemanas.length ? Math.round(ochoSemanas.reduce((a, p) => a + p.v, 0) / ochoSemanas.length) : null;
  const kcal14 = comida.ultimos.filter(d => d.kcal != null).map(d => ({ v: d.kcal, fecha: d.fecha }));

  return (
    <Marco ref={raizRef}>
      {/* Saludo */}
      <div style={{ fontSize: 15, color: TEXT_MUTED, fontWeight: 500, margin: '4px 2px 0' }}>{fechaLarga(hoy)}</div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 34, lineHeight: 1.08, margin: '4px 2px 0', color: TEXT, fontWeight: 800, letterSpacing: '-0.025em' }}>
        Hola{nombre ? `, ${nombre}` : ''}
      </h1>
      <div style={{ fontSize: 15, color: TEXT_MUTED, margin: '6px 2px 0' }}>
        {racha >= 2 ? `${racha} días seguidos registrando. Sigamos.` : 'Un día a la vez. Aquí ves cómo vas en todo.'}
      </div>

      {/* Atajos */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto', margin: '16px -16px 0', padding: '0 16px 2px', scrollbarWidth: 'none' }}>
        {acciones.recordatorios && <Pastilla icono={Bell} color="#E0A21A" badge={pendientes} onClick={acciones.recordatorios}>Recordatorios</Pastilla>}
        <Pastilla icono={Mountains} color="#D9744A" onClick={() => setSinRetos(true)}>Reto</Pastilla>
        {wa && <Pastilla icono={WhatsappLogo} color="#25A35A" href={wa}>Escríbele a tu coach</Pastilla>}
      </div>

      {/* Reto: por ahora no hay ninguno. Solo el mensaje; un toque lo cierra. */}
      {sinRetos && (
        <div role="dialog" aria-label="Retos" onClick={() => setSinRetos(false)} style={{
          position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(31,31,28,0.28)',
          display: 'grid', placeItems: 'center', padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: '26px 28px', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(40,40,30,0.18)', fontSize: 17, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em',
          }}>No hay retos actualmente</div>
        </div>
      )}

      <h2 style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', margin: '26px 2px 2px' }}>Tu constancia</h2>

      {/* Protagonista 1: entrenamiento */}
      {entrenoOn && (
        <Tarjeta titulo="Entrenamiento" detalle="Entrenos hechos esta semana, contra los planeados.">
          {falloEnt ? (
            <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>
              No pude traer tus datos. <button onClick={cargar} style={{ border: 'none', background: 'none', color: AZUL, fontWeight: 700, fontFamily: 'inherit', fontSize: 14, padding: 0, cursor: 'pointer' }}>Reintentar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
              <Anillo valor={semana ? semana.hechos : 0} total={semana && semana.planeados ? semana.planeados : 0} color={AZUL}
                centro={semana ? `${semana.hechos}${semana.planeados ? `/${semana.planeados}` : ''}` : '—'} pie="entrenos" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Últimas 8 semanas</div>
                <div style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', marginTop: 1 }}>
                  {promedio8 == null ? '—' : `${promedio8} %`}
                  <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_MUTED }}> de lo planeado</span>
                </div>
                {ochoSemanas.length >= 2 && (
                  <Linea puntos={ochoSemanas} color={AZUL} alto={46}
                    textoValor={(p) => `Semana del ${fechaCorta(p.fecha)}: ${p.v} %`} />
                )}
              </div>
            </div>
          )}
          <Profundiza color={AZUL} onClick={() => setVista('entreno')}>Profundiza en tus gráficas de entrenamiento</Profundiza>
        </Tarjeta>
      )}

      {/* Protagonista 2: alimentación */}
      <Tarjeta titulo="Alimentación" detalle="Tus últimos 7 días: cuántos cumpliste tu meta.">
        {!comida.metaK ? (
          <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>Tu coach aún no carga tu meta. Cuando lo haga, aquí ves cómo vas con ella.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
              <Anillo valor={comida.cumplidos.kcal || 0} total={7} color={VERDE}
                centro={`${comida.cumplidos.kcal ?? 0}/7`} pie="en calorías" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <BarraMeta etiqueta="Proteína" valor={comida.cumplidos.p} total={7} color={C_PROTEIN} />
                <BarraMeta etiqueta="Carbohidratos" valor={comida.cumplidos.c} total={7} color={C_CARBS} />
                <BarraMeta etiqueta="Grasas" valor={comida.cumplidos.g} total={7} color={C_FAT} />
              </div>
            </div>
            {kcal14.length >= 2 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Tus calorías, últimos 14 días</div>
                <Linea puntos={kcal14} color={VERDE} alto={54}
                  textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v)} kcal`} />
              </div>
            )}
          </>
        )}
        <Profundiza color={VERDE} onClick={() => setVista('comida')}>Profundiza en tus gráficas de alimentación</Profundiza>
      </Tarjeta>

      {/* Cuerpo */}
      <Cuerpo medidas={ent?.medidas || []} cargando={entrenoOn && !ent && !falloEnt} alMedir={() => setMidiendo(true)} />
      <HojaMedida abierta={midiendo} nombre={name} alCerrar={() => setMidiendo(false)}
        alGuardar={() => { setMidiendo(false); cargar(); }} />
    </Marco>
  );
}

function Volver({ alVolver }) {
  return (
    <button onClick={alVolver} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, height: 38, padding: '0 14px 0 10px',
      borderRadius: 999, background: CREMA, border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 14.5, fontWeight: 650, color: TEXT, marginTop: 4,
    }}>
      <CaretLeft size={16} weight="bold" /> Dash
    </button>
  );
}

function Titular({ children, bajada }) {
  return (
    <>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, lineHeight: 1.1, margin: '14px 2px 0', color: TEXT, fontWeight: 800, letterSpacing: '-0.02em' }}>{children}</h1>
      {bajada && <div style={{ fontSize: 15, color: TEXT_MUTED, margin: '6px 2px 0', lineHeight: 1.45 }}>{bajada}</div>}
    </>
  );
}

// ── Profundiza: entrenamiento ─────────────────────────────────────────────
function DetalleEntreno({ ent, falloEnt, cargar }) {
  if (falloEnt) {
    return (<><Titular>Tus gráficas de entrenamiento</Titular>
      <Tarjeta titulo="Sin conexión" detalle="No pude traer tus datos de entrenamiento.">
        <button onClick={cargar} style={{ marginTop: 10, border: 'none', background: CREMA, borderRadius: 999, padding: '9px 16px', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: TEXT, cursor: 'pointer' }}>Reintentar</button>
      </Tarjeta></>);
  }
  if (!ent) return <><Titular>Tus gráficas de entrenamiento</Titular><div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 16 }}>Cargando…</div></>;
  return (
    <>
      <Titular bajada="Las últimas 12 semanas de tu entrenamiento.">Tus gráficas de entrenamiento</Titular>

      <Tarjeta titulo="Constancia" detalle="Entrenos hechos por semana, contra los que tenías planeados.">
        <Columnas
          datos={ent.semanas.map(w => ({ ...w, valor: w.hechos }))}
          color={AZUL}
          marca={(w) => w.planeados}
          etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
          textoValor={(w) => `${fechaCorta(w.desde)}: ${w.hechos}${w.planeados ? ` de ${w.planeados}` : ''}`}
        />
        <Leyenda items={[{ label: 'Hechos', color: AZUL }, { label: 'Planeados', color: 'rgba(31,31,31,0.55)', tipo: 'linea' }]} />
      </Tarjeta>

      <Tarjeta titulo="Fuerza"
        detalle="Tu 1RM estimado: lo que levantarías a una repetición, calculado con tu mejor serie de cada día. Así 60 × 10 y 65 × 6 se pueden comparar.">
        {ent.ejercicios.length === 0 ? (
          <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Aparece cuando repitas un mismo ejercicio en dos sesiones.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
            {ent.ejercicios.map(e => (
              <div key={e.id} style={{ background: CREMA, borderRadius: 18, padding: '12px 13px 8px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombresEj(e).grande}</div>
                {nombresEj(e).chico && (
                  <div style={{ fontSize: 11.5, color: TEXT_LIGHT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombresEj(e).chico}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em' }}>{fmt(e.actual, 1)}</span>
                  <span style={{ fontSize: 12.5, color: TEXT_MUTED }}>kg</span>
                </div>
                <div style={{ fontSize: 12, marginTop: 1 }}>
                  <Cambio desde={e.inicio} hasta={e.actual} unidad="kg" />
                  <span style={{ color: TEXT_LIGHT }}> desde {fechaCorta(e.puntos[0].fecha)}</span>
                </div>
                <Linea puntos={e.puntos.map(p => ({ v: p.e1rm, fecha: p.fecha }))} color={AZUL}
                  textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} />
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {ent.semanas.some(w => w.volumen_kg > 0) && (
        <Tarjeta titulo="Volumen" detalle="Kilos movidos por semana: peso × repeticiones de todas tus series.">
          <Columnas
            datos={ent.semanas.map(w => ({ ...w, valor: w.volumen_kg }))}
            color={AZUL}
            etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
            textoValor={(w) => `${fechaCorta(w.desde)}: ${fmt(w.volumen_kg)} kg`}
          />
        </Tarjeta>
      )}
    </>
  );
}

// ── Profundiza: alimentación ──────────────────────────────────────────────
function DetalleComida({ comida, alCalendario }) {
  return (
    <>
      <Titular bajada="Tus metas de calorías y macros, día a día.">Tus gráficas de alimentación</Titular>

      {comida.metaK && comida.conDato > 0 && (
        <Tarjeta titulo="Calorías" detalle={`Últimos 14 días. La franja es tu meta de ${fmt(comida.metaK)} kcal, ±10 %.`}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 30, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1 }}>{comida.enRango}</span>
            <span style={{ fontSize: 14, color: TEXT_MUTED }}>de {comida.conDato} días registrados dentro de la franja</span>
          </div>
          <Alineacion dias={comida.ultimos} meta={comida.metaK} />
          <Leyenda items={[{ label: 'Tus calorías', color: VERDE }, { label: 'Meta ±10 %', color: 'rgba(70,150,90,0.16)', tipo: 'banda' }]} />
        </Tarjeta>
      )}

      <Tarjeta titulo="Proteína"
        detalle={comida.metaP ? `Últimos 14 días. La raya es tu meta de ${fmt(comida.metaP)} g.` : 'Últimos 14 días.'}>
        {comida.conDato === 0 ? (
          <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Registra tu comida en el chat y aquí ves tu proteína día a día.</div>
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

      <Tarjeta titulo="Días registrados" detalle="Días de cada semana con tu comida registrada.">
        <Columnas
          datos={comida.semanas.map(w => ({ ...w, valor: w.dias }))}
          color={VERDE} alto={110} tope={7}
          marca={(w) => w.transcurridos}
          etiquetaX={(w, i) => (i % 3 === 2 || i === 11 ? fechaCorta(w.desde) : '')}
          textoValor={(w) => `${fechaCorta(w.desde)}: ${w.dias} de ${w.transcurridos} días`}
        />
      </Tarjeta>

      <Tarjeta titulo="Cómo se cuenta"
        detalle="Un día cumple calorías si queda a ±10 % de tu meta; proteína, si llegas al menos al 90 %; carbohidratos y grasas, a ±15 %. Hoy no cuenta hasta que termine." />

      {alCalendario && (
        <Profundiza color={VERDE} onClick={alCalendario}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CalendarBlank size={18} /> Tu calendario de comidas: mes, semana y día</span>
        </Profundiza>
      )}
    </>
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
      accion={<button onClick={alMedir} style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: AMBAR, cursor: 'pointer' }}>+ Registrar</button>}>
      {cargando ? (
        <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Cargando…</div>
      ) : !medidas.length ? (
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.5 }}>Registra tu peso y tu % de grasa cuando te midas, y aquí ves cómo cambian.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Dato etiqueta="Peso" valor={ultPeso ? fmt(ultPeso.peso, 1) : '—'} unidad="kg"
              pie={ultPeso ? <><Cambio desde={conPeso[0].peso} hasta={ultPeso.peso} unidad="kg" bueno={null} /> <span>· {fechaCorta(ultPeso.fecha)}</span></> : null} />
            <Dato etiqueta="% de grasa" valor={ultGrasa ? fmt(ultGrasa.grasa_pct, 1) : '—'} unidad="%"
              pie={ultGrasa ? <><Cambio desde={conGrasa[0].grasa_pct} hasta={ultGrasa.grasa_pct} unidad="pts" bueno="baja" /> <span>· {fechaCorta(ultGrasa.fecha)}</span></> : null} />
          </div>
          {conPeso.length >= 2 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Peso desde el {fechaCorta(conPeso[0].fecha)}</div>
              <Linea puntos={conPeso.map(m => ({ v: m.peso, fecha: m.fecha }))} color={AMBAR} alto={64}
                textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} />
            </div>
          )}
        </>
      )}
    </Tarjeta>
  );
}
