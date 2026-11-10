// ─────────────────────────────────────────────────────────────────────────
// LA CAMPANITA · «Avisos de tu coach»
//
// Un solo lugar para lo que el coach le dice o le cambia y NO es una tarea de
// hoy (eso va en la primera tarjeta del Dash): te respondió una nota, cambió
// tu entrenamiento, te pidió un video, te dejó una nota, hay aprendizaje por
// ver. Punto azul = sin leer; al cerrar, todo queda leído. Abajo, las
// notificaciones del teléfono. Hoja de la marca, con el tono del Dash.
// ─────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CaretRight, Check, Note, Flag, BellSimple } from '@phosphor-icons/react';
import { Hoja } from './entrenoUI.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';
import { useAvisosCoach, marcarAvisosLeidos, hace } from './avisosCoach.js';

const AZUL = '#3C7BD6';
const RAYA = '1px solid #F0EDE6';


const Titulo = ({ children }) => <div style={{ fontSize: 13, fontWeight: 750, color: TEXT_MUTED, margin: '14px 0 2px' }}>{children}</div>;

function Fila({ i, nuevo, Icono, color, texto, sub, cuando, alTocar, derecha, tachado, ...resto }) {
  const pie = [sub, cuando].filter(Boolean).join(' · ');
  const cuerpo = (
    <>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: nuevo ? AZUL : 'transparent', flex: 'none' }} />
      <span aria-hidden="true" style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', flex: 'none', color }}><Icono size={21} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: nuevo ? 700 : 500, color: tachado ? TEXT_LIGHT : TEXT, lineHeight: 1.3, textDecoration: tachado ? 'line-through' : 'none' }}>{texto}</span>
        {pie && <span style={{ display: 'block', fontSize: 12.5, color: TEXT_MUTED, marginTop: 1, lineHeight: 1.35 }}>{pie}</span>}
      </span>
      {derecha || (alTocar ? <CaretRight size={16} color={TEXT_LIGHT} style={{ flex: 'none' }} /> : null)}
    </>
  );
  const estilo = { width: '100%', display: 'flex', alignItems: 'center', gap: 11, minHeight: 54, padding: '7px 0', border: 0, borderTop: i ? RAYA : 0, background: 'none', fontFamily: 'inherit', textAlign: 'left' };
  return alTocar
    ? <button type="button" data-aviso-nuevo={nuevo ? '1' : undefined} onClick={alTocar} style={{ ...estilo, cursor: 'pointer' }} {...resto}>{cuerpo}</button>
    : <div data-aviso-nuevo={nuevo ? '1' : undefined} style={estilo} {...resto}>{cuerpo}</div>;
}

