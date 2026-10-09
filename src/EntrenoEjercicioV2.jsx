// ─────────────────────────────────────────────────────────────────────────
// LA RUTINA POR DENTRO · visual nueva (v2)
//
// Lo que se ve al abrir una rutina para entrenarla. Tres ideas contra la
// sensación de «lista infinita»:
//
//   1. La rutina se parte en sus TRES MOMENTOS, con su separador:
//        Calentamiento y movilidad → Fuerza → Enfriamiento
//      Así se sabe siempre en qué parte se está y cuánto falta.
//   2. Cada ejercicio es compacto: una línea con su nombre y lo recetado, lo
//      que hizo la última vez escrito en claro, y cajitas pequeñas.
//   3. El ejercicio TERMINADO se pliega en una sola línea con su check. Lo
//      hecho deja de ocupar pantalla; se despliega con un toque si hace falta.
//
// Las repeticiones se muestran como las recetó el coach (6-12, 15, 30 s) y las
// cajitas van VACÍAS: rellenarlas con la vez pasada confundía. Lo de la
// última vez y el récord están a un toque, en sus botones. En los ejercicios
// de peso corporal solo se piden reps.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Play, Check, CaretDown, Fire, Barbell, Wind, Trophy, FilmStrip, ChatCircleText, Timer, ArrowsClockwise, ClockCounterClockwise, ListBullets } from '@phosphor-icons/react';
import EntrenoFicha from './EntrenoFicha.jsx';
import { Hoja } from './entrenoUI.jsx';
import { miniatura, numero, descansoEnCircuito, sinPeso, convertir } from './entrenoDatos.js';
import { nombresEj } from './v2.js';
import { SURFACE, TEXT, TEXT_MUTED, TEXT_LIGHT, BORDER, SECCION } from './theme.js';
import { asegurarCSS, vibrar } from './Celebraciones.jsx';

const AZUL = SECCION.entreno.base;
const AZUL_TINTA = SECCION.entreno.ink;
const CREMA = '#F4F1EB';
// Estilo Apple: tarjetas blancas muy redondeadas, campos grises sin borde, el
// check en grafito con la palomita amarilla de la marca.
const GRAFITO = '#1D1D1F';
const AMARILLO = '#F2C94C';
const CAMPO = '#F2F2F4';
const GRIS = '#8E8E93';
const HECHO_FONDO = '#FBF5E2';
const HECHO_BORDE = 'rgba(242,201,76,0.45)';
const HECHO_TINTA = '#8A6A12';
const TARJETA = {
  background: SURFACE, borderRadius: 22, marginBottom: 12,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 22px -12px rgba(0,0,0,0.16)',
};
const CSS_RUTINA = `
.rv2-campo:focus { background: #FFFFFF !important; box-shadow: inset 0 0 0 2px ${'#1D1D1F'} !important; }
`;

// ── Los tres momentos ─────────────────────────────────────────────────────
// Por el TIPO de cada ejercicio (lo pone el coach en la galería) y por dónde
// cae en la rutina: lo de preparación ANTES de la primera fuerza es
// calentamiento; lo de cierre DESPUÉS de la última, enfriamiento. Un bloque
// cuenta como preparación si la mayoría de sus ejercicios lo son (un circuito
// de movilidad con una plancha sigue siendo el calentamiento).
const PREPARA = new Set(['cardio', 'movilidad', 'pliometrico', 'agilidad', 'estiramiento_pasivo']);
const CIERRA = new Set(['cardio', 'movilidad', 'estiramiento_pasivo']);
const mayoria = (lista, set) => lista.filter(re => set.has(re.ejercicio?.tipo)).length * 2 >= lista.length;

// Para partir los ejercicios sueltos: preparación/cierre por un lado, fuerza
// por otro.
export const claseMomento = (re) => (PREPARA.has(re.ejercicio?.tipo) ? 'prep' : 'fuerza');

