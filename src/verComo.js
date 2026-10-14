// ─────────────────────────────────────────────────────────────────────────
// «VER COMO CLIENTE» (el coach, desde el CRM)
//
// La app se abre con ?ver_como=<pase> (index.html guarda el pase en
// sessionStorage y cambia localStorage por un almacén en memoria). Aquí:
//   1. se valida el pase en /api/ver-como y se siembra la sesión de ese
//      cliente (su nombre y su cuenta en la nube) en el almacén en memoria;
//   2. se instala la guardia de SOLO LECTURA: toda escritura al servidor
//      (marcar series, registrar comida, sincronizar, avisos push…) se corta
//      antes de salir y se avisa con una franja. Las lecturas pasan igual.
//   3. la franja «Viendo como … · solo lectura» queda fija en pantalla.
// Al cerrar la pestaña no queda nada: el almacén vive en memoria.
// ─────────────────────────────────────────────────────────────────────────

export const enVerComo = () => { try { return !!sessionStorage.getItem('mt:verComo'); } catch (e) { return false; } };

// Lo que SÍ puede pedir la app en este modo: lecturas de /api/training.
const LECTURAS_TRAINING = new Set(['plan', 'rutina', 'mes', 'rutinas', 'resumen', 'dash', 'conteo', 'catalogo', 'medidas', 'comunidad', 'fotos']);

function permitido(url, init) {
  const u = String(url || '');
  if (!/\/api\//.test(u)) return true;
  const metodo = String((init && init.method) || 'GET').toUpperCase();
  if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return true;
  let cuerpo = {};
  try { cuerpo = JSON.parse((init && init.body) || '{}') || {}; } catch (e) { cuerpo = {}; }
  if (u.includes('/api/training')) {
    if (LECTURAS_TRAINING.has(cuerpo.accion)) return true;
    // Mirar una rutina sin «entrenarla»: no crea sesión.
    return cuerpo.accion === 'abrir' && cuerpo.crear === false;
  }
  // El estado de la cuenta (activo, pausa…) se consulta; cambiar contraseña, no.
  if (u.includes('/api/authorize')) return !cuerpo.accion;
  if (u.includes('/api/ver-como')) return true;
  return false;
}

let avisoTimer = null;
function avisarSoloLectura() {
  try {
    let el = document.getElementById('mt-ver-como-aviso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mt-ver-como-aviso';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:100000;'
        + 'background:#1D1D1F;color:#F2C94C;font:700 13px/1.3 Figtree,system-ui,sans-serif;padding:9px 14px;border-radius:999px;'
        + 'box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .25s;opacity:0;pointer-events:none;white-space:nowrap';
      el.textContent = 'Solo lectura: aquí no se guarda nada';
      document.body.appendChild(el);
    }
    el.style.opacity = '1';
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
  } catch (e) { /* sin DOM */ }
}

function instalarGuardia() {
  const fetch0 = window.fetch.bind(window);
  window.fetch = (url, init) => {
    const u = typeof url === 'string' ? url : (url && url.url) || String(url);
    if (permitido(u, init)) return fetch0(url, init);
    avisarSoloLectura();
    return Promise.resolve(new Response(JSON.stringify({ ok: false, motivo: 'solo_lectura', error: 'solo lectura' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }));
  };
  // Tampoco se manda nada al cerrar la pestaña.
  if (navigator.sendBeacon) navigator.sendBeacon = () => true;
}

function pintarFranja(nombre) {
  try {
    const el = document.createElement('div');
    el.id = 'mt-ver-como';
    el.setAttribute('data-ver-como', nombre);
    // Arriba a la derecha, chica y sin interceptar toques: es un aviso, no
    // un botón (abajo tapaba el campo del chat).
    el.style.cssText = 'position:fixed;right:10px;top:calc(10px + env(safe-area-inset-top,0px));z-index:99999;pointer-events:none;'
      + 'background:#F2C94C;color:#1D1D1F;font:700 11px/1.2 Figtree,system-ui,sans-serif;padding:6px 10px;border-radius:999px;'
      + 'box-shadow:0 4px 14px rgba(0,0,0,.18);white-space:nowrap;max-width:60vw;overflow:hidden;text-overflow:ellipsis';
    el.textContent = `👁 Viendo como ${nombre} · solo lectura`;
    document.body.appendChild(el);
  } catch (e) { /* sin DOM */ }
}

function pantallaVencido() {
  try {
    document.documentElement.classList.remove('intro-anda');
    document.body.classList.add('app-ready');
    const root = document.getElementById('root');
    if (root) root.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;padding:28px;font:600 16px/1.5 Figtree,system-ui,sans-serif;color:#1D1D1F;text-align:center;background:#F4F1EB">'
      + '<div><div style="font-size:22px;font-weight:800;margin-bottom:8px">El pase venció</div>Vuelve al CRM y toca «Ver como cliente» otra vez.<br><span style="color:#6B6B6B;font-weight:500">Cada pase dura 15 minutos.</span></div></div>';
  } catch (e) { /* sin DOM */ }
}

// Devuelve null si no es este modo; si lo es, una promesa que resuelve
// { listo: true } cuando ya se puede montar la app, o { listo: false } si el
// pase venció (ya se pintó el aviso).
export function prepararVerComo({ novedades = [] } = {}) {
  if (!enVerComo()) return null;
  const token = sessionStorage.getItem('mt:verComo');
  instalarGuardia();
  return fetch(`/api/ver-como?token=${encodeURIComponent(token)}`)
    .then(r => r.json()).catch(() => null)
    .then(r => {
      if (!r || !r.ok || !r.name) { pantallaVencido(); return { listo: false }; }
      const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
      // La sesión del cliente, en el almacén en memoria: su nombre, su cuenta
      // en la nube (de ahí baja todo lo suyo) y «ya vio lo de primera vez».
      localStorage.setItem('mt:name', JSON.stringify(r.name));
      localStorage.setItem('cloudUserId', r.user_id);
      localStorage.setItem('cloudConsent', 'accepted');
      localStorage.setItem('mt:sesion', 'ver-como');
      localStorage.setItem('mt:primeraVezVista', '1');
      localStorage.setItem('mt:lastActiveAt', String(Date.now()));
      // Las ventanas de «algo nuevo» ya vistas: el coach viene a ver la app, no sus anuncios.
      localStorage.setItem('mt:novedadesVistas', JSON.stringify(novedades));
      sessionStorage.setItem('mt:avisoRegistro', hoy);
      sessionStorage.setItem('mt:booted', '1');
      window.__verComo = { name: r.name, user_id: r.user_id, exp: r.exp };
      pintarFranja(r.name);
      // Cuando el pase vence, se avisa (la guardia ya no deja escribir de todos modos).
      if (r.exp) setTimeout(() => pantallaVencido(), Math.max(1000, r.exp - Date.now()));
      return { listo: true };
    });
}
