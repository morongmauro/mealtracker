// ─────────────────────────────────────────────────────────────────────────
// APRENDIZAJE · «Acerca del programa» (visual nueva)
//
// Reemplaza al «Onboarding» del centro. El onboarding de verdad es lo que el
// coach le explica al cliente más el recorrido guiado de la app; esto es la
// referencia del MÉTODO, para leer y volver: la idea, los cuatro pilares, las
// seis fases del trayecto, las preguntas frecuentes y las aclaraciones.
// Habla de UNA sola app (ya no «la de entrenamiento» y «la de comida»).
//
// Lo que lee cuenta en su avance (y el coach lo ve en el CRM): al pasar por
// los pilares, el trayecto y las preguntas se marca en el centro con las
// mismas claves que usaba el onboarding (programa, journey, faq).
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Barbell, ForkKnife, ChartLineUp, ChatsCircle, CaretDown, Compass, ArrowRight, Info } from '@phosphor-icons/react';
import CabeceraHoy from './CabeceraHoy.jsx';
import { registrarLectura } from './aprendizaje.js';
import { TEXT, TEXT_MUTED, TEXT_LIGHT, SECCION } from './theme.js';

const N = SECCION.aprende;
const CREMA = '#F4F1EB';
const SOMBRA = '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)';

const PILARES = [
  { icono: Barbell, color: SECCION.entreno, titulo: 'Entrenamiento', frase: 'Progresar sin comprometer la recuperación.',
    texto: 'Empezamos con la intensidad adecuada y ajustamos el estímulo según tu desempeño. Entrenas de 3 a 6 días por semana, en sesiones de 45 a 90 minutos. Los primeros días construyen la base: asimilar pesos, mejorar la técnica y preparar el cuerpo.',
    esencia: ['3 a 6 días por semana · 45–90 min', 'Bloques de movilidad, fuerza, core y cardio', 'El estímulo se ajusta según tu desempeño'] },
  { icono: ForkKnife, color: SECCION.comida, titulo: 'Alimentación', frase: 'No es restricción. Es gestión.',
    texto: 'No sigues menús rígidos: aprendes a tomar decisiones alineadas con tu objetivo. Tienes una meta nutricional diaria y, en la app, el registro de lo que comes, recetas que encajan en tu meta y la guía de alimentación.',
    esencia: ['Una meta diaria, no un menú', 'Consistencia antes que perfección', 'Registro, recetas y guía en la app'] },
  { icono: ChartLineUp, color: SECCION.dash, titulo: 'Seguimiento', frase: 'Decidir con datos, no con percepción.',
    texto: 'Lo que entrenas y lo que comes queda registrado, y esos datos los usamos los dos: tú para ver tu avance real y yo para ajustar tu proceso con criterio, no a ciegas.',
    esencia: ['Entreno: pesos, repeticiones y esfuerzo', 'Comida: lo que comes frente a tu meta', 'Cada mes: peso, % de grasa y fotos (la app te avisa)'] },
  { icono: ChatsCircle, color: SECCION.aprende, titulo: 'Tu entorno', frase: 'Todo en un solo lugar.',
    texto: 'En la app tienes tu entrenamiento, tu alimentación, tu aprendizaje y tu Dash con tu avance. Y desde el Dash me escribes por WhatsApp cuando tengas una duda o necesites un ajuste.',
    esencia: ['Entrenamiento: rutinas, videos y calendario', 'Alimentación: registro, recetas y tu meta', 'Aprendizaje y Dash: lo que lees y cómo vas'] },
];

