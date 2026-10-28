// ─────────────────────────────────────────────────────────────────────────
// EL DÍA POR COMIDAS · Hoy de Alimentación (visual nueva)
//
// El día ya viene armado en sus cuatro momentos: Desayuno, Almuerzo, Cena y
// Snacks. Así la pantalla nunca se ve vacía: es una lista para llenar. Cada
// «+» abre el chat con la comida ya puesta («Almuerzo: …»); lo registrado
// aparece debajo de su momento con sus alimentos, calorías y macros. Al
// final, el atajo para dictar todo el día de una vez.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Sun, SunHorizon, Moon, Cookie, Plus, Microphone, PencilSimple } from '@phosphor-icons/react';
import { TEXT, TEXT_MUTED, TEXT_LIGHT, C_PROTEIN, C_CARBS_TEXTO, C_FAT } from './theme.js';
import { enPrueba } from './vistaApp.js';

export const MOMENTOS = [
  { k: 'desayuno', nombre: 'Desayuno', Icono: Sun },
  { k: 'almuerzo', nombre: 'Almuerzo', Icono: SunHorizon },
  { k: 'cena', nombre: 'Cena', Icono: Moon },
  { k: 'snack', nombre: 'Snacks', Icono: Cookie },
];
const VERDE = '#2F7F45';
const fmt1 = (n) => { const v = Math.round((Number(n) || 0) * 10) / 10; return Number.isInteger(v) ? String(v) : String(v).replace('.', ','); };
export const momentoDe = (meal) => {
  const m = String(meal || '').toLowerCase();
  if (/desayun/.test(m)) return 'desayuno';
  if (/almuerz|comida|lunch/.test(m)) return 'almuerzo';
  if (/cena|dinner/.test(m)) return 'cena';
  if (/snack|merienda|onces|colaci/.test(m)) return 'snack';
  return null;
};

const TARJETA = { background: '#FFFFFF', borderRadius: 20, boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)' };

// Lo registrado en un momento: sus alimentos en filas cortas y los macros.
function Registro({ e }) {
  return (
    <div data-comida-hoy style={{ background: '#F7F6F1', borderRadius: 14, padding: '9px 11px 8px', margin: '2px 0 8px 46px', lineHeight: 1.25 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {e.time && <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_LIGHT }}>{e.time}</span>}
        <span style={{ flex: 1 }} />
        <span className="num" style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{Math.round(e.kcal)} <span style={{ fontSize: 11.5, color: TEXT_MUTED }}>kcal</span></span>
      </div>
      {(e.items || []).map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 0', borderTop: i ? '1px solid #ECEAE3' : 0 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: TEXT }}>{it.name}{it.amount ? <span style={{ fontWeight: 500, color: TEXT_MUTED }}> · {it.amount}</span> : null}</span>
          <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: TEXT_MUTED, flex: 'none' }}>{Math.round(it.kcal || 0)} kcal</span>
        </div>
      ))}
      <div className="num" style={{ display: 'flex', gap: 10, fontSize: 11.5, fontWeight: 700, marginTop: 4 }}>
        <span style={{ color: C_PROTEIN }}>P {fmt1(e.p)}g</span><span style={{ color: C_CARBS_TEXTO }}>C {fmt1(e.c)}g</span><span style={{ color: C_FAT }}>G {fmt1(e.g)}g</span>
      </div>
    </div>
  );
}

