// ─────────────────────────────────────────────────────────────────────────
// COMUNIDAD · visual nueva
//
// Lo que el coach comparte con todo el equipo (lo publica desde el CRM).
// Solo él publica; cada quien reacciona con un toque (fuego, fuerza,
// aplauso, corazón) y comenta. Los comentarios los lee todo el equipo, pero
// a nadie se le avisa: solo le llegan al coach. Arriba, el equipo: los del
// programa con su circulito y su nombre corto («Laura M.»). Lo que pasa por
// la pantalla queda como visto, para que el coach sepa a cuántos les llegó.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Fire, Barbell, HandsClapping, Heart, PushPin, ArrowSquareOut, ChatCircle, PaperPlaneRight } from '@phosphor-icons/react';
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
// «hace 5 min», «hace 3 h», o la fecha.
const hace = (iso) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!(m >= 0)) return '';
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  if (m < 60 * 24) return `hace ${Math.round(m / 60)} h`;
  return fecha(iso);
};

// El circulito de cada persona: sus iniciales sobre un tinte de la marca
// (siempre el mismo para la misma persona).
const TINTES = [['#F8DCC6', '#A24F0E'], ['#D3E8D9', '#22663A'], ['#D6E4F7', '#1E4F9A'], ['#F5E4B3', '#7A5500'], ['#E6E3DC', '#3A3A3A']];
const tinte = (txt) => TINTES[[...String(txt)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % TINTES.length];
function Avatar({ iniciales, nombre, coach, tam = 34 }) {
  const [fondo, tinta] = coach ? ['#1F1F1F', '#FFFFFF'] : tinte(nombre || iniciales);
  return (
    <span aria-hidden="true" style={{ width: tam, height: tam, borderRadius: 99, background: fondo, color: tinta, display: 'grid', placeItems: 'center',
      fontWeight: 800, fontSize: Math.round(tam * 0.38), flex: 'none', letterSpacing: '-0.02em' }}>{iniciales}</span>
  );
}

// El equipo: todos los del programa, con su circulito y su nombre corto.
function Equipo({ miembros }) {
  if (!miembros || !miembros.length) return null;
  return (
    <section data-equipo style={{ ...tarjeta, padding: '14px 0 12px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 16px' }}>
        <span style={{ fontSize: 15.5, fontWeight: 800, color: TEXT }}>El equipo</span>
        <span style={{ fontSize: 13, color: TEXT_LIGHT, fontWeight: 600 }}>{miembros.length} {miembros.length === 1 ? 'persona' : 'personas'}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '12px 16px 2px', scrollbarWidth: 'none' }}>
        {miembros.map((m, i) => (
          <div key={i} data-miembro style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 58, flex: 'none' }}>
            <Avatar iniciales={m.iniciales} nombre={m.nombre} tam={46} />
            <span style={{ fontSize: 12, fontWeight: 650, color: m.tu ? TEXT : TEXT_MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 58 }}>{m.tu ? 'Tú' : m.nombre}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Los comentarios de una publicación y la cajita para escribir.
function Comentarios({ post, alComentar, alBorrar }) {
  const [abiertos, setAbiertos] = useState(false);
  const [texto, setTexto] = useState('');
  const [foco, setFoco] = useState(false);
  const caja = useRef(null);
  const todos = post.comentarios || [];
  const visibles = abiertos ? todos : todos.slice(-2);
  const enviar = () => {
    const t = texto.trim();
    if (!t) return;
    alComentar(post, t);
    setTexto('');
    if (caja.current) caja.current.style.height = '';
  };
  return (
    <div data-comentarios style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0EDE6' }}>
      {todos.length > 2 && !abiertos && (
        <button onClick={() => setAbiertos(true)} data-ver-comentarios style={{ border: 0, background: 'none', padding: '0 0 8px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: TEXT_MUTED, cursor: 'pointer' }}>
          Ver los {todos.length} comentarios
        </button>
      )}
      {visibles.map(c => (
        <div key={c.id} data-comentario={c.mio ? 'mio' : c.coach ? 'coach' : 'otro'} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, opacity: c._enviando ? 0.6 : 1 }}>
          <Avatar iniciales={c.iniciales} nombre={c.autor} coach={c.coach} tam={30} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ background: '#F4F2EC', borderRadius: '4px 16px 16px 16px', padding: '7px 11px 8px', display: 'inline-block', maxWidth: '100%' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{c.mio ? 'Tú' : c.autor}</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.4, color: TEXT, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.texto}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, color: TEXT_LIGHT, margin: '3px 0 0 4px' }}>
              <span>{c._enviando ? 'Enviando…' : hace(c.creado_en)}</span>
              {c.mio && !c._enviando && <button onClick={() => alBorrar(post, c)} data-borrar-comentario style={{ border: 0, background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: TEXT_LIGHT, cursor: 'pointer' }}>Borrar</button>}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: todos.length ? 4 : 0 }}>
        <textarea ref={caja} data-escribir value={texto} rows={1} maxLength={600} placeholder="Escribe un comentario…"
          onFocus={() => setFoco(true)} onBlur={() => setFoco(false)}
          onChange={e => { setTexto(e.target.value); e.target.style.height = ''; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          style={{ flex: 1, minWidth: 0, resize: 'none', border: '1px solid #E7E3DA', background: '#FBFAF7', borderRadius: 18, padding: '9px 14px', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.35, color: TEXT, outline: 'none' }} />
        <button onClick={enviar} disabled={!texto.trim()} aria-label="Enviar comentario" data-enviar-comentario style={{
          width: 40, height: 40, borderRadius: 99, border: 0, flex: 'none', display: 'grid', placeItems: 'center', cursor: texto.trim() ? 'pointer' : 'default',
          background: texto.trim() ? '#1F1F1F' : '#ECE9E2', color: texto.trim() ? '#fff' : TEXT_LIGHT, transition: 'background .15s' }}>
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </div>
      {(foco || texto) && <div style={{ fontSize: 12, color: TEXT_LIGHT, margin: '6px 4px 0' }}>Lo lee todo el equipo; el aviso solo le llega a Mauro.</div>}
    </div>
  );
}

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

  // Comentar: sale al instante y se confirma por detrás.
  const cambiarComentarios = (postId, fn) => setDatos(d => ({ ...d, posts: d.posts.map(p => p.id !== postId ? p : { ...p, comentarios: fn(p.comentarios || []) }) }));
  const comentar = async (post, texto) => {
    const tmp = 'tmp-' + Date.now();
    const yo = (datos.miembros || []).find(m => m.tu) || { nombre: 'Tú', iniciales: '·' };
    cambiarComentarios(post.id, cs => [...cs, { id: tmp, texto, creado_en: new Date().toISOString(), mio: true, autor: yo.nombre, iniciales: yo.iniciales, _enviando: true }]);
    vibrar(8);
    const r = await api.comentar(name, post.id, texto);
    cambiarComentarios(post.id, cs => (r && r.ok && r.comentario ? cs.map(c => (c.id === tmp ? r.comentario : c)) : cs.filter(c => c.id !== tmp)));
  };
  const borrar = (post, c) => {
    cambiarComentarios(post.id, cs => cs.filter(x => x.id !== c.id));
    api.borrarComentario(name, c.id);
  };

  return (
    <div ref={raiz} data-comunidad style={{ paddingTop: arriba }}>
      <CabeceraHoy tema="dash" fondo={false} voz={{
        etiqueta: 'COMUNIDAD', a: 'Lo que comparto', b: 'con todo el equipo.',
        sub: 'Tips, retos y novedades del programa. Reacciona y comenta.',
      }} />
      {datos && datos.ok && <Equipo miembros={datos.miembros} />}
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
              <div data-reacciones style={{ display: 'flex', gap: 6, marginTop: 14, alignItems: 'center' }}>
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
                {(p.comentarios || []).length > 0 && (
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: TEXT_LIGHT }}>
                    <ChatCircle size={16} /> {p.comentarios.length}
                  </span>
                )}
              </div>
              <Comentarios post={p} alComentar={comentar} alBorrar={borrar} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const tarjeta = { background: '#FFFFFF', borderRadius: 22, padding: '16px 16px 14px', boxShadow: SOMBRA };