export function fasesDeTramos(tramos) {
  const esFuerza = tramos.map(t => !mayoria(t.vueltas[0] || [], PREPARA));
  const primera = esFuerza.indexOf(true);
  const ultima = esFuerza.lastIndexOf(true);
  // Sin nada de fuerza (una rutina de movilidad) no hay momentos que separar.
  if (primera === -1) return tramos.map(() => null);
  return tramos.map((t, i) => {
    if (i < primera) return 'calentamiento';
    if (i > ultima && mayoria(t.vueltas[0] || [], CIERRA)) return 'enfriamiento';
    return 'fuerza';
  });
}

// Cada momento con su tono, para distinguirlos de un vistazo: el
// calentamiento cálido, la fuerza en el azul de Entreno y el cierre en verde.
const MOMENTO = {
  calentamiento: { titulo: 'Calentamiento y movilidad', bajada: 'Cardio suave, movilidad y activación', Icono: Fire, color: '#C95F17', tinte: '#FBEADB' },
  fuerza:        { titulo: 'Fuerza', bajada: 'El trabajo principal', Icono: Barbell, color: AZUL, tinte: SECCION.entreno.tint },
  enfriamiento:  { titulo: 'Enfriamiento', bajada: 'Cardio de cierre y estiramientos', Icono: Wind, color: '#2F7F45', tinte: '#E3F1E6' },
};

export function SeparadorMomento({ fase, hechos, total }) {
  const m = MOMENTO[fase];
  if (!m) return null;
  const listo = total > 0 && hechos >= total;
  return (
    <div data-momento={fase} style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '24px 4px 10px' }}>
      <span style={{
        width: 26, height: 26, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center',
        background: listo ? GRAFITO : m.tinte, color: listo ? AMARILLO : m.color,
      }}>{listo ? <Check size={14} weight="bold" /> : <m.Icono size={14} weight="fill" />}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{m.titulo}</div>
      {total > 0 && (
        <div style={{ fontSize: 15, fontWeight: 600, color: GRIS, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{listo ? 'Hecho ✓' : `${hechos} de ${total}`}</div>
      )}
    </div>
  );
}

// ── Un ejercicio ──────────────────────────────────────────────────────────
// Lo que no lleva carga (cardio, movilidad, estiramientos) no pide reps ni
// kilos: se marca hecho y ya. Menos cajitas, menos pantalla.
export const SIN_CARGA = new Set(['cardio', 'movilidad', 'estiramiento_pasivo', 'estiramiento', 'agilidad']);

const coma = (x) => String(x).replace('.', ',');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso) => { const [, m, d] = String(iso || '').slice(0, 10).split('-').map(Number); return m ? `${d} ${MESES[m - 1]}` : ''; };

// ¿Las reps son POR LADO? Lo dice el coach en el texto («10 por lado»,
// «c/l») o el ejercicio es unilateral. Tiene que quedar dicho en todos lados:
// en lo recetado, en la cabecera de las cajitas y en «la última vez».
const RE_LADO = /(por|cada)\s+(lado|pierna|brazo)|c\/l\b|per side|each side/i;
export const porLado = (re) => RE_LADO.test(String(re?.reps || '')) || !!re?.ejercicio?.unilateral;
export function textoReps(re) {
  const r = String(re?.reps || '').trim();
  if (!r) return '';
  const conReps = /^\d+(\s*[-–]\s*\d+)?$/.test(r) ? `${r} reps` : r;
  return porLado(re) && !RE_LADO.test(r) ? `${conReps} por lado` : conReps;
}
export const textoDescanso = (seg) => (Number(seg) > 0 ? `Descanso ${Number(seg)} s` : 'Sin descanso');

