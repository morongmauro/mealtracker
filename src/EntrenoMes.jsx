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
import { createPortal } from 'react-dom';
import { CheckCircle, CaretRight, CaretLeft, ArrowsLeftRight, Plus, Check, Flag, FlagCheckered, CurrencyCircleDollar, Moon, Info } from '@phosphor-icons/react';
import { api, hoyLocal, MESES, DIAS_CORTO, fechaLarga, CATALOGO_MINIMO, sumarDias, aFecha, nombreCorto } from './entrenoDatos.js';
import { MUSCULO_POR_SLUG } from './musculos.js';
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
    ? { base: SECCION.entreno.base, ink: SECCION.entreno.ink, tint: SECCION.entreno.tint, suave: '#ECEDEF' }
    : { base: ACCENT, ink: ACCENT_DARK, tint: ACCENT_LIGHT, suave: ACCENT_PASTEL_SUAVE };
}

const DIA_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diaCorto = (f) => { const d = aFecha(f); return `${DIA_SEMANA[d.getDay()]} ${d.getDate()}`; };

// Con la visual nueva el calendario es otro (MesV2, abajo): semana y mes,
// estados «por hacer / hecho», ciclo, registros y corte de pago a la vista.
export default function Mes(props) {
  return v2Activa() ? <MesV2 {...props} /> : <MesClasico {...props} />;
}

// Visual nueva: lo de hoy y la semana en curso, para la pantalla Hoy.
// ── Cambios que se ven al instante ──
// Al mover, añadir o quitar una rutina el calendario cambia YA (antes
// esperaba la respuesta del servidor y parecía que no había pasado nada: la
// gente volvía a arrastrar). Mientras se guarda sale «Actualizando…»; si el
// servidor dice que no, todo vuelve a como estaba y se explica por qué.
export const ACTUALIZANDO = { cargando: true, texto: 'Actualizando…' };

// `cambios`: { fecha: { campos del día que cambian } } sobre la lista de días
// de un mes. Devuelve la lista nueva (o la misma si no toca ese mes).
export function aplicarCambios(dias, cambios) {
  if (!dias || !dias.some(d => d.fecha in cambios)) return dias;
  return dias.map(d => (d.fecha in cambios ? { ...d, ...cambios[d.fecha] } : d));
}

// Lo que cambia al mover `desde` → `hasta`: si el otro día tenía rutina, se
// intercambian; las dos quedan marcadas como movidas.
export function cambiosDeMover(dDesde, dHasta) {
  const otra = dHasta && dHasta.rutina && !dHasta.extra ? dHasta.rutina : null;
  return {
    [dDesde.fecha]: { rutina: otra, movida: !!otra, estado: null },
    [dHasta.fecha]: { rutina: dDesde.rutina, movida: true, extra: false, estado: null },
  };
}

export function AvisoFlotante({ aviso }) {
  if (!aviso) return null;
  const cargando = typeof aviso === 'object' && aviso.cargando;
  return (
    <div role="status" data-aviso={cargando ? 'actualizando' : 'listo'} style={{
      position: 'fixed', left: '50%', bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)',
      zIndex: 70, background: TEXT, color: '#fff', borderRadius: 999, padding: '10px 16px',
      fontSize: 14, fontWeight: 650, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: '88vw', textAlign: 'center',
      display: 'flex', alignItems: 'center', gap: 9, whiteSpace: cargando ? 'nowrap' : undefined,
    }}>
      {cargando && <span aria-hidden="true" className="mt-girando" style={{
        width: 14, height: 14, borderRadius: 99, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', flex: 'none',
      }} />}
      <span>{cargando ? aviso.texto : aviso}</span>
      <style>{'@keyframes mt-gira{to{transform:rotate(360deg)}}.mt-girando{animation:mt-gira .8s linear infinite}@media (prefers-reduced-motion: reduce){.mt-girando{animation-duration:2.4s}}'}</style>
    </div>
  );
}

export function HoySemana(props) {
  return <MesV2 {...props} modo="hoy" />;
}

function MesClasico({ nombre, alEntrenar }) {
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
  useEffect(() => { if (!aviso || aviso.cargando) return; const t = setTimeout(() => setAviso(null), 3200); return () => clearTimeout(t); }, [aviso]);

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
    const antes = datos;
    setDatos(x => (x ? { ...x, dias: aplicarCambios(x.dias, cambiosDeMover(d, porFecha[hasta] || { fecha: hasta })) } : x));
    setAbierto(null);
    setAviso(ACTUALIZANDO);
    const r = await api.mover(nombre, { desde, hasta, rutina_id: d.rutina.id });
    if (!r.ok) {
      setDatos(antes);
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

      <AvisoFlotante aviso={aviso} />

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
      border: `${sobre ? 2 : 1}px ${sobre ? 'dotted' : 'solid'} ${sobre ? P.base : dia.es_hoy ? P.base : BORDER_SOFT}`,
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
          outline: dia.movida ? `1.5px dotted ${P.base}` : 'none', outlineOffset: 1,
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
function HojaDia({ dia, P, v2, nombre, catalogo, porFecha, puedeMover, alCerrar, alEntrenar, alRegistrar, alMover, alCambio, fase = null,
  destinosSemana = null, alAgregarRutina = null, alQuitarRutina = null }) {
  const [eligiendo, setEligiendo] = useState(false);
  useEffect(() => { setEligiendo(false); }, [dia && dia.fecha]);
  if (!dia) return null;
  const hoy = hoyLocal();
  const futuro = dia.fecha > hoy;
  // Las semanas que ya pasaron quedan como quedaron: no se llenan ni se cambian.
  const pasada = dia.fecha < lunesDeLocal(hoy);
  // A dónde se puede mover: los 10 días siguientes a hoy, dentro del mes cargado.
  const destinos = (destinosSemana || Array.from({ length: 10 }, (_, i) => sumarDias(hoy, i)))
    .filter(f => f !== dia.fecha && porFecha[f] && porFecha[f].semana && !porFecha[f].hecho && porFecha[f].estado !== 'completada');
  const t = v2 ? { cuerpo: 15, chico: 13.5 } : { cuerpo: 13.5, chico: 12 };

  return (
    <Hoja abierta={!!dia} alCerrar={alCerrar} titulo={fechaLarga(dia.fecha)} alto="78vh">
      {dia.semana && (
        <div style={{ fontSize: t.chico, color: TEXT_LIGHT, marginBottom: 12 }}>
          Semana {dia.semana} de tu plan
        </div>
      )}
      {v2 && <AvisosDia dia={dia} fase={fase} P={P} />}

      {/* Visual nueva: al tocar un día, lo primero son las dos cosas que se
          pueden añadir. Cardio o deporte solo cuando el día ya llegó (lo que
          se registra es lo hecho); la rutina, en un día libre de esta semana. */}
      {v2 && (alAgregarRutina || (!futuro && !pasada)) && (
        <div data-acciones-dia style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {alAgregarRutina && (
            <button onClick={alAgregarRutina} data-accion="rutina" style={{ ...botonAccion, background: P.base, color: '#fff', border: 'none' }}>
              <Plus size={16} weight="bold" /> Añadir rutina
            </button>
          )}
          {!futuro && !pasada && (
            <button onClick={() => alRegistrar(dia.fecha)} data-accion="actividad" style={{ ...botonAccion, background: '#fff', color: P.ink, border: `1.5px solid ${P.base}` }}>
              <Plus size={16} weight="bold" /> Cardio o deporte
            </button>
          )}
        </div>
      )}

      {dia.rutina ? (
        <Card onClick={() => alEntrenar(dia.rutina.id)} style={{ padding: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: v2 ? 17 : 15.5 }}>{dia.rutina.nombre}</div>
              <div style={{ fontSize: t.chico, color: TEXT_LIGHT }}>
                {dia.extra ? 'La añadiste tú a este día' : dia.movida ? 'La moviste a este día' : v2 ? 'Tu rutina de fuerza · toca para entrenar' : 'Tu rutina de fuerza'}
              </div>
            </div>
            {v2
              ? <EstadoChip hecha={dia.estado === 'completada'} P={P} />
              : dia.estado && <Marca estado={dia.estado} style={{ fontSize: 17 }} />}
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

      {((alAgregarRutina && !v2) || alQuitarRutina) && (
        <div style={{ marginTop: 10 }}>
          {alAgregarRutina && !v2 && <button onClick={alAgregarRutina} style={botonSuave}><Plus size={16} /> Añadir una rutina a este día</button>}
          {alQuitarRutina && dia.estado !== 'completada' && <button onClick={alQuitarRutina} style={botonSuave}>Quitar la rutina que añadiste</button>}
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
                    <div style={{ fontSize: 11.5, color: TEXT_LIGHT }}>{porFecha[f].rutina ? (v2 ? nombreCorto(porFecha[f].rutina.nombre) : porFecha[f].rutina.nombre) : 'libre'}</div>
                  </button>
                ))}
                {!destinos.length && <div style={{ fontSize: t.chico, color: TEXT_LIGHT }}>{destinosSemana ? 'No quedan otros días libres cerca.' : 'No hay días libres cerca en este mes.'}</div>}
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
              <FilaRegistro key={ev.id} ev={ev} fecha={dia.fecha} nombre={nombre} futuro={dia.fecha > sumarDias(hoy, 1)} pasada={pasada} v2={v2} alCambio={alCambio} />
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

      {!futuro && !pasada && !v2 && (
        <div style={{ marginTop: 18 }}>
          <Boton ancho variante="suave" onClick={() => alRegistrar(dia.fecha)}>
            + Registrar cardio o deporte
          </Boton>
        </div>
      )}
      {futuro && (
        <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 16, textAlign: 'center' }}>
          El cardio o deporte lo registras cuando llegue el día.
        </div>
      )}
      {pasada && (
        <div data-semana-pasada style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 16, textAlign: 'center' }}>
          Esta semana ya pasó: queda como quedó.
        </div>
      )}
    </Hoja>
  );
}

