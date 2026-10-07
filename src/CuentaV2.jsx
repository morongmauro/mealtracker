// ─────────────────────────────────────────────────────────────────────────
// CUENTA · visual nueva (por ahora solo Mauro)
//
// La llave del cliente sigue siendo su NOMBRE; aquí se le agrega una
// contraseña atada al correo que ya tiene en el CRM (api/authorize.js). Con
// eso queda con la sesión guardada en el teléfono: cerrar la app no le pide
// nada; solo si la borra y la vuelve a instalar, o si cierra sesión, entra de
// nuevo con su correo y su contraseña, y su información vuelve de la nube.
//
// Pantallas, todas en negro como el ícono y la entrada:
//   entrada   (el teléfono no sabe quién es) correo + contraseña, o «Primera
//             vez»: su nombre del CRM → activar la cuenta
//   activar   su nombre y su correo del CRM + crear la contraseña
//   entrar    «Hola, Mauro.» + su correo + la contraseña
//   datos     «Tus datos están protegidos» (acepta la nube)
//   avisos    activar las notificaciones
// ─────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { WHATSAPP_COACH } from './v2.js';

const NEGRO = '#0C0C0B', AMARILLO = '#F2C94C', GRIS = '#9C9A94', LINEA = '#2C2C2A', CAMPO = '#171716';
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
};

// El ícono de la app, que se dibuja al entrar (como la entrada).
function Icono({ tam = 84 }) {
  return (
    <svg viewBox="0 0 512 512" width={tam} height={tam} aria-hidden="true" className="cv2-icono" style={{ display: 'block', overflow: 'visible' }}>
      <g transform="translate(256 262) scale(0.9) translate(-256 -248)" fill="none">
        <path className="cv2-traza" d="M128 162 C96 72 160 18 256 18 C352 18 416 72 384 162" pathLength="100" stroke="#FFFFFF" strokeWidth="34" strokeLinecap="round" />
        <path className="cv2-traza" d="M256 164 A136 136 0 1 1 120 300" pathLength="100" stroke="#FFFFFF" strokeWidth="37" strokeLinecap="round" />
        <circle cx="120" cy="300" r="26.6" fill={AMARILLO} />
      </g>
    </svg>
  );
}

const CSS = `
[data-cuenta-v2] { animation: cv2-fondo .3s ease both; }
@keyframes cv2-fondo { from { opacity: 0 } to { opacity: 1 } }
[data-cuenta-v2] .cv2-traza { stroke-dasharray: 100 100; stroke-dashoffset: 100; animation: cv2-traza .8s cubic-bezier(.45,0,.3,1) .1s forwards; }
@keyframes cv2-traza { to { stroke-dashoffset: 0 } }
[data-cuenta-v2] .cv2-sube { opacity: 0; transform: translateY(10px); animation: cv2-sube .5s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes cv2-sube { to { opacity: 1; transform: none } }
[data-cuenta-v2] input { font: inherit; }
[data-cuenta-v2] input:focus { outline: none; border-color: ${AMARILLO} !important; }
[data-cuenta-v2] input::placeholder { color: #5E5D59; }
@media (prefers-reduced-motion: reduce) { [data-cuenta-v2] * { animation-duration: .01s !important; animation-delay: 0s !important; } }`;

function Campo({ etiqueta, ...props }) {
  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: GRIS, margin: '0 0 6px 2px', letterSpacing: '0.02em' }}>{etiqueta}</span>
      <input {...props} style={{
        width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 14, border: `1.5px solid ${LINEA}`,
        background: CAMPO, color: '#FFFFFF', fontSize: 16.5, padding: '0 16px', ...(props.style || {}),
      }} />
    </label>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 14, background: CAMPO, border: `1.5px solid ${LINEA}`, marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: GRIS, letterSpacing: '0.02em' }}>{etiqueta}</div>
      <div style={{ fontSize: 16.5, fontWeight: 700, color: '#FFFFFF', marginTop: 2, overflowWrap: 'anywhere' }}>{valor}</div>
    </div>
  );
}

function Boton({ children, onClick, cargando, secundario, ...resto }) {
  return (
    <button onClick={onClick} disabled={cargando} {...resto} style={{
      width: '100%', height: 54, borderRadius: 16, border: secundario ? `1.5px solid ${LINEA}` : 0, cursor: 'pointer',
      background: secundario ? 'transparent' : '#FFFFFF', color: secundario ? '#FFFFFF' : NEGRO,
      fontSize: 16.5, fontWeight: 800, fontFamily: 'inherit', marginTop: 12, opacity: cargando ? 0.6 : 1,
    }}>{cargando ? 'Un momento…' : children}</button>
  );
}

