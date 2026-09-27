// Píldora blanca de la visual nueva (Recordatorios, Reto, WhatsApp). Vive
// aparte para que Entrenamiento y Hoy la usen sin cargar todo el Dash.
import React from 'react';
import { TEXT, DANGER } from './theme.js';

// Compacta a propósito: son atajos, no lo principal de la pantalla.
export function Pastilla({ icono: Icono, children, onClick, href, badge, color = TEXT, chica = true }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag onClick={onClick} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, height: chica ? 36 : 46, padding: chica ? '0 13px' : '0 18px',
        borderRadius: 999, background: 'rgba(255,255,255,0.88)', border: 'none', cursor: 'pointer', textDecoration: 'none',
        boxShadow: '0 1px 2px rgba(40,40,30,0.05), 0 6px 16px rgba(60,60,40,0.06)',
        fontFamily: 'inherit', fontSize: chica ? 14 : 15.5, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap',
        position: 'relative', flex: 'none',
      }}>
      <Icono size={chica ? 17 : 19} weight="fill" color={color} />
      {children}
      {badge > 0 && (
        <span style={{
          minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: DANGER, color: '#fff',
          fontSize: 11.5, fontWeight: 700, display: 'grid', placeItems: 'center',
        }}>{badge}</span>
      )}
    </Tag>
  );
}
