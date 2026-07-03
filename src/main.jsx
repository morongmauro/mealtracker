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
import MealTracker from './MealTracker.jsx';

// El dashboard del coach se carga en un chunk aparte: los clientes no
// descargan su código, y el coach solo lo baja al entrar a /coach.
const CoachDashboard = lazy(() => import('./CoachDashboard.jsx'));

// Ruteo simple: si la URL arranca con /coach, renderiza el dashboard.
// Cualquier otra ruta renderiza la app del cliente.
const path = (typeof window !== 'undefined' && window.location.pathname) || '/';
const isCoach = path === '/coach' || path.startsWith('/coach/');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isCoach
      ? <Suspense fallback={null}><CoachDashboard /></Suspense>
      : <MealTracker />}
  </React.StrictMode>
);

// Oculta el splash una vez React renderizó.
if (typeof window !== 'undefined') {
  requestAnimationFrame(() => {
    setTimeout(() => document.body.classList.add('app-ready'), 80);
  });
}

// ─── Auto-actualización sin refresh manual ────────────────────────────────
// Cada build genera /version.json con un sello único. La app lo consulta al
// volver a primer plano y cada 5 minutos; si el servidor tiene un build más
// nuevo, recarga sola en un momento seguro (cuando el cliente VUELVE a la app,
// nunca a mitad de uso). Todo el estado vive en localStorage, así que la
// recarga no pierde nada. Con esto nunca más hay que pedir "haz refresh".
if (typeof window !== 'undefined') {
  let currentVersion = null;
  let updateReady = false;

  const checkVersion = async () => {
    try {
      const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const { version } = await r.json();
      if (!version) return;
      if (currentVersion === null) { currentVersion = version; return; }
      if (version !== currentVersion) updateReady = true;
    } catch (e) { /* sin red: se reintenta luego */ }
  };

  const applyIfReady = () => {
    if (updateReady) window.location.reload();
  };

  checkVersion();
  setInterval(checkVersion, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Al volver a la app: aplica una actualización pendiente o re-verifica.
      applyIfReady();
      checkVersion();
    } else {
      // Al salir de la app es el momento más seguro para recargar.
      applyIfReady();
    }
  });
}