const Enlace = ({ children, onClick, href }) => {
  const st = { display: 'block', width: '100%', marginTop: 16, background: 'none', border: 0, color: GRIS, fontSize: 14.5, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center', textDecoration: 'none' };
  return href ? <a href={href} target="_blank" rel="noreferrer" style={st}>{children}</a> : <button onClick={onClick} style={st}>{children}</button>;
};

// `nombre`: el que ya conoce el teléfono (null = no sabe quién es).
// `alSesion(sesion, nombre)`: entró (guardar sesión y nombre).
// `alAceptarDatos()`, `alActivarAvisos()`: los dos pasos finales.
// `alListo()`: terminó. `alSaltar`: seguir sin contraseña (solo si el
// servidor no responde: nunca deja a nadie afuera de su app).
export default function CuentaV2({ nombre = null, datosAceptados = false, alSesion, alAceptarDatos, alActivarAvisos, alListo, alSaltar }) {
  const [paso, setPaso] = useState(nombre ? 'cargando' : 'entrada');
  const [cuenta, setCuenta] = useState(null);       // { nombre, email, tieneClave }
  const [nombreEscrito, setNombreEscrito] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [caido, setCaido] = useState(false);

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
    setCuenta(r); setEmail(r.email || '');
    setPaso(r.tieneClave ? 'entrar' : 'activar');
  };
  useEffect(() => { if (nombre) traerCuenta(nombre); /* eslint-disable-next-line */ }, []);

  const despues = () => {
    if (!datosAceptados) return setPaso('datos');
    if (avisosPendientes()) return setPaso('avisos');
    alListo && alListo();
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

  let contenido;
  if (paso === 'cargando') {
    contenido = <div style={{ color: GRIS, fontSize: 15, marginTop: 28, textAlign: 'center' }}>Un momento…</div>;
  } else if (paso === 'error') {
    contenido = (
      <>
        <h1 style={titulo}>Casi listo.</h1>
        <p style={bajada}>{error}</p>
        <Boton onClick={() => traerCuenta(nombre)} cargando={cargando}>Intentar de nuevo</Boton>
        {alSaltar && <Enlace onClick={alSaltar}>Seguir por ahora</Enlace>}
      </>
    );
  } else if (paso === 'entrada') {
    contenido = (
      <>
        <h1 style={titulo} className="cv2-sube">Entrena con<br /><span style={{ color: AMARILLO }}>Método.</span></h1>
        <p style={bajada} className="cv2-sube">Entra con tu correo y tu contraseña.</p>
        <div className="cv2-sube" style={{ animationDelay: '.1s' }}>
          <Campo etiqueta="Correo" type="email" inputMode="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
          <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') entrar(); }} />
          {error && <div role="alert" style={alerta}>{error}</div>}
          <Boton onClick={entrar} cargando={cargando} data-entrar>Entrar</Boton>
          <Enlace onClick={() => { setError(''); setPaso('primera'); }}>¿Primera vez en la app? <b style={{ color: '#FFFFFF' }}>Activa tu cuenta</b></Enlace>
        </div>
      </>
    );
  } else if (paso === 'primera') {
    contenido = (
      <>
        <h1 style={titulo} className="cv2-sube">Bienvenido.</h1>
        <p style={bajada} className="cv2-sube">Escribe tu nombre completo, como lo tiene tu coach.</p>
        <Campo etiqueta="Tu nombre completo" autoComplete="name" value={nombreEscrito} onChange={e => setNombreEscrito(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') traerCuenta(nombreEscrito); }} placeholder="Nombre y apellido" />
        {error && <div role="alert" style={alerta}>{error}</div>}
        <Boton onClick={() => nombreEscrito.trim().split(/\s+/).length < 2 ? setError('Escribe tu nombre y tu apellido.') : traerCuenta(nombreEscrito)} cargando={cargando}>Continuar</Boton>
        <Enlace onClick={() => { setError(''); setPaso('entrada'); }}>Ya tengo contraseña</Enlace>
      </>
    );
  } else if (paso === 'activar') {
    contenido = (
      <>
        <h1 style={titulo} className="cv2-sube">Activa tu<br />cuenta.</h1>
        <p style={bajada} className="cv2-sube">Ponle una contraseña. Con ella entras siempre, aunque cambies de teléfono, y tu información queda solo tuya.</p>
        <div className="cv2-sube" style={{ animationDelay: '.1s' }}>
          <Dato etiqueta="Tu nombre" valor={cuenta?.nombre} />
          {cuenta?.email
            ? <Dato etiqueta="Tu correo" valor={cuenta.email} />
            : <Campo etiqueta="Tu correo" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />}
          <Campo etiqueta="Crea tu contraseña" type="password" autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <Campo etiqueta="Repítela" type="password" autoComplete="new-password" value={clave2} onChange={e => setClave2(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') activar(); }} />
          {error && <div role="alert" style={alerta}>{error}</div>}
          <Boton onClick={activar} cargando={cargando} data-activar>Activar mi cuenta</Boton>
          {caido && alSaltar && <Enlace onClick={alSaltar}>Seguir por ahora</Enlace>}
        </div>
      </>
    );
  } else if (paso === 'entrar') {
    contenido = (
      <>
        <h1 style={titulo} className="cv2-sube">Hola,<br /><span style={{ color: AMARILLO }}>{primerNombre}.</span></h1>
        <p style={bajada} className="cv2-sube">Entra con tu contraseña.</p>
        <div className="cv2-sube" style={{ animationDelay: '.1s' }}>
          {cuenta?.email && <Dato etiqueta="Tu correo" valor={cuenta.email} />}
          <Campo etiqueta="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') entrar(); }} />
          {error && <div role="alert" style={alerta}>{error}</div>}
          <Boton onClick={entrar} cargando={cargando} data-entrar>Entrar</Boton>
          {wa && <Enlace href={wa}>¿Olvidaste tu contraseña? Escríbele a tu coach</Enlace>}
          {caido && alSaltar && <Enlace onClick={alSaltar}>Seguir por ahora</Enlace>}
        </div>
      </>
    );
  } else if (paso === 'datos') {
    contenido = (
      <>
        <h1 style={titulo} className="cv2-sube">Tus datos,<br /><span style={{ color: AMARILLO }}>protegidos.</span></h1>
        <div className="cv2-sube" style={{ animationDelay: '.08s' }}>
          {[
            ['Solo tú y tu coach', 'Lo que registras lo ven tú y tu coach. Nadie más.'],
            ['Guardados en la nube', 'Si cambias de teléfono, todo vuelve al entrar con tu correo y tu contraseña.'],
            ['Nunca se comparten', 'No se venden ni se usan para publicidad.'],
          ].map(([t, d]) => (
            <div key={t} style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <span style={{ width: 9, height: 9, borderRadius: 99, background: AMARILLO, marginTop: 7, flex: 'none' }} />
              <div><div style={{ fontSize: 16.5, fontWeight: 800, color: '#FFFFFF' }}>{t}</div><div style={{ fontSize: 14.5, color: GRIS, marginTop: 2, lineHeight: 1.45 }}>{d}</div></div>
            </div>
          ))}
          <Boton onClick={() => { alAceptarDatos && alAceptarDatos(); avisosPendientes() ? setPaso('avisos') : alListo && alListo(); }} data-aceptar-datos>Aceptar y seguir</Boton>
        </div>
      </>
    );
  } else if (paso === 'avisos') {
    contenido = (
      <>
        <h1 style={titulo} className="cv2-sube">Activa tus<br /><span style={{ color: AMARILLO }}>avisos.</span></h1>
        <p style={bajada} className="cv2-sube">Te aviso cuando tu coach te escriba, te ajuste el plan o te toque entrenar. Nada de spam.</p>
        <div className="cv2-sube" style={{ animationDelay: '.1s' }}>
          <Boton onClick={async () => { setCargando(true); try { await (alActivarAvisos && alActivarAvisos()); } finally { setCargando(false); alListo && alListo(); } }} cargando={cargando} data-activar-avisos>Activar avisos</Boton>
          <Boton secundario onClick={() => alListo && alListo()}>Ahora no</Boton>
        </div>
      </>
    );
  }

  return (
    <div data-cuenta-v2={paso} style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: `radial-gradient(120% 60% at 50% 0%, #1E1E1C 0%, ${NEGRO} 70%)`,
      color: '#FFFFFF', overflowY: 'auto', fontFamily: "var(--f-ui, 'Figtree Variable'), Figtree, system-ui, sans-serif",
      padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 24px calc(env(safe-area-inset-bottom, 0px) + 32px)',
    }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Icono />
        {contenido}
      </div>
    </div>
  );
}

function avisosPendientes() {
  try { return typeof Notification !== 'undefined' && Notification.permission === 'default' && 'serviceWorker' in navigator; } catch (e) { return false; }
}

const titulo = { margin: '26px 0 0', fontSize: 40, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.04, color: '#FFFFFF' };
const bajada = { margin: '12px 0 8px', fontSize: 16, lineHeight: 1.5, color: GRIS };
const alerta = { marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(242,201,76,0.12)', color: AMARILLO, fontSize: 14, fontWeight: 650, lineHeight: 1.4 };
