// ─────────────────────────────────────────────────────────────────────────
// MOVIMIENTO Y GRATIFICACIÓN · visual nueva
//
// Para que la app responda a lo que hace la persona (y no sea una suma de
// hojas quietas): un confeti corto con los colores de la marca, números que
// suben contando, el «+420 kcal» que sube al registrar comida y la clase
// `mt-pop` para lo que se acaba de marcar.
//
// Todo respeta «reducir movimiento» del teléfono: ahí no hay animación, solo
// el resultado final.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';

export const sinMovimiento = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};

export const vibrar = (patron = 12) => { try { navigator.vibrate && navigator.vibrate(patron); } catch (e) { /* sin vibración */ } };

export const CSS_MOVIMIENTO = `
@keyframes mt-pop { 0% { transform: scale(.55) } 55% { transform: scale(1.18) } 100% { transform: scale(1) } }
.mt-pop { animation: mt-pop .38s cubic-bezier(.2,.9,.3,1.3) both; }
@keyframes mt-barrido { from { background-position: 120% 0 } to { background-position: -20% 0 } }
.mt-barrido { background-image: linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.75) 50%, rgba(255,255,255,0) 70%); background-size: 220% 100%; background-repeat: no-repeat; animation: mt-barrido .9s ease-out 1 both; }
@keyframes mt-entra-arriba { from { opacity: 0; transform: translate(-50%, -14px) scale(.96) } to { opacity: 1; transform: translate(-50%, 0) scale(1) } }
@keyframes mt-sale-arriba { to { opacity: 0; transform: translate(-50%, -10px) scale(.98) } }
@keyframes mt-sube { 0% { opacity: 0; transform: translateY(8px) scale(.9) } 25% { opacity: 1; transform: translateY(0) scale(1.04) } 100% { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes mt-confeti { 0% { opacity: 1; transform: translate(0,0) rotate(0) scale(1) } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(.6) } }
@media (prefers-reduced-motion: reduce) {
  .mt-pop, .mt-barrido, .mt-confeti i { animation: none !important; }
}`;

// Deja las animaciones en la página una sola vez (para las piezas que no
// traen su propio <style>).
export function asegurarCSS() {
  try {
    if (document.getElementById('mt-movimiento')) return;
    const st = document.createElement('style'); st.id = 'mt-movimiento'; st.textContent = CSS_MOVIMIENTO;
    document.head.appendChild(st);
  } catch (e) { /* sin documento */ }
}

