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
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Play, Check, CaretDown, CaretUp, Fire, Barbell, Wind, Trophy, Info, ChatCircleText, Timer, ArrowsClockwise, ClockCounterClockwise, ListBullets } from '@phosphor-icons/react';
import EntrenoFicha from './EntrenoFicha.jsx';
import { Hoja, FONDO_TARJETA_HOJA } from './entrenoUI.jsx';
import { miniatura, urlVideoLimpio, numero, descansoEnCircuito, sinPeso, convertir, leerTecleado, guardarTecleado } from './entrenoDatos.js';
import { nombresEj } from './v2.js';
import { SURFACE, TEXT, TEXT_MUTED, TEXT_LIGHT, BORDER, SECCION } from './theme.js';
import { asegurarCSS, vibrar } from './Celebraciones.jsx';
import { enPrueba } from './vistaApp.js';
import { VideoMini } from './VideoLimpio.jsx';

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
    <div data-momento={fase} style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '18px 4px 8px' }}>
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

// Los ejercicios por tiempo («30 s», «45 seg», «1 min», «1:30 min»): cuántos
// segundos dura cada uno (en un rango, el primero). Si no es por tiempo, null.
export function segundosDeTiempo(texto) {
  const t = String(texto || '').toLowerCase().trim();
  let m = t.match(/^(\d+):(\d{2})(?!\d)/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const num = '(\\d+(?:[.,]\\d+)?)(?:\\s*[-–]\\s*\\d+(?:[.,]\\d+)?)?\\s*';
  m = t.match(new RegExp('^' + num + '(s|seg|segs|segundos?|sec|secs|"|″)(?![a-z])'));
  if (m) return Math.round(Number(m[1].replace(',', '.')));
  m = t.match(new RegExp('^' + num + "(min|mins|minutos?|'|′)(?![a-z])"));
  if (m) return Math.round(Number(m[1].replace(',', '.')) * 60);
  return null;
}
export const textoTiempo = (seg) => (seg < 60 ? `${seg} s` : seg % 60 ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')} min` : `${seg / 60} min`);

// La cuenta atrás de los ejercicios por tiempo vive en la rutina
// (Entrenamiento.jsx), con la ventanita negra; las filas solo la arrancan.
// { empezar(re, n, seg, descansoSeg, unidad), activa: 'reId:serie' | null }
export const CuentaEjercicio = createContext(null);

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
function Miniatura({ e, alTocar, ancho = 68, alto = 52, enVivo = false }) {
  const n = nombresEj(e);
  const thumb = miniatura(e);
  const chica = ancho < 60;
  // Vista en prueba: el ejercicio que toca ahora se mueve en su cuadrito.
  const video = enVivo ? urlVideoLimpio(e) : null;
  return (
    <button onClick={alTocar} aria-label={`Ver ${n.grande}`} style={{
      flex: 'none', width: ancho, height: alto, borderRadius: chica ? 11 : 14, overflow: 'hidden', border: 'none', padding: 0,
      cursor: 'pointer', background: CREMA, position: 'relative', display: 'block',
    }}>
      {thumb
        ? <img src={thumb} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: TEXT_LIGHT }}><Barbell size={20} /></span>}
      {video && <VideoMini src={video} miniatura={thumb} ancho={ancho} alto={alto} />}
      {thumb && !video && (
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
// Ficha, Historial y Nota al coach, en una fila de píldoras BLANCAS con sombra
// (como los botones redondos de arriba), con el texto al lado del ícono. Antes
// eran cajas del mismo gris que los campos donde se escribe y se confundían:
// lo gris se llena, lo blanco con sombra se toca.
// `corto`: el texto que va cuando el espacio es angosto (los circuitos).
function Botones({ items, chico = false, soloIconos = false, chicos = false }) {
  // Vista compacta: solo el ícono, en círculos chicos al lado del nombre.
  if (soloIconos) return (
    <div data-botones data-botones-iconos style={{ display: 'flex', gap: chicos ? 2 : 6, flex: 'none' }}>
      {items.map(({ Icono, texto, onClick }) => (
        <button key={texto} onClick={onClick} aria-label={texto} title={texto} data-pildora-ejercicio style={{
          width: chicos ? 32 : 34, height: chicos ? 32 : 34, borderRadius: 999, border: 'none', background: '#FFFFFF', color: TEXT, cursor: 'pointer', padding: 0,
          boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 3px 10px rgba(30,40,60,0.09)', display: 'grid', placeItems: 'center', flex: 'none',
        }}><Icono size={16} color={GRAFITO} /></button>
      ))}
    </div>
  );
  return (
    <div data-botones style={{ display: 'flex', gap: chico ? 6 : 7, marginTop: chico ? 8 : 9, minWidth: 0 }}>
      {items.map(({ Icono, texto, corto, onClick }) => {
        const visible = chico && corto ? corto : texto;
        return (
          <button key={texto} onClick={onClick} aria-label={visible !== texto ? texto : undefined} data-pildora-ejercicio style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: chico ? '0 10px' : '0 11px',
            borderRadius: 999, border: 'none', background: '#FFFFFF', color: TEXT, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 3px 10px rgba(30,40,60,0.09)',
            fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap', minWidth: 0, flex: '0 1 auto',
          }}>
            <Icono size={15} color={GRAFITO} style={{ flex: 'none' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{visible}</span>
          </button>
        );
      })}
    </div>
  );
}

function botonesDe({ sinCarga, abrirFicha, abrirRecord, abrirUltima, onNota }) {
  return [
    { Icono: Info, texto: 'Ficha', onClick: abrirFicha },
    // El récord va dentro del historial: un botón menos por ejercicio.
    ...(sinCarga ? [] : [{ Icono: ClockCounterClockwise, texto: 'Historial', onClick: abrirUltima }]),
    ...(onNota ? [{ Icono: ChatCircleText, texto: 'Nota al coach', corto: 'Nota', onClick: onNota }] : []),
  ];
}

const NADA_AUN = 'Todavía no has registrado este ejercicio. Lo que marques hoy será tu primera marca.';

// Vista compacta: lo que sigue va cerrado en una línea (foto chica, nombre y
// lo recetado). Tocarla lo abre.
function FilaCerrada({ e, texto, alAbrir, attr = {} }) {
  const thumb = miniatura(e);
  return (
    <button onClick={alAbrir} {...attr} style={{
      ...TARJETA, width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 13px', marginBottom: 8,
    }}>
      <span style={{ width: 38, height: 30, borderRadius: 9, overflow: 'hidden', background: CREMA, flex: 'none', display: 'grid', placeItems: 'center', color: GRIS }}>
        {thumb ? <img src={thumb} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <Barbell size={15} />}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombresEj(e).grande}</span>
      <span style={{ fontSize: 12.5, color: GRIS, flex: 'none' }}>{texto}</span>
      <CaretDown size={15} color="#C7C7CC" />
    </button>
  );
}
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

// Lo más pesado de cada sesión, en la unidad de hoy (con sus reps), de la
// más vieja a la más nueva: los puntos de la gráfica de progreso.
export function pesosPorSesion(historial, unidad = 'kg') {
  return (historial || []).slice().reverse().map(h => {
    let mejor = null;
    (h.series || []).forEach(x => {
      const v = Number(x.peso);
      if (!(v > 0)) return;
      const enU = convertir(v, x.unidad || 'kg', unidad);
      if (!mejor || enU > mejor.peso) mejor = { peso: enU, reps: x.reps };
    });
    return mejor ? { fecha: h.fecha, ...mejor } : null;
  }).filter(Boolean);
}

// La gráfica de progreso de pesos: una línea con sus puntos, el último
// resaltado y el número de cada extremo. Sin librerías.
export function GraficaPesos({ puntos, unidad = 'kg', alto = 110 }) {
  if (!puntos || puntos.length < 2) return null;
  const W = 300, H = alto, pad = { l: 6, r: 6, t: 18, b: 18 };
  const vals = puntos.map(p => p.peso);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max === min) { min = Math.max(0, min - 5); max = max + 5; }
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (puntos.length - 1);
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.peso).toFixed(1)}`).join(' ');
  const area = `${d} L${x(puntos.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const ult = puntos[puntos.length - 1], pri = puntos[0];
  return (
    <svg data-grafica-pesos viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img"
      aria-label={`Progreso de pesos: de ${coma(pri.peso)} a ${coma(ult.peso)} ${unidad}`}>
      <defs><linearGradient id="gpArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={AZUL} stopOpacity="0.18" /><stop offset="1" stopColor={AZUL} stopOpacity="0" />
      </linearGradient></defs>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#E5E5EA" strokeWidth="1" />
      <path d={area} fill="url(#gpArea)" />
      <path d={d} fill="none" stroke={AZUL} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {puntos.map((p, i) => <circle key={p.fecha} cx={x(i)} cy={y(p.peso)} r={i === puntos.length - 1 ? 4.5 : 2.6} fill={i === puntos.length - 1 ? AZUL : '#FFFFFF'} stroke={AZUL} strokeWidth="1.8" />)}
      <text x={x(0)} y={y(pri.peso) - 7} fontSize="11" fill={GRIS} fontWeight="700" textAnchor="start">{coma(pri.peso)}</text>
      <text x={x(puntos.length - 1)} y={y(ult.peso) - 8} fontSize="12" fill={TEXT} fontWeight="800" textAnchor="end">{coma(ult.peso)} {unidad}</text>
      <text x={x(0)} y={H - 4} fontSize="10.5" fill={GRIS} textAnchor="start">{fechaCorta(pri.fecha)}</text>
      <text x={x(puntos.length - 1)} y={H - 4} fontSize="10.5" fill={GRIS} textAnchor="end">{fechaCorta(ult.fecha)}</text>
    </svg>
  );
}

// HISTORIAL: arriba la franja de marca con la foto y el nombre; abajo, en
// tarjetas grandes, el récord y cuánto ha subido, la última vez serie por
// serie, la gráfica de cómo han subido los pesos y (plegadas) las sesiones
// anteriores.
const tarjetaHoja = { padding: '12px 14px', borderRadius: 18, background: FONDO_TARJETA_HOJA, marginBottom: 10 };
const rotuloHoja = { fontSize: 12.5, color: '#636366', fontWeight: 600 };
export function HojaUltimaV2({ re, abierto, alCerrar, unidad = 'kg' }) {
  const [todas, setTodas] = useState(false);
  if (!re) return null;
  const n = nombresEj(re.ejercicio);
  const u = re.ultima_vez;
  const lado = porLado(re);
  const soloReps = sinPeso(re.ejercicio);
  const opciones = { unidad, soloReps };
  const antes = (u?.historial || []).slice(1);
  const puntos = soloReps ? [] : pesosPorSesion(u?.historial, unidad);
  const pri = puntos[0], ult = puntos[puntos.length - 1];
  const subio = puntos.length >= 2 ? Math.round((ult.peso - pri.peso) * 10) / 10 : null;
  const rec = u?.record;
  const series = (u?.series || []).filter(x => x.reps != null || x.peso);
  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo={`Historial · ${n.grande}`} alto="80vh"
      marca={{ etiqueta: 'Historial', nombre: n.grande, foto: miniatura(re.ejercicio) }}>
      {!u ? <div style={{ ...tarjetaHoja, fontSize: 14, color: TEXT_MUTED }}>{NADA_AUN}</div> : (<>
        {(rec || subio != null) && (
          <div style={{ display: 'flex', gap: 10 }}>
            {rec && (
              <div data-tu-record style={{ ...tarjetaHoja, flex: 1, minWidth: 0 }}>
                <div style={rotuloHoja}>Tu récord</div>
                <div data-record style={{ fontSize: 24, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {rec.peso ? `${coma(convertir(rec.peso, rec.unidad || 'kg', unidad))} ${unidad}` : `${rec.reps} reps${lado ? ' por lado' : ''}`}
                </div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT }}>{rec.peso ? `${rec.reps} reps${lado ? ' por lado' : ''} · ` : ''}{fechaCorta(rec.fecha)}</div>
              </div>
            )}
            {subio != null && (
              <div data-subiste style={{ ...tarjetaHoja, flex: 1, minWidth: 0 }}>
                <div style={rotuloHoja}>Desde el {fechaCorta(pri.fecha)}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: subio > 0 ? '#2F7F45' : TEXT, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {subio > 0 ? '+' : ''}{coma(subio)} {unidad}
                </div>
                <div style={{ fontSize: 12, color: TEXT_LIGHT }}>{puntos.length} sesiones</div>
              </div>
            )}
          </div>
        )}
        <div data-ultima style={tarjetaHoja}>
          <div style={{ ...rotuloHoja, marginBottom: 4 }}>La última vez · {fechaCorta(u.fecha)}</div>
          {series.map((x, i) => {
            const reps = x.reps != null ? `${x.reps} reps${lado ? ' por lado' : ''}` : '';
            const peso = soloReps && !x.peso ? '' : x.peso ? `${coma(convertir(x.peso, x.unidad || 'kg', unidad))} ${unidad}` : 'sin peso';
            return (
              <div key={i} aria-label={lineasUltima([x], lado, opciones)[0]} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 15, color: TEXT }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 99, background: '#FFFFFF', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#636366', flex: 'none' }}>{x.serie}</span>
                <span aria-hidden="true" style={{ flex: 1 }}>{reps}</span>
                {peso && <b aria-hidden="true" style={{ fontWeight: 800 }}>{peso}</b>}
              </div>
            );
          })}
        </div>
        {puntos.length >= 2 && (
          <div data-progreso-pesos style={{ ...tarjetaHoja, paddingBottom: 10 }}>
            <div style={{ ...rotuloHoja, marginBottom: 6 }}>Progreso de pesos</div>
            <GraficaPesos puntos={puntos} unidad={unidad} />
          </div>
        )}
        {antes.length > 0 && (
          <button onClick={() => setTodas(v => !v)} style={{
            marginTop: 4, border: 'none', background: 'transparent', padding: '10px 0', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: AZUL_TINTA,
          }}>{todas ? 'Ocultar las anteriores' : `Ver las ${antes.length} sesiones anteriores`}</button>
        )}
        {todas && antes.map(h => (
          <div key={h.fecha} style={{ ...tarjetaHoja, fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.55 }}>
            <div style={{ fontWeight: 700, color: TEXT }}>{fechaCorta(h.fecha)}</div>
            {lineasUltima(h.series, lado, opciones).map(l => <div key={l}>{l}</div>)}
          </div>
        ))}
      </>)}
    </Hoja>
  );
}

