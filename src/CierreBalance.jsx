// Las pantallas del Cierre de ciclo y de Tu balance (ver cierreCiclo.js), y
// sus tarjetas al final del Dash para volver a verlas.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './entrenoDatos.js';
import { WHATSAPP_COACH } from './v2.js';
import { fechaCortaC, num, conSigno, textoCierre, textoBalance } from './cierreCiclo.js';

const TEXT = '#1F1F1F', MUTED = '#6E6E73';
const TONO = { logro: ['#46965A', '#EAF5EC'], medio: ['#3C7BD6', '#EAF1FB'], aliento: ['#C9672B', '#FCEFE4'] };

function Pantalla({ fondo, children, etiqueta }) {
  return createPortal(
    <div role="dialog" aria-label={etiqueta} data-pantalla-resumen style={{ position: 'fixed', inset: 0, zIndex: 95, overflowY: 'auto', fontFamily: 'inherit', background: fondo }}>
      <div style={{ minHeight: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto',
        padding: 'calc(env(safe-area-inset-top, 0px) + 48px) 22px calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>{children}</div>
    </div>, document.body);
}
const Botones = ({ wa, alCerrar, cerrar = 'Cerrar' }) => (
  <div style={{ marginTop: 'auto', paddingTop: 22, display: 'grid', gap: 6 }}>
    {wa && <a href={wa} target="_blank" rel="noreferrer" data-compartir-resumen style={{ height: 52, borderRadius: 15, background: '#1D1D1F', color: '#fff', fontWeight: 700, fontSize: 15.5, display: 'grid', placeItems: 'center', textDecoration: 'none' }}>Compartir con mi coach</a>}
    <button onClick={alCerrar} data-cerrar-resumen style={{ height: 48, border: 'none', background: 'none', fontWeight: 700, fontSize: 15, fontFamily: 'inherit', color: '#3A3A3C', cursor: 'pointer' }}>{cerrar}</button>
  </div>
);

// ── Cierre de ciclo ──
export function PantallaCierre({ cierre, alCerrar }) {
  const [c1] = TONO[cierre.tono];
  const wa = WHATSAPP_COACH ? `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent(textoCierre(cierre))}` : null;
  const k = cierre.ciclo;
  return (
    <Pantalla etiqueta="Cierre de tu ciclo" fondo={`linear-gradient(170deg, ${TONO[cierre.tono][1]} 0%, #F7F6F2 58%)`}>
      <div data-cierre-tono={cierre.tono} style={{ fontSize: 13, fontWeight: 800, color: c1 }}>Cerraste tu ciclo · {fechaCortaC(k.desde)} al {fechaCortaC(k.hasta)}</div>
      <div style={{ fontSize: 33, fontWeight: 800, color: TEXT, letterSpacing: '-0.03em', lineHeight: 1.04, marginTop: 6 }}>
        {cierre.titulo[0]}<br /><span style={{ color: c1 }}>{cierre.titulo[1]}</span>
      </div>
      <div style={{ fontSize: 15, color: '#55565B', marginTop: 9, lineHeight: 1.4 }}>{cierre.bajada}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
        {cierre.filas.map(f => (
          <div key={f.clave} data-cierre-fila={f.clave} style={{ background: '#fff', borderRadius: 18, padding: '12px 13px' }}>
            <b style={{ display: 'block', fontSize: 23, fontWeight: 800, letterSpacing: '-0.03em', color: TEXT }}>{f.valor}</b>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: MUTED, lineHeight: 1.25, marginTop: 2 }}>{f.etiqueta}</span>
            <div style={{ height: 6, borderRadius: 9, background: '#ECE9E1', marginTop: 8, overflow: 'hidden' }}>
              <i style={{ display: 'block', height: '100%', width: `${Math.round(Math.min(1, f.pct || 0) * 100)}%`, background: f.color, borderRadius: 9 }} />
            </div>
          </div>
        ))}
      </div>
      {cierre.records.length > 0 && (
        <div data-cierre-records style={{ background: '#fff', borderRadius: 18, padding: '12px 14px', marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#8A6400' }}>{cierre.records_n === 1 ? 'Tu récord del ciclo' : `${cierre.records_n} récords este ciclo`}</div>
          {cierre.records.map((x, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '7px 0', borderTop: i ? '1px solid #F1EEE8' : 0 }}>
              <span style={{ fontSize: 14.5, fontWeight: 650, color: '#3A3A3C', minWidth: 0 }}>{x.nombre}{x.kg ? <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: MUTED }}>{num(x.kg)} kg{x.reps ? ` × ${x.reps}` : ''}</span> : null}</span>
              <b style={{ flex: 'none', fontSize: 17, fontWeight: 800, color: '#2F7F45' }}>+{num(x.sube)} kg <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>1RM</span></b>
            </div>
          ))}
        </div>
      )}
      {cierre.foco && <div data-cierre-foco style={{ background: '#1F1F1F', color: '#fff', borderRadius: 18, padding: '12px 14px', marginTop: 8, fontSize: 14, lineHeight: 1.4 }}>{cierre.foco}</div>}
      <Botones wa={wa} alCerrar={alCerrar} cerrar="Empezar mi ciclo nuevo" />
    </Pantalla>
  );
}

