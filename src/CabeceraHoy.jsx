// ─────────────────────────────────────────────────────────────────────────
// CABECERA DE «HOY» · visual nueva · LA VOZ DEL COACH
//
// La personalidad la pone lo que dice, no un dibujo: arriba el día (y la
// semana de la fase o la racha), y una frase grande en dos tiempos, lo que
// pasa hoy en negro y lo que diría el coach en el color de la sección
// (las frases viven en vozCoach.js). Sin firma debajo: se quitó a pedido
// del coach (`firma` la vuelve a poner si algún día se quiere).
//
// Dos capas, mezcla de los dos estilos que se probaron:
//   · una BANDA delgada del color de la sección, solo detrás de la barra de
//     arriba (la del nombre del módulo), con el borde de abajo curvo;
//   · debajo, el mensaje sobre MANCHAS de color de la sección, difuminadas,
//     con una deriva muy lenta, que se apagan hacia abajo sin cortes.
// A la derecha, la ilustración de la sección (IlustracionesCabecera.jsx) en
// línea blanca. Quien pide menos movimiento ve todo quieto.
//
// `sangria` y `arriba` cancelan el relleno del contenedor para que el color
// llegue a los bordes y al techo de la pantalla; `arriba` es también el alto
// de la banda (lo que ocupa la barra de arriba).
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { TEXT, TEXT_MUTED } from './theme.js';
import ObjetoCabecera, { CAJA } from './ObjetoCabecera.jsx';
import { AnilloMarca } from './GraficasV2.jsx';

// El aro de la gráfica más importante de cada sección, en su color.
const COLOR_ARO = { dash: '#3C7BD6', entreno: '#5F6670', comida: '#46965A', aprende: '#EE8434' };

// banda: degradado de la banda · m1/m2/m3: manchas · base: fondo detrás de
// las manchas · tinta: la segunda línea de la frase (contraste para letra
// grande sobre claro).
export const TEMAS = {
  // Entrenamiento: grises con un toque de amarillo suave (mancha y frase).
  entreno: { banda: ['#B9BFC7', '#CDD1D7'], m1: '#A3AAB3', m2: '#D5D9DE', m3: '#F4DC93', base: '#EFF0F2', tinta: '#C9A43E' },
  comida:  { banda: ['#C3E3CB', '#D6EDDC'], m1: '#9CCFA8', m2: '#D7EEDC', m3: '#F7E1A0', base: '#F0F8F1', tinta: '#2F7F45' },
  aprende: { banda: ['#F7CFAF', '#FADFCA'], m1: '#F6B98C', m2: '#FBE0CB', m3: '#A9C6EE', base: '#FDF3EA', tinta: '#C95F17' },
  // El Dash, todo en azules: banda más intensa y manchas de varios tonos
  // de azul; la segunda línea de la frase, en el azul de la sección.
  dash:    { banda: ['#86ADE5', '#A3C2EE'], m1: '#7FA6E2', m2: '#B9D0F3', m3: '#5E92DA', m4: '#D0DFF6', base: '#E3ECF9', tinta: '#2F6CC4' },
};

