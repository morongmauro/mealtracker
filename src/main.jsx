import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Fuentes self-hosted (antes: @import a Google Fonts, que bloqueaba el primer
// pintado y dependía de red externa). Vite las sirve con hash + cache eterno.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/bebas-neue/latin-400.css';
import MealTracker, { NOVEDADES } from './MealTracker.jsx';
import Salvavidas from './Salvavidas.jsx';
import { prepararVerComo } from './verComo.js';
import { instalarBitacora } from './bitacora.js';

// El dashboard del coach se carga en un chunk aparte: los clientes no
// descargan su código, y el coach solo lo baja al entrar a /coach.
const CoachDashboard = lazy(() => import('./CoachDashboard.jsx'));
// Ranking público del mes ("camino a la cima") — página liviana sin login
// que los clientes abren directo por link. También en chunk aparte.
const Ranking = lazy(() => import('./Ranking.jsx'));

// Ruteo simple: /coach → dashboard, /ranking → tablero público,
// cualquier otra ruta renderiza la app del cliente.
const path = (typeof window !== 'undefined' && window.location.pathname) || '/';
const isCoach = path === '/coach' || path.startsWith('/coach/');
const isRanking = path === '/ranking' || path.startsWith('/ranking/');

// Con la entrada animada en pantalla, este código ya llega DESPUÉS de que el
// ícono y el nombre terminan de entrar (vite.config.js, entradaSinTrabasPlugin): armar
// la app es lo que ocupa al teléfono, y las líneas del ícono se dibujan en ese
// mismo hilo; si coinciden, la animación se traba a la mitad. En desarrollo
// (sin ese plugin) se espera aquí lo mismo.
const esperaEntrada = (() => {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return 0;
  const r = document.documentElement;
  if (!r.classList.contains('intro-anda') || r.classList.contains('warm-start')) return 0;
  return Math.max(0, (window.__introDesde || 0) + 2000 - performance.now());
})();

const montar = () => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isCoach
      ? <Suspense fallback={null}><CoachDashboard /></Suspense>
      : isRanking
        ? <Suspense fallback={null}><Ranking /></Suspense>
        : <Salvavidas><MealTracker /></Salvavidas>}
  </React.StrictMode>
);
// «Ver como cliente» (el coach, desde el CRM): primero se valida el pase y
// se siembra la sesión de ese cliente; si venció, no se monta nada.
const verComo = prepararVerComo({ novedades: [NOVEDADES.version].filter(Boolean) });
// Lo que falle en el teléfono del cliente queda en la bitácora del CRM.
if (!verComo) instalarBitacora();
if (verComo) verComo.then(r => { if (r.listo) montar(); });
else if (esperaEntrada > 0) setTimeout(montar, esperaEntrada); else montar();

// Oculta el splash una vez React renderizó. Mínimo de exhibición: la
// animación del logo dura ~1.4s; el mínimo de 2.2s deja la animación
// completa + ~0.8s del logo terminado en pantalla — tiempo suficiente para
// APRECIAR el opener sin que se sienta lento (rango premium: 2–2.5s). Si la
// carga es lenta NO se agrega espera (el mínimo corre en paralelo).
// Arranque CALIENTE (misma sesión: volver de Aprendizaje, "atrás",
// recarga por update): el opener ni se muestra (ver warm-start en
// index.html) y no se retiene nada — directo a la app.
if (typeof window !== 'undefined') {
  const warmStart = (() => { try { return !!sessionStorage.getItem('mt:booted'); } catch (e) { return false; } })();
  // Visual nueva: la entrada (cada vez que se abre la app, ver index.html)
  // dura ~2 s desde que ARRANCA; el fondo se desvanece y aparece la app.
  // Arranca cuando la app ya está armada debajo: mientras React monta, el
  // teléfono está ocupado y la animación se trabaría (se veía «congelada»).
  const raiz = document.documentElement;
  const splashV2 = raiz.classList.contains('splash-v2');
  const conEntrada = raiz.classList.contains('intro-completa');
  const ENTRADA_MS = 2700;
  const cerrarEntrada = () => {
    document.body.classList.add('app-ready');
    if (splashV2) { const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', '#F3F1EB'); }
    try { sessionStorage.setItem('mt:booted', '1'); } catch (e) {}
  };
  // Cierra la entrada 2,7 s después de que arrancó (o en cuanto la app esté
  // armada, si tardó más): el nombre termina de entrar a los ~2 s y se ve
  // quieto ~0,7 s más, con el blob ya convertido en el ícono. La app se arma
  // recién a los 2 s, con todo ya quieto: armarla mientras algo se mueve
  // congelaba las letras a mitad de camino y las soltaba de golpe.
  const correrEntrada = () => {
    const desde = (window.__empezarIntro && window.__empezarIntro()) || performance.now();
    setTimeout(cerrarEntrada, Math.max(80, desde + ENTRADA_MS - performance.now()));
  };
  // Por si algo se traba: la app nunca queda escondida debajo de la entrada.
  if (splashV2 && conEntrada) setTimeout(cerrarEntrada, 9000);
  if (warmStart || !splashV2) {
    // La de siempre (otros clientes): mínimo 2,2 s; recarga en la misma sesión: nada.
    const MIN = warmStart ? 0 : 2200;
    requestAnimationFrame(() => setTimeout(cerrarEntrada, Math.max(80, MIN - performance.now())));
  } else if (!conEntrada) {
    requestAnimationFrame(() => setTimeout(cerrarEntrada, 80));
  } else {
    // «Armada» = React ya pintó algo en #root; dos cuadros más y un respiro
    // para que terminen los efectos del primer render.
    const root = document.getElementById('root');
    const listo = () => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(correrEntrada, 120)));
    if (root && root.childElementCount) listo();
    else if (root && typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(() => { if (root.childElementCount) { mo.disconnect(); listo(); } });
      mo.observe(root, { childList: true });
    } else listo();
  }

  // La entrada otra vez al volver a la app tras 2 h o más en segundo plano
  // (es «abrirla después de un buen rato»). Nunca en medio de un entreno.
  if (splashV2) {
    let ocultaDesde = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { ocultaDesde = Date.now(); return; }
      if (!ocultaDesde || Date.now() - ocultaDesde < 2 * 60 * 60 * 1000) return;
      ocultaDesde = 0;
      if (document.querySelector('[data-reloj-sesion]')) return;
      const viejo = document.getElementById('splash2');
      if (!viejo) return;
      // Un clon limpio y en cero: así todo arranca desde el inicio.
      const nuevo = viejo.cloneNode(true);
      raiz.classList.remove('intro-anda');
      raiz.classList.add('intro-completa', 'intro-repite');
      document.body.classList.remove('app-ready');
      viejo.replaceWith(nuevo);
      window.__introDesde = 0;
      // Un cuadro para que el clon pinte su estado inicial y luego, a correr.
      requestAnimationFrame(() => requestAnimationFrame(correrEntrada));
    });
  }
}

