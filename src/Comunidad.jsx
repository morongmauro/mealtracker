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
import { TEXT } from './theme.js';

export const REACCIONES = [
  { tipo: 'fuego', Icono: Fire, color: '#E8642C', nombre: 'Fuego' },
  { tipo: 'fuerza', Icono: Barbell, color: '#5F6670', nombre: 'Fuerza' },
  { tipo: 'aplauso', Icono: HandsClapping, color: '#E0A21A', nombre: 'Aplauso' },
  { tipo: 'corazon', Icono: Heart, color: '#D2483B', nombre: 'Corazón' },
];
const SOMBRA = '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.12)';
// Grises de sistema (estilo Apple): secundario, relleno y separador.
const GRIS = '#8E8E93';
const RELLENO = 'rgba(118,118,128,0.12)';
const BURBUJA = '#F2F2F7';
const SEPARADOR = 'rgba(60,60,67,0.12)';

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
      fontWeight: 700, fontSize: Math.round(tam * 0.38), flex: 'none', letterSpacing: '-0.01em' }}>{iniciales}</span>
  );
}

// El equipo, debajo de las publicaciones: circulitos chicos con su nombre
// corto. Sin el total (lo que importa es sentirse parte, no la cifra) y con
// un tope: si son más, la fila termina en «y más».
const EQUIPO_TOPE = 12;
function Equipo({ miembros }) {
  if (!miembros || !miembros.length) return null;
  const tu = miembros.filter(m => m.tu), otros = miembros.filter(m => !m.tu);
  const lista = [...tu, ...otros].slice(0, EQUIPO_TOPE);
  const mas = miembros.length > lista.length;
  return (
    <section data-equipo style={{ ...tarjeta, padding: '14px 0 12px', marginTop: 14 }}>
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: '-0.01em' }}>El equipo</div>
        <div style={{ fontSize: 13, color: GRIS, marginTop: 1 }}>Entrenando contigo en el programa</div>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '12px 16px 2px', scrollbarWidth: 'none' }}>
        {lista.map((m, i) => (
          <div key={i} data-miembro style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 46, flex: 'none' }}>
            <Avatar iniciales={m.iniciales} nombre={m.nombre} tam={32} />
            <span style={{ fontSize: 11, fontWeight: 500, color: m.tu ? TEXT : GRIS, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 46 }}>{m.tu ? 'Tú' : m.nombre}</span>
          </div>
        ))}
        {mas && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 46, flex: 'none' }}>
            <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 99, background: RELLENO, color: GRIS, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 600 }}>+</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: GRIS }}>y más</span>
          </div>
        )}
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
    <div data-comentarios style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${SEPARADOR}` }}>
      {todos.length > 2 && !abiertos && (
        <button onClick={() => setAbiertos(true)} data-ver-comentarios style={{ border: 0, background: 'none', padding: '0 0 8px', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: GRIS, cursor: 'pointer' }}>
          Ver los {todos.length} comentarios
        </button>
      )}
      {visibles.map(c => (
        <div key={c.id} data-comentario={c.mio ? 'mio' : c.coach ? 'coach' : 'otro'} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, opacity: c._enviando ? 0.6 : 1 }}>
          <Avatar iniciales={c.iniciales} nombre={c.autor} coach={c.coach} tam={28} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ background: BURBUJA, borderRadius: 18, padding: '7px 12px 8px', display: 'inline-block', maxWidth: '100%' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{c.mio ? 'Tú' : c.autor}</div>
              <div style={{ fontSize: 15, lineHeight: 1.38, color: TEXT, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.texto}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, color: GRIS, margin: '3px 0 0 12px' }}>
              <span>{c._enviando ? 'Enviando…' : hace(c.creado_en)}</span>
              {c.mio && !c._enviando && <button onClick={() => alBorrar(post, c)} data-borrar-comentario style={{ border: 0, background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: GRIS, cursor: 'pointer' }}>Borrar</button>}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: todos.length ? 4 : 0 }}>
        <textarea ref={caja} data-escribir value={texto} rows={1} maxLength={600} placeholder="Escribe un comentario…"
          onFocus={() => setFoco(true)} onBlur={() => setFoco(false)}
          onChange={e => { setTexto(e.target.value); e.target.style.height = ''; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          style={{ flex: 1, minWidth: 0, resize: 'none', border: 0, background: BURBUJA, borderRadius: 20, padding: '9px 14px', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.3, color: TEXT, outline: 'none' }} />
        <button onClick={enviar} disabled={!texto.trim()} aria-label="Enviar comentario" data-enviar-comentario style={{
          width: 36, height: 36, borderRadius: 99, border: 0, flex: 'none', display: 'grid', placeItems: 'center', cursor: texto.trim() ? 'pointer' : 'default',
          background: texto.trim() ? '#1D1D1F' : RELLENO, color: texto.trim() ? '#fff' : GRIS, transition: 'background .15s' }}>
          <PaperPlaneRight size={17} weight="fill" />
        </button>
      </div>
      {(foco || texto) && <div style={{ fontSize: 12, color: GRIS, margin: '6px 12px 0' }}>Lo lee todo el equipo; el aviso solo le llega a Mauro.</div>}
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
        sub: 'Tips y novedades del programa. Reacciona y comenta.',
      }} />
      {!datos ? (
        <div style={{ ...tarjeta, height: 140, opacity: 0.6 }} />
      ) : !datos.ok || !datos.posts.length ? (
        <div data-comunidad-vacia style={{ ...tarjeta, textAlign: 'center', padding: '26px 18px' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: TEXT }}>Todavía no hay publicaciones</div>
          <div style={{ fontSize: 15, color: GRIS, marginTop: 4, lineHeight: 1.45 }}>Cuando comparta algo con el equipo, aparece aquí.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {datos.posts.map(p => (
            <article key={p.id} data-post={p.id} style={tarjeta}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 99, background: '#1D1D1F', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>M</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: '-0.01em' }}>Mauro <span style={{ fontWeight: 400, color: GRIS }}>· tu coach</span></div>
                  <div style={{ fontSize: 13, color: GRIS }}>{fecha(p.publicado_en)}</div>
                </div>
                {p.fijado && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: GRIS }}><PushPin size={13} weight="fill" color="#F2C94C" /> Fijado</span>}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.45, color: TEXT, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', letterSpacing: '-0.005em' }}>{p.texto}</p>
              {p.imagen_url && <img src={p.imagen_url} alt="" loading="lazy" style={{ display: 'block', width: '100%', borderRadius: 14, marginTop: 12, background: '#F1EFE9' }} />}
              {p.enlace_url && (
                <a href={p.enlace_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 14, fontWeight: 600, color: '#2F6CC4', textDecoration: 'none', background: RELLENO, padding: '8px 12px', borderRadius: 12 }}>
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
                        display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', borderRadius: 99, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 13, fontWeight: 600, border: 0,
                        background: on ? `color-mix(in srgb, ${color} 15%, white)` : RELLENO, color: on ? color : '#3C3C43',
                        transition: 'background .15s, color .15s',
                      }}>
                      <span className={p._pop === tipo ? 'mt-pop' : undefined} style={{ display: 'inline-flex' }}><Icono size={17} weight={on ? 'fill' : 'regular'} /></span>
                      {n > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>}
                    </button>
                  );
                })}
                {(p.comentarios || []).length > 0 && (
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: GRIS }}>
                    <ChatCircle size={16} /> {p.comentarios.length}
                  </span>
                )}
              </div>
              <Comentarios post={p} alComentar={comentar} alBorrar={borrar} />
            </article>
          ))}
        </div>
      )}
      {/* El equipo, debajo de los mensajes. */}
      {datos && datos.ok && <Equipo miembros={datos.miembros} />}
    </div>
  );
}

const tarjeta = { background: '#FFFFFF', borderRadius: 22, padding: '16px 16px 14px', boxShadow: SOMBRA };
