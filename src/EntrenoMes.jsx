// ─────────────────────────────────────────────────────────────────────────
// EL MES
//
// Para ver de un golpe si está cumpliendo. Un mes dice lo que una semana no:
// que llevas tres lunes seguidos sin entrenar, o que el plan empieza el 5.
//
// LA JERARQUÍA, OTRA VEZ
// ----------------------
// En cada casilla la rutina de fuerza es un bloque de color con el nombre. El
// cardio, los deportes y los eventos son PUNTOS, sin texto. Se ven, dicen que
// ese día pasó algo, y no compiten. Lo que el coach pidió REGISTRAR (medición
// corporal, peso, fotos) lleva su ícono: es una tarea, no un adorno.
//
// El texto aparece al tocar el día, en la hoja de abajo: ahí caben los
// nombres, los botones para registrar, y «mover a otro día».
//
// MOVER UNA RUTINA
// ----------------
// «El martes no puedo.» Se mantiene el dedo sobre la rutina y se arrastra a
// otro día; o, desde la hoja del día, «Mover a otro día». Cambia SOLO esa
// fecha: el plan semanal del coach no se toca. Si el destino tenía rutina,
// se intercambian.
//
// Visual nueva (v2): azul de Entrenamiento en vez de oliva, letra más grande
// en las casillas, íconos de línea y, debajo, «Lo que viene»: los próximos
// días con el nombre completo de cada cosa, que en una casilla no se lee.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, CaretRight, ArrowsLeftRight, Plus } from '@phosphor-icons/react';
import { api, hoyLocal, MESES, DIAS_CORTO, fechaLarga, CATALOGO_MINIMO, sumarDias, aFecha } from './entrenoDatos.js';
import Actividad, { ChipActividad } from './EntrenoActividad.jsx';
import { IconoEvento, REGISTRO } from './iconosEntreno.jsx';
import { v2Activa } from './v2.js';
import { SECCION } from './theme.js';
import { Card, Boton, Titulo, Hoja, Cargando, Fallo, Marca, MARCAS,
         ACCENT, ACCENT_DARK, ACCENT_LIGHT, SURFACE, BORDER, BORDER_SOFT,
         TEXT, TEXT_MUTED, TEXT_LIGHT } from './entrenoUI.jsx';

const ACCENT_PASTEL_SUAVE = '#E7EBD6';
const MORADO = '#6D4FC2';          // lo que se registra: medición, peso, fotos

function paleta(v2) {
  return v2
    ? { base: SECCION.entreno.base, ink: SECCION.entreno.ink, tint: SECCION.entreno.tint, suave: '#E4EDF9' }
    : { base: ACCENT, ink: ACCENT_DARK, tint: ACCENT_LIGHT, suave: ACCENT_PASTEL_SUAVE };
}

const DIA_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diaCorto = (f) => { const d = aFecha(f); return `${DIA_SEMANA[d.getDay()]} ${d.getDate()}`; };