// ── Medición corporal, peso o fotos: «ya lo hice» ────────────────────────
function FilaRegistro({ ev, fecha, nombre, futuro, pasada = false, v2, alCambio }) {
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

      {!hecho && !futuro && !pasada && (
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

// ── Al abrir la app: lo que toca registrar hoy (ver AvisoRegistro.jsx) ──
// Las mismas filas del calendario: el peso se escribe aquí y las fotos o la
// medición se marcan con un toque. El coach se entera igual que desde el día.
export function HojaAvisoRegistro({ nombre, fecha, eventos, v2, alCerrar }) {
  const [hechos, setHechos] = useState(() => new Set());
  const todo = eventos.every(ev => hechos.has(ev.id));
  return (
    <div role="dialog" aria-modal="true" aria-label="Para registrar hoy" data-aviso-registro onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(31,31,28,0.42)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 400, maxHeight: '88vh', overflowY: 'auto',
        padding: '22px 18px 18px', boxShadow: '0 20px 60px rgba(0,0,0,.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 99, background: '#EEE9FB', color: MORADO, display: 'grid', placeItems: 'center', flex: 'none' }}>
            <IconoEvento tipo={eventos[0]?.tipo} size={22} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {todo ? 'Listo, gracias' : 'Hoy te toca registrar'}
            </div>
            <div style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 2 }}>
              {todo ? 'Tu coach ya lo sabe.' : 'Tu coach lo pidió para hoy. Es un minuto.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {eventos.map(ev => (
            <FilaRegistro key={ev.id} ev={ev} fecha={fecha} nombre={nombre} futuro={false} v2={v2}
              alCambio={() => setHechos(h => new Set([...h, ev.id]))} />
          ))}
        </div>
        <button onClick={alCerrar} style={{
          width: '100%', marginTop: 14, height: 46, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 15, fontWeight: 700, background: todo ? TEXT : '#F2EFE8', color: todo ? '#FFFFFF' : TEXT,
        }}>{todo ? 'Seguir' : 'Más tarde'}</button>
      </div>
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

// ═════════════════════════════════════════════════════════════════════════
// CALENDARIO · visual nueva
//
// Dos vistas, y se recuerda la última:
//   · SEMANA — un renglón por día con todo escrito entero: la rutina, lo que
//     hay que registrar, lo del coach, lo que hizo. Es la que se lee.
//   · MES    — la foto del mes. Casillas altas para que el nombre quepa en
//     dos o tres líneas; lo demás, ícono.
//
// Los estados son dos, sin juzgar: POR HACER (borde azul) y HECHO (relleno
// azul). Un día que pasó sin entrenar no dice «la saltaste»: sigue por hacer,
// que se puede recuperar.
//
// Arrastrar: se mantiene el dedo sobre la rutina y se suelta en otro día.
// Va con eventos TÁCTILES y no con pointer: en el iPhone el scroll le roba el
// gesto al pointer a mitad de camino (llega un pointercancel) y el arrastre
// moría. Con touchmove no-pasivo, una vez que arrancó, el scroll se bloquea.
// ═════════════════════════════════════════════════════════════════════════
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_V2 = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const AMBAR_PAGO = '#B7791F';
const lunesDeLocal = (f) => sumarDias(f, -((aFecha(f).getDay() + 6) % 7));
const cortaFecha = (f) => { const d = aFecha(f); return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`; };
const unicos = (xs) => [...new Set(xs)];

function useArrastre(puedeMover, alSoltar) {
  const [arrastre, setEstado] = useState(null);
  const ref = useRef(null);
  const presion = useRef(null);
  const recien = useRef(0);   // para que el «click» que sigue a soltar no abra el día
  const set = (v) => { ref.current = v; setEstado(v); };
  const soltarRef = useRef(alSoltar);
  soltarRef.current = alSoltar;

  const empezar = (d, x, y) => {
    presion.current = { x, y, t: setTimeout(() => {
      presion.current = { activo: true };
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
      set({ desde: d.fecha, nombre: d.rutina.nombre, x, y, sobre: null });
    }, 380) };
  };
  const alTocar = (d) => (e) => { if (puedeMover(d) && e.touches && e.touches[0]) empezar(d, e.touches[0].clientX, e.touches[0].clientY); };
  const alRaton = (d) => (e) => { if (e.pointerType === 'mouse' && puedeMover(d)) empezar(d, e.clientX, e.clientY); };

  useEffect(() => {
    const sobreDe = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const c = el && el.closest && el.closest('[data-fecha]');
      return c ? c.getAttribute('data-fecha') : null;
    };
    const mover = (x, y, e) => {
      const p = presion.current;
      if (!p) return;
      if (!p.activo) {
        // Se movió antes de tiempo: era scroll, no arrastre.
        if (Math.abs(x - p.x) > 8 || Math.abs(y - p.y) > 8) { clearTimeout(p.t); presion.current = null; }
        return;
      }
      if (e.cancelable) e.preventDefault();
      set({ ...ref.current, x, y, sobre: sobreDe(x, y) });
    };
    const fin = () => {
      const p = presion.current;
      presion.current = null;
      if (p && !p.activo) { clearTimeout(p.t); return; }
      const a = ref.current;
      if (!a) return;
      set(null);
      recien.current = Date.now();
      if (a.sobre && a.sobre !== a.desde) soltarRef.current(a.desde, a.sobre);
    };
    const tm = (e) => { const t = e.touches && e.touches[0]; if (t) mover(t.clientX, t.clientY, e); };
    const pm = (e) => { if (e.pointerType === 'mouse') mover(e.clientX, e.clientY, e); };
    const pu = (e) => { if (e.pointerType === 'mouse') fin(); };
    window.addEventListener('touchmove', tm, { passive: false });
    window.addEventListener('touchend', fin);
    window.addEventListener('touchcancel', fin);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    return () => {
      window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', fin);
      window.removeEventListener('touchcancel', fin);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
  }, []);
  const acabaDeSoltar = () => Date.now() - recien.current < 450;
  return { arrastre, alTocar, alRaton, acabaDeSoltar };
}

// La rutina: POR HACER con borde azul, HECHA rellena. `lineas`: cuántas
// líneas deja al nombre (en el mes, tres; en la semana, sin límite).
function ChipRutina({ nombre, hecha, movida, P, lineas, grande, arrastre }) {
  return (
    <div {...(arrastre || {})} onContextMenu={e => e.preventDefault()} data-chip={hecha ? 'hecha' : 'pendiente'} style={{
      display: grande ? 'flex' : lineas ? '-webkit-box' : 'block', alignItems: 'center', gap: 6,
      WebkitLineClamp: lineas || undefined, WebkitBoxOrient: lineas ? 'vertical' : undefined,
      overflow: 'hidden', wordBreak: 'normal', overflowWrap: 'break-word', letterSpacing: grande ? 'normal' : '-0.02em',
      background: hecha ? P.base : '#FFFFFF', color: hecha ? '#fff' : P.ink,
      // Movida o añadida por el cliente: borde de puntitos (no rayas).
      border: `${movida && !hecha ? 2 : 1.5}px ${movida && !hecha ? 'dotted' : 'solid'} ${P.base}`,
      borderRadius: grande ? 12 : 6, padding: grande ? '8px 11px' : '3px 2px',
      fontSize: grande ? 15 : 10, fontWeight: 750, lineHeight: 1.18, textAlign: 'left',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none', cursor: 'grab',
    }}>
      {grande && hecha && <Check size={16} weight="bold" style={{ flex: 'none' }} />}
      {grande ? <span style={{ flex: 1, minWidth: 0 }}>{nombre}</span> : nombre}
    </div>
  );
}

function EstadoChip({ hecha, P }) {
  return (
    <span style={{
      flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px', borderRadius: 999,
      fontSize: 12.5, fontWeight: 750, background: hecha ? P.base : '#FFFFFF', color: hecha ? '#fff' : P.ink,
      border: `1.5px solid ${P.base}`,
    }}>{hecha ? <><Check size={13} weight="bold" /> Hecho</> : 'Por hacer'}</span>
  );
}

// Lo especial del día, arriba en la hoja: inicio o fin de ciclo, corte de pago.
function AvisosDia({ dia, fase, P }) {
  const items = [];
  if (dia.inicio_ciclo) items.push({ k: 'ini', Icono: Flag, color: P.ink, fondo: P.tint, texto: `Empieza ${fase?.nombre || 'tu ciclo'}` });
  if (dia.fin_ciclo) items.push({ k: 'fin', Icono: FlagCheckered, color: P.ink, fondo: P.tint, texto: `Último día de ${fase?.nombre || 'tu ciclo'}` });
  if (dia.corte_pago) items.push({ k: 'pago', Icono: CurrencyCircleDollar, color: AMBAR_PAGO, fondo: '#FBF1DC', texto: 'Fecha de corte de tu mensualidad' });
  if (!items.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      {items.map(({ k, Icono, color, fondo, texto }) => (
        <div key={k} data-aviso-dia={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 12, background: fondo, color, fontSize: 14.5, fontWeight: 700 }}>
          <Icono size={18} weight="fill" /> {texto}
        </div>
      ))}
    </div>
  );
}

// Los músculos que comparten dos rutinas, en nombre corto («Cuádriceps, Glúteo»).
const nombreMusculo = (m) => MUSCULO_POR_SLUG[m]?.corto || m;
const DIA_LARGO_V2 = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaDe = (f) => DIA_LARGO_V2[aFecha(f).getDay()];
const corto = (r) => (r ? (r.corto || nombreCorto(r.nombre)) : '');

// `modo`:
//   'mes' — el calendario: el mes, su leyenda y «Ten en cuenta».
//   'hoy' — la pantalla Hoy: lo que toca hoy (fuerza, registros, lo del
//           coach, añadir actividad) y debajo la semana en curso con detalle.
// Los meses ya traídos, por cliente, a nivel de módulo: al volver a Hoy o al
// Calendario se pinta lo último al instante y se refresca por detrás, sin el
// «cargando» de cada vez.
const cacheMeses = new Map();     // nombre → { 'YYYY-MM': respuesta }
const cacheCatalogo = new Map();  // nombre → catálogo de actividades

// Deja en caché los meses de la semana en curso (la app lo llama al abrir).
export async function precargarMeses(nombre) {
  const lunes = lunesDeLocal(hoyLocal());
  const meses = unicos([lunes.slice(0, 7), sumarDias(lunes, 6).slice(0, 7)]);
  await Promise.all(meses.map(async (m) => {
    if (cacheMeses.get(nombre)?.[m]) return;
    const r = await api.mes(nombre, m);
    if (r && r.ok) cacheMeses.set(nombre, { ...(cacheMeses.get(nombre) || {}), [m]: r });
  }));
}

function MesV2({ nombre, alEntrenar, modo = 'mes', ejerciciosDe = {} }) {
  const P = paleta(true);
  const hoy = hoyLocal();
  const lunes = lunesDeLocal(hoy);
  const [ym, setYm] = useState(hoy.slice(0, 7));
  const [cache, setCacheEstado] = useState(() => cacheMeses.get(nombre) || {});
  const setCache = (f) => setCacheEstado(c => { const n = f(c); cacheMeses.set(nombre, n); return n; });
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [registrando, setRegistrando] = useState(null);
  const [catalogo, setCatalogo] = useState(() => cacheCatalogo.get(nombre) || null);
  const [aviso, setAviso] = useState(null);
  const [confirmar, setConfirmar] = useState(null);     // { texto, si, accion }
  const [eligiendo, setEligiendo] = useState(null);     // fecha a la que se le añade rutina
  // El calendario: «Mes» o «Semana» (se recuerda) y la semana que se mira.
  const [vista, setVistaEstado] = useState(() => { try { return localStorage.getItem('entreno:cal:vista2') === 'semana' ? 'semana' : 'mes'; } catch (e) { return 'mes'; } });
  const setVista = (v) => { setVistaEstado(v); try { localStorage.setItem('entreno:cal:vista2', v); } catch (e) {} };
  const [lunesVer, setLunesVer] = useState(() => lunesDeLocal(hoyLocal()));
  const [ayuda, setAyuda] = useState(false);

  const cargar = async (mes) => {
    setError(null);
    const r = await api.mes(nombre, mes);
    // Sin red pero con el mes guardado: se queda lo guardado, sin error.
    if (!r.ok) { if (!cacheMeses.get(nombre)?.[mes]) setError(r.motivo || 'error'); return; }
    setCache(c => ({ ...c, [mes]: r }));
  };
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const semanaVer = Array.from({ length: 7 }, (_, i) => sumarDias(lunesVer, i));
  const necesarios = modo === 'hoy' ? unicos([semana[0].slice(0, 7), semana[6].slice(0, 7)])
    : unicos([ym, semana[0].slice(0, 7), semana[6].slice(0, 7), ...(vista === 'semana' ? [semanaVer[0].slice(0, 7), semanaVer[6].slice(0, 7)] : [])]);
  // Lo que no está se trae; lo que ya estaba guardado se refresca por detrás
  // una vez por visita (cada vez que se entra), sin tapar la pantalla.
  const refrescados = useRef(new Set());
  useEffect(() => {
    necesarios.forEach(m => {
      const k = `${nombre}|${m}`;
      if (!refrescados.current.has(k)) { refrescados.current.add(k); cargar(m); }
    });
    /* eslint-disable-next-line */
  }, [necesarios.join(), nombre]);
  useEffect(() => {
    api.catalogo(nombre).then(r => {
      if (!r.ok && cacheCatalogo.has(nombre)) return;
      const c = r.ok && r.catalogo?.length ? r.catalogo : CATALOGO_MINIMO;
      cacheCatalogo.set(nombre, c); setCatalogo(c);
    });
  }, [nombre]);
  useEffect(() => { if (!aviso || aviso.cargando) return; const t = setTimeout(() => setAviso(null), 3600); return () => clearTimeout(t); }, [aviso]);

  const porFecha = useMemo(() => {
    const out = {};
    Object.values(cache).forEach(c => (c.dias || []).forEach(d => { out[d.fecha] = d; }));
    return out;
  }, [cache]);
  const base = cache[hoy.slice(0, 7)] || cache[necesarios[0]] || {};
  const fase = base.fase || null;
  const rutinasCiclo = base.rutinas || [];
  const musculosDe = useMemo(() => Object.fromEntries(rutinasCiclo.map(r => [r.id, r.musculos || []])), [rutinasCiclo]);
  const listo = necesarios.every(m => cache[m]);
  const enSemana = (f) => f >= semana[0] && f <= semana[6];
  // Se puede cambiar de esta semana en adelante (dentro del ciclo: los días
  // del ciclo traen su número de semana). Las semanas que ya pasaron, no.
  const editable = (f) => !!f && f >= semana[0];
  const recargar = (fechas) => unicos(fechas.map(f => f.slice(0, 7))).forEach(cargar);

  // Se mueve lo de esta semana (también un día que ya pasó: si perdiste el
  // lunes, lo pasas al jueves para compensar) y lo de las semanas que vienen,
  // sin hacer, y que sea del plan (lo añadido se quita y se vuelve a añadir).
  const puedeMover = (d) => !!(d && d.rutina && !d.extra && !d.hecho && d.estado !== 'completada' && editable(d.fecha));
  const puedeAgregar = (d) => !!(d && !d.rutina && !d.hecho && d.semana && editable(d.fecha) && rutinasCiclo.length);

  // ¿Queda pegada a una rutina que trabaja lo mismo? Mira el día anterior y
  // el siguiente (como quedarían después del cambio). No bloquea: avisa.
  const choque = (fecha, rutinaId, cambios = {}) => {
    const rutinaEn = (f) => (f in cambios ? cambios[f] : porFecha[f]?.rutina?.id || porFecha[f]?.hecho?.id || null);
    const mias = new Set(musculosDe[rutinaId] || []);
    for (const f of [sumarDias(fecha, -1), sumarDias(fecha, 1)]) {
      const otra = rutinaEn(f);
      if (!otra) continue;
      const comunes = (musculosDe[otra] || []).filter(m => mias.has(m));
      if (otra === rutinaId || comunes.length >= 2) {
        const nom = rutinasCiclo.find(r => r.id === otra);
        return { dia: diaDe(f), rutina: nom ? corto(nom) : 'otra rutina', musculos: comunes.slice(0, 3).map(nombreMusculo) };
      }
    }
    return null;
  };
  const textoChoque = (c, verbo) => `El ${c.dia} haces ${c.rutina}, que trabaja lo mismo${c.musculos.length ? ` (${c.musculos.join(', ')})` : ''}. `
    + `Lo ideal es dejar al menos un día de descanso entre rutinas que trabajan los mismos músculos. ¿${verbo} igual?`;

  // Cambia el calendario ya y devuelve cómo deshacerlo.
  const alInstante = (cambios) => {
    const antes = {};
    setCache(c => {
      const n = { ...c };
      Object.keys(n).forEach(m => {
        const dias = aplicarCambios(n[m].dias, cambios);
        if (dias !== n[m].dias) { antes[m] = n[m]; n[m] = { ...n[m], dias }; }
      });
      return n;
    });
    return () => setCache(c => ({ ...c, ...antes }));
  };
  const hacerMover = async (desde, hasta) => {
    const d = porFecha[desde];
    const deshacer = alInstante(cambiosDeMover(d, porFecha[hasta] || { fecha: hasta }));
    setAbierto(null);
    setAviso(ACTUALIZANDO);
    const r = await api.mover(nombre, { desde, hasta, rutina_id: d.rutina.id });
    if (!r.ok) {
      deshacer();
      setAviso({
        semana_pasada: 'Las semanas que ya pasaron no se cambian.',
        fuera_de_fase: 'Ese día está fuera de tu ciclo.',
        ya_entrenada: 'Ese día ya tiene un entreno hecho.',
        es_extra: 'Una rutina que añadiste no se mueve: quítala y añádela en el otro día.',
        sin_tabla: 'Mover días aún no está disponible. Avísale a tu coach.',
      }[r.motivo] || 'No se pudo mover. Inténtalo otra vez.');
      return;
    }
    setAviso(r.intercambio ? `${corto(r.movida)} ↔ ${corto(r.intercambio)}` : `${corto(r.movida)} → ${fechaLarga(hasta)}`);
    setAbierto(null);
    recargar([desde, hasta]);
  };
  const moverRutina = (desde, hasta) => {
    const d = porFecha[desde];
    if (!d || !d.rutina || desde === hasta) return;
    if (!editable(hasta)) { setAviso('Las semanas que ya pasaron no se cambian.'); return; }
    if (porFecha[hasta] && !porFecha[hasta].semana) { setAviso('Ese día está fuera de tu ciclo.'); return; }
    const destino = porFecha[hasta]?.rutina?.id || null;
    const c = choque(hasta, d.rutina.id, { [desde]: destino, [hasta]: d.rutina.id });
    if (c) { setConfirmar({ texto: textoChoque(c, 'Moverla'), si: 'Moverla igual', accion: () => hacerMover(desde, hasta) }); return; }
    hacerMover(desde, hasta);
  };
  const hacerAgregar = async (fecha, rutinaId) => {
    const rut = rutinasCiclo.find(x => x.id === rutinaId);
    const deshacer = alInstante({ [fecha]: { rutina: rut ? { id: rut.id, nombre: rut.nombre, corto: rut.corto } : { id: rutinaId, nombre: 'Rutina' }, extra: true, movida: true } });
    setEligiendo(null);
    setAbierto(null);
    setAviso(ACTUALIZANDO);
    const r = await api.agregarRutina(nombre, { fecha, rutina_id: rutinaId });
    if (!r.ok) {
      deshacer();
      setAviso({
        ocupado: 'Ese día ya tiene rutina.', semana_pasada: 'Las semanas que ya pasaron no se cambian.', fuera_de_fase: 'Ese día está fuera de tu ciclo.',
        sin_tabla: 'Añadir rutinas aún no está disponible. Avísale a tu coach.',
      }[r.motivo] || 'No se pudo añadir. Inténtalo otra vez.');
      return;
    }
    setAviso(`${corto(r.agregada)} añadida el ${diaDe(fecha)}`);
    setAbierto(null);
    recargar([fecha]);
  };
  const agregarRutina = (fecha, rutinaId) => {
    const c = choque(fecha, rutinaId);
    if (c) { setConfirmar({ texto: textoChoque(c, 'Añadirla'), si: 'Añadirla igual', accion: () => hacerAgregar(fecha, rutinaId) }); return; }
    hacerAgregar(fecha, rutinaId);
  };
  const quitarRutina = async (fecha) => {
    const deshacer = alInstante({ [fecha]: { rutina: null, extra: false, movida: false } });
    setAbierto(null);
    setAviso(ACTUALIZANDO);
    const r = await api.quitarRutina(nombre, { fecha });
    if (!r.ok) { deshacer(); setAviso(r.motivo === 'ya_entrenada' ? 'Ya la entrenaste: queda en tu registro.' : 'No se pudo quitar. Inténtalo otra vez.'); return; }
    setAviso('Rutina quitada. Ese día vuelve a estar libre.');
    setAbierto(null);
    recargar([fecha]);
  };

  const { arrastre, alTocar, alRaton, acabaDeSoltar } = useArrastre(puedeMover, moverRutina);
  const abrir = (f) => { if (!arrastre && !acabaDeSoltar()) setAbierto(f); };
  const arrastrable = (d) => (puedeMover(d) ? { onTouchStart: alTocar(d), onPointerDown: alRaton(d) } : null);

  const [y, m] = ym.split('-').map(Number);
  const cambiarMes = (delta) => { const d = new Date(y, m - 1 + delta, 1); setYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  // La primera y la última fila se completan con los días del mes vecino si
  // ya están cargados (la semana en curso siempre lo está): a fin de mes se
  // puede mover del miércoles 30 al jueves 1 sin cambiar de pantalla.
  const celdas = useMemo(() => {
    const c = cache[ym];
    if (!c || !c.dias.length) return [];
    const primero = c.dias[0].fecha, ultimo = c.dias[c.dias.length - 1].fecha;
    const huecos = (aFecha(primero).getDay() + 6) % 7;
    const antes = Array.from({ length: huecos }, (_, i) => porFecha[sumarDias(primero, i - huecos)] || null);
    const colas = (7 - ((huecos + c.dias.length) % 7)) % 7;
    const despues = Array.from({ length: colas }, (_, i) => porFecha[sumarDias(ultimo, i + 1)] || null);
    return [...antes, ...c.dias, ...despues];
  }, [cache, ym, porFecha]);
  const dHoy = porFecha[hoy];
  const dHoySemana = dHoy?.semana || null;
  const semanasFase = fase?.desde && fase?.hasta ? Math.ceil((aFecha(fase.hasta) - aFecha(fase.desde)) / 864e5 / 7) : null;

  return (
    <div data-calendario-v2={modo} style={{ touchAction: arrastre ? 'none' : undefined }}>
      {modo === 'mes' && (
        <div data-cal-cabecera style={{ marginTop: -10 }}>
          {fase && (
            <div style={{ fontSize: 12, fontWeight: 750, letterSpacing: '.08em', color: TEXT_MUTED, textTransform: 'uppercase', margin: '0 2px 10px' }}>
              {fase.nombre}{dHoySemana ? ` · semana ${dHoySemana}${semanasFase ? ` de ${semanasFase}` : ''}` : ''}
            </div>
          )}
          <Segmentado valor={vista} alCambiar={setVista} opciones={[['semana', 'Semana'], ['mes', 'Mes']]} />
        </div>
      )}

      {error && <Fallo motivo={error} alReintentar={() => necesarios.forEach(cargar)} />}
      {!listo && !error && <Cargando />}

      {/* ── HOY TE TOCA ── */}
      {listo && modo === 'hoy' && (
        <HoyTeToca dia={dHoy} P={P} nombre={nombre} ejerciciosDe={ejerciciosDe}
          alEntrenar={alEntrenar} alRegistrarActividad={() => setRegistrando(hoy)}
          alAgregar={puedeAgregar(dHoy) ? () => setEligiendo(hoy) : null}
          alQuitar={dHoy?.extra ? () => quitarRutina(hoy) : null}
          alCambio={() => recargar([hoy])} />
      )}

      {listo && modo === 'hoy' && (
        <>
          <div style={{ height: 1, background: 'rgba(31,31,31,0.09)', margin: '26px 2px 16px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', margin: '0 2px 12px' }}>Tu semana</h2>
          <div data-vista="semana" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {semana.map((f, i) => {
              const d = porFecha[f];
              return <FilaDiaV2 key={f} fecha={f} etiqueta={DIAS_V2[i]} dia={d} P={P} hoy={hoy} fase={fase}
                sobre={arrastre && arrastre.sobre === f && arrastre.desde !== f} origen={arrastre && arrastre.desde === f}
                arrastrable={arrastrable(d)} alTocar={() => d && abrir(f)} />;
            })}
          </div>
        </>
      )}

      {/* ── EL MES: tarjeta de cristal; cada día dice su rutina ── */}
      {listo && modo === 'mes' && vista === 'mes' && (
        <div data-vista="mes" style={vidrioCal}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px 8px' }}>
            <button onClick={() => cambiarMes(-1)} aria-label="Anterior" style={flechaCal}><CaretLeft size={17} weight="bold" /></button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 750, fontSize: 16, color: TEXT, textTransform: 'capitalize' }}>{MESES[m - 1]} {y}</div>
              {ym !== hoy.slice(0, 7) && (
                <button onClick={() => setYm(hoy.slice(0, 7))} style={{ border: 'none', background: 'none', color: TEXT_MUTED, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Volver a hoy</button>
              )}
            </div>
            <button onClick={() => cambiarMes(1)} aria-label="Siguiente" style={flechaCal}><CaretRight size={17} weight="bold" /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', columnGap: 3, marginBottom: 2 }}>
            {DIAS_V2.map(d => (
              <div key={d} style={{ fontSize: 11.5, fontWeight: 700, color: P.base, padding: '0 4px', letterSpacing: '.02em' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', columnGap: 3 }}>
            {celdas.map((d, i) => d
              ? <CeldaCal key={d.fecha} dia={d} P={P} hoy={hoy} ajeno={d.fecha.slice(0, 7) !== ym}
                  sobre={arrastre && arrastre.sobre === d.fecha && arrastre.desde !== d.fecha}
                  origen={arrastre && arrastre.desde === d.fecha}
                  arrastrable={arrastrable(d)} alTocar={() => abrir(d.fecha)} />
              : <div key={`h${i}`} style={{ borderTop: '0.5px solid rgba(60,60,67,0.16)' }} />)}
          </div>
          <LeyendaCal />
        </div>
      )}

      {/* ── LA SEMANA: cada día con su rutina y su estado, de un vistazo ── */}
      {listo && modo === 'mes' && vista === 'semana' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 10px' }}>
            <button onClick={() => setLunesVer(sumarDias(lunesVer, -7))} aria-label="Semana anterior" style={flechaCal}><CaretLeft size={17} weight="bold" /></button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 750, fontSize: 16, color: TEXT }}>{cortaFecha(semanaVer[0])} – {cortaFecha(semanaVer[6])}</div>
              {lunesVer !== lunes && <button onClick={() => setLunesVer(lunes)} style={{ border: 'none', background: 'none', color: TEXT_MUTED, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Volver a esta semana</button>}
            </div>
            <button onClick={() => setLunesVer(sumarDias(lunesVer, 7))} aria-label="Semana siguiente" style={flechaCal}><CaretRight size={17} weight="bold" /></button>
          </div>
          <div data-vista="semana-cal" style={{ ...vidrioCal, padding: '4px 0' }}>
            {semanaVer.map((f, i) => {
              const d = porFecha[f];
              return <FilaSemanaCal key={f} primera={i === 0} fecha={f} etiqueta={DIAS_V2[i]} dia={d} P={P} hoy={hoy} fase={fase} ejerciciosDe={ejerciciosDe}
                sobre={arrastre && arrastre.sobre === f && arrastre.desde !== f} origen={arrastre && arrastre.desde === f}
                arrastrable={arrastrable(d)} alTocar={() => d && abrir(f)}
                alAgregar={puedeAgregar(d) ? () => setEligiendo(f) : null} />;
            })}
          </div>
          <ResumenSemana dias={semanaVer.map(f => porFecha[f]).filter(Boolean)} />
        </>
      )}

      {listo && modo === 'mes' && (
        <button data-ten-en-cuenta onClick={() => setAyuda(true)} style={{ ...vidrioCal, marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
          <Info size={22} weight="fill" color={TEXT} />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 650, color: TEXT }}>Cómo mover o añadir rutinas</span>
          <CaretRight size={15} weight="bold" color="#C7C7CC" />
        </button>
      )}
      <Hoja abierta={ayuda} alCerrar={() => setAyuda(false)} titulo="Cómo mover o añadir rutinas" alto="72vh">
        <TenEnCuenta />
      </Hoja>

      {arrastre && (
        <div aria-hidden data-fantasma style={{
          position: 'fixed', left: arrastre.x, top: arrastre.y, transform: 'translate(-50%, -130%)', zIndex: 90,
          pointerEvents: 'none', background: P.base, color: '#fff', borderRadius: 12, padding: '8px 12px',
          fontSize: 14, fontWeight: 800, boxShadow: '0 10px 26px rgba(30,40,60,0.3)', whiteSpace: 'nowrap',
        }}>{nombreCorto(arrastre.nombre)}</div>
      )}
      <AvisoFlotante aviso={aviso} />

      {/* Por portal: tiene que quedar encima de la hoja de elegir rutina,
          que también va a <body>. */}
      {confirmar && createPortal(
        <div role="dialog" aria-label="Aviso de descanso" onClick={() => setConfirmar(null)} style={{
          position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(31,31,31,0.38)', display: 'grid', placeItems: 'center', padding: 22,
        }}>
          <div onClick={e => e.stopPropagation()} data-confirmar style={{ background: '#fff', borderRadius: 24, padding: '20px 20px 16px', maxWidth: 380, boxShadow: '0 16px 44px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: '-0.01em' }}>Deja descansar esos músculos</div>
            <div style={{ fontSize: 14.5, color: TEXT_MUTED, marginTop: 8, lineHeight: 1.5 }}>{confirmar.texto}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setConfirmar(null)} style={{ ...botonPrimario, flex: 1, background: TEXT }}>Mejor no</button>
              <button onClick={() => { const a = confirmar.accion; setConfirmar(null); a(); }} style={{ ...botonSuave, flex: 1, justifyContent: 'center', height: 42, borderRadius: 12 }}>{confirmar.si}</button>
            </div>
          </div>
        </div>, document.body
      )}

      <Hoja abierta={!!eligiendo} alCerrar={() => setEligiendo(null)} titulo={eligiendo ? `Añadir una rutina · ${fechaLarga(eligiendo)}` : ''} alto="70vh">
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginBottom: 12, lineHeight: 1.45 }}>
          Solo cambia ese día: tu plan base no se toca. Evita repetir los mismos músculos dos días seguidos.
        </div>
        <div data-elegir-rutina style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rutinasCiclo.map(r => (
            <button key={r.id} onClick={() => agregarRutina(eligiendo, r.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${P.base}`,
              background: '#fff', color: P.ink, fontFamily: 'inherit', fontSize: 15.5, fontWeight: 750, cursor: 'pointer', textAlign: 'left',
            }}>
              <Plus size={16} weight="bold" /> <span style={{ flex: 1 }}>{corto(r)}</span>
              {r.musculos?.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_LIGHT }}>{r.musculos.slice(0, 2).map(nombreMusculo).join(', ')}</span>}
            </button>
          ))}
        </div>
      </Hoja>

      <HojaDia
        dia={abierto ? porFecha[abierto] : null} P={P} v2 fase={fase}
        nombre={nombre} catalogo={catalogo} porFecha={porFecha}
        puedeMover={puedeMover(abierto ? porFecha[abierto] : null)}
        destinosSemana={abierto ? Array.from({ length: 14 }, (_, i) => sumarDias(lunesDeLocal(abierto), i)).filter(editable) : semana}
        alAgregarRutina={abierto && puedeAgregar(porFecha[abierto]) ? () => setEligiendo(abierto) : null}
        alQuitarRutina={abierto && porFecha[abierto]?.extra ? () => quitarRutina(abierto) : null}
        alCerrar={() => setAbierto(null)}
        alEntrenar={(id) => { setAbierto(null); alEntrenar(id); }}
        alRegistrar={(fecha) => { setAbierto(null); setRegistrando(fecha); }}
        alMover={(hasta) => moverRutina(abierto, hasta)}
        alCambio={() => recargar([abierto])}
      />
      <Actividad abierta={!!registrando} nombre={nombre} fecha={registrando}
        alCerrar={() => setRegistrando(null)}
        alGuardar={() => { const f = registrando; setRegistrando(null); recargar([f]); }} />
    </div>
  );
}

