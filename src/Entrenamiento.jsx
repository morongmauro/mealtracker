import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dumbbell, Calendar, ChevronLeft, Check, Play, Loader2, Info, Timer } from 'lucide-react';
import {
  SURFACE, SURFACE_2, BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT,
  ACCENT, ACCENT_DARK, ACCENT_PASTEL, SUCCESS, SHADOW_CARD, FONT_DISPLAY,
} from './theme.js';

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
const DIAS_LARGO = { L: 'Lunes', M: 'Martes', X: 'Miércoles', J: 'Jueves', V: 'Viernes', S: 'Sábado', D: 'Domingo' };

const api = async (body) => {
  const r = await fetch('/api/training', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) return { ok: false };
  return r.json();
};

export default function Entrenamiento({ name }) {
  const [plan, setPlan] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [rutinaId, setRutinaId] = useState(null);

  const cargarPlan = useCallback(async () => {
    setCargando(true);
    const r = await api({ accion: 'plan', name });
    setPlan(r && r.ok ? r : { ok: false });
    setCargando(false);
  }, [name]);

  useEffect(() => { cargarPlan(); }, [cargarPlan]);

  const Envoltorio = ({ children }) => (
    <div style={{
      position: 'relative', maxWidth: 560, margin: '0 auto', padding: '0 20px',
      paddingTop: `calc(${FADE_TOP}px + env(safe-area-inset-top, 0px) + 12px)`,
      paddingBottom: `calc(${FADE_BOTTOM}px + env(safe-area-inset-bottom, 0px))`,
    }}>{children}</div>
  );

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

  if (!plan || !plan.ok) {
    return (
      <Envoltorio>
        <Tarjeta>
          <Fila icono={<Info size={18} color={TEXT_LIGHT} />} titulo="Todavía no hay nada aquí" />
          <Vacio texto="Cuando tu coach cargue tu primera fase de entrenamiento, aquí aparece tu semana." />
        </Tarjeta>
      </Envoltorio>
    );
  }

  return (
    <Envoltorio>
      <VistaSemana plan={plan} onAbrir={setRutinaId} />
    </Envoltorio>
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
            }}>{hoy.hecha ? 'Hoy · ya entrenaste' : hoy.en_curso ? 'Hoy · a medias' : 'Hoy te toca'}</div>
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
        </div>
      </div>
    </>
  );
  if (d.descanso) return <div style={{ ...filaBase(d.es_hoy), cursor: 'default' }}>{contenido}</div>;
  return <button onClick={() => onAbrir(d.rutina.id)} style={filaBase(d.es_hoy)}>{contenido}</button>;
}