// Las cajitas de reps y peso se estiran; lo de la última vez va en una
// columna fija pegada al check (sin hueco en el medio).
const CAJA = { flex: '1 1 0', minWidth: 0 };
const ANCHO_ULTIMA = 84;
const hayUltima = (re) => !!(re?.ultima_vez?.series || []).length;
// Lo que hizo en ESTA serie la última vez, en gris: «10 × 20 kg».
// Los números de ESA serie la última vez, en la unidad de hoy (para rellenar
// las cajitas con un toque). Rellenar no es marcar: el check sigue siendo suyo.
export function valoresSerieAnterior(re, n, unidad = 'kg') {
  const x = (re?.ultima_vez?.series || []).find(s => Number(s.serie) === Number(n));
  if (!x || (x.reps == null && !(Number(x.peso) > 0))) return null;
  return { reps: x.reps != null ? Number(x.reps) : null, peso: Number(x.peso) > 0 ? convertir(x.peso, x.unidad || 'kg', unidad) : null };
}
export function textoSerieAnterior(re, n, unidad = 'kg', soloReps = false) {
  const x = (re?.ultima_vez?.series || []).find(s => Number(s.serie) === Number(n));
  if (!x || (x.reps == null && !x.peso)) return null;
  const reps = x.reps != null ? String(x.reps) : '–';
  if (soloReps || !(Number(x.peso) > 0)) return `${reps} reps`;
  return `${reps} × ${coma(convertir(x.peso, x.unidad || 'kg', unidad))} ${unidad}`;
}

