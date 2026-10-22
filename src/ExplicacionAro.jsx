// ─────────────────────────────────────────────────────────────────────────
// ¿QUÉ MIDE ESTE ARO? La hoja que abre cualquier aro de la app al tocarlo:
// el número grande, qué es, y las partes que lo componen (si las hay).
// ─────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Hoja } from './entrenoUI.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

const CREMA = '#F4F1EB';

// titulo: el de la hoja · grande: el número · que: qué es ese número ·
// partes: [{ nombre, valor, detalle, atras }] · nota: letra chica al final.
export default function ExplicacionAro({ titulo, grande, que, partes = [], nota, alCerrar }) {
  return (
    <Hoja abierta alCerrar={alCerrar} titulo={/ · /.test(String(titulo || '')) ? titulo : `Qué mide · ${titulo}`} tono="dash" alto="70vh">
      <div data-explicacion-aro style={{ fontSize: 14.5, color: TEXT, lineHeight: 1.5 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>{grande}</span>
          {que && <span style={{ color: TEXT_MUTED }}>{que}</span>}
        </div>
        {partes.map((p, i) => (
          <div key={p.nombre || i} style={{ marginTop: 12, padding: '12px 14px', borderRadius: 16, background: CREMA }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <b>{p.nombre}</b>{p.valor != null && <span style={{ fontSize: 20, fontWeight: 800, whiteSpace: 'nowrap' }}>{p.valor}</span>}
            </div>
            {p.detalle && <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 3 }}>{p.detalle}</div>}
            {p.atras && <div data-atras style={{ fontSize: 13, color: '#B4541D', fontWeight: 600, marginTop: 3 }}>{p.atras}</div>}
          </div>
        ))}
        {nota && <div style={{ fontSize: 12.5, color: TEXT_LIGHT, marginTop: 14 }}>{nota}</div>}
      </div>
    </Hoja>
  );
}
