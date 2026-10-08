import React, { useState, useEffect, useRef, useCallback } from 'react';
import EntrenoMes, { HoySemana, precargarMeses, AvisoFlotante, ACTUALIZANDO } from './EntrenoMes.jsx';
import EntrenoRutinas from './EntrenoRutinas.jsx';
import EntrenoResumen from './EntrenoResumen.jsx';
import EntrenoFotos from './EntrenoFotos.jsx';
import EntrenoActividad, { ChipActividad } from './EntrenoActividad.jsx';
import EntrenoFicha from './EntrenoFicha.jsx';
import EntrenoGaleria from './EntrenoGaleria.jsx';
import { HojaMedida } from './EntrenoMedidas.jsx';
import HojaNota from './EntrenoNota.jsx';
import { api as entrenoApi, miniatura, hoyLocal, numero, descansoEnCircuito, convertir, sinPeso } from './entrenoDatos.js';
import { crearCola, guardarRutinaLocal, leerRutinaLocal } from './entrenoCola.js';
import { nombresEj, v2Activa, WHATSAPP_COACH } from './v2.js';
import { Pastilla } from './PastillaV2.jsx';
import CabeceraHoy from './CabeceraHoy.jsx';
import { IlustracionPesas } from './IlustracionesHoy.jsx';
import { vozEntreno, vozFinEntreno } from './vozCoach.js';
import Firma from './Firma.jsx';
import { Conteo, Confeti, asegurarCSS, vibrar } from './Celebraciones.jsx';
import { useUnidades, HojaUnidades } from './Unidades.jsx';
import { Bell, Ruler, CheckCircle, WhatsappLogo } from '@phosphor-icons/react';
import { EjercicioV2, CircuitoV2, SeparadorMomento, fasesDeTramos, claseMomento } from './EntrenoEjercicioV2.jsx';
import { Trophy as TrophyV2 } from '@phosphor-icons/react';
import { Dumbbell, Calendar, ChevronLeft, Check, Play, Loader2, Info, Timer, CloudOff } from 'lucide-react';
import {
  SURFACE, SURFACE_2, BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT,
  SHADOW_CARD, FONT_DISPLAY, SECCION,
} from './theme.js';
// El aro de la cabecera de Entrenamiento: la adherencia de la semana (las
// rutinas hechas de las que tocan).
export function aroEntreno(plan) {
  const dias = (plan && plan.dias) || [];
  const planeadas = dias.filter(d => d.rutina).length;
  if (!planeadas) return null;
  const hechas = dias.filter(d => d.rutina && d.hecha).length;
  return { frac: hechas / planeadas, centro: `${Math.round((hechas / planeadas) * 100)}%`, pie: 'Performance semanal' };
}

// El acento del módulo sale de entrenoUI: oliva de siempre, azul en la visual nueva.
import { ACCENT, ACCENT_DARK, ACCENT_PASTEL, SUCCESS } from './entrenoUI.jsx';

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