const CSS = `
@keyframes cab-deriva-1 { from { transform: translate3d(0,0,0) scale(1) } to { transform: translate3d(-7%, 6%, 0) scale(1.08) } }
@keyframes cab-deriva-2 { from { transform: translate3d(0,0,0) scale(1) } to { transform: translate3d(9%, -5%, 0) scale(1.12) } }
@keyframes cab-deriva-3 { from { transform: translate3d(0,0,0) } to { transform: translate3d(-10%, -8%, 0) } }
[data-cabecera-hoy] .cab-m { position: absolute; border-radius: 50%; will-change: transform; }
[data-cabecera-hoy] .cab-m1 { animation: cab-deriva-1 16s ease-in-out infinite alternate; }
[data-cabecera-hoy] .cab-m2 { animation: cab-deriva-2 19s ease-in-out infinite alternate; }
[data-cabecera-hoy] .cab-m3 { animation: cab-deriva-3 23s ease-in-out infinite alternate; }
[data-cabecera-hoy] .cab-m4 { animation: cab-deriva-1 21s ease-in-out infinite alternate-reverse; }
@keyframes cab-entra { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
[data-cabecera-hoy] .cab-texto > * { animation: cab-entra .5s cubic-bezier(.2,.8,.2,1) both; }
[data-cabecera-hoy] .cab-texto > *:nth-child(2) { animation-delay: .06s }
[data-cabecera-hoy] .cab-texto > *:nth-child(3) { animation-delay: .12s }
@keyframes cab-ilus { from { opacity: 0; transform: translate3d(14px, 6px, 0) rotate(-3deg) } to { opacity: 1; transform: none } }
[data-cabecera-hoy] .cab-ilus { animation: cab-ilus .7s cubic-bezier(.2,.8,.2,1) both .08s; }
@media (prefers-reduced-motion: reduce) {
  [data-cabecera-hoy] .cab-m, [data-cabecera-hoy] .cab-texto > *, [data-cabecera-hoy] .cab-ilus { animation: none !important; }
}`;

// Una mancha: un degradado radial que se apaga solo (sin filtros de
// desenfoque, que en teléfonos viejos pesan).
const mancha = (color, extra) => ({ background: `radial-gradient(closest-side, ${color} 0%, ${color}00 100%)`, ...extra });

// La firma: el monograma del coach en grafito y su nombre.
export function FirmaCoach({ claro = false, compacta = false }) {
  return (
    <div data-firma-coach style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: compacta ? 10 : 14 }}>
      <span aria-hidden="true" style={{
        width: compacta ? 22 : 26, height: compacta ? 22 : 26, borderRadius: 99, background: TEXT, color: '#FFFFFF', flex: 'none',
        display: 'grid', placeItems: 'center', fontSize: compacta ? 9 : 10.5, fontWeight: 800, letterSpacing: '0.02em',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.7)',
      }}>MM</span>
      <span style={{ fontSize: compacta ? 12.5 : 13.5, fontWeight: 600, color: claro ? '#FFFFFF' : '#4A4A48' }}>— Mauro, tu coach</span>
    </div>
  );
}

// `fondo={false}`: solo la letra (el Dash ya tiene sus manchas detrás).
// `voz.sub`: una línea de texto normal debajo de la frase.
// `aro`: { frac (0–1), centro, pie } — la gráfica clave de la sección, en un
// aro como los del Dash, al lado de la kettlebell; se llena al entrar.
// El espacio del objeto 3D, igual en todas las cabeceras: del mismo alto que
// el aro (60 px) y a su derecha, con la misma separación. Cada objeto se
// agranda hasta llenarlo sin pasarse (la kettlebell y la brújula, por alto;
// el plato y el libro, por ancho) y queda centrado en él.
const ESPACIO = { margen: 32, ancho: 68, alto: 54, separacion: 16, centro: 66 };
function lugarDelObjeto(caja) {
  const [l, t, r, b] = caja;
  const lado = Math.min(ESPACIO.ancho / (r - l), ESPACIO.alto / (b - t));
  return {
    lado,
    derecha: ESPACIO.margen + ESPACIO.ancho / 2 - lado * (1 - (l + r) / 2),
    arriba: ESPACIO.centro - lado * (t + b) / 2,
  };
}

// PRUEBA (solo vista previa, apagada): la gráfica grande y protagonista, con
// el objeto tenue y chico adentro, y el porcentaje y su texto debajo.
// Se enciende en un teléfono con localStorage «mt:prueba:aroGrande» = 1.
const aroGrandePrueba = () => { try { return localStorage.getItem('mt:prueba:aroGrande') === '1'; } catch (e) { return false; } };
const ARO_G = { tam: 112, grosor: 10, objAncho: 58, objAlto: 46 };
function lugarEnCaja(caja, ancho, alto) {
  const [l, t, r, b] = caja;
  const lado = Math.min(ancho / (r - l), alto / (b - t));
  return { lado, left: ancho / 2 - lado * (l + r) / 2, top: alto / 2 - lado * (t + b) / 2 };
}

