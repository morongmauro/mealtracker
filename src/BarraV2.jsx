// ─────────────────────────────────────────────────────────────────────────
// BARRA DE SECCIONES · visual nueva (v2)
//
// Cuatro secciones: Dash, Entrenamiento, Alimentación y Aprendizaje. La que
// está abierta se despliega de lado y enseña sus opciones; las otras tres se
// quedan en su ícono. Así la barra nunca crece hacia arriba ni tapa más
// pantalla, y la sección en la que estás se ve de un vistazo por su color.
//
// Cristal de verdad: casi transparente, con desenfoque y saturación, para
// que lo que pasa por detrás se adivine. El borde claro de arriba es el que
// separa la barra del contenido; no hace falta sombra pesada.
// ─────────────────────────────────────────────────────────────────────────
import { vibrar } from './vibrar.js';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChartLineUp, Barbell, ForkKnife, GraduationCap, SquaresFour, Compass, Brain } from '@phosphor-icons/react';
import { SECCION, DASH_AZUL } from './theme.js';
import { enPrueba } from './vistaApp.js';

export const ICONO_SECCION = { dash: ChartLineUp, entreno: Barbell, comida: ForkKnife, aprende: GraduationCap };
// Vista en prueba: los mismos íconos que van dentro del blob de cada cabecera
// (brújula, mancuerna, cubiertos y mente): un solo idioma en toda la app.
const ICONO_PRUEBA = { dash: Compass, entreno: Barbell, comida: ForkKnife, aprende: Brain };
export const NOMBRE_SECCION = { dash: 'Dash', entreno: 'Entrenamiento', comida: 'Alimentación', aprende: 'Aprendizaje' };

// ¿Sin movimiento? (ajuste del teléfono): el cambio es directo, sin viaje.
const sinMovimiento = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
// Duración del viaje del cristal entre secciones y de la pastilla entre opciones.
const PASTILLA_MS = 260;
const CURVA = 'cubic-bezier(.2,.8,.2,1)';