// «La última vez», serie por serie y dicho entero: «Serie 1: 12 reps por lado · 15 kg».
// Con `unidad` el peso se pasa a la unidad de hoy (la que eligió en
// «Unidades»); con `soloReps` (peso corporal) no se habla de peso.
export function lineasUltima(series, lado, { unidad = null, soloReps = false } = {}) {
  return (series || []).filter(s => s.reps != null || s.peso).map(s => {
    const reps = s.reps != null ? `${s.reps} reps${lado ? ' por lado' : ''}` : '';
    const u = unidad || s.unidad || 'kg';
    const peso = soloReps && !s.peso ? '' : s.peso ? `${coma(convertir(s.peso, s.unidad || 'kg', u))} ${u}` : 'sin peso';
    return `Serie ${s.serie}: ${[reps, peso].filter(Boolean).join(' · ')}`;
  });
}
// Compatibilidad: una línea corta (la usan otras vistas).
export function textoUltima(series) {
  return lineasUltima(series, false).map(l => l.replace(/^Serie \d+: /, '')).join(' · ');
}

// El video, chico y al lado: está a mano para quien lo quiera ver, sin
// comerse la pantalla de quien ya se sabe el ejercicio.
function Miniatura({ e, alTocar, ancho = 68, alto = 52 }) {
  const n = nombresEj(e);
  const thumb = miniatura(e);
  const chica = ancho < 60;
  return (
    <button onClick={alTocar} aria-label={`Ver ${n.grande}`} style={{
      flex: 'none', width: ancho, height: alto, borderRadius: chica ? 11 : 14, overflow: 'hidden', border: 'none', padding: 0,
      cursor: 'pointer', background: CREMA, position: 'relative', display: 'block',
    }}>
      {thumb
        ? <img src={thumb} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: TEXT_LIGHT }}><Barbell size={20} /></span>}
      {thumb && (
        <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span style={{
            width: chica ? 22 : 26, height: chica ? 22 : 26, borderRadius: 99, display: 'grid', placeItems: 'center', paddingLeft: 1,
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          }}><Play size={chica ? 10 : 12} weight="fill" color={GRAFITO} /></span>
        </span>
      )}
    </button>
  );
}

function Nombres({ e, tam = 17 }) {
  const n = nombresEj(e);
  return (
    <>
      <div style={{ fontSize: tam, fontWeight: 800, color: TEXT, lineHeight: 1.18, letterSpacing: '-0.02em' }}>{n.grande}</div>
      {n.chico && <div style={{ fontSize: 13, color: GRIS, marginTop: 2 }}>{n.chico}</div>}
    </>
  );
}

// El descanso dicho como se piensa: «90 s», «2 min», «1:30 min».
const textoDescansoCorto = (seg) => {
  const x = Number(seg);
  if (!(x > 0)) return 'Sin descanso';
  if (x < 60) return `Descanso ${x} s`;
  return x % 60 ? `Descanso ${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')} min` : `Descanso ${x / 60} min`;
};

// ── Los botones de cada ejercicio ─────────────────────────────────────────
// Ficha, Tu récord, Última vez y Nota, en una fila pareja. «La última vez»
// ya no va escrita dentro de la tarjeta: se come mucha pantalla y solo la
// consulta quien la necesita.
function Botones({ items, chico = false }) {
  return (
    <div data-botones style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 7, marginTop: chico ? 8 : 10 }}>
      {items.map(({ Icono, texto, onClick }) => (
        <button key={texto} onClick={onClick} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          height: chico ? 40 : 44, padding: '0 2px', borderRadius: 13, border: 'none', gap: 1,
          background: CAMPO, color: TEXT, cursor: 'pointer', fontFamily: 'inherit',
          // Con cuatro botones, un pelo más chica para que «Nota al coach» quepa entera.
          fontSize: items.length >= 4 ? 10.5 : 11.5, letterSpacing: items.length >= 4 ? '-0.01em' : 0, fontWeight: 650, whiteSpace: 'nowrap', minWidth: 0,
        }}>
          <Icono size={chico ? 16 : 17} color={GRAFITO} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{texto}</span>
        </button>
      ))}
    </div>
  );
}

