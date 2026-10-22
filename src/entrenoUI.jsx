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
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lote25 } from './vistaApp.js';
import { vibrar } from './vibrar.js';
import { WarningCircle } from '@phosphor-icons/react';
import { ACCENT as OLIVA, ACCENT_DARK as OLIVA_DARK, ACCENT_PASTEL as OLIVA_PASTEL, ACCENT_LIGHT as OLIVA_LIGHT,
         SURFACE, SURFACE_2, BORDER, BORDER_SOFT, TEXT, TEXT_MUTED, TEXT_LIGHT, SUCCESS as SUCCESS_OLIVA, WARN, DANGER,
         SHADOW_CARD, SHADOW_OVERLAY, FONT_DISPLAY } from './theme.js';

// El acento de Entrenamiento sale de variables CSS: en la visual de siempre
// valen el oliva de la marca; en la visual nueva (html[data-v2], ver
// v2-fuentes.js) valen el azul de Entrenamiento, y los botones «marca» pasan
// a grafito. Así ningún componente del módulo se queda en oliva por olvido.
const ACCENT = `var(--ent-accent, ${OLIVA})`;
const ACCENT_DARK = `var(--ent-accent-dark, ${OLIVA_DARK})`;
const ACCENT_PASTEL = `var(--ent-accent-pastel, ${OLIVA_PASTEL})`;
const ACCENT_LIGHT = `var(--ent-accent-light, ${OLIVA_LIGHT})`;
const SUCCESS = `var(--ent-ok, ${SUCCESS_OLIVA})`;
const BOTON_MARCA = `var(--ent-boton, ${OLIVA})`;

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
    marca:     { background: BOTON_MARCA, color: '#fff' },
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
// Lote 25 · vacío con el blob blanco de la marca y el ícono de línea en el
// color del módulo; carga con la forma de la tarjeta en el color tenue del
// módulo que late suave. `tono`: entreno | comida | dash | aprende.
const COLOR_TONO = { entreno: '95,102,112', comida: '70,150,90', dash: '60,123,214', aprende: '238,132,52' };
const CSS_LATE = '@keyframes mt-late{0%,100%{opacity:1}50%{opacity:.55}}[data-cargando-modulo] [data-sk]{animation:mt-late 1.4s ease-in-out infinite}';
export function BlobIcono({ Icono, tono = 'entreno', tam = 64 }) {
  const c = COLOR_TONO[tono] || COLOR_TONO.entreno;
  return (
    <span aria-hidden="true" style={{
      width: tam, height: tam, borderRadius: tam * 0.33, transform: 'rotate(-12deg)', background: '#fff', display: 'grid', placeItems: 'center',
      boxShadow: `0 10px 24px rgba(${c},.18), inset 0 0 0 1px rgba(${c},.06)`, margin: '0 auto 12px',
    }}>
      <span style={{ transform: 'rotate(12deg)', display: 'grid', color: `rgb(${c})` }}>{Icono ? <Icono size={tam * 0.4} weight="regular" /> : null}</span>
    </span>
  );
}
export function CargandoModulo({ tono = 'entreno', barras = true, alto = null }) {
  const c = COLOR_TONO[tono] || COLOR_TONO.entreno;
  return (
    <div data-cargando-modulo aria-busy="true" aria-label="Cargando" style={{ padding: '6px 0', minHeight: alto || undefined }}>
      <style>{CSS_LATE}</style>
      <div data-sk style={{ height: 14, width: '55%', borderRadius: 8, background: `rgba(${c},.12)` }} />
      <div data-sk style={{ height: 10, width: '35%', borderRadius: 8, background: `rgba(${c},.08)`, marginTop: 9 }} />
      {barras && <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 16, height: 72 }}>
        {[40, 62, 48, 75, 58, 80, 66].map((h, i) => <div key={i} data-sk style={{ flex: 1, height: `${h}%`, borderRadius: 8, background: `rgba(${c},.10)` }} />)}
      </div>}
    </div>
  );
}

export function Vacio({ icono = '·', titulo, texto, accion, Icono = null, tono = 'entreno' }) {
  if (lote25() && Icono) return (
    <Card style={{ textAlign: 'center', padding: '26px 20px' }}>
      <div data-vacio-blob style={{ display: 'grid' }}><BlobIcono Icono={Icono} tono={tono} /></div>
      <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{titulo}</div>
      {texto && <div style={{ fontSize: 15, color: TEXT_MUTED, lineHeight: 1.45 }}>{texto}</div>}
      {accion && <div style={{ marginTop: 14 }}>{accion}</div>}
    </Card>
  );
  return (
    <Card style={{ textAlign: 'center', padding: '32px 20px' }}>
      <div style={{ fontSize: 30, marginBottom: 8, opacity: .5 }}>{icono}</div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{titulo}</div>
      {texto && <div style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.55 }}>{texto}</div>}
      {accion && <div style={{ marginTop: 14 }}>{accion}</div>}
    </Card>
  );
}

export function Cargando({ texto = 'Cargando…', tono = 'entreno' }) {
  if (lote25()) return <Card><CargandoModulo tono={tono} barras={false} /></Card>;
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
    sin_red: 'Sin señal. Revisa tu conexión e inténtalo en un momento.',
    sin_cliente: 'No encontré tu ficha. Escríbele a tu coach.',
    sin_crm: 'No pude conectar ahora. Inténtalo en un momento.',
    no_enviada: 'Tu coach todavía no te envió esta rutina.',
    no_es_suya: 'Esa rutina no es tuya.',
  };
  return (
    <Vacio
      icono="⚠"
      Icono={WarningCircle}
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
// `marca` (Historial, Nota al coach, Ficha): arriba va la franja del color de
// Entrenamiento, como las cabeceras, con la foto del ejercicio (o un ícono),
// qué ventana es y el nombre en grande. Así se siente de la app y no una
// ventana genérica. { etiqueta, nombre, chico?, foto?, Icono? }
export function Hoja({ abierta, alCerrar, titulo, children, alto = '86vh', marca = null, tono = 'entreno' }) {
  const L25 = lote25();
  // Lote 25: la hoja se cierra arrastrándola hacia abajo desde su cabecera,
  // con inercia: si baja más de 110 px o va rápido, se va; si no, vuelve.
  const panel = useRef(null);
  const arrastre = useRef(null);
  const alEmpezar = (e) => {
    if (!L25 || !panel.current) return;
    const t = e.touches ? e.touches[0] : e;
    arrastre.current = { y0: t.clientY, y: t.clientY, t0: Date.now(), t: Date.now() };
    panel.current.style.transition = 'none';
  };
  const alMover = (e) => {
    const a = arrastre.current; if (!a || !panel.current) return;
    const t = e.touches ? e.touches[0] : e;
    const dy = Math.max(0, t.clientY - a.y0);
    a.vel = (t.clientY - a.y) / Math.max(1, Date.now() - a.t); a.y = t.clientY; a.t = Date.now();
    panel.current.style.transform = `translateY(${dy}px)`;
    if (dy > 0 && e.cancelable) e.preventDefault();
  };
  const alSoltar = () => {
    const a = arrastre.current; if (!a || !panel.current) return;
    arrastre.current = null;
    // «Rápido» solo si el gesto duró algo: un salto instantáneo no es un gesto.
    const dy = Math.max(0, a.y - a.y0), rapido = (a.vel || 0) > 0.6 && Date.now() - a.t0 > 60;
    const el = panel.current;
    if (dy > 110 || (rapido && dy > 24)) {
      el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = 'translateY(110%)';
      setTimeout(() => { alCerrar?.(); }, 180);
    } else {
      el.style.transition = 'transform .32s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = 'translateY(0)';
    }
  };
  // Con la hoja abierta, el fondo no debe moverse: en el móvil el scroll se
  // "contagia" a la página de atrás y al cerrar apareces en otro sitio.
  // Ojo: la página de atrás no es el <body> sino la capa de la sección
  // (Entrenamiento y Dash scrollean dentro de su propio contenedor). Se
  // congelan también esas capas; si no, deslizar dentro de la hoja movía la
  // rutina de atrás en vez de la hoja.
  useEffect(() => {
    if (!abierta) return;
    const capas = [document.body, ...document.querySelectorAll('[data-view="entrena"], [data-view="dash"]')];
    const previos = capas.map(el => el.style.overflow);
    capas.forEach(el => { el.style.overflow = 'hidden'; });
    if (L25) vibrar('tic');
    const esc = (e) => { if (e.key === 'Escape') alCerrar?.(); };
    window.addEventListener('keydown', esc);
    return () => {
      capas.forEach((el, i) => { el.style.overflow = previos[i]; });
      window.removeEventListener('keydown', esc);
    };
  }, [abierta, alCerrar]);

  if (!abierta) return null;
  // Va a <body> por portal: dentro de la capa de la sección (fixed, con
  // scroll propio) el navegador del teléfono le robaba el gesto a la hoja.
  const hoja = (
    <div
      onClick={alCerrar}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, overscrollBehavior: 'contain', touchAction: 'pan-y',
        background: 'rgba(31,31,31,0.38)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div
        ref={panel} data-hoja-panel
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={titulo || 'Detalle'}
        style={{
          background: SURFACE, width: '100%', maxWidth: 560,
          borderRadius: L25 ? '28px 28px 0 0' : '22px 22px 0 0', boxShadow: SHADOW_OVERLAY,
          maxHeight: `min(${alto}, calc(100dvh - 24px))`, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        {/* La barrita de arrastre va en su propia fila, no superpuesta: al
            posicionarla absoluta sobre la cabecera se cruzaba encima del
            título de los ejercicios con nombre largo. */}
        {L25 ? <div data-hoja-agarre onTouchStart={alEmpezar} onTouchMove={alMover} onTouchEnd={alSoltar} onTouchCancel={alSoltar} style={{ touchAction: 'none' }}>
            <CabezaMarcaCompacta tono={tono} alCerrar={() => { vibrar('tic'); alCerrar?.(); }} {...(marca || partirTitulo(titulo))} /></div> : marca ? <CabezaMarca marca={marca} alCerrar={alCerrar} /> : (<>
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
        </>)}
        {/* minHeight 0: sin esto el área no se encoge dentro de la hoja,
            el contenido se desborda y NO hay scroll (el fallo de «Ficha»,
            «Nota» y «Tu récord» en el teléfono). */}
        <div data-hoja-scroll="" style={{
          flex: '1 1 auto', minHeight: 0,
          // Con el reloj del descanso encima (--mt-reloj-alto), lo último de
          // la hoja queda por arriba de la barra negra.
          padding: '16px 18px calc(26px + var(--mt-reloj-alto, 0px) + env(safe-area-inset-bottom, 0px))',
          overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y',
        }}>{children}</div>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(hoja, document.body) : hoja;
}

// La cabecera de marca de la hoja (ver `marca` arriba).
export const FONDO_TARJETA_HOJA = '#F6F6F8';

// Lote 25 · la marca arriba en TODAS las hojas, compacta: una franja baja del
// color del módulo con la barrita, qué ventana es (chico) y el nombre (16 px).
// Más baja que la de antes para que se sienta sutil.
export const TONOS_HOJA = {
  entreno: { fondo: 'linear-gradient(180deg, #D5D8DD 0%, #E7E9EC 100%)', tinta: '#4A5059' },
  comida:  { fondo: 'linear-gradient(180deg, #CFE4D5 0%, #E5F0E8 100%)', tinta: '#2F6B3E' },
  dash:    { fondo: 'linear-gradient(180deg, #D3E2F6 0%, #E7EFFA 100%)', tinta: '#2D62B0' },
  aprende: { fondo: 'linear-gradient(180deg, #F6DBC4 0%, #FBEADC 100%)', tinta: '#B5561A' },
};
// «Historial · Bench Press» → etiqueta «Historial» y nombre «Bench Press».
export function partirTitulo(titulo) {
  const t = String(titulo || '');
  const i = t.indexOf(' · ');
  return i > 0 ? { etiqueta: t.slice(0, i), nombre: t.slice(i + 3) } : { etiqueta: null, nombre: t };
}
export function CabezaMarcaCompacta({ etiqueta, nombre, chico, foto, Icono, alCerrar, tono = 'entreno' }) {
  const T = TONOS_HOJA[tono] || TONOS_HOJA.entreno;
  return (
    <div data-hoja-marca data-hoja-compacta style={{ background: T.fondo, padding: '6px 16px 10px', flexShrink: 0 }}>
      <div style={{ width: 32, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.75)', margin: '0 auto 6px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {(foto || Icono) && (
          <span aria-hidden="true" style={{
            width: foto ? 40 : 30, height: 30, borderRadius: 9, overflow: 'hidden', flex: 'none',
            background: foto ? '#9AA08F' : 'rgba(255,255,255,0.75)', display: 'grid', placeItems: 'center',
          }}>
            {foto ? <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <Icono size={17} color="#1D1D1F" />}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {etiqueta && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.tinta, lineHeight: 1.2 }}>{etiqueta}</div>}
          <div data-hoja-nombre style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#1D1D1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</div>
          {chico && <div style={{ fontSize: 13, color: '#5F6670', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chico}</div>}
        </div>
        <button onClick={alCerrar} aria-label="Cerrar" style={{
          border: 'none', background: 'rgba(255,255,255,0.75)', width: 28, height: 28, borderRadius: 999,
          cursor: 'pointer', flexShrink: 0, display: 'grid', placeItems: 'center', padding: 0,
        }}>
          <svg viewBox="0 0 256 256" width="12" height="12" fill="#3A3A3C" aria-hidden="true"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z" /></svg>
        </button>
      </div>
    </div>
  );
}
function CabezaMarca({ marca, alCerrar }) {
  const { etiqueta, nombre, chico, foto, Icono } = marca;
  return (
    <div data-hoja-marca style={{ background: 'linear-gradient(180deg, #C8CCD2 0%, #E2E4E8 100%)', padding: '8px 18px 16px', flexShrink: 0 }}>
      <div style={{ width: 36, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.7)', margin: '0 auto 4px' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        {(foto || Icono) && (
          <span aria-hidden="true" style={{
            width: foto ? 56 : 44, height: 44, borderRadius: 12, overflow: 'hidden', flex: 'none',
            background: foto ? '#9AA08F' : 'rgba(255,255,255,0.75)', display: 'grid', placeItems: 'center',
          }}>
            {foto ? <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <Icono size={22} color="#1D1D1F" />}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#454B54' }}>{etiqueta}</div>
          <div data-hoja-nombre style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#1D1D1F' }}>{nombre}</div>
          {chico && <div style={{ fontSize: 12.5, color: '#5F6670', marginTop: 2 }}>{chico}</div>}
        </div>
        <button onClick={alCerrar} aria-label="Cerrar" style={{
          border: 'none', background: 'rgba(255,255,255,0.75)', width: 30, height: 30, borderRadius: 999,
          cursor: 'pointer', flexShrink: 0, display: 'grid', placeItems: 'center', padding: 0,
        }}>
          <svg viewBox="0 0 256 256" width="13" height="13" fill="#3A3A3C" aria-hidden="true"><path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z" /></svg>
        </button>
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

// Lote 25 · «Sin conexión»: una pastilla discreta arriba mientras no hay red.
// Lo que se ve es lo último guardado en el teléfono; al volver la señal se
// quita sola y las pantallas se refrescan (useAlVolverRed).
export function SinRed() {
  const [sin, setSin] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const f = () => setSin(navigator.onLine === false);
    window.addEventListener('online', f); window.addEventListener('offline', f);
    return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f); };
  }, []);
  if (!sin) return null;
  return (
    <div data-sin-red role="status" style={{
      position: 'fixed', left: '50%', top: 'calc(10px + env(safe-area-inset-top, 0px))', transform: 'translateX(-50%)', zIndex: 70,
      background: 'rgba(31,31,31,0.86)', color: '#fff', borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 650,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>Sin conexión · mostrando lo último guardado</div>
  );
}
