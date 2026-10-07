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
import { Bell, Mountains, WhatsappLogo, CaretRight, CaretLeft, CalendarBlank, Heartbeat, CalendarCheck, Sparkle, CheckCircle, Circle, BookOpenText, UsersThree, GearSix } from '@phosphor-icons/react';
import Comunidad, { leerComunidad, firmaComunidad } from './Comunidad.jsx';
import Configuracion from './Configuracion.jsx';
import { leerAprendizaje, marcadaLocal } from './aprendizaje.js';
import { api, hoyLocal, sumarDias, aFecha } from './entrenoDatos.js';
import { HojaMedida } from './EntrenoMedidas.jsx';
import { WHATSAPP_COACH, nombresEj } from './v2.js';
import { Pastilla } from './PastillaV2.jsx';
import Firma from './Firma.jsx';
import CabeceraHoy from './CabeceraHoy.jsx';
import { etiquetaDia } from './vozCoach.js';
import { useAncho, Tarjeta, Leyenda, Globo, Columnas, niceTope, REJILLA, AnilloMarca } from './GraficasV2.jsx';
import {
  SURFACE, TEXT, TEXT_MUTED, TEXT_LIGHT,
  FONT_DISPLAY, C_PROTEIN, C_CARBS, C_FAT, SECCION, DASH_AZUL,
} from './theme.js';

const AZUL = SECCION.entreno.base;       // el entrenamiento, en todo el Dash
const VERDE = SECCION.comida.base;       // la alimentación
const AMBAR = '#C98A0B';                  // el cuerpo (peso), en el tono del Dash
const GRASA = C_FAT;                      // el % de grasa: el mismo tono de las grasas
const NARANJA = SECCION.aprende.base;     // el aprendizaje
const CREMA = '#F4F1EB';                  // pastillas y bloques internos
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fmt = (n, dec = 0) => (n == null || !Number.isFinite(Number(n)) ? '—'
  : Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: dec }));
const fechaCorta = (iso) => { const d = aFecha(iso); return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`; };
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
  // Promedio de los días REGISTRADOS de esos 7: cuánto de la meta se cumple
  // en promedio (en % y en números), y cuántos días quedaron cerca de la
  // meta de calorías (±10 %) y cuántos no.
  const conDato7 = siete.filter(d => d.kcal != null);
  const prom = (k) => (conDato7.length ? conDato7.reduce((a, d) => a + (d[k] || 0), 0) / conDato7.length : null);
  const promedio = {};
  ['kcal', 'p', 'c', 'g'].forEach(k => {
    const v = prom(k);
    promedio[k] = v == null ? null : { valor: Math.round(v), pct: meta[k] ? Math.round((v / meta[k]) * 100) : null };
  });
  const cerca = meta.kcal ? conDato7.filter(d => CUMPLE.kcal(d.kcal, meta.kcal)).length : null;
  const semanaActual = semanas[semanas.length - 1];
  const estaSemana = ultimos.filter(d => d.fecha >= semanaActual.desde && d.p != null);
  return {
    ultimos, semanas, meta, metaK: meta.kcal, metaP: meta.p, enRango, conDato: conDato.length,
    siete, cumplidos, registrados7: conDato7.length, promedio, cerca,
    lejos: cerca == null ? null : conDato7.length - cerca, sinRegistro: siete.length - conDato7.length,
    proteinaSemana: estaSemana.length ? Math.round(estaSemana.reduce((a, d) => a + d.p, 0) / estaSemana.length) : null,
  };
}

// ── Lo que más come, de lo que registró ───────────────────────────────────
// Sale del detalle de cada comida (`historyDetail[fecha]` → comidas →
// alimentos), de los últimos `dias`. Un alimento se agrupa por su nombre
// (sin mayúsculas ni tildes). Cada lista trae los 3 primeros.
//   repetido  el que más veces aparece (al menos 2)
//   calorico  el de más calorías en una sola porción
//   proteina / carbos / grasa / azucar (añadida) / omega3 / fibra: el que más
//             aportó en total en esos días
export function alimentosDestacados(detalle = {}, hoy = hoyLocal(), dias = 30) {
  const porNombre = new Map();
  let porciones = 0;
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(hoy, -i);
    (Array.isArray(detalle[f]) ? detalle[f] : []).forEach(en => (Array.isArray(en?.items) ? en.items : []).forEach(it => {
      const nombre = String(it?.name || '').trim();
      if (!nombre) return;
      const k = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const a = porNombre.get(k) || { nombre, veces: 0, kcal: 0, p: 0, c: 0, g: 0, sugar: 0, omega3: 0, fiber: 0, maxKcal: 0 };
      a.veces++;
      ['kcal', 'p', 'c', 'g', 'sugar', 'omega3', 'fiber'].forEach(m => { a[m] += Number(it[m]) || 0; });
      a.maxKcal = Math.max(a.maxKcal, Number(it.kcal) || 0);
      porNombre.set(k, a);
      porciones++;
    }));
  }
  const lista = [...porNombre.values()];
  const top = (fn, min = 0) => lista.filter(x => fn(x) > min).sort((a, b) => fn(b) - fn(a)).slice(0, 3);
  return {
    dias, porciones, alimentos: lista.length,
    repetido: top(x => x.veces, 1), calorico: top(x => x.maxKcal),
    proteina: top(x => x.p, 1), carbos: top(x => x.c, 1), grasa: top(x => x.g, 1),
    azucar: top(x => x.sugar, 0.5), omega3: top(x => x.omega3, 0.05), fibra: top(x => x.fiber, 0.5),
  };
}

// ── Piezas ────────────────────────────────────────────────────────────────
// Cifra compacta: la etiqueta con el número al lado, y el cambio debajo.
function Dato({ etiqueta, valor, unidad, pie, color }) {
  return (
    <div data-dato style={{ flex: 1, minWidth: 0, background: CREMA, borderRadius: 14, padding: '8px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: TEXT_MUTED, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {color && <span style={{ width: 7, height: 7, borderRadius: 99, background: color, flex: 'none' }} />}{etiqueta}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 750, color: TEXT, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{valor}</span>
          {unidad && <span style={{ fontSize: 11.5, fontWeight: 600, color: TEXT_MUTED }}>{unidad}</span>}
        </span>
      </div>
      {pie && <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pie}</div>}
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
  const frac = total > 0 ? valor / total : 0;
  return (
    <AnilloMarca frac={frac} color={color} tam={tam} grosor={grosor} etiqueta={`${valor} de ${total}`}>
      <div style={{ fontSize: 28, fontWeight: 800, color: TEXT, lineHeight: 1, letterSpacing: '-0.02em' }}>{centro}</div>
      {pie && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3, fontWeight: 600 }}>{pie}</div>}
    </AnilloMarca>
  );
}

// Una barrita por macro: cuánto de la meta se cumple en promedio, en % y en
// números. Pasarse se ve: la barra llena y el % arriba de 100.
function BarraPct({ etiqueta, pct, valor, meta, unidad = 'g', color }) {
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, fontSize: 13.5, color: TEXT }}>
        <span style={{ fontWeight: 600 }}>{etiqueta}</span>
        <span style={{ color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {pct == null ? '—' : <><b style={{ color: TEXT }}>{pct} %</b> · {fmt(valor)}/{fmt(meta)} {unidad}</>}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: CREMA, marginTop: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct == null ? 0 : Math.min(100, pct)}%`, height: '100%', borderRadius: 99, background: color }} />
      </div>
    </div>
  );
}

