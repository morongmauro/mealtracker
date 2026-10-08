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
import { v2Activa } from './v2.js';
import React, { useEffect, useMemo, useState } from 'react';
import { api, miniatura } from './entrenoDatos.js';
import { MUSCULO_POR_SLUG } from './musculos.js';
import EntrenoFicha from './EntrenoFicha.jsx';
import { nombresEj } from './v2.js';
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

// El tipo de cada ejercicio, con su tono (visual nueva): Movilidad,
// Resistencia, Potencia o Fuerza. La fuerza va toda en el mismo color y
// dice además si es empuje o jalón, de tren superior o inferior. Sale del
// tipo, el patrón y el segmento que el coach le puso en la galería.
const FAMILIAS = {
  movilidad:   { texto: 'Movilidad',   color: '#178A8F', tinte: '#DFF2F2', fondo: ['#2CA5AA', '#137479'] },
  resistencia: { texto: 'Resistencia', color: '#C23D78', tinte: '#F9E3EE', fondo: ['#D9599A', '#A92E66'] },
  potencia:    { texto: 'Potencia',    color: '#C2413B', tinte: '#FAE5E3', fondo: ['#DA5E55', '#AA322C'] },
  fuerza:      { texto: 'Fuerza',      color: '#454B54', tinte: '#E9EBEE', fondo: ['#6E757F', '#454B54'] },
};
// El velo de abajo de cada tarjeta (visual nueva): el tono oscuro del tipo,
// para que el texto blanco se lea sobre cualquier cuadro del video. El punto
// de la etiqueta va en el tono vivo.
const VELO = { movilidad: '19,116,121', resistencia: '169,46,102', potencia: '170,50,44', fuerza: '52,57,64' };
const PUNTO = { movilidad: '#2CA5AA', resistencia: '#D9599A', potencia: '#DA5E55', fuerza: '#9AA1AA' };
// Los estantes, en este orden: lo que prepara, lo principal y lo de cierre.
const ORDEN_FAMILIAS = ['movilidad', 'fuerza', 'potencia', 'resistencia'];
export function familiaDe(e) {
  const tipo = e?.tipo;
  if (tipo === 'cardio') return 'resistencia';
  if (['movilidad', 'calentamiento', 'estiramiento', 'estiramiento_pasivo', 'estiramiento_activo'].includes(tipo)) return 'movilidad';
  if (['potencia', 'pliometrico', 'agilidad'].includes(tipo)) return 'potencia';
  return 'fuerza';
}
// En la fuerza: empuje o jalón, de tren superior o inferior (sentadillas y
// zancadas empujan con la pierna; bisagras y puentes jalan con la cadera).
export function tipoFuerza(e) {
  const patron = e?.patron, inferior = e?.segmento === 'tren_inferior';
  if (patron === 'push') return inferior ? 'Empuje · tren inferior' : 'Empuje · tren superior';
  if (patron === 'pull') return inferior ? 'Jalón · tren inferior' : 'Jalón · tren superior';
  if (patron === 'rodilla') return 'Empuje · tren inferior';
  if (patron === 'cadera') return 'Jalón · tren inferior';
  if (patron === 'core' || e?.tipo === 'core') return 'Core';
  return null;
}

