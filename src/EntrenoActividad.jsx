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
import { v2Activa } from './v2.js';
import { SECCION } from './theme.js';
import { IconoActividad } from './iconosEntreno.jsx';
import { leerUnidades } from './Unidades.jsx';
import { api, CATALOGO_MINIMO, hoyLocal, sumarDias, fechaLarga, DIAS_LARGO, numero } from './entrenoDatos.js';
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
  duracionInicial = null,   // lo que el coach le puso (minutos)
  otroInicial = '',         // si lo del coach no está en el catálogo
  nota = null,              // «De tu coach: …», arriba de todo
  opciones = null,          // cardio «a elegir» del coach: { lista, minutos, intensidad }
}) {
  const [catalogo, setCatalogo] = useState(null);
  const [tipo, setTipo] = useState(tipoInicial);
  const [fecha, setFecha] = useState(fechaInicial || hoyLocal());
  const [duracion, setDuracion] = useState('');
  const [distancia, setDistancia] = useState('');
  const [intensidad, setIntensidad] = useState(null);
  const [otroNombre, setOtroNombre] = useState('');
  // Con opciones del coach: cuál de ellas hizo (índice) y si quiere ver el
  // catálogo entero («hice otra cosa»).
  const [opcion, setOpcion] = useState(null);
  const [verTodo, setVerTodo] = useState(false);
  const conOpciones = !!(opciones && opciones.lista && opciones.lista.length);
  // Por contenido: si los datos se vuelven a pedir, el objeto cambia pero no
  // lo que dijo el coach, y no se le debe borrar lo que ya tocó.
  const claveOpciones = conOpciones ? JSON.stringify(opciones) : '';
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
    setDuracion(duracionInicial ? String(duracionInicial) : ''); setDistancia(''); setIntensidad(null);
    setOtroNombre(otroInicial || ''); setError(null);
    setOpcion(null); setVerTodo(false);
    if (opciones && opciones.lista && opciones.lista.length) {
      setTipo(null);
      setIntensidad(opciones.intensidad === 'alta' ? 'fuerte' : opciones.intensidad || null);
      if (!duracionInicial && opciones.minutos?.length) setDuracion('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, tipoInicial, fechaInicial, duracionInicial, otroInicial, claveOpciones]);

  const elegirOpcion = (i) => {
    if (opcion === i) { setOpcion(null); setTipo(null); return; }
    const o = opciones.lista[i];
    setOpcion(i); setVerTodo(false);
    setTipo(o.slug || 'otro'); setOtroNombre(o.slug ? '' : o.nombre);
  };

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
      // De las opciones del coach se guarda cuál fue («Caminadora trotando»).
      titulo: tipo === 'otro' ? otroNombre.trim() : (conOpciones && opcion != null ? opciones.lista[opcion].nombre : null),
      duracion_min: duracion || null,
      // La distancia se escribe en la unidad elegida (km o m) y se guarda en km.
      distancia_km: elegido?.pide_distancia && numero(distancia) != null
        ? (leerUnidades().distancia === 'm' ? numero(distancia) / 1000 : numero(distancia)) : null,
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
      {nota && (
        <div data-nota-coach style={{ fontSize: 13.5, color: TEXT_MUTED, background: SURFACE_2, borderRadius: 12, padding: '9px 12px', marginBottom: 14, lineHeight: 1.45 }}>
          {nota}
        </div>
      )}
      {!catalogo && <div style={{ color: TEXT_LIGHT, fontSize: 13.5, padding: '10px 0' }}>Cargando…</div>}

      {catalogo && (
        <>
          {/* Cardio a elegir: primero lo que propuso el coach, en grande. */}
          {conOpciones && (
            <div data-opciones-elegir style={{ marginBottom: 14 }}>
              <div style={rotulo}>¿Cuál hiciste?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {opciones.lista.map((o, i) => {
                  const si = opcion === i;
                  const A = SECCION.entreno;
                  return (
                    <button key={o.nombre} data-opcion={i} onClick={() => elegirOpcion(i)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
                      border: `1.5px solid ${si ? A.base : BORDER}`, background: si ? A.tint : SURFACE,
                      borderRadius: 14, padding: '11px 13px', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 15, fontWeight: si ? 750 : 600, color: si ? A.ink : TEXT,
                    }}>
                      <IconoActividad slug={o.slug} size={19} />
                      <span style={{ flex: 1 }}>{o.nombre}</span>
                      {si && <span aria-hidden style={{ fontWeight: 800 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {!verTodo && (
                <button data-hice-otra onClick={() => { setVerTodo(true); setOpcion(null); setTipo(null); }} style={{
                  marginTop: 8, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13.5, fontWeight: 650, color: TEXT_MUTED, textDecoration: 'underline',
                }}>Hice otra cosa</button>
              )}
            </div>
          )}
          {(!conOpciones || verTodo) && Object.entries(porCategoria).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              {NOMBRES_CATEGORIA[cat] && (
                <div style={rotulo}>{NOMBRES_CATEGORIA[cat]}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {items.map(x => (
                  <button key={x.slug} onClick={() => setTipo(x.slug === tipo ? null : x.slug)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      border: `1px solid ${x.slug === tipo ? (v2Activa() ? SECCION.entreno.base : ACCENT) : BORDER}`,
                      background: x.slug === tipo ? (v2Activa() ? SECCION.entreno.tint : ACCENT_LIGHT) : 'transparent',
                      color: x.slug === tipo ? (v2Activa() ? SECCION.entreno.ink : ACCENT_DARK) : TEXT,
                      borderRadius: 999, padding: '7px 13px', fontSize: 13.5,
                      fontWeight: x.slug === tipo ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {v2Activa() ? <IconoActividad slug={x.slug} categoria={x.categoria} size={17} /> : <span aria-hidden>{x.icono}</span>}{x.nombre}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {tipo === 'otro' && !(conOpciones && opcion != null) && (
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

              {/* Los tiempos que sugirió el coach, a un toque. */}
              {conOpciones && opciones.minutos?.length > 0 && (
                <div data-minutos-sugeridos style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {opciones.minutos.map(mn => {
                    const si = String(mn) === String(duracion);
                    return (
                      <button key={mn} onClick={() => setDuracion(si ? '' : String(mn))} style={{
                        border: `1.5px solid ${si ? SECCION.entreno.base : BORDER}`, background: si ? SECCION.entreno.tint : SURFACE,
                        color: si ? SECCION.entreno.ink : TEXT, borderRadius: 999, padding: '7px 13px', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 14, fontWeight: si ? 750 : 600,
                      }}>{mn} min</button>
                    );
                  })}
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
                    <div style={rotulo}>{leerUnidades().distancia === 'm' ? 'Metros' : 'Kilómetros'}</div>
                    <input inputMode="decimal" value={distancia} placeholder={leerUnidades().distancia === 'm' ? '5000' : '5'}
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
    actividad.distancia_km ? (leerUnidades().distancia === 'm' ? `${Math.round(actividad.distancia_km * 1000)} m` : `${actividad.distancia_km} km`) : null,
  ].filter(Boolean).join(' · ');
  return (
    <button onClick={onClick} disabled={!onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7, width: '100%',
      border: `1px solid ${BORDER_SOFT}`, background: SURFACE_2,
      borderRadius: 12, padding: '8px 11px', cursor: onClick ? 'pointer' : 'default',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      {v2Activa()
        ? <span style={{ color: TEXT_MUTED, display: 'inline-flex' }}><IconoActividad slug={actividad.tipo} categoria={c?.categoria} size={17} /></span>
        : <span aria-hidden style={{ fontSize: 15 }}>{c?.icono || '✨'}</span>}
      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_MUTED, flex: 1, minWidth: 0 }}>{etiqueta}</span>
      {detalle && <span style={{ fontSize: 11.5, color: TEXT_LIGHT }}>{detalle}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LO QUE TE PUSO TU COACH (cardio, deportes) · con su «Ya lo hice»
//
// Sale en el calendario, en Hoy y, si es de DESPUÉS DE ENTRENAR, dentro de la
// rutina: al terminar la fuerza y antes del estiramiento. Marcarlo lo
// registra ligado a lo que puso el coach, y así cuenta en su semana y el
// coach lo ve hecho. No se marca lo que todavía no llega.
// ─────────────────────────────────────────────────────────────────────────
export function TarjetaCardioCoach({ ev, fecha, nombre, sesionId = null, alCambio, enRutina = false }) {
  const [abierta, setAbierta] = useState(false);
  const [hecho, setHecho] = useState(!!ev.hecho);
  useEffect(() => { setHecho(!!ev.hecho); }, [ev.hecho, ev.id]);
  const futuro = fecha > hoyLocal();
  // Las semanas que ya pasaron quedan como quedaron (el servidor tampoco deja).
  const lunes = (() => { const h = hoyLocal(); const d = new Date(h + 'T12:00:00'); return sumarDias(h, -((d.getDay() + 6) % 7)); })();
  const cerrada = fecha < lunes;
  const v2 = v2Activa();
  const A = SECCION.entreno;
  const cuanto = ev.duracion_min ? `${ev.duracion_min} min` : null;
  const op = ev.opciones && ev.opciones.lista && ev.opciones.lista.length ? ev.opciones : null;
  if (op) return (
    <TarjetaCardioOpciones ev={ev} op={op} fecha={fecha} nombre={nombre} sesionId={sesionId} alCambio={alCambio}
      enRutina={enRutina} hecho={hecho} setHecho={setHecho} abierta={abierta} setAbierta={setAbierta} futuro={futuro} cerrada={cerrada} />
  );
  return (
    <>
      <div data-cardio-coach={ev.id} data-hecho={hecho ? 'si' : 'no'} style={{
        display: 'flex', alignItems: 'center', gap: 11,
        border: hecho ? `1px solid ${BORDER_SOFT}` : `1.5px solid ${v2 ? A.base : ACCENT}`,
        background: hecho ? SURFACE_2 : SURFACE, borderRadius: 16, padding: enRutina ? '13px 14px' : '11px 13px',
        margin: enRutina ? '10px 0 12px' : 0,
      }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
          background: hecho ? '#E3F1E6' : (v2 ? A.tint : ACCENT_LIGHT), color: hecho ? '#2F7F45' : (v2 ? A.ink : ACCENT_DARK) }}>
          <IconoActividad slug={ev.slug} size={19} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: TEXT_LIGHT }}>
            {enRutina ? 'Ahora: tu cardio · antes de estirar' : ev.despues ? 'Después de entrenar · de tu coach' : 'De tu coach'}
          </div>
          <div style={{ fontSize: 15, fontWeight: 750, color: TEXT, lineHeight: 1.25, marginTop: 2 }}>
            {ev.hora ? `${String(ev.hora).slice(0, 5)} · ` : ''}{ev.titulo}{cuanto ? <span style={{ fontWeight: 500, color: TEXT_MUTED }}> · {cuanto}</span> : null}
          </div>
          {ev.detalle && <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2, lineHeight: 1.4 }}>{ev.detalle}</div>}
        </div>
        {hecho ? (
          <span data-cardio-hecho style={{ flexShrink: 0, fontSize: 13, fontWeight: 750, color: '#2F7F45' }}>✓ Hecho</span>
        ) : !futuro && !cerrada && (
          <button data-ya-lo-hice onClick={() => setAbierta(true)} style={{
            flexShrink: 0, border: 0, borderRadius: 999, padding: '9px 13px', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13.5, fontWeight: 750, background: v2 ? '#1D1D1F' : ACCENT, color: '#fff',
          }}>Ya lo hice</button>
        )}
      </div>
      <Actividad
        abierta={abierta} nombre={nombre} fecha={fecha} sesionId={sesionId} eventoId={ev.id}
        tipoInicial={ev.slug || 'otro'} otroInicial={ev.slug ? '' : ev.titulo} duracionInicial={ev.duracion_min}
        titulo={ev.titulo}
        nota={<>De tu coach: <b style={{ color: TEXT }}>{ev.titulo}</b>{cuanto ? ` · ${cuanto}` : ''}{ev.detalle ? ` · ${ev.detalle}` : ''}</>}
        alCerrar={() => setAbierta(false)}
        alGuardar={() => { setAbierta(false); setHecho(true); alCambio?.(); }}
      />
    </>
  );
}

// El formulario del cardio del coach, directo (sin pasar por la tarjeta):
// lo usa «Tu semana» al tocar el cardio de un día.
export function HojaCardioCoach({ ev, fecha, nombre, abierta, alCerrar, alGuardar }) {
  if (!ev) return null;
  const op = ev.opciones && ev.opciones.lista && ev.opciones.lista.length ? ev.opciones : null;
  const intensidad = op && op.intensidad ? INTENSIDAD_COACH[op.intensidad] : null;
  const cuanto = (op && textoMinutos(op.minutos)) || (ev.duracion_min ? `${ev.duracion_min} min` : null);
  return (
    <Actividad
      abierta={abierta} nombre={nombre} fecha={fecha} eventoId={ev.id}
      tipoInicial={op ? null : (ev.slug || 'otro')} otroInicial={op || ev.slug ? '' : ev.titulo} duracionInicial={ev.duracion_min}
      titulo={ev.titulo} opciones={op}
      nota={<>De tu coach: <b style={{ color: TEXT }}>{ev.titulo}</b>{cuanto ? ` · ${cuanto}` : ''}{intensidad ? ` · ${intensidad[0].toLowerCase()}` : ''}{!op && ev.detalle ? ` · ${ev.detalle}` : ''}</>}
      alCerrar={alCerrar} alGuardar={alGuardar}
    />
  );
}

// ── Cardio a elegir: «Caminadora trotando o con inclinación o bicicleta» ──
// El coach deja varias opciones, unos tiempos y la intensidad; el cliente
// elige UNA. Que se lea de un vistazo: cada opción en su píldora con «o»
// entre ellas, el tiempo y qué quiere decir «moderado».
const INTENSIDAD_COACH = {
  suave: ['Suave', 'puedes hablar sin problema'],
  moderada: ['Moderada', 'puedes hablar, pero te cuesta cantar'],
  alta: ['Alta', 'te cuesta hablar'],
};
const textoMinutos = (ms) => {
  if (!ms || !ms.length) return null;
  if (ms.length === 1) return `${ms[0]} min`;
  return `${ms.slice(0, -1).join(', ')} o ${ms[ms.length - 1]} min`;
};
function TarjetaCardioOpciones({ ev, op, fecha, nombre, sesionId, alCambio, enRutina, hecho, setHecho, abierta, setAbierta, futuro, cerrada }) {
  const v2 = v2Activa();
  const A = SECCION.entreno;
  const intensidad = op.intensidad ? INTENSIDAD_COACH[op.intensidad] : null;
  const minutos = textoMinutos(op.minutos) || (ev.duracion_min ? `${ev.duracion_min} min` : null);
  return (
    <>
      <div data-cardio-coach={ev.id} data-cardio-opciones data-hecho={hecho ? 'si' : 'no'} style={{
        border: hecho ? `1px solid ${BORDER_SOFT}` : `1.5px solid ${v2 ? A.base : ACCENT}`,
        background: hecho ? SURFACE_2 : SURFACE, borderRadius: 16, padding: enRutina ? '13px 14px' : '12px 13px',
        margin: enRutina ? '10px 0 12px' : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: hecho ? '#E3F1E6' : (v2 ? A.tint : ACCENT_LIGHT), color: hecho ? '#2F7F45' : (v2 ? A.ink : ACCENT_DARK) }}>
            <IconoActividad slug={op.lista[0].slug || ev.slug} size={19} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: TEXT_LIGHT }}>
              {enRutina ? 'Ahora: tu cardio · antes de estirar' : 'De tu coach · elige una'}
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 750, color: TEXT, lineHeight: 1.25, marginTop: 2 }}>
              {ev.hora ? `${String(ev.hora).slice(0, 5)} · ` : ''}{ev.titulo}
            </div>
          </div>
          {hecho && <span data-cardio-hecho style={{ flexShrink: 0, fontSize: 13, fontWeight: 750, color: '#2F7F45' }}>✓ Hecho</span>}
        </div>
        <div data-cardio-lista style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 }}>
          {op.lista.map((o, i) => (
            <React.Fragment key={o.nombre}>
              {i > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_LIGHT }}>o</span>}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999,
                background: hecho ? 'transparent' : (v2 ? A.tint : ACCENT_LIGHT), border: hecho ? `1px solid ${BORDER_SOFT}` : '1px solid transparent',
                color: hecho ? TEXT_MUTED : (v2 ? A.ink : ACCENT_DARK), fontSize: 13.5, fontWeight: 650 }}>
                <IconoActividad slug={o.slug} size={15} />{o.nombre}
              </span>
            </React.Fragment>
          ))}
        </div>
        {(minutos || intensidad) && (
          <div data-cardio-cuanto style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 9, lineHeight: 1.4 }}>
            {minutos && <><b style={{ color: TEXT, fontWeight: 700 }}>{minutos}</b></>}
            {minutos && intensidad && ' · '}
            {intensidad && <><b style={{ color: TEXT, fontWeight: 700 }}>{intensidad[0].toLowerCase() === 'moderada' ? 'Ritmo moderado' : `Intensidad ${intensidad[0].toLowerCase()}`}</b>: {intensidad[1]}.</>}
          </div>
        )}
        {ev.detalle && <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.4 }}>{ev.detalle}</div>}
        {!hecho && !futuro && !cerrada && (
          <button data-ya-lo-hice onClick={() => setAbierta(true)} style={{
            marginTop: 11, width: '100%', border: 0, borderRadius: 999, padding: '10px 13px', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14.5, fontWeight: 750, background: v2 ? '#1D1D1F' : ACCENT, color: '#fff',
          }}>Ya lo hice</button>
        )}
      </div>
      <Actividad
        abierta={abierta} nombre={nombre} fecha={fecha} sesionId={sesionId} eventoId={ev.id}
        tipoInicial={null} otroInicial="" duracionInicial={ev.duracion_min}
        titulo={ev.titulo} opciones={op}
        nota={<>De tu coach: <b style={{ color: TEXT }}>{ev.titulo}</b>{minutos ? ` · ${minutos}` : ''}{intensidad ? ` · ${intensidad[0].toLowerCase()}` : ''}</>}
        alCerrar={() => setAbierta(false)}
        alGuardar={() => { setAbierta(false); setHecho(true); alCambio?.(); }}
      />
    </>
  );
}
