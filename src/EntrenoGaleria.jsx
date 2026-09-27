// ─────────────────────────────────────────────────────────────────────────
// GALERÍA DE EJERCICIOS
//
// Todos los ejercicios de su plan, en rejilla, con la miniatura del video.
// Es la pregunta de la tarde anterior —«¿cómo era el búlgaro?»— y hasta ahora
// había que entrar en la rutina para responderla.
//
// Se filtra por rutina y se toca para abrir la ficha de siempre (video, cómo
// se hace, qué trabaja). Sale de las mismas rutinas que ya ve el cliente: no
// hay una puerta nueva al catálogo del coach.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { api, miniatura } from './entrenoDatos.js';
import { MUSCULO_POR_SLUG } from './musculos.js';
import EntrenoFicha from './EntrenoFicha.jsx';
import { Titulo, Cargando, Fallo, Vacio,
         SURFACE, SURFACE_2, BORDER, TEXT, TEXT_MUTED, TEXT_LIGHT, SHADOW_CARD } from './entrenoUI.jsx';

// Un ejercicio aparece una vez aunque esté en tres rutinas; se recuerdan
// todas para el filtro.
export function armarGaleria(rutinas) {
  const porId = new Map();
  rutinas.forEach(r => {
    (r.ejercicios || []).forEach(item => {
      const e = item.ejercicio;
      if (!e || !e.id) return;
      const ya = porId.get(e.id);
      if (ya) { if (!ya.rutinas.includes(r.id)) ya.rutinas.push(r.id); return; }
      porId.set(e.id, { item, rutinas: [r.id] });
    });
  });
  return [...porId.values()];
}

export default function Galeria({ nombre }) {
  const [rutinas, setRutinas] = useState(null);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [abierto, setAbierto] = useState(null);

  const cargar = async () => {
    setError(null);
    const lista = await api.rutinas(nombre);
    if (!lista.ok) { setError(lista.motivo || 'error'); return; }
    // Cada rutina trae sus ejercicios completos (con video). Son pocas —de
    // dos a seis—, así que van en paralelo.
    const detalles = await Promise.all((lista.rutinas || []).map(r => api.rutina(nombre, r.id)));
    setRutinas((lista.rutinas || []).map((r, i) => ({
      id: r.id, nombre: r.nombre,
      ejercicios: detalles[i] && detalles[i].ok ? detalles[i].rutina.ejercicios : [],
    })));
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [nombre]);

  const todos = useMemo(() => (rutinas ? armarGaleria(rutinas) : []), [rutinas]);
  const visibles = filtro === 'todas' ? todos : todos.filter(x => x.rutinas.includes(filtro));

  if (error) return <Fallo motivo={error} alReintentar={cargar} />;
  if (!rutinas) return <Cargando />;
  if (!todos.length) {
    return (
      <div>
        <Titulo>Galería</Titulo>
        <div style={{ marginTop: 14 }}>
          <Vacio icono="🎬" titulo="Aún no hay ejercicios"
            texto="Cuando tu coach te envíe el plan, aquí tienes cada ejercicio con su video." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Titulo>Galería</Titulo>
      <div style={{ color: TEXT_MUTED, fontSize: 13.5 }}>
        {todos.length} ejercicio{todos.length === 1 ? '' : 's'} de tu plan · toca uno para ver cómo se hace
      </div>

      {rutinas.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '14px -20px 2px', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
          {[{ id: 'todas', nombre: 'Todas' }, ...rutinas].map(r => {
            const activo = filtro === r.id;
            return (
              <button key={r.id} onClick={() => setFiltro(r.id)} style={{
                flex: 'none', border: `1px solid ${activo ? TEXT : BORDER}`, borderRadius: 999,
                background: activo ? TEXT : 'rgba(255,255,255,0.7)', color: activo ? '#fff' : TEXT_MUTED,
                padding: '7px 13px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              }}>{r.nombre}</button>
            );
          })}
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 10, marginTop: 12,
      }}>
        {visibles.map(({ item }) => {
          const e = item.ejercicio;
          const img = miniatura(e);
          const musculos = (e.musculos_primarios || []).map(s => MUSCULO_POR_SLUG[s]?.corto).filter(Boolean);
          return (
            <button key={e.id} onClick={() => setAbierto(item)} style={{
              textAlign: 'left', padding: 0, border: `1px solid ${BORDER}`, borderRadius: 16,
              background: SURFACE, boxShadow: SHADOW_CARD, overflow: 'hidden', cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ position: 'relative', aspectRatio: '16 / 10', background: SURFACE_2 }}>
                {img
                  ? <img src={img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: TEXT_LIGHT, fontSize: 12 }}>Sin video</div>}
                {img && (
                  <span aria-hidden="true" style={{
                    position: 'absolute', right: 7, bottom: 7, width: 26, height: 26, borderRadius: 99,
                    background: 'rgba(255,255,255,0.92)', display: 'grid', placeItems: 'center',
                    fontSize: 10, color: TEXT, paddingLeft: 2,
                  }}>▶</span>
                )}
              </div>
              <div style={{ padding: '9px 10px 11px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: TEXT, lineHeight: 1.25 }}>{e.nombre}</div>
                {musculos.length > 0 && (
                  <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 3 }}>{musculos.slice(0, 2).join(' · ')}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <EntrenoFicha item={abierto} abierto={!!abierto} alCerrar={() => setAbierto(null)} />
    </div>
  );
}
