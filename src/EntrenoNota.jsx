// ─────────────────────────────────────────────────────────────────────────
// NOTA PARA EL COACH · sobre la rutina o sobre un ejercicio
//
// «El press me molesta en el hombro», «el jueves me queda largo». Le llega al
// coach al teléfono y a la Bandeja del CRM, pegada a la rutina o al ejercicio
// del que habla: así no hay que adivinar a qué se refiere.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { api } from './entrenoDatos.js';
import { Hoja, Boton, TEXT, TEXT_MUTED, TEXT_LIGHT, BORDER, SURFACE_2 } from './entrenoUI.jsx';

const SUGERENCIAS = {
  ejercicio: ['Me molesta al hacerlo', 'No tengo esta máquina', 'Me quedó muy fácil', 'No entiendo la técnica'],
  rutina: ['Me quedó larga', 'Me quedó corta', 'Esta semana viajo', 'Me siento muy cansado'],
};

export default function HojaNota({ abierta, nombre, contexto, alCerrar }) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);   // null | 'enviando' | 'ok' | mensaje de error
  useEffect(() => { if (abierta) { setTexto(''); setEstado(null); } }, [abierta]);
  if (!contexto) return null;
  const tipo = contexto.rutina_ejercicio_id ? 'ejercicio' : 'rutina';

  const enviar = async () => {
    if (!texto.trim()) return;
    setEstado('enviando');
    const r = await api.nota(nombre, {
      texto: texto.trim(), rutina_id: contexto.rutina_id,
      rutina_ejercicio_id: contexto.rutina_ejercicio_id || null, sesion_id: contexto.sesion_id || null,
    });
    if (r && r.ok) { setEstado('ok'); setTimeout(alCerrar, 900); return; }
    setEstado(r && r.motivo === 'sin_red'
      ? 'Sin conexión. Tu nota sigue aquí: envíala cuando tengas señal.'
      : 'No se pudo enviar. Inténtalo otra vez.');
  };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={`Nota para tu coach · ${contexto.titulo}`} alto="78vh">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {SUGERENCIAS[tipo].map(s => (
          <button key={s} onClick={() => setTexto(t => (t ? `${t} ${s}` : s))} style={{
            border: `1px solid ${BORDER}`, background: 'transparent', borderRadius: 999,
            padding: '6px 11px', fontSize: 12.5, color: TEXT_MUTED, cursor: 'pointer', fontFamily: 'inherit',
          }}>{s}</button>
        ))}
      </div>
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4} autoFocus
        placeholder={tipo === 'ejercicio' ? '¿Qué le quieres contar de este ejercicio?' : '¿Qué le quieres contar de esta rutina?'}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 12,
          border: `1px solid ${BORDER}`, background: SURFACE_2, fontSize: 16, color: TEXT,
          fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.45,
        }} />
      <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 8 }}>Le llega a tu coach al momento.</div>
      {estado && estado !== 'enviando' && estado !== 'ok' && (
        <div role="alert" style={{ marginTop: 10, fontSize: 13, color: '#8A3A2C' }}>{estado}</div>
      )}
      <Boton ancho style={{ marginTop: 14 }} disabled={!texto.trim() || estado === 'enviando' || estado === 'ok'} onClick={enviar}>
        {estado === 'ok' ? 'Enviada ✓' : estado === 'enviando' ? 'Enviando…' : 'Enviar a mi coach'}
      </Boton>
    </Hoja>
  );
}
