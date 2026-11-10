// ─────────────────────────────────────────────────────────────────────────
// LO QUE HICISTE ESE DÍA · una rutina ya hecha, de solo lectura (10 nov)
//
// Antes, tocar en el calendario (o en «Tu semana») una rutina hecha otro día
// la abría vacía, como para entrenarla hoy: no se veía lo que se hizo ese día
// y una serie marcada ahí quedaba como entreno de HOY. Ahora se abre esto:
// cada ejercicio con sus series (reps × peso), la duración, cómo lo sintió y
// su nota. Nada se edita aquí. «Entrenarla hoy» abre la rutina de siempre.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Timer, Gauge, ChatText, Barbell } from '@phosphor-icons/react';
import { api, fechaLarga, aFecha } from './entrenoDatos.js';
import { nombresEj } from './v2.js';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

const GRAFITO = '#1F1F1F';
const CREMA = '#F4F1EB';
const SOMBRA = '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const num = (v) => (v == null || v === '' ? null : Number(v).toLocaleString('es-CO', { maximumFractionDigits: 2 }));

function textoSerie(s) {
  const reps = s.reps != null ? num(s.reps) : null;
  const peso = s.peso != null && Number(s.peso) > 0 ? `${num(s.peso)} ${s.unidad || 'kg'}` : null;
  if (reps && peso) return `${reps} × ${peso}`;
  if (reps) return `${reps} reps`;
  if (peso) return peso;
  return 'Hecha';
}
const minutos = (seg) => (seg > 0 ? `${Math.max(1, Math.round(seg / 60))} min` : null);

function Dato({ Icono, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: '#fff', boxShadow: SOMBRA, fontSize: 13.5, fontWeight: 650, color: TEXT }}>
      <Icono size={15} weight="bold" color={TEXT_MUTED} />{children}
    </span>
  );
}

export default function VistaHecha({ name, rutinaId, fecha, onVolver, onEntrenar }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    api.hecha(name, rutinaId, fecha).then(r => { if (!vivo) return; if (r && r.ok) setD(r); else setError(true); }).catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [name, rutinaId, fecha]);

  const dia = aFecha(fecha);
  const cuando = `${DIAS[dia.getDay()]} ${fechaLarga(fecha)}`;
  const ses = d && d.sesion;
  const ejs = (d && d.ejercicios) || [];
  const totalSeries = ejs.reduce((a, e) => a + e.series.length, 0);

  return (
    <div data-rutina-hecha={fecha} style={{ paddingBottom: 24 }}>
      <button data-volver-semana onClick={onVolver} aria-label="Volver" style={{
        display: 'inline-flex', alignItems: 'center', gap: 2, height: 32, padding: '0 12px 0 8px', borderRadius: 999, border: 0,
        background: 'rgba(118,118,128,0.14)', color: TEXT, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
      }}><ChevronLeft size={16} /> Volver</button>

      <div style={{ marginTop: 14, fontSize: 13.5, fontWeight: 700, color: TEXT_MUTED }}>Lo que hiciste el {cuando}</div>
      <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, color: TEXT }}>
        {(d && d.rutina && d.rutina.nombre) || 'Tu rutina'}
      </h1>

      {!d && !error && <div style={{ marginTop: 18, fontSize: 15, color: TEXT_MUTED }}>Cargando lo que hiciste…</div>}
      {error && <div style={{ marginTop: 18, fontSize: 15, color: TEXT_MUTED }}>No pude traer lo que hiciste ese día. Revisa tu conexión y vuelve a intentar.</div>}

      {d && (<>
        {(ses && (minutos(ses.duracion_seg) || ses.rpe)) || totalSeries ? (
          <div data-hecha-datos style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {totalSeries > 0 && <Dato Icono={Barbell}>{totalSeries} {totalSeries === 1 ? 'serie' : 'series'}</Dato>}
            {ses && minutos(ses.duracion_seg) && <Dato Icono={Timer}>{minutos(ses.duracion_seg)}</Dato>}
            {ses && ses.rpe ? <Dato Icono={Gauge}>Lo sentiste {num(ses.rpe)} de 10</Dato> : null}
          </div>
        ) : null}

        {ses && ses.notas && (
          <div data-hecha-nota style={{ marginTop: 12, padding: '12px 14px', borderRadius: 18, background: CREMA, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <ChatText size={18} weight="bold" color={TEXT_MUTED} style={{ flex: 'none', marginTop: 1 }} />
            <div style={{ fontSize: 14.5, color: TEXT, lineHeight: 1.35 }}><b style={{ fontWeight: 700 }}>Tu nota: </b>«{ses.notas}»</div>
          </div>
        )}

        {ejs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {ejs.map((e, i) => {
              const n = nombresEj(e.ejercicio);
              return (
                <section key={i} data-hecha-ejercicio style={{ background: '#fff', borderRadius: 20, boxShadow: SOMBRA, padding: '14px 16px 8px' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{n.grande}</div>
                  {n.chico && <div style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 1 }}>{n.chico}</div>}
                  <div style={{ marginTop: 6 }}>
                    {e.series.map((s, k) => (
                      <div key={k} data-hecha-serie style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderTop: k ? '1px solid rgba(31,31,31,0.07)' : 'none' }}>
                        <span style={{ width: 22, height: 22, borderRadius: 99, background: '#F2C94C', color: GRAFITO, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, flex: 'none' }}>{s.serie_num || k + 1}</span>
                        <span style={{ fontSize: 15.5, fontWeight: 650, color: TEXT, fontVariantNumeric: 'tabular-nums' }}>{textoSerie(s)}</span>
                        {s.rir != null && <span style={{ marginLeft: 'auto', fontSize: 12.5, color: TEXT_LIGHT }}>RIR {num(s.rir)}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: '16px', borderRadius: 20, background: '#fff', boxShadow: SOMBRA, fontSize: 15, color: TEXT_MUTED, lineHeight: 1.4 }}>
            Este día quedó como hecho, pero no hay series anotadas en la app.
          </div>
        )}
      </>)}

      <button data-entrenar-hoy onClick={onEntrenar} style={{
        width: '100%', marginTop: 18, height: 52, borderRadius: 999, border: 0, background: GRAFITO, color: '#fff',
        fontFamily: 'inherit', fontSize: 16, fontWeight: 700, cursor: 'pointer',
      }}>Entrenarla hoy</button>
    </div>
  );
}
