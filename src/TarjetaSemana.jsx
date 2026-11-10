// ─────────────────────────────────────────────────────────────────────────
// TU SEMANA · la primera tarjeta de «Tu semana» en el Dash
//
//   · Lunes: COMPLETA — la semana que cerró (rutinas, días con comida
//     registrada, proteína contra su meta, cardio, intensidad) y su foco
//     para la semana nueva, con una barra que avanza cada día.
//   · Martes a sábado: CORTA — el titular de una línea y la barra del foco.
//     «Ver resumen ›» (píldora: se toca) la abre completa y «Ver menos» la
//     cierra. «Tu foco» va sin caja: es información, no se toca.
//   · Domingo: COMPARATIVO — esta semana contra la pasada, con flechas, y lo
//     que todavía puede sumar hoy, con un botón directo.
// Si no hay nada de la semana pasada (cliente nuevo) no sale.
//
// La fuerza, el cardio y la intensidad vienen del servidor (dash › semanas);
// la comida, del teléfono (history), con los mismos totales de su día.
// ─────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Barbell, ForkKnife, Heartbeat, Gauge } from '@phosphor-icons/react';
import { aFecha } from './entrenoDatos.js';
import { armarSemana } from './semanaResumen.js';

const TXT = '#1F1F1F', MUT = '#6B6B6B', SUAVE = '#9A9790', LINEA = '#F3F1EB';
const VERDE = '#46965A', NARANJA = '#C76A1F', AZUL = '#2F6CC4', VERDE_TXT = '#2F7F45';
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const rango = (a, b) => {
  const x = aFecha(a), y = aFecha(b);
  return x.getMonth() === y.getMonth() ? `${x.getDate()} al ${y.getDate()} ${MES[y.getMonth()]}` : `${x.getDate()} ${MES[x.getMonth()]} al ${y.getDate()} ${MES[y.getMonth()]}`;
};
const coma = (n) => String(n).replace('.', ',');

