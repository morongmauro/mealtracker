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
// Las repeticiones se muestran como las recetó el coach (6-12, 15, 30 s) y la
// cajita de reps va VACÍA: rellenarla con un número inventado confundía. El
// peso sí se sugiere con el de la última vez, en gris, y si se marca sin
// escribirlo se usa ese.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Play, Check, CaretDown, Fire, Barbell, Wind, Trophy, FilmStrip, ChatCircleText } from '@phosphor-icons/react';
import EntrenoFicha, { HojaRecord } from './EntrenoFicha.jsx';
import { miniatura, numero, convertir } from './entrenoDatos.js';
import { nombresEj } from './v2.js';
import { SURFACE, TEXT, TEXT_MUTED, TEXT_LIGHT, BORDER, SECCION } from './theme.js';

const AZUL = SECCION.entreno.base;
const AZUL_TINTA = SECCION.entreno.ink;
const CREMA = '#F4F1EB';
const TARJETA = {
  background: SURFACE, borderRadius: 18, marginBottom: 10,
  boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 18px rgba(60,60,40,0.06)',
};

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

const MOMENTO = {
  calentamiento: { titulo: 'Calentamiento y movilidad', bajada: 'Cardio suave, movilidad y activación', Icono: Fire },
  fuerza:        { titulo: 'Fuerza', bajada: 'El trabajo principal', Icono: Barbell },
  enfriamiento:  { titulo: 'Enfriamiento', bajada: 'Cardio de cierre y estiramientos', Icono: Wind },
};

export function SeparadorMomento({ fase, hechos, total }) {
  const m = MOMENTO[fase];
  if (!m) return null;
  const listo = total > 0 && hechos >= total;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 2px 10px' }}>
      <span style={{
        width: 34, height: 34, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center',
        background: listo ? AZUL : SECCION.entreno.tint, color: listo ? '#fff' : AZUL_TINTA,
      }}>{listo ? <Check size={17} weight="bold" /> : <m.Icono size={18} weight="fill" />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 750, color: TEXT, letterSpacing: '-0.015em' }}>{m.titulo}</div>
        <div style={{ fontSize: 13, color: TEXT_MUTED }}>{m.bajada}</div>
      </div>
      {total > 0 && (
        <div style={{ fontSize: 13, color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{hechos}/{total}</div>
      )}
    </div>
  );
}

// ── Un ejercicio ──────────────────────────────────────────────────────────
const boton = {
  display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 11px',
  borderRadius: 999, border: 'none', background: CREMA, color: TEXT, cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 650,
};

// Lo que no lleva carga (cardio, movilidad, estiramientos) no pide reps ni
// kilos: se marca hecho y ya. Menos cajitas, menos pantalla.
export const SIN_CARGA = new Set(['cardio', 'movilidad', 'estiramiento_pasivo', 'estiramiento', 'agilidad']);

const coma = (x) => String(x).replace('.', ',');
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso) => { const [, m, d] = String(iso || '').slice(0, 10).split('-').map(Number); return m ? `${d} ${MESES[m - 1]}` : ''; };

// «Última vez» en una línea corta: «8 · 8 · 7 reps × 71,25 kg» si todas las
// series fueron con el mismo peso; si no, «8 × 70 · 8 × 72,5 kg».
export function textoUltima(series) {
  const ok = (series || []).filter(s => s.reps != null || s.peso);
  if (!ok.length) return '';
  const u = ok[0].unidad || 'kg';
  const mismo = ok.every(s => String(s.peso || '') === String(ok[0].peso || '') && (s.unidad || 'kg') === u);
  if (mismo) {
    const reps = ok.map(s => (s.reps != null ? s.reps : '—')).join(' · ');
    return ok[0].peso ? `${reps} reps × ${coma(ok[0].peso)} ${u}` : `${reps} reps`;
  }
  return ok.map(s => (s.peso ? `${s.reps ?? '—'} × ${coma(s.peso)}` : `${s.reps ?? '—'}`)).join(' · ') + ` ${u}`;
}

