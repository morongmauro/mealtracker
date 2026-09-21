// ─────────────────────────────────────────────────────────────────────────
// REGISTRAR ACTIVIDAD COMPLEMENTARIA
//
// Cardio, deportes, caminatas: todo lo que el cliente hace además de la
// rutina de fuerza. Se abre desde tres sitios, y eso es a propósito:
//
//   · al terminar una rutina  → "¿hiciste cardio al terminar?" (modo remate)
//   · desde Hoy               → el botón de siempre
//   · tocando un día del mes  → para marcar algo de otro día
//
// El coach le programa unos deportes a cada cliente, pero marcar en un día
// distinto tiene que ser igual de fácil: la gente no nada siempre el martes.
// Por eso la fecha se puede cambiar aquí mismo y no hay que ir a ningún
// sitio especial.
//
// NO SE REGISTRA EN EL FUTURO. Marcar la caminata de la semana que viene
// descuadraría la adherencia de una semana que todavía no pasó — el
// endpoint lo rechaza y aquí el selector ni lo ofrece.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { api, CATALOGO_MINIMO, hoyLocal, sumarDias, fechaLarga, DIAS_LARGO } from './entrenoDatos.js';
import { Hoja, Boton, Chip, ACCENT, ACCENT_LIGHT, ACCENT_DARK, SURFACE, SURFACE_2,
         BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT } from './entrenoUI.jsx';

const INTENSIDADES = [
  ['suave', 'Suave', 'podía hablar sin problema'],
  ['moderada', 'Moderada', 'me costaba hablar'],
  ['fuerte', 'Fuerte', 'no podía hablar'],
];