const FASES = [
  { n: '00', nombre: 'Inicio', titulo: 'Diagnóstico y claridad', idea: 'Entendemos tu contexto y definimos objetivos.',
    haces: 'Participas en la entrevista inicial y compartes tu contexto: trabajo, horarios, hábitos y lo que quieres lograr. Alineamos expectativas y definimos objetivos según tu realidad.',
    resultado: 'Sabes dónde estás y hacia dónde vas.' },
  { n: '01', nombre: 'Arranque', titulo: 'Activación', idea: 'Entras a la app y entiendes cómo está organizado todo.',
    haces: 'Recibes tu acceso, entras a la app y haces el recorrido guiado. Lees «Sobre el programa» para entender cómo funciona tu proceso.',
    resultado: 'Claridad para empezar. No improvisas.' },
  { n: '02', nombre: 'Comprensión', titulo: 'Aprendizaje', idea: 'Comprendes la lógica del método.',
    haces: 'Registras tu punto de partida (fotos y composición corporal). Revisas la estructura de tus rutinas y los videos de cada ejercicio para entender postura y ejecución. Conoces tu meta del día, el registro de comidas y las recetas.',
    resultado: 'Mejor ejecución, menos errores y más conexión con tu proceso.' },
  { n: '03', nombre: 'Aplicación', titulo: 'Ejecución y estructura', idea: 'Aplicas el método en tu entrenamiento, tu alimentación y tus hábitos.',
    haces: 'Inicias el ciclo y registras pesos y repeticiones en cada sesión. Te concentras en postura, ejecución, fuerza y rango de movilidad. Registras lo que comes frente a tu meta, mejoras hábitos y respetas los descansos.',
    resultado: 'Empiezas a notar las primeras mejoras.' },
  { n: '04', nombre: 'Autonomía', titulo: 'Desarrollo de criterio', idea: 'Interpretas tus datos y decides con criterio.',
    haces: 'Me envías videos de tu ejecución para revisión técnica. Participas en los seguimientos con información útil. Actualizas composición corporal y fotos cada mes. Gestionas tu alimentación de forma activa.',
    resultado: 'Mejoras reales: más fuerza, resistencia y movilidad, y cambios en tu composición corporal.' },
  { n: '05', nombre: 'Maestría', titulo: 'Dominio del método', idea: 'El método se vuelve parte natural de tu vida.',
    haces: 'Ajustas entrenamiento y alimentación según trabajo, viajes y eventos, y mantienes la estructura en el día a día.',
    resultado: 'Sabes entrenar, alimentarte y adaptarte a tu realidad sin perder el rumbo.' },
];

const PREGUNTAS = [
  ['Proceso', '¿Qué resultados puedo esperar y en qué orden?', 'Primero mejoras en cómo te mueves y controlas tu cuerpo; después, en rendimiento y consistencia. Los cambios físicos llegan cuando el proceso se sostiene en el tiempo.'],
  ['Proceso', '¿Por qué no cambiamos la rutina todas las semanas?', 'Porque el cuerpo necesita repetir el estímulo para adaptarse y progresar. Es un principio fisiológico.'],
  ['Proceso', '¿Qué es un objetivo bien planteado en este programa?', 'No es solo cambiar tu físico: es mejorar tu composición corporal mientras desarrollas fuerza, movilidad, resistencia, agilidad y control. Si mejora cómo funciona tu cuerpo, el resultado se sostiene.'],
  ['Entrenamiento', '¿Cómo sé si estoy usando bien los videos?', 'Si puedes replicar la posición, el rango y el ritmo del ejercicio sin improvisar. El video no es una referencia: es la instrucción de ejecución.'],
  ['Entrenamiento', '¿Y si un ejercicio no me activa como debería?', 'Antes de cambiarlo, revisemos cómo lo estás haciendo. En la mayoría de casos no es el ejercicio, es la ejecución.'],
  ['Entrenamiento', '¿Qué significa «hacer bien una sesión»?', 'Completarla respetando el orden, la intención y la calidad de cada ejercicio. No es terminar rápido ni sudar más: es ejecutar como está planteado.'],
  ['Entrenamiento', '¿Cuándo subo el peso o la dificultad?', 'Cuando completas las series con control en todas las repeticiones. Si la postura o el control se comprometen, todavía no es el momento.'],
  ['Entrenamiento', '¿Por qué registrar cada sesión?', 'Porque el programa se ajusta con datos, no con percepción. Sin registro no hay criterio para progresar.'],
  ['Alimentación', '¿Qué es cumplir mi meta nutricional del día?', 'No es comer perfecto: es acercarte lo suficiente a tu objetivo para sostener el proceso. La precisión absoluta no hace falta; la consistencia sí.'],
  ['Alimentación', '¿Cómo uso las recetas sin depender de ellas?', 'Como guía, no como obligación. La idea es que aprendas a repetir estructuras, no a seguir platos exactos.'],
  ['Alimentación', 'Como saludable y no veo resultados. ¿Por qué?', 'Porque el progreso lo define el balance de energía: lo que comes frente a lo que gastas. Puedes elegir alimentos saludables en cantidades que no corresponden a tu objetivo. No es solo qué comes: es cuánto y con qué intención.'],
  ['Alimentación', '¿Y si no puedo cumplir la semana completa?', 'Mantienes las sesiones clave y lo mínimo para no romper la continuidad. El plan se adapta, pero no se abandona.'],
  ['Proceso', '¿Qué define que alguien aproveche el programa?', 'Que deje de improvisar. Quien ejecuta la estructura como está planteada, progresa.'],
];