const Fila = ({ Icono, color, etiqueta, sub, valor, tono }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${LINEA}` }}>
    <span style={{ width: 24, height: 24, color, display: 'grid', placeItems: 'center', flex: 'none' }}><Icono size={19} /></span>
    <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}><span style={{ display: 'block', fontSize: 14.5, color: TXT, fontWeight: 500 }}>{etiqueta}</span>{sub && <span style={{ display: 'block', fontSize: 12.5, color: MUT, marginTop: 2 }}>{sub}</span>}</span>
    <span style={{ fontSize: 15, fontWeight: 750, color: tono || TXT, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{valor}</span>
  </div>
);
const flecha = (a, b, mayorMejor = true) => {
  if (a == null || b == null) return ['', SUAVE];
  if (a === b) return ['=', SUAVE];
  return (a > b) === mayorMejor ? ['↑', VERDE] : ['↓', NARANJA];
};
const Comp = ({ Icono, color, etiqueta, a, b, va, vb }) => {
  const [f, fc] = flecha(a, b);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${LINEA}` }}>
      <span style={{ width: 24, height: 24, color, display: 'grid', placeItems: 'center', flex: 'none' }}><Icono size={19} /></span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: MUT, lineHeight: 1.25 }}>{etiqueta}</span>
      <span style={{ width: 78, textAlign: 'right', fontSize: 15, fontWeight: 750, color: TXT, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{va} <span style={{ color: fc, fontWeight: 800 }}>{f}</span></span>
      <span style={{ width: 58, textAlign: 'right', fontSize: 13.5, color: SUAVE, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{vb}</span>
    </div>
  );
};
const Foco = ({ foco, corto }) => (
  <div data-semana-foco style={{ marginTop: 12, fontSize: 14, color: TXT, lineHeight: 1.45 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <b style={{ fontWeight: 700 }}>{corto ? 'Tu foco' : 'Tu foco esta semana'}: {foco.titulo}</b>
      <b style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{foco.texto}</b>
    </div>
    <div style={{ height: 7, borderRadius: 99, background: LINEA, marginTop: 8, overflow: 'hidden' }}>
      <div style={{ width: `${foco.pct}%`, height: '100%', borderRadius: 99, background: '#F2C94C' }} />
    </div>
    {!corto && <div style={{ fontSize: 12.5, color: MUT, marginTop: 6 }}>{foco.tip}</div>}
  </div>
);
const caja = { background: '#fff', borderRadius: 24, padding: '18px 18px 16px', marginTop: 12, boxShadow: 'rgba(40,40,30,.04) 0 1px 2px, rgba(60,60,40,.07) 0 10px 28px' };

export default function TarjetaSemana({ semanas, history, goals, hoy, alIr }) {
  const [abierta, setAbierta] = useState(false);
  const S = armarSemana({ semanas, history, goals, hoy });
  if (!S) return null;
  const { pasada: P, actual: A } = S;
  const conFuerza = P.planeados > 0 || A.planeados > 0;

  if (S.modo === 'comparativo') {
    return (
      <section data-tarjeta-semana="comparativo" style={caja}>
        <div style={{ fontSize: 14, color: MUT, lineHeight: 1.45 }}>Hoy se cierra tu semana</div>
        <h3 style={{ margin: '3px 0 8px', fontSize: 18, fontWeight: 600, color: TXT, letterSpacing: '-0.015em', lineHeight: 1.3 }}>Esta semana contra la pasada</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 6px', borderBottom: `1px solid ${LINEA}`, fontSize: 12, fontWeight: 700, color: SUAVE }}>
          <span style={{ flex: 1 }} /><span style={{ width: 78, textAlign: 'right', color: TXT }}>Esta</span><span style={{ width: 58, textAlign: 'right' }}>Pasada</span>
        </div>
        {conFuerza && <Comp Icono={Barbell} color={AZUL} etiqueta="Rutinas de fuerza" a={A.hechos} b={P.hechos} va={`${A.hechos ?? 0}/${A.planeados}`} vb={`${P.hechos ?? 0}/${P.planeados}`} />}
        <Comp Icono={ForkKnife} color={VERDE_TXT} etiqueta="Días con comida registrada" a={A.comida} b={P.comida} va={`${A.comida}/7`} vb={`${P.comida}/7`} />
        {(A.proteina != null || P.proteina != null) && <Comp Icono={ForkKnife} color={VERDE_TXT} etiqueta="Proteína promedio" a={A.proteina} b={P.proteina} va={A.proteina != null ? `${A.proteina} g` : '—'} vb={P.proteina != null ? `${P.proteina} g` : '—'} />}
        {(A.cardio != null || P.cardio != null) && <Comp Icono={Heartbeat} color={NARANJA} etiqueta="Días de cardio" a={A.cardio} b={P.cardio} va={A.cardio ?? 0} vb={P.cardio ?? 0} />}
        {(A.rpe != null || P.rpe != null) && <Comp Icono={Gauge} color={AZUL} etiqueta="Intensidad promedio" a={A.rpe} b={P.rpe} va={A.rpe != null ? `${coma(A.rpe)}/10` : '—'} vb={P.rpe != null ? `${coma(P.rpe)}/10` : '—'} />}
        {S.sumar && (
          <>
            <div data-semana-sumar style={{ marginTop: 12, background: '#FBF3D9', borderRadius: 16, padding: '11px 13px', fontSize: 14, lineHeight: 1.45, color: TXT }}><b style={{ fontWeight: 700 }}>Hoy aún puedes sumar:</b> {S.sumar.texto}</div>
            {alIr && <button type="button" data-semana-ir onClick={() => alIr(S.sumar.ir, S.sumar.ir === 'comida' ? 'chat' : 'hoy')} style={{ width: '100%', marginTop: 14, height: 44, border: 'none', borderRadius: 999, background: TXT, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{S.sumar.boton}</button>}
          </>
        )}
      </section>
    );
  }

  const completa = S.modo === 'completa' || abierta;
  return (
    <section data-tarjeta-semana={completa ? 'completa' : 'corta'} style={caja}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontSize: 14, color: MUT, lineHeight: 1.45 }}>Tu semana pasada · {rango(S.lunesPasado, S.domingoPasado)}</div>
        {S.modo === 'corta' && (
          <button type="button" data-semana-ver onClick={() => setAbierta(!abierta)} style={{ border: 'none', background: 'rgba(118,118,128,0.13)', borderRadius: 999, padding: '5px 11px', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: AZUL, cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }}>{abierta ? 'Ver menos' : 'Ver resumen'}<span aria-hidden="true" style={{ fontWeight: 800, marginLeft: 2 }}>{abierta ? '‹' : '›'}</span></button>
        )}
      </div>
      <h3 style={{ margin: completa ? '3px 0 6px' : '3px 0 0', fontSize: completa ? 18 : 17, fontWeight: 600, color: TXT, letterSpacing: '-0.015em', lineHeight: 1.3 }}>{S.titular}</h3>
      {completa && (
        <div data-semana-filas>
          {P.planeados > 0 && <Fila Icono={Barbell} color={AZUL} etiqueta="Rutinas de fuerza" valor={`${P.hechos ?? 0}/${P.planeados}`} tono={P.hechos >= P.planeados ? VERDE_TXT : NARANJA} />}
          <Fila Icono={ForkKnife} color={VERDE_TXT} etiqueta="Días con comida registrada" valor={`${P.comida}/7`} tono={P.comida < 5 ? NARANJA : TXT} />
          {P.proteina != null && <Fila Icono={ForkKnife} color={VERDE_TXT} etiqueta="Proteína promedio" sub={S.metaP ? `Tu meta: ${S.metaP} g` : null} valor={`${P.proteina} g`} tono={S.protCorta ? NARANJA : TXT} />}
          {P.cardio != null && <Fila Icono={Heartbeat} color={NARANJA} etiqueta="Días de cardio" valor={P.cardio} />}
          {P.rpe != null && <Fila Icono={Gauge} color={AZUL} etiqueta="Intensidad promedio" valor={`${coma(P.rpe)}/10`} />}
        </div>
      )}
      <Foco foco={S.foco} corto={!completa} />
    </section>
  );
}