// secciones: [{ id, subs: [{ id, label, icono? }] }] en el orden de la barra.
// punto: { [seccionId]: true } para el aviso de novedad.
export default function BarraV2({ secciones, seccion, sub, alSeccion, alSub, punto = {}, barRef, oculta }) {
  const grupoRef = useRef(null);
  const navRef = useRef(null);
  // Dónde estaba el cristal de la sección abierta (relativo a la barra) la
  // última vez que se pintó, y qué sección era: con eso el cristal VIAJA de
  // ahí a la nueva en vez de cambiar de golpe.
  const antes = useRef(null);
  const ultimaSub = useRef(null);

  // ── Al cambiar de sección: nada viaja. El grupo nuevo aparece con un
  // fundido suave (CSS, ver .bv2-grupo) y los botones cerrados se deslizan a
  // su sitio nuevo en vez de saltar (solo transform: compositor). ──
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const nr = nav.getBoundingClientRect();
    const botones = {};
    nav.querySelectorAll('[data-seccion-boton]').forEach(b => { botones[b.getAttribute('data-seccion-boton')] = b.getBoundingClientRect().left - nr.left; });
    const prev = antes.current;
    antes.current = { seccion, botones };
    if (!prev || prev.seccion === seccion || sinMovimiento()) return undefined;
    Object.keys(botones).forEach(id => {
      const b = nav.querySelector(`[data-seccion-boton="${id}"]`);
      const antesX = prev.botones && prev.botones[id];
      if (!b || antesX == null || !b.animate || id === prev.seccion) return;
      const dx = antesX - botones[id];
      if (Math.abs(dx) > 0.5) b.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: PASTILLA_MS, easing: CURVA });
    });
    return undefined;
  }, [seccion]);

  // ── La pastilla blanca viaja entre las opciones de la misma sección ──
  useLayoutEffect(() => {
    const g = grupoRef.current;
    const act = g && g.querySelector('[data-activo="1"]');
    const prev = ultimaSub.current;
    ultimaSub.current = act ? { seccion, rect: act.getBoundingClientRect() } : null;
    if (!act || !prev || prev.seccion !== seccion || sinMovimiento() || typeof act.animate !== 'function') return;
    const a = prev.rect, b = act.getBoundingClientRect();
    if (Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1) return;
    const dx = a.left - b.left, sx = a.width / Math.max(1, b.width);
    act.animate([{ transform: `translateX(${dx}px) scaleX(${sx})`, transformOrigin: '0 50%' }, { transform: 'none', transformOrigin: '0 50%' }], { duration: PASTILLA_MS, easing: CURVA });
  }, [seccion, sub]);

  // Si el grupo abierto no cabe (teléfonos angostos), se asegura que la
  // opción activa quede a la vista.
  useEffect(() => {
    const g = grupoRef.current;
    if (!g) return;
    const act = g.querySelector('[data-activo="1"]');
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [seccion, sub]);

  // Con cuatro opciones abiertas (Alimentación) o con textos largos
  // (Aprendizaje: Hoy · Onboarding · Cápsulas), las secciones cerradas se
  // quedan solo en su ícono para dejarles sitio.
  const subsAbiertas = (secciones.find(x => x.id === seccion) || {}).subs || [];
  const apretada = subsAbiertas.length >= 4 || subsAbiertas.reduce((n, x) => n + String(x.label || '').length, 0) > 20;
  // Cuatro opciones con texto (Aprendizaje): todavía más compacta y sin el
  // ícono de la sección, para que quepan enteras en un teléfono de 375 px.
  const muyApretada = subsAbiertas.filter(x => x.label).length >= 4;
  // Vista en prueba: la barra flota más separada de los bordes del teléfono
  // y es un poco más alta; detrás, lo que pasa se desvanece hacia blanco
  // para que el texto de abajo nunca se mezcle con el de la barra.
  const P = enPrueba();
  return (
    <div ref={barRef} className="fixed left-0 right-0 bottom-0" style={{
      zIndex: 45, pointerEvents: 'none',
      padding: P ? '0 18px calc(14px + env(safe-area-inset-bottom, 0px))' : '0 10px calc(10px + env(safe-area-inset-bottom, 0px))',
      display: oculta ? 'none' : 'block',
    }}>
      {P && <div aria-hidden="true" data-velo-barra style={{
        // El desvanecido pasa DETRÁS de la barra, no antes: el velo mide lo
        // que mide la barra y se funde a blanco justo donde el contenido
        // entra debajo de ella.
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 'calc(100% + 6px)', pointerEvents: 'none',
        background: 'linear-gradient(0deg, rgba(252,252,253,0.97) 0%, rgba(252,252,253,0.9) 42%, rgba(252,252,253,0.55) 76%, rgba(252,252,253,0) 100%)',
      }} />}
      <style>{`
        .bv2-cristal {
          /* Liquid Glass (opción B): muy transparente (blanco 22→8→16 %),
             desenfoque de 24 px con más color, filo de luz arriba y abajo,
             banda interior de luz, sombra interior abajo y reflejo
             arriba‑izquierda (::before), como una lente gruesa. */
          position: relative;
          background: linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.16) 100%);
          -webkit-backdrop-filter: blur(24px) saturate(1.6) brightness(1.03);
          backdrop-filter: blur(24px) saturate(1.6) brightness(1.03);
          box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -1.5px 0 rgba(255,255,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.45),
            inset 0 0 22px rgba(255,255,255,0.45), inset 0 -12px 18px rgba(30,30,40,0.07), inset 0 10px 16px rgba(30,30,40,0.04),
            0 16px 40px rgba(40,44,30,0.14), 0 1px 2px rgba(40,44,30,0.06);
        }
        .bv2-cristal::before {
          content: ''; position: absolute; inset: 0; border-radius: 999px; pointer-events: none;
          background: radial-gradient(60% 70% at 18% 12%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .bv2-cristal { background: rgba(250,250,246,0.94); }
        }
        .bv2-grupo { scrollbar-width: none; }
        .bv2-grupo::-webkit-scrollbar { display: none; }
        .bv2-btn { -webkit-tap-highlight-color: transparent; touch-action: manipulation; transition: transform .12s ease, background-color .2s ease, color .2s ease; }
        .bv2-btn:active { transform: scale(.94); }
        @keyframes bv2Aparece { from { opacity: 0; } to { opacity: 1; } }
        .bv2-grupo { animation: bv2Aparece .3s ease-out; }
      `}</style>
      <nav ref={navRef} aria-label="Secciones" className="bv2-cristal" style={{
        pointerEvents: 'auto', maxWidth: 460, margin: '0 auto', borderRadius: 999, position: 'relative',
        display: 'flex', alignItems: 'center', gap: 4, padding: P ? 6 : 5, transformOrigin: '50% 100%',
      }}>
        {secciones.map(s => {
          // El Dash en la barra va en azul, como su cabecera (el amarillo
          // de SECCION.dash queda para los recordatorios).
          const c = s.id === 'dash' ? DASH_AZUL : SECCION[s.id];
          const Icono = (enPrueba() ? ICONO_PRUEBA : ICONO_SECCION)[s.id];
          const abierta = s.id === seccion;
          if (!abierta) {
            return (
              <button key={s.id} className="bv2-btn" data-seccion-boton={s.id} onClick={() => { vibrar('tic'); alSeccion(s.id); }}
                aria-label={NOMBRE_SECCION[s.id]} title={NOMBRE_SECCION[s.id]}
                style={{
                  // Se encogen antes que el grupo abierto: en un teléfono
                  // angosto ceden espacio a las opciones, que son las que
                  // tienen texto.
                  flex: muyApretada ? '1 1 34px' : apretada ? '1 1 38px' : '1 1 42px', minWidth: muyApretada ? 34 : apretada ? 36 : 40, height: P ? 54 : 48, borderRadius: 999, border: 'none',
                  background: 'transparent', color: '#6A6860', position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 1, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                }}>
                {/* Una sola regla en todas las secciones: la abierta enseña sus
                    opciones con nombre; las cerradas, solo su ícono (con nombre
                    no cabían y «Galería» se cortaba). */}
                <Icono size={22} weight="regular" />
                {punto[s.id] && (
                  // El puntito de novedad, en el color de la sección: se queda
                  // hasta que la persona entra a ver qué hay.
                  <span aria-hidden="true" data-punto={s.id} style={{
                    position: 'absolute', top: 5, right: '50%', marginRight: -15, width: 9, height: 9, borderRadius: 99,
                    background: s.id === 'dash' ? '#E0A21A' : c.base, boxShadow: '0 0 0 2px rgba(255,255,255,0.95)',
                  }} />
                )}
              </button>
            );
          }
          // La sección abierta: sus opciones sobre el cristal teñido de su
          // color. Si no tiene opciones (el Dash) va su ícono con su nombre.
          const sinSubs = !(s.subs && s.subs.length);
          // Vista en prueba: el Dash se arma igual que las demás (su ícono
          // sobre el color y la pastilla blanca con el nombre); antes la
          // pastilla tapaba todo el color y quedaba solo un aro azul alrededor.
          const comoLasDemas = sinSubs && enPrueba();
          const subs = sinSubs ? [{ id: '_', label: NOMBRE_SECCION[s.id], icono: comoLasDemas ? null : Icono }] : s.subs;
          return (
            <div key={s.id} ref={grupoRef} className="bv2-grupo" role="group" aria-label={NOMBRE_SECCION[s.id]}
              style={{
                flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: 2,
                background: c.tint, borderRadius: 999, padding: P ? 5 : 4, overflowX: 'auto',
              }}>
              {/* El ícono de la sección se queda a la vista con sus opciones
                  abiertas: se sabe en qué parte de la app se está. */}
              {(!sinSubs || comoLasDemas) && !muyApretada && (
                <span aria-hidden="true" data-icono-seccion={s.id} style={{
                  flex: 'none', display: 'grid', placeItems: 'center', width: 22, height: P ? 44 : 38, marginLeft: 3, color: c.ink,
                }}><Icono size={20} weight="fill" /></span>
              )}
              {subs.map(o => {
                const activo = o.id === sub || sinSubs;
                const SubIcono = o.icono;
                return (
                  <button key={o.id} className="bv2-btn" data-activo={activo ? '1' : '0'}
                    onClick={() => { vibrar('tic'); alSub(s.id, o.id); }}
                    aria-current={activo ? 'page' : undefined}
                    aria-label={o.aria || o.label}
                    style={{
                      flex: 'none', height: P ? 44 : 38, borderRadius: 999, border: 'none', cursor: 'pointer',
                      padding: SubIcono && !o.label ? '0 9px' : SubIcono ? '0 12px 0 10px' : muyApretada ? '0 6px' : apretada ? '0 7px' : '0 9px',
                      // La activa es una pastilla de cristal blanco con la letra
                      // en el color de la sección: se distingue sin gritar.
                      background: activo ? 'rgba(255,255,255,0.92)' : 'transparent',
                      color: c.ink, opacity: activo ? 1 : 0.8,
                      fontFamily: 'inherit', fontSize: muyApretada ? 12 : apretada ? 12.5 : 13, fontWeight: activo ? 700 : 600,
                      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: 5,
                      boxShadow: activo ? '0 1px 2px rgba(40,40,30,0.06), 0 4px 12px rgba(40,40,30,0.08)' : 'none',
                    }}>
                    {SubIcono && <SubIcono size={18} weight={activo ? 'fill' : 'regular'} />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export { SquaresFour };