const ACLARACIONES = [
  'Cualquier molestia, lesión o cambio en tu salud: avísame de inmediato.',
  'El programa es una suscripción mensual desde tu fecha de inicio.',
  'Si decides retirarte, avísame antes de tu fecha de corte para que no se cobre el mes siguiente.',
  'Puedes pausar por viaje o por una condición médica.',
  'El acceso a la app y al contenido es personal e intransferible.',
];

const INDICE = [['metodo', 'El método'], ['pilares', 'Pilares'], ['trayecto', 'Tu trayecto'], ['preguntas', 'Preguntas'], ['recorrido', 'La app'], ['aclaraciones', 'Aclaraciones']];
// De la pieza que pide el resto de la app (hub:programa…) a su parte aquí.
const PARTE_DE = { programa: 'pilares', journey: 'trayecto', faq: 'preguntas', recorrido: 'recorrido' };

export default function AcercaPrograma({ nombre, parte, alRecorrido, arriba }) {
  const raiz = useRef(null);
  const [fase, setFase] = useState(null);
  const [filtro, setFiltro] = useState('Todas');
  const [abierta, setAbierta] = useState(null);

  // Ir a la parte pedida (desde «Hoy» de Aprendizaje o desde el Dash).
  useEffect(() => {
    const id = PARTE_DE[parte] || parte;
    if (!id) return;
    const t = setTimeout(() => {
      const el = raiz.current && raiz.current.querySelector(`[data-parte="${id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, [parte]);

  // Lo que pasa por la pantalla cuenta como leído.
  useEffect(() => {
    if (!raiz.current || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((ents) => ents.forEach(e => {
      if (!e.isIntersecting) return;
      const k = e.target.getAttribute('data-lectura');
      registrarLectura(nombre, 'hub', k, { programa: 'Cómo funciona el programa', journey: 'Tu trayecto', faq: 'Preguntas frecuentes' }[k]);
      obs.unobserve(e.target);
    }), { threshold: 0.25 });
    raiz.current.querySelectorAll('[data-lectura]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [nombre]);

  const ir = (id) => {
    const el = raiz.current && raiz.current.querySelector(`[data-parte="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const preguntas = PREGUNTAS.filter(p => filtro === 'Todas' || p[0] === filtro);

  return (
    <div ref={raiz} data-acerca-programa style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px', paddingTop: arriba, paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Sin curva, como Videos: la cabecera curva es de Lecturas. */}
      <CabeceraHoy tema="aprende" fondo={false} voz={{
        etiqueta: 'SOBRE EL PROGRAMA', a: 'Tu progreso,', b: 'con método.',
        sub: 'Cómo funciona tu proceso: qué hacemos, en qué orden y qué te toca a ti.',
      }} />

      {/* Índice: saltar a cada parte */}
      <div data-indice style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -20px 6px', padding: '2px 20px 8px', scrollbarWidth: 'none' }}>
        {INDICE.map(([id, t]) => (
          <button key={id} onClick={() => ir(id)} style={{
            flex: 'none', border: 0, borderRadius: 99, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit',
            background: '#FFFFFF', color: TEXT, fontSize: 14, fontWeight: 650, boxShadow: SOMBRA,
          }}>{t}</button>
        ))}
      </div>

      {/* 1 · La idea */}
      <section data-parte="metodo" style={{ ...bloque, marginTop: 18, scrollMarginTop: 80 }}>
        <div style={{ background: '#1F1F1F', color: '#fff', borderRadius: 22, padding: '20px 20px 22px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em', color: '#F6B27D' }}>EL MÉTODO EN UNA IDEA</div>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, marginTop: 8 }}>Se acabó la improvisación.</div>
          <p style={{ fontSize: 15.5, lineHeight: 1.5, margin: '10px 0 0', color: 'rgba(255,255,255,0.86)' }}>
            Entrenamiento, alimentación y descanso funcionan como un solo sistema. Cada rutina, cada meta y cada registro responde a esa lógica.
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.5, margin: '10px 0 0', color: '#fff', fontWeight: 650 }}>
            Tu parte no es hacerlo perfecto: es entender cómo funciona y ejecutarlo con criterio.
          </p>
        </div>
      </section>

      {/* 2 · Los pilares */}
      <Separador />
      <section data-parte="pilares" data-lectura="programa" style={{ ...bloque, scrollMarginTop: 80 }}>
        <h2 style={titulo}>Los cuatro pilares</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PILARES.map(p => {
            const Icono = p.icono;
            return (
              <div key={p.titulo} data-pilar style={tarjeta}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 42, height: 42, borderRadius: 99, background: p.color.tint, color: p.color.ink, display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <Icono size={22} weight="bold" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em' }}>{p.titulo}</div>
                    <div style={{ fontSize: 14, fontWeight: 650, color: p.color.ink, marginTop: 1 }}>{p.frase}</div>
                  </div>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.5, color: TEXT, margin: '12px 0 0' }}>{p.texto}</p>
                <ul style={{ listStyle: 'none', padding: '10px 12px', margin: '12px 0 0', background: CREMA, borderRadius: 14 }}>
                  {p.esencia.map(e => (
                    <li key={e} style={{ display: 'flex', gap: 8, fontSize: 14, color: TEXT, lineHeight: 1.4, padding: '3px 0' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: p.color.base, marginTop: 7, flex: 'none' }} />{e}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3 · El trayecto: seis fases en una línea de tiempo */}
      <Separador />
      <section data-parte="trayecto" data-lectura="journey" style={{ ...bloque, scrollMarginTop: 80 }}>
        <h2 style={titulo}>Tu trayecto</h2>
        <p style={bajada}>Seis fases. Cada una construye la siguiente. Toca una para ver qué haces tú y qué consigues.</p>
        <div style={{ ...tarjeta, padding: '6px 16px' }}>
          {FASES.map((f, i) => {
            const on = fase === i;
            return (
              <div key={f.n} data-fase style={{ display: 'flex', gap: 12 }}>
                {/* La línea que une las fases */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', paddingTop: 14 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800,
                    background: on ? N.base : N.tint, color: on ? '#fff' : N.ink, transition: 'background .2s, color .2s',
                  }}>{f.n}</span>
                  {i < FASES.length - 1 && <span style={{ flex: 1, width: 2, background: N.tint, marginTop: 4, minHeight: 14 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: '12px 0', borderBottom: i < FASES.length - 1 ? '1px solid #EFEBE3' : 0 }}>
                  <button onClick={() => setFase(on ? null : i)} aria-expanded={on} style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8, border: 0, background: 'transparent', padding: 0,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: N.ink }}>{f.nombre}</span>
                      <span style={{ display: 'block', fontSize: 16.5, fontWeight: 800, color: TEXT, letterSpacing: '-0.015em', lineHeight: 1.25, marginTop: 1 }}>{f.titulo}</span>
                      <span style={{ display: 'block', fontSize: 14, color: TEXT_MUTED, lineHeight: 1.4, marginTop: 3 }}>{f.idea}</span>
                    </span>
                    <CaretDown size={18} color={TEXT_LIGHT} style={{ flex: 'none', marginTop: 18, transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>
                  {on && (
                    <div className="fade-up" style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MUTED }}>Lo que haces tú</div>
                      <p style={{ fontSize: 14.5, lineHeight: 1.5, color: TEXT, margin: '3px 0 0' }}>{f.haces}</p>
                      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, background: N.tint, color: N.ink, fontSize: 14, fontWeight: 650, lineHeight: 1.4 }}>
                        {f.resultado}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4 · Preguntas frecuentes */}
      <Separador />
      <section data-parte="preguntas" data-lectura="faq" style={{ ...bloque, scrollMarginTop: 80 }}>
        <h2 style={titulo}>Preguntas frecuentes</h2>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {['Todas', 'Proceso', 'Entrenamiento', 'Alimentación'].map(f => (
            <button key={f} onClick={() => { setFiltro(f); setAbierta(null); }} style={{
              border: 0, borderRadius: 99, padding: '7px 13px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 650,
              background: filtro === f ? N.base : '#FFFFFF', color: filtro === f ? '#fff' : TEXT, boxShadow: filtro === f ? 'none' : SOMBRA,
            }}>{f}</button>
          ))}
        </div>
        <div style={{ ...tarjeta, padding: '2px 16px' }}>
          {preguntas.map(([cat, q, r], i) => {
            const on = abierta === q;
            return (
              <div key={q} style={{ borderBottom: i < preguntas.length - 1 ? '1px solid #EFEBE3' : 0 }}>
                <button onClick={() => setAbierta(on ? null : q)} aria-expanded={on} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', border: 0, background: 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: TEXT, lineHeight: 1.35 }}>{q}</span>
                  <CaretDown size={17} color={TEXT_LIGHT} style={{ flex: 'none', transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </button>
                {on && <p className="fade-up" style={{ fontSize: 14.5, lineHeight: 1.5, color: TEXT_MUTED, margin: '-4px 0 14px' }}>{r}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5 · La app: el recorrido guiado */}
      <Separador />
      <section data-parte="recorrido" style={{ ...bloque, scrollMarginTop: 80 }}>
        <button data-abrir-recorrido onClick={alRecorrido} style={{
          width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', fontFamily: 'inherit',
          background: N.base, color: '#fff', borderRadius: 22, padding: '18px 18px', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 8px 22px rgba(238,132,52,0.28)',
        }}>
          <span style={{ width: 46, height: 46, borderRadius: 99, background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Compass size={26} weight="bold" />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 700, opacity: 0.9 }}>2 minutos</span>
            <span style={{ display: 'block', fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Recorrido de la app</span>
            <span style={{ display: 'block', fontSize: 14, opacity: 0.92, marginTop: 2 }}>Qué hay en cada sección y cómo se usa.</span>
          </span>
          <ArrowRight size={22} weight="bold" style={{ flex: 'none' }} />
        </button>
      </section>

      {/* 6 · Aclaraciones */}
      <Separador />
      <section data-parte="aclaraciones" style={{ ...bloque, scrollMarginTop: 80 }}>
        <h2 style={titulo}>Aclaraciones</h2>
        <div style={tarjeta}>
          {ACLARACIONES.map((a, i) => (
            <div key={a} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i ? '1px solid #EFEBE3' : 0 }}>
              <Info size={19} color={N.ink} style={{ flex: 'none', marginTop: 1 }} />
              <span style={{ fontSize: 14.5, lineHeight: 1.45, color: TEXT }}>{a}</span>
            </div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', marginTop: 26, color: TEXT_LIGHT }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.04em', color: TEXT_MUTED }}>ENTRENA CON MÉTODO</div>
        <div style={{ fontSize: 12.5, marginTop: 4 }}>Mauro Morón · ISSA Training and Nutrition Coach</div>
      </div>
    </div>
  );
}

const bloque = { marginTop: 0 };
// Una línea entre partes, para leer por bloques.
const Separador = () => <div data-separador aria-hidden="true" style={{ height: 1, background: 'rgba(31,31,31,0.10)', margin: '28px 4px 24px' }} />;
const titulo = { fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: TEXT, margin: '0 2px 10px' };
const bajada = { fontSize: 14.5, color: TEXT_MUTED, lineHeight: 1.45, margin: '-4px 2px 10px' };
const tarjeta = { background: '#FFFFFF', borderRadius: 20, padding: '16px 16px', boxShadow: SOMBRA };
