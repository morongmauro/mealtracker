// Píldora blanca de la visual nueva (Recordatorios, Reto, WhatsApp). Vive
// aparte para que Entrenamiento y Hoy la usen sin cargar todo el Dash.
import React from 'react';
import { TEXT, DANGER } from './theme.js';

// Compacta a propósito: son atajos, no lo principal de la pantalla.
// `mini`: la fila del Dash, que tiene que caber en UNA línea en un teléfono.
// `soloIcono`: el círculo con el ícono (el texto queda como nombre para el
// lector de pantalla). `badgeEncima`: el número va sobre la esquina, sin
// ensanchar la pastilla. `apretada`: menos relleno, para filas que deben
// caber enteras en un teléfono angosto.
export function Pastilla({ icono: Icono, children, onClick, href, badge, color = TEXT, chica = true, mini = false, soloIcono = false, badgeEncima = false, apretada = false, ...resto }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag onClick={onClick} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined}
      aria-label={soloIcono && typeof children === 'string' ? children : undefined} {...resto}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: apretada ? 5 : mini ? 6 : 7, height: mini ? 34 : chica ? 36 : 46,
        width: soloIcono ? (mini ? 34 : chica ? 36 : 46) : undefined,
        padding: soloIcono ? 0 : apretada ? '0 9px' : mini ? '0 11px' : chica ? '0 13px' : '0 18px',
        borderRadius: 999, background: 'rgba(255,255,255,0.88)', border: 'none', cursor: 'pointer', textDecoration: 'none',
        boxShadow: '0 1px 2px rgba(40,40,30,0.05), 0 6px 16px rgba(60,60,40,0.06)',
        fontFamily: 'inherit', fontSize: mini ? 13.5 : chica ? 14 : 15.5, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap',
        position: 'relative', flex: 'none',
      }}>
      <Icono size={mini ? 16 : chica ? 17 : 19} weight="fill" color={color} />
      {!soloIcono && children}
      {badge > 0 && (
        <span data-badge style={{
          minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: DANGER, color: '#fff',
          fontSize: 11.5, fontWeight: 700, display: 'grid', placeItems: 'center',
          ...(soloIcono || badgeEncima ? { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px', fontSize: 11, boxShadow: '0 0 0 2px #fff' } : {}),
        }}>{badge}</span>
      )}
    </Tag>
  );
}

// Botón de cristal (visual nueva): un círculo con el símbolo en el color del
// atajo y su palabra debajo, como los de Fitness o el Centro de control.
// Chico a propósito, para no quitarle protagonismo a la cabecera.
// `rotulo`: la palabra corta de abajo; `children` queda como nombre completo
// para el lector de pantalla (p. ej. «Escribirle al coach»).
// El color del trazo de los botones de cristal, el de cada sección (Entreno
// es grafito).
export const TONO_ATAJOS = { dash: '#3C7BD6', entreno: '#1D1D1F', comida: '#46965A', aprende: '#EE8434' };

export function BotonCristal({ icono: Icono, children, rotulo, onClick, href, badge, color = TEXT, tono = '#1D1D1F', ancho = 56, ...resto }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag onClick={onClick} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined}
      aria-label={typeof children === 'string' ? children : undefined} data-boton-cristal {...resto}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: ancho, flex: 'none',
        padding: 0, border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
      }}>
      <span data-circulo style={{
        // Liquid Glass (opción B), la misma receta que la barra y los blobs:
        // casi sin blanco, desenfoque con más color, filo de luz, banda
        // interior, sombra interior abajo y reflejo arriba‑izquierda.
        position: 'relative', width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0.16) 100%)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6) brightness(1.03)', backdropFilter: 'blur(24px) saturate(1.6) brightness(1.03)',
        boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.95), inset 0 -1.5px 0 rgba(255,255,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 0 12px rgba(255,255,255,0.45), inset 0 -7px 10px rgba(30,30,40,0.07), inset 0 6px 9px rgba(30,30,40,0.04), 0 8px 20px rgba(40,44,30,0.12), 0 1px 2px rgba(40,44,30,0.06)',
      }}>
        <span aria-hidden="true" data-brillo style={{
          position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(60% 70% at 18% 12%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)',
        }} />
        {/* Ícono de línea en el color de la sección (todos los de una
            sección iguales), sobre el cristal. */}
        <Icono size={20} weight="regular" color={tono} data-tono-icono={tono} style={{ position: 'relative', zIndex: 1 }} />
        {badge > 0 && (
          <span data-badge style={{
            position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99,
            background: DANGER, color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', boxShadow: '0 0 0 2px #fff',
          }}>{badge}</span>
        )}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#3A3A3C', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{rotulo || children}</span>
    </Tag>
  );
}

// La fila de botones de cristal debajo de una cabecera.
export function FilaCristal({ children, style, ...resto }) {
  return <div data-fila-cristal {...resto} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, ...style }}>{children}</div>;
}