// ── Tu balance ──
function usarFotos(name, b) {
  const [f, setF] = useState(null);
  useEffect(() => {
    let vivo = true;
    if (!name || !b) return undefined;
    api.fotos(name).then(r => {
      if (!vivo || !r || !r.ok) return;
      const cerca = (fecha, rango) => (r.fotos || []).filter(x => Math.abs((Date.parse(x.fecha) - Date.parse(fecha)) / 86400000) <= rango)
        .sort((x, y) => (x.pose === 'frente' ? -1 : 1) - (y.pose === 'frente' ? -1 : 1))[0] || null;
      const ahora = cerca(b.fecha, 3), antes = b.previo ? cerca(b.previo, 7) : null;
      setF(ahora || antes ? { ahora, antes: antes && (!ahora || antes.id !== ahora.id) ? antes : null } : null);
    }).catch(() => {});
    return () => { vivo = false; };
  }, [name, b && b.clave]);   // eslint-disable-line react-hooks/exhaustive-deps
  return f;
}
const Foto = ({ f, rotulo }) => (
  <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#E7E2D8', aspectRatio: '3 / 4' }}>
    {f && <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    <span style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(255,255,255,.92)', borderRadius: 99, padding: '3px 9px', fontSize: 11.5, fontWeight: 800 }}>{rotulo}</span>
  </div>
);
export function PantallaBalance({ name, balance, alCerrar }) {
  const fotos = usarFotos(name, balance);
  const wa = WHATSAPP_COACH ? `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent(textoBalance(balance))}` : null;
  return (
    <Pantalla etiqueta="Tu balance" fondo="linear-gradient(170deg, #FCEFE4 0%, #F7F6F2 58%)">
      <div style={{ fontSize: 13, fontWeight: 800, color: '#C9672B' }}>Tu balance · {fechaCortaC(balance.fecha)}{balance.dias ? ` · ${balance.dias} días` : ''}</div>
      <div data-balance-titulo style={{ fontSize: 33, fontWeight: 800, color: TEXT, letterSpacing: '-0.03em', lineHeight: 1.04, marginTop: 6 }}>
        {balance.titulo[0]}<br /><span style={{ color: '#46965A' }}>{balance.titulo[1]}</span>
      </div>
      <div style={{ fontSize: 15, color: '#55565B', marginTop: 9, lineHeight: 1.4 }}>{balance.bajada}</div>
      {fotos && (
        <div data-balance-fotos style={{ display: 'grid', gridTemplateColumns: fotos.ahora && fotos.antes ? '1fr 1fr' : '1fr', gap: 8, marginTop: 14 }}>
          {fotos.antes && <Foto f={fotos.antes} rotulo={fechaCortaC(String(fotos.antes.fecha).slice(0, 10))} />}
          {fotos.ahora && <Foto f={fotos.ahora} rotulo={`Ahora · ${fechaCortaC(String(fotos.ahora.fecha).slice(0, 10))}`} />}
        </div>
      )}
      <div data-balance-tabla style={{ background: '#fff', borderRadius: 18, padding: '12px 14px', marginTop: 12, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px 14px', alignItems: 'baseline' }}>
        <span /><span style={{ fontSize: 11.5, fontWeight: 800, color: '#8A8A8E', textAlign: 'right' }}>{balance.previo ? fechaCortaC(balance.previo) : ''}</span><span style={{ fontSize: 11.5, fontWeight: 800, color: '#8A8A8E', textAlign: 'right' }}>{balance.previo ? 'Cambio' : 'Hoy'}</span>
        {balance.filas.map(f => (
          <React.Fragment key={f.clave}>
            <span style={{ fontSize: 15, fontWeight: 650, color: '#3A3A3C' }}>{f.etiqueta}</span>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: '#8A8A8E', textAlign: 'right' }}>{f.previo != null ? `${num(f.previo)} ${f.unidad}` : ''}</span>
            <b data-balance-fila={f.clave} style={{ fontSize: 18, fontWeight: 800, color: f.color, textAlign: 'right' }}>{f.cambio != null ? conSigno(f.cambio) : `${num(f.actual)} ${f.unidad}`}</b>
          </React.Fragment>
        ))}
      </div>
      <Botones wa={wa} alCerrar={alCerrar} />
    </Pantalla>
  );
}