export default function Mes({ nombre, alEntrenar }) {
  const v2 = v2Activa();
  const P = paleta(v2);
  const [ym, setYm] = useState(hoyLocal().slice(0, 7));
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);     // la FECHA cuya hoja está abierta
  const [registrando, setRegistrando] = useState(null);
  const [catalogo, setCatalogo] = useState(null);
  const [aviso, setAviso] = useState(null);         // texto corto tras mover
  const [arrastre, setArrastreEstado] = useState(null);   // { desde, nombre, x, y, sobre }
  // Copia en un ref: soltar lee el valor actual sin meter el envío dentro de
  // un actualizador de estado (React puede llamarlo dos veces y movía dos veces).
  const arrastreRef = useRef(null);
  const setArrastre = (v) => { arrastreRef.current = typeof v === 'function' ? v(arrastreRef.current) : v; setArrastreEstado(arrastreRef.current); };

  const cargar = async (mes = ym) => {
    setError(null);
    const r = await api.mes(nombre, mes);
    if (!r.ok) { setError(r.motivo || 'error'); return; }
    setDatos(r);
  };
  useEffect(() => { setDatos(null); cargar(ym); /* eslint-disable-next-line */ }, [ym, nombre]);
  useEffect(() => {
    api.catalogo(nombre).then(r => setCatalogo(r.ok && r.catalogo?.length ? r.catalogo : CATALOGO_MINIMO));
  }, [nombre]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3200); return () => clearTimeout(t); }, [aviso]);

  const mover = (delta) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // La rejilla arranca el lunes de la semana del día 1 para que el mes
  // siempre sean filas completas de siete.
  const celdas = useMemo(() => {
    if (!datos) return [];
    const dias = datos.dias;
    if (!dias.length) return [];
    const primera = new Date(dias[0].fecha + 'T00:00:00');
    const huecos = (primera.getDay() + 6) % 7;
    return [...Array.from({ length: huecos }, () => null), ...dias];
  }, [datos]);
  const porFecha = useMemo(() => Object.fromEntries((datos?.dias || []).map(d => [d.fecha, d])), [datos]);

  const hoy = hoyLocal();
  const puedeMover = (d) => !!(d && d.rutina && !d.hecho && d.estado !== 'completada' && d.fecha >= hoy);

  const moverRutina = async (desde, hasta) => {
    const d = porFecha[desde];
    if (!d || !d.rutina || desde === hasta) return;
    const r = await api.mover(nombre, { desde, hasta, rutina_id: d.rutina.id });
    if (!r.ok) {
      setAviso({
        pasado: 'Solo se mueven días de hoy en adelante.',
        fuera_de_fase: 'Ese día está fuera de tu fase.',
        ya_entrenada: 'Ese día ya tiene un entreno hecho.',
        sin_tabla: 'Mover días aún no está disponible. Avísale a tu coach.',
      }[r.motivo] || 'No se pudo mover. Inténtalo otra vez.');
      return;
    }
    setAviso(r.intercambio
      ? `${r.movida.nombre} ↔ ${r.intercambio.nombre}`
      : `${r.movida.nombre} → ${fechaLarga(hasta)}`);
    setAbierto(null);
    cargar(ym);
  };

  // ── Arrastrar con el dedo ──
  // Se mantiene el dedo ~0,35 s sobre la rutina (así el scroll normal sigue
  // funcionando) y se suelta sobre otro día. Funciona igual con ratón.
  const presion = useRef(null);
  const empezar = (d, e) => {
    if (!puedeMover(d)) return;
    const x = e.clientX, y = e.clientY;
    presion.current = { t: setTimeout(() => {
      presion.current = { activo: true };
      if (navigator.vibrate) try { navigator.vibrate(10); } catch (er) {}
      setArrastre({ desde: d.fecha, nombre: d.rutina.nombre, x, y, sobre: null });
    }, 350), x, y };
  };
  useEffect(() => {
    const mueve = (e) => {
      const p = presion.current;
      if (!p) return;
      if (!p.activo) {
        // Se movió antes del tiempo: es scroll, no arrastre.
        if (Math.abs(e.clientX - p.x) > 8 || Math.abs(e.clientY - p.y) > 8) { clearTimeout(p.t); presion.current = null; }
        return;
      }
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const celda = el && el.closest && el.closest('[data-fecha]');
      setArrastre(a => a && { ...a, x: e.clientX, y: e.clientY, sobre: celda ? celda.getAttribute('data-fecha') : null });
    };
    const suelta = () => {
      const p = presion.current;
      presion.current = null;
      if (p && !p.activo) { clearTimeout(p.t); return; }
      const a = arrastreRef.current;
      setArrastre(null);
      if (a && a.sobre && a.sobre !== a.desde) moverRutina(a.desde, a.sobre);
    };
    window.addEventListener('pointermove', mueve, { passive: false });
    window.addEventListener('pointerup', suelta);
    window.addEventListener('pointercancel', suelta);
    return () => {
      window.removeEventListener('pointermove', mueve);
      window.removeEventListener('pointerup', suelta);
      window.removeEventListener('pointercancel', suelta);
    };
    // eslint-disable-next-line
  }, [porFecha]);

  const [y, m] = ym.split('-').map(Number);
  const diaAbierto = abierto ? porFecha[abierto] : null;

  // «Lo que viene»: de hoy a 7 días, lo que tenga algo.
  const viene = useMemo(() => {
    if (!v2 || !datos) return [];
    return Array.from({ length: 7 }, (_, i) => porFecha[sumarDias(hoy, i)]).filter(d => d && (d.rutina || d.eventos.length));
  }, [v2, datos, porFecha, hoy]);

  return (
    <div style={{ touchAction: arrastre ? 'none' : undefined }}>
      <Titulo>Tu mes</Titulo>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        margin: '10px 0 14px',
      }}>
        <button onClick={() => mover(-1)} aria-label="Mes anterior" style={flecha}>‹</button>
        <div style={{ fontWeight: 800, fontSize: v2 ? 17 : 15, textTransform: 'capitalize' }}>
          {MESES[m - 1]} {y}
        </div>
        <button onClick={() => mover(1)} aria-label="Mes siguiente" style={flecha}>›</button>
      </div>

      {error && <Fallo motivo={error} alReintentar={() => cargar(ym)} />}
      {!datos && !error && <Cargando />}

      {datos && (
        <>
          {datos.fase && (
            <div style={{ fontSize: v2 ? 14 : 12.5, color: TEXT_MUTED, marginBottom: 10, textAlign: 'center' }}>
              <b>{datos.fase.nombre}</b> · {fechaLarga(datos.fase.desde)} a {fechaLarga(datos.fase.hasta)}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 5 }}>
            {DIAS_CORTO.map(d => (
              <div key={d} style={{
                fontSize: v2 ? 11 : 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
                color: TEXT_LIGHT, textAlign: 'center',
              }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {celdas.map((d, i) => d
              ? <Celda key={d.fecha} dia={d} P={P} v2={v2}
                  sobre={arrastre && arrastre.sobre === d.fecha && arrastre.desde !== d.fecha}
                  origen={arrastre && arrastre.desde === d.fecha}
                  alTocar={() => { if (!arrastre) setAbierto(d.fecha); }}
                  alPresionar={(e) => empezar(d, e)} />
              : <div key={`h${i}`} />)}
          </div>

          <Leyenda P={P} v2={v2} />
          {v2 && <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 6 }}>
            Mantén el dedo sobre una rutina y arrástrala para cambiarla de día.
          </div>}

          {viene.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: TEXT, letterSpacing: '-0.015em', marginBottom: 10 }}>Lo que viene</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {viene.map(d => <FilaViene key={d.fecha} dia={d} P={P} hoy={hoy} alTocar={() => setAbierto(d.fecha)} />)}
              </div>
            </div>
          )}
        </>
      )}

      {arrastre && (
        <div aria-hidden style={{
          position: 'fixed', left: arrastre.x, top: arrastre.y, transform: 'translate(-50%, -130%)', zIndex: 90,
          pointerEvents: 'none', background: P.base, color: '#fff', borderRadius: 10, padding: '6px 10px',
          fontSize: 13, fontWeight: 800, boxShadow: '0 8px 22px rgba(30,40,60,0.28)', whiteSpace: 'nowrap',
        }}>{arrastre.nombre}</div>
      )}

      {aviso && (
        <div role="status" style={{
          position: 'fixed', left: '50%', bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)',
          zIndex: 70, background: TEXT, color: '#fff', borderRadius: 999, padding: '10px 16px',
          fontSize: 14, fontWeight: 650, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: '88vw', textAlign: 'center',
        }}>{aviso}</div>
      )}

      <HojaDia
        dia={diaAbierto}
        P={P} v2={v2}
        nombre={nombre}
        catalogo={catalogo}
        porFecha={porFecha}
        puedeMover={puedeMover(diaAbierto)}
        alCerrar={() => setAbierto(null)}
        alEntrenar={(id) => { setAbierto(null); alEntrenar(id); }}
        alRegistrar={(fecha) => { setAbierto(null); setRegistrando(fecha); }}
        alMover={(hasta) => moverRutina(abierto, hasta)}
        alCambio={() => cargar(ym)}
      />

      <Actividad
        abierta={!!registrando}
        nombre={nombre}
        fecha={registrando}
        alCerrar={() => setRegistrando(null)}
        alGuardar={() => { setRegistrando(null); cargar(ym); }}
      />
    </div>
  );
}

