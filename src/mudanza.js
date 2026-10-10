// ─────────────────────────────────────────────────────────────────────────
// MUDANZA A LA DIRECCIÓN NUEVA
//
// La app pasa de mealtrackermauromoron.vercel.app a DOMINIO_NUEVO. Las dos
// direcciones sirven el MISMO proyecto y la MISMA base de datos: lo único
// que no viaja solo es lo que cada teléfono guarda por dirección (el
// almacenamiento del navegador es por dominio, y en iPhone la app de la
// pantalla de inicio además tiene el suyo aparte).
//
// Por eso la mudanza tiene tres piezas:
//   1. En la dirección VIEJA, un aviso con «Pasar a la app nueva»: sube TODO
//      a la cuenta en la nube (y el entreno pendiente), y solo entonces abre
//      la nueva con el nombre en la dirección.
//   2. En la dirección NUEVA, si llega ?mudanza=1&n=<nombre>, la app entra
//      directo con ese nombre y trae la cuenta de la nube.
//   3. En cualquier instalación nueva, si el nombre ya tiene cuenta en la
//      nube, se recupera sola (sin depender de que toque «Sí» en el aviso de
//      la nube). Esa pieza vive en MealTracker.jsx.
//
// ENCENDER: cuando DOMINIO_NUEVO ya abra la app, poner MUDANZA_ACTIVA en true.
// La dirección vieja NO se quita de Vercel: quien no se haya pasado sigue
// usándola con todo, y los enlaces viejos siguen funcionando.
// ─────────────────────────────────────────────────────────────────────────

export const DOMINIO_NUEVO = 'entrenaconmetodo.vercel.app';
export const MUDANZA_ACTIVA = false;

const PRUEBA = 'mt:probarMudanza';   // solo pruebas: enciende el aviso en localhost

export function mudanzaActiva() {
  if (MUDANZA_ACTIVA) return true;
  try { return localStorage.getItem(PRUEBA) === '1'; } catch (e) { return false; }
}

// ¿Estamos en una dirección que no es la nueva? (la vieja, o una de prueba)
export function enDireccionVieja() {
  if (typeof window === 'undefined' || !mudanzaActiva()) return false;
  return window.location.host !== DOMINIO_NUEVO;
}

// ¿Estamos ya en la dirección nueva? (no depende del interruptor: sirve para
// marcar en el CRM quién ya se pasó y para la comprobación al llegar).
export function enDireccionNueva() {
  if (typeof window === 'undefined') return false;
  try { if (localStorage.getItem('mt:probarDireccionNueva') === '1') return true; } catch (e) {}
  return window.location.host === DOMINIO_NUEVO;
}

export function urlDeLlegada(nombre) {
  const base = (() => { try { return localStorage.getItem('mt:urlNuevaPrueba'); } catch (e) { return null; } })()
    || `https://${DOMINIO_NUEVO}/`;
  return `${base}?mudanza=1&n=${encodeURIComponent(nombre || '')}`;
}

// Pieza 2: al llegar a la dirección nueva desde la vieja. Corre ANTES de que
// la app lea su almacenamiento: deja el nombre y el sí a la nube para que la
// cuenta se traiga sola. Nunca pisa un nombre que ya estuviera guardado aquí.
export function recibirMudanza() {
  if (typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('mudanza') !== '1') return false;
    const n = String(q.get('n') || '').trim().slice(0, 80);
    if (n && !localStorage.getItem('mt:name')) {
      localStorage.setItem('mt:name', JSON.stringify(n));
      localStorage.setItem('cloudConsent', 'accepted');
      localStorage.setItem('mt:llegoDeMudanza', String(Date.now()));
    }
    q.delete('mudanza'); q.delete('n');
    const resto = q.toString();
    window.history.replaceState(null, '', window.location.pathname + (resto ? `?${resto}` : '') + window.location.hash);
    return !!n;
  } catch (e) {
    return false;
  }
}