export default function AvisosCoach({ onClose, onActivate, coachReminders = [], onToggleReminder, ciclo = null, alDash = null }) {
  const { lista } = useAvisosCoach();
  // Lo que estaba sin leer AL ABRIR se queda como «Nuevo» mientras la mira.
  const nuevosAlAbrir = useRef(null);
  if (nuevosAlAbrir.current === null) {
    nuevosAlAbrir.current = new Set([
      ...lista.filter(a => !a.leido).map(a => `a:${a.id}`),
      ...coachReminders.filter(r => !r.done_at && !r.seen_at).map(r => `n:${r.id}`),
    ]);
  }
  const esNuevo = (k) => nuevosAlAbrir.current.has(k);
  // Al cerrar, lo que vio queda leído (el número de la campanita baja).
  const idsRef = useRef([]);
  idsRef.current = lista.map(a => a.id);
  useEffect(() => () => { marcarAvisosLeidos(idsRef.current); }, []);

  // Notificaciones del teléfono: checking | unsupported | denied | inactive | active
  const [estado, setEstado] = useState('checking');
  const [ocupado, setOcupado] = useState(false);
  const revisar = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') { setEstado('unsupported'); return; }
    if (Notification.permission === 'denied') { setEstado('denied'); return; }
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub ? 'active' : 'inactive');
      } catch (e) { setEstado('inactive'); }
      return;
    }
    setEstado('inactive');
  }, []);
  useEffect(() => { revisar(); }, [revisar]);
  const activar = async () => {
    setOcupado(true);
    try { await onActivate(); } catch (e) { /* el estado de abajo lo dice */ }
    await revisar();
    setOcupado(false);
  };
  const pastilla = {
    checking: { txt: 'Verificando…', bg: '#F2F1EC', fg: TEXT_MUTED },
    active: { txt: 'Activadas', bg: '#E3F1E6', fg: '#2F7F45' },
    inactive: { txt: 'Sin activar', bg: '#FBEFCF', fg: '#8A6D16' },
    denied: { txt: 'Bloqueadas', bg: '#FBE9E5', fg: '#B4533F' },
    unsupported: { txt: 'No disponible aquí', bg: '#F2F1EC', fg: TEXT_MUTED },
  }[estado];

  const tocar = (a) => () => { onClose && onClose(); if (a.enDash && alDash) alDash(); if (a.ir) a.ir(); };

  // Las filas: avisos de la app y notas escritas del coach, juntas.
  const filaAviso = (a) => ({
    k: `a:${a.id}`,
    el: (i, nuevo) => <Fila key={`a:${a.id}`} i={i} nuevo={nuevo} Icono={a.Icono} color={a.color} texto={a.texto} sub={a.sub} cuando={a.cuando} alTocar={a.ir || a.enDash ? tocar(a) : null} data-aviso={a.id} />,
  });
  const filaNota = (r) => ({
    k: `n:${r.id}`,
    el: (i, nuevo) => (
      <Fila key={`n:${r.id}`} i={i} nuevo={nuevo} Icono={Note} color="#C95F17" texto={r.text} tachado={!!r.done_at}
        sub={r.done_at ? `cumplida${r.done_by === 'coach' ? ' según tu coach' : ''} · toca para desmarcar` : 'toca cuando la cumplas'} cuando={r.done_at ? '' : hace(r.created_at)}
        alTocar={() => onToggleReminder && onToggleReminder(r.id)} data-aviso-nota={r.id}
        derecha={(
          <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 99, flex: 'none', display: 'grid', placeItems: 'center', background: r.done_at ? '#46965A' : 'transparent', border: r.done_at ? 'none' : '2px solid #D8C9A0' }}>
            {r.done_at ? <Check size={14} weight="bold" color="#fff" /> : null}
          </span>
        )} />
    ),
  });
  const pendientes = coachReminders.filter(r => !r.done_at);
  // Las notas ya cumplidas no se muestran: la campanita es lo que falta, no un archivo.
  const todas = [...lista.map(filaAviso), ...pendientes.map(filaNota)];
  const nuevas = todas.filter(f => esNuevo(f.k));
  const antes = todas.filter(f => !esNuevo(f.k));
  const vacio = !nuevas.length && !antes.length && !ciclo;

  return (
    <Hoja abierta alCerrar={onClose} titulo="Avisos · De tu coach" tono="dash" alto="82vh">
      <div data-avisos-coach>
        {vacio && (
          <div data-sin-recordatorios style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0 6px' }}>
            <BellSimple size={22} color={TEXT_LIGHT} />
            <span style={{ fontSize: 15, color: TEXT_MUTED, lineHeight: 1.4 }}>Por ahora no tienes avisos de tu coach.</span>
          </div>
        )}
        {nuevas.length > 0 && (<>
          <Titulo>Nuevo</Titulo>
          <div data-avisos-nuevos>{nuevas.map((f, i) => f.el(i, true))}</div>
        </>)}
        {(antes.length > 0 || ciclo) && (<>
          {nuevas.length > 0 && <Titulo>Antes</Titulo>}
          <div data-avisos-antes>
            {/* La última semana del ciclo: aviso de contexto (no es algo que marcar). */}
            {ciclo && (
              <Fila i={0} Icono={Flag} color="#B4541D" texto="Última semana del ciclo" data-recordatorio-ciclo
                sub={`La próxima cambian algunos ejercicios. ${ciclo.pendientes ? `Cierra esta con ${ciclo.pendientes === 1 ? 'tu entreno' : `tus ${ciclo.pendientes} entrenos`}.` : 'Esta ya la cerraste.'}`} />
            )}
            {antes.map((f, i) => f.el(i + (ciclo ? 1 : 0), false))}
          </div>
        </>)}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: RAYA, marginTop: 12, paddingTop: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Notificaciones</span>
          <span data-push-estado={estado} style={{ fontSize: 13, fontWeight: 700, color: pastilla.fg, background: pastilla.bg, borderRadius: 999, padding: '5px 11px' }}>{pastilla.txt}</span>
        </div>
        {estado === 'inactive' && (<>
          <p style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.45, margin: '8px 0 10px' }}>Te aviso en el momento justo: cuando tu coach te responde o te cambia algo.</p>
          <button type="button" onClick={activar} disabled={ocupado} style={{ width: '100%', height: 46, border: 'none', borderRadius: 999, background: TEXT, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: ocupado ? 0.6 : 1 }}>
            {ocupado ? 'Activando…' : 'Activar notificaciones'}
          </button>
        </>)}
        {estado === 'denied' && <p style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.45, margin: '8px 0 0' }}>Están bloqueadas en los ajustes del teléfono.</p>}
        {estado === 'unsupported' && (
          <p style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.45, margin: '8px 0 0' }}>
            Este navegador no permite notificaciones. En iPhone: abre la app desde el ícono de tu pantalla de inicio y vuelve a intentar desde ahí.
          </p>
        )}
      </div>
    </Hoja>
  );
}