// ── Una casilla ──────────────────────────────────────────────────────────
function Celda({ dia, P, v2, sobre, origen, alTocar, alPresionar }) {
  const hayRutina = !!dia.rutina;
  // Si ese día entrenó otra rutina, la casilla enseña lo que HIZO: el mes es
  // el registro de lo que pasó, no solo de lo que tocaba.
  const bloque = dia.hecho
    ? { nombre: dia.hecho.nombre, hecha: true }
    : hayRutina ? { nombre: dia.rutina.nombre, hecha: dia.estado === 'completada' } : null;
  const marca = MARCAS[dia.hecho ? 'completada' : dia.estado];
  const registros = dia.eventos.filter(e => e.registra);
  // Los puntos: uno por actividad registrada, uno por evento programado.
  // Sin texto a propósito — el nombre está al tocar.
  const puntos = [
    ...dia.actividades.map(() => P.base),
    ...dia.eventos.filter(e => !e.registra).map(() => TEXT_LIGHT),
  ].slice(0, 4);

  return (
    <button data-fecha={dia.fecha} onClick={alTocar} style={{
      aspectRatio: v2 ? '1 / 1.3' : '1 / 1.15',
      border: `${sobre ? 2 : 1}px ${sobre ? 'dashed' : 'solid'} ${sobre ? P.base : dia.es_hoy ? P.base : BORDER_SOFT}`,
      background: sobre ? P.tint : dia.es_hoy ? P.tint : SURFACE,
      opacity: origen ? 0.45 : 1,
      borderRadius: 11, padding: '5px 4px 4px', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2,
      fontFamily: 'inherit', overflow: 'hidden', WebkitUserSelect: 'none', userSelect: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
        fontSize: v2 ? 12.5 : 11, fontWeight: 700, color: dia.es_hoy ? P.ink : TEXT_MUTED,
      }}>
        <span>{Number(dia.fecha.slice(8))}</span>
        {marca && <span style={{ color: v2 && marca.simbolo === '✓' ? P.base : marca.color, fontSize: 11 }}>{marca.simbolo}</span>}
      </div>

      {/* La fuerza: un bloque sólido, lo único con peso visual */}
      {bloque && (
        <div onPointerDown={alPresionar} onContextMenu={e => e.preventDefault()} style={{
          background: bloque.hecha ? P.base : P.suave,
          color: bloque.hecha ? '#fff' : P.ink,
          borderRadius: 5, fontSize: v2 ? 10 : 8.5, fontWeight: 800, lineHeight: 1.2,
          padding: v2 ? '3px 3px' : '2px 3px', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: v2 ? 'normal' : 'nowrap', textAlign: 'left',
          display: v2 ? '-webkit-box' : 'block', WebkitLineClamp: v2 ? 2 : undefined, WebkitBoxOrient: v2 ? 'vertical' : undefined,
          outline: dia.movida ? `1px dashed ${P.base}` : 'none', outlineOffset: 1,
          touchAction: 'pan-y', WebkitTouchCallout: 'none',
        }}>{bloque.nombre}</div>
      )}

      {/* Lo que hay que registrar: su ícono (lleno si ya está) */}
      {registros.length > 0 && (
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', color: MORADO }}>
          {registros.slice(0, 3).map(e => (
            <span key={e.id} style={{ display: 'grid', placeItems: 'center', opacity: e.hecho ? 0.45 : 1 }}>
              <IconoEvento tipo={e.tipo} size={v2 ? 13 : 11} />
            </span>
          ))}
        </div>
      )}

      {/* Lo complementario: puntos, y nada más */}
      {puntos.length > 0 && (
        <div style={{ display: 'flex', gap: 2.5, marginTop: 'auto', justifyContent: 'center' }}>
          {puntos.map((c, i) => (
            <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: c, opacity: .8 }} />
          ))}
        </div>
      )}
    </button>
  );
}

