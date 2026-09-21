// ─────────────────────────────────────────────────────────────────────────
// PIEZAS COMPARTIDAS
//
// Botones, tarjetas, chips y la hoja que sube desde abajo. Viven aquí para
// que las seis pantallas se vean como UNA app y no como seis.
//
// JERARQUÍA VISUAL — la regla que manda en todo el módulo:
//
//   La rutina de FUERZA es lo importante. Todo lo demás —cardio, deportes,
//   caminatas, eventos— se pinta apagado. No es un capricho estético: el
//   cliente abre el calendario para saber qué le toca entrenar, y si la
//   natación del martes compite visualmente con el Push del lunes, se
//   distrae de lo único que no puede saltarse.
//
//   En la práctica: la fuerza va en OLIVA sólido, con peso y tamaño; lo
//   complementario va en gris con un punto de color pequeño. Se ve, se
//   puede tocar, se puede registrar — pero no grita.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { ACCENT, ACCENT_DARK, ACCENT_PASTEL, ACCENT_LIGHT, SURFACE, SURFACE_2,
         BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT, SUCCESS, WARN, DANGER,
         SHADOW_CARD, SHADOW_OVERLAY, FONT_DISPLAY } from './theme.js';

// ── Tarjeta ───────────────────────────────────────────────────────────────
export function Card({ children, style, onClick, apagada = false, ...resto }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        background: apagada ? 'transparent' : SURFACE,
        border: `1px solid ${apagada ? BORDER_SOFT : BORDER}`,
        borderRadius: 18,
        padding: 16,
        boxShadow: apagada ? 'none' : SHADOW_CARD,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      {...resto}
    >{children}</div>
  );
}

// ── Botones ───────────────────────────────────────────────────────────────
// `principal` = grafito, la acción que el cliente vino a hacer.
// `marca`     = oliva, confirmación y éxito.
// `suave`     = contorno, todo lo demás.
export function Boton({ children, variante = 'principal', ancho = false, chico = false,
                        disabled, onClick, style, ...resto }) {
  const base = {
    border: '1px solid transparent',
    borderRadius: 999,
    padding: chico ? '7px 14px' : '13px 22px',
    fontSize: chico ? 13 : 15,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    width: ancho ? '100%' : undefined,
    opacity: disabled ? 0.45 : 1,
    transition: 'transform .08s, opacity .12s',
    fontFamily: 'inherit',
  };
  const skins = {
    principal: { background: TEXT, color: '#fff' },
    marca:     { background: ACCENT, color: '#fff' },
    suave:     { background: 'transparent', color: TEXT, borderColor: BORDER },
    peligro:   { background: 'transparent', color: DANGER, borderColor: DANGER },
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick}
            style={{ ...base, ...skins[variante], ...style }} {...resto}>
      {children}
    </button>
  );
}

// ── Etiquetas ─────────────────────────────────────────────────────────────
export function Chip({ children, tono = 'neutro', style }) {
  const tonos = {
    neutro:  { background: SURFACE_2, color: TEXT_MUTED },
    marca:   { background: ACCENT_LIGHT, color: ACCENT_DARK },
    suave:   { background: 'transparent', color: TEXT_LIGHT, border: `1px solid ${BORDER}` },
    ok:      { background: '#E6EFE4', color: '#40613F' },
    aviso:   { background: '#F6EADB', color: WARN },
  };
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, lineHeight: 1.6,
      padding: '1px 9px', borderRadius: 999, whiteSpace: 'nowrap',
      ...tonos[tono], ...style,
    }}>{children}</span>
  );
}

// ── Títulos ───────────────────────────────────────────────────────────────
export function Titulo({ children, style }) {
  return (
    <h1 style={{
      fontFamily: FONT_DISPLAY, fontSize: 30, letterSpacing: '.02em',
      margin: '0 0 2px', color: TEXT, fontWeight: 400, ...style,
    }}>{children}</h1>
  );
}

export function Seccion({ children, accion, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 8, margin: '22px 0 10px', ...style,
    }}>
      <h2 style={{
        fontSize: 12, fontWeight: 800, letterSpacing: '.08em',
        textTransform: 'uppercase', color: TEXT_LIGHT, margin: 0,
      }}>{children}</h2>
      {accion}
    </div>
  );
}

// ── Estados que no son contenido ──────────────────────────────────────────
export function Vacio({ icono = '·', titulo, texto, accion }) {
  return (
    <Card style={{ textAlign: 'center', padding: '32px 20px' }}>
      <div style={{ fontSize: 30, marginBottom: 8, opacity: .5 }}>{icono}</div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{titulo}</div>
      {texto && <div style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.55 }}>{texto}</div>}
      {accion && <div style={{ marginTop: 14 }}>{accion}</div>}
    </Card>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div style={{ padding: '28px 0', textAlign: 'center', color: TEXT_LIGHT, fontSize: 13.5 }}>
      {texto}
    </div>
  );
}

// El error se dice y se ofrece reintentar. Un cliente en el gimnasio con
// mala señal no debe quedarse mirando una pantalla en blanco sin saber si
// es la app o es él.
// Se llama `Fallo` y no `Error` a propósito: `Error` es el constructor de
// JavaScript, y un componente con ese nombre lo tapa dentro del archivo que
// lo importe — el primer `throw new Error(...)` de ese archivo fallaría con
// un mensaje incomprensible.
export function Fallo({ motivo, alReintentar }) {
  const frases = {
    sin_red: 'No pude conectarme. Revisa tu señal.',
    sin_cliente: 'No encontré tu ficha. Escríbele a tu coach.',
    sin_crm: 'El servicio no está disponible ahora mismo.',
    no_enviada: 'Tu coach todavía no te envió esta rutina.',
    no_es_suya: 'Esa rutina no es tuya.',
  };
  return (
    <Vacio
      icono="⚠"
      titulo="No pude cargar"
      texto={frases[motivo] || 'Algo falló. Intenta de nuevo en un momento.'}
      accion={alReintentar && <Boton variante="suave" chico onClick={alReintentar}>Reintentar</Boton>}
    />
  );
}

// ── Hoja que sube desde abajo ─────────────────────────────────────────────
// Para el detalle del ejercicio y el registro de actividad. En el teléfono
// una hoja se cierra deslizando y no pierde el contexto de atrás, que es lo
// que se quiere cuando estás a media rutina.
export function Hoja({ abierta, alCerrar, titulo, children, alto = '86vh' }) {
  // Con la hoja abierta, el fondo no debe moverse: en el móvil el scroll se
  // "contagia" a la página de atrás y al cerrar apareces en otro sitio.
  useEffect(() => {
    if (!abierta) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', esc); };
  }, [abierta, alCerrar]);

  if (!abierta) return null;
  return (
    <div
      onClick={alCerrar}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(31,31,31,0.38)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={titulo || 'Detalle'}
        style={{
          background: SURFACE, width: '100%', maxWidth: 560,
          borderRadius: '22px 22px 0 0', boxShadow: SHADOW_OVERLAY,
          maxHeight: alto, display: 'flex', flexDirection: 'column',
        }}>
        {/* La barrita de arrastre va en su propia fila, no superpuesta: al
            posicionarla absoluta sobre la cabecera se cruzaba encima del
            título de los ejercicios con nombre largo. */}
        <div style={{ padding: '8px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: BORDER, margin: '0 auto' }} />
        </div>
        <div style={{
          padding: '8px 18px 10px', borderBottom: `1px solid ${BORDER_SOFT}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{ fontWeight: 800, fontSize: 15, flex: 1, minWidth: 0 }}>{titulo}</div>
          <button onClick={alCerrar} aria-label="Cerrar" style={{
            border: 'none', background: SURFACE_2, color: TEXT_MUTED,
            width: 30, height: 30, borderRadius: 999, fontSize: 15, cursor: 'pointer', flexShrink: 0,
          }}>✕</button>
        </div>
        <div style={{
          padding: '16px 18px calc(26px + env(safe-area-inset-bottom, 0px))',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        }}>{children}</div>
      </div>
    </div>
  );
}

// ── Barra de progreso ─────────────────────────────────────────────────────
export function Barra({ valor, total, tono = ACCENT, alto = 6 }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  return (
    <div style={{ height: alto, background: BORDER_SOFT, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: tono, borderRadius: 999, transition: 'width .3s' }} />
    </div>
  );
}

// ── Marca de lo que pasó ese día ──────────────────────────────────────────
// Un solo carácter. Es lo que responde "¿entrené o no?" de un vistazo.
export const MARCAS = {
  completada: { simbolo: '✓', color: SUCCESS,   titulo: 'Lo hiciste' },
  saltada:    { simbolo: '✕', color: DANGER,    titulo: 'La saltaste' },
  en_curso:   { simbolo: '◐', color: WARN,      titulo: 'La empezaste' },
};

export function Marca({ estado, style }) {
  const m = MARCAS[estado];
  if (!m) return null;
  return (
    <span title={m.titulo} aria-label={m.titulo}
          style={{ color: m.color, fontWeight: 800, fontSize: 13, lineHeight: 1, ...style }}>
      {m.simbolo}
    </span>
  );
}

export { ACCENT, ACCENT_DARK, ACCENT_PASTEL, ACCENT_LIGHT, SURFACE, SURFACE_2,
         BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT, SUCCESS, WARN, DANGER,
         SHADOW_CARD, FONT_DISPLAY };