// ── Lo que toca hoy, todo junto ──────────────────────────────────────────
function HoyTeToca({ dia, P, nombre, ejerciciosDe, alEntrenar, alRegistrarActividad, alAgregar, alQuitar, alCambio }) {
  const hoy = hoyLocal();
  const r = dia?.rutina;
  const hecha = dia?.estado === 'completada';
  const registros = (dia?.eventos || []).filter(e => e.registra);
  const otros = (dia?.eventos || []).filter(e => !e.registra);
  const n = r ? ejerciciosDe[r.id] : null;
  return (
    <div data-hoy-te-toca>
      <h2 style={{ fontSize: 22, fontWeight: 750, color: TEXT, letterSpacing: '-0.02em', margin: '4px 2px 12px' }}>Hoy te toca</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {r ? (
          <button onClick={() => alEntrenar(r.id)} data-hoy-rutina style={{
            // Siempre relleno del color de la sección (también ya hecha: con
            // el chulo blanco), para que lo de hoy sea lo primero que se ve.
            width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: P.base, color: '#fff', borderRadius: 20, padding: '16px 18px',
            boxShadow: '0 8px 22px color-mix(in srgb, var(--ent-accent, #5F6670) 28%, transparent)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
              {hecha ? 'Fuerza · ya la hiciste' : dia.estado === 'en_curso' ? 'Fuerza · a medias' : dia.extra ? 'Fuerza · la añadiste tú' : 'Fuerza'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>{r.nombre}</div>
            <div style={{ fontSize: 13.5, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
              {hecha && <CheckCircle size={16} weight="fill" color="#fff" />}
              {[n ? `${n} ejercicio${n === 1 ? '' : 's'}` : null, r.minutos ? `~${r.minutos} min` : null].filter(Boolean).join(' · ') || (hecha ? 'Toca para ver lo que hiciste' : 'Toca para empezar')}
            </div>
          </button>
        ) : dia?.hecho ? (
          <div style={{ ...cajaDia, border: `1.5px solid ${P.base}` }}>
            <CheckCircle size={20} weight="fill" color={P.base} /> <span>Hoy entrenaste <b>{dia.hecho.nombre}</b>.</span>
          </div>
        ) : (
          <div style={cajaDia}><Moon size={19} color={TEXT_LIGHT} /> <span><b style={{ color: TEXT }}>Hoy descansas.</b> Descansar también es parte del plan.</span></div>
        )}

        {registros.map(ev => (
          <FilaRegistro key={ev.id} ev={ev} fecha={hoy} nombre={nombre} futuro={false} v2 alCambio={alCambio} />
        ))}

        {otros.map(ev => (
          <div key={ev.id} style={{ ...cajaDia, fontSize: 14.5 }}>
            <IconoEvento tipo={ev.tipo} size={18} />
            <span><b style={{ color: TEXT }}>{ev.hora ? `${String(ev.hora).slice(0, 5)} · ` : ''}{ev.titulo}</b>{ev.detalle ? ` · ${ev.detalle}` : ''} <span style={{ color: TEXT_LIGHT }}>· de tu coach</span></span>
          </div>
        ))}

        {(dia?.actividades || []).map(a => <ChipActividad key={a.id} actividad={a} />)}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={alRegistrarActividad} data-hoy-actividad style={{ ...botonSuave, flex: '1 1 auto', justifyContent: 'center', height: 46, background: '#fff', boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.05)' }}>
            <Plus size={16} weight="bold" /> Añadir cardio o deporte
          </button>
          {alAgregar && (
            <button onClick={alAgregar} style={{ ...botonSuave, flex: '1 1 auto', justifyContent: 'center', height: 46, background: '#fff', boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.05)' }}>
              <Plus size={16} weight="bold" /> Añadir una rutina
            </button>
          )}
          {alQuitar && !hecha && (
            <button onClick={alQuitar} style={{ ...botonSuave, flex: '1 1 auto', justifyContent: 'center', height: 46 }}>Quitar la rutina añadida</button>
          )}
        </div>
      </div>
    </div>
  );
}
const cajaDia = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 18, background: '#fff', color: TEXT_MUTED,
  fontSize: 15, lineHeight: 1.4, boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.05)',
};

// Lo que hay que saber antes de mover o añadir, en viñetas que se leen.
function TenEnCuenta() {
  const P = paleta(true);
  const items = [
    ['Mover', 'Mantén el dedo sobre una rutina y arrástrala a otro día de esta semana. También la de un día que ya pasó: si lo perdiste, la mueves para compensar.'],
    ['Añadir', 'Toca un día: en uno libre de esta semana añades una rutina, y en cualquier día que ya llegó, cardio o deporte.'],
    ['Tu plan no cambia', 'Mover o añadir solo cambia esos días. El plan que armó tu coach sigue igual.'],
    ['Descanso', 'No repitas los mismos músculos dos días seguidos: deja al menos un día entre rutinas que trabajan lo mismo (por ejemplo, dos días de pierna seguidos). Si pasa, la app te avisa.'],
  ];
  return (
    <div data-ten-en-cuenta style={{ marginTop: 12, background: '#fff', borderRadius: 18, padding: '14px 14px 10px', boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.05)' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: P.ink, background: P.tint, borderRadius: 999, padding: '4px 10px' }}>Léelo · ten en cuenta</div>
      <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(([t, d]) => (
          <li key={t} style={{ display: 'flex', gap: 9, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.42 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: P.base, flex: 'none', marginTop: 8 }} />
            <span><b style={{ color: TEXT }}>{t}.</b> {d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Semana: un renglón por día, todo escrito ────────────────────────────
function FilaDiaV2({ fecha, etiqueta, dia, P, hoy, fase, sobre, origen, arrastrable, alTocar }) {
  const esHoy = fecha === hoy;
  const nada = !dia || (!dia.rutina && !dia.hecho && !dia.eventos.length && !dia.actividades.length && !dia.inicio_ciclo && !dia.corte_pago && !dia.fin_ciclo);
  return (
    <div data-fecha={fecha} role="button" tabIndex={0} onClick={alTocar} style={{
      display: 'flex', gap: 12, padding: '11px 12px', borderRadius: 18, cursor: dia ? 'pointer' : 'default',
      background: sobre ? P.tint : esHoy ? '#F4F8FE' : SURFACE, opacity: origen ? 0.5 : 1,
      border: sobre ? `2px dotted ${P.base}` : esHoy ? `1.5px solid ${P.base}` : '1.5px solid transparent',
      boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.05)',
    }}>
      <div style={{ width: 42, flex: 'none', textAlign: 'center' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: P.base, textTransform: 'uppercase', letterSpacing: '.04em' }}>{esHoy ? 'Hoy' : etiqueta}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1.1 }}>{Number(fecha.slice(8))}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
        {dia?.inicio_ciclo && <Etiqueta Icono={Flag} color={P.ink} fondo={P.tint}>Empieza {fase?.nombre || 'tu ciclo'}</Etiqueta>}
        {dia?.fin_ciclo && <Etiqueta Icono={FlagCheckered} color={P.ink} fondo={P.tint}>Último día de {fase?.nombre || 'tu ciclo'}</Etiqueta>}
        {dia?.rutina && (
          <ChipRutina grande nombre={`${corto(dia.rutina)}${dia.extra ? ' · añadida' : ''}`} hecha={dia.estado === 'completada'} movida={dia.movida || dia.extra} P={P} arrastre={arrastrable} />
        )}
        {dia?.hecho && <ChipRutina grande nombre={`${corto(dia.hecho)}${dia.rutina ? ' (en su lugar)' : ''}`} hecha P={P} />}
        {dia?.eventos.filter(e => e.registra).map(e => (
          <Etiqueta key={e.id} Icono={null} tipo={e.tipo} color={MORADO} fondo={e.hecho ? '#EEE9FB' : '#FFFFFF'} borde={e.hecho ? 'transparent' : '#CFC3EF'} hecho={e.hecho}>
            {REGISTRO[e.tipo]?.nombre || e.titulo}
          </Etiqueta>
        ))}
        {dia?.eventos.filter(e => !e.registra).map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: TEXT_MUTED }}>
            <IconoEvento tipo={e.tipo} size={16} /> <span style={{ minWidth: 0 }}>{e.hora ? `${String(e.hora).slice(0, 5)} · ` : ''}{e.titulo}</span>
          </div>
        ))}
        {dia?.actividades.map(a => (
          <div key={a.id} style={{ fontSize: 13.5, color: TEXT_MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: P.base }} /> {a.titulo || a.tipo}{a.duracion_min ? ` · ${a.duracion_min} min` : ''}
          </div>
        ))}
        {dia?.corte_pago && <Etiqueta Icono={CurrencyCircleDollar} color={AMBAR_PAGO} fondo="#FBF1DC">Corte de tu mensualidad</Etiqueta>}
        {nada && <div style={{ fontSize: 14, color: TEXT_LIGHT, display: 'flex', alignItems: 'center', gap: 6 }}><Moon size={15} /> {dia ? 'Descanso' : '—'}</div>}
      </div>
    </div>
  );
}

function Etiqueta({ Icono, tipo, color, fondo, borde = 'transparent', hecho, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 10, background: fondo, color, border: `1.5px solid ${borde}`, fontSize: 14, fontWeight: 700, alignSelf: 'flex-start', maxWidth: '100%' }}>
      {Icono ? <Icono size={16} weight="fill" /> : <IconoEvento tipo={tipo} size={16} />}
      <span style={{ minWidth: 0 }}>{children}</span>
      {hecho && <CheckCircle size={16} weight="fill" />}
    </div>
  );
}

const botonAccion = {
  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 14,
  fontFamily: 'inherit', fontSize: 15, fontWeight: 750, cursor: 'pointer', padding: '0 10px',
};


// ═════════════════════════════════════════════════════════════════════════
// CALENDARIO ESTILO APPLE (visual nueva): una tarjeta de cristal sobre el
// fondo de la sección. En el mes, cada día dice su rutina: hecha en grafito
// con ✓, por hacer en gris, movida o añadida punteada y la que se pasó sin
// hacer, tachada. Los puntitos: cardio (verde), peso/fotos (morado) y corte
// de pago (amarillo).
// ═════════════════════════════════════════════════════════════════════════
const GRAFITO_CAL = '#1D1D1F';
const AMARILLO_CAL = '#F2C94C';
const GRIS_CAL = '#F2F2F7';
const vidrioCal = {
  background: 'rgba(255,255,255,0.86)', WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)',
  borderRadius: 24, padding: '12px 10px 14px', boxShadow: '0 10px 30px rgba(40,40,50,0.07)',
};
const flechaCal = {
  width: 34, height: 34, borderRadius: 999, border: 'none', background: 'rgba(118,118,128,0.12)', color: TEXT, cursor: 'pointer',
  display: 'grid', placeItems: 'center',
};
const PUNTO = { cardio: '#46965A', registro: '#AF52DE', pago: AMARILLO_CAL };

function Segmentado({ valor, alCambiar, opciones }) {
  return (
    <div data-segmentado role="group" style={{ display: 'flex', padding: 2, borderRadius: 11, background: 'rgba(255,255,255,0.55)', WebkitBackdropFilter: 'blur(10px)', backdropFilter: 'blur(10px)', marginBottom: 14, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.04)' }}>
      {opciones.map(([v, t]) => (
        <button key={v} onClick={() => alCambiar(v)} aria-pressed={valor === v} style={{
          flex: 1, height: 34, border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: valor === v ? 700 : 600, color: TEXT,
          background: valor === v ? '#fff' : 'transparent', boxShadow: valor === v ? '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)' : 'none',
        }}>{t}</button>
      ))}
    </div>
  );
}

// Estado de la rutina de un día: hecha, movida (o añadida), perdida o por hacer.
function estadoCal(dia, hoy) {
  if (!dia) return null;
  if (dia.rutina) {
    if (dia.estado === 'completada') return 'hecha';
    if (dia.movida || dia.extra) return 'movida';
    if (dia.fecha < hoy && !dia.hecho) return 'perdida';
    return 'pendiente';
  }
  return dia.hecho ? 'hecha' : null;
}
// «Lower + Core»: que el «+» no quede solo en un renglón.
const nombreConMas = (t) => String(t || '').replace(/ \+ /g, ' + ');

function ChipCal({ nombre, estado, arrastre }) {
  const hecha = estado === 'hecha';
  const st = hecha ? { background: GRAFITO_CAL, color: '#fff' }
    : estado === 'movida' ? { background: 'rgba(255,255,255,0.9)', color: GRAFITO_CAL, outline: `1.5px dashed ${GRAFITO_CAL}`, outlineOffset: -1.5 }
    : estado === 'perdida' ? { background: GRIS_CAL, color: '#AEAEB2', textDecoration: 'line-through' }
    : { background: GRIS_CAL, color: GRAFITO_CAL };
  return (
    <div {...(arrastre || {})} onContextMenu={e => e.preventDefault()} data-chip={hecha ? 'hecha' : estado === 'movida' ? 'movida' : estado === 'perdida' ? 'perdida' : 'pendiente'} style={{
      ...st, borderRadius: 7, padding: '3px 3px', fontSize: 10.5, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.03em', textAlign: 'left',
      overflowWrap: 'normal', wordBreak: 'keep-all', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none', cursor: arrastre ? 'grab' : 'pointer',
    }}>
      {nombreConMas(nombre)}
    </div>
  );
}

function CeldaCal({ dia, P, hoy, sobre, origen, arrastrable, alTocar, ajeno }) {
  const esHoy = dia.fecha === hoy;
  const est = estadoCal(dia, hoy);
  const puntos = [
    dia.actividades.length > 0 && PUNTO.cardio,
    dia.eventos.some(e => e.registra) && PUNTO.registro,
    dia.corte_pago && PUNTO.pago,
  ].filter(Boolean);
  const nom = dia.rutina ? corto(dia.rutina) : dia.hecho ? corto(dia.hecho) : null;
  return (
    <button data-fecha={dia.fecha} onClick={alTocar} style={{
      minHeight: 74, padding: '4px 2px 5px', cursor: 'pointer', fontFamily: 'inherit', border: 'none', borderTop: '0.5px solid rgba(60,60,67,0.16)',
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3, minWidth: 0, borderRadius: sobre ? 10 : 0,
      background: sobre ? P.tint : 'transparent', opacity: origen ? 0.45 : ajeno ? 0.5 : 1, outline: sobre ? `2px dotted ${P.base}` : 'none',
      WebkitUserSelect: 'none', userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 99, display: 'grid', placeItems: 'center', flex: 'none',
          fontSize: 14, fontWeight: esHoy ? 800 : 600, background: esHoy ? GRAFITO_CAL : 'transparent', color: esHoy ? '#fff' : TEXT,
        }}>{Number(dia.fecha.slice(8))}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {est === 'hecha' && <span data-hecha-check aria-label="Hecha" style={{ width: 13, height: 13, borderRadius: 99, background: AMARILLO_CAL, color: GRAFITO_CAL, display: 'grid', placeItems: 'center' }}><Check size={9} weight="bold" /></span>}
          {dia.inicio_ciclo && <Flag size={10} weight="fill" color={TEXT_MUTED} aria-label="Inicio de ciclo" />}
          {puntos.map((c, i) => <i key={i} style={{ width: 5, height: 5, borderRadius: 99, background: c }} />)}
        </span>
      </div>
      {nom && <ChipCal nombre={nom} estado={est} arrastre={dia.rutina ? arrastrable : null} />}
    </button>
  );
}

function LeyendaCal() {
  const item = (muestra, texto) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{muestra}{texto}</span>;
  const caja = (st) => <span style={{ width: 14, height: 10, borderRadius: 3, ...st }} />;
  const punto = (c) => <span style={{ width: 6, height: 6, borderRadius: 99, background: c }} />;
  return (
    <div data-leyenda style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 11.5, color: TEXT_MUTED, padding: '12px 4px 0', lineHeight: 1.3 }}>
      {item(caja({ background: GRAFITO_CAL }), 'Hecha')}
      {item(caja({ background: GRIS_CAL, boxShadow: 'inset 0 0 0 1px #D1D1D6' }), 'Por hacer')}
      {item(caja({ outline: `1.5px dashed ${GRAFITO_CAL}`, outlineOffset: -1.5 }), 'Movida o añadida por ti')}
      {item(punto(PUNTO.cardio), 'Cardio')}
      {item(punto(PUNTO.registro), 'Peso / fotos')}
      {item(punto(PUNTO.pago), 'Pago')}
    </div>
  );
}