function CabeceraCajitas({ lado, unidad, onUnidad, soloReps = false, ultima = null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginTop: 9, marginBottom: 1,
      fontSize: 11.5, fontWeight: 700, color: GRIS, letterSpacing: '.04em',
    }}>
      <div style={{ width: 22, flex: 'none' }} />
      <div style={{ ...CAJA, textAlign: 'center', whiteSpace: 'nowrap' }}>{lado ? 'REPS/LADO' : 'REPS'}</div>
      {!soloReps && <>
      <div style={{ ...CAJA, textAlign: 'center' }}>
        <button onClick={onUnidad} aria-label={`Cambiar a ${unidad === 'kg' ? 'libras' : 'kilos'}`} style={{
          border: 'none', background: 'transparent', borderRadius: 999, padding: '2px 6px',
          fontSize: 11.5, fontWeight: 700, color: GRIS, letterSpacing: '.04em', cursor: 'pointer', fontFamily: 'inherit',
        }}>{unidad.toUpperCase()} ⇄</button>
      </div>
      </>}
      {ultima && (ultima.series || []).length > 0 && (
        <div data-cab-ultima style={{ width: ANCHO_ULTIMA, flex: 'none', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', color: '#AEAEB2', lineHeight: 1.2 }}>
          ÚLTIMA<br />{fechaCorta(ultima.fecha).toUpperCase()}
        </div>
      )}
      <div style={{ width: 34, flex: 'none' }} />
    </div>
  );
}

