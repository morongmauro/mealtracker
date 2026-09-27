// ─────────────────────────────────────────────────────────────────────────
// FICHA DEL EJERCICIO
//
// Se abre al tocar un ejercicio en la rutina. Tres cosas, en este orden:
//
//   1. El VIDEO. Es lo primero que se busca: "¿cómo era este?". Hasta que no
//      se toca no se carga el iframe de YouTube — una rutina de diez
//      ejercicios cargaría diez reproductores y el teléfono se arrastra.
//   2. CÓMO SE HACE: la descripción y las claves técnicas.
//   3. QUÉ TRABAJA: el dibujo del cuerpo al lado, porque la gente quiere
//      aprender qué está entrenando y una lista de nombres no lo enseña.
//
// Las CARACTERÍSTICAS (patrón, segmento, equipo, nivel) van plegadas: le
// importan al coach más que al cliente, pero el que quiera saberlas las
// tiene a un toque.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Hoja, Chip, Card, TEXT, TEXT_MUTED, TEXT_LIGHT, SURFACE_2, BORDER_SOFT, ACCENT_DARK } from './entrenoUI.jsx';
import FiguraMusculos from './FiguraMusculos.jsx';
import { v2Activa, nombresEj } from './v2.js';
import { MUSCULO_POR_SLUG } from './musculos.js';
import { LABEL } from './taxonomia.js';
import { miniatura, urlVideo, fechaLarga } from './entrenoDatos.js';

