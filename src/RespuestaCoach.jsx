// ─────────────────────────────────────────────────────────────────────────
// «TE RESPONDIÓ» · la respuesta del coach a una nota de sesión
//
// El coach la escribe en la Bandeja del CRM («Responder» → «A su app»): le
// llega un aviso al teléfono y aquí, arriba en el Dash, sale su nota y la
// respuesta hasta que toca «Entendido». «Escribirle» abre WhatsApp.
// Datos: api/_respuestas.js (tabla respuestas_coach del CRM).
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { api } from './entrenoDatos.js';
import { TEXT } from './theme.js';
import { enVerComo } from './verComo.js';

const SOMBRA = '0 1px 2px rgba(40,40,30,.04), 0 8px 22px rgba(60,60,40,.06)';
const AZUL = '#2F6CC4';

export default function RespuestaCoach({ name, whatsapp }) {
  const [lista, setLista] = useState([]);
  const [cerrando, setCerrando] = useState(false);
  useEffect(() => {
    let vivo = true;
    if (name) api.respuestas(name).then(r => { if (vivo && r && r.ok && Array.isArray(r.respuestas)) setLista(r.respuestas); }).catch(() => {});
    return () => { vivo = false; };
  }, [name]);
  const r = lista[0];
  if (!r) return null;
  const entendido = async () => {
    setCerrando(true);
    if (!enVerComo()) await api.respuestaVista(name, r.id).catch(() => null);
    setLista(l => l.slice(1)); setCerrando(false);
  };
  return (
    <section data-respuesta-coach style={{ background: '#fff', borderRadius: 24, padding: '16px 16px 12px', margin: '14px 0 4px', boxShadow: SOMBRA }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: AZUL }}>De tu coach</div>
      <div style={{ fontWeight: 800, fontSize: 21, color: TEXT, letterSpacing: '-.02em', marginTop: 2 }}>Te respondió</div>
      {r.nota && (
        <div data-respuesta-nota style={{ background: '#F2F1EC', borderRadius: 16, padding: '10px 12px', marginTop: 12, fontSize: 14, color: '#55565B', lineHeight: 1.4 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#8A8F98', marginBottom: 2 }}>Tú{r.contexto ? `, ${r.contexto.charAt(0).toLowerCase()}${r.contexto.slice(1)}` : ''}</div>
          {r.nota}
        </div>
      )}
      <div style={{ display: 'flex', gap: 9, marginTop: 10, alignItems: 'flex-start' }}>
        <span aria-hidden="true" style={{ flex: 'none', width: 32, height: 32, borderRadius: 99, background: '#3C7BD6', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>M</span>
        <div data-respuesta-texto style={{ background: '#EAF1FB', borderRadius: '4px 16px 16px 16px', padding: '10px 12px', fontSize: 15, lineHeight: 1.42, color: TEXT, whiteSpace: 'pre-wrap', minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: AZUL, marginBottom: 2 }}>Mauro · coach</div>
          {r.texto}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button type="button" data-respuesta-entendido disabled={cerrando} onClick={entendido} style={{ flex: 1, border: 'none', borderRadius: 999, padding: 12, fontFamily: 'inherit', fontWeight: 800, fontSize: 15, background: '#1F1F1F', color: '#fff', cursor: 'pointer', opacity: cerrando ? 0.6 : 1 }}>Entendido</button>
        {whatsapp && <a data-respuesta-escribir href={whatsapp} target="_blank" rel="noopener noreferrer" style={{ flex: 1, borderRadius: 999, padding: 12, fontWeight: 800, fontSize: 15, background: '#F2F1EC', color: '#1F1F1F', textAlign: 'center', textDecoration: 'none' }}>Escribirle</a>}
      </div>
      {whatsapp && <div style={{ fontSize: 12, color: '#8A8F98', textAlign: 'center', marginTop: 8 }}>«Escribirle» abre WhatsApp con tu coach</div>}
    </section>
  );
}
