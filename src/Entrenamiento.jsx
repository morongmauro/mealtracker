import React, { useState, useEffect, useRef, useCallback } from 'react';
import { vibrar as vibrarL25 } from './vibrar.js';
import { createPortal } from 'react-dom';
import EntrenoMes, { HoySemana, precargarMeses, AvisoFlotante, ACTUALIZANDO } from './EntrenoMes.jsx';
import EntrenoRutinas from './EntrenoRutinas.jsx';
import EntrenoResumen from './EntrenoResumen.jsx';
import EntrenoFotos from './EntrenoFotos.jsx';
import EntrenoActividad, { ChipActividad, TarjetaCardioCoach } from './EntrenoActividad.jsx';
import EntrenoFicha from './EntrenoFicha.jsx';
import EntrenoGaleria, { precargarGaleria } from './EntrenoGaleria.jsx';
import { HojaMedida } from './EntrenoMedidas.jsx';
import HojaNota from './EntrenoNota.jsx';
import { api as entrenoApi, miniatura, hoyLocal, numero, descansoEnCircuito, convertir, sinPeso, rutinaAbierta, guardarRutinaAbierta, borrarRutinaAbierta, rutinaEnCurso, guardarRutinaEnCurso, borrarRutinaEnCurso, fechaLarga, codigoDia, fijarClaveTecleado, borrarTecleado, leerTecleado, useAlVolverRed, conPase, siPaseInvalido } from './entrenoDatos.js';
import { crearCola, guardarRutinaLocal, leerRutinaLocal } from './entrenoCola.js';
import { nombresEj, v2Activa, WHATSAPP_COACH } from './v2.js';
import { enVerComo } from './verComo.js';
import { lote25 } from './vistaApp.js';
import { avisoPermitido } from './avisos.js';
import { Pastilla, BotonCristal, TONO_ATAJOS, FilaCristal } from './PastillaV2.jsx';
import CabeceraHoy from './CabeceraHoy.jsx';
import { CabezaCompacta } from './VistaCompacta.jsx';
import { vozEntreno, vozFinEntreno } from './vozCoach.js';
import Firma from './Firma.jsx';
import { Conteo, Confeti, asegurarCSS, vibrar } from './Celebraciones.jsx';
import { useUnidades, HojaUnidades } from './Unidades.jsx';
import { aroEntrenoDe, progresoEntrenoDelPlan } from './aros.js';
import ExplicacionAro from './ExplicacionAro.jsx';
import { Bell, Ruler, CheckCircle, WhatsappLogo, ChatCircle, Wind, Snowflake, Fire, Camera, CaretRight } from '@phosphor-icons/react';
import Respira from './Respira.jsx';
import Reconocimiento from './Reconocimiento.jsx';
import { prepararSonido, sonarInicioDescanso, programarFinDescanso, programarAviso, sonarFinDescanso } from './sonidoDescanso.js';
import { EjercicioV2, CircuitoV2, SeparadorMomento, fasesDeTramos, claseMomento, CuentaEjercicio, porLado, TipIconos, AvisoComentarios } from './EntrenoEjercicioV2.jsx';
import { rutinaLigera, enPrueba } from './vistaApp.js';
import { Trophy as TrophyV2 } from '@phosphor-icons/react';
import { Dumbbell, Calendar, ChevronLeft, Check, Play, Loader2, Info, Timer, CloudOff } from 'lucide-react';
import {
  SURFACE, SURFACE_2, BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT,
  SHADOW_CARD, FONT_DISPLAY, SECCION,
} from './theme.js';
// El aro de la cabecera de Entrenamiento: el progreso de la semana (rutinas
// hechas de las planeadas) y, en el pie, si va al día o cuántas se quedaron
// sin hacer (aros.js).
export function aroEntreno(plan) {
  return aroEntrenoDe(progresoEntrenoDelPlan(plan));
}

// El acento del módulo sale de entrenoUI: oliva de siempre, azul en la visual nueva.
import { ACCENT, ACCENT_DARK, ACCENT_PASTEL, SUCCESS, Hoja, Boton } from './entrenoUI.jsx';

// ─────────────────────────────────────────────────────────────────────────
// MÓDULO DE ENTRENAMIENTO
//
// El coach arma fases y rutinas en el CRM; aquí el cliente ve su semana,
// abre la rutina del día y marca lo que levantó. Todo pasa por /api/training,
// que lee y escribe en el Supabase del CRM — el navegador nunca toca la base.
//
// Dos decisiones que mandan sobre el resto de la pantalla:
//
// 1. LO ÚLTIMO QUE LEVANTÓ VA PEGADO AL EJERCICIO, no escondido en un
//    historial aparte. Es LA información que se mira antes de cargar la
//    barra, y tenerla a dos toques de distancia es la diferencia entre
//    progresar y repetir el mismo peso tres semanas.
//
// 2. CADA SERIE SE GUARDA SOLA, en el momento. Nada de un botón "guardar
//    entrenamiento" al final: si se cierra la app a mitad de sesión, lo
//    marcado ya está guardado y al volver sigue ahí.
//
// El aire de arriba y abajo no es estético: la app pinta degradados encima y
// su barra ovalada tapa los últimos ~96px.
// ─────────────────────────────────────────────────────────────────────────

const FADE_TOP = 46;
const FADE_BOTTOM = 96;
const CODIGO_DE = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return 'DLMXJVS'[new Date(y, m - 1, d).getDay()]; };
const DIAS_LARGO = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };
// «jueves 23»: el día de una fecha del calendario, dicho corto.
const diaDe = (iso) => `${DIAS_LARGO[codigoDia(iso)].toLowerCase()} ${Number(String(iso).slice(8))}`;

// Nunca lanza: sin red devuelve { ok:false } y la pantalla lo dice. Antes un
// fallo de red dejaba la rutina con el spinner girando para siempre.
const api = async (body) => {
  try {
    const r = await fetch('/api/training', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conPase(body)),
    });
    if (!r.ok) return { ok: false, motivo: `http_${r.status}` };
    return siPaseInvalido(await r.json());
  } catch (e) {
    return { ok: false, motivo: 'sin_red' };
  }
};

const almacen = (() => {
  try { return window.localStorage; } catch (e) { return { getItem: () => null, setItem: () => {} }; }
})();
// Una sola cola para toda la app: las series marcadas sin señal esperan aquí.
const cola = crearCola({ almacen, api: entrenoApi, hoy: hoyLocal });
// Para la mudanza de dirección: sube lo pendiente antes de irse.
export const vaciarCola = () => cola.vaciar();
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { cola.vaciar(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') cola.vaciar();
  });
}

// Las cuatro secciones. La navegación va ARRIBA y no abajo: el módulo se
// pinta dentro de la app, cuyo barra ovalada inferior taparía cualquier cosa
// que pusiéramos ahí.
const SECCIONES = [
  ['hoy', 'Hoy'],
  ['mes', 'Mes'],
  ['rutinas', 'Rutinas'],
  ['resumen', 'Resumen'],
  // 'Fotos' se quitó a propósito: por ahora las fotos llegan por WhatsApp.
  // Para volver a mostrarla: ['fotos', 'Fotos'] aquí y FOTOS_ACTIVAS en la API.
];

// FUERA del componente a propósito. Definidos dentro, cada render de la app
// (que sondea metas y recordatorios cada minuto) creaba un componente NUEVO y
// React desmontaba la rutina abierta entera: se perdía el cronómetro de
// descanso y lo tecleado sin marcar, a mitad del entreno.
// Vista compacta: lo que se elige arriba de Entrenamiento (la Galería va en «Más»).
const OPCIONES_COMPACTA = [['hoy', 'Hoy'], ['mes', 'Calendario']];

const Envoltorio = ({ children }) => (
  <div style={{
    position: 'relative', maxWidth: 560, margin: '0 auto', padding: '0 20px',
    paddingTop: `calc(${FADE_TOP}px + env(safe-area-inset-top, 0px) + 12px)`,
    paddingBottom: `calc(${FADE_BOTTOM}px + env(safe-area-inset-bottom, 0px))`,
  }}>{children}</div>
);

