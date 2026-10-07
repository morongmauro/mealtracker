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
import React, { useEffect, useRef } from 'react';
import { ChartLineUp, Barbell, ForkKnife, GraduationCap, SquaresFour } from '@phosphor-icons/react';
import { SECCION, DASH_AZUL } from './theme.js';

export const ICONO_SECCION = { dash: ChartLineUp, entreno: Barbell, comida: ForkKnife, aprende: GraduationCap };
export const NOMBRE_SECCION = { dash: 'Dash', entreno: 'Entrenamiento', comida: 'Alimentación', aprende: 'Aprendizaje' };
// Rótulo corto bajo el ícono de las secciones cerradas: un ícono solo no
// siempre se entiende, y con el nombre se sabe dónde tocar.

const CORTO = { dash: 'Dash', entreno: 'Entreno', comida: 'Comida', aprende: 'Aprende' };

// secciones: [{ id, subs: [{ id, label, icono? }] }] en el orden de la barra.
// punto: { [seccionId]: true } para el aviso de novedad.
export default function BarraV2({ secciones, seccion, sub, alSeccion, alSub, punto = {}, barRef, oculta }) {
  const grupoRef = useRef(null);

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
  return (
    <div ref={barRef} className="fixed left-0 right-0 bottom-0" style={{
      zIndex: 45, pointerEvents: 'none',
      padding: '0 10px calc(10px + env(safe-area-inset-bottom, 0px))',
      display: oculta ? 'none' : 'block',
    }}>
      <style>{`
        .bv2-cristal {
          background: linear-gradient(180deg, rgba(255,255,255,0.58), rgba(255,255,255,0.40));
          -webkit-backdrop-filter: blur(22px) saturate(185%);
          backdrop-filter: blur(22px) saturate(185%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85), inset 0 0 0 1px rgba(255,255,255,0.45),
            0 10px 30px rgba(40,44,30,0.14), 0 1px 3px rgba(40,44,30,0.08);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .bv2-cristal { background: rgba(250,250,246,0.94); }
        }
        .bv2-grupo { scrollbar-width: none; }
        .bv2-grupo::-webkit-scrollbar { display: none; }
        @keyframes bv2Abre { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        .bv2-abre { animation: bv2Abre .26s cubic-bezier(.2,.7,.2,1); }
        .bv2-btn { -webkit-tap-highlight-color: transparent; touch-action: manipulation; transition: transform .12s ease, background-color .2s ease, color .2s ease; }
        .bv2-btn:active { transform: scale(.94); }
      `}</style>
      <nav aria-label="Secciones" className="bv2-cristal" style={{
        pointerEvents: 'auto', maxWidth: 460, margin: '0 auto', borderRadius: 999,
        display: 'flex', alignItems: 'center', gap: 4, padding: 5,
      }}>
        {secciones.map(s => {
          // El Dash en la barra va en azul, como su cabecera (el amarillo
          // de SECCION.dash queda para los recordatorios).
          const c = s.id === 'dash' ? DASH_AZUL : SECCION[s.id];
          const Icono = ICONO_SECCION[s.id];
          const abierta = s.id === seccion;
          if (!abierta) {
            return (
              <button key={s.id} className="bv2-btn" onClick={() => alSeccion(s.id)}
                aria-label={NOMBRE_SECCION[s.id]} title={NOMBRE_SECCION[s.id]}
                style={{
                  // Se encogen antes que el grupo abierto: en un teléfono
                  // angosto ceden espacio a las opciones, que son las que
                  // tienen texto.
                  flex: muyApretada ? '1 1 34px' : apretada ? '1 1 40px' : '1 1 48px', minWidth: muyApretada ? 34 : apretada ? 38 : 47, height: 48, borderRadius: 999, border: 'none',
                  background: 'transparent', color: '#6A6860', position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 1, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                }}>
                <Icono size={21} weight="regular" />
                {!apretada && <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{CORTO[s.id]}</span>}
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
          const subs = sinSubs ? [{ id: '_', label: NOMBRE_SECCION[s.id], icono: Icono }] : s.subs;
          return (
            <div key={s.id} ref={grupoRef} className="bv2-grupo bv2-abre" role="group" aria-label={NOMBRE_SECCION[s.id]}
              style={{
                flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: 2,
                background: c.tint, borderRadius: 999, padding: 4, overflowX: 'auto',
              }}>
              {/* El ícono de la sección se queda a la vista con sus opciones
                  abiertas: se sabe en qué parte de la app se está. */}
              {!sinSubs && !muyApretada && (
                <span aria-hidden="true" data-icono-seccion={s.id} style={{
                  flex: 'none', display: 'grid', placeItems: 'center', width: 22, height: 38, marginLeft: 3, color: c.ink,
                }}><Icono size={20} weight="fill" /></span>
              )}
              {subs.map(o => {
                const activo = o.id === sub || sinSubs;
                const SubIcono = o.icono;
                return (
                  <button key={o.id} className="bv2-btn" data-activo={activo ? '1' : '0'}
                    onClick={() => alSub(s.id, o.id)}
                    aria-current={activo ? 'page' : undefined}
                    aria-label={o.aria || o.label}
                    style={{
                      flex: 'none', height: 38, borderRadius: 999, border: 'none', cursor: 'pointer',
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