export default function DiaComidas({ entries = [], alAgregar, alDictar, debajo = null }) {
  const por = { desayuno: [], almuerzo: [], cena: [], snack: [] };
  const otras = [];
  entries.forEach(e => { const k = momentoDe(e.meal); if (k) por[k].push(e); else otras.push(e); });
  // El primer momento sin nada es el que invita: «Toca + para registrarlo».
  const primeroVacio = MOMENTOS.find(m => !por[m.k].length);
  // Vista en prueba: lo que toca registrar ahora es la protagonista, arriba,
  // con el dictado a mano; el atajo de abajo ya no hace falta.
  const prota = enPrueba() && primeroVacio;
  // Vista en prueba (maqueta A): una sola caja. La pregunta de lo que toca
  // va arriba; abajo solo sale lo que YA registró (sin filas vacías que
  // repitan la invitación). Sin nada registrado, no hay lista.
  const soloRegistrado = enPrueba();
  const momentosLista = soloRegistrado ? MOMENTOS.filter(m => por[m.k].length) : MOMENTOS;
  const hayLista = momentosLista.length > 0 || otras.length > 0;
  const PREGUNTA = { desayuno: '¿Qué desayunaste?', almuerzo: '¿Qué almorzaste?', cena: '¿Qué cenaste?', snack: '¿Comiste algo entre comidas?' };
  return (
    <div data-dia-comidas>
      {prota && (
        <div data-prota-comida style={{ ...TARJETA, borderRadius: 26, padding: 18, marginTop: 14, boxShadow: '0 2px 4px rgba(20,20,30,.04), 0 18px 40px rgba(20,30,60,.10)' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>{PREGUNTA[primeroVacio.k]}</div>
          <div style={{ fontSize: 14.5, color: TEXT_MUTED, fontWeight: 500, margin: '4px 0 16px' }}>Dímelo o escríbelo, en una frase.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" data-prota-dictar onClick={alDictar} style={{ flex: 1, height: 52, border: 'none', borderRadius: 999, background: '#F1F2F4', color: TEXT, fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Microphone size={19} weight="fill" />Dictar</button>
            {/* Escribir (verde, el principal) abre el chat con el teclado listo y el
                momento puesto; Dictar abre el chat con el micrófono ya prendido. */}
            <button type="button" data-prota-escribir onClick={() => alAgregar && alAgregar(primeroVacio)} aria-label={`Escribir ${primeroVacio.nombre.toLowerCase()}`} style={{ flex: 1, height: 52, border: 'none', borderRadius: 999,
              background: '#46965A', color: '#fff', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><PencilSimple size={18} weight="bold" />Escribir</button>
          </div>
        </div>
      )}
      {/* Lo que va justo debajo de la pregunta (la invitación al recetario). */}
      {debajo}
      {hayLista && <h2 data-titulo-comidas style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', margin: '18px 2px 10px' }}>{soloRegistrado ? 'Lo que llevas hoy' : 'Lo que comiste hoy'}</h2>}
      {hayLista && <div style={{ ...TARJETA, padding: '6px 14px 6px' }}>
        {momentosLista.map((m, i) => {
          const lista = por[m.k];
          const kcal = lista.reduce((a, e) => a + (Number(e.kcal) || 0), 0);
          return (
            <div key={m.k} data-momento={m.k} data-registrado={lista.length ? '1' : undefined} style={{ borderTop: i ? '1px solid #F0EEE8' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', background: lista.length ? 'rgba(70,150,90,0.14)' : '#F2F1EC', color: lista.length ? VERDE : '#8E8E93' }}>
                  <m.Icono size={18} weight={lista.length ? 'fill' : 'regular'} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 750, color: TEXT, letterSpacing: '-0.01em' }}>{m.nombre}</div>
                  <div style={{ fontSize: 12.5, color: lista.length ? TEXT_MUTED : TEXT_LIGHT, marginTop: 1 }}>
                    {lista.length ? <span className="num"><b style={{ color: TEXT, fontWeight: 700 }}>{Math.round(kcal)} kcal</b></span>
                      : primeroVacio && primeroVacio.k === m.k ? 'Toca + para registrarlo' : '—'}
                  </div>
                </div>
                {/* Se ve un círculo de 34 px; se toca en 44 (lo que pide Apple). */}
                <button type="button" data-agregar-momento={m.k} onClick={() => alAgregar && alAgregar(m)} aria-label={`Registrar ${m.nombre.toLowerCase()}`}
                  style={{ width: 44, height: 44, margin: -5, borderRadius: 99, flex: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', background: 'none', padding: 0, color: TEXT }}>
                  <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 99, display: 'grid', placeItems: 'center', background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.6px #D1D1D6' }}>
                    <Plus size={16} weight="bold" />
                  </span>
                </button>
              </div>
              {lista.map(e => <Registro key={e.id} e={e} />)}
            </div>
          );
        })}
        {otras.length > 0 && (
          <div data-momento="otras" style={{ borderTop: '1px solid #F0EEE8', padding: '10px 0 2px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MUTED, marginBottom: 6 }}>Otras comidas</div>
            {otras.map(e => <div key={e.id} style={{ marginLeft: -46 }}><Registro e={e} /></div>)}
          </div>
        )}
      </div>}
      {!prota && <button type="button" data-dictar-dia onClick={alDictar} style={{ ...TARJETA, width: '100%', marginTop: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px 12px 16px' }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 750, color: TEXT }}>¿Más rápido?</span>
          <span style={{ display: 'block', fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>Dicta todo tu día de una vez.</span>
        </span>
        <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 99, background: TEXT, color: '#FFFFFF', display: 'grid', placeItems: 'center', flex: 'none', boxShadow: '0 8px 18px rgba(0,0,0,0.18)' }}>
          <Microphone size={21} weight="fill" />
        </span>
      </button>}
    </div>
  );
}