const Nav = ({ seccion, setSeccion }) => (
  <nav style={{
    display: 'flex', gap: 3, background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${BORDER}`, borderRadius: 999, padding: 3,
    marginBottom: 18, position: 'sticky', top: 8, zIndex: 30,
  }}>
    {SECCIONES.map(([id, lab]) => (
      <button key={id} onClick={() => setSeccion(id)} style={{
        flex: 1, border: 'none', borderRadius: 999, padding: '9px 6px',
        background: seccion === id ? ACCENT : 'transparent',
        color: seccion === id ? '#fff' : TEXT_MUTED,
        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      }}>{lab}</button>
    ))}
  </nav>
);

// `seccionV2`: con la visual nueva la sección la elige la barra de abajo de
// la app (Hoy · Calendario · Galería) y la navegación de arriba no se pinta.
const SinNav = () => null;

// `recordatorios` (visual nueva): { pendientes, abrir } — la píldora de
// Recordatorios va arriba de Hoy, como en el Dash.
// Último plan traído, por cliente. Al volver al módulo (o cambiar de opción en
// la barra) se pinta ESTE al instante y se refresca por detrás: antes cada
// vuelta mostraba el «cargando» aunque nada hubiera cambiado.
const cachePlan = new Map();

// Lo marcado de una rutina que sigue en el teléfono sin subir (es lo más nuevo).
// Las desmarcadas quedan como `null` para que borren lo que diga el servidor.
function marcadasDeCola(name, rutinaId, fecha) {
  const m = {};
  cola.pendientes(x => x.name === name && x.rutina_id === rutinaId && x.fecha === fecha).forEach(x => {
    const k = `${x.datos.rutina_ejercicio_id}:${x.datos.serie_num}`;
    m[k] = x.datos.completada === false ? null : { reps: x.datos.reps, peso: x.datos.peso, unidad: x.datos.unidad || 'kg' };
  });
  return m;
}
const sobre = (m, cambios) => {
  const n = { ...m };
  Object.entries(cambios).forEach(([k, v]) => { if (v) n[k] = v; else delete n[k]; });
  return n;
};

// Lo llama la app al abrir (en un rato libre): deja el plan y la semana
// listos antes de que el cliente toque Entrenamiento.
export async function precargar(name) {
  if (!name) return null;
  if (cachePlan.has(name)) return cachePlan.get(name);
  const r = await api({ accion: 'plan', name });
  if (r && r.ok && !cachePlan.has(name)) cachePlan.set(name, r);
  precargarMeses(name);
  if (r && r.ok) precargarRutinas(name, r).then(() => precargarGaleria(name));
  return r && r.ok ? r : null;
}

// Lo que identifica el plan: la fase y sus rutinas. Si el coach cambia de
// fase o de rutinas, cambia la firma y Entrenamiento muestra su puntito.
export function firmaPlan(r) {
  if (!r || !r.ok) return null;
  const ids = [...new Set((r.dias || []).map(d => d.rutina && d.rutina.id).filter(Boolean))].sort();
  return `${(r.fase && (r.fase.id || r.fase.nombre)) || ''}|${ids.join(',')}`;
}

// Las rutinas de la semana quedan guardadas en el teléfono antes de tocarlas:
// al abrir una se pinta al instante con esa copia y se actualiza por detrás.
// Primero la de hoy; una tras otra, sin amontonar pedidos. Una vez por
// rutina y por visita a la app.
const rutinasTraidas = new Set();
export async function precargarRutinas(name, plan) {
  const dias = (plan && plan.dias) || [];
  const ids = [];
  [...dias.filter(d => d.es_hoy), ...dias].forEach(d => {
    const id = d && d.rutina && d.rutina.id;
    if (id && !ids.includes(id) && !rutinasTraidas.has(`${name}|${id}`)) ids.push(id);
  });
  for (const id of ids) {
    rutinasTraidas.add(`${name}|${id}`);
    const r = await api({ accion: 'rutina', name, id });
    if (r && r.ok && r.rutina) guardarRutinaLocal(almacen, r.rutina);
    else rutinasTraidas.delete(`${name}|${id}`);
  }
}

export default function Entrenamiento({ name, seccionV2 = null, alSeccionV2, recordatorios = null, avisoPago = null, compacta = false }) {
  const [plan, setPlan] = useState(() => cachePlan.get(name) || null);
  const [cargando, setCargando] = useState(() => !cachePlan.has(name));
  // La rutina que quedó abierta (si la página se recargó o la app se cerró a
  // mitad del entreno) se vuelve a abrir sola.
  const [rutinaId, setRutinaId] = useState(() => (rutinaAbierta() || {}).id || null);
  // De qué día del calendario se abrió (si era otro día y no se movió).
  const [rutinaPlan, setRutinaPlan] = useState(() => (rutinaAbierta() || {}).planeada || null);
  const abrirRutina = useCallback((id, planeada = null) => { setRutinaPlan(planeada || null); setRutinaId(id); }, []);
  const [seccionPropia, setSeccionPropia] = useState('hoy');
  const seccion = seccionV2 || seccionPropia;
  const setSeccion = seccionV2 ? (alSeccionV2 || (() => {})) : setSeccionPropia;
  const NavSi = seccionV2 ? SinNav : Nav;
  // Tocar otra opción de la barra con una rutina abierta lleva a esa opción
  // (solo cuando la opción CAMBIA; al montar se respeta la rutina que se
  // volvió a abrir, también con el doble montaje de React en desarrollo).
  const seccionAnterior = useRef(seccionV2);
  useEffect(() => {
    if (seccionV2 && seccionAnterior.current !== seccionV2) { setRutinaId(null); borrarRutinaAbierta(); }
    seccionAnterior.current = seccionV2;
  }, [seccionV2]);

  const cargarPlan = useCallback(async () => {
    if (!cachePlan.has(name)) setCargando(true);
    const r = await api({ accion: 'plan', name });
    if (r && r.ok) { cachePlan.set(name, r); precargarRutinas(name, r); }
    // Sin red y con algo guardado: se queda lo guardado, no un «sin plan».
    setPlan(r && r.ok ? r : (cachePlan.get(name) || { ok: false }));
    setCargando(false);
  }, [name]);

  useEffect(() => { cargarPlan(); }, [cargarPlan]);
  useAlVolverRed(cargarPlan);
  // Lo que quedó sin subir de la última vez sube al entrar.
  useEffect(() => { cola.vaciar(); }, []);

  // Al cambiar de sección se sube. Sin esto, saltar de un Mes largo a Hoy te
  // deja a media página en un sitio que ya no existe.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [seccion, rutinaId]);
  // El aro de la cabecera, tocado: qué mide.
  const [explicarAro, setExplicarAro] = useState(false);
  const explicacionAro = () => {
    const pe = progresoEntrenoDelPlan(plan);
    const n = pe ? pe.pendientes : 0;
    return {
      titulo: 'Tu semana de entreno', grande: pe ? `${pe.hechas} de ${pe.planeadas}` : '—',
      que: pe ? 'rutinas de la semana hechas' : 'sin rutinas planeadas esta semana',
      partes: pe ? [{ nombre: 'Al día', valor: n ? `${n} sin hacer` : 'Sí',
        detalle: n ? `${n} rutina${n === 1 ? '' : 's'} que ya tocaba${n === 1 ? '' : 'n'} y no está${n === 1 ? '' : 'n'} hecha${n === 1 ? '' : 's'}. Puedes moverla${n === 1 ? '' : 's'} a otro día en Tu semana.`
          : 'Todo lo que ya tocaba está hecho. Lo que viene después no te resta nada.' }] : [],
      nota: 'El aro se llena con las rutinas de fuerza de la semana. El cardio y las actividades del coach van en su lista, no en el aro.',
    };
  };

  if (rutinaId) {
    return (
      <Envoltorio>
        <VistaRutina
          name={name} rutinaId={rutinaId} plan={plan} compacta={compacta} planeada={rutinaPlan}
          onVolver={() => { setRutinaId(null); borrarRutinaAbierta(); cargarPlan(); }}
        />
      </Envoltorio>
    );
  }


  if (cargando) {
    return <Envoltorio><Centrado><Loader2 size={20} className="animate-spin" color={TEXT_LIGHT} /></Centrado></Envoltorio>;
  }

  // El Mes, las Rutinas y el Resumen se pintan aunque no haya plan activo:
  // cada uno sabe decir que está vacío, y el Mes sigue sirviendo para
  // registrar cardio de días pasados aunque el coach no haya enviado nada.
  if (seccion !== 'hoy') {
    return (
      <Envoltorio>
        <NavSi seccion={seccion} setSeccion={setSeccion} />
        {/* La voz de la sección, con la letra de la marca y sin curva */}
        {/* Vista compacta: título y Hoy | Calendario, sin cabecera grande. */}
        {compacta && seccion === 'mes' ? <CabezaCompacta titulo="Entrenamiento" opciones={OPCIONES_COMPACTA} activa={seccion} alElegir={setSeccion} />
          : seccionV2 && VOZ_SECCION[seccion] && <CabeceraHoy tema="entreno" fondo={false} voz={VOZ_SECCION[seccion]} />}
        {seccion === 'mes' && <EntrenoMes nombre={name} alEntrenar={abrirRutina}
          ejerciciosDe={Object.fromEntries((plan?.dias || []).flatMap(d => [...(d.rutina ? [[d.rutina.id, d.rutina.ejercicios]] : []), ...(d.complementarias || []).map(c => [c.id, c.ejercicios])]))} />}
        {seccion === 'rutinas' && <EntrenoRutinas nombre={name} alEntrenar={abrirRutina} />}
        {seccion === 'resumen' && <EntrenoResumen nombre={name} />}
        {seccion === 'fotos' && <EntrenoFotos name={name} />}
        {seccion === 'galeria' && <EntrenoGaleria nombre={name} />}
        {seccionV2 && <Firma style={{ marginTop: 28 }} />}
      </Envoltorio>
    );
  }

  if (!plan || !plan.ok) {
    return (
      <Envoltorio>
        <NavSi seccion={seccion} setSeccion={setSeccion} />
        {compacta ? <CabezaCompacta titulo="Entrenamiento" opciones={OPCIONES_COMPACTA} activa={seccion} alElegir={setSeccion} /> : (<>
        {seccionV2 && <CabeceraHoy tema="entreno" voz={vozEntreno({ plan, hoy: hoyLocal() })}
        arriba={`calc(${FADE_TOP}px + env(safe-area-inset-top, 0px) + 12px)`} />}
      {recordatorios && <PildoraRecordatorios {...recordatorios} />}
        </>)}
        <Tarjeta>
          <Fila icono={<Info size={18} color={TEXT_LIGHT} />} titulo="Todavía no hay nada aquí" />
          <Vacio texto="Cuando tu coach cargue tu primera fase de entrenamiento, aquí aparece tu semana." />
        </Tarjeta>
        <BloqueActividad name={name} />
        {seccionV2 && <Firma style={{ marginTop: 28 }} />}
      </Envoltorio>
    );
  }

  return (
    <Envoltorio>
      <NavSi seccion={seccion} setSeccion={setSeccion} />
      {compacta ? (
        <CabezaCompacta titulo="Entrenamiento" aro={aroEntreno(plan)} alTocarAro={() => setExplicarAro(true)}
          opciones={OPCIONES_COMPACTA} activa={seccion} alElegir={setSeccion} />
      ) : (<>
      {seccionV2 && <CabeceraHoy tema="entreno" voz={vozEntreno({ plan, hoy: hoyLocal() })}
        arriba={`calc(${FADE_TOP}px + env(safe-area-inset-top, 0px) + 12px)`} aro={{ ...aroEntreno(plan), alTocar: () => setExplicarAro(true) }} />}
      {recordatorios && <PildoraRecordatorios {...recordatorios} />}
      </>)}
      {explicarAro && <ExplicacionAro {...explicacionAro()} alCerrar={() => setExplicarAro(false)} />}
      {v2Activa() ? (
        // Visual nueva: lo de HOY todo junto (fuerza, registros, lo del coach
        // y añadir actividad) y, debajo, la semana con el detalle de cada
        // día. El Calendario queda para el mes: no se repite lo mismo.
        <>
          {enPrueba() && <ContinuarRutina plan={plan} alAbrir={abrirRutina} />}
          <HoySemana nombre={name} alEntrenar={abrirRutina}
            ejerciciosDe={Object.fromEntries((plan.dias || []).flatMap(d => [...(d.rutina ? [[d.rutina.id, d.rutina.ejercicios]] : []), ...(d.complementarias || []).map(c => [c.id, c.ejercicios])]))} />
          <Sueltas plan={plan} onAbrir={abrirRutina} />
        </>
      ) : (
        <>
          <VistaSemana plan={plan} onAbrir={abrirRutina} />
          <BloqueActividad name={name} />
        </>
      )}
      {seccionV2 && <Firma style={{ marginTop: 28 }} />}
    </Envoltorio>
  );
}

function CabeceraFase({ fase: f, v2 = false }) {
  if (!f) return null;
  // Visual nueva: la semana ya la dice la cabecera; aquí solo el ciclo y su
  // objetivo, en una línea discreta.
  if (v2) {
    return (
      <div data-fase style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '0 2px 14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 750, color: TEXT, letterSpacing: '-0.01em' }}>{f.nombre}</span>
        {f.objetivo && <span style={{ fontSize: 13.5, color: TEXT_MUTED }}>{f.objetivo}</span>}
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1, color: TEXT }}>{f.nombre}</div>
      {f.objetivo && <div style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 5 }}>{f.objetivo}</div>}
    </div>
  );
}

// Vista en prueba: la rutina empezada hoy y sin terminar (salió a otra
// sección o volvió a su semana): arriba de Hoy, un toque para seguir donde iba.
function ContinuarRutina({ plan, alAbrir }) {
  const r = rutinaEnCurso();
  if (!r) return null;
  const dias = (plan && plan.dias) || [];
  const hecha = dias.some(d => d.es_hoy && d.rutina && d.rutina.id === r.id && d.estado === 'completada');
  if (hecha) return null;
  let desde = null;
  try { desde = Number(localStorage.getItem(`mt:inicioEntreno:${r.id}:${r.fecha}`)) || null; } catch (e) { /* nada */ }
  const hora = desde ? new Date(desde).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' }) : null;
  return (
    <button data-continuar-rutina onClick={() => alAbrir(r.id)} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', margin: '0 0 14px', padding: '14px 14px 14px 18px',
      border: 'none', borderRadius: 24, background: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit',
      boxShadow: '0 1px 2px rgba(20,20,30,0.04), 0 8px 22px rgba(20,30,60,0.08)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em', color: '#EE8434' }}>RUTINA A MEDIAS</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nombre || 'Tu rutina de hoy'}</div>
        {hora && <div style={{ fontSize: 13, color: '#6E6E73', fontWeight: 600, marginTop: 2 }}>Empezaste a las {hora}. Lo marcado sigue guardado.</div>}
      </div>
      <span style={{ flex: 'none', height: 40, padding: '0 16px', display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: TEXT, color: '#fff', fontSize: 14, fontWeight: 700 }}>Continuar</span>
    </button>
  );
}

function Sueltas({ plan, onAbrir }) {
  if (!plan.sueltas || !plan.sueltas.length) return null;
  return (
    <>
      <div style={{ fontSize: 13.5, fontWeight: 750, color: TEXT_MUTED, margin: '22px 2px 8px' }}>También en tu ciclo</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.sueltas.map(r => (
          <button key={r.id} onClick={() => onAbrir(r.id)} style={filaBase(false)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT }}>{r.nombre}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>{r.ejercicios} ejercicios · sin día fijo</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ── ADEMÁS DE LA FUERZA ───────────────────────────────────────────────────
// Va DEBAJO de la semana y en gris a propósito. El cliente abre esto para
// saber qué le toca entrenar; si el cardio compite por la atención, entra a
// marcar la caminata y se le olvida el Push.
function BloqueActividad({ name }) {
  const [hoyMes, setHoyMes] = useState(null);
  const [registrando, setRegistrando] = useState(false);

  const cargar = useCallback(async () => {
    const hoy = hoyLocal();
    const r = await entrenoApi.mes(name, hoy.slice(0, 7));
    if (r && r.ok) setHoyMes((r.dias || []).find(d => d.fecha === hoy) || null);
  }, [name]);
  useEffect(() => { cargar(); }, [cargar]);

  const actividades = hoyMes?.actividades || [];
  const eventos = hoyMes?.eventos || [];
  // Día de medición (lo pone el coach en el calendario): el botón para
  // registrarla va aquí mismo, donde el cliente mira qué le toca hoy.
  const hayMedicion = eventos.some(ev => ev.tipo === 'medicion');
  const [midiendo, setMidiendo] = useState(false);

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 8, marginBottom: 10,
      }}>
        <h2 style={{
          fontSize: 12, fontWeight: 800, letterSpacing: '.08em',
          textTransform: 'uppercase', color: TEXT_LIGHT, margin: 0,
        }}>Además de la fuerza</h2>
        <button onClick={() => setRegistrando(true)} style={{
          border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
          fontSize: 12.5, fontWeight: 700, color: ACCENT_DARK, fontFamily: 'inherit',
        }}>+ Registrar</button>
      </div>

      {hayMedicion && (
        <button onClick={() => setMidiendo(true)} style={{
          width: '100%', textAlign: 'left', border: `1px solid ${BORDER}`, background: SURFACE,
          borderRadius: 14, padding: '13px 14px', marginBottom: 8, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: SHADOW_CARD,
        }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT }}>Hoy toca medirte</div>
          <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 2 }}>Registra tu peso y % de grasa · o mándale el pantallazo a tu coach</div>
        </button>
      )}
      <HojaMedida abierta={midiendo} nombre={name} alCerrar={() => setMidiendo(false)} alGuardar={() => setMidiendo(false)} />

      {eventos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {eventos.map(ev => (
            <div key={ev.id} style={{
              border: `1px dashed ${BORDER}`, borderRadius: 12, padding: '9px 12px',
              fontSize: 12.5, color: TEXT_MUTED,
            }}>
              {ev.hora ? `${String(ev.hora).slice(0, 5)} · ` : ''}{ev.titulo}
              <span style={{ color: TEXT_LIGHT, marginLeft: 6 }}>· de tu coach</span>
            </div>
          ))}
        </div>
      )}

      {actividades.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {actividades.map(a => <ChipActividad key={a.id} actividad={a} />)}
        </div>
      ) : (
        <button onClick={() => setRegistrando(true)} style={{
          width: '100%', border: `1px dashed ${BORDER}`, background: 'transparent',
          borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
          color: TEXT_LIGHT, fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
        }}>
          ¿Caminaste, nadaste, hiciste cardio? Márcalo aquí.
        </button>
      )}

      <EntrenoActividad
        abierta={registrando}
        nombre={name}
        alCerrar={() => setRegistrando(false)}
        alGuardar={() => { setRegistrando(false); cargar(); }}
      />
    </div>
  );
}

// ── LA SEMANA ─────────────────────────────────────────────────────────────
function VistaSemana({ plan, onAbrir }) {
  const f = plan.fase;
  const hoy = plan.dias.find(d => d.es_hoy);

  return (
    <>
      {f ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 26, letterSpacing: '0.03em',
            textTransform: 'uppercase', lineHeight: 1, color: TEXT,
          }}>{f.nombre}</div>
          {f.objetivo && <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 5 }}>{f.objetivo}</div>}
        </div>
      ) : (
        <Tarjeta>
          <Fila icono={<Calendar size={18} color={ACCENT} />} titulo="Sin fase activa" />
          <Vacio texto="Tu coach todavía no ha activado una fase de entrenamiento. En cuanto lo haga, tu semana aparece aquí." />
        </Tarjeta>
      )}

      {/* LO DE HOY primero y en grande: es lo que se viene a buscar. */}
      {hoy && (
        hoy.descanso ? (
          <Tarjeta>
            <Fila icono={<Calendar size={18} color={TEXT_LIGHT} />} titulo="Hoy descansas" />
            <Vacio texto="Sin entreno programado. Descansar también es parte del plan." />
          </Tarjeta>
        ) : (
          <button onClick={() => onAbrir(hoy.rutina.id)} style={{
            width: '100%', textAlign: 'left', border: 0, cursor: 'pointer',
            background: hoy.hecha ? SURFACE : ACCENT_DARK,
            color: hoy.hecha ? TEXT : '#fff',
            borderRadius: 18, padding: 18, marginBottom: 14, boxShadow: SHADOW_CARD,
          }}>
            <div style={{
              fontSize: 11.5, fontWeight: 700,
              color: hoy.hecha ? TEXT_LIGHT : ACCENT_PASTEL, marginBottom: 6,
            }}>{hoy.hecha ? (hoy.hecha_el ? 'Hoy · ya la hiciste esta semana' : 'Hoy · ya entrenaste') : hoy.en_curso ? 'Hoy · a medias' : 'Hoy te toca'}</div>
            <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {hoy.rutina.nombre}
            </div>
            <div style={{
              fontSize: 12.5, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8,
              color: hoy.hecha ? TEXT_MUTED : 'rgba(255,255,255,0.82)',
            }}>
              {hoy.hecha ? <Check size={15} /> : <Play size={14} />}
              <span>
                {hoy.rutina.ejercicios} ejercicio{hoy.rutina.ejercicios === 1 ? '' : 's'}
                {hoy.rutina.minutos ? ` · ~${hoy.rutina.minutos} min` : ''}
              </span>
            </div>
          </button>
        )
      )}

      {/* Los bloques aparte de hoy (un recovery), debajo de la fuerza. */}
      {hoy && (hoy.complementarias || []).map(c => (
        <button key={c.id} data-hoy-bloque={c.id} onClick={() => onAbrir(c.id)} style={{ ...filaBase(false), marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TEXT_LIGHT }}>{c.hecha ? 'También hoy · ya lo hiciste' : 'También hoy'}</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT }}>{c.nombre}</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>{c.ejercicios} ejercicio{c.ejercicios === 1 ? '' : 's'}{c.minutos ? ` · ~${c.minutos} min` : ''}</div>
          </div>
        </button>
      ))}

      <div style={{
        fontSize: 11.5,
        fontWeight: 800, color: TEXT_LIGHT, margin: '18px 2px 8px',
      }}>Tu semana</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.dias.map(d => (
          <FilaDia key={d.dia} d={d} onAbrir={onAbrir} />
        ))}
      </div>

      {plan.sueltas && plan.sueltas.length > 0 && (
        <>
          <div style={{
            fontSize: 11.5,
            fontWeight: 800, color: TEXT_LIGHT, margin: '18px 2px 8px',
          }}>También en tu fase</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.sueltas.map(r => (
              <button key={r.id} onClick={() => onAbrir(r.id)} style={filaBase(false)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT }}>{r.nombre}</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>{r.ejercicios} ejercicios · sin día fijo</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

const filaBase = (hoy) => ({
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
  background: SURFACE, border: hoy ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER_SOFT}`,
  borderRadius: 14, padding: '12px 14px', cursor: 'pointer', boxShadow: SHADOW_CARD,
});

function FilaDia({ d, onAbrir }) {
  const contenido = (
    <>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        display: 'grid', placeContent: 'center',
        background: d.hecha ? SUCCESS : d.descanso ? SURFACE_2 : ACCENT_PASTEL,
        color: d.hecha ? '#fff' : d.descanso ? TEXT_LIGHT : ACCENT_DARK,
        fontSize: 12.5, fontWeight: 800,
      }}>{d.hecha ? <Check size={16} /> : d.dia}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14.5, fontWeight: d.descanso ? 500 : 700,
          color: d.descanso ? TEXT_MUTED : TEXT,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{d.descanso ? 'Descanso' : d.rutina.nombre}</div>
        <div style={{ fontSize: 11.5, color: TEXT_LIGHT }}>
          {DIAS_LARGO[d.dia]}
          {d.es_hoy ? ' · hoy' : ''}
          {!d.descanso && d.rutina.ejercicios ? ` · ${d.rutina.ejercicios} ejercicios` : ''}
          {d.en_curso && !d.hecha ? ' · a medias' : ''}
          {d.saltada ? ' · no pudiste' : ''}
          {d.hecha_el ? ` · la hiciste el ${DIAS_LARGO[CODIGO_DE(d.hecha_el)].toLowerCase()}` : ''}
          {(d.complementarias || []).length ? ` · + ${d.complementarias.map(c => c.nombre).join(', ')}` : ''}
        </div>
      </div>
    </>
  );
  if (d.descanso) return <div style={{ ...filaBase(d.es_hoy), cursor: 'default' }}>{contenido}</div>;
  return <button onClick={() => onAbrir(d.rutina.id)} style={filaBase(d.es_hoy)}>{contenido}</button>;
}