// ── Tarjeta de la visual nueva ─────────────────────────────────────────────
// El cuadro del video ocupa toda la tarjeta; abajo, un velo del color del
// tipo con el nombre en blanco; arriba, la etiqueta de vidrio con su punto.
function TarjetaV2({ item, alto, alTocar }) {
  const e = item.ejercicio;
  const img = miniatura(e);
  const f = familiaDe(e), fam = FAMILIAS[f];
  const sub = f === 'fuerza' ? tipoFuerza(e) : null;
  const musculos = (e.musculos_primarios || []).map(s => MUSCULO_POR_SLUG[s]?.corto).filter(Boolean);
  const n = nombresEj(e);
  return (
    <button data-familia={f} data-fuerza={sub || undefined} onClick={alTocar} style={{
      position: 'relative', display: 'block', width: '100%', height: alto, padding: 0, border: 'none', borderRadius: 22,
      overflow: 'hidden', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
      background: `linear-gradient(160deg, ${fam.fondo[0]}, ${fam.fondo[1]})`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 10px 24px -10px rgba(0,0,0,0.25)',
    }}>
      {img && <img src={img} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <span aria-hidden="true" data-familia-velo style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `linear-gradient(180deg, rgba(${VELO[f]},0) 34%, rgba(${VELO[f]},0.62) 62%, rgba(${VELO[f]},0.94) 100%)`,
      }} />
      <span data-familia-etiqueta style={{
        position: 'absolute', left: 10, top: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px 5px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(14px) saturate(1.6)', WebkitBackdropFilter: 'blur(14px) saturate(1.6)',
        fontSize: 11.5, fontWeight: 700, color: TEXT, letterSpacing: '0.01em',
      }}>
        <i style={{ width: 7, height: 7, borderRadius: 9, background: PUNTO[f] }} />{fam.texto}
      </span>
      <span style={{ position: 'absolute', left: 12, right: 12, bottom: 12, color: '#FFFFFF', display: 'block' }}>
        {sub && <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', opacity: 0.78, marginBottom: 3 }}>{sub}</span>}
        <span style={{ display: 'block', fontSize: 15.5, fontWeight: 750, lineHeight: 1.18, letterSpacing: '-0.01em' }}>{n.grande}</span>
        {n.chico && <span style={{ display: 'block', fontSize: 12, opacity: 0.82, marginTop: 2, lineHeight: 1.25 }}>{n.chico}</span>}
        {musculos.length > 0 && <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, opacity: 0.7, marginTop: 5 }}>{musculos.slice(0, 2).join(' · ')}</span>}
      </span>
    </button>
  );
}

// Un estante por tipo: la fuerza (lo principal) en rejilla de dos; el resto
// en fila que se desliza, o a lo ancho si es uno solo.
function EstantesV2({ visibles, alAbrir }) {
  const grupos = ORDEN_FAMILIAS.map(f => ({ f, items: visibles.filter(x => familiaDe(x.item.ejercicio) === f) })).filter(g => g.items.length);
  return grupos.map(({ f, items }) => (
    <section key={f} data-estante={f}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 10px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: TEXT }}>{FAMILIAS[f].texto}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_LIGHT }}>{items.length}</span>
      </div>
      {f === 'fuerza'
        ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {items.map(({ item }) => <TarjetaV2 key={item.ejercicio.id} item={item} alto={214} alTocar={() => alAbrir(item)} />)}
          </div>
        : items.length === 1
          ? <TarjetaV2 item={items[0].item} alto={150} alTocar={() => alAbrir(items[0].item)} />
          : <div style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 6px', scrollbarWidth: 'none', scrollSnapType: 'x mandatory', scrollPaddingInline: 20 }}>
              {items.map(({ item }) => (
                <div key={item.ejercicio.id} style={{ flex: 'none', width: 236, scrollSnapAlign: 'start' }}>
                  <TarjetaV2 item={item} alto={158} alTocar={() => alAbrir(item)} />
                </div>
              ))}
            </div>}
    </section>
  ));
}

// Lo último traído, por cliente: al volver a la Galería se pinta al instante
// y se refresca por detrás.
const cacheGaleria = new Map();