// Nunca lanza: sin red devuelve { ok:false } y la pantalla lo dice. Antes un
// fallo de red dejaba la rutina con el spinner girando para siempre.
const api = async (body) => {
  try {
    const r = await fetch('/api/training', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, motivo: `http_${r.status}` };
    return await r.json();
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
  if (r && r.ok) precargarRutinas(name, r);
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

export default function Entrenamiento({ name, seccionV2 = null, alSeccionV2, recordatorios = null, avisoPago = null }) {
  const [plan, setPlan] = useState(() => cachePlan.get(name) || null);
  const [cargando, setCargando] = useState(() => !cachePlan.has(name));
  const [rutinaId, setRutinaId] = useState(null);
  const [seccionPropia, setSeccionPropia] = useState('hoy');
  const seccion = seccionV2 || seccionPropia;
  const setSeccion = seccionV2 ? (alSeccionV2 || (() => {})) : setSeccionPropia;
  const NavSi = seccionV2 ? SinNav : Nav;
  // Tocar otra opción de la barra con una rutina abierta lleva a esa opción.
  useEffect(() => { if (seccionV2) setRutinaId(null); }, [seccionV2]);

  const cargarPlan = useCallback(async () => {
    if (!cachePlan.has(name)) setCargando(true);
    const r = await api({ accion: 'plan', name });
    if (r && r.ok) { cachePlan.set(name, r); precargarRutinas(name, r); }
    // Sin red y con algo guardado: se queda lo guardado, no un «sin plan».
    setPlan(r && r.ok ? r : (cachePlan.get(name) || { ok: false }));
    setCargando(false);
  }, [name]);

  useEffect(() => { cargarPlan(); }, [cargarPlan]);
  // Lo que quedó sin subir de la última vez sube al entrar.
  useEffect(() => { cola.vaciar(); }, []);

  // Al cambiar de sección se sube. Sin esto, saltar de un Mes largo a Hoy te
  // deja a media página en un sitio que ya no existe.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [seccion, rutinaId]);

  if (rutinaId) {
    return (
      <Envoltorio>
        <VistaRutina
          name={name} rutinaId={rutinaId}
          onVolver={() => { setRutinaId(null); cargarPlan(); }}
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
        {seccionV2 && VOZ_SECCION[seccion] && <CabeceraHoy tema="entreno" fondo={false} voz={VOZ_SECCION[seccion]} />}
        {seccion === 'mes' && <EntrenoMes nombre={name} alEntrenar={setRutinaId} />}
        {seccion === 'rutinas' && <EntrenoRutinas nombre={name} alEntrenar={setRutinaId} />}
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
        {seccionV2 && <CabeceraHoy tema="entreno" voz={vozEntreno({ plan, hoy: hoyLocal() })}
        arriba={`calc(${FADE_TOP}px + env(safe-area-inset-top, 0px) + 12px)`} />}
      {recordatorios && <PildoraRecordatorios {...recordatorios} />}
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
      {seccionV2 && <CabeceraHoy tema="entreno" voz={vozEntreno({ plan, hoy: hoyLocal() })}
        arriba={`calc(${FADE_TOP}px + env(safe-area-inset-top, 0px) + 12px)`} aro={aroEntreno(plan)} />}
      {recordatorios && <PildoraRecordatorios {...recordatorios} />}
      {v2Activa() ? (
        // Visual nueva: lo de HOY todo junto (fuerza, registros, lo del coach
        // y añadir actividad) y, debajo, la semana con el detalle de cada
        // día. El Calendario queda para el mes: no se repite lo mismo.
        <>
          <CabeceraFase fase={plan.fase} v2 />
          <HoySemana nombre={name} alEntrenar={setRutinaId}
            ejerciciosDe={Object.fromEntries((plan.dias || []).filter(d => d.rutina).map(d => [d.rutina.id, d.rutina.ejercicios]))} />
          <Sueltas plan={plan} onAbrir={setRutinaId} />
        </>
      ) : (
        <>
          <VistaSemana plan={plan} onAbrir={setRutinaId} />
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
      <div style={{ fontSize: 13.5, color: TEXT_MUTED, marginTop: 5 }}>
        {f.semana_actual ? `Semana ${f.semana_actual} de ${f.semanas}` : `${f.semanas} semanas`}{f.objetivo ? ` · ${f.objetivo}` : ''}
      </div>
    </div>
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
          <div style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 5 }}>
            {f.semana_actual
              ? `Semana ${f.semana_actual} de ${f.semanas}`
              : `${f.semanas} semanas`}
            {f.objetivo ? ` · ${f.objetivo}` : ''}
          </div>
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
        </div>
      </div>
    </>
  );
  if (d.descanso) return <div style={{ ...filaBase(d.es_hoy), cursor: 'default' }}>{contenido}</div>;
  return <button onClick={() => onAbrir(d.rutina.id)} style={filaBase(d.es_hoy)}>{contenido}</button>;
}

// ── UNA RUTINA, Y SU EJECUCIÓN ────────────────────────────────────────────
function VistaRutina({ name, rutinaId, onVolver }) {
  // Se abre AL INSTANTE con la copia guardada en el teléfono (la precarga deja
  // las de la semana listas) y lo del servidor llega por detrás, con un
  // «Actualizando…» pequeño mientras tanto. Antes había que esperar dos
  // pedidos seguidos mirando una pantalla vacía.
  const [datos, setDatos] = useState(() => leerRutinaLocal(almacen, rutinaId));
  const [sinRed, setSinRed] = useState(false);     // se abrió con la copia del teléfono
  const [sesion, setSesion] = useState(null);
  const [marcadas, setMarcadas] = useState(() => sobre({}, marcadasDeCola(name, rutinaId, hoyLocal())));   // "reId:serie" → { reps, peso }
  const [cargando, setCargando] = useState(() => !leerRutinaLocal(almacen, rutinaId));
  const [actualizando, setActualizando] = useState(true);
  // Lo que marca o desmarca mientras llega lo del servidor: gana sobre eso.
  const tocadas = useRef({});
  const [cerrando, setCerrando] = useState(false);
  const [cerrandoHoja, setCerrandoHoja] = useState(false);
  const [errorCierre, setErrorCierre] = useState(null);
  const [remate, setRemate] = useState(false);   // ofrecer cardio al cerrar
  const [records, setRecords] = useState(null);  // lo que batió hoy, si batió algo
  const [fin, setFin] = useState(null);           // visual nueva: la celebración al terminar
  const conteoRef = useRef({ hechos: 0, total: 0, series: 0, kilos: 0 });
  const [pendientes, setPendientes] = useState(0);
  const [nota, setNota] = useState(null);          // { titulo, rutina_id, rutina_ejercicio_id? }
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
  // Visual nueva: cuándo arrancó el entreno (la primera serie marcada), para
  // el reloj de la sesión. Se recuerda en el teléfono por si cierra y vuelve.
  const claveInicio = `mt:inicioEntreno:${rutinaId}:${fecha}`;
  const [inicio, setInicio] = useState(() => { try { return Number(localStorage.getItem(claveInicio)) || null; } catch (e) { return null; } });
  // Descanso: { segundos, fin } — `fin` es un instante absoluto, no un
  // contador que se va restando. Con un contador, minimizar la app o apagar
  // la pantalla congela el intervalo y al volver marca de menos; con un
  // instante, al volver sale el tiempo REAL que queda.
  const [descanso, setDescanso] = useState(null);
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

  // Al llegar a cero: un toque corto, si el teléfono lo permite. No suena
  // nada: mucha gente entrena con música y un pitido encima molesta.
  const yaAvisado = useRef(false);
  useEffect(() => {
    if (!descanso) { yaAvisado.current = false; return; }
    if (restante <= 0 && !yaAvisado.current) {
      yaAvisado.current = true;
      try { navigator.vibrate && navigator.vibrate([50, 90, 50]); } catch (e) {}
    }
  }, [restante, descanso]);

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

  const marcar = useCallback((re, serie, reps, peso, descansoSeg, unidad = 'kg') => {
    const clave = `${re.id}:${serie}`;
    if (!inicio && v2Activa()) {
      const t = Date.now(); setInicio(t); vibrar([16, 40, 16]);
      try { localStorage.setItem(claveInicio, String(t)); } catch (e) { /* sin almacenamiento: el reloj vive mientras esté abierta */ }
    }
    setMarcadas(m => ({ ...m, [clave]: { reps, peso, unidad } }));   // optimista: el check no espera a la red
    tocadas.current[clave] = { reps, peso, unidad };
    // El descanso lo decide quien pinta la fila: entre series de un ejercicio
    // el del ejercicio; en un circuito, el corto entre estaciones o el largo
    // al terminar la vuelta.
    const seg = Number(descansoSeg);
    if (Number.isFinite(seg) && seg > 0) setDescanso({ segundos: seg, fin: Date.now() + seg * 1000 });
    escribirSerie({
      rutina_ejercicio_id: re.id, ejercicio_id: re.ejercicio.id,
      serie_num: serie, reps, peso, unidad, completada: true,
    });
  }, [escribirSerie, inicio, claveInicio]);

  const desmarcar = useCallback((re, serie) => {
    const clave = `${re.id}:${serie}`;
    setMarcadas(m => { const n = { ...m }; delete n[clave]; return n; });
    tocadas.current[clave] = null;
    escribirSerie({
      rutina_ejercicio_id: re.id, ejercicio_id: re.ejercicio.id,
      serie_num: serie, reps: null, peso: null, completada: false,
    });
  }, [escribirSerie]);

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
        : 'No se pudo enviar. Revisa la conexión e inténtalo otra vez.');
      return;
    }
    setCerrandoHoja(false);
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
      try { localStorage.removeItem(claveInicio); } catch (e) { /* nada */ }
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
  let ahoraId = null;
  if (v2) {
    for (const tr of tramos) {
      if (tr.vueltas.length > 1) continue;
      const re = tr.vueltas[0].find(x => !Array.from({ length: Math.max(1, x.series || 1) }, (_, k) => k + 1).every(n => marcadas[`${x.id}:${n}`]));
      if (re) { ahoraId = re.id; break; }
    }
  }

  return (
    <>
      <Volver onClick={onVolver} />
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
      {totalSeries > 0 && v2 && (
        // Estilo Apple: vidrio, el avance dicho en claro y un segmento por
        // ejercicio que se va llenando; el reloj del entreno a la derecha.
        <div data-avance-rutina style={{
          position: 'sticky', top: 'calc(58px + env(safe-area-inset-top, 0px))', zIndex: 20,
          margin: '0 -4px 6px', padding: '10px 14px 11px', borderRadius: 18,
          background: 'rgba(250,250,252,0.86)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 8px 20px -10px rgba(0,0,0,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, minHeight: 24 }}>
            <span style={{ fontWeight: 700, color: TEXT, flex: 1 }}>{ejHechos}/{ejTotal} ejercicios</span>
            {inicio && hechas > 0 && <RelojSesion desde={inicio} v2 />}
          </div>
          {ejTotal <= 16 ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ejTotal}, 1fr)`, gap: 4, marginTop: 8 }}>
              {Array.from({ length: ejTotal }, (_, i) => (
                <span key={i} data-segmento={i < ejHechos ? 'hecho' : 'falta'} style={{ height: 4, borderRadius: 9, background: i < ejHechos ? '#1D1D1F' : 'rgba(118,118,128,0.18)', transition: 'background .25s ease' }} />
              ))}
            </div>
          ) : (
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(118,118,128,0.18)', overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', width: `${(ejHechos / ejTotal) * 100}%`, background: '#1D1D1F', borderRadius: 99, transition: 'width .25s ease' }} />
            </div>
          )}
        </div>
      )}

      {datos.ejercicios.length === 0 && (
        <Tarjeta><Vacio texto="Esta rutina todavía no tiene ejercicios." /></Tarjeta>
      )}

      {/* Un circuito de 3 vueltas se recorre A→B→A→B→A→B, no A tres veces y
          luego B tres veces. Por eso las vueltas se pintan como secciones:
          antes el bloque salía con UNA fila por ejercicio y no había dónde
          marcar la segunda vuelta ni la tercera. */}
      {tramos.map((tramo, ti) => (
        <React.Fragment key={tramo.clave}>
          {fases[ti] && fases[ti] !== fases[ti - 1] && (
            <SeparadorMomento fase={fases[ti]} hechos={conteo[fases[ti]]?.hechos || 0} total={conteo[fases[ti]]?.total || 0} />
          )}
          {v2 && tramo.vueltas.length > 1 ? (
            <CircuitoV2 tramo={tramo} marcadas={marcadas} onMarcar={marcar} onDesmarcar={desmarcar}
              unidadDe={unidadDe} onUnidad={cambiarUnidad}
              onNota={(re) => setNota({ titulo: re.ejercicio.nombre, rutina_id: rutinaId, rutina_ejercicio_id: re.id, sesion_id: sesion?.id })} />
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
                  onNota={() => setNota({ titulo: re.ejercicio.nombre, rutina_id: rutinaId, rutina_ejercicio_id: re.id, sesion_id: sesion?.id })}
                  ahora={re.id === ahoraId}
                  marcadas={marcadas} onMarcar={marcar} onDesmarcar={desmarcar} />
              ))}
            </React.Fragment>
          ))}
          </>)}
        </React.Fragment>
      ))}

      {descanso && (
        <BarraDescanso v2={v2}
          segundos={descanso.segundos}
          restante={restante}
          onSaltar={() => setDescanso(null)}
          onMas={() => setDescanso(d => d && { ...d, segundos: d.segundos + 15, fin: d.fin + 15000 })}
        />
      )}

      {datos.ejercicios.length > 0 && v2 && (
        // Visual nueva (estilo Apple): cápsula grafito que se ve siempre; antes
        // de la primera serie, con contorno, y rellena en cuanto se entrena.
        <button data-terminar
          onClick={() => { setDescanso(null); setErrorCierre(null); setCerrandoHoja(true); }}
          style={{
            width: '100%', marginTop: 14, height: 54, borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: 0, boxShadow: hechas > 0 ? '0 10px 24px -10px rgba(0,0,0,0.45)' : 'inset 0 0 0 1.5px #1D1D1F',
            background: hechas > 0 ? '#1D1D1F' : '#FFFFFF',
            color: hechas > 0 ? '#fff' : '#1D1D1F',
            fontSize: 16, fontWeight: 750,
          }}>
          <CheckCircle size={20} weight="bold" />
          Terminar entrenamiento
        </button>
      )}
      {datos.ejercicios.length > 0 && !v2 && (
        <button
          onClick={() => { setDescanso(null); setErrorCierre(null); setCerrandoHoja(true); }}
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
          onCancelar={() => { if (!cerrando) setCerrandoHoja(false); }}
          onCerrar={(rpe, nota) => cerrar('completada', rpe, nota)}
          onSaltar={(nota) => cerrar('saltada', null, nota)}
        />
      )}

      <HojaNota abierta={!!nota} nombre={name} contexto={nota} alCerrar={() => setNota(null)} />

      {records && <HojaRecords records={records} alCerrar={() => { setRecords(null); if (v2) onVolver(); else setRemate(true); }} />}
      {fin && <HojaFin fin={fin} alCerrar={() => { setFin(null); onVolver(); }} />}

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
const CSS_FIN = `
@keyframes fin-fondo { from { opacity: 0 } to { opacity: 1 } }
@keyframes fin-sube { from { opacity: 0; transform: translateY(24px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes fin-salta { 0% { transform: translateY(14px) scale(.9); opacity: 0 } 60% { transform: translateY(-4px) scale(1.02); opacity: 1 } 100% { transform: none } }
[data-fin-entreno] { animation: fin-fondo .25s ease both }
[data-fin-entreno] .fin-tarjeta { animation: fin-sube .45s cubic-bezier(.2,.8,.2,1) both }
[data-fin-entreno] .fin-dibujo { animation: fin-salta .7s .12s cubic-bezier(.2,.8,.2,1) both }
@keyframes fin-llena { from { transform: scaleX(0) } to { transform: scaleX(1) } }
[data-fin-entreno] .fin-llena { transform-origin: left center; animation: fin-llena 1.1s .25s cubic-bezier(.22,.8,.24,1) both }
@media (prefers-reduced-motion: reduce) { [data-fin-entreno], [data-fin-entreno] * { animation: none !important } }`;

function HojaFin({ fin, alCerrar }) {
  const A = SECCION.entreno;
  useEffect(() => { asegurarCSS(); vibrar([20, 50, 20, 50, 40]); }, []);
  const marca = (r) => r.peso ? `${r.peso} ${r.unidad || 'kg'} × ${r.reps}` : `${r.reps} reps`;
  const frase = vozFinEntreno({ hoy: hoyLocal(), hechos: fin.hechos, total: fin.total, records: fin.records.length });
  return (
    <div data-fin-entreno onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(31,31,28,0.42)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <style>{CSS_FIN}</style>
      <Confeti y="34%" piezas={36} />
      <div className="fin-tarjeta" onClick={e => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: 28, maxWidth: 380, width: '100%', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)', maxHeight: '88vh', overflowY: 'auto',
      }}>
        <div style={{ position: 'relative', height: 150, background: `radial-gradient(70% 90% at 70% 10%, #B9BEC6 0%, rgba(185,190,198,0) 70%), radial-gradient(60% 80% at 10% 90%, #F4DC93 0%, rgba(244,220,147,0) 70%), #EEEFF1`, display: 'grid', placeItems: 'end center' }}>
          <div className="fin-dibujo" style={{ width: 210, height: 130, marginBottom: 6, marginRight: 40 }}><IlustracionPesas /></div>
        </div>
        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: TEXT, letterSpacing: '-0.03em', lineHeight: 1.08 }}>Entreno hecho.</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#C9A43E', letterSpacing: '-0.01em', lineHeight: 1.3, marginTop: 4 }}>{frase}</div>
          {/* Lo que hizo, subiendo desde cero; y la barra que se llena hasta
              donde llegó. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 8, marginTop: 16 }}>
            <div style={datoFin}><b style={datoFinNum}><Conteo valor={fin.hechos} ms={900} /><span style={{ color: TEXT_LIGHT, fontWeight: 600 }}>/{fin.total}</span></b><span style={datoFinPie}>ejercicios</span></div>
            <div style={datoFin}><b style={datoFinNum}><Conteo valor={fin.series} ms={900} /></b><span style={datoFinPie}>series</span></div>
            {fin.minutos != null && <div style={datoFin}><b style={datoFinNum}><Conteo valor={fin.minutos} ms={900} /></b><span style={datoFinPie}>{fin.minutos === 1 ? 'minuto' : 'minutos'}</span></div>}
            {fin.kilos > 0 && <div style={datoFin}><b style={datoFinNum}><Conteo valor={fin.kilos} ms={1100} /></b><span style={datoFinPie}>kg movidos</span></div>}
            {fin.records.length > 0 && <div className="mt-pop" style={{ ...datoFin, background: A.tint, animationDelay: '.9s' }}><b style={{ ...datoFinNum, color: A.ink }}>{fin.records.length}</b><span style={datoFinPie}>{fin.records.length === 1 ? 'récord' : 'récords'}</span></div>}
          </div>
          <div data-fin-barra style={{ height: 8, borderRadius: 99, background: '#EEEAE1', marginTop: 12, overflow: 'hidden' }}>
            <div className="fin-llena" style={{ height: '100%', width: `${fin.total ? Math.round((fin.hechos / fin.total) * 100) : 0}%`, borderRadius: 99, background: `linear-gradient(90deg, #A9AFB8, ${A.base})` }} />
          </div>
          {fin.records.length > 0 && (
            <div data-records style={{ marginTop: 14 }}>
              {fin.records.map(r => (
                <div key={r.ejercicio_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #EFEBE3' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 99, background: A.tint, color: A.ink, display: 'grid', placeItems: 'center', flex: 'none' }}><TrophyV2 size={17} weight="fill" /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT, lineHeight: 1.25 }}>{r.nombre}</div>
                    <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 1 }}>
                      <b style={{ color: A.ink }}>{marca(r)}</b>
                      {r.antes ? `  · antes ${marca(r.antes)}` : r.primera_vez ? '  · primera vez' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={alCerrar} style={{
            width: '100%', marginTop: 18, padding: '14px 18px', borderRadius: 14, border: 0,
            background: TEXT, color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Seguir</button>
        </div>
      </div>
    </div>
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
    }}><Timer size={13} strokeWidth={2.4} />{h ? `${h}:${String(m).padStart(2, '0')}` : m}:{ss}</span>
  );
}

const datoFin = { flex: 1, background: '#F4F1EB', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 };
const datoFinNum = { fontSize: 20, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.1 };
const datoFinPie = { fontSize: 12, color: TEXT_MUTED, fontWeight: 600 };

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
          // Fuera de un circuito: el descanso del ejercicio entre series, y
          // ninguno tras la última (ahí ya se pasa al siguiente ejercicio).
          descansoSeg={descansoCircuito !== undefined
            ? descansoCircuito
            : (n < (re.series || 1) ? re.descanso_seg : null)}
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
function HojaCierre({ hechas, total, onCerrar, onSaltar, onCancelar, guardando, error }) {
  const [rpe, setRpe] = useState(null);
  const [nota, setNota] = useState('');

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

        <div style={{ fontSize: 19, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>
          {hechas > 0 ? 'Terminaste' : 'Aún no marcas ninguna serie'}
        </div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 3 }}>
          {hechas > 0
            ? `${Math.min(hechas, total)} de ${total} series marcadas${hechas < total ? '. No pasa nada si no completaste todo.' : ''}`
            : 'Si hoy no pudiste entrenar, díselo a tu coach. Cuenta como día saltado, no como entreno.'}
        </div>

        {hechas > 0 && <>
        <div style={{
          fontSize: 11.5,
          fontWeight: 800, color: TEXT_LIGHT, margin: '20px 0 9px',
        }}>¿Qué tan duro se sintió?</div>

        {/* Del 1 al 10, en una fila. Números grandes y separados: se toca con
            el pulgar, de pie, con el teléfono en una mano. */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
            const activo = rpe === n;
            return (
              <button key={n} onClick={() => setRpe(activo ? null : n)}
                aria-label={`Percepción ${n}`}
                style={{
                  flex: 1, minWidth: 0, height: 44, borderRadius: 11, cursor: 'pointer',
                  border: activo ? 0 : `1px solid ${BORDER}`,
                  background: activo ? ACCENT_DARK : 'transparent',
                  color: activo ? '#fff' : TEXT_MUTED,
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit', padding: 0,
                }}>{n}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: TEXT_LIGHT }}>suave</span>
          <span style={{ fontSize: 11, color: TEXT_LIGHT }}>al límite</span>
        </div>
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

        {hechas > 0 && (
          <button
            onClick={() => onCerrar(rpe, nota)} disabled={guardando}
            style={{
              width: '100%', marginTop: 14, padding: '15px 18px', borderRadius: 15, border: 0,
              background: ACCENT_DARK, color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: guardando ? 'default' : 'pointer', opacity: guardando ? 0.7 : 1,
              fontFamily: 'inherit',
            }}>{guardando ? 'Guardando…' : 'Enviar a mi coach'}</button>
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
function BarraDescanso({ segundos, restante, onSaltar, onMas, v2 = false }) {
  const listo = restante <= 0;
  const mm = Math.floor(Math.max(0, restante) / 60);
  const ss = String(Math.max(0, restante) % 60).padStart(2, '0');
  const pct = segundos > 0 ? Math.max(0, Math.min(100, (restante / segundos) * 100)) : 0;
  if (v2) {
    // Estilo Apple: cápsula grafito con el anillo amarillo que se vacía.
    const r = 11, c = 2 * Math.PI * r;
    return (
      <div data-descanso={listo ? 'listo' : 'contando'} style={{
        position: 'fixed', left: 12, right: 12, bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', zIndex: 3,
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