// ─── Auto-actualización sin refresh manual ────────────────────────────────
// Cada build genera /version.json con un sello único, y ese MISMO sello queda
// incrustado en el bundle como __BUILD_VERSION__ (ver vite.config.js). La app
// compara el sello del código que ESTÁ corriendo contra el del servidor; si
// difieren, este código es viejo y se recarga en un momento seguro.
//
// Por qué el sello incrustado es clave: antes la base de comparación era el
// PRIMER fetch de version.json. Si el teléfono arrancaba con un bundle viejo
// servido de caché (típico en PWA de pantalla de inicio) pero el servidor ya
// tenía un build nuevo, esa primera lectura "adoptaba" la versión nueva como
// si fuera la propia — el mismatch no se detectaba nunca y el cliente quedaba
// clavado en la versión vieja para siempre, por más que usara la app todo el
// día. Con el sello dentro del bundle eso es imposible: un bundle viejo
// siempre sabe que es viejo.
if (typeof window !== 'undefined') {
  const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : null;
  let updateReady = false;

  const checkVersion = async () => {
    if (!BUILD_VERSION) return; // dev server: no hay version.json ni sello
    try {
      const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const { version } = await r.json();
      if (version && version !== BUILD_VERSION) updateReady = true;
    } catch (e) { /* sin red: se reintenta luego */ }
  };

  // `arranque`: la app recién se abre en frío. Ahí se actualiza aunque haya
  // una rutina abierta: la rutina y lo tecleado están guardados y vuelven
  // solos al recargar (entrenoDatos.js), y todavía no se tocó nada. Antes
  // esperaba a que se cerrara la rutina y una rutina olvidada dejaba la app
  // vieja hasta 8 horas.
  const applyIfReady = (arranque = false) => {
    if (!updateReady) return;
    // Con la app en uso y una rutina abierta no se recarga delante del
    // cliente: entra cuando la cierre (o al abrir la app la próxima vez).
    if (!arranque) {
      try {
        const r = JSON.parse(localStorage.getItem('mt:rutinaAbierta') || 'null');
        if (r && r.id && Date.now() - (r.t || 0) < 8 * 3600 * 1000) return;
      } catch (e) { /* sin almacenamiento */ }
    }
    // Guard anti-bucle: si tras recargar la caché sigue sirviendo este mismo
    // bundle viejo, no volvemos a recargar (evita un loop infinito de reloads;
    // el próximo intento llega solo con el siguiente ciclo de visibilidad).
    try {
      if (sessionStorage.getItem('mt:reloadedForBuild') === BUILD_VERSION) return;
      sessionStorage.setItem('mt:reloadedForBuild', BUILD_VERSION);
    } catch (e) {}
    window.location.reload();
  };

  // Al abrir la app: si este bundle ya es viejo, recarga de inmediato — el
  // usuario recién llega y no ha empezado a interactuar, es el momento más
  // seguro de todos. Así la versión nueva entra apenas abren, sin esperar.
  checkVersion().then(() => applyIfReady(true));
  setInterval(checkVersion, 5 * 60 * 1000);
  // Al volver a la app NO se recarga delante del cliente: se veía la pantalla
  // donde quedó, luego todo en blanco y luego el Dash, como si la app
  // fallara. Tampoco al salir (en el teléfono esa recarga quedaba a medias y
  // se terminaba de ver al volver). La actualización entra:
  //   - al abrir la app en frío (arriba), o
  //   - al volver tras ≥ 30 min fuera: ahí sí se recarga, pero con la
  //     entrada animada completa (se borra la marca de «ya arrancó»), que es
  //     lo que se espera al abrir la app después de un rato.
  let ocultaDesde = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') { ocultaDesde = Date.now(); return; }
    const fuera = ocultaDesde ? Date.now() - ocultaDesde : 0;
    ocultaDesde = 0;
    const aplicarConEntrada = () => {
      if (!updateReady || fuera < 30 * 60 * 1000) return;
      try { sessionStorage.removeItem('mt:booted'); } catch (e) {}
      applyIfReady();
    };
    aplicarConEntrada();
    checkVersion().then(aplicarConEntrada);
  });
}

// ─── Service worker de notificaciones push ───────────────────────────────
// SOLO push (sin caché): no interfiere con el auto-update de version.json.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
