// ─────────────────────────────────────────────────────────────────────────
// CABECERA DE «HOY» · visual nueva · LA VOZ DEL COACH
//
// La personalidad la pone lo que dice, no un dibujo: arriba el día (y la
// semana de la fase o la racha), y una frase grande en dos tiempos, lo que
// pasa hoy en negro y lo que diría el coach en el color de la sección
// (las frases viven en vozCoach.js). Debajo, la firma del coach.
//
// El fondo son manchas de color de la marca, difuminadas y con una deriva
// muy lenta (las mismas de la animación de entrada), en la paleta de cada
// sección. Se desvanecen hacia abajo en el fondo de la pantalla: sin bordes,
// sin olas, sin cortes. Quien pide menos movimiento las ve quietas.
//
// `sangria` y `arriba` cancelan el relleno del contenedor para que el color
// llegue a los bordes y al techo de la pantalla.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TEXT, TEXT_MUTED } from './theme.js';

// m1 la mancha grande (arriba a la derecha), m2 la de la izquierda, m3 el
// acento cálido o frío que la acompaña. `frase` es el color de la segunda
// línea: el de la sección, con contraste para letra grande sobre claro.
export const TEMAS = {
  entreno: { m1: '#8FB3E8', m2: '#CFE0F7', m3: '#F6CFA9', base: '#EAF1FB', frase: '#2F6CC4' },
  comida:  { m1: '#9CCFA8', m2: '#D7EEDC', m3: '#F7E1A0', base: '#EDF6EF', frase: '#2F7F45' },
  aprende: { m1: '#F6B98C', m2: '#FBE0CB', m3: '#A9C6EE', base: '#FDF1E7', frase: '#C95F17' },
  dash:    { m1: '#9CCFA8', m2: '#A9C6EE', m3: '#F6B98C', m4: '#F7E1A0', base: '#F3F2EC', frase: '#1F1F1F' },
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
@media (prefers-reduced-motion: reduce) {
  [data-cabecera-hoy] .cab-m, [data-cabecera-hoy] .cab-texto > * { animation: none !important; }
}`;

// Una mancha: un degradado radial que se apaga solo (sin filtros de
// desenfoque, que en teléfonos viejos pesan).
const mancha = (color, extra) => ({ background: `radial-gradient(closest-side, ${color} 0%, ${color}00 100%)`, ...extra });

// La firma: el monograma del coach en grafito y su nombre.
export function FirmaCoach({ claro = false }) {
  return (
    <div data-firma-coach style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
      <span aria-hidden="true" style={{
        width: 26, height: 26, borderRadius: 99, background: TEXT, color: '#FFFFFF', flex: 'none',
        display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.02em',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.7)',
      }}>MM</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: claro ? '#FFFFFF' : '#4A4A48' }}>Mauro, tu coach</span>
    </div>
  );
}

// `fondo={false}`: solo la letra (el Dash ya tiene sus manchas detrás).
// `voz.sub`: una línea de texto normal debajo de la frase.
export default function CabeceraHoy({ tema = 'entreno', voz, titulo, firma = true, fondo = true, sangria = '20px', arriba = '0px', children }) {
  const t = TEMAS[tema] || TEMAS.entreno;
  return (
    <div data-cabecera-hoy={tema} style={{
      position: 'relative',
      margin: `calc(-1 * ${arriba}) calc(-1 * ${sangria}) 18px`,
      paddingTop: `calc(${arriba} + 10px)`,
    }}>
      <style>{CSS}</style>
      {/* El color: llega al techo y a los bordes, y se apaga hacia abajo. */}
      {fondo && <div aria-hidden="true" style={{
        position: 'absolute', inset: '0 0 -40px 0', overflow: 'hidden', pointerEvents: 'none',
        background: t.base,
        WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 52%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, #000 0%, #000 52%, transparent 100%)',
      }}>
        <div className="cab-m cab-m1" style={mancha(t.m1, { width: '95vw', height: '95vw', maxWidth: 520, maxHeight: 520, top: '-34%', right: '-30%' })} />
        <div className="cab-m cab-m2" style={mancha(t.m2, { width: '80vw', height: '80vw', maxWidth: 440, maxHeight: 440, bottom: '-18%', left: '-34%' })} />
        <div className="cab-m cab-m3" style={mancha(t.m3, { width: '58vw', height: '58vw', maxWidth: 320, maxHeight: 320, bottom: '0%', right: '-22%', opacity: 0.75 })} />
        {t.m4 && <div className="cab-m cab-m4" style={mancha(t.m4, { width: '60vw', height: '60vw', maxWidth: 340, maxHeight: 340, top: '-20%', left: '-14%', opacity: 0.8 })} />}
      </div>}

      <div className="cab-texto" style={{ position: 'relative', padding: `6px ${sangria} 4px` }}>
        {voz?.etiqueta && (
          <div data-etiqueta style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em', color: TEXT_MUTED }}>{voz.etiqueta}</div>
        )}
        {voz ? (
          <h1 data-frase style={{
            margin: '10px 0 0', fontSize: 'clamp(27px, 7.6vw, 34px)', fontWeight: 800, lineHeight: 1.04,
            letterSpacing: '-0.035em', color: TEXT, textWrap: 'balance', maxWidth: 460,
          }}>
            {voz.a}{voz.b && <><br /><span style={{ color: t.frase }}>{voz.b}</span></>}
          </h1>
        ) : titulo && (
          <h1 style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: TEXT }}>{titulo}</h1>
        )}
        {voz?.sub && <p data-sub style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.45, color: TEXT_MUTED, maxWidth: 460 }}>{voz.sub}</p>}
        {firma && <FirmaCoach />}
        {children}
      </div>
    </div>
  );
}
