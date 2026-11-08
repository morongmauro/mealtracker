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
import { Info } from '@phosphor-icons/react';
import { Hoja, Chip, Card, TEXT, TEXT_MUTED, TEXT_LIGHT, SURFACE_2, BORDER_SOFT, ACCENT_DARK } from './entrenoUI.jsx';
import FiguraMusculos, { LeyendaMusculos } from './FiguraMusculos.jsx';
import { usoFicha } from './usoApp.js';
import { v2Activa, nombresEj } from './v2.js';
import { lote25 } from './vistaApp.js';
import { MUSCULO_POR_SLUG } from './musculos.js';
import { LABEL } from './taxonomia.js';
import { miniatura, urlVideo, urlVideoLimpio, fechaLarga } from './entrenoDatos.js';
import VideoLimpio from './VideoLimpio.jsx';
import { FAMILIAS, familiaDe, etiquetaDe } from './familias.js';

// ── Lo que dice la ficha según la familia del ejercicio ──────────────────
// Fuerza: «Músculos que trabajas». Potencia, agilidad y resistencia: qué
// entrena, y los músculos «se activan» (se usan, pero no se busca que
// crezcan). Movilidad: qué mejora y las articulaciones que mueve.
// Estiramiento: lo que estira y cómo sostenerlo. Y debajo, «También mejora».
const ARTICULACION = { cadera: 'cadera', tobillo: 'tobillo', rodilla: 'rodilla', columna_toracica: 'columna torácica', columna_lumbar: 'columna lumbar', columna: 'columna', hombro: 'hombro', escapula: 'escápula', codo: 'codo', muneca: 'muñeca', cuello: 'cuello' };
const CUALIDAD = { fuerza: 'Fuerza', potencia: 'Potencia', agilidad: 'Agilidad', velocidad: 'Velocidad', resistencia: 'Resistencia', estabilidad: 'Estabilidad', equilibrio: 'Equilibrio', coordinacion: 'Coordinación', movilidad: 'Movilidad', flexibilidad: 'Flexibilidad' };
const y = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l[0] || '');
export function perfilFicha(e) {
  const f = familiaDe(e), estira = /^estiramiento/.test(e?.tipo || '');
  const arts = (e?.articulaciones || []).map(a => ARTICULACION[a] || String(a).replace(/_/g, ' ')).filter(Boolean);
  const tambien = (e?.cualidades || []).map(c => CUALIDAD[c] || null).filter(Boolean).filter(c => c !== etiquetaDe(e)).slice(0, 2);
  const base = { familia: f, etiqueta: etiquetaDe(e), color: FAMILIAS[f].color, tinte: FAMILIAS[f].tinte, tambien, arts: [] };
  if (f === 'fuerza') return { ...base, titulo: null, frase: null, titulos: ['Trabaja', 'Ayudan'] };
  if (f === 'potencia') return { ...base, titulo: 'Qué entrenas', frase: 'Explosividad: saltar, lanzar y empujar rápido', titulos: ['Se activan', 'Ayudan'] };
  if (f === 'agilidad') return { ...base, titulo: 'Qué entrenas', frase: 'Cambiar de dirección rápido y con control: frenar, girar y reaccionar', titulos: ['Se activan', 'Ayudan'] };
  if (f === 'resistencia') return { ...base, titulo: 'Qué entrenas', frase: 'Tu aguante y tu corazón', titulos: ['Se activan', 'Ayudan'] };
  // Estiramiento: «Lo que estiras» son los músculos (abajo); arriba, cómo sostenerlo.
  if (estira) return e.tipo === 'estiramiento_activo'
    ? { ...base, titulo: 'Cómo estirarlo', frase: 'Llega a la posición con tu propio músculo, con control y sin rebotar', titulos: ['Lo que estiras', 'También se estira'] }
    : { ...base, titulo: 'Cómo estirarlo', frase: 'Sostén de 30 a 60 s, respira y no rebotes', titulos: ['Lo que estiras', 'También se estira'] };
  return { ...base, titulo: 'Qué mejoras', frase: arts.length ? `Rango y control de tu ${y(arts)}` : 'Rango de movimiento y control', arts, titulos: ['Intervienen', 'Ayudan'] };
}
function QueEntrenas({ p }) {
  if (!p.titulo && !p.tambien.length) return null;
  const chip = (t, key) => <span key={key} style={{ display: 'inline-flex', padding: '5px 10px', borderRadius: 999, background: '#fff', fontSize: 13, fontWeight: 650, color: TEXT }}>{t}</span>;
  return (
    <div data-ficha-familia={p.familia} style={{ marginTop: 14, background: p.tinte, borderRadius: 18, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {p.titulo && <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{p.titulo}</div>}
        <span style={{ fontSize: 12, fontWeight: 750, color: '#fff', background: p.color, padding: '3px 9px', borderRadius: 99, marginLeft: 'auto' }}>{p.etiqueta}</span>
      </div>
      {p.frase && <div data-ficha-frase style={{ fontSize: 14.5, lineHeight: 1.4, color: TEXT, marginTop: 4 }}>{p.frase}</div>}
      {p.arts.length > 0 && (
        <div data-ficha-articulaciones style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#737373', marginBottom: 6 }}>Articulaciones que mueves</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{p.arts.map((a, i) => chip(a.charAt(0).toUpperCase() + a.slice(1), i))}</div>
        </div>
      )}
      {p.tambien.length > 0 && (
        <div data-ficha-tambien style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#737373', marginBottom: 6 }}>También mejora</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{p.tambien.map((t, i) => chip(t, i))}</div>
        </div>
      )}
    </div>
  );
}

export default function Ejercicio({ item, abierto, alCerrar }) {
  const [verVideo, setVerVideo] = useState(false);
  // Visual nueva: las características se ven de entrada (no hay que buscarlas).
  const [verCaracs, setVerCaracs] = useState(v2Activa());

  // El componente se desmonta al cerrar, pero por si acaso: cambiar de
  // ejercicio con el video abierto no debe heredar el reproductor anterior.
  React.useEffect(() => { setVerVideo(false); setVerCaracs(v2Activa()); }, [item?.ejercicio?.id]);
  // Para el coach (Enganche en el CRM): cada vez que abre la ficha.
  React.useEffect(() => { if (abierto && item?.ejercicio) usoFicha(item.ejercicio); }, [abierto, item?.ejercicio?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const e = item?.ejercicio;
  if (!e) return null;

  const thumb = miniatura(e);
  const video = urlVideo(e);
  const claves = e.claves_tecnicas || [];
  const errores = e.errores_tecnicos || [];
  const tieneMusculos = !!(e.musculos_primarios?.length || e.musculos_secundarios?.length);
  const perfil = perfilFicha(e);
  const caracs = [
    ['Patrón', LABEL.patron[e.patron]],
    ['Segmento', LABEL.segmento[e.segmento]],
    ['Tipo', LABEL.tipo[e.tipo]],
    ['Nivel', LABEL.nivel[e.nivel]],
    ['Equipo', (e.equipo || []).map(x => LABEL.equipo[x] || x).join(', ')],
    ['Unilateral', e.unilateral ? 'Sí, un lado a la vez' : null],
  ].filter(([, v]) => v);

  return (
    <Hoja abierta={abierto} alCerrar={alCerrar} titulo={nombresEj(e).grande}
      marca={v2Activa() ? { etiqueta: 'Ficha', nombre: nombresEj(e).grande, chico: nombresEj(e).chico, Icono: Info } : null}>
      {nombresEj(e).chico && !v2Activa() && (
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
      {video && verVideo && v2Activa() && (
        // Visual nueva: el ejercicio en bucle, sin el «ruido» de YouTube, con
        // barrita para moverlo y sonido que se prende y se apaga.
        <VideoLimpio src={urlVideoLimpio(e)} miniatura={thumb} titulo={e.nombre} />
      )}
      {video && verVideo && !v2Activa() && (
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

      {/* ── Visual nueva: qué trabaja (texto a la izquierda, figura a la
          derecha) y debajo cómo hacerlo bien y los errores comunes. ── */}
      {v2Activa() && <QueEntrenas p={perfil} />}
      {v2Activa() && (tieneMusculos || caracs.length > 0) && (
        <div data-ficha-trabaja style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {tieneMusculos && <LeyendaMusculos primarios={e.musculos_primarios || []} secundarios={e.musculos_secundarios || []} titulos={perfil.titulos} />}
            {caracs.length > 0 && (
              <dl style={{ margin: '12px 0 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 10px', fontSize: 13.5 }}>
                {caracs.filter(([k]) => ['Tipo', 'Equipo'].includes(k) || (k === 'Patrón' && ['fuerza', 'potencia'].includes(perfil.familia))).map(([k, v]) => (
                  <React.Fragment key={k}><dt style={{ color: TEXT_LIGHT }}>{k}</dt><dd style={{ margin: 0, color: TEXT }}>{v}</dd></React.Fragment>
                ))}
              </dl>
            )}
          </div>
          {tieneMusculos && (
            <div style={{ flex: 'none', width: 150 }}>
              <FiguraMusculos primarios={e.musculos_primarios || []} secundarios={e.musculos_secundarios || []} alto={178} leyenda={false} separacion={8} />
            </div>
          )}
        </div>
      )}
      {/* ── Cómo hacerlo bien (visual nueva): las claves (lo que sí) y los
          posibles errores (lo que no), en una sola tarjeta separadas por una
          línea. Títulos en minúscula, como el resto de la app. ── */}
      {v2Activa() && (claves.length > 0 || errores.length > 0) && (
        <div data-ficha-tecnica style={{ marginTop: 14, background: '#fff', borderRadius: 18, padding: '12px 14px', boxShadow: '0 1px 2px rgba(40,40,30,.04), 0 6px 16px rgba(60,60,40,.06)' }}>
          {claves.length > 0 && (
            <div data-ficha-claves>
              <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 6 }}>Cómo hacerlo bien</div>
              {claves.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14.5, lineHeight: 1.35, padding: '4px 0', color: TEXT }}>
                  <span aria-hidden="true" style={{ flex: 'none', width: 18, height: 18, borderRadius: 99, background: 'rgba(70,150,90,.14)', color: '#2F7F45', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, marginTop: 1 }}>✓</span>{c}
                </div>
              ))}
            </div>
          )}
          {errores.length > 0 && (
            <div data-ficha-errores style={claves.length ? { borderTop: `1px solid ${BORDER_SOFT}`, marginTop: 10, paddingTop: 10 } : null}>
              <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 6 }}>Errores comunes</div>
              {errores.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14.5, lineHeight: 1.35, padding: '4px 0', color: TEXT }}>
                  <span aria-hidden="true" style={{ flex: 'none', width: 18, height: 18, borderRadius: 99, background: '#FDE2DF', color: '#C0392B', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, marginTop: 1 }}>✕</span>{c}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Características ── (visual nueva: abiertas, con el cuerpo y los
          músculos que trabaja marcados, grande y a lo ancho) */}
      {!v2Activa() && caracs.length > 0 && (
        <div style={{ marginTop: 18, borderTop: `1px solid ${BORDER_SOFT}`, paddingTop: 12 }}>
          <button onClick={() => setVerCaracs(v => !v)} style={{
            border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
            fontSize: 12, fontWeight: 800, letterSpacing: '0.01em', color: TEXT_LIGHT, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
          }}>
            Características
            <span style={{ transform: verCaracs ? 'rotate(90deg)' : 'none', transition: 'transform .16s' }}>›</span>
          </button>
          {verCaracs && v2Activa() && tieneMusculos && (
            // Lote 28 (solo Mauro): la figura más baja y sin aire arriba ni
            // abajo: el espacio vertical se aprovecha.
            <div style={{ marginTop: lote25() ? 6 : 10 }}>
              <div style={{ padding: lote25() ? 0 : '4px 2px 2px' }}>
                <FiguraMusculos
                  primarios={e.musculos_primarios || []}
                  secundarios={e.musculos_secundarios || []}
                  alto={lote25() ? 200 : 262}
                />
              </div>
              {/* «Principal» y «También trabaja» ya van en la leyenda de la figura. */}
            </div>
          )}
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
            fontSize: 12, fontWeight: 800, letterSpacing: '0.01em', color: TEXT_LIGHT, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
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
      fontSize: 12, fontWeight: 800, letterSpacing: '0.01em', color: TEXT_LIGHT, marginBottom: 6, ...style,
    }}>{children}</div>
  );
}

// Los nombres bonitos de los músculos, por si alguna pantalla los quiere sin
// el dibujo (la lista de rutinas, por ejemplo).
export const nombresMusculos = (slugs = []) =>
  slugs.map(s => MUSCULO_POR_SLUG[s]?.corto).filter(Boolean);