export function EjercicioV2({ re, marcadas, onMarcar, onDesmarcar, unidad = 'kg', onUnidad, onNota, ahora = false, compacta = false, cerrado = false, alAbrir, ligera = false }) {
  const prueba = enPrueba();
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
        ...TARJETA, background: HECHO_FONDO, boxShadow: 'none',
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

  const botones = botonesDe({
    sinCarga, onNota, abrirFicha: () => setFicha(true), abrirRecord: () => setRecord(true), abrirUltima: () => setVerUltima(true),
  });
  const recetado = `${re.series > 1 ? `${re.series} × ` : ''}${textoReps(re)}`;

  // Vista compacta: si no es el que toca, cerrado en una línea.
  if (compacta && cerrado) {
    return <FilaCerrada e={e} texto={recetado} alAbrir={alAbrir} attr={{ 'data-cerrado': '1', 'data-ejercicio-cerrado': e?.alias || e?.nombre, 'data-re-id': re.id }} />;
  }

  return (
    <div data-ejercicio={e?.alias || e?.nombre} data-re-id={re.id} data-ahora={ahora ? '1' : undefined} data-compacta={compacta ? '1' : undefined} data-ligera={ligera && !compacta ? '1' : undefined} style={{ ...TARJETA, padding: compacta ? '10px 12px 8px' : '11px 13px 9px', scrollMarginTop: 96 }}>
      <style>{CSS_RUTINA}</style>
      {compacta ? (
        // Compacta: foto chica, el nombre en inglés, lo recetado en una línea
        // y Ficha · Historial · Nota como íconos al lado.
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Miniatura e={e} alTocar={() => setFicha(true)} ancho={50} alto={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT, lineHeight: 1.18, letterSpacing: '-0.02em' }}>{n.grande}</div>
            <div style={{ fontSize: 12.5, color: GRIS, marginTop: 2 }}>
              {recetado}{re.peso_objetivo ? ` · ${re.peso_objetivo}` : ''}{re.rir != null ? ` · RIR ${re.rir}` : ''} · {textoDescansoCorto(re.descanso_seg).toLowerCase()}
            </div>
          </div>
          {completo && (
            <button data-plegar onClick={() => setPlegado(true)} aria-label="Plegar ejercicio" style={{
              flex: 'none', width: 34, height: 34, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: CAMPO, color: GRAFITO, display: 'grid', placeItems: 'center',
            }}><CaretUp size={16} weight="bold" /></button>
          )}
          <Botones soloIconos items={botones} />
        </div>
      ) : (<>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Miniatura e={e} alTocar={() => setFicha(true)} enVivo={prueba && ahora && !ficha} />
        {/* Terminado y abierto: la flechita para volver a plegarlo. */}
        {completo && (
          <button data-plegar onClick={() => setPlegado(true)} aria-label="Plegar ejercicio" style={{
            order: 3, flex: 'none', width: 32, height: 32, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: CAMPO, color: GRAFITO, display: 'grid', placeItems: 'center',
          }}><CaretUp size={16} weight="bold" /></button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {ahora && <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: GRAFITO, background: AMARILLO, padding: '2px 8px', borderRadius: 99, marginBottom: 5 }}>AHORA</span>}
          {/* Vista en prueba: Ficha · Historial · Nota arriba a la derecha, a la
              altura del nombre; el texto les da la vuelta (si el nombre no
              cabe, sigue en la línea de abajo) y nada queda detrás. */}
          {ligera && prueba && <div data-botones-arriba style={{ float: 'right', margin: '-2px -4px 4px 8px' }}><Botones soloIconos chicos items={botones} /></div>}
          <Nombres e={e} />
          {/* Más liviana (a prueba): lo recetado y Ficha · Historial · Nota
              en UNA fila bajo el nombre, los botones solo con su ícono. */}
          {ligera && (
            <div data-recetado-ligero style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#3A3A3C', fontWeight: 600, lineHeight: 1.3 }}>
                {recetado}{re.peso_objetivo ? ` · ${re.peso_objetivo}` : ''}{re.rir != null ? ` · RIR ${re.rir}` : ''} · {textoDescansoCorto(re.descanso_seg).toLowerCase()}
              </span>
              {!prueba && <Botones soloIconos items={botones} />}
            </div>
          )}
        </div>
      </div>
      {/* Vista en prueba: una línea suave separa lo que es el ejercicio de
          donde se llenan las series. */}
      {ligera && prueba && <div data-separador-series style={{ height: 1, background: 'rgba(60,60,67,0.09)', margin: '10px 0 2px' }} />}
      {!ligera && (<>
      {/* Lo recetado, en una línea con sus íconos. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 7, fontSize: 13.5, color: '#3A3A3C', fontWeight: 600 }}>
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

      <Botones items={botones} />
      </>)}
      </>)}

      {re.notas && (
        <div style={{ marginTop: 9, padding: '8px 11px', borderRadius: 11, background: '#FFF6E0', fontSize: 12.5, color: '#6B4E05', lineHeight: 1.45 }}>
          <b>De tu coach:</b> {re.notas}
        </div>
      )}

      {sinCarga ? <div style={{ height: 10 }} /> : <CabeceraCajitas lado={lado} unidad={unidad} onUnidad={onUnidad} soloReps={soloReps} ultima={re.ultima_vez} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: sinCarga ? 6 : 2 }}>
        {series.map(s => (
          <SerieFilaV2 key={s} n={s} re={re} unidad={unidad} sinCarga={sinCarga} soloReps={soloReps}
            marcada={marcadas[`${re.id}:${s}`]}
            // El descanso arranca tras CADA serie (también la última, antes del
            // siguiente ejercicio, y aunque se marquen en otro orden): antes
            // solo salía entre series y parecía que a veces fallaba.
            descansoSeg={re.descanso_seg}
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
export function CircuitoV2({ tramo, marcadas, onMarcar, onDesmarcar, unidadDe, onUnidad, onNota, compacta = false, cerrado = false, alAbrir, ligera = false, ahora = null }) {
  const prueba = enPrueba();
  const b = tramo.bloque || {};
  const vueltas = tramo.vueltas;
  const tipo = { superserie: 'Superserie', circuito: 'Circuito', emom: 'EMOM', amrap: 'AMRAP' }[b.tipo] || 'Circuito';
  const [ficha, setFicha] = useState(null);
  const [record, setRecord] = useState(null);
  const [verUltima, setVerUltima] = useState(null);
  const hechas = vueltas.reduce((t, v, vi) => t + v.filter(re => marcadas[`${re.id}:${vi + 1}`]).length, 0);
  const total = vueltas.reduce((t, v) => t + v.length, 0);
  const completo = total > 0 && hechas === total;

  // Igual que un ejercicio suelto: terminado → se pliega solo, con el color
  // de «hecho», y se vuelve a abrir con un toque.
  const [plegado, setPlegado] = useState(completo);
  const antes = useRef(completo);
  useEffect(() => {
    if (completo && !antes.current) setPlegado(true);
    if (!completo) setPlegado(false);
    antes.current = completo;
  }, [completo]);

  if (plegado) {
    const nombres = (vueltas[0] || []).map(re => nombresEj(re.ejercicio).grande).join(' · ');
    return (
      <button data-plegado data-circuito-plegado onClick={() => setPlegado(false)} style={{
        ...TARJETA, background: HECHO_FONDO, boxShadow: 'none',
        width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', marginBottom: 10,
      }}>
        <span style={{ width: 26, height: 26, borderRadius: 99, background: GRAFITO, color: AMARILLO, display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Check size={14} weight="bold" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {`${tipo} · ${vueltas.length} ${vueltas.length === 1 ? 'vuelta' : 'vueltas'} · hecho`}
          </span>
          <span style={{ display: 'block', fontSize: 13, color: HECHO_TINTA, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombres}</span>
        </span>
        <span style={{ fontSize: 12.5, color: GRIS, flex: 'none' }}>{`${hechas}/${total}`}</span>
        <CaretDown size={15} color="#C7C7CC" />
      </button>
    );
  }

  if (compacta && cerrado) {
    const nombres = (vueltas[0] || []).map(re => nombresEj(re.ejercicio).grande).join(' · ');
    return (
      <button data-cerrado="1" data-circuito-cerrado onClick={alAbrir} style={{
        ...TARJETA, width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 11, padding: '9px 13px', marginBottom: 8,
      }}>
        <span style={{ width: 30, height: 30, borderRadius: 99, background: SECCION.entreno.tint, color: AZUL_TINTA, display: 'grid', placeItems: 'center', flex: 'none' }}>
          <ArrowsClockwise size={15} weight="bold" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: TEXT }}>{tipo} · {vueltas.length} vueltas</span>
          <span style={{ display: 'block', fontSize: 12.5, color: GRIS, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombres}</span>
        </span>
        <CaretDown size={15} color="#C7C7CC" />
      </button>
    );
  }

  return (
    <div data-circuito data-re-id={tramo.clave} style={{ ...TARJETA, padding: '14px 12px 10px', scrollMarginTop: 96 }}>
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
        {completo && (
          <button data-plegar onClick={() => setPlegado(true)} aria-label="Plegar circuito" style={{
            flex: 'none', width: 32, height: 32, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: CAMPO, color: GRAFITO, display: 'grid', placeItems: 'center',
          }}><CaretUp size={16} weight="bold" /></button>
        )}
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
                // Cada ejercicio del circuito sobre blanco, con un filo suave:
                // sobre crema, los botones y las casillas (grises) se
                // confundían con el fondo y se veían más claros que en Fuerza.
                <div key={re.id} data-ejercicio-circuito style={{ borderRadius: 16, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px #ECEAE4', padding: '10px 10px 9px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Miniatura e={e} ancho={54} alto={42} alTocar={() => setFicha(re)} enVivo={prueba && ahora === `${re.id}:${vi + 1}` && !ficha} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {prueba && ahora === `${re.id}:${vi + 1}` && <span data-ahora-circuito style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: GRAFITO, background: AMARILLO, padding: '2px 8px', borderRadius: 99, marginBottom: 5 }}>AHORA</span>}
                      {/* Vista en prueba: los íconos arriba a la derecha, como en Fuerza. */}
                      {vi === 0 && ligera && prueba && <div data-botones-arriba style={{ float: 'right', margin: '-2px -2px 4px 8px' }}><Botones soloIconos chicos items={botonesDe({
                        sinCarga, onNota: onNota ? () => onNota(re) : null,
                        abrirFicha: () => setFicha(re), abrirRecord: () => setRecord(re), abrirUltima: () => setVerUltima(re),
                      })} /></div>}
                      <Nombres e={e} tam={15} />
                      <div style={{ fontSize: 13, color: '#3A3A3C', fontWeight: 600, marginTop: 3 }}>{textoReps(re)}</div>
                    </div>
                  </div>
                  {vi === 0 && !(ligera && prueba) && (
                    <Botones chico soloIconos={compacta || ligera} items={botonesDe({
                      sinCarga, onNota: onNota ? () => onNota(re) : null,
                      abrirFicha: () => setFicha(re), abrirRecord: () => setRecord(re), abrirUltima: () => setVerUltima(re),
                    })} />
                  )}
                  {!sinCarga && <CabeceraCajitas lado={lado} unidad={unidad} onUnidad={() => onUnidad(re)} soloReps={soloReps} ultima={re.ultima_vez} />}
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
  const cuenta = useContext(CuentaEjercicio);
  // Lo tecleado sin marcar vuelve si la página se recargó a mitad del entreno.
  const idSerie = `${re.id}:${n}`;
  const tecleado = marcada ? null : leerTecleado(idSerie);
  const [reps, setReps] = useState(marcada?.reps != null ? String(marcada.reps) : (tecleado?.reps || ''));
  const [peso, setPeso] = useState(marcada?.peso != null ? String(marcada.peso).replace('.', ',') : (tecleado?.peso || ''));
  useEffect(() => { if (!marcada) guardarTecleado(idSerie, { reps, peso }); }, [reps, peso]);  // eslint-disable-line react-hooks/exhaustive-deps
  const [falta, setFalta] = useState(false);
  // Al marcar: el check «salta», un brillo recorre la fila y vibra corto.
  const [pop, setPop] = useState(0);
  const repsRef = useRef(null);
  const hecha = !!marcada;
  const anterior = sinCarga ? null : textoSerieAnterior(re, n, unidad, soloReps);
  // Escribir no es hacer: con números y sin check la serie sigue «por
  // marcar» (el check gris lo dice; en ámbar parecía hecha) y al terminar la
  // rutina se pregunta por ellas.
  const escrita = !hecha && !sinCarga && !!(String(reps).trim() || String(peso).trim());
  // Un toque en lo de la última vez rellena las cajitas (sin marcar).
  const rellenar = () => {
    const v = valoresSerieAnterior(re, n, unidad);
    if (!v || hecha) return;
    if (v.reps != null) setReps(String(v.reps));
    if (!soloReps && v.peso != null) setPeso(coma(v.peso));
    if (falta) setFalta(false);
    vibrar(8);
  };
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

  // Por tiempo («30 s»): en vez del check, «▶ Empezar 30 s». Arranca la
  // cuenta atrás en la ventanita negra, con pitido al empezar y al terminar,
  // y la serie se marca sola al acabar.
  const segTiempo = sinCarga ? segundosDeTiempo(re.reps) : null;
  if (segTiempo && cuenta && !hecha) {
    const enCurso = cuenta.activa === idSerie;
    return (
      <div data-serie-tiempo={idSerie} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 40, padding: '0 5px 0 14px',
        borderRadius: 14, background: CAMPO, boxSizing: 'border-box',
      }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: '#3A3A3C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {re.series > 1 ? `Serie ${n} · ${textoReps(re)}` : textoReps(re)}
        </span>
        <button data-empezar-tiempo onClick={() => cuenta.empezar(re, n, segTiempo, descansoSeg, unidad)} disabled={enCurso}
          aria-label={enCurso ? `Serie ${n} en curso` : `Empezar ${textoTiempo(segTiempo)}, serie ${n}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999, border: 'none',
          background: GRAFITO, color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: enCurso ? 'default' : 'pointer', fontFamily: 'inherit',
          flex: 'none', opacity: enCurso ? 0.55 : 1,
        }}>
          <Play size={12} weight="fill" /> {enCurso ? 'En curso' : `Empezar ${textoTiempo(segTiempo)}`}
        </button>
      </div>
    );
  }

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

  // Campos grises sin borde (30 px: la tarjeta más baja); al tocarlos, blancos
  // con contorno grafito. Ya
  // marcada, la serie queda en limpio: los números en negrita, sin caja.
  const campo = (malo) => ({
    width: '100%', height: 30, padding: '0 6px', borderRadius: 10, textAlign: 'center', border: 'none',
    background: hecha ? 'transparent' : CAMPO,
    boxShadow: malo ? 'inset 0 0 0 1.5px #D9785F' : 'none',
    fontSize: 16, fontWeight: 700, color: TEXT, outline: 'none', opacity: 1, WebkitTextFillColor: TEXT,
    fontFamily: 'inherit', WebkitAppearance: 'none', boxSizing: 'border-box',
  });

  return (
    <div data-serie={idSerie} data-escrita={escrita ? '1' : undefined} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0',
      borderRadius: 14, position: 'relative', overflow: 'hidden',
    }}>
      {brillo}
      <div style={{ width: 22, flex: 'none', textAlign: 'center', fontSize: 14, fontWeight: 700, color: hecha ? TEXT : '#AEAEB2' }}>{n}</div>
      <div style={CAJA}>
        <input ref={repsRef} inputMode="numeric" value={reps} className="rv2-campo"
          onChange={ev => { setReps(ev.target.value); if (falta) setFalta(false); }}
          aria-label={`Repeticiones serie ${n}`}
          style={campo(falta)} disabled={hecha} />
      </div>
      {!soloReps && (
      <div style={CAJA}>
        <input inputMode="decimal" value={peso} onChange={ev => setPeso(ev.target.value)} className="rv2-campo"
          aria-label={`Peso serie ${n}`} style={campo(false)} disabled={hecha} />
      </div>
      )}
      {/* Lo que hizo en esta serie la última vez, en gris: de recordatorio. */}
      {!sinCarga && hayUltima(re) && (
        anterior && !hecha ? (
          // Con aire a la derecha: el dedo no debe alcanzar el check al tocar el texto.
          <button type="button" data-serie-anterior onClick={(e) => { e.stopPropagation(); rellenar(); }} aria-label={`Usar lo de la última vez en la serie ${n}: ${anterior}`} style={{
            width: ANCHO_ULTIMA, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#AEAEB2',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums',
            border: 0, background: 'none', padding: '6px 10px 6px 0', margin: 0, fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box',
            textDecoration: 'underline dotted', textDecorationColor: '#C7C7CC', textUnderlineOffset: 3,
          }}>{anterior}</button>
        ) : (
          <div data-serie-anterior style={{ width: ANCHO_ULTIMA, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#AEAEB2',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
            {anterior || ''}
          </div>
        )
      )}
      <button key={pop} className={pop && hecha ? 'mt-pop' : undefined} onClick={marcar} aria-label={hecha ? `Deshacer serie ${n}` : `Marcar serie ${n}`}
        title={escrita ? 'Falta marcar esta serie' : undefined} style={{
        flex: 'none', width: 32, height: 32, borderRadius: 99, cursor: 'pointer', border: 'none',
        background: hecha ? GRAFITO : '#FFFFFF', boxShadow: hecha ? 'none' : 'inset 0 0 0 1.6px #D1D1D6',
        color: hecha ? AMARILLO : '#C7C7CC', display: 'grid', placeItems: 'center',
      }}><Check size={16} weight="bold" /></button>
    </div>
  );
}

// La primera vez con los botones en ícono: una nota corta que dice qué es
// cada uno. Se cierra con «Entendido» y no vuelve a salir.
const CLAVE_TIP_ICONOS = 'mt:tipIconosRutina';
export function TipIconos() {
  const [visto, setVisto] = useState(() => { try { return !!localStorage.getItem(CLAVE_TIP_ICONOS); } catch (e) { return true; } });
  if (visto) return null;
  const cerrar = () => { try { localStorage.setItem(CLAVE_TIP_ICONOS, '1'); } catch (e) { /* nada */ } setVisto(true); };
  const item = (Icono, texto) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 650, color: TEXT }}>
      <span style={{ width: 28, height: 28, borderRadius: 99, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 3px 10px rgba(30,40,60,0.09)', display: 'grid', placeItems: 'center' }}><Icono size={14} color={GRAFITO} /></span>
      {texto}
    </span>
  );
  return (
    <div data-tip-iconos style={{ ...TARJETA, background: '#F6F6F8', boxShadow: 'none', padding: '11px 13px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px' }}>
      {item(Info, 'Ficha')}{item(ClockCounterClockwise, 'Historial')}{item(ChatCircleText, 'Nota al coach')}
      <button onClick={cerrar} data-tip-entendido style={{ marginLeft: 'auto', border: 'none', borderRadius: 99, padding: '7px 13px', background: GRAFITO, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Entendido</button>
    </div>
  );
}