function botonesDe({ sinCarga, abrirFicha, abrirRecord, abrirUltima, onNota }) {
  return [
    { Icono: FilmStrip, texto: 'Ficha', onClick: abrirFicha },
    ...(sinCarga ? [] : [
      { Icono: Trophy, texto: 'Tu récord', onClick: abrirRecord },
      { Icono: ClockCounterClockwise, texto: 'Última vez', onClick: abrirUltima },
    ]),
    ...(onNota ? [{ Icono: ChatCircleText, texto: 'Nota al coach', onClick: onNota }] : []),
  ];
}

const NADA_AUN = 'Todavía no has registrado este ejercicio. Lo que marques hoy será tu primera marca.';
const cajaHoja = { marginTop: 14, padding: '14px 15px', borderRadius: 16, background: '#F7F5F0' };

// TU RÉCORD: el peso más alto que ha levantado en este ejercicio (y con ese
// peso, sus mejores reps). En peso corporal, su mejor serie en reps.
export function HojaRecordV2({ re, abierto, alCerrar, unidad = 'kg' }) {
  if (!re) return null;
  const n = nombresEj(re.ejercicio);
  const u = re.ultima_vez;
  const r = u && u.record;
  const soloReps = sinPeso(re.ejercicio);
  const lado = porLado(re);
  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo={`Tu récord · ${n.grande}`} alto="60vh">
      {!r ? <div style={{ ...cajaHoja, fontSize: 14, color: TEXT_MUTED }}>{NADA_AUN}</div> : (
        <div style={{ ...cajaHoja, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ width: 44, height: 44, borderRadius: 99, background: SECCION.entreno.tint, color: AZUL_TINTA, display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Trophy size={22} weight="fill" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: TEXT_MUTED, fontWeight: 650 }}>
              {r.peso && !soloReps ? 'El peso más alto que has levantado' : 'Tu mejor serie'}
            </div>
            <div data-record style={{ fontSize: 26, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {r.peso ? `${coma(convertir(r.peso, r.unidad || 'kg', unidad))} ${unidad}` : `${r.reps} reps${lado ? ' por lado' : ''}`}
            </div>
            <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
              {r.peso ? `${r.reps} reps${lado ? ' por lado' : ''} · ` : ''}{fechaCorta(r.fecha)}
            </div>
          </div>
        </div>
      )}
      {u && u.veces > 1 && <div style={{ fontSize: 13, color: TEXT_LIGHT, marginTop: 10, textAlign: 'center' }}>Lo has hecho {u.veces} veces.</div>}
    </Hoja>
  );
}

// LA ÚLTIMA VEZ: serie por serie, y debajo (plegadas) las anteriores.
export function HojaUltimaV2({ re, abierto, alCerrar, unidad = 'kg' }) {
  const [todas, setTodas] = useState(false);
  if (!re) return null;
  const n = nombresEj(re.ejercicio);
  const u = re.ultima_vez;
  const lado = porLado(re);
  const soloReps = sinPeso(re.ejercicio);
  const opciones = { unidad, soloReps };
  const antes = (u?.historial || []).slice(1);
  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo={`La última vez · ${n.grande}`} alto="75vh">
      {!u ? <div style={{ ...cajaHoja, fontSize: 14, color: TEXT_MUTED }}>{NADA_AUN}</div> : (<>
        <div data-ultima style={{ ...cajaHoja, fontSize: 15, color: TEXT, lineHeight: 1.6 }}>
          <div style={{ fontSize: 12.5, color: TEXT_MUTED, fontWeight: 650, marginBottom: 2 }}>{fechaCorta(u.fecha)}</div>
          {lineasUltima(u.series, lado, opciones).map(l => <div key={l}>{l}</div>)}
        </div>
        {antes.length > 0 && (
          <button onClick={() => setTodas(v => !v)} style={{
            marginTop: 12, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: AZUL_TINTA,
          }}>{todas ? 'Ocultar las anteriores' : `Ver las ${antes.length} anteriores`}</button>
        )}
        {todas && antes.map(h => (
          <div key={h.fecha} style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.55 }}>
            <div style={{ fontWeight: 700, color: TEXT }}>{fechaCorta(h.fecha)}</div>
            {lineasUltima(h.series, lado, opciones).map(l => <div key={l}>{l}</div>)}
          </div>
        ))}
      </>)}
    </Hoja>
  );
}