// Un número que sube contando hasta `valor` (de 0 la primera vez, del valor
// anterior después).
export function useConteo(valor, ms = 700) {
  const [v, setV] = useState(() => (sinMovimiento() ? valor : 0));
  const desde = useRef(sinMovimiento() ? valor : 0);
  useEffect(() => {
    if (sinMovimiento()) { setV(valor); desde.current = valor; return; }
    const a = desde.current, b = Number(valor) || 0, t0 = performance.now();
    let id;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      setV(a + (b - a) * e);
      if (k < 1) id = requestAnimationFrame(paso); else desde.current = b;
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [valor, ms]);
  return v;
}

export function Conteo({ valor, ms, formato = (x) => Math.round(x).toLocaleString('es-CO') }) {
  return <>{formato(useConteo(valor, ms))}</>;
}

// Confeti: piezas de la marca (círculos, barras y rombos) que salen de un
// punto y caen. Sin librerías: cada pieza es un <i> con su recorrido.
const COLORES_MARCA = ['#3C7BD6', '#46965A', '#EE8434', '#E0A21A', '#1F1F1F'];
export function Confeti({ colores = COLORES_MARCA, piezas = 30, x = '50%', y = '30%', alCerrar }) {
  const lista = useMemo(() => Array.from({ length: piezas }, (_, i) => {
    const ang = (Math.PI * 2 * i) / piezas + Math.random() * 0.5;
    const dist = 90 + Math.random() * 120;
    const forma = i % 3;
    return {
      c: colores[i % colores.length],
      dx: `${Math.cos(ang) * dist}px`, dy: `${Math.sin(ang) * dist + 140}px`, rot: `${Math.round(Math.random() * 540 - 270)}deg`,
      w: forma === 1 ? 4 : 8, h: forma === 1 ? 14 : 8, r: forma === 0 ? '50%' : forma === 2 ? '2px' : '2px',
      d: Math.random() * 0.12, dur: 0.95 + Math.random() * 0.5, giro: forma === 2 ? 'rotate(45deg)' : 'none',
    };
  }), [piezas, colores]);
  useEffect(() => {
    if (!alCerrar) return;
    const t = setTimeout(alCerrar, 1700);
    return () => clearTimeout(t);
  }, [alCerrar]);
  if (sinMovimiento()) return null;
  return (
    <div className="mt-confeti" aria-hidden="true" style={{ position: 'fixed', left: x, top: y, width: 0, height: 0, zIndex: 80, pointerEvents: 'none' }}>
      <style>{CSS_MOVIMIENTO}</style>
      {lista.map((p, i) => (
        <i key={i} style={{
          position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, borderRadius: p.r, background: p.c, display: 'block',
          '--dx': p.dx, '--dy': p.dy, '--rot': p.rot, transform: p.giro,
          animation: `mt-confeti ${p.dur}s cubic-bezier(.15,.7,.35,1) ${p.d}s both`,
        }} />
      ))}
    </div>
  );
}

// El aviso que sale al registrar comida: «+420 kcal», cuánto lleva del día y
// una barra que avanza desde donde estaba. Si con esto llega a la meta, lo dice.
export function AvisoSuma({ evento, alCerrar }) {
  const { suma, antes = 0, ahora = 0, meta = 0, enMeta } = evento;
  const pctAntes = meta ? Math.min(100, (antes / meta) * 100) : 0;
  const pctAhora = meta ? Math.min(100, (ahora / meta) * 100) : 0;
  const [pct, setPct] = useState(pctAntes);
  const [saliendo, setSaliendo] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setPct(pctAhora), sinMovimiento() ? 0 : 180);
    const b = setTimeout(() => setSaliendo(true), enMeta ? 3200 : 2400);
    const c = setTimeout(alCerrar, enMeta ? 3500 : 2700);
    vibrar(enMeta ? [18, 40, 18, 40, 30] : 14);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const verde = '#2A6A3A';
  return (
    <>
      <style>{CSS_MOVIMIENTO}</style>
      {enMeta && <Confeti y="18%" />}
      <div role="status" data-aviso-suma onClick={alCerrar} style={{
        position: 'fixed', left: '50%', top: 'calc(70px + env(safe-area-inset-top, 0px))', zIndex: 75, width: 'min(88vw, 360px)',
        background: '#FFFFFF', borderRadius: 20, padding: '14px 16px', boxShadow: '0 14px 40px rgba(30,40,30,0.18)',
        animation: `${saliendo ? 'mt-sale-arriba .3s ease-in both' : 'mt-entra-arriba .42s cubic-bezier(.2,.9,.3,1.2) both'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: verde, animation: 'mt-sube .5s ease-out both' }}>
            +<Conteo valor={suma} ms={600} /> kcal
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#6B6B6B' }}>{enMeta ? '¡Día en tu meta!' : 'registrado'}</span>
        </div>
        {meta > 0 && (
          <>
            <div style={{ height: 8, borderRadius: 99, background: '#ECEAE3', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #7CC492, #46965A)', transition: 'width .9s cubic-bezier(.22,.8,.24,1)' }} />
            </div>
            <div style={{ fontSize: 13.5, color: '#6B6B6B', marginTop: 7, fontWeight: 600 }}>
              Vas en {Math.round((ahora / meta) * 100)} % de tu día · {Math.max(0, Math.round(meta - ahora)).toLocaleString('es-CO')} kcal por delante
            </div>
          </>
        )}
      </div>
    </>
  );
}
