// ─────────────────────────────────────────────────────────────────────────
// ÚLTIMA SEMANA DEL CICLO · la ventana
//
// Sale UNA vez por ciclo: el primer día que abra la app dentro de la última
// semana del ciclo (el que sea; si no entró el lunes, el día que entre). Se
// guarda como vista por ciclo (y viaja a la nube), así no vuelve a salir ni
// en otro teléfono. Arriba, la línea del ciclo: las semanas hechas en el
// tono suave, la actual en grafito con el punto amarillo de «estás aquí», y
// el ciclo nuevo en línea punteada. Debajo, la voz del coach con cifras
// reales y dos salidas: «Entendido» y «Ver mi calendario».
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { asegurarCSS, vibrar } from './Celebraciones.jsx';
import { TEMAS } from './CabeceraHoy.jsx';
import { TEXT, TEXT_MUTED } from './theme.js';

const CSS = `
@keyframes ac-fondo { from { opacity: 0 } to { opacity: 1 } }
@keyframes ac-sube { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: none } }
@keyframes ac-chip { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
[data-aviso-ciclo] { animation: ac-fondo .22s ease both }
[data-aviso-ciclo] .ac-tarjeta { animation: ac-sube .42s cubic-bezier(.2,.8,.2,1) both }
[data-aviso-ciclo] .ac-s { animation: ac-chip .35s cubic-bezier(.2,.8,.2,1) both }
@media (prefers-reduced-motion: reduce) { [data-aviso-ciclo], [data-aviso-ciclo] * { animation: none !important } }`;

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const fechaCorta = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : `${DIAS[d.getDay()]} ${d.getDate()}`;
};

// fase: { semanas, semana_actual, nombre } · pendientes: entrenos que quedan
// esta semana · hoyToca: la rutina de hoy (o null) · fin: fecha en que
// termina el ciclo (iso).
export default function AvisoCicloFin({ fase, pendientes = 0, hoyToca = null, fin = null, alCerrar, alCalendario }) {
  useEffect(() => { asegurarCSS(); vibrar(12); }, []);
  const t = TEMAS.entreno;
  const n = Math.max(1, Number(fase?.semanas) || 1);
  // La línea del ciclo: con más de cuatro semanas se resume (S1 … S11 S12).
  const chips = n <= 4 ? Array.from({ length: n }, (_, i) => `S${i + 1}`) : ['S1', '…', `S${n - 1}`, `S${n}`];
  const mancha = (c, extra) => ({ position: 'absolute', borderRadius: '50%', background: `radial-gradient(closest-side, ${c}, ${c}00)`, ...extra });
  const chip = (b, s) => (
    <div style={{ flex: 1, minWidth: 0, background: '#F3F1EB', borderRadius: 16, padding: '10px 12px' }}>
      <b style={{ display: 'block', fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b}</b>
      <span style={{ fontSize: 11.5, color: TEXT_MUTED, lineHeight: 1.25, display: 'block' }}>{s}</span>
    </div>
  );
  return (
    <div data-aviso-ciclo onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 92, background: 'rgba(31,31,28,0.42)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 14px',
    }}>
      <style>{CSS}</style>
      <div className="ac-tarjeta" onClick={e => e.stopPropagation()} role="dialog" aria-label="Última semana del ciclo" style={{
        background: '#FFFFFF', borderRadius: 30, maxWidth: 400, width: '100%', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,.26)', maxHeight: '90vh', overflowY: 'auto', fontFamily: 'inherit',
      }}>
        <div style={{ position: 'relative', height: 150, overflow: 'hidden', background: t.base }}>
          <div style={mancha(t.m1, { width: 240, height: 240, right: -80, top: -120 })} />
          <div style={mancha(`${t.m3}BF`, { width: 200, height: 200, left: -70, bottom: -110 })} />
          <div data-linea-ciclo style={{ position: 'absolute', left: 22, right: 22, top: 50, display: 'flex', gap: 6, alignItems: 'center' }}>
            {chips.map((c, i) => {
              const actual = i === chips.length - 1;
              return (
                <div key={c + i} className="ac-s" style={{
                  flex: actual ? 1.25 : c === '…' ? 0.5 : 1, height: actual ? 40 : 34, borderRadius: actual ? 13 : 12, position: 'relative',
                  background: actual ? '#1D1D1F' : t.t || '#C9CED6', display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 800, color: actual ? '#fff' : '#5F6670', animationDelay: `${0.15 + i * 0.07}s`,
                }}>
                  {c}
                  {actual && <i style={{ position: 'absolute', right: -5, top: -5, width: 14, height: 14, borderRadius: '50%', background: '#F2C94C', border: '2px solid #fff' }} />}
                </div>
              );
            })}
            <div style={{ width: 22, textAlign: 'center', color: '#5F6670', fontWeight: 800 }}>→</div>
            <div className="ac-s" style={{ flex: 1.1, height: 34, borderRadius: 12, border: '2px dashed #5F6670', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#5F6670', animationDelay: '.55s' }}>Ciclo nuevo</div>
          </div>
          <div style={{ position: 'absolute', left: 22, top: 112, fontSize: 11, color: TEXT_MUTED, fontWeight: 700 }}>Estás aquí · semana {n} de {n}</div>
        </div>
        <div style={{ padding: '14px 22px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: TEXT_MUTED }}>Tu ciclo</div>
          <div style={{ fontSize: 27, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1.06, marginTop: 6 }}>
            <div>Última semana.</div><div>Ciérrala fuerte.</div>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 700, color: t.tinta, lineHeight: 1.3, marginTop: 8 }}>
            La próxima semana empieza un ciclo nuevo: cambian algunos ejercicios y sube el reto.
          </div>
          <div data-ciclo-chips style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {chip(String(pendientes), pendientes === 1 ? 'entreno pendiente' : 'entrenos pendientes')}
            {chip(hoyToca || 'Descanso', 'hoy te toca')}
            {fin && fechaCorta(fin) ? chip(fechaCorta(fin), 'termina el ciclo') : chip(`${n}`, 'semanas de ciclo')}
          </div>
          <button data-ciclo-entendido onClick={alCerrar} style={{
            width: '100%', marginTop: 16, padding: '15px 18px', borderRadius: 16, border: 0,
            background: TEXT, color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}>Entendido</button>
          {alCalendario && (
            <button data-ciclo-calendario onClick={alCalendario} style={{
              width: '100%', marginTop: 4, padding: '12px 0 2px', border: 0, background: 'transparent',
              color: '#3C7BD6', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Ver mi calendario</button>
          )}
        </div>
      </div>
    </div>
  );
}