export default function Galeria({ nombre }) {
  const [rutinas, setRutinasEstado] = useState(() => cacheGaleria.get(nombre) || null);
  const setRutinas = (v) => { cacheGaleria.set(nombre, v); setRutinasEstado(v); };
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [abierto, setAbierto] = useState(null);

  const cargar = async () => {
    setError(null);
    const lista = await api.rutinas(nombre);
    if (!lista.ok) { if (!cacheGaleria.has(nombre)) setError(lista.motivo || 'error'); return; }
    // Cada rutina trae sus ejercicios completos (con video). Son pocas —de
    // dos a seis—, así que van en paralelo.
    const detalles = await Promise.all((lista.rutinas || []).map(r => api.rutina(nombre, r.id)));
    setRutinas((lista.rutinas || []).map((r, i) => ({
      id: r.id, nombre: r.nombre,
      ejercicios: detalles[i] && detalles[i].ok ? detalles[i].rutina.ejercicios : [],
    })));
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [nombre]);

  const v2 = v2Activa();
  const todos = useMemo(() => (rutinas ? armarGaleria(rutinas) : []), [rutinas]);
  const visibles = filtro === 'todas' ? todos : todos.filter(x => x.rutinas.includes(filtro));

  if (error) return <Fallo motivo={error} alReintentar={cargar} />;
  if (!rutinas) return <Cargando />;
  if (!todos.length) {
    return (
      <div>
        {!v2Activa() && <Titulo>Galería</Titulo>}
        <div style={{ marginTop: 14 }}>
          <Vacio icono="🎬" titulo="Aún no hay ejercicios"
            texto="Cuando tu coach te envíe el plan, aquí tienes cada ejercicio con su video." />
        </div>
      </div>
    );
  }

  return (
    <div>
      {!v2Activa() && <Titulo>Galería</Titulo>}
      <div style={{ color: v2 ? TEXT_LIGHT : TEXT_MUTED, fontSize: v2 ? 14 : 13.5 }}>
        {todos.length} ejercicio{todos.length === 1 ? '' : 's'} de tu plan{v2 ? '' : ' · toca uno para ver su video y lo que trabaja'}
      </div>

      {rutinas.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '14px -20px 2px', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
          {[{ id: 'todas', nombre: 'Todas' }, ...rutinas].map(r => {
            const activo = filtro === r.id;
            return (
              <button key={r.id} onClick={() => setFiltro(r.id)} style={{
                flex: 'none', border: v2 ? 'none' : `1px solid ${activo ? TEXT : BORDER}`, borderRadius: 999,
                background: activo ? TEXT : (v2 ? 'rgba(118,118,128,0.12)' : 'rgba(255,255,255,0.7)'), color: activo ? '#fff' : (v2 ? TEXT : TEXT_MUTED),
                padding: v2 ? '8px 15px' : '7px 13px', fontSize: v2 ? 14 : 13, fontWeight: v2 ? 650 : 700, fontFamily: 'inherit', cursor: 'pointer',
              }}>{r.nombre}</button>
            );
          })}
        </div>
      )}

      {v2 ? <EstantesV2 visibles={visibles} alAbrir={setAbierto} /> : <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 10, marginTop: 12,
      }}>
        {visibles.map(({ item }) => {
          const e = item.ejercicio;
          const img = miniatura(e);
          const musculos = (e.musculos_primarios || []).map(s => MUSCULO_POR_SLUG[s]?.corto).filter(Boolean);
          const fam = v2 ? FAMILIAS[familiaDe(e)] : null;
          const sub = fam && familiaDe(e) === 'fuerza' ? tipoFuerza(e) : null;
          return (
            <button key={e.id} data-familia={fam ? familiaDe(e) : undefined} data-fuerza={sub || undefined} onClick={() => setAbierto(item)} style={{
              // Visual nueva: sin borde; abajo del video, el color del tipo
              // (como las tarjetas de las cápsulas).
              textAlign: 'left', padding: 0, border: fam ? 'none' : `1px solid ${BORDER}`, borderRadius: 16,
              background: fam ? `linear-gradient(160deg, ${fam.fondo[0]}, ${fam.fondo[1]})` : SURFACE, boxShadow: SHADOW_CARD, overflow: 'hidden', cursor: 'pointer',
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
              <div style={{ position: 'relative', overflow: 'hidden', flex: 1, padding: '9px 10px 11px' }}>
                {/* El circulito de tono más suave, en la esquina de abajo a la izquierda */}
                {fam && <span aria-hidden="true" data-familia-circulo style={{ position: 'absolute', left: -34, bottom: -44, width: 112, height: 112, borderRadius: 99, background: 'rgba(255,255,255,0.13)', pointerEvents: 'none' }} />}
                <div style={{ position: 'relative' }}>
                  {fam && (
                    <div style={{ marginBottom: 5 }}>
                      <span data-familia-etiqueta style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.22)', color: '#FFFFFF', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>{fam.texto}</span>
                      {sub && <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.86)', marginTop: 3, marginLeft: 2 }}>{sub}</div>}
                    </div>
                  )}
                  <div style={{ fontSize: 13.5, fontWeight: 750, color: fam ? '#FFFFFF' : TEXT, lineHeight: 1.25 }}>{nombresEj(e).grande}</div>
                  {nombresEj(e).chico && <div style={{ fontSize: 11.5, color: fam ? 'rgba(255,255,255,0.8)' : TEXT_LIGHT, marginTop: 1, lineHeight: 1.25 }}>{nombresEj(e).chico}</div>}
                  {musculos.length > 0 && (
                    <div style={{ fontSize: 11.5, color: fam ? 'rgba(255,255,255,0.8)' : TEXT_LIGHT, marginTop: 3 }}>{musculos.slice(0, 2).join(' · ')}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>}

      <EntrenoFicha item={abierto} abierto={!!abierto} alCerrar={() => setAbierto(null)} />
    </div>
  );
}
