// ─────────────────────────────────────────────────────────────────────────
// TU SEMANA · la primera tarjeta de «Tu semana» en el Dash
//
// De informe a foco: una idea, un dibujo y un paso.
//   · Martes a sábado: TU FOCO DE ESTA SEMANA — su nombre y su cifra, los 7
//     días en círculos (amarillo = cumplido, anillo = hoy, vacío = no; nunca
//     rojo) y una frase de tu coach para hoy. La semana pasada en una línea,
//     con «Ver ›» para sus cifras.
//   · Lunes: primero el LOGRO de la semana que cerró, tres cifras de un
//     vistazo, y lo que faltó se vuelve el foco de la nueva (sin regaño).
//   · Domingo: lo que subió primero, en verde, y UN paso que sí se puede
//     hacer hoy, con su botón.
// Si no hay nada de la semana pasada (cliente nuevo) no sale.
//
// La fuerza, el cardio y la intensidad vienen del servidor (dash › semanas);
// la comida, del teléfono (history), con los mismos totales de su día.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { aFecha } from './entrenoDatos.js';
import { armarSemana } from './semanaResumen.js';

const TXT = '#1F1F1F', MUT = '#6B6B6B', SUAVE = '#9A9790', LINEA = '#F3F1EB';
const AZUL = '#2F6CC4', VERDE_TXT = '#2F7F45', AMARILLO = '#F2C94C', OCRE = '#8A6A12';
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const rango = (a, b) => {
  const x = aFecha(a), y = aFecha(b);
  return x.getMonth() === y.getMonth() ? `${x.getDate()} al ${y.getDate()} ${MES[y.getMonth()]}` : `${x.getDate()} ${MES[x.getMonth()]} al ${y.getDate()} ${MES[y.getMonth()]}`;
};