function Leyenda({ P, v2 }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
      fontSize: v2 ? 12.5 : 11, color: TEXT_LIGHT, marginTop: 12, alignItems: 'center',
    }}>
      <span><Marca estado="completada" style={v2 ? { color: P.base } : undefined} /> entrenaste</span>
      <span><Marca estado="saltada" /> la saltaste</span>
      <span>
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 999, background: P.base, marginRight: 4 }} />
        cardio o deporte
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: TEXT_LIGHT }}>
        <span style={{ color: MORADO, display: 'inline-flex' }}><IconoEvento tipo="peso" size={12} /></span>
        medir, pesarte o fotos
      </span>
      <span>
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 999, background: TEXT_LIGHT, marginRight: 4 }} />
        lo que te puso tu coach
      </span>
    </div>
  );
}

// ── «Lo que viene»: una fila por día, con el nombre ENTERO ──────────────
function FilaViene({ dia, P, hoy, alTocar }) {
  const hecha = dia.estado === 'completada' || !!dia.hecho;
  return (
    <button onClick={alTocar} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16,
      background: SURFACE, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.05)',
    }}>
      <div style={{ width: 46, flex: 'none' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: dia.fecha === hoy ? P.ink : TEXT_LIGHT, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {dia.fecha === hoy ? 'Hoy' : diaCorto(dia.fecha).split(' ')[0]}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: TEXT, lineHeight: 1.1 }}>{Number(dia.fecha.slice(8))}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {dia.rutina && (
          <div style={{ fontSize: 15.5, fontWeight: 750, color: TEXT, lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: P.base, flex: 'none' }} />
            <span style={{ minWidth: 0 }}>{dia.rutina.nombre}</span>
            {hecha && <CheckCircle size={17} weight="fill" color={P.base} style={{ flex: 'none' }} />}
          </div>
        )}
        {dia.eventos.map(e => (
          <div key={e.id} style={{ fontSize: 14, color: e.registra ? MORADO : TEXT_MUTED, marginTop: dia.rutina ? 3 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconoEvento tipo={e.tipo} size={15} />
            <span style={{ fontWeight: e.registra ? 650 : 500 }}>{e.registra ? (REGISTRO[e.tipo]?.nombre || e.titulo) : e.titulo}</span>
            {e.hecho && <CheckCircle size={15} weight="fill" color={MORADO} />}
          </div>
        ))}
      </div>
      <CaretRight size={16} color={TEXT_LIGHT} />
    </button>
  );
}