// Una fila de la semana de entrenamiento: ícono, qué es y cuánto.
function FilaSemana({ Icono, etiqueta, valor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: `1px solid ${CREMA}` }}>
      <span style={{ width: 28, height: 28, borderRadius: 99, background: DASH_AZUL.tint, color: DASH_AZUL.ink, display: 'grid', placeItems: 'center', flex: 'none' }}>
        <Icono size={15} weight="bold" />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.25 }}>{etiqueta}</span>
      <span style={{ fontSize: 15, fontWeight: 750, color: TEXT, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{valor}</span>
    </div>
  );
}

// Una pastillita de conteo: «5 días cerca de tu meta».
function Conteo({ n, texto, color, fondo }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: fondo, borderRadius: 14, padding: '9px 11px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{n ?? '—'}</div>
      <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 3, lineHeight: 1.25 }}>{texto}</div>
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
  }}>{children}<Firma style={{ marginTop: 28 }} /></div>
));

// ── La pantalla ───────────────────────────────────────────────────────────
// `acciones`: { recordatorios, reto, calendarioComida } — las abre la app.
// Lo último traído, por cliente: al volver al Dash se pinta al instante y se
// refresca por detrás (antes cada vuelta mostraba «Cargando…»).
const cacheDash = new Map();
const cacheAprende = new Map();

