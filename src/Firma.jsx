// Firma del coach al pie de cada página — réplica de .em-signature del
// Centro de Aprendizaje (la misma que ya llevaban el Recetario y Hoy de
// comida). Sin «Cerrar sesión»: en la app del cliente no hay sesión que cerrar.
import React from 'react';
import { BORDER, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

export default function Firma({ style }) {
  return (
    <div data-firma style={{ margin: '10px 0 0', padding: '14px 2px 6px', textAlign: 'left', ...style }}>
      <div style={{ width: 28, height: 1, background: BORDER, margin: '14px 0 10px' }} />
      <div style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '-.01em', color: TEXT_MUTED }}>Mauro Morón</div>
      <div style={{ fontSize: '10px', fontWeight: 400, letterSpacing: '.01em', color: TEXT_LIGHT, margin: '2px 0 0' }}>ISSA Certified Fitness &amp; Nutrition Coach</div>
      <div style={{ fontSize: '9.5px', color: TEXT_LIGHT, opacity: 0.75, margin: '12px 0 0' }}>© 2026 · Acceso personal e intransferible</div>
    </div>
  );
}
