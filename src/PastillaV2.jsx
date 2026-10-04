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