export function EjercicioV2({ re, marcadas, onMarcar, onDesmarcar, serieUnica = null, compacto = false,
                             descansoCircuito, unidad = 'kg', onUnidad, onNota }) {
  const e = re.ejercicio;
  const n = nombresEj(e);
  const [ficha, setFicha] = useState(false);
  const [record, setRecord] = useState(false);
  const series = serieUnica != null
    ? [serieUnica]
    : Array.from({ length: Math.max(1, re.series || 1) }, (_, i) => i + 1);
  const ultima = re.ultima_vez;
  const sinCarga = SIN_CARGA.has(e?.tipo);
  const completo = series.every(s => marcadas[`${re.id}:${s}`]);

  // Terminado → se pliega solo. Se puede volver a abrir con un toque.
  const [plegado, setPlegado] = useState(completo);
  const antes = useRef(completo);
  useEffect(() => {
    if (completo && !antes.current) setPlegado(true);
    if (!completo) setPlegado(false);
    antes.current = completo;
  }, [completo]);

  const filas = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {series.map(s => {
        const previa = (ultima?.series || []).find(x => x.serie === s) || null;
        const pesoPrevio = previa && previa.peso
          ? convertir(previa.peso, previa.unidad || 'kg', unidad)
          : (ultima && ultima.mejor_peso ? convertir(ultima.mejor_peso, ultima.unidad || 'kg', unidad) : null);
        return (
          <SerieFilaV2 key={s} n={s} re={re} unidad={unidad} sinCarga={sinCarga}
            marcada={marcadas[`${re.id}:${s}`]}
            rango={re.reps} pesoPrevio={pesoPrevio}
            descansoSeg={descansoCircuito !== undefined ? descansoCircuito : (s < (re.series || 1) ? re.descanso_seg : null)}
            onMarcar={onMarcar} onDesmarcar={onDesmarcar} />
        );
      })}
    </div>
  );

  if (plegado) {
    return (
      <button onClick={() => setPlegado(false)} style={{
        ...TARJETA, width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 8,
      }}>
        <span style={{ width: 24, height: 24, borderRadius: 99, background: AZUL, color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Check size={14} weight="bold" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.grande}</span>
          {n.chico && <span style={{ display: 'block', fontSize: 12, color: TEXT_LIGHT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.chico}</span>}
        </span>
        <span style={{ fontSize: 12.5, color: TEXT_MUTED, flex: 'none' }}>{series.length === 1 && serieUnica != null ? 'Hecho' : `${series.length}/${series.length}`}</span>
        <CaretDown size={15} color={TEXT_LIGHT} />
      </button>
    );
  }

  // Vueltas 2 y siguientes de un circuito: solo el nombre y su fila.
  if (compacto) {
    return (
      <div style={{ ...TARJETA, padding: '10px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {n.grande} <span style={{ fontSize: 12.5, fontWeight: 500, color: TEXT_LIGHT }}>· {re.reps}</span>
        </div>
        {filas}
      </div>
    );
  }

  const thumb = miniatura(e);
  return (
    <div style={{ ...TARJETA, padding: '12px 12px 12px' }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <button onClick={() => setFicha(true)} aria-label={`Ver ${n.grande}`} style={{
          flex: 'none', width: 60, height: 46, borderRadius: 11, overflow: 'hidden', border: 'none', padding: 0,
          cursor: 'pointer', background: CREMA, position: 'relative', display: 'block',
        }}>
          {thumb
            ? <img src={thumb} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: TEXT_LIGHT }}><Barbell size={20} /></span>}
          {thumb && (
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(20,20,18,0.18)' }}>
              <Play size={14} weight="fill" color="#fff" />
            </span>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 750, color: TEXT, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{n.grande}</div>
          {n.chico && <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 1 }}>{n.chico}</div>}
          <div style={{ fontSize: 13, color: AZUL_TINTA, fontWeight: 650, marginTop: 3 }}>
            {serieUnica != null ? re.reps : `${re.series} × ${re.reps}`}
            {re.peso_objetivo ? ` · ${re.peso_objetivo}` : ''}
            {re.rir != null ? ` · RIR ${re.rir}` : ''}
            {serieUnica == null && re.descanso_seg ? <span style={{ color: TEXT_MUTED, fontWeight: 500 }}> · descanso {re.descanso_seg} s</span> : null}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
        <button onClick={() => setFicha(true)} style={boton}><FilmStrip size={15} /> Ficha</button>
        {ultima && <button onClick={() => setRecord(true)} style={boton}><Trophy size={15} /> Tu récord</button>}
        {onNota && <button onClick={onNota} style={boton}><ChatCircleText size={15} /> Nota</button>}
      </div>

      {re.notas && (
        <div style={{ marginTop: 9, padding: '8px 11px', borderRadius: 11, background: '#FFF6E0', fontSize: 12.5, color: '#6B4E05', lineHeight: 1.45 }}>
          <b>De tu coach:</b> {re.notas}
        </div>
      )}

      {/* Lo de la última vez, dicho en claro. */}
      {!sinCarga && ultima && ultima.series.length > 0 && (
        <div style={{ marginTop: 9, fontSize: 12.5, color: TEXT_MUTED, lineHeight: 1.45 }}>
          <span style={{ fontWeight: 700, color: TEXT }}>Última vez</span>
          <span style={{ color: TEXT_LIGHT }}> · {fechaCorta(ultima.fecha)}</span><br />
          <span style={{ fontWeight: 650, color: TEXT }}>{textoUltima(ultima.series)}</span>
        </div>
      )}

      {sinCarga ? <div style={{ height: 8 }} /> : <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4,
        fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, letterSpacing: '.02em',
      }}>
        <div style={{ width: 22, flex: 'none' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>Reps</div>
        <div style={{ width: 10, flex: 'none' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <button onClick={onUnidad} aria-label={`Cambiar a ${unidad === 'kg' ? 'libras' : 'kilos'}`} style={{
            border: `1px solid ${BORDER}`, background: 'transparent', borderRadius: 999, padding: '0 8px',
            height: 20, fontSize: 11, fontWeight: 700, color: AZUL_TINTA, cursor: 'pointer', fontFamily: 'inherit',
          }}>{unidad} ⇄</button>
        </div>
        <div style={{ width: 34, flex: 'none' }} />
      </div>}
      {filas}

      <EntrenoFicha item={re} abierto={ficha} alCerrar={() => setFicha(false)} />
      <HojaRecord item={re} abierto={record} alCerrar={() => setRecord(false)} />
    </div>
  );
}

function SerieFilaV2({ n, re, marcada, rango, pesoPrevio, descansoSeg, unidad, onMarcar, onDesmarcar, sinCarga }) {
  const [reps, setReps] = useState(marcada?.reps != null ? String(marcada.reps) : '');
  const [peso, setPeso] = useState(marcada?.peso != null ? String(marcada.peso).replace('.', ',') : '');
  const [falta, setFalta] = useState(false);
  const repsRef = useRef(null);
  const hecha = !!marcada;

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
      return;
    }
    const r = numero(reps);
    // Sin reps no se marca: no se inventa un número. Se lleva el dedo a la cajita.
    if (r == null) { setFalta(true); repsRef.current && repsRef.current.focus(); return; }
    setFalta(false);
    const p = numero(peso);
    onMarcar(re, n, r, p != null ? p : (pesoPrevio != null ? pesoPrevio : null), descansoSeg, unidad);
  };

  const campo = (malo) => ({
    width: '100%', height: 36, padding: '0 6px', borderRadius: 10, textAlign: 'center',
    border: `1px solid ${malo ? '#D9785F' : hecha ? 'transparent' : '#E4E0D5'}`,
    background: hecha ? 'transparent' : '#FBFAF7',
    fontSize: 15, fontWeight: 650, color: TEXT, outline: 'none',
    fontFamily: 'inherit', WebkitAppearance: 'none', boxSizing: 'border-box',
  });

  if (sinCarga) {
    return (
      <button onClick={marcar} aria-label={hecha ? `Deshacer serie ${n}` : `Marcar serie ${n}`} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', height: 38, padding: '0 6px 0 12px',
        borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        border: hecha ? '1px solid transparent' : '1px solid #E4E0D5',
        background: hecha ? SECCION.entreno.tint : '#FBFAF7',
      }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 650, color: hecha ? AZUL_TINTA : TEXT_MUTED }}>
          {hecha ? 'Hecho' : (re.series > 1 ? `Serie ${n} · ${re.reps}` : re.reps || 'Marcar hecho')}
        </span>
        <span style={{
          width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none',
          background: hecha ? AZUL : 'transparent', border: hecha ? 0 : '1px solid #E4E0D5', color: hecha ? '#fff' : TEXT_LIGHT,
        }}><Check size={15} weight={hecha ? 'bold' : 'regular'} /></span>
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: hecha ? SECCION.entreno.tint : 'transparent', borderRadius: 12, padding: hecha ? '0 2px' : 0,
    }}>
      <div style={{ width: 22, flex: 'none', textAlign: 'center', fontSize: 12.5, fontWeight: 750, color: hecha ? AZUL_TINTA : TEXT_LIGHT }}>{n}</div>
      <div style={{ flex: 1 }}>
        <input ref={repsRef} inputMode="numeric" value={reps}
          onChange={ev => { setReps(ev.target.value); if (falta) setFalta(false); }}
          placeholder={rango ? String(rango) : 'reps'} aria-label={`Repeticiones serie ${n}`}
          style={campo(falta)} disabled={hecha} />
      </div>
      <div style={{ width: 10, flex: 'none', textAlign: 'center', fontSize: 12, color: TEXT_LIGHT }}>×</div>
      <div style={{ flex: 1 }}>
        <input inputMode="decimal" value={peso} onChange={ev => setPeso(ev.target.value)}
          placeholder={pesoPrevio != null ? String(pesoPrevio).replace('.', ',') : unidad}
          aria-label={`Peso serie ${n}`} style={campo(false)} disabled={hecha} />
      </div>
      <button onClick={marcar} aria-label={hecha ? `Deshacer serie ${n}` : `Marcar serie ${n}`} style={{
        flex: 'none', width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
        border: hecha ? 0 : '1px solid #E4E0D5', background: hecha ? AZUL : 'transparent',
        color: hecha ? '#fff' : TEXT_LIGHT, display: 'grid', placeItems: 'center',
      }}><Check size={16} weight={hecha ? 'bold' : 'regular'} /></button>
    </div>
  );
}