function FilaSemanaCal({ primera, fecha, etiqueta, dia, P, hoy, fase, ejerciciosDe, sobre, origen, arrastrable, alTocar, alAgregar }) {
  const esHoy = fecha === hoy;
  const est = estadoCal(dia, hoy);
  const r = dia?.rutina || dia?.hecho || null;
  const n = r ? ejerciciosDe[r.id] : null;
  const sub = !r ? null : est === 'hecha' ? 'Hecha' : est === 'movida' ? (dia.extra ? 'La añadiste tú' : 'La moviste tú') : est === 'perdida' ? 'No se hizo' : (n ? `${n} ejercicio${n === 1 ? '' : 's'}` : 'Por hacer');
  const extras = [
    ...(dia?.eventos || []).map(e => ({ k: e.id, c: e.registra ? PUNTO.registro : TEXT_LIGHT, t: e.registra ? (REGISTRO[e.tipo]?.nombre || e.titulo) : e.titulo })),
    ...(dia?.actividades || []).map(a => ({ k: 'a' + a.id, c: PUNTO.cardio, t: `${a.titulo || a.tipo}${a.duracion_min ? ` · ${a.duracion_min} min` : ''}` })),
    ...(dia?.corte_pago ? [{ k: 'pago', c: PUNTO.pago, t: 'Corte de tu mensualidad' }] : []),
    ...(dia?.inicio_ciclo ? [{ k: 'ini', c: TEXT_MUTED, t: `Empieza ${fase?.nombre || 'tu ciclo'}` }] : []),
  ];
  const estilo = est === 'hecha' ? { background: GRAFITO_CAL, color: '#fff' }
    : est === 'movida' ? { outline: `1.5px dashed ${GRAFITO_CAL}`, outlineOffset: -1.5, background: 'rgba(255,255,255,0.7)', color: GRAFITO_CAL }
    : est === 'perdida' ? { background: GRIS_CAL, color: '#AEAEB2' } : { background: GRIS_CAL, color: GRAFITO_CAL };
  return (
    <div data-fecha={fecha} role="button" tabIndex={0} onClick={alTocar} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: dia ? 'pointer' : 'default',
      borderTop: primera ? 'none' : '0.5px solid rgba(60,60,67,0.12)', background: sobre ? P.tint : 'transparent', opacity: origen ? 0.5 : 1,
    }}>
      <div style={{ width: 40, flex: 'none', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '.05em', textTransform: 'uppercase' }}>{etiqueta}</div>
        <div style={{ width: 30, height: 30, margin: '2px auto 0', borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 750,
          background: esHoy ? GRAFITO_CAL : 'transparent', color: esHoy ? '#fff' : TEXT }}>{Number(fecha.slice(8))}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {r ? (
          <div {...(dia?.rutina ? (arrastrable || {}) : {})} data-chip={est === 'hecha' ? 'hecha' : est || 'pendiente'} onContextMenu={e => e.preventDefault()} style={{
            padding: '9px 12px', borderRadius: 14, WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none', ...estilo,
          }}>
            <div style={{ fontSize: 16, fontWeight: 750, textDecoration: est === 'perdida' ? 'line-through' : 'none' }}>
              {est === 'hecha' && <span style={{ color: AMARILLO_CAL }}>✓ </span>}{corto(r)}
            </div>
            {sub && <div style={{ fontSize: 12.5, opacity: est === 'hecha' ? 0.7 : 0.62, marginTop: 1 }}>{sub}</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#AEAEB2' }}>{dia ? 'Descanso' : '—'}</span>
            {alAgregar && <button onClick={(e) => { e.stopPropagation(); alAgregar(); }} style={{ border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 650, color: TEXT_MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={13} weight="bold" /> Añadir</button>}
          </div>
        )}
        {extras.map(x => (
          <div key={x.k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: TEXT_MUTED }}>
            <i style={{ width: 6, height: 6, borderRadius: 99, background: x.c, flex: 'none' }} /><span style={{ minWidth: 0 }}>{x.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumenSemana({ dias }) {
  const conRutina = dias.filter(d => d.rutina || d.hecho);
  const hechas = conRutina.filter(d => d.estado === 'completada' || (!d.rutina && d.hecho)).length;
  const cardio = dias.filter(d => d.actividades.length > 0).length;
  const caja = (k, v, u) => (
    <div style={{ ...vidrioCal, flex: 1, padding: '12px 16px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '.06em' }}>{k}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: TEXT, marginTop: 2 }}>{v} <span style={{ fontSize: 14.5, color: TEXT_MUTED, fontWeight: 600 }}>{u}</span></div>
    </div>
  );
  return (
    <div data-resumen-semana style={{ display: 'flex', gap: 10, marginTop: 12 }}>
      {caja('ESTA SEMANA', hechas, `de ${conRutina.length} rutina${conRutina.length === 1 ? '' : 's'}`)}
      {caja('CARDIO', cardio, cardio === 1 ? 'día' : 'días')}
    </div>
  );
}
