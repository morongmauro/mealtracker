// ─────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN · visual nueva (el engranaje del Dash)
//
// Todo lo que se ajusta una vez y se olvida, en un solo lugar:
//   Unidades · Notificaciones · Relojes y anillos · Recorrido de la app ·
//   Sobre el programa · Hablar con tu coach
// Relojes y anillos abre su propia lista (RelojesLista): conectar Fitbit,
// Oura, Whoop, Polar…, ver cuáles están conectados y desconectarlos.
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { Ruler, Bell, Watch, Compass, BookOpenText, WhatsappLogo, CaretRight, CaretLeft, CheckCircle } from '@phosphor-icons/react';
import CabeceraHoy from './CabeceraHoy.jsx';
import { HojaUnidades, useUnidades } from './Unidades.jsx';
import { TEXT, TEXT_MUTED, TEXT_LIGHT } from './theme.js';

const SOMBRA = '0 1px 2px rgba(40,40,30,0.04), 0 6px 16px rgba(60,60,40,0.06)';

// Los relojes, en el orden en que más se usan aquí. `listo`: ya hay
// integración; los demás dicen «Pronto» (Garmin pide aprobación de su
// programa de desarrolladores; Apple Watch solo se lee desde una app nativa).
export const RELOJES = [
  { id: 'fitbit', nombre: 'Fitbit', detalle: 'Pasos, sueño y pulso', listo: true },
  { id: 'oura', nombre: 'Oura Ring', detalle: 'Sueño, recuperación y actividad', listo: true },
  { id: 'whoop', nombre: 'Whoop', detalle: 'Recuperación, sueño y esfuerzo', listo: true },
  { id: 'polar', nombre: 'Polar', detalle: 'Entrenos y actividad diaria', listo: true },
  { id: 'garmin', nombre: 'Garmin', detalle: 'Pronto', listo: false },
  { id: 'apple', nombre: 'Apple Watch', detalle: 'Pronto', listo: false },
];

export default function Configuracion({ name, arriba = 0, alRecorrido, alPrograma, whatsapp, alActivarPush, alCerrarSesion }) {
  const [vista, setVista] = useState('inicio');
  const [unidadesAbierta, setUnidadesAbierta] = useState(false);
  const unidad = useUnidades();
  const [permiso, setPermiso] = useState(() => { try { return Notification.permission; } catch (e) { return 'unsupported'; } });

  if (vista === 'relojes') return <RelojesLista name={name} arriba={arriba} alVolver={() => setVista('inicio')} />;

  const filas = [
    { id: 'unidades', Icono: Ruler, titulo: 'Unidades', detalle: `${unidad.peso === 'lb' ? 'Libras (lb)' : 'Kilos (kg)'} · ${unidad.distancia === 'm' ? 'metros' : 'kilómetros'}`, alTocar: () => setUnidadesAbierta(true) },
    { id: 'notificaciones', Icono: Bell, titulo: 'Notificaciones',
      detalle: permiso === 'granted' ? 'Activadas' : permiso === 'denied' ? 'Bloqueadas: actívalas en los ajustes del teléfono' : permiso === 'unsupported' ? 'Este teléfono no las permite aquí' : 'Toca para activarlas',
      alTocar: permiso === 'default' && alActivarPush ? async () => { await alActivarPush(); try { setPermiso(Notification.permission); } catch (e) { /* nada */ } } : null },
    { id: 'relojes', Icono: Watch, titulo: 'Relojes y anillos', detalle: 'Fitbit, Oura, Whoop, Polar…', alTocar: () => setVista('relojes') },
    { id: 'recorrido', Icono: Compass, titulo: 'Recorrido de la app', detalle: 'Qué hay en cada sección', alTocar: alRecorrido },
    { id: 'programa', Icono: BookOpenText, titulo: 'Sobre el programa', detalle: 'El método, tu trayecto y las dudas', alTocar: alPrograma },
    ...(whatsapp ? [{ id: 'coach', Icono: WhatsappLogo, titulo: 'Hablar con tu coach', detalle: 'Por WhatsApp', href: whatsapp }] : []),
  ];

  return (
    <div data-configuracion style={{ paddingTop: arriba }}>
      <CabeceraHoy tema="dash" fondo={false} voz={{ etiqueta: 'CONFIGURACIÓN', a: 'Tu app,', b: 'a tu manera.' }} />
      <div style={{ background: '#FFFFFF', borderRadius: 22, boxShadow: SOMBRA, padding: '4px 0' }}>
        {filas.map((f, i) => {
          const Tag = f.href ? 'a' : 'button';
          return (
            <Tag key={f.id} data-config={f.id} {...(f.href ? { href: f.href, target: '_blank', rel: 'noopener noreferrer' } : { onClick: f.alTocar || undefined, disabled: !f.alTocar })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px', border: 0, background: 'transparent',
                borderTop: i ? '1px solid #EFEBE3' : 0, textAlign: 'left', fontFamily: 'inherit', cursor: f.alTocar || f.href ? 'pointer' : 'default', textDecoration: 'none', color: 'inherit',
              }}>
              <span style={{ width: 38, height: 38, borderRadius: 99, background: '#F1EFE9', color: TEXT, display: 'grid', placeItems: 'center', flex: 'none' }}><f.Icono size={20} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15.5, fontWeight: 700, color: TEXT }}>{f.titulo}</span>
                <span style={{ display: 'block', fontSize: 13, color: TEXT_MUTED, marginTop: 1 }}>{f.detalle}</span>
              </span>
              {(f.alTocar || f.href) && <CaretRight size={18} color={TEXT_LIGHT} />}
            </Tag>
          );
        })}
      </div>
      {/* Cerrar sesión (con cuenta): la información no se borra; para volver
          a entrar se pide la contraseña. */}
      {alCerrarSesion && (
        <button data-cerrar-sesion onClick={() => { if (window.confirm('¿Cerrar sesión? Tu información queda guardada; para volver a entrar te pido tu contraseña.')) alCerrarSesion(); }} style={{
          width: '100%', marginTop: 14, padding: '14px 16px', borderRadius: 18, border: 0, background: '#FFFFFF', boxShadow: SOMBRA,
          fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700, color: '#B23B30', cursor: 'pointer',
        }}>Cerrar sesión</button>
      )}
      <HojaUnidades abierta={unidadesAbierta} alCerrar={() => setUnidadesAbierta(false)} />
    </div>
  );
}