// ── UNA RUTINA, Y SU EJECUCIÓN ────────────────────────────────────────────
function VistaRutina({ name, rutinaId, onVolver }) {
  const [datos, setDatos] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [marcadas, setMarcadas] = useState({});   // "reId:serie" → { reps, peso }
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [cerrandoHoja, setCerrandoHoja] = useState(false);
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

  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await api({ accion: 'rutina', name, id: rutinaId });
      if (!vivo) return;
      setDatos(r && r.ok ? r.rutina : null);
      // Abrir la sesión de una vez: si ya había una a medias, retoma esa y
      // trae lo que ya estaba marcado.
      const s = await api({ accion: 'abrir', name, rutina_id: rutinaId });
      if (!vivo) return;
      if (s && s.ok) {
        setSesion(s.sesion);
        const m = {};
        (s.series || []).forEach(x => {
          if (x.rutina_ejercicio_id) m[`${x.rutina_ejercicio_id}:${x.serie_num}`] = { reps: x.reps, peso: x.peso };
        });
        setMarcadas(m);
      }
      setCargando(false);
    })();
    return () => { vivo = false; };
  }, [name, rutinaId]);

  const marcar = useCallback(async (re, serie, reps, peso) => {
    const clave = `${re.id}:${serie}`;
    setMarcadas(m => ({ ...m, [clave]: { reps, peso } }));   // optimista: el check no espera a la red
    // Arranca el descanso que el coach prescribió para ESE ejercicio. En la
    // última serie no: ahí ya se pasa al siguiente ejercicio, y una cuenta
    // atrás que nadie va a esperar solo estorba.
    const seg = Number(re.descanso_seg);
    if (Number.isFinite(seg) && seg > 0 && serie < (re.series || 1)) {
      setDescanso({ segundos: seg, fin: Date.now() + seg * 1000 });
    }
    if (!sesion) return;
    await api({
      accion: 'serie', name, sesion_id: sesion.id,
      rutina_ejercicio_id: re.id, ejercicio_id: re.ejercicio.id,
      serie_num: serie, reps, peso,
    });
  }, [name, sesion]);

  const desmarcar = useCallback(async (re, serie) => {
    const clave = `${re.id}:${serie}`;
    setMarcadas(m => { const n = { ...m }; delete n[clave]; return n; });
    if (!sesion) return;
    await api({
      accion: 'serie', name, sesion_id: sesion.id,
      rutina_ejercicio_id: re.id, ejercicio_id: re.ejercicio.id,
      serie_num: serie, reps: null, peso: null, completada: false,
    });
  }, [name, sesion]);

  if (cargando) return <Centrado><Loader2 size={20} className="animate-spin" color={TEXT_LIGHT} /></Centrado>;
  if (!datos) {
    return (
      <>
        <Volver onClick={onVolver} />
        <Tarjeta><Vacio texto="No pude abrir esta rutina." /></Tarjeta>
      </>
    );
  }

  const totalSeries = datos.ejercicios.reduce((s, e) => s + (e.series || 0), 0);
  const hechas = Object.keys(marcadas).length;
  const bloqueDe = {};
  (datos.bloques || []).forEach(b => { bloqueDe[b.id] = b; });

  return (
    <>
      <Volver onClick={onVolver} />

      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 26, letterSpacing: '0.03em',
          textTransform: 'uppercase', lineHeight: 1, color: TEXT,
        }}>{datos.nombre}</div>
        {datos.descripcion && (
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 7, lineHeight: 1.5 }}>{datos.descripcion}</div>
        )}
        {totalSeries > 0 && (
          <div style={{ marginTop: 11 }}>
            <div style={{ height: 5, borderRadius: 99, background: SURFACE_2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(100, (hechas / totalSeries) * 100)}%`,
                background: ACCENT, transition: 'width .25s ease',
              }} />
            </div>
            <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 5 }}>
              {hechas} de {totalSeries} series
            </div>
          </div>
        )}
      </div>

      {datos.ejercicios.length === 0 && (
        <Tarjeta><Vacio texto="Esta rutina todavía no tiene ejercicios." /></Tarjeta>
      )}

      {datos.ejercicios.map((re, i) => {
        const b = re.bloque_id ? bloqueDe[re.bloque_id] : null;
        const anterior = i > 0 ? datos.ejercicios[i - 1] : null;
        const abreBloque = b && (!anterior || anterior.bloque_id !== re.bloque_id);
        return (
          <React.Fragment key={re.id}>
            {abreBloque && <CabeceraBloque b={b} />}
            <Ejercicio re={re} marcadas={marcadas} onMarcar={marcar} onDesmarcar={desmarcar} />
          </React.Fragment>
        );
      })}

      {descanso && (
        <BarraDescanso
          segundos={descanso.segundos}
          restante={restante}
          onSaltar={() => setDescanso(null)}
          onMas={() => setDescanso(d => d && { ...d, segundos: d.segundos + 15, fin: d.fin + 15000 })}
        />
      )}

      {datos.ejercicios.length > 0 && sesion && (
        <button
          onClick={() => { setDescanso(null); setCerrandoHoja(true); }}
          style={{
            width: '100%', marginTop: 6, padding: '15px 18px', borderRadius: 16, border: 0,
            background: hechas > 0 ? ACCENT_DARK : SURFACE_2,
            color: hechas > 0 ? '#fff' : TEXT_MUTED,
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          Terminar entrenamiento
        </button>
      )}

      {cerrandoHoja && (
        <HojaCierre
          hechas={hechas} total={totalSeries} guardando={cerrando}
          onCancelar={() => { if (!cerrando) setCerrandoHoja(false); }}
          onCerrar={async (rpe, nota) => {
            if (cerrando) return;
            setCerrando(true);
            await api({ accion: 'cerrar', name, sesion_id: sesion.id, rpe, notas: nota });
            onVolver();
          }}
        />
      )}
    </>
  );
}

function CabeceraBloque({ b }) {
  const nombreTipo = {
    superserie: 'Superserie', circuito: 'Circuito', emom: 'EMOM', amrap: 'AMRAP', normal: '',
  }[b.tipo] || '';
  if (!nombreTipo && !b.nombre) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, margin: '16px 2px 8px',
      fontSize: 11.5, fontWeight: 700, color: ACCENT_DARK,
    }}>
      {b.nombre ? b.nombre + (nombreTipo ? ' · ' : '') : ''}{nombreTipo}
      {b.vueltas ? ` · ${b.vueltas} vueltas` : ''}
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

function Ejercicio({ re, marcadas, onMarcar, onDesmarcar }) {
  const e = re.ejercicio;
  const [abierto, setAbierto] = useState(false);
  const series = Array.from({ length: Math.max(1, re.series || 1) }, (_, i) => i + 1);
  const ultima = re.ultima_vez;
  // El peso sugerido es el de la última vez: es lo que hace que marcar una
  // serie sea un toque y no teclear cada número otra vez.
  const pesoSugerido = ultima && ultima.mejor_peso ? String(ultima.mejor_peso) : '';

  return (
    <div style={{
      background: SURFACE, borderRadius: 16, padding: 15, marginBottom: 12, boxShadow: SHADOW_CARD,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>{e.nombre}</div>
          <div style={{ fontSize: 12.5, color: ACCENT_DARK, fontWeight: 600, marginTop: 3 }}>
            {re.series} × {re.reps}
            {re.peso_objetivo ? ` · ${re.peso_objetivo}` : ''}
            {re.rir != null ? ` · RIR ${re.rir}` : ''}
          </div>
          <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 2 }}>
            {re.tempo ? `Tempo ${re.tempo} · ` : ''}
            {re.descanso_seg ? `Descanso ${re.descanso_seg}s` : ''}
          </div>
        </div>
        {(e.descripcion || (e.claves_tecnicas || []).length || e.video_ref || e.video_url) && (
          <button onClick={() => setAbierto(v => !v)} aria-label="Cómo se hace" style={{
            flexShrink: 0, width: 32, height: 32, borderRadius: 10, border: `1px solid ${BORDER}`,
            background: abierto ? SURFACE_2 : 'transparent', cursor: 'pointer',
            display: 'grid', placeContent: 'center', color: TEXT_MUTED,
          }}><Info size={15} /></button>
        )}
      </div>

      {/* LO QUE LEVANTÓ LA ÚLTIMA VEZ. Va aquí arriba, pegado, no en un
          historial aparte: es lo que se mira antes de cargar la barra. */}
      {ultima && ultima.series.length > 0 && (
        <div style={{
          marginTop: 10, padding: '8px 11px', borderRadius: 10, background: SURFACE_2,
          fontSize: 11.5, color: TEXT_MUTED, lineHeight: 1.5,
        }}>
          <strong style={{ color: TEXT }}>La última vez</strong>{' '}
          ({fechaCorta(ultima.fecha)}):{' '}
          {ultima.series.map(s => `${s.reps ?? '—'}×${s.peso ?? '—'}${s.unidad || 'kg'}`).join(' · ')}
        </div>
      )}

      {abierto && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER_SOFT}` }}>
          {e.descripcion && (
            <p style={{ fontSize: 12.5, color: TEXT_MUTED, lineHeight: 1.55, margin: '0 0 8px' }}>{e.descripcion}</p>
          )}
          {(e.claves_tecnicas || []).length > 0 && (
            <ul style={{ margin: '0 0 8px', paddingLeft: 16, fontSize: 12.5, color: TEXT_MUTED, lineHeight: 1.6 }}>
              {e.claves_tecnicas.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
          {e.video_fuente === 'youtube' && e.video_ref && (
            <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <iframe
                title={e.nombre}
                src={`https://www.youtube-nocookie.com/embed/${e.video_ref}${e.video_inicio_seg ? `?start=${e.video_inicio_seg}` : ''}`}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          )}
        </div>
      )}

      {re.notas && (
        <div style={{
          marginTop: 10, padding: '8px 11px', borderRadius: 10,
          background: '#FFF8E6', fontSize: 12, color: '#6B4E05', lineHeight: 1.5,
        }}>{re.notas}</div>
      )}

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {series.map(n => (
          <SerieFila
            key={n} n={n} re={re}
            marcada={marcadas[`${re.id}:${n}`]}
            pesoSugerido={pesoSugerido}
            repsSugeridas={String(re.reps || '').match(/^\d+/) ? String(re.reps).match(/^\d+/)[0] : ''}
            onMarcar={onMarcar} onDesmarcar={onDesmarcar}
          />
        ))}
      </div>
    </div>
  );
}

function SerieFila({ n, re, marcada, pesoSugerido, repsSugeridas, onMarcar, onDesmarcar }) {
  const [reps, setReps] = useState(marcada?.reps != null ? String(marcada.reps) : repsSugeridas);
  const [peso, setPeso] = useState(marcada?.peso != null ? String(marcada.peso) : pesoSugerido);
  const hecha = !!marcada;

  useEffect(() => {
    if (marcada) {
      setReps(marcada.reps != null ? String(marcada.reps) : '');
      setPeso(marcada.peso != null ? String(marcada.peso) : '');
    }
  }, [marcada]);

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
      background: hecha ? ACCENT_PASTEL + '55' : 'transparent',
      borderRadius: 11, padding: hecha ? '2px 4px' : 0,
    }}>
      <div style={{
        width: 24, flexShrink: 0, textAlign: 'center',
        fontSize: 12, fontWeight: 800, color: hecha ? ACCENT_DARK : TEXT_LIGHT,
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <input inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)}
          placeholder="reps" aria-label={`Repeticiones serie ${n}`} style={campo} disabled={hecha} />
      </div>
      <div style={{ fontSize: 12, color: TEXT_LIGHT, flexShrink: 0 }}>×</div>
      <div style={{ flex: 1 }}>
        <input inputMode="decimal" value={peso} onChange={e => setPeso(e.target.value)}
          placeholder="kg" aria-label={`Peso serie ${n}`} style={campo} disabled={hecha} />
      </div>
      <button
        onClick={() => hecha
          ? onDesmarcar(re, n)
          : onMarcar(re, n, reps === '' ? null : Number(reps), peso === '' ? null : Number(peso))}
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
function HojaCierre({ hechas, total, onCerrar, onCancelar, guardando }) {
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
          Terminaste
        </div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 3 }}>
          {hechas} de {total} series marcadas
        </div>

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

        <textarea
          value={nota} onChange={e => setNota(e.target.value)} rows={2}
          placeholder="¿Algo que deba saber tu coach? (opcional)"
          style={{
            width: '100%', marginTop: 16, padding: '11px 12px', borderRadius: 12,
            border: `1px solid ${BORDER}`, background: SURFACE_2,
            fontSize: 14, color: TEXT, fontFamily: 'inherit', resize: 'none', outline: 'none',
          }} />

        <button
          onClick={() => onCerrar(rpe, nota)} disabled={guardando}
          style={{
            width: '100%', marginTop: 14, padding: '15px 18px', borderRadius: 15, border: 0,
            background: ACCENT_DARK, color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: guardando ? 'default' : 'pointer', opacity: guardando ? 0.7 : 1,
            fontFamily: 'inherit',
          }}>{guardando ? 'Guardando…' : 'Enviar a mi coach'}</button>

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
function BarraDescanso({ segundos, restante, onSaltar, onMas }) {
  const listo = restante <= 0;
  const mm = Math.floor(Math.max(0, restante) / 60);
  const ss = String(Math.max(0, restante) % 60).padStart(2, '0');
  const pct = segundos > 0 ? Math.max(0, Math.min(100, (restante / segundos) * 100)) : 0;

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
const btnDescanso = {
  flexShrink: 0, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.10)',
  color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
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
