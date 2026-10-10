// ─────────────────────────────────────────────────────────────────────────
// CUENTA · visual nueva (por ahora solo Mauro)
//
// La llave del cliente sigue siendo su NOMBRE; aquí se le agrega una
// contraseña atada al correo que ya tiene en el CRM (api/authorize.js). Con
// eso queda con la sesión guardada en el teléfono: cerrar la app no le pide
// nada; solo si la borra y la vuelve a instalar, o si cierra sesión, entra de
// nuevo con su correo y su contraseña, y su información vuelve de la nube.
//
// Pantallas, con el fondo de manchas de la marca y una tarjeta de cristal
// (VentanaMarca.jsx), como todas las ventanas de primera vez:
//   entrada   (el teléfono no sabe quién es) correo + contraseña, o «Primera
//             vez»: su nombre del CRM → activar la cuenta
//   activar   su nombre y su correo del CRM + crear la contraseña
//   entrar    «Hola, Mauro.» + su correo + la contraseña
//   datos     «Tus datos están protegidos» (acepta la nube)
//   avisos    activar las notificaciones
//   recorrido «¿Te muestro la app?» (si aún no lo ha hecho)
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { LockSimple, ShieldCheck, Bell, MapPin, Check } from '@phosphor-icons/react';
import { WHATSAPP_COACH } from './v2.js';
import VentanaMarca, { BotonVentana, GRAFITO, AMARILLO, GRIS_TXT } from './VentanaMarca.jsx';
import { recorridoHecho } from './recorridoEstado.js';
import { SECCION, DASH_AZUL } from './theme.js';

const GRIS = '#8E8E93', CAMPO = 'rgba(255,255,255,0.85)';
export const CLAVE_SESION = 'mt:sesion';

export const leerSesion = () => { try { return localStorage.getItem(CLAVE_SESION) || ''; } catch (e) { return ''; } };
export const guardarSesion = (s) => { try { s ? localStorage.setItem(CLAVE_SESION, s) : localStorage.removeItem(CLAVE_SESION); } catch (e) { /* nada */ } };

