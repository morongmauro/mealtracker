// ─────────────────────────────────────────────────────────────────────────
// NÚMERO HÉROE · vista en prueba
//
// El número que importa en cada sección (el del aro de la cabecera: 31 %,
// 2/7, 1/3…), grande y con letra fuerte, y debajo qué es. Al bajar, cuando
// el número sale de la pantalla, aparece arriba una barra de vidrio con el
// nombre de la sección y el número en chico: así nunca se pierde.
// Tocarlo abre qué lo compone (lo mismo que tocar el aro).
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TEXT, TEXT_MUTED } from './theme.js';
import { NOMBRE_SECCION } from './BarraV2.jsx';

const COLOR = { dash: '#3C7BD6', entreno: '#5F6670', comida: '#46965A', aprende: '#EE8434' };

// `chico`: solo el pie (la cifra va dentro del blob, opción A3); al bajar,
// la barra de arriba aparece igual.
export default function NumeroHeroe({ tema, centro, pie, alTocar, activo = true, chico = false }) {
  const ref = useRef(null);
  const [fuera, setFuera] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setFuera(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [, num = String(centro || ''), resto = ''] = String(centro || '').match(/^([\d.,]+)(.*)$/) || [];
  const Tag = alTocar ? 'button' : 'div';
  return (
    <>
      <Tag ref={ref} data-numero-heroe={tema} onClick={alTocar} aria-label={alTocar ? `${pie || ''}: ${centro}. Ver cómo se calcula` : undefined} style={{
        flex: chico ? undefined : 1, display: chico ? 'block' : undefined, minWidth: 0, textAlign: 'left', border: 0, background: 'none', padding: 0, fontFamily: 'inherit', color: TEXT,
        cursor: alTocar ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent',
      }}>
        {!chico && <div style={{ fontSize: 'clamp(64px, 19vw, 84px)', fontWeight: 800, lineHeight: 0.9, letterSpacing: '-0.045em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {num}{resto && <span style={{ fontSize: '0.46em', letterSpacing: '-0.02em', fontWeight: 700, color: resto.startsWith('/') ? '#AEAEB2' : TEXT }}>{resto}</span>}
        </div>}
        {pie && <div data-numero-pie style={chico ? { fontSize: 13.5, fontWeight: 600, color: TEXT_MUTED, marginTop: 8 } : { fontSize: 15, fontWeight: 600, color: TEXT_MUTED, marginTop: 10 }}>{pie}</div>}
      </Tag>
      {/* La barra de arriba, solo con la sección al frente y el número fuera. */}
      {activo && typeof document !== 'undefined' && createPortal(
        <div data-barra-heroe={tema} data-visible={fuera ? '1' : '0'} aria-hidden={fuera ? undefined : 'true'} style={{
          position: 'fixed', left: 0, right: 0, top: 0, zIndex: 44, pointerEvents: 'none',
          height: 'calc(env(safe-area-inset-top, 0px) + 52px)', padding: '0 18px 10px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          background: 'rgba(252,252,253,0.74)', WebkitBackdropFilter: 'blur(22px) saturate(170%)', backdropFilter: 'blur(22px) saturate(170%)',
          boxShadow: '0 1px 0 rgba(20,20,40,0.05)',
          opacity: fuera ? 1 : 0, transform: fuera ? 'none' : 'translateY(-8px)', transition: 'opacity .22s ease, transform .28s cubic-bezier(.2,.8,.2,1)',
        }}>
          <span data-barra-heroe-titulo style={{ fontSize: 16, fontWeight: 800, color: TEXT, letterSpacing: '-0.01em' }}>{NOMBRE_SECCION[tema] || ''}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: COLOR[tema] || TEXT, fontVariantNumeric: 'tabular-nums' }}>{centro}</span>
        </div>,
        document.body,
      )}
    </>
  );
}