export default function Ejercicio({ item, abierto, alCerrar }) {
  const [verVideo, setVerVideo] = useState(false);
  // Visual nueva: las características se ven de entrada (no hay que buscarlas).
  const [verCaracs, setVerCaracs] = useState(v2Activa());

  // El componente se desmonta al cerrar, pero por si acaso: cambiar de
  // ejercicio con el video abierto no debe heredar el reproductor anterior.
  React.useEffect(() => { setVerVideo(false); setVerCaracs(v2Activa()); }, [item?.ejercicio?.id]);

  const e = item?.ejercicio;
  if (!e) return null;

  const thumb = miniatura(e);
  const video = urlVideo(e);
  const claves = e.claves_tecnicas || [];
  const caracs = [
    ['Patrón', LABEL.patron[e.patron]],
    ['Segmento', LABEL.segmento[e.segmento]],
    ['Tipo', LABEL.tipo[e.tipo]],
    ['Nivel', LABEL.nivel[e.nivel]],
    ['Equipo', (e.equipo || []).map(x => LABEL.equipo[x] || x).join(', ')],
    ['Unilateral', e.unilateral ? 'Sí, un lado a la vez' : null],
  ].filter(([, v]) => v);

  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo={nombresEj(e).grande}>
      {nombresEj(e).chico && (
        <div style={{ fontSize: 13, color: TEXT_LIGHT, margin: '-6px 0 12px' }}>{nombresEj(e).chico}</div>
      )}
      {/* ── 1. El video ── */}
      {video && !verVideo && (
        <button onClick={() => setVerVideo(true)} style={{
          position: 'relative', width: '100%', padding: 0, border: 'none',
          borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
          background: SURFACE_2, aspectRatio: '16 / 9', display: 'block',
        }}>
          {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(31,31,31,0.28)',
          }}>
            <span style={{
              width: 56, height: 56, borderRadius: 999, background: 'rgba(255,255,255,0.94)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: TEXT, paddingLeft: 4,
            }}>▶</span>
          </span>
        </button>
      )}
      {video && verVideo && (
        <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '16 / 9', background: '#000' }}>
          <iframe src={`${video}&autoplay=1`} title={e.nombre} allowFullScreen
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      )}
      {!video && (
        <div style={{
          borderRadius: 14, background: SURFACE_2, padding: '22px 16px',
          textAlign: 'center', color: TEXT_LIGHT, fontSize: 13,
        }}>
          Este ejercicio todavía no tiene video.
        </div>
      )}

      {/* ── La prescripción de HOY ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0 4px' }}>
        <Chip tono="marca">{item.series} × {item.reps || '—'}</Chip>
        {item.peso_objetivo && <Chip>{item.peso_objetivo}</Chip>}
        {item.descanso_seg != null && <Chip>{item.descanso_seg}s descanso</Chip>}
        {item.rir != null && <Chip>RIR {item.rir}</Chip>}
        {item.tempo && <Chip>Tempo {item.tempo}</Chip>}
      </div>
      {item.notas && (
        <div style={{
          fontSize: 13.5, lineHeight: 1.55, color: ACCENT_DARK, marginTop: 8,
          background: '#F1F3E5', borderRadius: 12, padding: '10px 12px',
        }}>
          <b>De tu coach:</b> {item.notas}
        </div>
      )}

      {/* ── 2 y 3: cómo se hace, y qué trabaja al lado ──
          Con la visual nueva no va el «cómo se hace»: el video ya lo enseña,
          y el texto alargaba la ficha sin aportar. */}
      {!v2Activa() && (
      <div style={{ display: 'flex', gap: 14, marginTop: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <Rotulo>Cómo se hace</Rotulo>
          {e.descripcion
            ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: TEXT, whiteSpace: 'pre-line' }}>{e.descripcion}</p>
            : <p style={{ margin: 0, fontSize: 13.5, color: TEXT_LIGHT }}>
                Tu coach aún no escribió las indicaciones. Mira el video, y si tienes dudas pregúntale.
              </p>}

          {claves.length > 0 && (
            <>
              <Rotulo style={{ marginTop: 16 }}>Claves</Rotulo>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: TEXT }}>
                {claves.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </>
          )}
        </div>

        {!v2Activa() && (e.musculos_primarios?.length || e.musculos_secundarios?.length) ? (
          <div style={{ flex: '0 0 auto', width: 132 }}>
            <Rotulo>Qué trabaja</Rotulo>
            <FiguraMusculos
              primarios={e.musculos_primarios || []}
              secundarios={e.musculos_secundarios || []}
              alto={132}
            />
          </div>
        ) : null}
      </div>
      )}

      {/* Visual nueva: el cuerpo va grande y a lo ancho. Es lo que más se
          mira después del video, y a 132 px no se distinguía un músculo. */}
      {v2Activa() && (e.musculos_primarios?.length || e.musculos_secundarios?.length) ? (
        <div style={{ marginTop: 18 }}>
          <Rotulo>Qué trabaja</Rotulo>
          <div style={{ background: '#F7F5EF', borderRadius: 16, padding: '14px 12px 12px' }}>
            <FiguraMusculos
              primarios={e.musculos_primarios || []}
              secundarios={e.musculos_secundarios || []}
              alto={230}
            />
          </div>
        </div>
      ) : null}

      {/* ── Características, plegadas ── */}
      {caracs.length > 0 && (
        <div style={{ marginTop: 18, borderTop: `1px solid ${BORDER_SOFT}`, paddingTop: 12 }}>
          <button onClick={() => setVerCaracs(v => !v)} style={{
            border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
            fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
            color: TEXT_LIGHT, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
          }}>
            Características
            <span style={{ transform: verCaracs ? 'rotate(90deg)' : 'none', transition: 'transform .16s' }}>›</span>
          </button>
          {verCaracs && (
            <dl style={{ margin: '10px 0 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', fontSize: 13.5 }}>
              {caracs.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt style={{ color: TEXT_LIGHT }}>{k}</dt>
                  <dd style={{ margin: 0, color: TEXT }}>{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* ── Lo que has levantado: el récord y el historial ──
          Con la visual nueva vive en su propio botón («Tu récord»): quien
          quiere verlo lo abre, y la ficha queda en el video y los músculos. */}
      {!v2Activa() && <TuHistorial item={item} />}
    </Hoja>
  );
}

// «Tu récord» como hoja propia (visual nueva): el récord, la última vez y
// el historial de ese ejercicio.
export function HojaRecord({ item, abierto, alCerrar }) {
  if (!item) return null;
  const n = nombresEj(item.ejercicio);
  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo={`Tu récord · ${n.grande}`} alto="70vh">
      <TuHistorial item={item} />
    </Hoja>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TU HISTORIAL EN ESTE EJERCICIO
//
// El récord va primero y grande: es lo único de esta pantalla que hace que
// alguien cargue más. Debajo, la última vez (lo que se mira de reojo entre
// serie y serie) y, plegado, todo lo demás.
//
// El historial va plegado a propósito: doce sesiones desplegadas empujan la
// figura de músculos y las características fuera de la pantalla, y el que
// quiere ver su progresión la busca; el que no, no.
// ─────────────────────────────────────────────────────────────────────────
function TuHistorial({ item }) {
  const [verTodo, setVerTodo] = useState(false);
  const u = item.ultima_vez;
  if (!u) {
    return (
      <Card style={{ marginTop: 16, padding: 13 }}>
        <div style={{ fontSize: 13.5, color: TEXT_LIGHT }}>
          Todavía no has registrado este ejercicio. Lo que marques hoy será tu primera marca.
        </div>
      </Card>
    );
  }

  const r = u.record;
  const serie = (s) => `${s.peso ? `${s.peso}${s.unidad || 'kg'} × ` : ''}${s.reps ?? '—'}`;
  const resto = (u.historial || []).slice(1);

  return (
    <Card style={{ marginTop: 16, padding: 13 }}>
      {r && (
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
          paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${BORDER_SOFT}`,
        }}>
          <span style={{ fontSize: 15 }}>🏆</span>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <Rotulo style={{ marginBottom: 2 }}>Tu récord</Rotulo>
            <div style={{ fontSize: 17, fontWeight: 800, color: ACCENT_DARK, lineHeight: 1.2 }}>
              {r.peso ? `${r.peso} ${r.unidad || 'kg'} × ${r.reps}` : `${r.reps} repeticiones`}
            </div>
          </div>
          <div style={{ fontSize: 12, color: TEXT_LIGHT, whiteSpace: 'nowrap' }}>
            {fechaLarga(r.fecha)}
          </div>
        </div>
      )}

      <Rotulo style={{ marginBottom: 6 }}>La última vez · {fechaLarga(u.fecha)}</Rotulo>
      <div style={{ fontSize: 14, color: TEXT }}>
        {u.series.map(serie).join('  ·  ')}
      </div>

      {resto.length > 0 && (
        <>
          <button onClick={() => setVerTodo(v => !v)} style={{
            border: 'none', background: 'transparent', padding: '10px 0 0', cursor: 'pointer',
            fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
            color: TEXT_LIGHT, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
          }}>
            {verTodo ? 'Ocultar' : `Las ${resto.length} anteriores`}
            <span style={{ transform: verTodo ? 'rotate(90deg)' : 'none', transition: 'transform .16s' }}>›</span>
          </button>
          {verTodo && (
            <div style={{ marginTop: 8 }}>
              {resto.map(h => (
                <div key={h.fecha} style={{
                  display: 'flex', gap: 10, padding: '7px 0',
                  borderTop: `1px solid ${BORDER_SOFT}`, fontSize: 13.5,
                }}>
                  <span style={{ color: TEXT_LIGHT, flex: '0 0 74px' }}>{fechaLarga(h.fecha)}</span>
                  <span style={{ color: TEXT, minWidth: 0 }}>{h.series.map(serie).join('  ·  ')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {u.veces > 1 && (
        <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 10 }}>
          Lo has hecho {u.veces} veces.
        </div>
      )}
    </Card>
  );
}

function Rotulo({ children, style }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
      color: TEXT_LIGHT, marginBottom: 6, ...style,
    }}>{children}</div>
  );
}

// Los nombres bonitos de los músculos, por si alguna pantalla los quiere sin
// el dibujo (la lista de rutinas, por ejemplo).
export const nombresMusculos = (slugs = []) =>
  slugs.map(s => MUSCULO_POR_SLUG[s]?.corto).filter(Boolean);