async function pedir(cuerpo) {
  try {
    const r = await fetch('/api/authorize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    return await r.json();
  } catch (e) { return { ok: false, error: 'red' }; }
}

const ERRORES = {
  clave: 'Esa contraseña no es. Revísala e intenta de nuevo.',
  corta: 'La contraseña debe tener al menos 6 caracteres.',
  distintas: 'Las dos contraseñas no coinciden.',
  no_existe: 'No encuentro ese nombre o ese correo. Escríbelo como lo tiene tu coach.',
  inactivo: 'Tu plan no está activo. Escríbele a tu coach para retomarlo.',
  sin_clave: 'Aún no has creado tu contraseña: toca «Primera vez en la app».',
  ya_tiene: 'Ya tienes contraseña. Entra con ella.',
  red: 'No hay conexión. Intenta en un momento.',
  crm: 'No pude conectar con tu cuenta. Intenta en un momento.',
  sin_migracion: 'Tu cuenta aún no está lista. Intenta más tarde.',
  correo: 'Ese no es el correo que tiene tu coach. Revísalo o escríbele.',
  correo_invalido: 'Escribe tu correo (tu@correo.com).',
};
const pareceCorreo = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

function Campo({ etiqueta, fin = null, ...props }) {
  return (
    <label style={{ display: 'block', position: 'relative', marginTop: 10, background: CAMPO, borderRadius: 14, padding: '8px 14px 6px', paddingRight: fin ? 40 : 14 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: GRIS }}>{etiqueta}</span>
      {fin && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>{fin}</span>}
      <input {...props} style={{
        width: '100%', boxSizing: 'border-box', height: 28, border: 0, background: 'transparent', borderRadius: 6,
        color: GRAFITO, fontSize: 17, fontWeight: 600, padding: 0, ...(props.style || {}),
      }} />
    </label>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div style={{ padding: '8px 14px', borderRadius: 14, background: CAMPO, marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: GRIS }}>{etiqueta}</div>
        <div style={{ fontSize: 17, fontWeight: 600, color: GRAFITO, marginTop: 1, overflowWrap: 'anywhere' }}>{valor}</div>
      </div>
      <Check size={18} weight="bold" color="#46965A" />
    </div>
  );
}

const Boton = BotonVentana;

const Enlace = ({ children, onClick, href }) => {
  const st = { display: 'block', width: '100%', marginTop: 10, background: 'none', border: 0, color: GRIS_TXT, fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', textDecoration: 'none' };
  return href ? <a href={href} target="_blank" rel="noreferrer" style={st}>{children}</a> : <button onClick={onClick} style={st}>{children}</button>;
};

// `nombre`: el que ya conoce el teléfono (null = no sabe quién es).
// `alSesion(sesion, nombre)`: entró (guardar sesión y nombre).
// `alAceptarDatos()`, `alActivarAvisos()`: los dos pasos finales.
// `alRecorrido()`: «Empezar recorrido» (si no viene, no se ofrece).
// `alListo()`: terminó. `alSaltar`: seguir sin contraseña (solo si el
// servidor no responde: nunca deja a nadie afuera de su app).
// `pendientes`: ya tiene sesión; solo las ventanas de primera vez que le
// falten (datos, avisos, recorrido). Es lo que ve la primera vez que abre la
// app nueva quien ya tenía cuenta.
export default function CuentaV2({ nombre = null, datosAceptados = false, pendientes = false, alSesion, alAceptarDatos, alActivarAvisos, alRecorrido, alListo, alSaltar }) {
  const [paso, setPaso] = useState(() => {
    if (!pendientes) return nombre ? 'cargando' : 'entrada';
    if (!datosAceptados) return 'datos';
    if (avisosPendientes()) return 'avisos';
    if (alRecorrido && !recorridoHecho() && !recorridoOfrecido()) return 'recorrido';
    return 'nada';
  });
  const [cuenta, setCuenta] = useState(null);       // { nombre, email, tieneClave }
  const [nombreEscrito, setNombreEscrito] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [caido, setCaido] = useState(false);
  // ¿El correo escrito es el que tiene el coach? null = aún no se sabe.
  const [coincide, setCoincide] = useState(null);
  useEffect(() => {
    if (paso !== 'activar' || !cuenta?.tieneCorreo) return;
    setCoincide(null);
    if (!pareceCorreo(email)) return;
    let vivo = true;
    const t = setTimeout(async () => {
      const r = await pedir({ accion: 'correo', name: cuenta?.nombre || nombre, email: email.trim() });
      if (vivo && r && r.ok) setCoincide(!!r.coincide);
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [email, paso, cuenta]);   // eslint-disable-line react-hooks/exhaustive-deps

  const traerCuenta = async (n) => {
    setCargando(true); setError('');
    const r = await pedir({ accion: 'cuenta', name: n });
    setCargando(false);
    if (!r.ok) {
      setError(ERRORES[r.error] || ERRORES.crm);
      if (['red', 'crm', 'sin_migracion'].includes(r.error)) setCaido(true);
      if (nombre) setPaso('error');
      return;
    }
    setCuenta(r); setEmail('');
    setPaso(r.tieneClave ? 'entrar' : 'activar');
  };
  useEffect(() => { if (pendientes) { if (paso === 'nada' && alListo) alListo(); return; } if (nombre) traerCuenta(nombre); /* eslint-disable-next-line */ }, []);

  // Lo que sigue después de los avisos: invitar al recorrido (una vez).
  const ofrecerRecorrido = !!alRecorrido && !recorridoHecho() && !recorridoOfrecido();
  const terminar = () => { if (ofrecerRecorrido && paso !== 'recorrido') setPaso('recorrido'); else if (alListo) alListo(); };
  const despues = () => {
    if (!datosAceptados) return setPaso('datos');
    if (avisosPendientes()) return setPaso('avisos');
    terminar();
  };
  const listo = (r) => { alSesion && alSesion(r.sesion, r.nombre); despues(); };

  const entrar = async () => {
    setError('');
    if (!clave) return setError('Escribe tu contraseña.');
    setCargando(true);
    const r = await pedir(paso === 'entrada'
      ? { accion: 'entrar', email: email.trim(), clave }
      : { accion: 'entrar', name: cuenta?.nombre || nombre, clave });
    setCargando(false);
    if (!r.ok) { setError(ERRORES[r.error] || ERRORES.crm); setCaido(['red', 'crm', 'sin_migracion'].includes(r.error)); return; }
    listo(r);
  };
  const activar = async () => {
    setError('');
    if (!pareceCorreo(email)) return setError(ERRORES.correo_invalido);
    if (cuenta?.tieneCorreo && coincide === false) return setError(ERRORES.correo);
    if (clave.length < 6) return setError(ERRORES.corta);
    if (clave !== clave2) return setError(ERRORES.distintas);
    setCargando(true);
    const r = await pedir({ accion: 'crear', name: cuenta?.nombre || nombre, clave, email: email.trim() || undefined });
    setCargando(false);
    if (!r.ok) { setError(ERRORES[r.error] || ERRORES.crm); setCaido(['red', 'crm', 'sin_migracion'].includes(r.error)); return; }
    listo(r);
  };
  const wa = WHATSAPP_COACH ? `https://wa.me/${WHATSAPP_COACH}?text=${encodeURIComponent('Hola Mau! Olvidé mi contraseña de la app')}` : null;
  const primerNombre = String(cuenta?.nombre || nombre || '').split(' ')[0];

  // Cada pantalla: símbolo, título, texto y lo de abajo.
  const I = (Icono, color) => <Icono size={28} weight="fill" color={color} />;
  let v = {};
  if (paso === 'cargando') {
    v = { cuerpo: <div style={{ color: GRIS_TXT, fontSize: 15, textAlign: 'center', padding: '10px 0' }}>Un momento…</div> };
  } else if (paso === 'error') {
    v = { titulo: 'Casi listo.', texto: error, cuerpo: (<>
      <Boton onClick={() => traerCuenta(nombre)} cargando={cargando}>Intentar de nuevo</Boton>
      {alSaltar && <Enlace onClick={alSaltar}>Seguir por ahora</Enlace>}
    </>) };
  } else if (paso === 'entrada') {
    v = { simbolo: I(LockSimple, GRAFITO), titulo: <>Entrena con Método<span style={{ color: AMARILLO }}>.</span></>, texto: 'Entra con tu correo y tu contraseña.', cuerpo: (<>
      <Campo etiqueta="Correo" type="email" inputMode="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
      <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') entrar(); }} />
      {error && <div role="alert" style={alerta}>{error}</div>}
      <Boton onClick={entrar} cargando={cargando} data-entrar>Entrar</Boton>
      <Enlace onClick={() => { setError(''); setPaso('primera'); }}>¿Primera vez en la app? <b style={{ color: GRAFITO }}>Activa tu cuenta</b></Enlace>
    </>) };
  } else if (paso === 'primera') {
    v = { titulo: 'Bienvenido.', texto: 'Escribe tu nombre completo, como lo tiene tu coach.', cuerpo: (<>
      <Campo etiqueta="Tu nombre completo" autoComplete="name" value={nombreEscrito} onChange={e => setNombreEscrito(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') traerCuenta(nombreEscrito); }} placeholder="Nombre y apellido" />
      {error && <div role="alert" style={alerta}>{error}</div>}
      <Boton onClick={() => nombreEscrito.trim().split(/\s+/).length < 2 ? setError('Escribe tu nombre y tu apellido.') : traerCuenta(nombreEscrito)} cargando={cargando}>Continuar</Boton>
      <Enlace onClick={() => { setError(''); setPaso('entrada'); }}>Ya tengo contraseña</Enlace>
    </>) };
  } else if (paso === 'activar') {
    v = { simbolo: I(LockSimple, GRAFITO), titulo: 'Activa tu cuenta.', texto: 'Ponle una contraseña. Con ella entras siempre, aunque cambies de teléfono, y tu información queda solo tuya.', cuerpo: (<>
      <Dato etiqueta="Tu nombre" valor={cuenta?.nombre} />
      {/* El correo: si el coach lo tiene, la pista tapada a medias en gris
          (como lo muestran los bancos); al escribirlo igual sale el check. */}
      <Campo etiqueta="Tu correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email}
        onChange={e => { setEmail(e.target.value); if (error) setError(''); }} placeholder={cuenta?.pista || 'tu@correo.com'} data-correo
        fin={coincide === true ? <Check size={18} weight="bold" color="#46965A" data-correo-ok /> : null} />
      {cuenta?.tieneCorreo && (
        <div data-pista-correo style={{ fontSize: 13, color: coincide === false ? '#B5481A' : GRIS, margin: '6px 4px 0', lineHeight: 1.4 }}>
          {coincide === false ? 'Ese no es el correo que tiene tu coach.' : coincide === true ? 'Es el correo que tiene tu coach.' : <>Escribe el correo que tiene tu coach: <b style={{ fontWeight: 600 }}>{cuenta.pista}</b></>}
        </div>
      )}
      <Campo etiqueta="Crea tu contraseña" type="password" autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)} placeholder="Mínimo 6 caracteres" />
      <Campo etiqueta="Repítela" type="password" autoComplete="new-password" value={clave2} onChange={e => setClave2(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') activar(); }} />
      {error && <div role="alert" style={alerta}>{error}</div>}
      <Boton onClick={activar} cargando={cargando} data-activar>Activar mi cuenta</Boton>
      {wa && error === ERRORES.correo && <Enlace href={wa.replace(encodeURIComponent('Olvidé mi contraseña de la app'), encodeURIComponent('No me reconoce mi correo en la app'))}>Escríbele a tu coach</Enlace>}
      {caido && alSaltar && <Enlace onClick={alSaltar}>Seguir por ahora</Enlace>}
    </>) };
  } else if (paso === 'entrar') {
    v = { simbolo: I(LockSimple, GRAFITO), titulo: <>Hola, {primerNombre}.</>, texto: 'Entra con tu contraseña.', cuerpo: (<>
      {cuenta?.pista && <div style={{ fontSize: 13.5, color: GRIS, textAlign: 'center', marginTop: 2 }}>{cuenta.pista}</div>}
      <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') entrar(); }} />
      {error && <div role="alert" style={alerta}>{error}</div>}
      <Boton onClick={entrar} cargando={cargando} data-entrar>Entrar</Boton>
      {wa && <Enlace href={wa}>¿Olvidaste tu contraseña? Escríbele a tu coach</Enlace>}
      {caido && alSaltar && <Enlace onClick={alSaltar}>Seguir por ahora</Enlace>}
    </>) };
  } else if (paso === 'datos') {
    v = { simbolo: I(ShieldCheck, '#46965A'), titulo: 'Tus datos, protegidos.', cuerpo: (<>
      {[
        ['Solo tú y tu coach', 'Lo que registras lo ven tú y tu coach. Nadie más.'],
        ['Guardados en la nube', 'Si cambias de teléfono, todo vuelve al entrar con tu correo y tu contraseña.'],
        ['Nunca se comparten', 'No se venden ni se usan para publicidad.'],
      ].map(([t, d]) => (
        <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: CAMPO, borderRadius: 14, padding: '11px 14px', marginTop: 8 }}>
          <Check size={17} weight="bold" color="#46965A" style={{ marginTop: 2, flex: 'none' }} />
          <div><div style={{ fontSize: 15.5, fontWeight: 700, color: GRAFITO }}>{t}</div><div style={{ fontSize: 13.5, color: GRIS_TXT, marginTop: 1, lineHeight: 1.4 }}>{d}</div></div>
        </div>
      ))}
      <Boton onClick={() => { alAceptarDatos && alAceptarDatos(); avisosPendientes() ? setPaso('avisos') : terminar(); }} data-aceptar-datos>Aceptar y seguir</Boton>
    </>) };
  } else if (paso === 'avisos') {
    v = { simbolo: I(Bell, '#C95F17'), titulo: 'Activa tus avisos.', texto: 'Te aviso cuando tu coach te escriba, te ajuste el plan o te toque entrenar. Nada de spam.', cuerpo: (<>
      <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 18, padding: '11px 13px', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }}>
        <img src="/icon-192.png" alt="" width="36" height="36" style={{ borderRadius: 9, flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>Tu coach<span style={{ fontWeight: 500, color: GRIS }}>ahora</span></div>
          <div style={{ fontSize: 13.5, color: '#3A3A3C', marginTop: 1 }}>Hoy te toca entrenar.</div>
        </div>
      </div>
      <Boton onClick={async () => { setCargando(true); try { await (alActivarAvisos && alActivarAvisos()); } finally { setCargando(false); terminar(); } }} cargando={cargando} data-activar-avisos>Activar avisos</Boton>
      <Boton secundario onClick={terminar}>Ahora no</Boton>
    </>) };
  } else if (paso === 'recorrido') {
    v = { simbolo: I(MapPin, DASH_AZUL.ink || '#2F6CC4'), titulo: '¿Te muestro la app?', texto: 'Un recorrido de un minuto por las cuatro secciones.', cuerpo: (<>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {[['Dash', DASH_AZUL.base], ['Entreno', SECCION.entreno.base], ['Comida', SECCION.comida.base], ['Aprende', SECCION.aprende.base]].map(([t, c]) => (
          <div key={t} style={{ width: 70, height: 58, borderRadius: 18, background: CAMPO, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i style={{ width: 12, height: 12, borderRadius: 99, background: c }} /><span style={{ fontSize: 11.5, fontWeight: 700 }}>{t}</span>
          </div>
        ))}
      </div>
      <Boton onClick={() => { marcarOfrecido(); alListo && alListo(); alRecorrido && alRecorrido(); }} data-empezar-recorrido>Empezar recorrido</Boton>
      <Boton secundario onClick={() => { marcarOfrecido(); alListo && alListo(); }}>Lo veo después</Boton>
    </>) };
  }
  // Los puntitos: cuenta, datos, avisos y recorrido (los que le tocan).
  const etapas = [...(pendientes ? [] : ['cuenta']), ...(datosAceptados ? [] : ['datos']), ...(avisosPendientes() ? ['avisos'] : []), ...(ofrecerRecorrido ? ['recorrido'] : [])];
  const enEtapa = Math.max(0, etapas.indexOf(['datos', 'avisos', 'recorrido'].includes(paso) ? paso : 'cuenta'));

  if (paso === 'nada') return null;
  return (
    <VentanaMarca data-cuenta-v2={paso} paso={enEtapa} pasos={etapas.length} simbolo={v.simbolo} titulo={v.titulo} texto={v.texto}>
      {v.cuerpo}
    </VentanaMarca>
  );
}

// La invitación al recorrido sale una sola vez (después queda en la
// configuración del Dash, «Recorrido de la app»).
const CLAVE_OFRECIDO = 'mt:recorridoOfrecido';
const recorridoOfrecido = () => { try { return !!localStorage.getItem(CLAVE_OFRECIDO); } catch (e) { return true; } };
const marcarOfrecido = () => { try { localStorage.setItem(CLAVE_OFRECIDO, '1'); } catch (e) {} };

function avisosPendientes() {
  try { return typeof Notification !== 'undefined' && Notification.permission === 'default' && 'serviceWorker' in navigator; } catch (e) { return false; }
}

const alerta = { marginTop: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(242,201,76,0.2)', color: '#7A5A00', fontSize: 14, fontWeight: 650, lineHeight: 1.4 };