const Visto = ({ color = TXT, n = 15 }) => (
  <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const LEIDO = { ok: 'cumplido', hoy: 'hoy', corto: 'no llegó', nada: 'sin registro', futuro: 'aún no', libre: 'no toca' };

// Los 7 días: amarillo con visto = cumplido; anillo = hoy; vacío = no (nunca rojo).
const Dias = ({ dias, hoyIdx = -1 }) => (
  <div data-semana-dias style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginTop: 14 }}>
    {dias.map((e, i) => {
      const circulo = e === 'ok' ? { background: AMARILLO }
        : e === 'hoy' ? { background: '#fff', boxShadow: `inset 0 0 0 2.5px ${TXT}` }
        : e === 'corto' ? { background: '#fff', boxShadow: 'inset 0 0 0 2px #E3DFD5' }
        : e === 'libre' ? { background: 'transparent' } : { background: LINEA };
      return (
        <div key={i} data-dia={e} aria-label={`${LETRAS[i]}: ${LEIDO[e] || e}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 36, height: 36, borderRadius: 99, display: 'grid', placeItems: 'center', ...circulo }}>
            {e === 'ok' ? <Visto /> : e === 'hoy' ? <span style={{ width: 8, height: 8, borderRadius: 99, background: AMARILLO }} />
              : e === 'corto' ? <span style={{ width: 10, height: 2.5, borderRadius: 9, background: '#C9C4B8' }} />
              : e === 'libre' ? <span style={{ width: 4, height: 4, borderRadius: 9, background: '#DDD9CF' }} /> : null}
          </span>
          <span style={{ fontSize: 12, fontWeight: i === hoyIdx ? 800 : 600, color: i === hoyIdx ? TXT : SUAVE }}>{i === hoyIdx ? 'Hoy' : LETRAS[i]}</span>
        </div>
      );
    })}
  </div>
);
const Etiqueta = ({ children, color = OCRE }) => <div style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1.35 }}>{children}</div>;
const Cabeza = ({ nombre, cifra }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 3 }}>
    <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: TXT, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{nombre}</h3>
    <div data-semana-cifra style={{ fontSize: 14, color: MUT, whiteSpace: 'nowrap' }}><b style={{ fontSize: 22, fontWeight: 750, color: TXT, letterSpacing: '-0.02em' }}>{cifra.num}</b> {cifra.de}</div>
  </div>
);
const Frase = ({ children }) => <p data-semana-frase style={{ margin: '14px 0 0', fontSize: 14.5, color: TXT, lineHeight: 1.45 }}>{children}</p>;
// Tres cifras de un vistazo; la cumplida (o la que subió) en verde con visto.
const Fichas = ({ fichas }) => (
  <div data-semana-fichas style={{ display: 'flex', gap: 8, marginTop: 12 }}>
    {fichas.map(x => (
      <div key={x.que} data-ficha={x.que} style={{ flex: 1, minWidth: 0, background: x.ok ? 'rgba(70,150,90,0.10)' : '#F7F6F2', borderRadius: 16, padding: '11px 8px 10px', textAlign: 'center' }}>
        <div style={{ fontSize: 21, fontWeight: 750, letterSpacing: '-0.02em', color: x.ok ? VERDE_TXT : TXT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          {x.num}{x.ok && <Visto color={VERDE_TXT} n={14} />}
        </div>
        <div style={{ fontSize: 12, color: MUT, marginTop: 2, lineHeight: 1.25 }}>{x.txt}</div>
      </div>
    ))}
  </div>
);
const Pildora = ({ children, ...p }) => (
  <button type="button" {...p} style={{ border: 'none', background: 'rgba(118,118,128,0.13)', borderRadius: 999, padding: '5px 11px', display: 'inline-flex', alignItems: 'center', gap: 4,
    fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: AZUL, cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }}>{children}</button>
);
const caja = { background: '#fff', borderRadius: 24, padding: 18, marginTop: 12, boxShadow: 'rgba(40,40,30,.04) 0 1px 2px, rgba(60,60,40,.07) 0 10px 28px' };

export default function TarjetaSemana({ semanas, history, goals, hoy, alIr }) {
  const [abierta, setAbierta] = useState(false);
  const S = armarSemana({ semanas, history, goals, hoy });
  if (!S) return null;
  const P = S.pasada;

  if (S.modo === 'comparativo') {
    return (
      <section data-tarjeta-semana="comparativo" style={caja}>
        <Etiqueta>Hoy cierras tu semana</Etiqueta>
        <h3 style={{ margin: '3px 0 0', fontSize: 21, fontWeight: 700, color: TXT, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {S.paso ? 'Te queda un paso para cerrarla mejor.' : 'Así cierras tu semana.'}
        </h3>
        <Fichas fichas={S.fichasActual} />
        {S.paso && <>
          <Frase>{S.paso.texto}</Frase>
          {alIr && <button type="button" data-semana-ir onClick={() => alIr(S.paso.ir, S.paso.ir === 'comida' ? 'chat' : 'hoy')} style={{ width: '100%', marginTop: 14, height: 46, border: 'none', borderRadius: 999, background: TXT, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{S.paso.boton}</button>}
        </>}
      </section>
    );
  }

  if (S.modo === 'completa') {
    return (
      <section data-tarjeta-semana="completa" style={caja}>
        <Etiqueta color={MUT}>Así cerraste tu semana · {rango(S.lunesPasado, S.domingoPasado)}</Etiqueta>
        <h3 style={{ margin: '3px 0 0', fontSize: 21, fontWeight: 700, color: TXT, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{S.logro}</h3>
        <Fichas fichas={S.fichasPasada} />
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${LINEA}` }}>
          <Etiqueta>Esta semana vamos por</Etiqueta>
          <Cabeza nombre={S.nombreFoco} cifra={S.cifra} />
        </div>
        <Dias dias={S.dias} hoyIdx={S.dow} />
        {S.tipLunes && <Frase>{S.tipLunes}</Frase>}
      </section>
    );
  }

  // Martes a sábado: el foco de esta semana.
  const resumen = [P.planeados > 0 ? `${P.hechos ?? 0}/${P.planeados} rutinas` : null, `${P.comida}/7 días de comida`].filter(Boolean).join(' · ');
  return (
    <section data-tarjeta-semana="corta" style={caja}>
      <Etiqueta>Tu foco de esta semana</Etiqueta>
      <Cabeza nombre={S.nombreFoco} cifra={S.cifra} />
      <Dias dias={S.dias} hoyIdx={S.dow} />
      <Frase>{S.frase}</Frase>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${LINEA}` }}>
        <span style={{ fontSize: 13, color: MUT, lineHeight: 1.35 }}>Semana pasada: {resumen}</span>
        <Pildora data-semana-ver aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>{abierta ? 'Ocultar' : 'Ver'}<span aria-hidden="true" style={{ fontWeight: 800 }}>{abierta ? '‹' : '›'}</span></Pildora>
      </div>
      {abierta && <div data-semana-pasada>
        <div style={{ fontSize: 13, color: MUT, marginTop: 10 }}>{rango(S.lunesPasado, S.domingoPasado)} · {S.logro}</div>
        <Fichas fichas={S.fichasPasada} />
      </div>}
    </section>
  );
}