export default function Dash({ name, history, detalle = {}, goals, entrenoOn = true, alIr, racha = 0, pendientes = 0, acciones = {}, avisoPago = null }) {
  const hoy = hoyLocal();
  const [ent, setEnt] = useState(() => cacheDash.get(name) || null);
  const [falloEnt, setFalloEnt] = useState(false);
  const [midiendo, setMidiendo] = useState(false);
  const [vista, setVista] = useState('inicio');
  const [sinRetos, setSinRetos] = useState(false);
  const [aprende, setAprende] = useState(() => (cacheAprende.has(name) ? cacheAprende.get(name) : undefined));   // undefined = cargando, null = sin datos
  // Comunidad: cuántas publicaciones no ha visto (el número en su pastilla)
  // y la firma de la más nueva (el puntito del Dash en la barra).
  const [nuevosComunidad, setNuevosComunidad] = useState(0);
  // Relojes: si hay uno conectado, su tarjeta con el último día.
  const [reloj, setReloj] = useState(null);
  useEffect(() => {
    if (!name) return;
    let vivo = true;
    const q = encodeURIComponent(name);
    fetch(`/api/relojes?accion=estado&name=${q}`).then(r => r.json()).then(r => {
      if (!vivo || !r || !r.ok || !Object.keys(r.conectados || {}).length) return;
      setReloj(r);
      // Que traiga lo nuevo (el servidor lo hace como mucho cada 3 horas).
      fetch('/api/relojes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'sincronizar', name }) }).catch(() => {});
    }).catch(() => {});
    return () => { vivo = false; };
  }, [name]);
  const raizRef = useRef(null);
  useEffect(() => {
    let vivo = true;
    if (name && vista === 'inicio') leerComunidad(name).then(r => {
      if (!vivo || !r || !r.ok) return;
      setNuevosComunidad(r.posts.filter(p => !p.visto).length);
      if (acciones.firmaComunidad) acciones.firmaComunidad(firmaComunidad(r));
    });
    return () => { vivo = false; };
  }, [name, vista]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let vivo = true;
    if (name) leerAprendizaje(name).then(r => {
      if (!vivo) return;
      if (r || !cacheAprende.get(name)) { cacheAprende.set(name, r); setAprende(r); }
    });
    return () => { vivo = false; };
  }, [name]);

  const cargar = async () => {
    setFalloEnt(false);
    const r = await api.dash(name);
    if (r && r.ok) { cacheDash.set(name, r); setEnt(r); }
    else if (!cacheDash.has(name)) setFalloEnt(true);
  };
  useEffect(() => { if (name) cargar(); /* eslint-disable-next-line */ }, [name]);
  // Al entrar o salir de «Profundiza» se sube al principio.
  useEffect(() => {
    const sc = raizRef.current && raizRef.current.closest('[data-view="dash"]');
    if (sc) sc.scrollTo({ top: 0 });
  }, [vista]);

  const comida = useMemo(() => datosComida(history, goals, hoy), [history, goals, hoy]);
  const destacados = useMemo(() => alimentosDestacados(detalle, hoy), [detalle, hoy]);
  const semana = ent?.semanas?.[ent.semanas.length - 1];
  const nombre = String(name || '').split(' ')[0];
  const wa = WHATSAPP_COACH
    ? `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent('Hola Mau!')}`
    : null;

  if (vista === 'entreno') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleEntreno ent={ent} falloEnt={falloEnt} cargar={cargar} /></Marco>;
  if (vista === 'comida') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleComida comida={comida} destacados={destacados} alCalendario={acciones.calendarioComida} /></Marco>;
  if (vista === 'aprende') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <DetalleAprende aprende={aprende} alIr={alIr} /></Marco>;
  if (vista === 'comunidad') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <Comunidad name={name} /></Marco>;
  if (vista === 'config') return <Marco ref={raizRef}><Volver alVolver={() => setVista('inicio')} />
    <Configuracion name={name} whatsapp={wa} alRecorrido={acciones.recorrido} alPrograma={acciones.programa} alActivarPush={acciones.activarPush} /></Marco>;

  // Constancia del entrenamiento en las últimas 8 semanas (% de lo planeado).
  const ochoSemanas = (ent?.semanas || []).slice(-8).filter(w => w.planeados > 0)
    .map(w => ({ v: Math.min(100, Math.round((w.hechos / w.planeados) * 100)), fecha: w.desde }));
  const promedio8 = ochoSemanas.length ? Math.round(ochoSemanas.reduce((a, p) => a + p.v, 0) / ochoSemanas.length) : null;
  const kcal14 = comida.ultimos.filter(d => d.kcal != null).map(d => ({ v: d.kcal, fecha: d.fecha }));

  return (
    <Marco ref={raizRef}>
      {/* Saludo: con la misma letra y la voz del coach de las cabeceras de Hoy. */}
      <CabeceraHoy tema="dash" sangria="16px" arriba="calc(62px + env(safe-area-inset-top, 0px))"
        voz={{ etiqueta: etiquetaDia(hoy), a: `Hola${nombre ? `, ${nombre}` : ''}.`, b: racha >= 3 ? `${racha} días seguidos.` : 'Mira cómo vas.' }} />
      {/* Atajos: en UNA sola línea y del mismo alto, para no quitarle el
          protagonismo a las gráficas. Recordatorios y Configuración van
          solo con su ícono (campana y tuerca) para que todo quepa. */}
      <div data-atajos style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 5, marginTop: 14, overflowX: 'auto', scrollbarWidth: 'none', padding: '6px 6px 6px 0' }}>
        <Pastilla mini apretada icono={Mountains} color="#2F6CC4" onClick={() => setSinRetos(true)}>Reto</Pastilla>
        {wa && <Pastilla mini apretada icono={WhatsappLogo} color="#25A35A" href={wa}>Coach</Pastilla>}
        <Pastilla mini apretada icono={UsersThree} color="#3C7BD6" badge={nuevosComunidad} badgeEncima data-abrir-comunidad
          aria-label={`Comunidad${nuevosComunidad ? ` · ${nuevosComunidad} ${nuevosComunidad === 1 ? 'nueva' : 'nuevas'}` : ''}`}
          onClick={() => setVista('comunidad')}>Comunidad</Pastilla>
        {acciones.recordatorios && <Pastilla mini soloIcono icono={Bell} color="#E0A21A" badge={pendientes} onClick={acciones.recordatorios}>Recordatorios</Pastilla>}
        <Pastilla mini soloIcono icono={GearSix} color={TEXT} data-abrir-config onClick={() => setVista('config')}>Configuración</Pastilla>
      </div>

      {/* Recordatorios a la vista: los dos primeros, y «Ver todos». La
          campanita sigue; esto es una ayudita para quien no va a buscarla. */}
      <RecordatoriosLinea name={name} hoy={hoy} aprende={aprende} medidas={ent?.medidas} cargandoMedidas={entrenoOn && !ent && !falloEnt}
        coach={acciones.recordatoriosCoach || []} alMarcarCoach={acciones.marcarRecordatorio}
        alPrograma={acciones.programa} alMedir={() => setMidiendo(true)} alAbrir={acciones.abrirAprendizaje} />

      {reloj && <TarjetaReloj reloj={reloj} />}

      {/* Mensualidad pendiente (primeros 5 días de mora). */}
      {avisoPago}

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

      <Seccion>Tu performance semanal</Seccion>

      {/* Protagonista 1: entrenamiento */}
      {entrenoOn && (
        <Tarjeta titulo="Entrenamiento" detalle={ent?.semana ? `Esta semana · ${fechaCorta(ent.semana.desde)} al ${fechaCorta(ent.semana.hasta)}` : 'Esta semana'}>
          {falloEnt ? (
            <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>
              No pude traer tus datos. <button onClick={cargar} style={{ border: 'none', background: 'none', color: AZUL, fontWeight: 700, fontFamily: 'inherit', fontSize: 14, padding: 0, cursor: 'pointer' }}>Reintentar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
              <Anillo valor={semana ? semana.hechos : 0} total={semana && semana.planeados ? semana.planeados : 0} color={AZUL}
                centro={semana ? `${semana.hechos}${semana.planeados ? `/${semana.planeados}` : ''}` : '—'} pie="fuerza" />
              <div data-semana-entreno style={{ flex: 1, minWidth: 0 }}>
                <FilaSemana Icono={Heartbeat} etiqueta="Días de cardio" valor={ent?.semana ? ent.semana.cardio.dias : '—'} />
                <FilaSemana Icono={CalendarCheck} etiqueta="Lo que te puso tu coach"
                  valor={ent?.semana ? (ent.semana.coach.total ? `${ent.semana.coach.hechos}/${ent.semana.coach.total}` : '—') : '—'} />
                <FilaSemana Icono={Sparkle} etiqueta="Actividad extra" valor={ent?.semana ? `${ent.semana.extra.dias} ${ent.semana.extra.dias === 1 ? 'día' : 'días'}` : '—'} />
              </div>
            </div>
          )}
          {/* Misma forma que la tarjeta de alimentación: anillo y cifras
              arriba, la línea de tendencia a lo ancho debajo. */}
          {!falloEnt && ochoSemanas.length >= 2 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Fuerza, semana a semana{promedio8 != null ? ` · ${promedio8} % de lo planeado` : ''}</div>
              <Linea puntos={ochoSemanas} color={AZUL} alto={54}
                textoValor={(p) => `Semana del ${fechaCorta(p.fecha)}: ${p.v} %`} />
            </div>
          )}
          <Profundiza color={AZUL} onClick={() => setVista('entreno')}>Profundiza en tus gráficas de entrenamiento</Profundiza>
        </Tarjeta>
      )}

      {/* Protagonista 2: alimentación */}
      <Tarjeta titulo="Alimentación" detalle="Tu promedio de los últimos 7 días registrados, contra tu meta.">
        {!comida.metaK ? (
          <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>Tu coach aún no carga tu meta. Cuando lo haga, aquí ves cómo vas con ella.</div>
        ) : !comida.registrados7 ? (
          <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>Registra tu comida y aquí ves tu promedio contra tu meta.</div>
        ) : (
          <>
            <div data-comida-promedio style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
              <Anillo valor={Math.min(100, comida.promedio.kcal.pct || 0)} total={100} color={VERDE}
                centro={`${comida.promedio.kcal.pct} %`} pie="de tus calorías" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>Calorías en promedio</div>
                <div style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', marginTop: 1 }}>
                  {fmt(comida.promedio.kcal.valor)}<span style={{ fontSize: 13, fontWeight: 500, color: TEXT_MUTED }}> de {fmt(comida.metaK)} kcal</span>
                </div>
                <BarraPct etiqueta="Proteína" pct={comida.promedio.p?.pct} valor={comida.promedio.p?.valor} meta={comida.meta.p} color={C_PROTEIN} />
                <BarraPct etiqueta="Carbos" pct={comida.promedio.c?.pct} valor={comida.promedio.c?.valor} meta={comida.meta.c} color={C_CARBS} />
                <BarraPct etiqueta="Grasas" pct={comida.promedio.g?.pct} valor={comida.promedio.g?.valor} meta={comida.meta.g} color={C_FAT} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Conteo n={comida.cerca} texto={`${comida.cerca === 1 ? 'día' : 'días'} cerca de tu meta`} color={VERDE} fondo="rgba(70,150,90,0.10)" />
              <Conteo n={comida.lejos} texto={`${comida.lejos === 1 ? 'día' : 'días'} lejos de tu meta`} color={TEXT} fondo={CREMA} />
              {comida.sinRegistro > 0 && <Conteo n={comida.sinRegistro} texto="sin registrar" color={TEXT_LIGHT} fondo={CREMA} />}
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
      <Seccion>Composición corporal</Seccion>
      <Cuerpo medidas={ent?.medidas || []} cargando={entrenoOn && !ent && !falloEnt} alMedir={() => setMidiendo(true)} />
      <HojaMedida abierta={midiendo} nombre={name} alCerrar={() => setMidiendo(false)}
        alGuardar={() => { setMidiendo(false); cargar(); }} />

      {/* Aprendizaje: cuánto ha visto del centro de recursos */}
      <Seccion>Aprendizaje</Seccion>
      <TarjetaAprende aprende={aprende} alProfundizar={() => setVista('aprende')} />
    </Marco>
  );
}