function CabeceraCajitas({ lado, unidad, onUnidad, soloReps = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 1,
      fontSize: 11.5, fontWeight: 700, color: GRIS, letterSpacing: '.04em',
    }}>
      <div style={{ width: 22, flex: 'none' }} />
      <div style={{ flex: 1, textAlign: 'center' }}>{lado ? 'REPS POR LADO' : 'REPS'}</div>
      {!soloReps && <>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <button onClick={onUnidad} aria-label={`Cambiar a ${unidad === 'kg' ? 'libras' : 'kilos'}`} style={{
          border: 'none', background: 'transparent', borderRadius: 999, padding: '2px 6px',
          fontSize: 11.5, fontWeight: 700, color: GRIS, letterSpacing: '.04em', cursor: 'pointer', fontFamily: 'inherit',
        }}>{unidad.toUpperCase()} ⇄</button>
      </div>
      </>}
      <div style={{ width: 34, flex: 'none' }} />
    </div>
  );
}

export function EjercicioV2({ re, marcadas, onMarcar, onDesmarcar, unidad = 'kg', onUnidad, onNota, ahora = false }) {
  const e = re.ejercicio;
  const n = nombresEj(e);
  const [ficha, setFicha] = useState(false);
  const [record, setRecord] = useState(false);
  const [verUltima, setVerUltima] = useState(false);
  const series = Array.from({ length: Math.max(1, re.series || 1) }, (_, i) => i + 1);
  const sinCarga = SIN_CARGA.has(e?.tipo);
  const soloReps = !sinCarga && sinPeso(e);
  const lado = porLado(re);
  const completo = series.every(s => marcadas[`${re.id}:${s}`]);

  // Terminado → se pliega solo. Se puede volver a abrir con un toque.
  const [plegado, setPlegado] = useState(completo);
  const antes = useRef(completo);
  useEffect(() => {
    if (completo && !antes.current) setPlegado(true);
    if (!completo) setPlegado(false);
    antes.current = completo;
  }, [completo]);

  if (plegado) {
    return (
      // Hecho = otro color: la tarjeta plegada se tiñe del amarillo suave de
      // la marca, para ver de un vistazo qué ya está.
      <button data-plegado onClick={() => setPlegado(false)} style={{
        ...TARJETA, background: HECHO_FONDO, boxShadow: `inset 0 0 0 1px ${HECHO_BORDE}`,
        width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 10,
      }}>
        <span style={{ width: 26, height: 26, borderRadius: 99, background: GRAFITO, color: AMARILLO, display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Check size={14} weight="bold" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.grande}</span>
          <span style={{ display: 'block', fontSize: 13, color: HECHO_TINTA, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {`${series.length} serie${series.length === 1 ? '' : 's'} · hecho`}
          </span>
        </span>
        <span style={{ fontSize: 12.5, color: GRIS, flex: 'none' }}>{`${series.length}/${series.length}`}</span>
        <CaretDown size={15} color="#C7C7CC" />
      </button>
    );
  }

  return (
    <div data-ejercicio={e?.alias || e?.nombre} data-ahora={ahora ? '1' : undefined} style={{ ...TARJETA, padding: '12px 13px 11px' }}>
      <style>{CSS_RUTINA}</style>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Miniatura e={e} alTocar={() => setFicha(true)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {ahora && <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: GRAFITO, background: AMARILLO, padding: '2px 8px', borderRadius: 99, marginBottom: 5 }}>AHORA</span>}
          <Nombres e={e} />
        </div>
      </div>
      {/* Lo recetado, en una línea con sus íconos. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8, fontSize: 13.5, color: '#3A3A3C', fontWeight: 600 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <ListBullets size={15} />
          {re.series > 1 ? `${re.series} series × ` : ''}{textoReps(re)}
          {re.peso_objetivo ? ` · ${re.peso_objetivo}` : ''}
          {re.rir != null ? ` · RIR ${re.rir}` : ''}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Timer size={15} /> {textoDescansoCorto(re.descanso_seg)}
        </span>
      </div>

      <Botones items={botonesDe({
        sinCarga, onNota, abrirFicha: () => setFicha(true), abrirRecord: () => setRecord(true), abrirUltima: () => setVerUltima(true),
      })} />

      {re.notas && (
        <div style={{ marginTop: 9, padding: '8px 11px', borderRadius: 11, background: '#FFF6E0', fontSize: 12.5, color: '#6B4E05', lineHeight: 1.45 }}>
          <b>De tu coach:</b> {re.notas}
        </div>
      )}

      {sinCarga ? <div style={{ height: 10 }} /> : <CabeceraCajitas lado={lado} unidad={unidad} onUnidad={onUnidad} soloReps={soloReps} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: sinCarga ? 6 : 2 }}>
        {series.map(s => (
          <SerieFilaV2 key={s} n={s} re={re} unidad={unidad} sinCarga={sinCarga} soloReps={soloReps}
            marcada={marcadas[`${re.id}:${s}`]}
            descansoSeg={s < (re.series || 1) ? re.descanso_seg : null}
            onMarcar={onMarcar} onDesmarcar={onDesmarcar} />
        ))}
      </div>

      <EntrenoFicha item={re} abierto={ficha} alCerrar={() => setFicha(false)} />
      <HojaRecordV2 re={re} unidad={unidad} abierto={record} alCerrar={() => setRecord(false)} />
      <HojaUltimaV2 re={re} unidad={unidad} abierto={verUltima} alCerrar={() => setVerUltima(false)} />
    </div>
  );
}

// ── Un circuito, en UNA tarjeta ───────────────────────────────────────────
// Todas las vueltas juntas, y cada vez que aparece un ejercicio va con su
// foto y su nombre: la gente se guía por la imagen, no solo por el nombre.
// Tras cada estación, el descanso que toca (o «Sin descanso»).
export function CircuitoV2({ tramo, marcadas, onMarcar, onDesmarcar, unidadDe, onUnidad, onNota }) {
  const b = tramo.bloque || {};
  const vueltas = tramo.vueltas;
  const tipo = { superserie: 'Superserie', circuito: 'Circuito', emom: 'EMOM', amrap: 'AMRAP' }[b.tipo] || 'Circuito';
  const [ficha, setFicha] = useState(null);
  const [record, setRecord] = useState(null);
  const [verUltima, setVerUltima] = useState(null);
  const hechas = vueltas.reduce((t, v, vi) => t + v.filter(re => marcadas[`${re.id}:${vi + 1}`]).length, 0);
  const total = vueltas.reduce((t, v) => t + v.length, 0);
  return (
    <div style={{ ...TARJETA, padding: '14px 12px 10px' }}>
      <style>{CSS_RUTINA}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 99, background: SECCION.entreno.tint, color: AZUL_TINTA, display: 'grid', placeItems: 'center', flex: 'none' }}>
          <ArrowsClockwise size={16} weight="bold" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 750, color: TEXT }}>{tipo} · {vueltas.length} vueltas</div>
          <div style={{ fontSize: 12.5, color: TEXT_MUTED }}>
            {Number(b.descanso_entre_seg) > 0 ? `${b.descanso_entre_seg} s entre ejercicios` : 'Sin descanso entre ejercicios'}
            {' · '}{Number(b.descanso_seg) > 0 ? `${b.descanso_seg} s al terminar cada vuelta` : 'sin descanso entre vueltas'}
          </div>
        </div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>{hechas}/{total}</div>
      </div>

      {vueltas.map((vuelta, vi) => (
        <div key={vi} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 8px', fontSize: 12, fontWeight: 750, color: AZUL_TINTA }}>
            Vuelta {vi + 1} de {vueltas.length}
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vuelta.map((re, k) => {
              const e = re.ejercicio;
              const sinCarga = SIN_CARGA.has(e?.tipo);
              const soloReps = !sinCarga && sinPeso(e);
              const lado = porLado(re);
              const desc = descansoEnCircuito(b, k, vuelta.length, vi, vueltas.length);
              const unidad = unidadDe(re);
              return (
                <div key={re.id} style={{ borderRadius: 16, background: '#FAF9F6', padding: '10px 10px 9px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Miniatura e={e} ancho={54} alto={42} alTocar={() => setFicha(re)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Nombres e={e} tam={15} />
                      <div style={{ fontSize: 13, color: '#3A3A3C', fontWeight: 600, marginTop: 3 }}>{textoReps(re)}</div>
                    </div>
                  </div>
                  {vi === 0 && (
                    <Botones chico items={botonesDe({
                      sinCarga, onNota: onNota ? () => onNota(re) : null,
                      abrirFicha: () => setFicha(re), abrirRecord: () => setRecord(re), abrirUltima: () => setVerUltima(re),
                    })} />
                  )}
                  {!sinCarga && <CabeceraCajitas lado={lado} unidad={unidad} onUnidad={() => onUnidad(re)} soloReps={soloReps} />}
                  <div style={{ marginTop: sinCarga ? 8 : 0 }}>
                    <SerieFilaV2 n={vi + 1} re={re} unidad={unidad} sinCarga={sinCarga} soloReps={soloReps} etiqueta={vi + 1}
                      marcada={marcadas[`${re.id}:${vi + 1}`]} descansoSeg={desc}
                      onMarcar={onMarcar} onDesmarcar={onDesmarcar} />
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Timer size={13} /> {k === vuelta.length - 1 && vi === vueltas.length - 1 ? 'Fin del circuito' : textoDescanso(desc)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <EntrenoFicha item={ficha} abierto={!!ficha} alCerrar={() => setFicha(null)} />
      <HojaRecordV2 re={record} unidad={record ? unidadDe(record) : 'kg'} abierto={!!record} alCerrar={() => setRecord(null)} />
      <HojaUltimaV2 re={verUltima} unidad={verUltima ? unidadDe(verUltima) : 'kg'} abierto={!!verUltima} alCerrar={() => setVerUltima(null)} />
    </div>
  );
}

function SerieFilaV2({ n, re, marcada, descansoSeg, unidad, onMarcar, onDesmarcar, sinCarga, soloReps = false }) {
  const [reps, setReps] = useState(marcada?.reps != null ? String(marcada.reps) : '');
  const [peso, setPeso] = useState(marcada?.peso != null ? String(marcada.peso).replace('.', ',') : '');
  const [falta, setFalta] = useState(false);
  // Al marcar: el check «salta», un brillo recorre la fila y vibra corto.
  const [pop, setPop] = useState(0);
  const repsRef = useRef(null);
  const hecha = !!marcada;
  useEffect(() => { asegurarCSS(); }, []);
  const celebrar = () => { setPop(p => p + 1); vibrar(12); };

  useEffect(() => {
    if (marcada) {
      setReps(marcada.reps != null ? String(marcada.reps) : '');
      setPeso(marcada.peso != null ? String(marcada.peso).replace('.', ',') : '');
    }
  }, [marcada]);

  const marcar = () => {
    if (hecha) { onDesmarcar(re, n); return; }
    if (sinCarga) {
      // «10» se guarda como 10; «3 min suave» o «30 s» no son reps: va vacío.
      const r = /^\s*\d+\s*$/.test(String(re.reps || '')) ? Number(re.reps) : null;
      onMarcar(re, n, r, null, descansoSeg, unidad);
      celebrar();
      return;
    }
    const r = numero(reps);
    // Sin reps no se marca: no se inventa un número. Se lleva el dedo a la cajita.
    if (r == null) { setFalta(true); repsRef.current && repsRef.current.focus(); return; }
    setFalta(false);
    // El peso va en blanco: si no lo escribe, se guarda sin peso (no se
    // copia el de la última vez, que confundía).
    onMarcar(re, n, r, soloReps ? null : numero(peso), descansoSeg, unidad);
    celebrar();
  };
  const brillo = pop > 0 && hecha ? <span key={pop} className="mt-barrido" aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none' }} /> : null;

  if (sinCarga) {
    return (
      <button onClick={marcar} aria-label={hecha ? `Deshacer serie ${n}` : `Marcar serie ${n}`} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 40, padding: '0 5px 0 14px',
        borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', border: 'none',
        background: hecha ? 'transparent' : CAMPO, boxShadow: hecha ? `inset 0 0 0 1px ${'#E5E5EA'}` : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        {brillo}
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: hecha ? 700 : 600, color: hecha ? TEXT : '#3A3A3C' }}>
          {hecha ? 'Hecho' : (re.series > 1 ? `Serie ${n} · ${textoReps(re)}` : textoReps(re) || 'Marcar hecho')}
        </span>
        <span key={pop} className={pop && hecha ? 'mt-pop' : undefined} style={{
          width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', flex: 'none',
          background: hecha ? GRAFITO : '#FFFFFF', boxShadow: hecha ? 'none' : 'inset 0 0 0 1.6px #D1D1D6', color: hecha ? AMARILLO : '#C7C7CC',
        }}><Check size={15} weight="bold" /></span>
      </button>
    );
  }

  // Campos grises sin borde; al tocarlos, blancos con contorno grafito. Ya
  // marcada, la serie queda en limpio: los números en negrita, sin caja.
  const campo = (malo) => ({
    width: '100%', height: 36, padding: '0 6px', borderRadius: 11, textAlign: 'center', border: 'none',
    background: hecha ? 'transparent' : CAMPO,
    boxShadow: malo ? 'inset 0 0 0 1.5px #D9785F' : 'none',
    fontSize: 16, fontWeight: 700, color: TEXT, outline: 'none', opacity: 1, WebkitTextFillColor: TEXT,
    fontFamily: 'inherit', WebkitAppearance: 'none', boxSizing: 'border-box',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
      borderRadius: 14, position: 'relative', overflow: 'hidden',
    }}>
      {brillo}
      <div style={{ width: 22, flex: 'none', textAlign: 'center', fontSize: 14, fontWeight: 700, color: hecha ? TEXT : '#AEAEB2' }}>{n}</div>
      <div style={{ flex: 1 }}>
        <input ref={repsRef} inputMode="numeric" value={reps} className="rv2-campo"
          onChange={ev => { setReps(ev.target.value); if (falta) setFalta(false); }}
          aria-label={`Repeticiones serie ${n}`}
          style={campo(falta)} disabled={hecha} />
      </div>
      {!soloReps && (
      <div style={{ flex: 1 }}>
        <input inputMode="decimal" value={peso} onChange={ev => setPeso(ev.target.value)} className="rv2-campo"
          aria-label={`Peso serie ${n}`} style={campo(false)} disabled={hecha} />
      </div>
      )}
      <button key={pop} className={pop && hecha ? 'mt-pop' : undefined} onClick={marcar} aria-label={hecha ? `Deshacer serie ${n}` : `Marcar serie ${n}`} style={{
        flex: 'none', width: 34, height: 34, borderRadius: 99, cursor: 'pointer', border: 'none',
        background: hecha ? GRAFITO : '#FFFFFF', boxShadow: hecha ? 'none' : 'inset 0 0 0 1.6px #D1D1D6',
        color: hecha ? AMARILLO : '#C7C7CC', display: 'grid', placeItems: 'center',
      }}><Check size={16} weight="bold" /></button>
    </div>
  );
}
