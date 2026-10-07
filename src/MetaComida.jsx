// ─────────────────────────────────────────────────────────────────────────
// META DE COMIDA CUMPLIDA · visual nueva
//
// La hermana de la hoja de «Entreno hecho»: cuando lo registrado llega a la
// meta de calorías del día (o cierra las cuatro metas, el «día perfecto»),
// sube una tarjeta con la kettlebell verde comiendo (la hermana de la de
// «Entreno hecho») sobre las manchas verdes de
// Alimentación, confeti en los colores de la sección, las calorías contando
// hasta la meta y cómo quedó cada macro.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { Confeti, Conteo, asegurarCSS, vibrar } from './Celebraciones.jsx';
import { IlustracionMetaComida } from './IlustracionesHoy.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT, C_PROTEIN, C_CARBS, C_FAT } from './theme.js';

const VERDE = '#2F7F45';
const COLORES = ['#46965A', '#7CC492', '#F2C14E', '#F6E2A0', '#A8D5B3'];
const CSS = `
@keyframes mc-fondo { from { opacity: 0 } to { opacity: 1 } }
@keyframes mc-sube { from { opacity: 0; transform: translateY(24px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes mc-salta { 0% { transform: translateY(14px) scale(.9); opacity: 0 } 60% { transform: translateY(-4px) scale(1.02); opacity: 1 } 100% { transform: none } }
@keyframes mc-llena { from { transform: scaleX(0) } to { transform: scaleX(1) } }
[data-meta-comida] { animation: mc-fondo .25s ease both }
[data-meta-comida] .mc-tarjeta { animation: mc-sube .45s cubic-bezier(.2,.8,.2,1) both }
[data-meta-comida] .mc-dibujo { animation: mc-salta .7s .12s cubic-bezier(.2,.8,.2,1) both }
[data-meta-comida] .mc-llena { transform-origin: left center; animation: mc-llena 1s .3s cubic-bezier(.22,.8,.24,1) both }
@media (prefers-reduced-motion: reduce) { [data-meta-comida], [data-meta-comida] * { animation: none !important } }`;

const MACROS = [
  { k: 'p', nombre: 'Proteína', color: C_PROTEIN },
  { k: 'c', nombre: 'Carbohidrato', color: C_CARBS },
  { k: 'g', nombre: 'Grasa', color: C_FAT },
];

export default function MetaComida({ totals, goals, perfecto = false, alCerrar }) {
  useEffect(() => { asegurarCSS(); vibrar([20, 50, 20, 50, 40]); }, []);
  const meta = Math.round(goals?.kcal || 0);
  const kcal = Math.round(totals?.kcal || 0);
  return (
    <div data-meta-comida onClick={alCerrar} style={{
      position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(31,31,28,0.42)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <style>{CSS}</style>
      <Confeti y="34%" piezas={34} colores={COLORES} />
      <div className="mc-tarjeta" onClick={e => e.stopPropagation()} style={{
        background: '#FFFFFF', borderRadius: 28, maxWidth: 380, width: '100%', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)', maxHeight: '88vh', overflowY: 'auto', fontFamily: 'inherit',
      }}>
        <div style={{ position: 'relative', height: 160, background: 'radial-gradient(70% 90% at 72% 12%, #9CCFA8 0%, rgba(156,207,168,0) 70%), radial-gradient(60% 80% at 12% 92%, #F7E1A0 0%, rgba(247,225,160,0) 70%), #EEF7F0', display: 'grid', placeItems: 'end center' }}>
          <div className="mc-dibujo" style={{ width: 230, height: 142, marginBottom: 4 }}><IlustracionMetaComida /></div>
        </div>
        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: TEXT, letterSpacing: '-0.03em', lineHeight: 1.08 }}>
            {perfecto ? 'Día perfecto.' : 'Meta del día, cumplida.'}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: VERDE, letterSpacing: '-0.01em', lineHeight: 1.3, marginTop: 4 }}>
            {perfecto ? 'Las cuatro metas, dentro del 5 %.' : 'Comer bien también es entrenar.'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 16 }}>
            <b style={{ fontSize: 30, fontWeight: 800, color: TEXT, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}><Conteo valor={kcal} ms={1000} /></b>
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT_LIGHT }}>/ {meta.toLocaleString('es-CO')} kcal</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: '#EEEAE1', marginTop: 8, overflow: 'hidden' }}>
            <div className="mc-llena" style={{ height: '100%', width: `${meta ? Math.min(100, Math.round((kcal / meta) * 100)) : 100}%`, borderRadius: 99, background: 'linear-gradient(90deg, #7CC492, #46965A)' }} />
          </div>
          <div data-meta-macros style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
            {MACROS.map(m => {
              const v = Math.round(totals?.[m.k] || 0), g = Math.round(goals?.[m.k] || 0);
              return (
                <div key={m.k} style={{ background: '#F4F1EB', borderRadius: 14, padding: '10px 10px 9px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>{m.nombre}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: '-0.02em', marginTop: 2 }}>
                    <Conteo valor={v} ms={900} /><span style={{ fontSize: 12.5, color: TEXT_LIGHT, fontWeight: 600 }}>{g ? ` / ${g} g` : ' g'}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: '#E6E1D6', marginTop: 6, overflow: 'hidden' }}>
                    <div className="mc-llena" style={{ height: '100%', width: `${g ? Math.min(100, Math.round((v / g) * 100)) : 0}%`, background: m.color, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={alCerrar} style={{
            width: '100%', marginTop: 18, padding: '14px 18px', borderRadius: 14, border: 0,
            background: TEXT, color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Seguir</button>
        </div>
      </div>
    </div>
  );
}
