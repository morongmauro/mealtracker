// ─────────────────────────────────────────────────────────────────────────
// APRENDIZAJE · «Hoy» (visual nueva)
//
// Lo mismo que Hoy de alimentación y de entrenamiento, en el naranja de la
// sección: la cabecera con la voz del coach, lo próximo por leer, ver o
// escuchar según lo que ya vio, su avance y los accesos a cada parte del
// centro. Íconos de línea, tarjetas blancas y la letra de la marca. Tocar una
// pieza la abre en el centro.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { CaretRight, Compass, Cards, BookOpenText, Headphones, PlayCircle } from '@phosphor-icons/react';
import CabeceraHoy from './CabeceraHoy.jsx';
import { IlustracionCerebro } from './IlustracionesHoy.jsx';
import { AnilloMarca } from './GraficasV2.jsx';
import { vozAprende } from './vozCoach.js';
import Firma from './Firma.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT, SECCION } from './theme.js';
import { recomendarAprendizaje, leerAprendizajeConCache, avanceGuardado } from './aprendizaje.js';

const N = SECCION.aprende;          // { base, ink, tint }
const CREMA = '#F4F1EB';
const SOMBRA = '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)';
const ICONO = { hub: Compass, capsula: Cards, guia: BookOpenText, podcast: Headphones };
const hoyIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function AprendeHoy({ nombre, alAbrir, arriba }) {
  const [avance, setAvance] = useState(() => avanceGuardado(nombre));   // undefined = cargando
  useEffect(() => {
    let vivo = true;
    leerAprendizajeConCache(nombre).then(r => { if (vivo) setAvance(r); });
    return () => { vivo = false; };
  }, [nombre]);
  const recs = useMemo(() => recomendarAprendizaje(avance, 4), [avance]);
  const bloque = (k) => avance?.bloques?.find(b => b.k === k);

  return (
    <div data-aprende-hoy style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px', paddingTop: arriba, paddingBottom: 'calc(104px + env(safe-area-inset-bottom, 0px))' }}>
      <CabeceraHoy tema="aprende" voz={vozAprende({ hoy: hoyIso(), avance, quedan: recs.length })} arriba={arriba} />

      <h2 style={titulo}>Recomendado para ti</h2>
      {avance === undefined ? (
        <Esqueleto />
      ) : avance === null ? (
        <div style={{ ...tarjeta, fontSize: 15, color: TEXT_MUTED, lineHeight: 1.45 }}>
          No pude traer tu avance ahora. Igual puedes abrir el centro y seguir leyendo.
          <button onClick={() => alAbrir('onboarding')} style={{ ...botonLinea, marginTop: 12 }}>Abrir el centro</button>
        </div>
      ) : !recs.length ? (
        // Un momento para celebrar: aquí sí sale el personaje.
        <div data-todo-visto style={{ ...tarjeta, textAlign: 'center', padding: '8px 18px 20px' }}>
          <div style={{ width: 200, height: 124, margin: '0 auto' }}><IlustracionCerebro /></div>
          <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', marginTop: 4 }}>Ya viste todo el material</div>
          <div style={{ fontSize: 14.5, color: TEXT_MUTED, lineHeight: 1.45, marginTop: 4 }}>Cuando publique algo nuevo, aparece aquí primero.</div>
        </div>
      ) : (
        <>
          <button data-proximo onClick={() => alAbrir(recs[0].destino)} style={{
            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: N.base, color: '#fff', borderRadius: 20, padding: '16px 18px',
            boxShadow: '0 8px 22px rgba(238,132,52,0.28)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{recs[0].bloqueTitulo} · {recs[0].motivo}</div>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 3, lineHeight: 1.2 }}>{recs[0].title}</div>
            <div style={{ fontSize: 14, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.95 }}>
              <PlayCircle size={18} /> Toca para empezar
            </div>
          </button>
          {recs.length > 1 && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_MUTED, margin: '18px 2px 8px' }}>Después</div>
              <div data-despues style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recs.slice(1).map(r => {
                  const Icono = ICONO[r.bloque] || BookOpenText;
                  return (
                    <button key={r.bloque + r.id} onClick={() => alAbrir(r.destino)} style={fila}>
                      <span style={circulo}><Icono size={20} color={N.ink} /></span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>{r.title}</span>
                        <span style={{ display: 'block', fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>{r.bloqueTitulo} · {r.motivo}</span>
                      </span>
                      <CaretRight size={18} color={TEXT_LIGHT} />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {avance && (
        <>
          <Separador />
          <h2 style={titulo}>Tu avance</h2>
          <div data-avance style={{ ...tarjeta, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Anillo pct={avance.pct} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: TEXT_MUTED }}>{avance.vistas} de {avance.total} piezas vistas</div>
              {avance.bloques.map(b => (
                <div key={b.k} style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: TEXT }}>
                    <span style={{ fontWeight: 600 }}>{b.titulo}</span>
                    <span style={{ color: TEXT_MUTED, fontVariantNumeric: 'tabular-nums' }}>{b.vistas}/{b.total}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: CREMA, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${b.total ? (b.vistas / b.total) * 100 : 0}%`, height: '100%', borderRadius: 99, background: N.base }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separador />
      <h2 style={titulo}>Explora</h2>
      <div data-explora style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['onboarding', 'Onboarding', 'hub', 'onboarding'],
          ['capsulas', 'Cápsulas', 'capsula', 'capsulas'],
          ['guia', 'Guía de alimentación', 'guia', 'guia'],
          ['podcast', 'Podcast', 'podcast', 'podcast'],
        ].map(([k, t, bk, destino]) => {
          const Icono = ICONO[bk];
          const b = bloque(bk);
          return (
            <button key={k} onClick={() => alAbrir(destino)} style={botonCuadro}>
              <span style={circulo}><Icono size={20} color={N.ink} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>{t}</span>
                {b && <span style={{ display: 'block', fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{b.vistas} de {b.total}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <Firma style={{ marginTop: 28 }} />
    </div>
  );
}

function Anillo({ pct, tam = 104, grosor = 10 }) {
  return (
    <AnilloMarca frac={(pct || 0) / 100} color={N.base} tam={tam} grosor={grosor} riel={CREMA} etiqueta={`${pct} % completado`}>
      <div style={{ fontSize: 24, fontWeight: 800, color: TEXT, lineHeight: 1, letterSpacing: '-0.02em' }}>{pct}%</div>
      <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3, fontWeight: 600 }}>completado</div>
    </AnilloMarca>
  );
}

// Mientras llega el avance: la forma de lo que viene, sin «cargando».
function Esqueleto() {
  const caja = (h, extra = {}) => <div style={{ height: h, borderRadius: 18, background: '#E9E5DD', ...extra }} />;
  return (
    <div data-esqueleto style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.7 }}>
      {caja(110, { borderRadius: 20 })}
      {caja(62)}
      {caja(62)}
    </div>
  );
}

const Separador = () => <div style={{ height: 1, background: 'rgba(31,31,31,0.09)', margin: '26px 2px 16px' }} />;
const titulo = { fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', margin: '4px 2px 12px' };
const tarjeta = { background: '#FFFFFF', borderRadius: 20, padding: '16px 16px', boxShadow: SOMBRA };
const fila = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: '#FFFFFF', borderRadius: 18, padding: '12px 14px', boxShadow: SOMBRA };
const circulo = { width: 40, height: 40, borderRadius: 99, background: N.tint, display: 'grid', placeItems: 'center', flex: 'none' };
const botonCuadro = { display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: '#FFFFFF', borderRadius: 18, padding: '12px 12px', boxShadow: SOMBRA, minWidth: 0 };
const botonLinea = { display: 'inline-flex', alignItems: 'center', gap: 6, border: `1.5px solid ${N.base}`, background: '#fff', color: N.ink, borderRadius: 12, padding: '9px 14px', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' };