// ── Aprendizaje ───────────────────────────────────────────────────────────
function TarjetaAprende({ aprende, alProfundizar }) {
  return (
    <Tarjeta titulo="Centro de aprendizaje" detalle="Lo que has leído, visto y escuchado del material de tu programa.">
      {aprende === undefined ? (
        <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Cargando…</div>
      ) : !aprende ? (
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>No pude traer tu avance ahora. Vuelve a intentarlo en un rato.</div>
      ) : (
        <div data-aprende style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 14 }}>
          <Anillo valor={aprende.vistas} total={aprende.total} color={NARANJA} centro={`${aprende.pct} %`} pie="completado" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {aprende.bloques.map(b => (
              <div key={b.k} style={{ marginTop: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: TEXT }}>
                  <span style={{ fontWeight: 600 }}>{b.titulo}</span>
                  <span style={{ color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>{b.vistas}/{b.total}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: CREMA, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${b.total ? (b.vistas / b.total) * 100 : 0}%`, height: '100%', borderRadius: 99, background: NARANJA }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <Profundiza color={NARANJA} onClick={alProfundizar}>Profundiza en tu aprendizaje</Profundiza>
    </Tarjeta>
  );
}

// Pieza por pieza: lo que ya vio, con su check, y lo que le falta.
const SUB_APRENDE = { hub: 'onboarding', capsula: 'capsulas', guia: 'guia', podcast: 'podcast' };
function DetalleAprende({ aprende, alIr }) {
  const [abierto, setAbierto] = useState(null);
  if (!aprende) return <><Titular>Tu aprendizaje</Titular><div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 16 }}>{aprende === undefined ? 'Cargando…' : 'No pude traer tu avance ahora.'}</div></>;
  return (
    <>
      <Titular bajada={`Has completado ${aprende.vistas} de ${aprende.total} piezas del centro de aprendizaje.`}>Tu aprendizaje</Titular>
      {aprende.bloques.map(b => {
        const faltan = b.piezas.filter(x => !x.vista);
        const ver = abierto === b.k;
        return (
          <Tarjeta key={b.k} titulo={b.titulo} detalle={b.bajada}
            accion={<span style={{ fontSize: 15, fontWeight: 750, color: NARANJA, fontVariantNumeric: 'tabular-nums' }}>{b.vistas}/{b.total}</span>}>
            <div style={{ height: 8, borderRadius: 99, background: CREMA, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ width: `${b.total ? (b.vistas / b.total) * 100 : 0}%`, height: '100%', borderRadius: 99, background: NARANJA }} />
            </div>
            <div style={{ marginTop: 10 }}>
              {(ver ? b.piezas : b.piezas.slice(0, 4)).map(x => (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: `1px solid ${CREMA}` }}>
                  {x.vista ? <CheckCircle size={19} weight="fill" color={NARANJA} /> : <Circle size={19} color={TEXT_LIGHT} />}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: x.vista ? TEXT : TEXT_MUTED, lineHeight: 1.3 }}>{x.title}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {b.piezas.length > 4 && (
                <button onClick={() => setAbierto(ver ? null : b.k)} style={{ border: 'none', background: CREMA, borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: TEXT, cursor: 'pointer' }}>
                  {ver ? 'Ver menos' : `Ver las ${b.piezas.length}`}
                </button>
              )}
              {alIr && faltan.length > 0 && (
                <button onClick={() => alIr('aprende', SUB_APRENDE[b.k] || 'home')} style={{ border: 'none', background: TEXT, borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <BookOpenText size={15} /> Seguir aprendiendo
                </button>
              )}
            </div>
          </Tarjeta>
        );
      })}
    </>
  );
}

// Título de sección con una línea fina encima: separa lo que es de otra cosa.
function Seccion({ children }) {
  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ height: 1, background: 'rgba(31,31,31,0.09)', margin: '0 2px 16px' }} />
      <h2 style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', margin: '0 2px 2px' }}>{children}</h2>
    </div>
  );
}

// El último día que trajo el reloj (el más reciente con algún dato).
function TarjetaReloj({ reloj }) {
  const d = (reloj.dias || []).find(x => x.pasos != null || x.sueno_min != null || x.fc_reposo != null || x.recuperacion != null);
  if (!d) return null;
  const marcas = { fitbit: 'Fitbit', oura: 'Oura', whoop: 'Whoop', polar: 'Polar', garmin: 'Garmin', apple: 'Apple Watch' };
  const datos = [
    d.pasos != null && ['Pasos', Number(d.pasos).toLocaleString('es-CO')],
    d.sueno_min != null && ['Sueño', `${Math.floor(d.sueno_min / 60)} h ${String(d.sueno_min % 60).padStart(2, '0')}`],
    d.fc_reposo != null && ['Pulso en reposo', `${d.fc_reposo} lpm`],
    d.recuperacion != null && ['Recuperación', `${d.recuperacion} %`],
  ].filter(Boolean);
  return (
    <div data-tarjeta-reloj style={{ marginTop: 10, background: '#FFFFFF', borderRadius: 20, padding: '14px 16px', boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15.5, fontWeight: 750, color: TEXT }}>Tu reloj · {marcas[d.proveedor] || d.proveedor}</span>
        <span style={{ fontSize: 12.5, color: TEXT_LIGHT }}>{fechaCorta(d.fecha)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(datos.length, 4)}, minmax(0, 1fr))`, gap: 8, marginTop: 10 }}>
        {datos.map(([k, v]) => (
          <div key={k}><div style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>{v}</div><div style={{ fontSize: 12, color: TEXT_MUTED }}>{k}</div></div>
        ))}
      </div>
    </div>
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
function DetalleComida({ comida, destacados, alCalendario }) {
  return (
    <>
      <Titular bajada="Tus metas de calorías y macros, día a día.">Tus gráficas de alimentación</Titular>

      {/* Qué tan cerca de cada meta: el promedio de los días registrados y
          cuántos de los 7 cumplieron. */}
      {comida.metaK && comida.registrados7 > 0 && (
        <Tarjeta titulo="Qué tan cerca estuviste" detalle={`Promedio de los ${comida.registrados7} días que registraste de los últimos 7.`}>
          <div data-cercania style={{ marginTop: 6 }}>
            {[
              { k: 'kcal', nombre: 'Calorías', color: VERDE, u: 'kcal' },
              { k: 'p', nombre: 'Proteína', color: C_PROTEIN, u: 'g' },
              { k: 'c', nombre: 'Carbohidratos', color: C_CARBS, u: 'g' },
              { k: 'g', nombre: 'Grasas', color: C_FAT, u: 'g' },
            ].filter(m => comida.meta[m.k] && comida.promedio[m.k]).map(m => {
              const pr = comida.promedio[m.k];
              return (
                <div key={m.k} style={{ padding: '10px 0', borderTop: `1px solid ${CREMA}` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: TEXT }}>{m.nombre}</span>
                    <span style={{ fontSize: 13.5, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>
                      <b style={{ color: TEXT }}>{fmt(pr.valor)}</b> / {fmt(comida.meta[m.k])} {m.u} · <b style={{ color: m.color }}>{pr.pct} %</b>
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 8, borderRadius: 99, background: CREMA, marginTop: 7, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (pr.pct / 130) * 100)}%`, height: '100%', borderRadius: 99, background: m.color }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(100 / 130) * 100}%`, width: 2, background: TEXT, opacity: 0.55 }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 5 }}>
                    {comida.cumplidos[m.k]} de {comida.registrados7} días en meta
                  </div>
                </div>
              );
            })}
          </div>
        </Tarjeta>
      )}

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

      {[
        { k: 'c', titulo: 'Carbohidratos', color: C_CARBS, meta: comida.meta.c },
        { k: 'g', titulo: 'Grasas', color: C_FAT, meta: comida.meta.g },
      ].filter(() => comida.conDato > 0).map(m => (
        <Tarjeta key={m.k} titulo={m.titulo} detalle={m.meta ? `Últimos 14 días. La raya es tu meta de ${fmt(m.meta)} g.` : 'Últimos 14 días.'}>
          <Columnas
            datos={comida.ultimos.map(d => ({ ...d, valor: d[m.k] }))}
            color={m.color}
            marca={() => m.meta}
            etiquetaX={(d) => DIA_LETRA[aFecha(d.fecha).getDay()]}
            textoValor={(d) => (d[m.k] == null ? `${fechaCorta(d.fecha)}: sin registro` : `${fechaCorta(d.fecha)}: ${fmt(d[m.k])} g`)}
          />
        </Tarjeta>
      ))}

      {destacados && destacados.porciones > 0 && <TusAlimentos d={destacados} />}

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

// Lo que más come y lo que más le aporta, de lo que registró. Cada fila: qué
// mide, el alimento que encabeza y los dos que le siguen.
function TusAlimentos({ d }) {
  const g = (v) => `${fmt(Math.round(v))} g`;
  const filas = [
    { id: 'repetido', titulo: 'El que más repites', color: VERDE, lista: d.repetido, valor: (x) => `${x.veces} veces` },
    { id: 'calorico', titulo: 'El más calórico por porción', color: '#C95F17', lista: d.calorico, valor: (x) => `${fmt(Math.round(x.maxKcal))} kcal` },
    { id: 'proteina', titulo: 'El que más proteína te dio', color: C_PROTEIN, lista: d.proteina, valor: (x) => g(x.p) },
    { id: 'carbos', titulo: 'El que más carbohidratos te dio', color: C_CARBS, lista: d.carbos, valor: (x) => g(x.c) },
    { id: 'grasa', titulo: 'El que más grasa te dio', color: C_FAT, lista: d.grasa, valor: (x) => g(x.g) },
    { id: 'omega3', titulo: 'Grasa buena (omega-3)', color: '#178A8F', lista: d.omega3, valor: (x) => `${fmt(Math.round(x.omega3 * 10) / 10)} g` },
    { id: 'fibra', titulo: 'El que más fibra te dio', color: '#2F7F45', lista: d.fibra, valor: (x) => g(x.fiber) },
    { id: 'azucar', titulo: 'El de más azúcar añadida', color: '#C2413B', lista: d.azucar, valor: (x) => g(x.sugar) },
  ].filter(f => f.lista.length);
  return (
    <Tarjeta titulo="Tus alimentos" detalle={`Lo que registraste en los últimos ${d.dias} días: ${d.alimentos} alimentos distintos.`}>
      <div data-tus-alimentos style={{ marginTop: 6 }}>
        {filas.map(f => {
          const [uno, ...resto] = f.lista;
          return (
            <div key={f.id} data-alimento={f.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: `1px solid ${CREMA}` }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: f.color, marginTop: 6, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED }}>{f.titulo}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 1 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 750, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uno.nombre}</span>
                  <span style={{ fontSize: 14, fontWeight: 750, color: f.color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{f.valor(uno)}</span>
                </div>
                {resto.length > 0 && (
                  <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 2 }}>
                    Le siguen: {resto.map(x => `${x.nombre} (${f.valor(x)})`).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Tarjeta>
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
    <Tarjeta titulo="Peso y % de grasa"
      accion={<button onClick={alMedir} style={{ border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: AMBAR, cursor: 'pointer' }}>+ Registrar</button>}>
      {cargando ? (
        <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 12 }}>Cargando…</div>
      ) : !medidas.length ? (
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.5 }}>Registra tu peso y tu % de grasa cuando te midas, y aquí ves cómo cambian.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Dato etiqueta="Peso" color={AMBAR} valor={ultPeso ? fmt(ultPeso.peso, 1) : '—'} unidad="kg"
              pie={ultPeso ? <><Cambio desde={conPeso[0].peso} hasta={ultPeso.peso} unidad="kg" bueno={null} /> <span>· {fechaCorta(ultPeso.fecha)}</span></> : null} />
            <Dato etiqueta="% grasa" color={GRASA} valor={ultGrasa ? fmt(ultGrasa.grasa_pct, 1) : '—'} unidad="%"
              pie={ultGrasa ? <><Cambio desde={conGrasa[0].grasa_pct} hasta={ultGrasa.grasa_pct} unidad="pts" bueno="baja" /> <span>· {fechaCorta(ultGrasa.fecha)}</span></> : null} />
          </div>
          {/* Dos líneas, una por medida: tienen unidades distintas y juntas
              en un mismo eje una aplastaría a la otra. */}
          {conPeso.length >= 2 && (
            <div data-linea-peso style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>Peso desde el {fechaCorta(conPeso[0].fecha)}</div>
              <Linea puntos={conPeso.map(m => ({ v: m.peso, fecha: m.fecha }))} color={AMBAR} alto={52}
                textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} kg`} />
            </div>
          )}
          {conGrasa.length >= 2 && (
            <div data-linea-grasa style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, color: TEXT_MUTED }}>% de grasa desde el {fechaCorta(conGrasa[0].fecha)}</div>
              <Linea puntos={conGrasa.map(m => ({ v: m.grasa_pct, fecha: m.fecha }))} color={GRASA} alto={52}
                textoValor={(p) => `${fechaCorta(p.fecha)}: ${fmt(p.v, 1)} %`} />
            </div>
          )}
        </>
      )}
    </Tarjeta>
  );
}

// ── Recordatorios del Dash ────────────────────────────────────────────────
// Una línea por recordatorio, dos a la vista y el resto con «Ver todos».
// Además de los que pone el coach, la app recuerda sola:
//   · leer «Sobre el programa», hasta que lo haya visto;
//   · registrar el peso y la composición del mes, hasta que haya una medida
//     este mes (o la marque como hecha);
//   · leer las cápsulas y ver los videos, mientras falte alguno.
// El círculo de la izquierda marca como hecho (los del coach y el del
// mes); tocar la línea lleva a donde se hace.
const CLAVE_MES = (ym) => `mt:medidaMes:${ym}`;
function RecordatoriosLinea({ name, hoy, aprende, medidas, cargandoMedidas, coach, alMarcarCoach, alPrograma, alMedir, alAbrir }) {
  const [todos, setTodos] = useState(false);
  const [mesHecho, setMesHecho] = useState(() => { try { return localStorage.getItem(CLAVE_MES(hoy.slice(0, 7))) === '1'; } catch (e) { return false; } });
  const ym = hoy.slice(0, 7);
  const bloque = (k) => (aprende && aprende.bloques ? aprende.bloques.find(b => b.k === k) : null);
  const items = [];
  // Sobre el programa (para quien empieza).
  const hub = bloque('hub');
  const programaVisto = (hub && hub.piezas.some(p => p.id === 'programa' && p.vista)) || marcadaLocal(name, 'hub', 'programa');
  if (aprende !== undefined && !programaVisto) items.push({ id: 'programa', texto: 'Lee «Sobre el programa»: cómo funciona tu proceso', ir: alPrograma, Icono: BookOpenText, color: '#C95F17' });
  // Peso y composición del mes.
  const medidaMes = (medidas || []).some(m => String(m.fecha || '').slice(0, 7) === ym);
  if (!cargandoMedidas && medidas && !medidaMes && !mesHecho) items.push({ id: 'medida', texto: 'Registra tu peso y composición de este mes', ir: alMedir, marcar: () => {
    try { localStorage.setItem(CLAVE_MES(ym), '1'); } catch (e) { /* sin almacenamiento */ }
    setMesHecho(true);
  }, Icono: Heartbeat, color: AMBAR });
  // Los del coach, pendientes.
  coach.filter(r => !r.done_at).forEach(r => items.push({ id: 'c-' + r.id, texto: r.text, marcar: alMarcarCoach ? () => alMarcarCoach(r.id) : null, Icono: Bell, color: '#E0A21A', coach: true }));
  // Cápsulas y videos que faltan: el siguiente de cada uno.
  const cap = bloque('capsula'), pod = bloque('podcast');
  const sigCap = cap && cap.piezas.find(p => !p.vista);
  const sigPod = pod && pod.piezas.find(p => !p.vista);
  if (sigCap) items.push({ id: 'cap', texto: `Lee una cápsula: «${sigCap.title}»`, ir: alAbrir ? () => alAbrir(`cap:${sigCap.id}`) : null, Icono: BookOpenText, color: '#C95F17' });
  if (sigPod) items.push({ id: 'pod', texto: `Mira un video: «${sigPod.title}»`, ir: alAbrir ? () => alAbrir(`pod:${sigPod.id}`) : null, Icono: Sparkle, color: '#C95F17' });
  if (!items.length) return null;
  const visibles = todos ? items : items.slice(0, 2);
  return (
    <section data-recordatorios-dash style={{ marginTop: 10, background: '#FFFFFF', borderRadius: 18, boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)', padding: '7px 6px 3px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 0 0', minHeight: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: TEXT_MUTED }}>RECORDATORIOS</span>
        {items.length > 2 && (
          <button data-ver-recordatorios onClick={() => setTodos(t => !t)} style={{ border: 0, background: 'none', padding: '0 4px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: TEXT, cursor: 'pointer' }}>
            {todos ? 'Ver menos' : `Ver todos (${items.length})`}
          </button>
        )}
      </div>
      {visibles.map((it, i) => (
        <div key={it.id} data-recordatorio={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, borderTop: i ? '1px solid #F0EDE6' : 0 }}>
          {it.marcar ? (
            <button onClick={it.marcar} aria-label="Marcar como hecho" data-marcar style={{ width: 22, height: 22, flex: 'none', borderRadius: 99, border: `2px solid ${it.color}`, background: 'transparent', cursor: 'pointer', padding: 0 }} />
          ) : (
            <span aria-hidden="true" style={{ width: 22, height: 22, flex: 'none', borderRadius: 99, background: `${it.color}1F`, color: it.color, display: 'grid', placeItems: 'center' }}><it.Icono size={13} weight="bold" /></span>
          )}
          <button onClick={it.ir || it.marcar || undefined} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, border: 0, background: 'none', padding: '6px 4px 6px 0', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: TEXT, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.texto}</span>
            {it.ir && <CaretRight size={16} color={TEXT_LIGHT} style={{ flex: 'none' }} />}
          </button>
        </div>
      ))}
    </section>
  );
}