export default function Actividad({
  abierta, nombre, alCerrar, alGuardar,
  fecha: fechaInicial = null,
  sesionId = null,
  eventoId = null,
  tipoInicial = null,
  soloRemate = false,       // al cerrar la fuerza: solo lo que se hace ahí mismo
  titulo = 'Registrar actividad',
}) {
  const [catalogo, setCatalogo] = useState(null);
  const [tipo, setTipo] = useState(tipoInicial);
  const [fecha, setFecha] = useState(fechaInicial || hoyLocal());
  const [duracion, setDuracion] = useState('');
  const [distancia, setDistancia] = useState('');
  const [intensidad, setIntensidad] = useState(null);
  const [otroNombre, setOtroNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // El catálogo se pide una sola vez y se queda: no cambia entre aperturas.
  useEffect(() => {
    if (!abierta || catalogo) return;
    let vivo = true;
    api.catalogo(nombre).then(r => {
      if (!vivo) return;
      setCatalogo(r.ok && r.catalogo?.length ? r.catalogo : CATALOGO_MINIMO);
    });
    return () => { vivo = false; };
  }, [abierta, catalogo, nombre]);

  // Cada apertura empieza limpia: quedaría la duración de la vez anterior.
  useEffect(() => {
    if (!abierta) return;
    setTipo(tipoInicial);
    setFecha(fechaInicial || hoyLocal());
    setDuracion(''); setDistancia(''); setIntensidad(null);
    setOtroNombre(''); setError(null);
  }, [abierta, tipoInicial, fechaInicial]);

  const lista = useMemo(() => {
    const c = catalogo || [];
    return soloRemate ? c.filter(x => x.remate || x.slug === 'otro') : c;
  }, [catalogo, soloRemate]);

  const porCategoria = useMemo(() => {
    const g = {};
    lista.forEach(x => { (g[x.categoria] ||= []).push(x); });
    return g;
  }, [lista]);

  const elegido = lista.find(x => x.slug === tipo);

  const guardar = async () => {
    if (!tipo) return;
    setGuardando(true); setError(null);
    const r = await api.actividad(nombre, {
      tipo, fecha,
      titulo: tipo === 'otro' ? otroNombre.trim() : null,
      duracion_min: duracion || null,
      distancia_km: elegido?.pide_distancia ? (distancia || null) : null,
      intensidad,
      sesion_id: sesionId, evento_id: eventoId,
    });
    setGuardando(false);
    if (!r.ok) {
      setError(r.motivo === 'sin_tabla'
        ? 'Todavía no puedo guardar actividades. Avísale a tu coach.'
        : r.motivo === 'fecha_futura'
          ? 'No puedes registrar algo que aún no ha pasado.'
          : 'No se pudo guardar. Intenta otra vez.');
      return;
    }
    alGuardar?.(r.actividad);
  };

  // Los últimos siete días: es todo lo que hace falta para "se me olvidó
  // marcar lo del sábado". Más atrás, el coach lo mete desde el CRM.
  const dias = useMemo(() => {
    const hoy = hoyLocal();
    return Array.from({ length: 7 }, (_, i) => sumarDias(hoy, -i));
  }, []);

  const NOMBRES_CATEGORIA = { cardio: 'Cardio', deporte: 'Deportes', movilidad: 'Movilidad', otro: '' };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={titulo}>
      {!catalogo && <div style={{ color: TEXT_LIGHT, fontSize: 13.5, padding: '10px 0' }}>Cargando…</div>}

      {catalogo && (
        <>
          {Object.entries(porCategoria).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              {NOMBRES_CATEGORIA[cat] && (
                <div style={rotulo}>{NOMBRES_CATEGORIA[cat]}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {items.map(x => (
                  <button key={x.slug} onClick={() => setTipo(x.slug === tipo ? null : x.slug)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      border: `1px solid ${x.slug === tipo ? ACCENT : BORDER}`,
                      background: x.slug === tipo ? ACCENT_LIGHT : 'transparent',
                      color: x.slug === tipo ? ACCENT_DARK : TEXT,
                      borderRadius: 999, padding: '7px 13px', fontSize: 13.5,
                      fontWeight: x.slug === tipo ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <span aria-hidden>{x.icono}</span>{x.nombre}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {tipo === 'otro' && (
            <input
              value={otroNombre} onChange={(e) => setOtroNombre(e.target.value)}
              placeholder="¿Qué hiciste?" style={{ ...campo, marginBottom: 14 }} />
          )}

          {tipo && (
            <>
              {/* Fecha: solo si no viene fijada de fuera */}
              {!fechaInicial && !sesionId && (
                <>
                  <div style={rotulo}>Cuándo</div>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
                    {dias.map(f => {
                      const activo = f === fecha;
                      const hoy = f === hoyLocal();
                      return (
                        <button key={f} onClick={() => setFecha(f)} style={{
                          flexShrink: 0, border: `1px solid ${activo ? ACCENT : BORDER}`,
                          background: activo ? ACCENT_LIGHT : 'transparent',
                          color: activo ? ACCENT_DARK : TEXT_MUTED,
                          borderRadius: 12, padding: '7px 12px', cursor: 'pointer',
                          fontSize: 12.5, fontWeight: activo ? 700 : 500, fontFamily: 'inherit',
                          lineHeight: 1.3, textAlign: 'center',
                        }}>
                          {hoy ? 'Hoy' : DIAS_LARGO[['L','M','X','J','V','S','D'][(new Date(f + 'T00:00:00').getDay() + 6) % 7]].slice(0, 3)}
                          <br />
                          <span style={{ fontSize: 10.5, opacity: .75 }}>{f.slice(8)}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {(fechaInicial || sesionId) && (
                <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginBottom: 14 }}>
                  {sesionId ? 'Se guardará junto a tu entrenamiento de hoy.' : fechaLarga(fecha)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <label style={{ flex: 1 }}>
                  <div style={rotulo}>Minutos</div>
                  <input inputMode="numeric" value={duracion} placeholder="30"
                         onChange={(e) => setDuracion(e.target.value.replace(/[^\d]/g, ''))}
                         style={campo} />
                </label>
                {elegido?.pide_distancia && (
                  <label style={{ flex: 1 }}>
                    <div style={rotulo}>Kilómetros</div>
                    <input inputMode="decimal" value={distancia} placeholder="5"
                           onChange={(e) => setDistancia(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
                           style={campo} />
                  </label>
                )}
              </div>

              <div style={rotulo}>Intensidad</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                {INTENSIDADES.map(([id, lab, pista]) => (
                  <button key={id} onClick={() => setIntensidad(id === intensidad ? null : id)}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 8, textAlign: 'left',
                      border: `1px solid ${id === intensidad ? ACCENT : BORDER}`,
                      background: id === intensidad ? ACCENT_LIGHT : 'transparent',
                      borderRadius: 12, padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    <b style={{ fontSize: 13.5, color: id === intensidad ? ACCENT_DARK : TEXT }}>{lab}</b>
                    <span style={{ fontSize: 12, color: TEXT_LIGHT }}>{pista}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 13, color: '#C75A4A', margin: '10px 0' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
            {soloRemate && (
              <Boton variante="suave" ancho onClick={alCerrar}>No hice</Boton>
            )}
            <Boton ancho variante="marca" disabled={!tipo || guardando || (tipo === 'otro' && !otroNombre.trim())}
                   onClick={guardar}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Boton>
          </div>

          <div style={{ fontSize: 11.5, color: TEXT_LIGHT, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            Solo el tipo es obligatorio. Los minutos y la intensidad ayudan a tu coach,
            pero si no te acuerdas, déjalos en blanco.
          </div>
        </>
      )}
    </Hoja>
  );
}

const rotulo = {
  fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
  color: TEXT_LIGHT, marginBottom: 7,
};

const campo = {
  width: '100%', border: `1px solid ${BORDER}`, borderRadius: 12,
  // 16px: por debajo, Safari hace zoom al enfocar y descoloca la hoja.
  padding: '10px 12px', fontSize: 16, fontFamily: 'inherit',
  color: TEXT, background: SURFACE, WebkitAppearance: 'none',
};

// ── Una actividad ya registrada, como se ve en las listas ───────────────
export function ChipActividad({ actividad, catalogo, onClick }) {
  const c = (catalogo || CATALOGO_MINIMO).find(x => x.slug === actividad.tipo);
  const etiqueta = actividad.titulo || c?.nombre || actividad.tipo;
  const detalle = [
    actividad.duracion_min ? `${actividad.duracion_min} min` : null,
    actividad.distancia_km ? `${actividad.distancia_km} km` : null,
  ].filter(Boolean).join(' · ');
  return (
    <button onClick={onClick} disabled={!onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7, width: '100%',
      border: `1px solid ${BORDER_SOFT}`, background: SURFACE_2,
      borderRadius: 12, padding: '8px 11px', cursor: onClick ? 'pointer' : 'default',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      <span aria-hidden style={{ fontSize: 15 }}>{c?.icono || '✨'}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MUTED, flex: 1, minWidth: 0 }}>{etiqueta}</span>
      {detalle && <span style={{ fontSize: 11.5, color: TEXT_LIGHT }}>{detalle}</span>}
    </button>
  );
}