// ── UNA RUTINA, Y SU EJECUCIÓN ────────────────────────────────────────────
function VistaRutina({ name, rutinaId, onVolver, plan = null, compacta = false, planeada = null }) {
  // Vista en prueba (solo Mauro): barra de avance discreta y velo debajo.
  const prueba = enPrueba();
  // Se abre AL INSTANTE con la copia guardada en el teléfono (la precarga deja
  // las de la semana listas) y lo del servidor llega por detrás, con un
  // «Actualizando…» pequeño mientras tanto. Antes había que esperar dos
  // pedidos seguidos mirando una pantalla vacía.
  const [datos, setDatos] = useState(() => leerRutinaLocal(almacen, rutinaId));
  const [sinRed, setSinRed] = useState(false);     // se abrió con la copia del teléfono
  const [sesion, setSesion] = useState(null);
  const [reabriendo, setReabriendo] = useState(false);
  const reabrir = async () => {
    if (!sesion) return;
    setReabriendo(true);
    try {
      const r = await entrenoApi.reabrir(name, rutinaId, sesion.fecha);
      if (r && r.ok) setSesion(s => ({ ...s, estado: 'en_curso', finalizada_en: null }));
    } finally { setReabriendo(false); }
  };
  const [marcadas, setMarcadas] = useState(() => sobre({}, marcadasDeCola(name, rutinaId, hoyLocal())));   // "reId:serie" → { reps, peso }
  const [cargando, setCargando] = useState(() => !leerRutinaLocal(almacen, rutinaId));
  const [actualizando, setActualizando] = useState(true);
  // Lo que marca o desmarca mientras llega lo del servidor: gana sobre eso.
  const tocadas = useRef({});
  const [cerrando, setCerrando] = useState(false);
  const [cerrandoHoja, setCerrandoHoja] = useState(false);
  const [errorCierre, setErrorCierre] = useState(null);
  const [remate, setRemate] = useState(false);   // ofrecer cardio al cerrar
  // El cardio que el coach le dejó para DESPUÉS de la fuerza hoy: va dentro
  // de la rutina (antes del estiramiento) y, si al terminar sigue pendiente,
  // se le recuerda una vez.
  const [cardio, setCardio] = useState([]);
  const [cardioFinal, setCardioFinal] = useState(null);
  const [records, setRecords] = useState(null);  // lo que batió hoy, si batió algo
  const [fin, setFin] = useState(null);           // visual nueva: la celebración al terminar
  const conteoRef = useRef({ hechos: 0, total: 0, series: 0, kilos: 0 });
  const [pendientes, setPendientes] = useState(0);
  const [nota, setNota] = useState(null);          // { titulo, rutina_id, rutina_ejercicio_id?, coach? }
  // Comentario del coach: al abrir la conversación, sus «Para la próxima vez»
  // quedan leídos (en el CRM y aquí: se apaga el circulito).
  const leerComentarios = (ejercicioId, ids) => {
    if (!ids || !ids.length) return;
    Promise.resolve(entrenoApi.comentariosLeidos(name, ids)).catch(() => {});
    const ahora = new Date().toISOString();
    const marcar = (x) => (x.coach && x.ejercicio && x.ejercicio.id === ejercicioId)
      ? { ...x, coach: { ...x.coach, puntuales: (x.coach.puntuales || []).map(p => (ids.includes(p.id) ? { ...p, leido_en: ahora } : p)) } } : x;
    setDatos(d => (d && d.ejercicios ? { ...d, ejercicios: d.ejercicios.map(marcar) } : d));
  };
  // kg o lb, POR EJERCICIO: las mancuernas de un gimnasio van en libras y las
  // máquinas del otro en kilos. Se recuerda en el teléfono; si no hay nada,
  // la unidad de la última vez; si no, kg.
  const [unidades, setUnidades] = useState({});
  const preferida = useUnidades();
  // Cambió la preferencia general → se olvidan los cambios de esta sesión.
  useEffect(() => { setUnidades({}); }, [preferida.peso]);
  const unidadDe = useCallback((re) => {
    const id = re.ejercicio.id;
    if (unidades[id]) return unidades[id];
    try { const u = almacen.getItem(`entreno:unidad:${id}`); if (u === 'kg' || u === 'lb') return u; } catch (e) {}
    // La preferencia general (botón «Unidades») manda sobre la de la última vez.
    if (preferida.peso) return preferida.peso;
    return re.ultima_vez?.unidad === 'lb' ? 'lb' : 'kg';
  }, [unidades, preferida]);
  const cambiarUnidad = useCallback((re) => {
    const nueva = unidadDe(re) === 'kg' ? 'lb' : 'kg';
    setUnidades(u => ({ ...u, [re.ejercicio.id]: nueva }));
    try { almacen.setItem(`entreno:unidad:${re.ejercicio.id}`, nueva); } catch (e) {}
  }, [unidadDe]);
  // El aviso de "guardado en el teléfono" sale solo si la serie lleva un rato
  // sin subir. Con buena señal sube en medio segundo, y un cartel que aparece
  // y desaparece en cada serie asusta más de lo que informa.
  const [avisarPendientes, setAvisarPendientes] = useState(false);
  useEffect(() => {
    if (!pendientes) { setAvisarPendientes(false); return; }
    const id = setTimeout(() => setAvisarPendientes(true), 2500);
    return () => clearTimeout(id);
  }, [pendientes > 0]);
  const fecha = useRef(hoyLocal()).current;       // el día en que se abrió, aunque pase medianoche
  // Queda anotada como abierta (para volver a ella si la página se recarga) y
  // lo tecleado sin marcar se guarda bajo su clave.
  // La clave se fija AL PINTAR (no en un efecto): las cajitas leen lo
  // tecleado en su primer pintado, antes de que corra cualquier efecto.
  fijarClaveTecleado(`${rutinaId}:${fecha}`);
  useEffect(() => {
    guardarRutinaAbierta(rutinaId, fecha, planeada);
    fijarClaveTecleado(`${rutinaId}:${fecha}`);
    return () => fijarClaveTecleado(null);
  }, [rutinaId, fecha, planeada]);
  // Vista en prueba: abierta desde OTRO día del calendario (sin moverla), al
  // marcar lo primero se pregunta si se pasa a hoy. Una vez por rutina y día.
  const [preguntaMover, setPreguntaMover] = useState(false);
  const [movida, setMovida] = useState(null);       // { ok, texto } tras responder
  const claveMover = `mt:preguntoMover:${rutinaId}:${fecha}`;
  const alEmpezar = useCallback(() => {
    if (!enPrueba()) return;
    guardarRutinaEnCurso({ id: rutinaId, fecha, nombre: (datos && datos.nombre) || '' });
    if (!planeada || planeada === fecha) return;
    try { if (localStorage.getItem(claveMover)) return; localStorage.setItem(claveMover, '1'); } catch (e) { /* sin almacenamiento */ }
    setPreguntaMover(true);
  }, [rutinaId, fecha, planeada, datos, claveMover]);
  const pasarAHoy = async () => {
    setPreguntaMover(false);
    const r = await entrenoApi.mover(name, { desde: planeada, hasta: fecha, rutina_id: rutinaId }).catch(() => null);
    setMovida(r && r.ok
      ? { ok: true, texto: r.intercambio ? `Listo: quedó hoy, y ${r.intercambio.nombre} pasó al ${diaDe(planeada)}.` : 'Listo: quedó hoy en tu calendario.' }
      : { ok: false, texto: r && r.motivo === 'semana_pasada' ? 'Ese día ya es de otra semana: queda como entreno de hoy.' : 'No se movió ahora. Lo que marques queda guardado igual.' });
    setTimeout(() => setMovida(null), 4200);
  };
  // Visual nueva: cuándo arrancó el entreno (la primera serie marcada), para
  // el reloj de la sesión. Se recuerda en el teléfono por si cierra y vuelve.
  const claveInicio = `mt:inicioEntreno:${rutinaId}:${fecha}`;
  const [inicio, setInicio] = useState(() => { try { return Number(localStorage.getItem(claveInicio)) || null; } catch (e) { return null; } });
  // Descanso: { segundos, fin } — `fin` es un instante absoluto, no un
  // contador que se va restando. Con un contador, minimizar la app o apagar
  // la pantalla congela el intervalo y al volver marca de menos; con un
  // instante, al volver sale el tiempo REAL que queda.
  //
  // El descanso y la cuenta de un ejercicio por tiempo se guardan en el
  // teléfono: el iPhone cierra la app minimizada cuando quiere, y al volver
  // el reloj seguía... desde cero o no estaba. Con lo guardado vuelve tal
  // cual, con el tiempo real que queda. Pasados 10 min ya no se trae.
  const claveReloj = `mt:temporizador:${rutinaId}:${fecha}`;
  const relojGuardado = useRef(undefined);
  if (relojGuardado.current === undefined) {
    try {
      const g = JSON.parse(localStorage.getItem(claveReloj) || 'null');
      const fin = g && (g.descanso || g.cuenta) ? (g.descanso || g.cuenta).fin : 0;
      relojGuardado.current = g && (fin > Date.now() - 10 * 60000 || (g.cuenta && g.cuenta.pausa != null)) ? g : null;
    } catch (e) { relojGuardado.current = null; }
  }
  const [descanso, setDescanso] = useState(() => (relojGuardado.current && relojGuardado.current.descanso) || null);
  // Vista compacta: el ejercicio que la persona abrió a mano (ver abajo).
  const [abiertoCompacta, setAbiertoCompacta] = useState(null);
  // Al terminar un ejercicio, la pantalla baja sola al siguiente sin
  // terminar (vista compacta y la normal más liviana). Solo cuando se acaba
  // de terminar UNO, no al abrir la rutina ni al recuperar lo guardado.
  // `siguienteRef` lo llena el pintado de abajo.
  const siguienteRef = useRef({ items: [], activo: false, abierta: null });
  const completosAntes = useRef(null);
  const bajarRef = useRef(null);
  useEffect(() => {
    const { items, activo, abierta } = siguienteRef.current;
    const hechos = new Set(items.filter(x => x.completo).map(x => x.clave));
    const antes = completosAntes.current;
    completosAntes.current = items.length ? hechos : null;
    if (!activo || !antes) return undefined;   // recién abierta
    const nuevos = [...hechos].filter(c => !antes.has(c));
    if (nuevos.length !== 1) return undefined;
    const desde = items.findIndex(x => x.clave === nuevos[0]);
    const id = abierta || (items.slice(desde + 1).find(x => !x.completo) || {}).clave;
    if (!id) return undefined;
    // Sin limpiarlo en el siguiente pintado (el reloj repinta cada segundo):
    // solo se cancela si sale de la rutina.
    clearTimeout(bajarRef.current);
    bajarRef.current = setTimeout(() => {
      const el = document.querySelector(`[data-re-id="${id}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 450);
    return undefined;
  });
  useEffect(() => () => clearTimeout(bajarRef.current), []);
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (!descanso) return;
    const tic = () => setRestante(Math.ceil((descanso.fin - Date.now()) / 1000));
    tic();
    const id = setInterval(tic, 500);
    // Volver de otra app recalcula al instante, sin esperar al siguiente tic.
    const alVolver = () => { if (document.visibilityState === 'visible') tic(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [descanso]);

  // El pitido del final queda programado en el reloj del audio en cuanto
  // empieza (o cambia, con +15 s) el descanso, y se cancela al saltarlo.
  const programado = useRef(null);
  useEffect(() => {
    if (!descanso) return undefined;
    const quedan = (descanso.fin - Date.now()) / 1000;
    const p = quedan > 0 ? programarFinDescanso(quedan) : null;
    programado.current = p;
    // Se cancela solo si se corta ANTES de la hora (saltar, +15 s): al llegar
    // a cero el pitido ya está sonando y no se toca.
    return () => { if (p && Date.now() < descanso.fin - 100) p.cancelar(); programado.current = null; };
  }, [descanso]);

  // Al llegar a cero: vibra y, si el pitido no quedó programado, suena el de
  // respaldo (sonidoDescanso.js). Si la app estaba en segundo plano, al
  // volver se recalcula el tiempo y, si ya pasó, avisa entonces.
  // Un descanso que ya había terminado mientras la app estaba cerrada no
  // vuelve a pitar al abrir: se ve «A la siguiente» y listo.
  const yaAvisado = useRef(!!(descanso && descanso.fin <= Date.now()));
  useEffect(() => {
    if (!descanso) { yaAvisado.current = false; return; }
    if (restante <= 0 && !yaAvisado.current) {
      yaAvisado.current = true;
      sonarFinDescanso({ yaProgramado: !!(programado.current && programado.current.vivo) });
    }
  }, [restante, descanso]);

  // Con la rutina abierta la pantalla no se apaga sola (Wake Lock, donde el
  // teléfono lo permita): así el descanso corre y el pitido llega aunque el
  // teléfono esté en el banco. Se suelta al salir y se vuelve a pedir al
  // volver de otra app.
  useEffect(() => {
    if (!v2Activa() || typeof navigator === 'undefined' || !navigator.wakeLock) return undefined;
    let candado = null, vivo = true;
    const pedir = async () => {
      if (!vivo || document.visibilityState !== 'visible') return;
      try { candado = await navigator.wakeLock.request('screen'); } catch (e) { candado = null; }
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      vivo = false;
      document.removeEventListener('visibilitychange', pedir);
      if (candado) { try { candado.release(); } catch (e) {} }
    };
  }, []);

  // Cuántas series de ESTA rutina siguen en el teléfono sin subir.
  const deEsta = useCallback((x) => x.name === name && x.rutina_id === rutinaId && x.fecha === fecha, [name, rutinaId, fecha]);
  useEffect(() => {
    const contar = () => setPendientes(cola.pendientes(deEsta).length);
    contar();
    const quitar = cola.alCambiar(contar);
    // Mientras quede algo, se reintenta cada 15 s aunque el teléfono no avise
    // de que volvió la red (iOS no siempre lo hace).
    const id = setInterval(() => { if (cola.pendientes(deEsta).length) cola.vaciar(); }, 15000);
    return () => { quitar(); clearInterval(id); };
  }, [deEsta]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      // La rutina y la sesión de hoy, a la vez (antes una detrás de otra).
      // Mirar no es entrenar: se pregunta por la sesión SIN crearla; se crea
      // al marcar la primera serie (o al decir "no pude entrenar").
      const [r, s] = await Promise.all([
        api({ accion: 'rutina', name, id: rutinaId }),
        entrenoApi.abrir(name, rutinaId, { crear: false }),
      ]);
      if (!vivo) return;
      let rutina = r && r.ok ? r.rutina : null;
      if (rutina) guardarRutinaLocal(almacen, rutina);
      if (r && r.ok && Array.isArray(r.cardio)) setCardio(r.cardio);
      else if (r && r.motivo === 'sin_red') {
        // Sin señal: la última copia que se guardó en el teléfono. Se puede
        // entrenar igual; lo marcado sube cuando vuelva la red.
        rutina = leerRutinaLocal(almacen, rutinaId);
        if (rutina) setSinRed(true);
      }
      setDatos(rutina);
      const m = {};
      if (s && s.ok) {
        if (s.sesion) setSesion(s.sesion);
        (s.series || []).forEach(x => {
          if (x.rutina_ejercicio_id && x.completada !== false) {
            m[`${x.rutina_ejercicio_id}:${x.serie_num}`] = { reps: x.reps, peso: x.peso, unidad: x.unidad || 'kg' };
          }
        });
      }
      // Lo que está en la cola manda sobre lo del servidor: es más nuevo.
      setMarcadas(sobre(sobre(m, marcadasDeCola(name, rutinaId, fecha)), tocadas.current));
      setCargando(false);
      setActualizando(false);
    })();
    return () => { vivo = false; };
  }, [name, rutinaId, deEsta]);

  // La sesión se crea UNA vez aunque se marquen tres series seguidas.
  const creando = useRef(null);
  const asegurarSesion = useCallback(async () => {
    if (sesion) return sesion;
    const yaAbierta = cola.sesionAbierta(name, rutinaId, fecha);
    if (yaAbierta) { const s = { id: yaAbierta }; setSesion(s); return s; }
    if (!creando.current) {
      creando.current = entrenoApi.abrir(name, rutinaId, { crear: true, fecha })
        .then(s => { creando.current = null; if (s && s.ok && s.sesion) { setSesion(s.sesion); return s.sesion; } return null; });
    }
    return creando.current;
  }, [sesion, name, rutinaId, fecha]);

  const escribirSerie = useCallback(async (datosSerie) => {
    const s = await asegurarSesion();
    cola.encolar({ name, rutina_id: rutinaId, sesion_id: s ? s.id : null, fecha, datos: datosSerie });
    cola.vaciar();
  }, [asegurarSesion, name, rutinaId, fecha]);

  // El reloj del entreno arranca con lo primero que se hace (una serie o un
  // ejercicio por tiempo). Se recuerda en el teléfono por si cierra y vuelve.
  const arrancarReloj = useCallback(() => {
    if (inicio || !v2Activa()) return;
    alEmpezar();
    const t = Date.now(); setInicio(t); vibrar([16, 40, 16]);
    try { localStorage.setItem(claveInicio, String(t)); } catch (e) { /* sin almacenamiento: el reloj vive mientras esté abierta */ }
  }, [inicio, claveInicio, alEmpezar]);

  // `silencio`: sin la nota de «empieza el descanso» (al acabar un ejercicio
  // por tiempo ya sonó el pitido del final).
  const marcar = useCallback((re, serie, reps, peso, descansoSeg, unidad = 'kg', { silencio = false } = {}) => {
    const clave = `${re.id}:${serie}`;
    if (!silencio) vibrarL25('medio');
    arrancarReloj();
    setMarcadas(m => ({ ...m, [clave]: { reps, peso, unidad } }));   // optimista: el check no espera a la red
    tocadas.current[clave] = { reps, peso, unidad };
    // El descanso lo decide quien pinta la fila: entre series de un ejercicio
    // el del ejercicio; en un circuito, el corto entre estaciones o el largo
    // al terminar la vuelta.
    const seg = Number(descansoSeg);
    if (Number.isFinite(seg) && seg > 0) {
      // El toque de marcar deja el audio listo: así el pitido del final puede
      // sonar solo (el iPhone no deja sonar nada que no arrancó con un toque).
      // Y una nota corta avisa que empezó el descanso.
      prepararSonido();
      if (!silencio) sonarInicioDescanso();
      setDescanso({ segundos: seg, fin: Date.now() + seg * 1000 });
    }
    // La hora del toque viaja con la serie: si espera en la cola sin señal,
    // el coach igual ve cuánto tardó de verdad entre una serie y otra.
    escribirSerie({
      rutina_ejercicio_id: re.id, ejercicio_id: re.ejercicio.id,
      serie_num: serie, reps, peso, unidad, completada: true, marcada_en: new Date().toISOString(),
    });
  }, [escribirSerie, arrancarReloj]);

  const desmarcar = useCallback((re, serie) => {
    const clave = `${re.id}:${serie}`;
    setMarcadas(m => { const n = { ...m }; delete n[clave]; return n; });
    tocadas.current[clave] = null;
    escribirSerie({
      rutina_ejercicio_id: re.id, ejercicio_id: re.ejercicio.id,
      serie_num: serie, reps: null, peso: null, completada: false,
    });
  }, [escribirSerie]);

  // ── Ejercicios por tiempo («30 s») ──
  // La cuenta atrás va en la misma ventanita negra que el descanso: pitido al
  // empezar (en el toque), pitido al terminar (programado) y la serie se
  // marca sola. «Por lado» cuenta los dos lados seguidos, con una nota a la
  // mitad para cambiar. Si el coach puso descanso, arranca después.
  // { clave, re, n, seg, lados, descansoSeg, unidad, fin, pausa (ms que quedaban) }
  const [cuenta, setCuenta] = useState(null);
  const [quedaCuenta, setQuedaCuenta] = useState(0);
  useEffect(() => {
    if (!cuenta || cuenta.pausa != null) return undefined;
    const tic = () => setQuedaCuenta(Math.max(0, cuenta.fin - Date.now()));
    tic();
    const id = setInterval(tic, 250);
    const alVolver = () => { if (document.visibilityState === 'visible') tic(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [cuenta]);
  const programadoCuenta = useRef(null);
  useEffect(() => {
    if (!cuenta || cuenta.pausa != null) return undefined;
    const quedan = (cuenta.fin - Date.now()) / 1000;
    const p = quedan > 0 ? programarFinDescanso(quedan) : null;
    const mitad = cuenta.lados > 1 && quedan - cuenta.seg > 0 ? programarAviso(quedan - cuenta.seg) : null;
    programadoCuenta.current = p;
    return () => {
      if (Date.now() < cuenta.fin - 100) { if (p) p.cancelar(); if (mitad) mitad.cancelar(); }
      programadoCuenta.current = null;
    };
  }, [cuenta]);
  const terminarCuenta = useCallback((c, silencio) => {
    setCuenta(null);
    const r = /^\s*\d+\s*$/.test(String(c.re.reps || '')) ? Number(c.re.reps) : null;
    marcar(c.re, c.n, r, null, c.descansoSeg, c.unidad, { silencio });
  }, [marcar]);
  useEffect(() => {
    if (cuenta && cuenta.pausa == null && cuenta.fin <= Date.now()) {
      sonarFinDescanso({ yaProgramado: !!(programadoCuenta.current && programadoCuenta.current.vivo) });
      terminarCuenta(cuenta, true);
    }
  }, [quedaCuenta, cuenta, terminarCuenta]);
  const empezarCuenta = useCallback((re, n, seg, descansoSeg, unidad) => {
    prepararSonido();
    sonarInicioDescanso();
    arrancarReloj();
    setDescanso(null);
    const lados = porLado(re) ? 2 : 1;
    setCuenta({ clave: `${re.id}:${n}`, re, n, seg, lados, descansoSeg, unidad, fin: Date.now() + seg * lados * 1000, pausa: null });
  }, [arrancarReloj]);
  const alternarPausa = () => {
    if (!cuenta) return;
    if (cuenta.pausa == null) { setCuenta({ ...cuenta, pausa: Math.max(0, cuenta.fin - Date.now()) }); return; }
    prepararSonido();
    setCuenta({ ...cuenta, fin: Date.now() + cuenta.pausa, pausa: null });
  };
  const ctxCuenta = { empezar: empezarCuenta, activa: cuenta ? cuenta.clave : null };

  // Al volver con un reloj guardado, el iPhone no deja sonar nada hasta que
  // la persona toca la pantalla: con el primer toque se abre el audio y la
  // alarma del final se vuelve a programar (al copiar el objeto, los efectos
  // de arriba la cancelan y la ponen de nuevo con el tiempo que queda).
  const habiaReloj = useRef(!!relojGuardado.current).current;
  useEffect(() => {
    if (!habiaReloj) return undefined;
    const alTocar = () => {
      prepararSonido();
      setDescanso(d => d && d.fin > Date.now() ? { ...d } : d);
      setCuenta(c => c && c.pausa == null && c.fin > Date.now() ? { ...c } : c);
    };
    window.addEventListener('pointerdown', alTocar, { once: true, capture: true });
    return () => window.removeEventListener('pointerdown', alTocar, { capture: true });
  }, [habiaReloj]);

  // Minimizada con un descanso (o un ejercicio por tiempo) corriendo: el
  // iPhone congela la app y el pitido no sonaría hasta volver. Se deja un
  // aviso en el servidor y el teléfono recibe la notificación al terminar
  // (api/_descanso.js). Al volver, o al saltarlo, el aviso se cancela.
  const avisoMin = useRef(null);
  const mandarAviso = (que, cuerpo) => {
    // «Fin del descanso» apagado en Configuración → Notificaciones: no se
    // programa nada (el pitido al volver sigue igual).
    if (que === 'programar' && !avisoPermitido('descanso')) return;
    try {
      fetch(`/api/push-cron?descanso=${que}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), keepalive: true }).catch(() => {});
    } catch (e) { /* sin red: queda el pitido al volver */ }
  };
  useEffect(() => {
    if (enVerComo()) return undefined;
    const alCambiar = () => {
      if (document.visibilityState === 'hidden') {
        const c = cuenta && cuenta.pausa == null ? cuenta : null;
        const fin = c ? c.fin : descanso ? descanso.fin : null;
        if (!fin || fin - Date.now() < 4000 || avisoMin.current) return;
        const id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        avisoMin.current = id;
        mandarAviso('programar', {
          id, name, fin, titulo: c ? 'Tiempo cumplido' : 'Descanso listo',
          cuerpo: c ? `${nombresEj(c.re.ejercicio).grande}: listo.` : 'A la siguiente serie.',
        });
      } else if (avisoMin.current) {
        mandarAviso('cancelar', { id: avisoMin.current });
        avisoMin.current = null;
      }
    };
    document.addEventListener('visibilitychange', alCambiar);
    return () => document.removeEventListener('visibilitychange', alCambiar);
  }, [descanso, cuenta, name]);   // eslint-disable-line react-hooks/exhaustive-deps

  // La cuenta guardada vuelve cuando ya está la rutina (hace falta el
  // ejercicio). Si terminó con la app cerrada, la serie se marca sola.
  useEffect(() => {
    const g = relojGuardado.current;
    if (!g || !g.cuenta || !datos) return;
    relojGuardado.current = null;
    const re = (datos.ejercicios || []).find(x => x.id === g.cuenta.reId);
    if (re) setCuenta({ ...g.cuenta, re, clave: `${re.id}:${g.cuenta.n}` });
  }, [datos]);
  // Y se guarda cada cambio (o se borra al acabar).
  useEffect(() => {
    try {
      if (cuenta) {
        const { re, clave, ...resto } = cuenta;
        localStorage.setItem(claveReloj, JSON.stringify({ cuenta: { ...resto, reId: re.id } }));
      } else if (descanso) {
        localStorage.setItem(claveReloj, JSON.stringify({ descanso }));
      } else if (!(relojGuardado.current && relojGuardado.current.cuenta)) {
        localStorage.removeItem(claveReloj);
      }
    } catch (e) { /* sin almacenamiento: el reloj vive mientras la app esté abierta */ }
  }, [cuenta, descanso, claveReloj]);

  const cerrar = useCallback(async (estado, rpe, nota) => {
    if (cerrando) return;
    setCerrando(true);
    setErrorCierre(null);
    // Primero sube lo que quede en el teléfono: los récords y la duración se
    // calculan con las series que YA están en el servidor.
    const quedan = (await cola.vaciar(), cola.pendientes(deEsta).length);
    const s = quedan ? null : await asegurarSesion();
    const r = s ? await api({ accion: 'cerrar', name, sesion_id: s.id, rpe, notas: nota, estado }) : null;
    setCerrando(false);
    if (!r || !r.ok) {
      // No se cierra la hoja ni se sale: decir "enviado" sin haberlo enviado
      // es justo lo que hacía perder entrenos. Lo marcado sigue guardado.
      setErrorCierre(quedan
        ? 'Sin señal. Tus series están guardadas en el teléfono y suben solas; vuelve a intentarlo en un momento.'
        : 'No se envió. Revisa tu señal e inténtalo en un momento.');
      return;
    }
    setCerrandoHoja(false);
    // Cerrada: ya no hay rutina abierta ni cajitas por recuperar.
    borrarRutinaAbierta();
    if ((rutinaEnCurso() || {}).id === rutinaId) borrarRutinaEnCurso();
    borrarTecleado(`${rutinaId}:${fecha}`);
    if (estado === 'saltada') { onVolver(); return; }
    // Si batió algo, se le dice. Es lo único de toda la sesión que
    // celebra un número, y es lo que hace que la próxima vez intente
    // subirlo. Va antes del cardio porque es la noticia buena.
    // Justo al terminar la fuerza es cuando se hace la caminadora.
    // Se ofrece AQUÍ porque es el único momento en que la persona lo
    // tiene en la mano; buscarlo después en otra pantalla no lo hace
    // nadie. Se puede decir que no y salir.
    // Si hay récord, el cardio espera a que cierre la celebración: abiertas
    // las dos a la vez, la hoja del cardio tapaba el botón «Seguir».
    // Visual nueva: no se pregunta por el cardio al terminar. El coach ya lo
    // receta dentro de la rutina, y lo que el cliente haga aparte lo agrega
    // desde el calendario.
    // Visual nueva: siempre se celebra (y los récords van dentro).
    if (v2Activa()) {
      const seg = r.sesion && r.sesion.duracion_seg != null ? r.sesion.duracion_seg : (inicio ? Math.round((Date.now() - inicio) / 1000) : null);
      try { localStorage.removeItem(claveInicio); localStorage.removeItem(claveReloj); } catch (e) { /* nada */ }
      vibrarL25('logro');
      setFin({ ...conteoRef.current, minutos: seg != null ? Math.max(1, Math.round(seg / 60)) : null, records: r.records || [] });
      return;
    }
    if (r.records?.length) setRecords(r.records);
    else setRemate(true);
  }, [cerrando, deEsta, asegurarSesion, name, onVolver, inicio, claveInicio]);

  // Primera vez que abre esta rutina (no hay copia en el teléfono): la
  // pantalla sale ya, con su nombre y la forma de las tarjetas, mientras llega.
  if (cargando) {
    const titulo = (cachePlan.get(name)?.dias || []).find(d => d.rutina && d.rutina.id === rutinaId)?.rutina.nombre || '';
    const v2c = v2Activa();
    return (
      <div data-rutina-esqueleto>
        <Volver onClick={onVolver} />
        <div style={{ marginBottom: 16 }}>
          {titulo
            ? <div style={v2c ? { fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: TEXT }
              : { fontFamily: FONT_DISPLAY, fontSize: 26, letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1, color: TEXT }}>{titulo}</div>
            : <div className="mt-esq" style={{ height: 28, width: '60%', borderRadius: 8 }} />}
          <div className="mt-esq" style={{ height: 12, width: '45%', borderRadius: 6, marginTop: 12 }} />
        </div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: SURFACE, borderRadius: 16, padding: 16, boxShadow: SHADOW_CARD, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="mt-esq" style={{ width: 56, height: 56, borderRadius: 12, flex: 'none' }} />
            <div style={{ flex: 1 }}>
              <div className="mt-esq" style={{ height: 14, width: `${70 - i * 8}%`, borderRadius: 6 }} />
              <div className="mt-esq" style={{ height: 11, width: '40%', borderRadius: 6, marginTop: 9 }} />
            </div>
          </div>
        ))}
        <style>{'@keyframes mt-esq{0%{opacity:.55}50%{opacity:1}100%{opacity:.55}}.mt-esq{background:#ECEBE6;animation:mt-esq 1.4s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.mt-esq{animation:none}}'}</style>
        <AvisoFlotante aviso={ACTUALIZANDO} />
      </div>
    );
  }
  if (!datos) {
    return (
      <>
        <Volver onClick={onVolver} />
        <Tarjeta><Vacio texto="No pude abrir esta rutina. Si estás sin señal, ábrela una vez con conexión y después funcionará también sin ella." /></Tarjeta>
      </>
    );
  }

  const bloqueDe = {};
  (datos.bloques || []).forEach(b => { bloqueDe[b.id] = b; });
  const v2 = v2Activa();
  const tramos = agruparEnTramos(datos.ejercicios, bloqueDe, v2 ? claseMomento : null);
  // En un circuito cada vuelta es UNA serie de cada ejercicio; fuera de un
  // circuito, las series del ejercicio. Contar `series` a secas daba cosas
  // como "5 de 3 series" en cuanto había un circuito.
  const totalSeries = tramos.reduce((t, tr) => t + tr.vueltas.length
    * tr.vueltas[0].reduce((a, re) => a + (tr.vueltas.length > 1 ? 1 : Math.max(1, re.series || 1)), 0), 0);
  const hechas = Object.keys(marcadas).length;
  // Series con números escritos pero sin marcar. Escribir no es hacer: nunca
  // se marcan solas; al terminar se pregunta qué hacer con ellas.
  const escritas = [];
  tramos.forEach(tr => {
    tr.vueltas[0].forEach(re => {
      const ns = tr.vueltas.length > 1 ? tr.vueltas.map((_, vi) => vi + 1) : Array.from({ length: Math.max(1, re.series || 1) }, (_, k) => k + 1);
      ns.forEach(n => {
        if (marcadas[`${re.id}:${n}`]) return;
        const t = leerTecleado(`${re.id}:${n}`);
        if (t && (String(t.reps || '').trim() || String(t.peso || '').trim())) escritas.push({ re, n, reps: numero(t.reps), peso: numero(t.peso), unidad: unidadDe(re) });
      });
    });
  });
  // Marcarlas con lo escrito (las que tienen reps; sin reps no hay serie) o ir a revisarlas.
  const marcarEscritas = () => { escritas.filter(e => e.reps != null).forEach(e => marcar(e.re, e.n, e.reps, e.peso, null, e.unidad)); };
  const revisarEscritas = () => {
    setCerrandoHoja(false);
    const e = escritas[0];
    setTimeout(() => {
      const el = e && document.querySelector(`[data-serie="${e.re.id}:${e.n}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.style.transition = 'box-shadow .3s'; el.style.boxShadow = '0 0 0 2px #E0A21A';
      setTimeout(() => { el.style.boxShadow = ''; }, 2500);
    }, 60);
  };
  const EjercicioX = v2 ? EjercicioV2 : Ejercicio;
  // Los tres momentos de la rutina y cuánto va hecho de cada uno.
  const fases = v2 ? fasesDeTramos(tramos) : tramos.map(() => null);
  // Visual nueva: el avance se cuenta por EJERCICIOS terminados (todas sus
  // series, o todas sus vueltas en un circuito), no por series.
  const conteo = {};
  let ejTotal = 0, ejHechos = 0;
  tramos.forEach((tr, i) => {
    const f = fases[i];
    const c = f ? (conteo[f] || (conteo[f] = { hechos: 0, total: 0 })) : null;
    tr.vueltas[0].forEach(re => {
      const ns = tr.vueltas.length > 1
        ? tr.vueltas.map((_, vi) => vi + 1)
        : Array.from({ length: Math.max(1, re.series || 1) }, (_, k) => k + 1);
      const listo = ns.every(n => marcadas[`${re.id}:${n}`]);
      ejTotal++; if (listo) ejHechos++;
      if (c) { c.total++; if (listo) c.hechos++; }
    });
  });
  // Kilos movidos hoy (reps × peso, todo pasado a kg), para el cierre.
  const kilos = Object.values(marcadas).reduce((a, m) => {
    const kg = Number(convertir(m.peso, m.unidad || 'kg', 'kg'));
    return a + (Number.isFinite(kg) && m.reps ? kg * Number(m.reps) : 0);
  }, 0);
  conteoRef.current = { hechos: ejHechos, total: ejTotal, series: hechas, kilos: Math.round(kilos) };
  // Visual nueva: el ejercicio que toca ahora (el primero suelto sin terminar)
  // lleva su marca «AHORA».
  let ahoraId = null, ahoraCircuito = null;
  if (v2 && prueba) {
    // Vista en prueba: en orden desde el primer ejercicio (también el
    // calentamiento en circuito): el primero que falta; al marcarlo pasa
    // al siguiente. En un circuito va por vuelta y estación.
    afuera: for (const tr of tramos) {
      if (tr.vueltas.length > 1) {
        for (let vi = 0; vi < tr.vueltas.length; vi++) for (const re of tr.vueltas[vi]) if (!marcadas[`${re.id}:${vi + 1}`]) { ahoraCircuito = `${re.id}:${vi + 1}`; break afuera; }
        continue;
      }
      const re = tr.vueltas[0].find(x => !Array.from({ length: Math.max(1, x.series || 1) }, (_, k) => k + 1).every(n => marcadas[`${x.id}:${n}`]));
      if (re) { ahoraId = re.id; break; }
    }
  } else if (v2) {
    for (const tr of tramos) {
      if (tr.vueltas.length > 1) continue;
      const re = tr.vueltas[0].find(x => !Array.from({ length: Math.max(1, x.series || 1) }, (_, k) => k + 1).every(n => marcadas[`${x.id}:${n}`]));
      if (re) { ahoraId = re.id; break; }
    }
  }

  // Vista compacta: un ejercicio (o circuito) abierto a la vez. Por defecto,
  // el primero sin terminar; tocar otro lo abre. Al terminar el abierto, se
  // abre solo el siguiente.
  const compactaRutina = compacta && v2;
  const itemsRutina = tramos.flatMap(tr => (tr.vueltas.length > 1
    ? [{ clave: tr.clave, completo: tr.vueltas.every((v, vi) => v.every(re => marcadas[`${re.id}:${vi + 1}`])) }]
    : tr.vueltas[0].map(re => ({ clave: re.id, completo: Array.from({ length: Math.max(1, re.series || 1) }, (_, k) => k + 1).every(n => marcadas[`${re.id}:${n}`]) }))));
  // Más liviana en la vista normal (a prueba, vistaApp.js).
  const ligera = v2 && !compactaRutina && rutinaLigera(name);
  const elegidoVivo = abiertoCompacta && itemsRutina.some(x => x.clave === abiertoCompacta && !x.completo) ? abiertoCompacta : null;
  const abiertaClave = elegidoVivo || (itemsRutina.find(x => !x.completo) || {}).clave || null;

  siguienteRef.current = { items: itemsRutina, activo: compactaRutina || ligera, abierta: compactaRutina ? abiertaClave : null };

  const marcarCardio = (id) => setCardio(c => c.map(x => (x.id === id ? { ...x, hecho: true } : x)));
  const tarjetasCardio = cardio.length ? cardio.map(ev => (
    <TarjetaCardioCoach key={ev.id} ev={ev} fecha={fecha} nombre={name} sesionId={sesion?.id || null} enRutina
      alCambio={() => marcarCardio(ev.id)} />
  )) : null;
  // Al terminar: si el cardio que le dejó el coach sigue sin marcar, se le
  // recuerda una vez (puede decir que no y salir).
  const alTerminar = (porDefecto) => {
    const falta = cardio.find(x => !x.hecho);
    if (falta) setCardioFinal(falta); else porDefecto();
  };

  // La barra de avance (ejercicios hechos, reloj y segmentos).
  const barraAvance = (
        // Estilo Apple: vidrio, el avance dicho en claro y un segmento por
        // ejercicio que se va llenando; el reloj del entreno a la derecha.
        // En la vista en prueba, más baja y discreta: acompaña, no protagoniza.
        <div data-avance-rutina data-discreta={prueba ? '1' : undefined} style={prueba ? {
          // Vista en prueba: una píldora de vidrio arriba, justo bajo la hora
          // del teléfono, que no llega de borde a borde. Lo que pasa por
          // detrás se desvanece (ver `veloArriba`), así nunca se confunde.
          position: 'sticky', top: 'calc(env(safe-area-inset-top, 0px) + 6px)', zIndex: 20,
          margin: `calc(-1 * (${FADE_TOP}px + 6px)) 0 14px`,
          padding: '8px 16px 9px', borderRadius: 999,
          background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(22px) saturate(1.6)', WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(20,20,40,0.05), 0 8px 24px rgba(20,30,60,0.10)',
        } : {
          position: 'sticky', top: 'calc(58px + env(safe-area-inset-top, 0px))', zIndex: 20,
          margin: '0 -4px 6px', padding: '10px 14px 11px', borderRadius: 18,
          background: 'rgba(250,250,252,0.86)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 8px 20px -10px rgba(0,0,0,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: prueba ? 8 : 10, fontSize: prueba ? 12.5 : 13.5, minHeight: prueba ? 0 : 24 }}>
            {/* Volver a la semana desde cualquier punto de la rutina, sin subir
                hasta arriba. Lo marcado queda guardado y el reloj sigue. */}
            <button data-volver-semana onClick={onVolver} aria-label={prueba ? 'Volver a Hoy' : 'Volver a mi semana'} style={{
              flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 2, height: prueba ? 24 : 28, padding: prueba ? '0 8px 0 4px' : '0 10px 0 6px',
              borderRadius: 999, border: 0, background: prueba ? 'transparent' : 'rgba(118,118,128,0.14)', color: prueba ? '#6E6E73' : TEXT, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: prueba ? 12 : 13, fontWeight: 700,
            }}><ChevronLeft size={prueba ? 14 : 16} /> {prueba ? 'Volver' : 'Mi semana'}</button>
            <span style={{ fontWeight: prueba ? 600 : 700, color: prueba ? '#6E6E73' : TEXT, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ejHechos}/{ejTotal} ejercicios</span>
            {inicio && hechas > 0 && <RelojSesion desde={inicio} v2 />}
          </div>
          {ejTotal <= 16 ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ejTotal}, 1fr)`, gap: prueba ? 3 : 4, marginTop: prueba ? 5 : 8 }}>
              {Array.from({ length: ejTotal }, (_, i) => (
                <span key={i} data-segmento={i < ejHechos ? 'hecho' : 'falta'} style={{ height: prueba ? 3 : 4, borderRadius: 9, background: i < ejHechos ? '#1D1D1F' : 'rgba(118,118,128,0.18)', transition: 'background .25s ease' }} />
              ))}
            </div>
          ) : (
            <div style={{ height: prueba ? 3 : 4, borderRadius: 99, background: 'rgba(118,118,128,0.18)', overflow: 'hidden', marginTop: prueba ? 5 : 8 }}>
              <div style={{ height: '100%', width: `${(ejHechos / ejTotal) * 100}%`, background: '#1D1D1F', borderRadius: 99, transition: 'width .25s ease' }} />
            </div>
          )}
        </div>
  );
  // Vista en prueba: lo que sube por detrás de la píldora de arriba se
  // desvanece hacia blanco antes de llegar a ella.
  const veloArriba = (
    <div aria-hidden="true" data-velo-arriba style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 'calc(env(safe-area-inset-top, 0px) + 74px)', zIndex: 19, pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(252,252,253,0.97) 0%, rgba(252,252,253,0.88) 45%, rgba(252,252,253,0) 100%)',
    }} />
  );
  return (
    <>
      {/* Vista en prueba: la barra de avance va arriba del todo y trae el «Volver». */}
      {totalSeries > 0 && v2 && prueba ? <>{veloArriba}{barraAvance}</> : <Volver onClick={onVolver} />}
      {/* Abierta desde otro día del calendario: ¿se pasa a hoy? */}
      <Hoja abierta={preguntaMover} alCerrar={() => setPreguntaMover(false)} titulo="Rutina · ¿La pasas a hoy?" alto="80vh">
        <div data-pregunta-mover style={{ fontSize: 15, lineHeight: 1.45, color: TEXT }}>
          Esta rutina estaba para el <b>{planeada ? diaDe(planeada) : ''}</b>. Si la haces hoy, la paso a hoy para que tu calendario quede al día.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          <Boton ancho onClick={pasarAHoy} data-pasar-hoy>Pasarla a hoy</Boton>
          <Boton ancho variante="suave" data-dejarla onClick={() => setPreguntaMover(false)} style={{ border: 'none', background: 'rgba(118,118,128,0.12)' }}>Dejarla el {planeada ? diaDe(planeada) : ''}</Boton>
        </div>
        {/* El reloj del descanso arranca con la misma serie y flota abajo:
            los botones quedan por encima de él. */}
        <div aria-hidden="true" style={{ height: 'calc(var(--mt-reloj-alto, 0px) + 48px)' }} />
      </Hoja>
      {movida && createPortal(
        <div role="status" data-aviso-movida style={{
          position: 'fixed', left: 20, right: 20, bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', zIndex: 70, margin: '0 auto', maxWidth: 420,
          padding: '12px 16px', borderRadius: 18, background: 'rgba(31,31,31,0.92)', color: '#fff', fontSize: 14, fontWeight: 600, lineHeight: 1.35,
          boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        }}>{movida.texto}</div>, document.body)}
      {actualizando && <AvisoFlotante aviso={ACTUALIZANDO} />}

      {(sinRed || (pendientes > 0 && avisarPendientes)) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: '9px 12px', borderRadius: 12, background: SURFACE_2,
          fontSize: 12.5, color: TEXT_MUTED, lineHeight: 1.4,
        }}>
          <CloudOff size={16} style={{ flexShrink: 0 }} />
          <span>
            {pendientes > 0 && avisarPendientes
              ? `${pendientes} serie${pendientes === 1 ? '' : 's'} guardada${pendientes === 1 ? '' : 's'} en tu teléfono. Suben solas cuando vuelva la señal.`
              : 'Sin señal. Puedes entrenar igual: lo que marques se guarda en tu teléfono.'}
          </span>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={v2 ? {
          fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: TEXT,
        } : {
          fontFamily: FONT_DISPLAY, fontSize: 26, letterSpacing: '0.03em',
          textTransform: 'uppercase', lineHeight: 1, color: TEXT,
        }}>{datos.nombre}</div>
        {/* Cuánto dura, calculado con sus series, descansos y cambios, y
            aterrizado con lo que tarda este cliente (api/_tiempo.js). */}
        {datos.minutos > 0 && (
          <div data-rutina-minutos style={{ fontSize: 12.5, fontWeight: 600, color: TEXT_LIGHT, marginTop: 5 }}>
            ~{datos.minutos} min{(datos.ejercicios || []).length ? ` · ${(datos.ejercicios || []).length} ejercicio${(datos.ejercicios || []).length === 1 ? '' : 's'}` : ''}
          </div>
        )}
        {datos.descripcion && (
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 7, lineHeight: 1.5 }}>{datos.descripcion}</div>
        )}
        <button onClick={() => setNota({ titulo: datos.nombre, rutina_id: rutinaId })} style={{
          marginTop: 8, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
          fontSize: v2 ? 13.5 : 12.5, fontWeight: 700, color: v2 ? SECCION.entreno.ink : ACCENT_DARK, fontFamily: 'inherit',
        }}>{v2 ? '¿Escribirle al coach sobre esta rutina?' : 'Escribirle a tu coach sobre esta rutina'}</button>
        {totalSeries > 0 && !v2 && (
          <div style={{ marginTop: 11 }}>
            <div style={{ height: 5, borderRadius: 99, background: SURFACE_2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(100, (hechas / totalSeries) * 100)}%`,
                background: ACCENT, transition: 'width .25s ease',
              }} />
            </div>
            <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 5 }}>
              {Math.min(hechas, totalSeries)} de {totalSeries} series
            </div>
          </div>
        )}
      </div>

      {/* Visual nueva: el avance se queda pegado arriba mientras se baja, para
          saber siempre cuánto falta sin volver al principio. */}
      {totalSeries > 0 && v2 && !prueba && barraAvance}

      {datos.ejercicios.length === 0 && (
        <Tarjeta><Vacio texto="Esta rutina todavía no tiene ejercicios." /></Tarjeta>
      )}

      {/* Ya la terminó hace poco (menos de 3 h) y volvió a entrar: puede
          reabrirla para corregir (desmarcar lo que no hizo, cerrarla otra
          vez o dejarla como «no pude»). Nada se borra. */}
      {sesion && sesion.estado === 'completada' && sesion.finalizada_en && Date.now() - Date.parse(sesion.finalizada_en) < 3 * 60 * 60 * 1000 && (
        <div data-ya-terminada style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#FFFFFF', borderRadius: 16, padding: '11px 14px', marginBottom: 12, boxShadow: '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: TEXT_MUTED, lineHeight: 1.35 }}>Ya la terminaste. ¿Te equivocaste al cerrarla?</span>
          <button data-reabrir disabled={reabriendo} onClick={reabrir} style={{ border: 'none', borderRadius: 999, padding: '8px 14px', background: '#1D1D1F', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: reabriendo ? 0.6 : 1 }}>
            {reabriendo ? 'Reabriendo…' : 'Reabrir la rutina'}
          </button>
        </div>
      )}

      {/* Un circuito de 3 vueltas se recorre A→B→A→B→A→B, no A tres veces y
          luego B tres veces. Por eso las vueltas se pintan como secciones:
          antes el bloque salía con UNA fila por ejercicio y no había dónde
          marcar la segunda vuelta ni la tercera. */}
      <CuentaEjercicio.Provider value={ctxCuenta}>
      {(ligera || compactaRutina) && tramos.length > 0 && <TipIconos />}
      <AvisoComentarios ejercicios={datos.ejercicios || []}
        alVer={(re) => setNota({ titulo: re.ejercicio.nombre, ejercicio: re.ejercicio, rutina_id: rutinaId, rutina_ejercicio_id: re.id, sesion_id: sesion?.id, coach: re.coach || null, ejercicio_id: re.ejercicio && re.ejercicio.id })} />
      {tramos.map((tramo, ti) => (
        <React.Fragment key={tramo.clave}>
          {fases[ti] && fases[ti] !== fases[ti - 1] && (
            <SeparadorMomento fase={fases[ti]} hechos={conteo[fases[ti]]?.hechos || 0} total={conteo[fases[ti]]?.total || 0} />
          )}
          {/* El cardio de después de entrenar: terminada la fuerza, ANTES del
              estiramiento (el estiramiento pasivo va al final). */}
          {fases[ti] === 'enfriamiento' && fases[ti - 1] !== 'enfriamiento' && tarjetasCardio}
          {v2 && tramo.vueltas.length > 1 ? (
            <CircuitoV2 tramo={tramo} marcadas={marcadas} onMarcar={marcar} onDesmarcar={desmarcar}
              unidadDe={unidadDe} onUnidad={cambiarUnidad}
              compacta={compactaRutina} cerrado={compactaRutina && abiertaClave !== tramo.clave} alAbrir={() => setAbiertoCompacta(tramo.clave)} ligera={ligera} ahora={ahoraCircuito}
              onNota={(re) => setNota({ titulo: re.ejercicio.nombre, ejercicio: re.ejercicio, rutina_id: rutinaId, rutina_ejercicio_id: re.id, sesion_id: sesion?.id, coach: re.coach || null, ejercicio_id: re.ejercicio && re.ejercicio.id })} />
          ) : (<>
          {tramo.bloque && <CabeceraBloque b={tramo.bloque} v2={v2} />}
          {tramo.vueltas.map((vuelta, vi) => (
            <React.Fragment key={vi}>
              {tramo.vueltas.length > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, margin: '12px 2px 6px',
                  fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                  color: TEXT_LIGHT,
                }}>
                  Vuelta {vi + 1}
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                </div>
              )}
              {vuelta.map((re, k) => (
                <EjercicioX key={`${re.id}:v${vi + 1}`} re={re}
                  serieUnica={tramo.vueltas.length > 1 ? vi + 1 : null}
                  descansoCircuito={tramo.vueltas.length > 1
                    ? descansoEnCircuito(tramo.bloque, k, vuelta.length, vi, tramo.vueltas.length)
                    : undefined}
                  compacto={vi > 0}
                  unidad={unidadDe(re)} onUnidad={() => cambiarUnidad(re)}
                  onNota={() => setNota({ titulo: re.ejercicio.nombre, ejercicio: re.ejercicio, rutina_id: rutinaId, rutina_ejercicio_id: re.id, sesion_id: sesion?.id, coach: re.coach || null, ejercicio_id: re.ejercicio && re.ejercicio.id })}
                  ahora={re.id === ahoraId}
                  {...(compactaRutina ? { compacta: true, cerrado: abiertaClave !== re.id, alAbrir: () => setAbiertoCompacta(re.id) } : ligera ? { ligera: true } : {})}
                  marcadas={marcadas} onMarcar={marcar} onDesmarcar={desmarcar} />
              ))}
            </React.Fragment>
          ))}
          </>)}
        </React.Fragment>
      ))}

      </CuentaEjercicio.Provider>

      {/* Sin enfriamiento en la rutina: el cardio va al final, antes de terminar. */}
      {!fases.includes('enfriamiento') && tarjetasCardio}

      {cuenta && (
        <BarraCuenta cuenta={cuenta} queda={quedaCuenta} onPausa={alternarPausa} onListo={() => terminarCuenta(cuenta, false)} />
      )}
      {descanso && !cuenta && (
        <BarraDescanso v2={v2}
          segundos={descanso.segundos}
          restante={restante}
          onSaltar={() => setDescanso(null)}
          onMas={() => setDescanso(d => d && { ...d, segundos: d.segundos + 15, fin: d.fin + 15000 })}
        />
      )}

      {datos.ejercicios.length > 0 && v2 && (
        // Visual nueva (estilo Apple): cápsula grafito rellena siempre: es el
        // botón principal de la pantalla (con contorno parecía apagado).
        <button data-terminar
          onClick={() => { setDescanso(null); setCuenta(null); setErrorCierre(null); setCerrandoHoja(true); }}
          style={{
            width: '100%', marginTop: 14, height: 54, borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: 0, boxShadow: '0 10px 24px -10px rgba(0,0,0,0.45)',
            background: '#1D1D1F', color: '#fff',
            fontSize: 16, fontWeight: 750,
          }}>
          <CheckCircle size={20} weight="bold" />
          Terminar entrenamiento
        </button>
      )}
      {datos.ejercicios.length > 0 && !v2 && (
        <button
          onClick={() => { setDescanso(null); setCuenta(null); setErrorCierre(null); setCerrandoHoja(true); }}
          style={{
            width: '100%', marginTop: 6, padding: '15px 18px', borderRadius: 16, border: 0,
            background: hechas > 0 ? ACCENT_DARK : SURFACE_2,
            color: hechas > 0 ? '#fff' : TEXT_MUTED,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {hechas > 0 ? 'Terminar entrenamiento' : 'Terminar'}
        </button>
      )}

      {cerrandoHoja && (
        <HojaCierre
          hechas={hechas} total={totalSeries} guardando={cerrando} error={errorCierre}
          escritas={escritas} onMarcarEscritas={marcarEscritas} onRevisar={revisarEscritas}
          onCancelar={() => { if (!cerrando) setCerrandoHoja(false); }}
          onCerrar={(rpe, nota) => cerrar('completada', rpe, nota)}
          onSaltar={(nota) => cerrar('saltada', null, nota)}
        />
      )}

      <HojaNota abierta={!!nota} nombre={name} contexto={nota} alCerrar={() => setNota(null)} alLeer={leerComentarios} />

      {records && <HojaRecords records={records} alCerrar={() => { setRecords(null); alTerminar(() => { if (v2) onVolver(); else setRemate(true); }); }} />}
      {fin && <HojaFin fin={fin} plan={plan} rutinaId={rutinaId} alCerrar={() => { setFin(null); alTerminar(onVolver); }} />}

      <EntrenoActividad
        abierta={!!cardioFinal}
        nombre={name}
        fecha={fecha}
        sesionId={sesion?.id}
        eventoId={cardioFinal?.id || null}
        tipoInicial={cardioFinal ? (cardioFinal.slug || 'otro') : null}
        otroInicial={cardioFinal && !cardioFinal.slug ? cardioFinal.titulo : ''}
        duracionInicial={cardioFinal?.duracion_min || null}
        titulo="¿Hiciste tu cardio?"
        nota={cardioFinal ? <>Tu coach te dejó para después de entrenar: <b style={{ color: TEXT }}>{cardioFinal.titulo}</b>{cardioFinal.duracion_min ? ` · ${cardioFinal.duracion_min} min` : ''}{cardioFinal.detalle ? ` · ${cardioFinal.detalle}` : ''}</> : null}
        alCerrar={() => { setCardioFinal(null); onVolver(); }}
        alGuardar={() => { if (cardioFinal) marcarCardio(cardioFinal.id); setCardioFinal(null); onVolver(); }}
      />

      <EntrenoActividad
        abierta={remate}
        nombre={name}
        sesionId={sesion?.id}
        soloRemate
        titulo="¿Hiciste algo de cardio al terminar?"
        alCerrar={() => { setRemate(false); onVolver(); }}
        alGuardar={() => { setRemate(false); onVolver(); }}
      />
    </>
  );
}


function PildoraRecordatorios({ pendientes = 0, abrir }) {
  const [unidadesAbiertas, setUnidadesAbiertas] = useState(false);
  const u = useUnidades();
  // Visual nueva: los botones de cristal (círculo y palabra debajo).
  if (v2Activa()) return (
    <FilaCristal style={{ margin: '0 0 14px' }}>
      <BotonCristal tono={TONO_ATAJOS.entreno} icono={Bell} color="#C95F17" badge={pendientes} rotulo="Avisos" onClick={abrir}>Recordatorios</BotonCristal>
      {WHATSAPP_COACH && <BotonCristal tono={TONO_ATAJOS.entreno} icono={enPrueba() ? WhatsappLogo : ChatCircle} color="#25A35A" rotulo="Coach" href={`https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent('Hola Mau!')}`}>Escribirle al coach</BotonCristal>}
    </FilaCristal>
  );
  return (
    <div style={{ margin: '0 0 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {/* Los recordatorios y la mensualidad viven en el Dash; aquí, solo los
          círculos de la campanita y de escribirle al coach. */}
      <Pastilla chica soloIcono icono={Bell} color="#E0A21A" badge={pendientes} onClick={abrir}>Recordatorios</Pastilla>
      {WHATSAPP_COACH && <Pastilla chica soloIcono icono={WhatsappLogo} color="#25A35A" href={`https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent('Hola Mau!')}`}>Escribirle al coach</Pastilla>}
      {/* Unidades: en la visual nueva viven en la configuración del Dash */}
      {!v2Activa() && <Pastilla chica icono={Ruler} color={SECCION.entreno.base} onClick={() => setUnidadesAbiertas(true)}>Unidades · {u.peso || 'kg'}</Pastilla>}
      <HojaUnidades abierta={unidadesAbiertas} alCerrar={() => setUnidadesAbiertas(false)} />
    </div>
  );
}

// Parte la lista de ejercicios en tramos: cada bloque es un tramo, y los
// ejercicios sueltos se van juntando en otro. Un tramo con `vueltas > 1`
// devuelve sus ejercicios repetidos una vez por vuelta, que es como se
// entrena de verdad un circuito.
//
// `clase` (opcional) parte también los sueltos: en la visual nueva, el
// calentamiento suelto y la fuerza suelta van en tramos distintos para poder
// poner el separador entre ellos.
export function agruparEnTramos(ejercicios, bloqueDe, clase = null) {
  const tramos = [];
  ejercicios.forEach(re => {
    const b = re.bloque_id ? bloqueDe[re.bloque_id] : null;
    const ultimo = tramos[tramos.length - 1];
    const c = clase && !re.bloque_id ? clase(re) : null;
    if (ultimo && ultimo.bloqueId === (re.bloque_id || null) && ultimo.clase === c) { ultimo.lista.push(re); return; }
    tramos.push({ bloqueId: re.bloque_id || null, bloque: b, lista: [re], clase: c });
  });
  return tramos.map((t, i) => {
    // Solo los bloques con más de una vuelta se expanden. Un ejercicio suelto
    // con 4 series sigue siendo una tarjeta con 4 filas: repetir la tarjeta
    // cuatro veces sería absurdo.
    const n = t.bloque && t.bloque.vueltas > 1 ? t.bloque.vueltas : 1;
    return {
      clave: t.bloqueId || `sueltos-${i}`,
      bloque: t.bloque,
      vueltas: Array.from({ length: n }, () => t.lista),
    };
  });
}

// Lo que dice arriba el Calendario y la Galería (visual nueva).
const VOZ_SECCION = {
  mes: { etiqueta: 'CALENDARIO', a: 'Tu semana,', b: 'en orden.' },
  galeria: { etiqueta: 'GALERÍA', a: 'Mira, aprende', b: 'y ejecuta.' },
  fotos: { etiqueta: 'FOTOS DE PROGRESO', a: 'Mírate', b: 'con datos.' },
};

// ─────────────────────────────────────────────────────────────────────────
// LO QUE BATIÓ HOY
//
// Sale una sola vez, al terminar, y se cierra con un toque. No es una
// pantalla que haya que leer: es el número más alto que ha levantado nunca
// en ese ejercicio, puesto delante de sus ojos el día que lo consigue.
// ─────────────────────────────────────────────────────────────────────────
// ── Visual nueva · AL TERMINAR ───────────────────────────────────────────
// El único momento de la rutina con personaje: la kettlebell levantando la
// barra, la frase del coach, lo que hizo y, si batió algo, sus récords. Un
// toque en «Seguir» (o fuera) vuelve a Hoy.

// El cierre de la rutina: el reconocimiento de Entrenamiento. Cada vez que
// termina, la versión corta (cifras y «Seguir»); cuando cierra la última
// rutina de la semana o hay récord, la completa, con el blob y los puntos de
// la semana. La semana sale del plan, con la rutina que se acaba de cerrar
// ya contada como hecha (el plan de atrás se refresca al volver).
function HojaFin({ fin, plan = null, rutinaId = null, alCerrar }) {
  const A = SECCION.entreno;
  const hoy = hoyLocal();
  const marca = (r) => r.peso ? `${r.peso} ${r.unidad || 'kg'} × ${r.reps}` : `${r.reps} reps`;
  const frase = vozFinEntreno({ hoy, hechos: fin.hechos, total: fin.total, records: fin.records.length });
  const [respira, setRespira] = useState(false);
  const dias = ((plan && plan.dias) || []).map(d => ({ ...d }));
  const propia = (d) => d.rutina && d.rutina.id === rutinaId;
  const nombre = (dias.find(propia) || {}).rutina?.nombre || '';
  const cerrada = dias.find(d => propia(d) && !d.hecha && d.fecha <= hoy) || dias.find(d => propia(d) && !d.hecha);
  if (cerrada) cerrada.hecha = true;
  const conRutina = dias.filter(d => d.rutina);
  const hechas = conRutina.filter(d => d.hecha).length, planeadas = conRutina.length;
  const semanaCerrada = planeadas > 0 && hechas >= planeadas;
  // Siempre la ventana completa (con el blob y la semana en puntos). Cerrar
  // todo lo planeado de la semana es el anuncio especial.
  const puntos = dias.length ? dias.map(d => (d.rutina && d.hecha) ? 'hecho' : d.fecha === hoy ? 'hoy' : 'nada') : null;
  const ORD = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo'];
  const titulo = [nombre ? `${nombre}, hecho.` : 'Entreno hecho.',
    semanaCerrada ? 'Semana completa.' : (hechas >= 1 && hechas <= 7 ? `${ORD[hechas - 1]} entreno de la semana.` : null)];
  // Sin «x de y»: lo que hizo, no lo que le faltó.
  const chips = [
    ...(fin.hechos > 0 ? [[<Conteo valor={fin.hechos} ms={900} />, fin.hechos === 1 ? 'ejercicio' : 'ejercicios']] : []),
    [<Conteo valor={fin.series} ms={900} />, fin.series === 1 ? 'serie' : 'series'],
  ];
  if (fin.minutos != null && fin.kilos > 0 && fin.hechos === 0) chips.push([<Conteo valor={fin.kilos} ms={1100} />, 'kg movidos']);
  if (fin.minutos != null) chips.push([<Conteo valor={fin.minutos} ms={900} />, fin.minutos === 1 ? 'minuto' : 'minutos']);
  else if (fin.kilos > 0) chips.push([<Conteo valor={fin.kilos} ms={1100} />, 'kg movidos']);
  return (
    <>
      <Reconocimiento tema="entreno" grande especial={semanaCerrada} attrs={{ 'data-fin-entreno': '' }}
        numero={planeadas ? { valor: hechas, sufijo: `/${planeadas}`, pie: 'RUTINAS · SEMANA' } : { valor: fin.series, pie: 'SERIES' }} puntos={puntos}
        etiqueta="Entreno hecho" titulo={titulo} linea={frase} chips={chips}
        boton={{ texto: 'Seguir', onClick: alCerrar }}
        enlace={v2Activa() ? { texto: '¿Bajamos pulsaciones? Respira', icono: <Wind size={18} weight="fill" data-fin-respira-icono="" />, onClick: () => setRespira(true) } : null}
        alCerrar={alCerrar}>
        {fin.kilos > 0 && fin.minutos != null && (
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 10 }}><b style={{ color: TEXT }}>{fin.kilos.toLocaleString('es-CO')} kg</b> movidos en total.</div>
        )}
        {fin.records.length > 0 && (
          <div data-records style={{ marginTop: 12 }}>
            {fin.records.map(r => (
              <div key={r.ejercicio_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 16, background: '#F3F1EB', marginTop: 6 }}>
                <span style={{ width: 28, height: 28, borderRadius: 99, background: '#F2C94C', color: TEXT, display: 'grid', placeItems: 'center', flex: 'none' }}><TrophyV2 size={15} weight="fill" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: TEXT, lineHeight: 1.25 }}>Récord · {r.nombre}</div>
                  <div style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 1 }}>
                    <b style={{ color: A.ink }}>{marca(r)}</b>
                    {r.antes ? ` · antes ${marca(r.antes)}` : r.primera_vez ? ' · primera vez' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Reconocimiento>
      {respira && <div onClick={e => e.stopPropagation()}><Respira titulo="Bajamos pulsaciones" alCerrar={() => setRespira(false)} /></div>}
    </>
  );
}
// El reloj del entreno, en la barra de avance: arranca con la primera serie.
// Va aparte para que el segundo que pasa no vuelva a pintar toda la rutina.
function RelojSesion({ desde, v2 = false }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { asegurarCSS(); const id = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(id); }, []);
  const s = Math.max(0, Math.floor((ahora - desde) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return (
    <span data-reloj-sesion className="mt-pop" style={{
      flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99,
      background: v2 ? 'rgba(118,118,128,0.12)' : SECCION.entreno.base, color: v2 ? TEXT : '#fff', fontWeight: 750, fontVariantNumeric: 'tabular-nums',
      fontSize: v2 ? 14 : undefined,
    }} aria-label="Tiempo de entreno">
      {/* «Entreno»: es el tiempo total que lleva el entreno, para que no se
          confunda con el descanso ni con la cuenta de un ejercicio. */}
      {v2 ? <span style={{ fontSize: 11, fontWeight: 700, color: '#636366' }}>Entreno</span> : <Timer size={13} strokeWidth={2.4} />}
      {h ? `${h}:${String(m).padStart(2, '0')}` : m}:{ss}</span>
  );
}


function HojaRecords({ records, alCerrar }) {
  const marca = (r) => r.peso ? `${r.peso} ${r.unidad || 'kg'} × ${r.reps}` : `${r.reps} repeticiones`;
  return (
    <div onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(31,31,31,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: SURFACE, borderRadius: 20, padding: '24px 20px', maxWidth: 360, width: '100%',
        boxShadow: '0 12px 40px rgba(0,0,0,.22)', textAlign: 'center',
      }}>
        {v2Activa()
          ? <div style={{ width: 58, height: 58, borderRadius: 99, margin: '0 auto', display: 'grid', placeItems: 'center', background: SECCION.entreno.tint, color: SECCION.entreno.ink }}><TrophyV2 size={30} weight="fill" /></div>
          : <div style={{ fontSize: 40, lineHeight: 1 }}>🏆</div>}
        <div style={{ fontSize: 19, fontWeight: 800, color: TEXT, marginTop: 10, letterSpacing: '-0.01em' }}>
          {records.length === 1 ? 'Récord nuevo' : `${records.length} récords nuevos`}
        </div>
        <div style={{ marginTop: 14, textAlign: 'left' }}>
          {records.map(r => (
            <div key={r.ejercicio_id} style={{
              padding: '9px 0', borderTop: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{r.nombre}</div>
              <div style={{ fontSize: 14, color: ACCENT_DARK, fontWeight: 700, marginTop: 2 }}>
                {marca(r)}
                {r.antes && (
                  <span style={{ color: TEXT_LIGHT, fontWeight: 500, fontSize: 12.5 }}>
                    {'  '}antes {r.antes.peso ? `${r.antes.peso} ${r.antes.unidad || 'kg'} × ${r.antes.reps}` : `${r.antes.reps} reps`}
                  </span>
                )}
                {r.primera_vez && (
                  <span style={{ color: TEXT_LIGHT, fontWeight: 500, fontSize: 12.5 }}>{'  '}primera vez</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={alCerrar} style={{
          width: '100%', marginTop: 18, padding: '13px 18px', borderRadius: 14, border: 0,
          background: v2Activa() ? TEXT : ACCENT_DARK, color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Seguir</button>
      </div>
    </div>
  );
}

function CabeceraBloque({ b, v2 = false }) {
  const nombreTipo = {
    superserie: 'Superserie', circuito: 'Circuito', emom: 'EMOM', amrap: 'AMRAP', normal: '',
  }[b.tipo] || '';
  if (!nombreTipo && !b.nombre) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, margin: '16px 2px 8px',
      fontSize: v2 ? 12.5 : 11.5, fontWeight: 700, color: v2 ? SECCION.entreno.ink : ACCENT_DARK,
    }}>
      {/* Con la visual nueva no se repite la letra del bloque (A, B…): el
          separador del momento ya dice dónde se está. */}
      {b.nombre && !(v2 && /^[A-Z]$/.test(b.nombre)) ? b.nombre + (nombreTipo ? ' · ' : '') : ''}{nombreTipo}
      {b.vueltas ? ` · ${b.vueltas} vueltas` : ''}
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

function Ejercicio({ re, marcadas, onMarcar, onDesmarcar, serieUnica = null, compacto = false, descansoCircuito,
                    unidad = 'kg', onUnidad, onNota }) {
  const e = re.ejercicio;
  // La ficha completa (video, cómo se hace, qué músculos trabaja, las
  // características) vive en una hoja aparte. Antes se desplegaba aquí
  // dentro y el iframe de YouTube se montaba en medio de la lista: con diez
  // ejercicios el teléfono se arrastraba y perdías el sitio al cerrarlo.
  const [ficha, setFicha] = useState(false);
  // En un circuito, cada VUELTA es una serie de ese ejercicio: la vuelta 2 es
  // la serie 2. Así el circuito se marca igual que todo lo demás y no hace
  // falta una tabla aparte para las vueltas.
  const series = serieUnica != null
    ? [serieUnica]
    : Array.from({ length: Math.max(1, re.series || 1) }, (_, i) => i + 1);
  const ultima = re.ultima_vez;
  // El peso sugerido es el de la última vez: es lo que hace que marcar una
  // serie sea un toque y no teclear cada número otra vez.
  // Si hoy está en otra unidad que la última vez (otro gimnasio), se convierte.
  const pesoSugerido = ultima && ultima.mejor_peso
    ? String(convertir(ultima.mejor_peso, ultima.unidad || 'kg', unidad)) : '';
  const thumb = miniatura(e);
  // Peso corporal (flexiones, dominadas, bandas…): solo reps.
  const soloReps = sinPeso(e);

  const filas = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {series.map(n => (
        <SerieFila
          key={n} n={n} re={re}
          marcada={marcadas[`${re.id}:${n}`]}
          previa={(ultima?.series || []).find(x => x.serie === n) || null}
          pesoSugerido={soloReps ? '' : pesoSugerido} unidad={unidad} soloReps={soloReps}
          repsSugeridas={String(re.reps || '').match(/^\d+/) ? String(re.reps).match(/^\d+/)[0] : ''}
          // Fuera de un circuito: el descanso del ejercicio tras cada serie
          // (también la última, antes de pasar al siguiente ejercicio).
          descansoSeg={descansoCircuito !== undefined ? descansoCircuito : re.descanso_seg}
          onMarcar={onMarcar} onDesmarcar={onDesmarcar}
        />
      ))}
    </div>
  );

  // Vuelta 2 en adelante de un circuito: solo el nombre y la fila. Repetir la
  // miniatura, el récord y las características en cada vuelta convierte un
  // circuito de tres vueltas en tres pantallas de scroll para marcar tres
  // números.
  if (compacto) {
    return (
      <div style={{
        background: SURFACE, borderRadius: 13, padding: '11px 13px', marginBottom: 8,
        boxShadow: SHADOW_CARD,
      }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: TEXT, marginBottom: 7,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{e.nombre}</div>
        {filas}
      </div>
    );
  }

  return (
    <div style={{
      background: SURFACE, borderRadius: 16, padding: 15, marginBottom: 12, boxShadow: SHADOW_CARD,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        {/* La miniatura ES el botón: es lo que la gente toca cuando no se
            acuerda de un ejercicio. Sin video queda la pesa, que abre lo
            mismo — la descripción y los músculos también están ahí. */}
        <button onClick={() => setFicha(true)} aria-label={`Ver ${e.nombre}`} style={{
          flexShrink: 0, width: 72, height: 52, borderRadius: 10, overflow: 'hidden',
          border: 'none', padding: 0, cursor: 'pointer', background: SURFACE_2,
          position: 'relative', display: 'block',
        }}>
          {thumb
            ? <img src={thumb} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 19, lineHeight: '52px', display: 'block', opacity: .45 }}>🏋️</span>}
          {thumb && (
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(31,31,31,0.22)', color: '#fff', fontSize: 14,
            }}><Play size={15} fill="#fff" /></span>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>{nombresEj(e).grande}</div>
          {nombresEj(e).chico && <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 1 }}>{nombresEj(e).chico}</div>}
          <div style={{ fontSize: 12.5, color: ACCENT_DARK, fontWeight: 600, marginTop: 3 }}>
            {re.series} × {re.reps}
            {re.peso_objetivo ? ` · ${re.peso_objetivo}` : ''}
            {re.rir != null ? ` · RIR ${re.rir}` : ''}
          </div>
          <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 2 }}>
            {re.tempo ? `Tempo ${re.tempo} · ` : ''}
            {re.descanso_seg ? `Descanso ${re.descanso_seg}s` : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
            <button onClick={() => setFicha(true)} style={pildora}>Características</button>
            {onNota && <button onClick={onNota} style={pildora}>Nota al coach</button>}
          </div>
        </div>
      </div>

      <EntrenoFicha item={re} abierto={ficha} alCerrar={() => setFicha(false)} />

      {/* LO QUE LEVANTÓ LA ÚLTIMA VEZ. Va aquí arriba, pegado, no en un
          historial aparte: es lo que se mira antes de cargar la barra. */}
      {ultima && ultima.series.length > 0 && (
        <div style={{
          marginTop: 10, padding: '8px 11px', borderRadius: 10, background: SURFACE_2,
          fontSize: 11.5, color: TEXT_MUTED, lineHeight: 1.5,
        }}>
          {ultima.record && (
            <div style={{ marginBottom: 3 }}>
              🏆 <strong style={{ color: ACCENT_DARK }}>Tu récord</strong>{' '}
              {ultima.record.peso
                ? `${ultima.record.peso}${ultima.record.unidad || 'kg'} × ${ultima.record.reps}`
                : `${ultima.record.reps} reps`}
              {' '}<span style={{ opacity: .7 }}>({fechaCorta(ultima.record.fecha)})</span>
            </div>
          )}
          <strong style={{ color: TEXT }}>La última vez</strong>{' '}
          ({fechaCorta(ultima.fecha)}):{' '}
          {ultima.series.map(s => `${s.reps ?? '—'}×${s.peso ?? '—'}${s.unidad || 'kg'}`).join(' · ')}
        </div>
      )}

      {re.notas && (
        <div style={{
          marginTop: 10, padding: '8px 11px', borderRadius: 10,
          background: '#FFF8E6', fontSize: 12, color: '#6B4E05', lineHeight: 1.5,
        }}>{re.notas}</div>
      )}

      {/* Encabezado de columnas. Sin él, la cifra gris de la izquierda no se
          entiende: parece un número suelto en vez de "lo que hiciste". */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 2,
        fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
        color: TEXT_LIGHT,
      }}>
        <div style={{ width: 24, flexShrink: 0 }} />
        <div style={{ width: 52, flexShrink: 0, textAlign: 'right' }}>Antes</div>
        <div style={{ flex: 1, textAlign: 'center' }}>Reps</div>
        {!soloReps && <>
        <div style={{ width: 8, flexShrink: 0 }} />
        {/* La columna del peso ES el interruptor: kg ⇄ lb para este ejercicio. */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <button onClick={onUnidad} aria-label={`Cambiar a ${unidad === 'kg' ? 'libras' : 'kilos'}`} style={{
            border: `1px solid ${BORDER}`, background: 'transparent', borderRadius: 999,
            padding: '1px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
            textTransform: 'uppercase', color: ACCENT_DARK, cursor: 'pointer', fontFamily: 'inherit',
          }}>{unidad} ⇄</button>
        </div>
        </>}
        <div style={{ width: 38, flexShrink: 0 }} />
      </div>

      {filas}
    </div>
  );
}

function SerieFila({ n, re, marcada, previa, pesoSugerido, repsSugeridas, descansoSeg, unidad = 'kg', onMarcar, onDesmarcar, soloReps = false }) {
  const [reps, setReps] = useState(marcada?.reps != null ? String(marcada.reps) : repsSugeridas);
  const [peso, setPeso] = useState(marcada?.peso != null ? String(marcada.peso) : pesoSugerido);
  const hecha = !!marcada;

  useEffect(() => {
    if (marcada) {
      setReps(marcada.reps != null ? String(marcada.reps) : '');
      setPeso(marcada.peso != null ? String(marcada.peso) : '');
    }
  }, [marcada]);

  // Al pasar de kg a lb, el peso sugerido se convierte. Solo si el campo aún
  // tiene la sugerencia: lo que el cliente tecleó a mano no se toca.
  const sugerenciaPrevia = useRef(pesoSugerido);
  useEffect(() => {
    if (!marcada && peso === sugerenciaPrevia.current) setPeso(pesoSugerido);
    sugerenciaPrevia.current = pesoSugerido;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pesoSugerido]);

  const campo = {
    width: '100%', padding: '9px 8px', borderRadius: 9, textAlign: 'center',
    border: `1px solid ${hecha ? 'transparent' : BORDER}`,
    background: hecha ? 'transparent' : SURFACE,
    fontSize: 15, fontWeight: 600, color: TEXT, outline: 'none',
    fontFamily: 'inherit', WebkitAppearance: 'none',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: hecha ? `color-mix(in srgb, ${ACCENT_PASTEL} 33%, transparent)` : 'transparent',
      borderRadius: 11, padding: hecha ? '2px 4px' : 0,
    }}>
      <div style={{
        width: 24, flexShrink: 0, textAlign: 'center',
        fontSize: 12, fontWeight: 800, color: hecha ? ACCENT_DARK : TEXT_LIGHT,
      }}>{n}</div>
      {/* LO QUE HIZO EN ESTA MISMA SERIE LA VEZ PASADA.
          Va al lado del campo y no en un cartel arriba a propósito: es el
          dato que se mira quince veces por sesión, una por serie, y tenerlo
          como marca de agua del campo no sirve — desaparece en cuanto tocas
          el teclado, que es justo cuando lo necesitas. */}
      <div style={{
        width: 52, flexShrink: 0, textAlign: 'right',
        fontSize: 11.5, color: TEXT_LIGHT, fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.15,
      }} title={previa ? 'Lo que hiciste en esta serie la última vez' : 'Es la primera vez que haces esta serie'}>
        {previa
          ? `${previa.reps ?? '—'}${previa.peso ? `×${previa.peso}` : ''}${previa.peso && (previa.unidad || 'kg') !== unidad ? (previa.unidad || 'kg') : ''}`
          : <span style={{ opacity: .4 }}>—</span>}
      </div>
      <div style={{ flex: 1 }}>
        <input inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)}
          placeholder="reps" aria-label={`Repeticiones serie ${n}`} style={campo} disabled={hecha} />
      </div>
      {!soloReps && <>
      <div style={{ fontSize: 12, color: TEXT_LIGHT, flexShrink: 0 }}>×</div>
      <div style={{ flex: 1 }}>
        <input inputMode="decimal" value={peso} onChange={e => setPeso(e.target.value)}
          placeholder={unidad} aria-label={`Peso serie ${n}`} style={campo} disabled={hecha} />
      </div>
      </>}
      <button
        onClick={() => hecha
          ? onDesmarcar(re, n)
          : onMarcar(re, n, numero(reps), soloReps ? null : numero(peso), descansoSeg, unidad)}
        aria-label={hecha ? `Deshacer serie ${n}` : `Marcar serie ${n}`}
        style={{
          flexShrink: 0, width: 38, height: 38, borderRadius: 11, cursor: 'pointer',
          border: hecha ? 0 : `1px solid ${BORDER}`,
          background: hecha ? ACCENT : 'transparent',
          color: hecha ? '#fff' : TEXT_LIGHT,
          display: 'grid', placeContent: 'center',
        }}><Check size={17} strokeWidth={hecha ? 3 : 2} /></button>
    </div>
  );
}

// ── CERRAR EL ENTRENAMIENTO ───────────────────────────────────────────────
// UNA sola pantalla, al final. No hay botón de "empezar": abrir la rutina ya
// abre la sesión, y la duración se mide desde la primera serie marcada — un
// botón de start sería un toque que no compra nada.
//
// La percepción se puede SALTAR. Un RPE obligatorio es la receta para tener
// datos basura: la gente toca 7 para salir de la pantalla, y un 7 falso es
// peor que un vacío honesto. El que llega es el que el cliente quiso poner.
//
// La nota va debajo y sin obligar. En la práctica "me molestó el hombro en la
// última serie" le sirve al coach más que el número.
// La intensidad, del 1 al 10: de azul suave (fácil) a amarillo y a rojo (al
// límite). Del 6 al 9 es la zona de progreso. Cada número dice su nombre.
const INTENSIDAD_TONOS = [[1, [141, 186, 240]], [5, [242, 201, 76]], [8, [238, 132, 52]], [10, [214, 69, 65]]];
function tonoIntensidad(n, a = 1) {
  for (let i = 0; i < INTENSIDAD_TONOS.length - 1; i++) {
    const [x, c1] = INTENSIDAD_TONOS[i], [y, c2] = INTENSIDAD_TONOS[i + 1];
    if (n <= y) { const t = (n - x) / (y - x); return `rgba(${c1.map((v, k) => Math.round(v + (c2[k] - v) * t)).join(',')},${a})`; }
  }
  return `rgba(214,69,65,${a})`;
}
const tintaIntensidad = (n) => {
  for (let i = 0; i < INTENSIDAD_TONOS.length - 1; i++) {
    const [x, c1] = INTENSIDAD_TONOS[i], [y, c2] = INTENSIDAD_TONOS[i + 1];
    if (n <= y) { const t = (n - x) / (y - x); return `rgb(${c1.map((v, k) => Math.round((v + (c2[k] - v) * t) * 0.62)).join(',')})`; }
  }
  return 'rgb(133,43,40)';
};
// Solo el nombre de cada número (Mauro aprobó los nombres, sin explicación).
const SIGNIFICADO_INTENSIDAD = (n) => n <= 2 ? 'Muy suave' : n <= 4 ? 'Suave' : n === 5 ? 'Moderado'
  : n <= 7 ? 'Exigente' : n === 8 ? 'Muy exigente' : n === 9 ? 'Casi al límite' : 'Al límite';

function HojaCierre({ hechas, total, onCerrar, onSaltar, onCancelar, guardando, error, escritas = [], onMarcarEscritas, onRevisar }) {
  const [rpe, setRpe] = useState(null);
  const [nota, setNota] = useState('');
  // Lo escrito sin marcar: se resuelve aquí (marcar, revisar o dejar sin contar).
  const [resueltas, setResueltas] = useState(false);
  const conReps = escritas.filter(e => e.reps != null).length;

  return (
    <div style={{
      // Por encima de la barra de navegación (z-45): es una hoja modal, y
      // con la barra encima tapaba el botón de enviar y el de volver.
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(20,20,18,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onCancelar}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: SURFACE,
        borderRadius: '22px 22px 0 0', padding: 20,
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '88vh', overflowY: 'auto',
      }}>
        <div style={{
          width: 38, height: 4, borderRadius: 99, background: BORDER,
          margin: '0 auto 16px',
        }} />

        {hechas > 0 && (
          <div data-cierre-check style={{
            width: 50, height: 50, borderRadius: '50%', display: 'grid', placeItems: 'center', marginBottom: 12,
            background: 'linear-gradient(145deg, #4A88E0, #2F68C0)', boxShadow: '0 8px 20px rgba(60,123,214,.32)',
          }}><Check size={26} strokeWidth={3} color="#fff" /></div>
        )}
        {/* Sin «x de y series»: lo que cuenta es que entrenó, no lo que faltó. */}
        <div style={{ fontSize: hechas > 0 ? 27 : 19, fontWeight: 800, color: TEXT, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {hechas > 0 ? 'Entreno terminado' : 'Aún no marcas ninguna serie'}
        </div>
        <div style={{ fontSize: hechas > 0 ? 15 : 13, color: TEXT_MUTED, marginTop: 4 }}>
          {hechas > 0
            ? 'Buen trabajo. Cuéntale a tu coach cómo te fue.'
            : 'Si hoy no pudiste entrenar, díselo a tu coach. Cuenta como día saltado, no como entreno.'}
        </div>

        {escritas.length > 0 && !resueltas && (
          <div data-escritas style={{ marginTop: 16, padding: '12px 13px', borderRadius: 14, background: '#FFF6E0' }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT }}>
              {escritas.length === 1 ? 'Quedó 1 serie con números sin marcar' : `Quedaron ${escritas.length} series con números sin marcar`}
            </div>
            <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.45 }}>
              {escritas.slice(0, 4).map(e => `${nombresEj(e.re.ejercicio).grande} · serie ${e.n} · ${e.reps != null ? e.reps : '—'}${e.peso != null ? ` × ${String(e.peso).replace('.', ',')} ${e.unidad}` : ''}${e.reps == null ? ' · falta reps' : ''}`).join('  ·  ')}
              {escritas.length > 4 ? ' …' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {conReps > 0 && (
                <button data-escritas-marcar onClick={() => { onMarcarEscritas && onMarcarEscritas(); setResueltas(true); }} style={{
                  flex: '1 1 auto', height: 42, borderRadius: 12, border: 0, background: '#1D1D1F', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 750, cursor: 'pointer', padding: '0 14px',
                }}>Marcarlas como hechas{conReps < escritas.length ? ` (${conReps})` : ''}</button>
              )}
              <button data-escritas-revisar onClick={onRevisar} style={{
                flex: '1 1 auto', height: 42, borderRadius: 12, border: `1.5px solid ${BORDER}`, background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '0 14px',
              }}>Revisarlas</button>
              <button data-escritas-dejar onClick={() => setResueltas(true)} style={{
                flex: '1 1 100%', height: 36, borderRadius: 12, border: 0, background: 'transparent', color: TEXT_MUTED, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>Dejarlas sin contar</button>
            </div>
          </div>
        )}

        {hechas > 0 && <>
        <div style={{ fontSize: 17, fontWeight: 750, color: TEXT, letterSpacing: '-0.01em', margin: '22px 0 2px' }}>¿Qué tan intensa fue tu sesión?</div>
        <div style={{ fontSize: 13, color: TEXT_LIGHT, marginBottom: 12 }}>Del 1 al 10. Lo usa tu coach para ajustar tu plan.</div>

        {/* Del 1 al 10, en una fila, cada número con su tono: azul suave → amarillo →
            rojo. Grandes y separados: se toca con el pulgar, de pie. */}
        <div data-escala-intensidad style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Snowflake size={19} weight="bold" color="#5B97E3" style={{ flex: 'none' }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
              const activo = rpe === n;
              return (
                <button key={n} onClick={() => setRpe(activo ? null : n)}
                  aria-label={`Percepción ${n}`} aria-pressed={activo}
                  style={{
                    minWidth: 0, height: 44, borderRadius: 12, cursor: 'pointer', border: 0, padding: 0,
                    background: tonoIntensidad(n, activo ? 1 : 0.17),
                    color: activo ? '#fff' : tintaIntensidad(n),
                    fontSize: 15, fontWeight: 750, fontFamily: 'inherit',
                    transform: activo ? 'scale(1.12)' : 'none', transition: 'transform .15s ease, background .15s ease',
                    boxShadow: activo ? `0 6px 14px ${tonoIntensidad(n, 0.45)}` : 'none',
                  }}>{n}</button>
              );
            })}
          </div>
          <Fire size={19} weight="fill" color="#D64541" style={{ flex: 'none' }} aria-hidden="true" />
        </div>
        {/* Del 6 al 9: la zona donde se progresa. */}
        <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
          <span style={{ width: 19, flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
            <div data-zona-progreso style={{ gridColumn: '6 / 10', textAlign: 'center' }}>
              <div style={{ height: 7, border: '2px solid #46965A', borderTop: 0, borderRadius: '0 0 8px 8px' }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: '#46965A', marginTop: 4, whiteSpace: 'nowrap' }}>Zona de progreso</div>
            </div>
          </div>
          <span style={{ width: 19, flex: 'none' }} />
        </div>
        {rpe && (() => {
          const nombre = SIGNIFICADO_INTENSIDAD(rpe);
          return (
            <div data-significado-intensidad style={{ marginTop: 12, padding: '11px 14px', borderRadius: 14, background: SURFACE_2, display: 'flex', alignItems: 'center', gap: 12 }}>
              <b style={{ fontSize: 23, fontWeight: 850, color: tonoIntensidad(rpe), letterSpacing: '-0.02em', minWidth: 24, textAlign: 'center' }}>{rpe}</b>
              <span style={{ minWidth: 0, fontSize: 14.5, fontWeight: 700, color: TEXT }}>{nombre}</span>
            </div>
          );
        })()}
        </>}

        <textarea
          value={nota} onChange={e => setNota(e.target.value)} rows={2}
          placeholder={hechas > 0 ? '¿Algo que deba saber tu coach? (opcional)' : '¿Qué pasó? (opcional)'}
          style={{
            width: '100%', marginTop: 16, padding: '11px 12px', borderRadius: 12,
            border: `1px solid ${BORDER}`, background: SURFACE_2,
            fontSize: 14, color: TEXT, fontFamily: 'inherit', resize: 'none', outline: 'none',
          }} />

        {error && (
          <div role="alert" style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 12,
            background: '#FBEDEA', color: '#8A3A2C', fontSize: 13, lineHeight: 1.45,
          }}>{error}</div>
        )}

        {/* La intensidad es obligatoria: es uno de los datos con que el coach
            mide cómo vas (promedio y acumulado en su CRM y en tu Dash). */}
        {hechas > 0 && (
          <button data-enviar-coach
            onClick={() => { if (rpe) onCerrar(rpe, nota); }} disabled={guardando || !rpe}
            style={{
              width: '100%', marginTop: 14, padding: '15px 18px', borderRadius: 15, border: 0,
              background: rpe ? '#1D1D1F' : BORDER, color: rpe ? '#fff' : TEXT_LIGHT, fontSize: 15, fontWeight: 700,   // grafito: la acción principal
              cursor: guardando || !rpe ? 'default' : 'pointer', opacity: guardando ? 0.7 : 1,
              fontFamily: 'inherit',
            }}>{guardando ? 'Guardando…' : rpe ? 'Enviar a mi coach' : 'Elige tu intensidad'}</button>
        )}

        {/* "No pude entrenar hoy" existía en la primera versión del módulo y
            se perdió al pasarlo a esta app. No es un "marcar como hecho": deja
            el día como SALTADO, que es un dato que el coach necesita. Solo se
            ofrece si no hay series: con series marcadas, entrenó. */}
        {hechas === 0 && (
          <button
            onClick={() => onSaltar(nota)} disabled={guardando}
            style={{
              width: '100%', marginTop: 14, padding: '14px 18px', borderRadius: 15,
              border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT,
              fontSize: 15, fontWeight: 700, cursor: guardando ? 'default' : 'pointer',
              opacity: guardando ? 0.7 : 1, fontFamily: 'inherit',
            }}>{guardando ? 'Guardando…' : 'No pude entrenar hoy'}</button>
        )}

        <button onClick={onCancelar} disabled={guardando} style={{
          width: '100%', marginTop: 8, padding: '11px', borderRadius: 12,
          border: 0, background: 'transparent', color: TEXT_MUTED,
          fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>Sigo entrenando</button>
      </div>
    </div>
  );
}

// ── DESCANSO ──────────────────────────────────────────────────────────────
// Es la función más usada de cualquier app de entreno: sin ella la gente se
// sale a buscar el cronómetro del teléfono y ya no vuelve. Arranca sola al
// marcar una serie, con el descanso que el coach prescribió en ESE ejercicio.
//
// Va fijo abajo, por encima de la barra ovalada de la app (que ocupa ~96px),
// para que se vea mientras se hace scroll por los ejercicios. Cuando llega a
// cero se queda en 0:00 un momento con el aviso, en vez de desaparecer sola:
// si desapareciera, quien no estaba mirando no se entera de nada.
// La cuenta atrás de un ejercicio por tiempo: la misma ventanita negra que
// el descanso, con el nombre del ejercicio (y el lado, si es por lado).
// La barra negra va a <body> y por encima de todo: abiertas la Ficha, el
// Historial o la Nota (que también van a <body>), el reloj se seguía
// contando pero quedaba tapado. Mientras se ve, las hojas dejan sitio abajo
// (--mt-reloj-alto) para que no tape lo último de la hoja.
function EncimaDeTodo({ children }) {
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty('--mt-reloj-alto', '84px');
    return () => raiz.style.removeProperty('--mt-reloj-alto');
  }, []);
  return typeof document !== 'undefined' ? createPortal(children, document.body) : children;
}

function BarraCuenta({ cuenta, queda, onPausa, onListo }) {
  const total = cuenta.seg * cuenta.lados * 1000;
  const q = cuenta.pausa != null ? cuenta.pausa : queda;
  const lado = cuenta.lados > 1 ? (q > cuenta.seg * 1000 ? 1 : 2) : null;
  const enLado = Math.ceil((lado === 1 ? q - cuenta.seg * 1000 : q) / 1000);
  const mm = Math.floor(Math.max(0, enLado) / 60), ss = String(Math.max(0, enLado) % 60).padStart(2, '0');
  const pct = total > 0 ? Math.max(0, Math.min(1, q / total)) : 0;
  const r = 11, c = 2 * Math.PI * r;
  return (
    <EncimaDeTodo>
    <div data-cuenta-ejercicio={cuenta.pausa != null ? 'pausa' : 'contando'} style={{
      position: 'fixed', left: 12, right: 12, bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', zIndex: 65,
      borderRadius: 20, background: '#1D1D1F', color: '#fff', boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px 10px 14px',
    }}>
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ flex: 'none' }} aria-hidden="true">
        <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
        <circle cx="14" cy="14" r={r} fill="none" stroke="#F2C94C" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 14 14)" style={{ transition: 'stroke-dashoffset .25s linear' }} />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nombresEj(cuenta.re.ejercicio).grande}{lado ? ` · Lado ${lado}` : ''}
        </div>
        <div style={{ fontSize: 18, fontWeight: 750, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{mm}:{ss}</div>
      </div>
      <button onClick={onPausa} style={btnDescansoV2}>{cuenta.pausa != null ? 'Seguir' : 'Pausa'}</button>
      <button onClick={onListo} style={btnDescansoV2}>Listo</button>
    </div>
    </EncimaDeTodo>
  );
}

function BarraDescanso({ segundos, restante, onSaltar, onMas, v2 = false }) {
  const listo = restante <= 0;
  const mm = Math.floor(Math.max(0, restante) / 60);
  const ss = String(Math.max(0, restante) % 60).padStart(2, '0');
  const pct = segundos > 0 ? Math.max(0, Math.min(100, (restante / segundos) * 100)) : 0;
  if (v2) {
    // Estilo Apple: cápsula grafito con el anillo amarillo que se vacía.
    const r = 11, c = 2 * Math.PI * r;
    return (
      <EncimaDeTodo>
      <div data-descanso={listo ? 'listo' : 'contando'} style={{
        position: 'fixed', left: 12, right: 12, bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', zIndex: 65,
        borderRadius: 20, background: '#1D1D1F', color: '#fff', boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px 10px 14px',
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" style={{ flex: 'none' }} aria-hidden="true">
          <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
          <circle cx="14" cy="14" r={r} fill="none" stroke="#F2C94C" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 14 14)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>{listo ? 'Listo' : 'Descanso'}</div>
          <div style={{ fontSize: 18, fontWeight: 750, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, color: listo ? '#F2C94C' : '#fff' }}>
            {listo ? 'A la siguiente' : `${mm}:${ss}`}
          </div>
        </div>
        {!listo && <button onClick={onMas} style={btnDescansoV2}>+15s</button>}
        <button onClick={onSaltar} style={btnDescansoV2}>{listo ? 'Cerrar' : 'Saltar'}</button>
      </div>
      </EncimaDeTodo>
    );
  }

  return (
    <div data-descanso={listo ? 'listo' : 'contando'} style={{
      position: 'fixed', left: 12, right: 12,
      bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
      zIndex: 3, borderRadius: 16, overflow: 'hidden',
      background: listo ? ACCENT : '#1F1F1F', color: '#fff',
      boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
    }}>
      {/* La barra que se vacía: se lee de reojo, sin tener que leer el número. */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.18)' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'rgba(255,255,255,0.75)', transition: 'width 1s linear' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px' }}>
        <Timer size={17} style={{ flexShrink: 0, opacity: 0.9 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.78 }}>
            {listo ? 'Listo' : 'Descanso'}
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
            {listo ? 'A la siguiente' : `${mm}:${ss}`}
          </div>
        </div>
        {!listo && (
          <button onClick={onMas} style={btnDescanso}>+15s</button>
        )}
        <button onClick={onSaltar} style={btnDescanso}>{listo ? 'Cerrar' : 'Saltar'}</button>
      </div>
    </div>
  );
}
const btnDescansoV2 = {
  flexShrink: 0, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', border: 'none',
  background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
};
const btnDescanso = {
  flexShrink: 0, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.10)',
  color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
};


const pildora = {
  border: `1px solid ${BORDER}`, background: 'transparent',
  borderRadius: 999, padding: '3px 11px', fontSize: 11.5, fontWeight: 700,
  color: TEXT_MUTED, cursor: 'pointer', fontFamily: 'inherit',
};

// ── piezas ────────────────────────────────────────────────────────────────
const fechaCorta = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' });
};

const Volver = ({ onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12,
    background: 'transparent', border: 0, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: TEXT_MUTED, padding: '4px 0',
  }}><ChevronLeft size={17} /> Mi semana</button>
);

const Centrado = ({ children }) => (
  <div style={{ display: 'grid', placeContent: 'center', minHeight: '40vh' }}>{children}</div>
);

const Tarjeta = ({ children }) => (
  <div style={{ background: SURFACE, borderRadius: 16, padding: 16, boxShadow: SHADOW_CARD, marginBottom: 14 }}>{children}</div>
);

const Fila = ({ icono, titulo }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
    {icono}
    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>{titulo}</div>
  </div>
);

const Vacio = ({ texto }) => (
  <p style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.55, margin: 0 }}>{texto}</p>
);

// ── Fotos de progreso: la entrada desde Hoy (lote 26, solo Mauro) ─────────
function AtajoFotos({ onClick }) {
  return (
    <button data-atajo-fotos onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 12, padding: '13px 14px', border: 0,
      borderRadius: 18, background: '#FFFFFF', boxShadow: SHADOW_CARD, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: TEXT,
    }}>
      <span style={{ width: 38, height: 38, borderRadius: 99, background: '#F1EFE9', display: 'grid', placeItems: 'center', flex: 'none' }}><Camera size={20} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15.5, fontWeight: 750 }}>Fotos de progreso</span>
        <span style={{ display: 'block', fontSize: 13, color: TEXT_MUTED, marginTop: 1 }}>Mírate con datos: antes y ahora, de la misma pose.</span>
      </span>
      <CaretRight size={18} color={TEXT_LIGHT} />
    </button>
  );
}