// ── Relojes y anillos ─────────────────────────────────────────────────────
// Lo que ya está conectado sale con su check; conectar abre la página de la
// marca para dar permiso y vuelve a la app. Lo que trae el reloj (pasos,
// sueño, pulso, recuperación) le llega al coach y a tu Dash.
export function RelojesLista({ name, arriba = 0, alVolver }) {
  const [estado, setEstado] = useState(null);   // { conectados: { fitbit: {...} } }
  const cargar = () => fetch(`/api/relojes?accion=estado&name=${encodeURIComponent(name || '')}`)
    .then(r => r.json()).then(setEstado).catch(() => setEstado({ ok: false }));
  useEffect(() => { cargar(); }, [name]);   // eslint-disable-line react-hooks/exhaustive-deps

  const desconectar = async (id) => {
    await fetch('/api/relojes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'desconectar', name, proveedor: id }) }).catch(() => {});
    cargar();
  };
  const conectados = (estado && estado.conectados) || {};
  const disponibles = (estado && estado.disponibles) || {};

  return (
    <div data-relojes style={{ paddingTop: arriba }}>
      <button onClick={alVolver} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 0, background: '#FFFFFF', boxShadow: SOMBRA, borderRadius: 99, padding: '8px 14px 8px 10px', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: TEXT, cursor: 'pointer', marginTop: 8 }}>
        <CaretLeft size={16} /> Configuración
      </button>
      <CabeceraHoy tema="dash" fondo={false} voz={{ etiqueta: 'RELOJES Y ANILLOS', a: 'Conecta tu reloj', b: 'y suma tus datos.', sub: 'Pasos, sueño, pulso y recuperación llegan solos a tu Dash y a tu coach.' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RELOJES.map(r => {
          const c = conectados[r.id];
          // Listo en la app y con la llave del coach puesta en el servidor.
          const sePuede = r.listo && disponibles[r.id] !== false;
          return (
            <div key={r.id} data-reloj={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', borderRadius: 18, padding: '14px 14px', boxShadow: SOMBRA }}>
              <span style={{ width: 40, height: 40, borderRadius: 99, background: c ? 'rgba(70,150,90,0.15)' : '#F1EFE9', color: c ? '#2A6A3A' : TEXT, display: 'grid', placeItems: 'center', flex: 'none' }}>
                {c ? <CheckCircle size={22} weight="fill" /> : <Watch size={21} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15.5, fontWeight: 750, color: TEXT }}>{r.nombre}</span>
                <span style={{ display: 'block', fontSize: 13, color: TEXT_MUTED }}>{c ? (c.estado === 'vencido' ? 'Hay que volver a conectarlo' : 'Conectado') : sePuede ? r.detalle : 'Pronto'}</span>
              </span>
              {c && c.estado !== 'vencido' ? (
                <button onClick={() => desconectar(r.id)} style={botonSuave}>Quitar</button>
              ) : sePuede ? (
                <a href={`/api/relojes?accion=conectar&proveedor=${r.id}&name=${encodeURIComponent(name || '')}`} style={botonFuerte}>Conectar</a>
              ) : (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT_LIGHT, padding: '0 6px' }}>Pronto</span>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 13, color: TEXT_LIGHT, lineHeight: 1.45, margin: '14px 4px 0' }}>
        Solo leemos lo que la marca permite compartir y puedes quitar el permiso cuando quieras.
      </p>
    </div>
  );
}

const botonSuave = { flex: 'none', height: 36, padding: '0 14px', borderRadius: 12, border: 0, background: '#F1EFE9', color: TEXT, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' };
const botonFuerte = { flex: 'none', height: 36, padding: '0 14px', borderRadius: 12, background: '#1F1F1F', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };
