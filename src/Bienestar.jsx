// ─────────────────────────────────────────────────────────────────────────
// BIENESTAR · cada 15 días, 10 segundos
//
// En el Dash, arriba de «Tu semana», cuando le toca (lo decide el servidor:
// desde su segunda semana y 14 días después del último): sueño, energía y
// estrés de 1 a 5. Se le envía a su coach, que lo ve en el CRM con su
// gráfica. «Ahora no» la esconde hasta mañana; si la salta 3 días, espera
// al siguiente turno (14 días). Nunca en «ver como cliente», ni el día en
// que le sale la encuesta de la app (una cosa a la vez).
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { api, hoyLocal, sumarDias } from './entrenoDatos.js';
import { enVerComo } from './verComo.js';
import { encuestaPospuesta } from './encuestaLuego.js';

const CLAVE = 'mt:bienestarLuego';
const leerLuego = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null') || { hasta: '', saltos: 0 }; } catch (e) { return { hasta: '', saltos: 0 }; } };
const guardarLuego = (v) => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
export const bienestarPospuesto = (hoy = hoyLocal()) => leerLuego().hasta > hoy;
export function posponerBienestar(hoy = hoyLocal()) {
  const l = leerLuego();
  const saltos = (l.saltos || 0) + 1;
  guardarLuego(saltos >= 3 ? { hasta: sumarDias(hoy, 14), saltos: 0 } : { hasta: sumarDias(hoy, 1), saltos });
}

const PREGUNTAS = [
  { k: 'sueno', t: 'Sueño', de: 'Duermo mal', a: 'Duermo bien', c: '#3C7BD6' },
  { k: 'energia', t: 'Energía', de: 'Sin energía', a: 'Con energía', c: '#46965A' },
  { k: 'estres', t: 'Estrés', de: 'Mucho estrés', a: 'Tranquilo', c: '#EE8434' },
];

export default function TarjetaBienestar({ name }) {
  const [toca, setToca] = useState(false);
  const [r, setR] = useState({});
  const [estado, setEstado] = useState(null);     // null | 'enviando' | 'ok' | texto de error
  useEffect(() => {
    if (!name || enVerComo() || bienestarPospuesto()) return;
    let vivo = true;
    // El mismo día que sale la encuesta de la app, no: una cosa a la vez.
    Promise.all([api.bienestar(name), encuestaPospuesta() ? null : api.encuesta(name)])
      .then(([x, enc]) => { if (vivo && x && x.ok && x.toca && !(enc && enc.toca)) setToca(true); }).catch(() => {});
    return () => { vivo = false; };
  }, [name]);
  if (!toca) return null;
  const completa = PREGUNTAS.every(p => r[p.k]);
  const enviar = async () => {
    if (!completa || estado === 'enviando') return;
    setEstado('enviando');
    const x = await api.bienestarResponder(name, r).catch(() => null);
    if (x && x.ok) { guardarLuego({ hasta: '', saltos: 0 }); setEstado('ok'); setTimeout(() => setToca(false), 2200); return; }
    setEstado(x && x.motivo === 'sin_red' ? 'Sin conexión. Inténtalo cuando tengas señal.' : 'No se envió. Inténtalo en un momento.');
  };
  return (
    <section data-bienestar style={{ background: '#fff', borderRadius: 24, padding: '18px 18px 16px', margin: '14px 0 4px', boxShadow: '0 1px 2px rgba(40,40,30,.04),0 8px 22px rgba(60,60,40,.07)' }}>
      {estado === 'ok' ? (
        <div data-bienestar-ok style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#1F1F1F' }}>Enviado a tu coach.</div>
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.01em', color: '#3C7BD6' }}>Cada 15 días · 10 segundos</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#1F1F1F', letterSpacing: '-.02em', marginTop: 4, lineHeight: 1.2 }}>¿Cómo vienes estas dos semanas?</div>
          <div style={{ fontSize: 14.5, color: '#55565B', marginTop: 4, lineHeight: 1.35 }}>Se lo envías a tu coach.</div>
          {PREGUNTAS.map(p => (
            <div key={p.k} data-bienestar-pregunta={p.k} style={{ marginTop: 14 }}>
              <b style={{ fontSize: 16, color: '#1F1F1F' }}>{p.t}</b>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" data-valor={n} aria-pressed={r[p.k] === n} aria-label={`${p.t} ${n} de 5`} onClick={() => setR(v => ({ ...v, [p.k]: n }))} style={{
                    height: 42, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 16,
                    background: r[p.k] === n ? p.c : '#F2F1EC', color: r[p.k] === n ? '#fff' : '#3A3A3C',
                  }}>{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#737373', marginTop: 5 }}><span>{p.de}</span><span>{p.a}</span></div>
            </div>
          ))}
          {estado && estado !== 'enviando' && <div role="alert" style={{ marginTop: 10, fontSize: 13.5, color: '#8A3A2C' }}>{estado}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button type="button" data-bienestar-listo disabled={!completa || estado === 'enviando'} onClick={enviar} style={{
              flex: 1, padding: 13, borderRadius: 999, border: 'none', cursor: completa ? 'pointer' : 'default', fontFamily: 'inherit',
              background: '#1F1F1F', color: '#fff', fontWeight: 800, fontSize: 15.5, opacity: completa ? 1 : 0.35,
            }}>{estado === 'enviando' ? 'Enviando…' : 'Listo'}</button>
            <button type="button" data-bienestar-luego onClick={() => { posponerBienestar(); setToca(false); }} style={{
              padding: '13px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: '#F2F1EC', color: '#1F1F1F', fontWeight: 700, fontSize: 15.5,
            }}>Ahora no</button>
          </div>
        </>
      )}
    </section>
  );
}