export default function CabeceraHoy({ tema = 'entreno', voz, titulo, firma = false, fondo = true, sangria = '20px', arriba = '0px', ilustracion = true, aro = null, activo = true, children }) {
  // `activo`: la sección está al frente. Alimentación queda montada por debajo
  // de las demás; cada vez que vuelve al frente, el objeto y el aro se
  // vuelven a animar (se montan de nuevo).
  const [vez, setVez] = useState(0);
  const antes = useRef(activo);
  useEffect(() => { if (activo && !antes.current) setVez(v => v + 1); antes.current = activo; }, [activo]);
  const t = TEMAS[tema] || TEMAS.entreno;
  // La ilustración de la sección va a la derecha, cortada por el borde de la
  // pantalla; el texto deja su espacio para no pasar por encima.
  // El objeto de la sección, en 3D: la kettlebell, el plato, el libro o la
  // brújula, con su movimiento al entrar.
  const Ilus = fondo && ilustracion;
  const conAro = !!(Ilus && aro);
  const lugar = lugarDelObjeto(CAJA[tema] || CAJA.entreno);
  const grande = conAro && aroGrandePrueba();
  const texto = (
    <div className="cab-texto" style={{ position: 'relative', paddingRight: Ilus ? (grande ? 'min(38vw, 138px)' : conAro ? 'min(46vw, 168px)' : 'min(30vw, 104px)') : 0, minHeight: grande ? 168 : conAro ? 118 : undefined }}>
      {voz?.etiqueta && (
        <div data-etiqueta style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: TEXT_MUTED }}>{voz.etiqueta}</div>
      )}
      {voz ? (
        <h1 data-frase style={{
          margin: '8px 0 0', fontSize: fondo ? (conAro ? 'clamp(21px, 5.9vw, 26px)' : 'clamp(24px, 6.8vw, 29px)') : 'clamp(27px, 7.6vw, 34px)', fontWeight: 800, lineHeight: 1.08,
          letterSpacing: '-0.03em', color: TEXT, textWrap: 'balance', maxWidth: 460,
        }}>
          {voz.a}{voz.b && <><br /><span style={{ color: t.tinta }}>{voz.b}</span></>}
        </h1>
      ) : titulo && (
        <h1 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: TEXT }}>{titulo}</h1>
      )}
      {voz?.sub && <p data-sub style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.45, color: TEXT_MUTED, maxWidth: 460 }}>{voz.sub}</p>}
      {firma && <FirmaCoach compacta={fondo} />}
      {children}
    </div>
  );

  if (!fondo) {
    return (
      <div data-cabecera-hoy={tema} style={{ position: 'relative', margin: '0 0 18px', padding: '16px 0 4px' }}>
        <style>{CSS}</style>
        {texto}
      </div>
    );
  }
  return (
    <div data-cabecera-hoy={tema} style={{
      position: 'relative',
      margin: `calc(-1 * ${arriba}) calc(-1 * ${sangria}) 14px`,
      padding: `calc(${arriba} + 26px) ${sangria} 6px`,
    }}>
      <style>{CSS}</style>
      {/* Las manchas: detrás del mensaje, se apagan hacia abajo. */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: '0 0 -48px 0', overflow: 'hidden', pointerEvents: 'none', background: t.base,
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, #000 0%, #000 55%, transparent 100%)',
      }}>
        <div className="cab-m cab-m1" style={mancha(t.m1, { width: '95vw', height: '95vw', maxWidth: 520, maxHeight: 520, top: '-10%', right: '-32%' })} />
        <div className="cab-m cab-m2" style={mancha(t.m2, { width: '80vw', height: '80vw', maxWidth: 440, maxHeight: 440, bottom: '-22%', left: '-34%' })} />
        <div className="cab-m cab-m3" style={mancha(t.m3, { width: '58vw', height: '58vw', maxWidth: 320, maxHeight: 320, bottom: '-6%', right: '-20%', opacity: 0.75 })} />
        {t.m4 && <div className="cab-m cab-m4" style={mancha(t.m4, { width: '62vw', height: '62vw', maxWidth: 340, maxHeight: 340, top: '-18%', left: '18%', opacity: 0.8 })} />}
      </div>
      {/* La banda delgada: solo detrás de la barra de arriba, borde curvo. */}
      {t.banda && <div aria-hidden="true" data-banda style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: `calc(${arriba} + 14px)`, pointerEvents: 'none',
        background: `linear-gradient(180deg, ${t.banda[0]} 0%, ${t.banda[1]} 100%)`,
        WebkitMaskImage: 'radial-gradient(ellipse 60% 18px at 50% 100%, transparent 97%, #000 100%)',
        maskImage: 'radial-gradient(ellipse 60% 18px at 50% 100%, transparent 97%, #000 100%)',
      }} />}
      {grande && (() => {
        const dentro = lugarEnCaja(CAJA[tema] || CAJA.entreno, ARO_G.objAncho, ARO_G.objAlto);
        return (
          <div key={vez} aria-hidden="true" data-ilus-cabecera={tema} data-aro-grande style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div className="cab-ilus" data-aro-cabecera={tema} style={{
              position: 'absolute', right: 16, top: `calc(${arriba} + 2px)`, width: 128,
              display: 'flex', flexDirection: 'column', alignItems: 'center', animationDelay: '.1s',
            }}>
              <div style={{ position: 'relative', width: ARO_G.tam, height: ARO_G.tam }}>
                <AnilloMarca plano frac={aro.frac} color={COLOR_ARO[tema] || TEXT} tam={ARO_G.tam} grosor={ARO_G.grosor} riel="rgba(255,255,255,0.9)" etiqueta={aro.pie} />
                {/* El objeto, chico y tenue, adentro de la gráfica. */}
                <div style={{ position: 'absolute', left: (ARO_G.tam - ARO_G.objAncho) / 2, top: (ARO_G.tam - ARO_G.objAlto) / 2, width: ARO_G.objAncho, height: ARO_G.objAlto, opacity: 0.5 }}>
                  <div style={{ position: 'absolute', left: dentro.left, top: dentro.top, width: dentro.lado, height: dentro.lado }}><ObjetoCabecera tema={tema} activo={activo} /></div>
                </div>
              </div>
              <div data-aro-centro style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{aro.centro}</div>
              {aro.pie && <div data-aro-pie style={{ marginTop: 3, fontSize: 11.5, fontWeight: 600, color: TEXT_MUTED, textAlign: 'center', lineHeight: 1.2 }}>{aro.pie}</div>}
            </div>
          </div>
        );
      })()}
      {Ilus && !grande && (
        <div key={vez} aria-hidden="true" data-ilus-cabecera={tema} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            // El objeto, metido en su espacio (mismo alto que el aro) y
            // centrado en él: igual en todas las cabeceras.
            position: 'absolute', right: lugar.derecha, top: `calc(${arriba} + ${lugar.arriba}px)`, width: lugar.lado, height: lugar.lado,
          }}><ObjetoCabecera tema={tema} activo={activo} /></div>
          {conAro && (
            <div className="cab-ilus" data-aro-cabecera={tema} style={{
              // A su izquierda, a la misma altura y con la misma separación en
              // todas las cabeceras. Plano: un color, riel casi blanco.
              position: 'absolute', right: ESPACIO.margen + ESPACIO.ancho + ESPACIO.separacion - 12,
              top: `calc(${arriba} + ${ESPACIO.centro - 30}px)`, width: 84,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animationDelay: '.16s',
            }}>
              <AnilloMarca plano frac={aro.frac} color={COLOR_ARO[tema] || TEXT} tam={60} grosor={7} riel="rgba(255,255,255,0.9)" etiqueta={aro.pie}>
                <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{aro.centro}</div>
              </AnilloMarca>
              {aro.pie && <div data-aro-pie style={{ fontSize: 11, fontWeight: 500, color: TEXT_MUTED, textAlign: 'center', lineHeight: 1.2 }}>{aro.pie}</div>}
            </div>
          )}
        </div>
      )}
      {texto}
    </div>
  );
}