// ── El día, al tocarlo ───────────────────────────────────────────────────
function HojaDia({ dia, P, v2, nombre, catalogo, porFecha, puedeMover, alCerrar, alEntrenar, alRegistrar, alMover, alCambio }) {
  const [eligiendo, setEligiendo] = useState(false);
  useEffect(() => { setEligiendo(false); }, [dia && dia.fecha]);
  if (!dia) return null;
  const hoy = hoyLocal();
  const futuro = dia.fecha > hoy;
  // A dónde se puede mover: los 10 días siguientes a hoy, dentro del mes cargado.
  const destinos = Array.from({ length: 10 }, (_, i) => sumarDias(hoy, i))
    .filter(f => f !== dia.fecha && porFecha[f] && porFecha[f].semana && !porFecha[f].hecho && porFecha[f].estado !== 'completada');
  const t = v2 ? { cuerpo: 15, chico: 13.5 } : { cuerpo: 13.5, chico: 12 };

  return (
    <Hoja abierta={!!dia} alCerrar={alCerrar} titulo={fechaLarga(dia.fecha)} alto="78vh">
      {dia.semana && (
        <div style={{ fontSize: t.chico, color: TEXT_LIGHT, marginBottom: 12 }}>
          Semana {dia.semana} de tu plan
        </div>
      )}

      {dia.rutina ? (
        <Card onClick={() => alEntrenar(dia.rutina.id)} style={{ padding: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: v2 ? 17 : 15.5 }}>{dia.rutina.nombre}</div>
              <div style={{ fontSize: t.chico, color: TEXT_LIGHT }}>
                {dia.movida ? 'La moviste a este día' : 'Tu rutina de fuerza'}
              </div>
            </div>
            {dia.estado && <Marca estado={dia.estado} style={{ fontSize: 17 }} />}
          </div>
          {dia.rpe && (
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 7 }}>
              Lo sentiste {dia.rpe} de 10
            </div>
          )}
        </Card>
      ) : !dia.hecho && (
        <div style={{ fontSize: t.cuerpo, color: TEXT_MUTED }}>
          Ese día no tienes rutina de fuerza.
        </div>
      )}

      {puedeMover && (
        <div style={{ marginTop: 10 }}>
          {!eligiendo ? (
            <button onClick={() => setEligiendo(true)} style={botonSuave}>
              <ArrowsLeftRight size={16} /> Mover a otro día
            </button>
          ) : (
            <div>
              <div style={{ fontSize: t.chico, color: TEXT_MUTED, marginBottom: 8 }}>¿A qué día? Si ese día ya tiene rutina, se intercambian.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {destinos.map(f => (
                  <button key={f} onClick={() => alMover(f)} style={{
                    border: `1px solid ${BORDER}`, background: SURFACE, borderRadius: 12, padding: '7px 10px',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    <div style={{ fontSize: 13.5, fontWeight: 750, color: TEXT }}>{f === hoy ? 'Hoy' : diaCorto(f)}</div>
                    <div style={{ fontSize: 11.5, color: TEXT_LIGHT }}>{porFecha[f].rutina ? porFecha[f].rutina.nombre : 'libre'}</div>
                  </button>
                ))}
                {!destinos.length && <div style={{ fontSize: t.chico, color: TEXT_LIGHT }}>No hay días libres cerca en este mes.</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {dia.hecho && (
        <div style={{ fontSize: t.cuerpo, color: TEXT_MUTED, marginTop: dia.rutina ? 10 : 0 }}>
          <Marca estado="completada" /> Ese día entrenaste <b style={{ color: TEXT }}>{dia.hecho.nombre}</b>
          {dia.rutina ? ' en su lugar.' : '.'}
        </div>
      )}

      {dia.eventos.some(e => e.registra) && (
        <>
          <Rot>Para registrar</Rot>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dia.eventos.filter(e => e.registra).map(ev => (
              <FilaRegistro key={ev.id} ev={ev} fecha={dia.fecha} nombre={nombre} futuro={dia.fecha > sumarDias(hoy, 1)} v2={v2} alCambio={alCambio} />
            ))}
          </div>
        </>
      )}

      {dia.eventos.some(e => !e.registra) && (
        <>
          <Rot>Lo que te puso tu coach</Rot>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dia.eventos.filter(e => !e.registra).map(ev => (
              <div key={ev.id} style={{
                border: `1px dashed ${BORDER}`, borderRadius: 12, padding: '9px 12px', fontSize: t.cuerpo,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                {v2 && <span style={{ color: TEXT_MUTED, marginTop: 2 }}><IconoEvento tipo={ev.tipo} size={16} /></span>}
                <div>
                  <b>{ev.hora ? `${String(ev.hora).slice(0, 5)} · ` : ''}{ev.titulo}</b>
                  {ev.detalle && <div style={{ fontSize: t.chico, color: TEXT_LIGHT, marginTop: 2 }}>{ev.detalle}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {dia.actividades.length > 0 && (
        <>
          <Rot>Lo que registraste</Rot>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dia.actividades.map(a => <ChipActividad key={a.id} actividad={a} catalogo={catalogo} />)}
          </div>
        </>
      )}

      {!futuro && (
        <div style={{ marginTop: 18 }}>
          {v2 ? (
            <button onClick={() => alRegistrar(dia.fecha)} style={{ ...botonSuave, width: '100%', justifyContent: 'center', height: 46 }}>
              <Plus size={16} /> Añadir cardio o deporte
            </button>
          ) : (
            <Boton ancho variante="suave" onClick={() => alRegistrar(dia.fecha)}>
              + Registrar cardio o deporte
            </Boton>
          )}
        </div>
      )}
      {futuro && (
        <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 16, textAlign: 'center' }}>
          Podrás registrar actividad cuando llegue el día.
        </div>
      )}
    </Hoja>
  );
}

// ── Medición corporal, peso o fotos: «ya lo hice» ────────────────────────
function FilaRegistro({ ev, fecha, nombre, futuro, v2, alCambio }) {
  const q = REGISTRO[ev.tipo] || REGISTRO.medicion;
  const [hecho, setHecho] = useState(!!ev.hecho);
  const [peso, setPeso] = useState(ev.valor != null ? String(ev.valor).replace('.', ',') : '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { setHecho(!!ev.hecho); }, [ev.hecho]);

  const marcar = async (valor) => {
    setEnviando(true); setError(null);
    const r = await api.registrar(nombre, { evento_id: ev.id, fecha, valor, hecho: true });
    setEnviando(false);
    if (!r.ok) { setError(r.motivo === 'valor_raro' ? 'Revisa el número.' : 'No se pudo guardar. Inténtalo otra vez.'); return; }
    setHecho(true);
    alCambio && alCambio();
  };

  return (
    <div style={{
      borderRadius: 14, padding: '12px 13px', background: hecho ? '#F1EEFA' : SURFACE,
      border: `1px solid ${hecho ? 'transparent' : '#DCD4F2'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 99, background: '#EEE9FB', color: MORADO, display: 'grid', placeItems: 'center', flex: 'none' }}>
          <IconoEvento tipo={ev.tipo} size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: v2 ? 15.5 : 14, fontWeight: 750, color: TEXT }}>{q.nombre}</div>
          {(ev.detalle || (ev.titulo && ev.titulo !== q.nombre)) && (
            <div style={{ fontSize: v2 ? 13 : 12, color: TEXT_LIGHT }}>{ev.detalle || ev.titulo}</div>
          )}
        </div>
        {hecho && <CheckCircle size={22} weight="fill" color={MORADO} aria-label="Hecho" />}
      </div>

      {!hecho && !futuro && (
        ev.tipo === 'peso' ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input inputMode="decimal" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Tu peso en kg"
              aria-label="Tu peso en kg" style={{
                flex: 1, height: 42, borderRadius: 12, border: '1px solid #DCD4F2', padding: '0 12px',
                fontSize: 16, fontFamily: 'inherit', outline: 'none', minWidth: 0,
              }} />
            <button disabled={enviando || !peso.trim()} onClick={() => marcar(peso)} style={{ ...botonPrimario, opacity: enviando || !peso.trim() ? 0.5 : 1 }}>
              {enviando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        ) : (
          <button disabled={enviando} onClick={() => marcar(null)} style={{ ...botonPrimario, width: '100%', marginTop: 10, opacity: enviando ? 0.6 : 1 }}>
            {enviando ? 'Guardando…' : q.boton}
          </button>
        )
      )}
      {!hecho && futuro && (
        <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 8 }}>Lo marcas cuando llegue el día.</div>
      )}
      {hecho && (
        <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 8 }}>
          {ev.tipo === 'peso' && peso ? `${peso} kg · ` : ''}Hecho. Tu coach ya lo sabe.
          {ev.tipo === 'fotos' ? ' Si aún no se las mandaste, envíaselas por WhatsApp.' : ''}
        </div>
      )}
      {error && <div style={{ fontSize: 12.5, color: '#B4533F', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function Rot({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
      color: TEXT_LIGHT, margin: '18px 0 8px',
    }}>{children}</div>
  );
}

const flecha = {
  width: 36, height: 36, borderRadius: 999, border: `1px solid ${BORDER}`,
  background: 'transparent', color: TEXT_MUTED, fontSize: 17, cursor: 'pointer',
  fontFamily: 'inherit', lineHeight: 1,
};
const botonSuave = {
  display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', borderRadius: 999,
  border: 'none', background: '#F2EFE8', color: TEXT, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
};
const botonPrimario = {
  height: 42, padding: '0 16px', borderRadius: 12, border: 'none', background: TEXT, color: '#fff',
  cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700,
};
