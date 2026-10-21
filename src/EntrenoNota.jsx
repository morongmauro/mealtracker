// ─────────────────────────────────────────────────────────────────────────
// NOTA PARA EL COACH · sobre la rutina o sobre un ejercicio
//
// «El press me molesta en el hombro», «el jueves me queda largo». Le llega al
// coach al teléfono y a la Bandeja del CRM, pegada a la rutina o al ejercicio
// del que habla: así no hay que adivinar a qué se refiere.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { ChatCircleText, PushPin } from '@phosphor-icons/react';
import { lote25 } from './vistaApp.js';
import { api, miniatura } from './entrenoDatos.js';
import { v2Activa, nombresEj } from './v2.js';
import { Hoja, Boton, TEXT, TEXT_MUTED, TEXT_LIGHT, BORDER, SURFACE_2 } from './entrenoUI.jsx';

const SUGERENCIAS = {
  ejercicio: ['Me molesta al hacerlo', 'No tengo esta máquina', 'Me quedó muy fácil', 'No entiendo la técnica'],
  rutina: ['Me quedó larga', 'Me quedó corta', 'Esta semana viajo', 'Me siento muy cansado'],
};

// ── La conversación del ejercicio con el coach (lote 25) ──────────────────
// Arriba, fijo, el «Siempre presente»; debajo, en orden, sus «Para la
// próxima vez» (a la izquierda, en azul) y lo que tú le escribiste (a la
// derecha). Al abrirla, lo puntual queda leído.
const fechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(iso), hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/^./, c => c.toUpperCase());
};
function Conversacion({ coach, siempre, mias }) {
  const hilo = [
    ...(coach.puntuales || []).map(c => ({ de: 'coach', t: c.creado_en, c })),
    ...mias.map(n => ({ de: 'yo', t: n.creado_en, n })),
  ].sort((a, b) => String(a.t).localeCompare(String(b.t)));
  let dia = null;
  return (
    <div data-conversacion-coach style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
      {siempre && (
        <div data-siempre-hilo style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(60,123,214,0.08)', display: 'flex', gap: 8 }}>
          <PushPin size={15} weight="fill" color="#3C7BD6" style={{ flex: 'none', marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 750, color: '#2F68C0' }}>Siempre presente</div>
            <div style={{ fontSize: 14, color: '#2F5FA8', lineHeight: 1.4, marginTop: 1 }}>{siempre}</div>
          </div>
        </div>
      )}
      {hilo.map((it, k) => {
        const f = fechaCorta(it.t), sep = f !== dia; dia = f;
        return (
          <React.Fragment key={k}>
            {sep && <div style={{ textAlign: 'center', fontSize: 12, color: TEXT_LIGHT, margin: '4px 0 0' }}>{f}</div>}
            {it.de === 'coach' ? (
              <div data-puntual-hilo style={{ alignSelf: 'flex-start', maxWidth: '86%', padding: '10px 12px', borderRadius: 16, background: 'rgba(60,123,214,0.08)' }}>
                <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: '#fff', background: '#3C7BD6', borderRadius: 99, padding: '2px 8px', marginBottom: 5 }}>PARA LA PRÓXIMA VEZ</span>
                <div style={{ fontSize: 14.5, color: TEXT, lineHeight: 1.4 }}>{it.c.texto}</div>
                <div style={{ fontSize: 11.5, color: TEXT_LIGHT, marginTop: 4 }}>Tu coach</div>
              </div>
            ) : (
              <div data-mia-hilo style={{ alignSelf: 'flex-end', maxWidth: '86%', padding: '10px 12px', borderRadius: 16, background: SURFACE_2, fontSize: 14.5, color: TEXT, lineHeight: 1.4 }}>{it.n.texto}</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function HojaNota({ abierta, nombre, contexto, alCerrar, alLeer }) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);   // null | 'enviando' | 'ok' | mensaje de error
  useEffect(() => { if (abierta) { setTexto(''); setEstado(null); } }, [abierta]);
  const coach = lote25() && contexto && contexto.coach ? contexto.coach : null;
  // Abrirla es leer lo puntual del coach.
  useEffect(() => {
    if (!abierta || !coach || !alLeer) return;
    const ids = (coach.puntuales || []).filter(p => !p.leido_en).map(p => p.id);
    if (ids.length) alLeer(contexto.ejercicio_id, ids);
  }, [abierta]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!contexto) return null;
  const tipo = contexto.rutina_ejercicio_id ? 'ejercicio' : 'rutina';
  const siempre = coach ? ((coach.siempre && coach.siempre.texto) || null) : null;
  const hayHilo = !!coach && (siempre || (coach.puntuales || []).length > 0);

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
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={`Nota para tu coach · ${contexto.titulo}`} alto="78vh"
      marca={v2Activa() ? { etiqueta: hayHilo ? 'Comentario del coach' : 'Nota al coach', nombre: contexto.ejercicio ? nombresEj(contexto.ejercicio).grande : contexto.titulo, foto: contexto.ejercicio ? miniatura(contexto.ejercicio) : null, Icono: ChatCircleText } : null}>
      {hayHilo && <Conversacion coach={coach} siempre={siempre} mias={coach.notas || []} />}
      {!hayHilo && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {SUGERENCIAS[tipo].map(s => (
          <button key={s} onClick={() => setTexto(t => (t ? `${t} ${s}` : s))} style={{
            border: `1px solid ${BORDER}`, background: 'transparent', borderRadius: 999,
            padding: '6px 11px', fontSize: 12.5, color: TEXT_MUTED, cursor: 'pointer', fontFamily: 'inherit',
          }}>{s}</button>
        ))}
      </div>}
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={hayHilo ? 2 : 4} autoFocus={!hayHilo}
        placeholder={hayHilo ? 'Responder a tu coach…' : tipo === 'ejercicio' ? '¿Qué le quieres contar de este ejercicio?' : '¿Qué le quieres contar de esta rutina?'}
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
