// ─────────────────────────────────────────────────────────────────────────
// COMUNIDAD · visual nueva
//
// Lo que el coach comparte con todo el equipo (lo publica desde el CRM). Una
// sola vía: nadie más escribe; cada quien reacciona con un toque (fuego,
// fuerza, aplauso, corazón) y se ve cuántos reaccionaron. Lo que pasa por la
// pantalla queda como visto, para que el coach sepa a cuántos les llegó.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Fire, Barbell, HandsClapping, Heart, PushPin, ArrowSquareOut } from '@phosphor-icons/react';
import CabeceraHoy from './CabeceraHoy.jsx';
import { api } from './entrenoDatos.js';
import { vibrar, asegurarCSS } from './Celebraciones.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

export const REACCIONES = [
  { tipo: 'fuego', Icono: Fire, color: '#E8642C', nombre: 'Fuego' },
  { tipo: 'fuerza', Icono: Barbell, color: '#3C7BD6', nombre: 'Fuerza' },
  { tipo: 'aplauso', Icono: HandsClapping, color: '#E0A21A', nombre: 'Aplauso' },
  { tipo: 'corazon', Icono: Heart, color: '#D2483B', nombre: 'Corazón' },
];
const SOMBRA = '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)';

// Lo último que se vio, para el puntito del Dash: la publicación más nueva.
const cache = new Map();
export const firmaComunidad = (r) => (r && r.ok && r.posts && r.posts.length
  ? r.posts.map(p => p.publicado_en).sort().slice(-1)[0] : null);
export async function leerComunidad(name) {
  const r = await api.comunidad(name);
  if (r && r.ok) cache.set(name, r);
  return r && r.ok ? r : (cache.get(name) || r);
}

const fecha = (iso) => {
  try { return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }); } catch (e) { return ''; }
};

export default function Comunidad({ name, arriba = 0 }) {
  const [datos, setDatos] = useState(() => cache.get(name) || null);
  const raiz = useRef(null);
  useEffect(() => { asegurarCSS(); }, []);
  useEffect(() => {
    let vivo = true;
    leerComunidad(name).then(r => { if (vivo) setDatos(r || { ok: false }); });
    return () => { vivo = false; };
  }, [name]);

  // Lo que pasa por la pantalla queda visto (una sola llamada por tanda).
  useEffect(() => {
    if (!datos || !datos.ok || !raiz.current || typeof IntersectionObserver === 'undefined') return;
    const pendientes = new Set();
    let t = null;
    const enviar = () => { const ids = [...pendientes]; pendientes.clear(); if (ids.length) api.comunidadVisto(name, ids); };
    const obs = new IntersectionObserver((ents) => ents.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.getAttribute('data-post');
      const p = datos.posts.find(x => x.id === id);
      if (p && !p.visto) { pendientes.add(id); p.visto = true; clearTimeout(t); t = setTimeout(enviar, 800); }
      obs.unobserve(e.target);
    }), { threshold: 0.5 });
    raiz.current.querySelectorAll('[data-post]').forEach(el => obs.observe(el));
    return () => { obs.disconnect(); clearTimeout(t); enviar(); };
  }, [datos, name]);

  const reaccionar = (post, tipo) => {
    const puesta = post.mias.includes(tipo);
    vibrar(10);
    // Al instante en pantalla; la red, por detrás.
    setDatos(d => ({ ...d, posts: d.posts.map(p => p.id !== post.id ? p : {
      ...p,
      mias: puesta ? p.mias.filter(x => x !== tipo) : [...p.mias, tipo],
      reacciones: { ...p.reacciones, [tipo]: Math.max(0, (p.reacciones[tipo] || 0) + (puesta ? -1 : 1)) },
      _pop: puesta ? null : tipo,
    }) }));
    api.reaccionar(name, { post_id: post.id, tipo, quitar: puesta });
  };

  return (
    <div ref={raiz} data-comunidad style={{ paddingTop: arriba }}>
      <CabeceraHoy tema="dash" fondo={false} voz={{
        etiqueta: 'COMUNIDAD', a: 'Lo que comparto', b: 'con todo el equipo.',
        sub: 'Tips, retos y novedades del programa. Reacciona con un toque.',
      }} />
      {!datos ? (
        <div style={{ ...tarjeta, height: 140, opacity: 0.6 }} />
      ) : !datos.ok || !datos.posts.length ? (
        <div data-comunidad-vacia style={{ ...tarjeta, textAlign: 'center', padding: '26px 18px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>Todavía no hay publicaciones</div>
          <div style={{ fontSize: 14.5, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.45 }}>Cuando comparta algo con el equipo, aparece aquí.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {datos.posts.map(p => (
            <article key={p.id} data-post={p.id} style={tarjeta}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 99, background: '#1F1F1F', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, flex: 'none' }}>M</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 750, color: TEXT }}>Mauro · tu coach</div>
                  <div style={{ fontSize: 12.5, color: TEXT_LIGHT }}>{fecha(p.publicado_en)}</div>
                </div>
                {p.fijado && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#7A5500', background: 'rgba(240,184,40,0.2)', padding: '4px 9px', borderRadius: 99 }}><PushPin size={13} weight="fill" /> Fijado</span>}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5, color: TEXT, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{p.texto}</p>
              {p.imagen_url && <img src={p.imagen_url} alt="" loading="lazy" style={{ display: 'block', width: '100%', borderRadius: 14, marginTop: 12, background: '#F1EFE9' }} />}
              {p.enlace_url && (
                <a href={p.enlace_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 14, fontWeight: 700, color: TEXT, textDecoration: 'none', background: '#F1EFE9', padding: '8px 12px', borderRadius: 12 }}>
                  <ArrowSquareOut size={16} /> Abrir enlace
                </a>
              )}
              <div data-reacciones style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                {REACCIONES.map(({ tipo, Icono, color, nombre }) => {
                  const on = p.mias.includes(tipo);
                  const n = p.reacciones[tipo] || 0;
                  return (
                    <button key={tipo} data-reaccion={tipo} aria-pressed={on} aria-label={`${nombre}${n ? ` · ${n}` : ''}`}
                      onClick={() => reaccionar(p, tipo)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, height: 36, padding: '0 11px', borderRadius: 99, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 750, border: 0,
                        background: on ? `color-mix(in srgb, ${color} 16%, white)` : '#F4F2EC', color: on ? color : TEXT_MUTED,
                      }}>
                      <span className={p._pop === tipo ? 'mt-pop' : undefined} style={{ display: 'inline-flex' }}><Icono size={18} weight={on ? 'fill' : 'regular'} /></span>
                      {n > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const tarjeta = { background: '#FFFFFF', borderRadius: 22, padding: '16px 16px 14px', boxShadow: SOMBRA };
