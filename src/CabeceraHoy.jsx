// ─────────────────────────────────────────────────────────────────────────
// CABECERA DE «HOY» · visual nueva · LA VOZ DEL COACH
//
// La personalidad la pone lo que dice, no un dibujo: arriba el día (y la
// semana de la fase o la racha), y una frase grande en dos tiempos, lo que
// pasa hoy en negro y lo que diría el coach en el color de la sección
// (las frases viven en vozCoach.js). Debajo, la firma del coach.
//
// El fondo es una banda del color de la sección con dos olas quietas al pie
// y el borde de abajo curvo, más baja que la de antes; a la derecha, el
// ícono de línea de la sección (el mismo de la barra). Sin animaciones de
// fondo ni personajes: esos quedan para celebrar.
//
// `sangria` y `arriba` cancelan el relleno del contenedor para que el color
// llegue a los bordes y al techo de la pantalla.
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { TEXT, TEXT_MUTED } from './theme.js';
import { ICONO_SECCION } from './BarraV2.jsx';

// La banda: degradado suave del color de la sección, unas olas QUIETAS al
// pie y el borde de abajo que sube en el centro (la curva de antes). `tinta`
// es el color del ícono y de la segunda línea de la frase.
export const TEMAS = {
  entreno: { fondo: ['#D6E5F8', '#EEF4FC'], ola1: '#C3D7F3', ola2: '#A9C5EE', tinta: '#2F6CC4' },
  comida:  { fondo: ['#D9EEDD', '#F0F8F1'], ola1: '#C5E3CC', ola2: '#A8D3B2', tinta: '#2F7F45' },
  aprende: { fondo: ['#FBE1CD', '#FDF3EA'], ola1: '#F8D0B1', ola2: '#F4BC92', tinta: '#C95F17' },
  dash:    { fondo: ['#F3F2EC', '#F3F2EC'], ola1: '#E9E6DC', ola2: '#E0DCCF', tinta: '#1F1F1F' },
};

const CSS = `
@keyframes cab-entra { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
[data-cabecera-hoy] .cab-texto > * { animation: cab-entra .5s cubic-bezier(.2,.8,.2,1) both; }
[data-cabecera-hoy] .cab-texto > *:nth-child(2) { animation-delay: .06s }
[data-cabecera-hoy] .cab-texto > *:nth-child(3) { animation-delay: .12s }
@media (prefers-reduced-motion: reduce) { [data-cabecera-hoy] .cab-texto > * { animation: none !important; } }`;

// Las olas: dos curvas al pie de la banda, del ancho de cualquier pantalla.
function Olas({ t }) {
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 60 }}>
      <path d="M0 26 C90 6 180 44 270 22 C330 8 370 18 400 12 V60 H0 Z" fill={t.ola1} />
      <path d="M0 44 C110 26 220 58 400 34 V60 H0 Z" fill={t.ola2} />
    </svg>
  );
}

// La firma: el monograma del coach en grafito y su nombre.
export function FirmaCoach({ claro = false, compacta = false }) {
  return (
    <div data-firma-coach style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: compacta ? 10 : 14 }}>
      <span aria-hidden="true" style={{
        width: compacta ? 22 : 26, height: compacta ? 22 : 26, borderRadius: 99, background: TEXT, color: '#FFFFFF', flex: 'none',
        display: 'grid', placeItems: 'center', fontSize: compacta ? 9 : 10.5, fontWeight: 800, letterSpacing: '0.02em',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.7)',
      }}>MM</span>
      <span style={{ fontSize: compacta ? 12.5 : 13.5, fontWeight: 600, color: claro ? '#FFFFFF' : '#4A4A48' }}>Mauro, tu coach</span>
    </div>
  );
}

// `fondo={false}`: solo la letra (el Dash ya tiene sus manchas detrás).
// `voz.sub`: una línea de texto normal debajo de la frase.
export default function CabeceraHoy({ tema = 'entreno', voz, titulo, firma = true, fondo = true, sangria = '20px', arriba = '0px', children }) {
  const t = TEMAS[tema] || TEMAS.entreno;
  const Icono = ICONO_SECCION[tema];
  const texto = (
    <div className="cab-texto" style={{ position: 'relative' }}>
      {voz?.etiqueta && (
        <div data-etiqueta style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: TEXT_MUTED }}>{voz.etiqueta}</div>
      )}
      {voz ? (
        <h1 data-frase style={{
          margin: '8px 0 0', fontSize: fondo ? 'clamp(23px, 6.6vw, 28px)' : 'clamp(27px, 7.6vw, 34px)', fontWeight: 800, lineHeight: 1.08,
          letterSpacing: '-0.03em', color: TEXT, textWrap: 'balance', maxWidth: fondo && Icono ? 'calc(100% - 64px)' : 460,
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
      <div data-cabecera-hoy={tema} style={{ position: 'relative', margin: `0 0 18px`, padding: `16px 0 4px` }}>
        <style>{CSS}</style>
        {texto}
      </div>
    );
  }
  return (
    <div data-cabecera-hoy={tema} style={{
      position: 'relative', overflow: 'hidden',
      margin: `calc(-1 * ${arriba}) calc(-1 * ${sangria}) 14px`,
      padding: `calc(${arriba} + 4px) ${sangria} 58px`,
      background: `linear-gradient(180deg, ${t.fondo[0]} 0%, ${t.fondo[1]} 100%)`,
      // El borde de abajo sube en el centro, como una loma.
      WebkitMaskImage: 'radial-gradient(ellipse 58% 26px at 50% 100%, transparent 97%, #000 100%)',
      maskImage: 'radial-gradient(ellipse 58% 26px at 50% 100%, transparent 97%, #000 100%)',
    }}>
      <style>{CSS}</style>
      <Olas t={t} />
      {/* El ícono de la sección, de línea, en un círculo blanco suave. */}
      {Icono && (
        <span data-icono-cabecera={tema} aria-hidden="true" style={{
          position: 'absolute', right: sangria, top: `calc(${arriba} + 26px)`, width: 52, height: 52, borderRadius: 99,
          background: 'rgba(255,255,255,0.72)', boxShadow: '0 4px 14px rgba(40,40,30,0.08)',
          display: 'grid', placeItems: 'center', color: t.tinta,
        }}><Icono size={27} weight="regular" /></span>
      )}
      {texto}
    </div>
  );
}
