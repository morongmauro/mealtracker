// Recetas favoritas del Recetario (la estrella). Viven en el teléfono y en la
// cuenta del cliente (sync.js → recetas_favoritas), así no se pierden si cambia
// de celular. Se guarda la lista entera con la hora del último cambio: gana la
// más nueva, así desmarcar en un teléfono no se «resucita» desde otro.
const CLAVE = 'mt:recetas_favoritas';
export const EVENTO_FAVORITAS = 'mt:recetasFavoritas';

export function leerFavoritas() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (d && Array.isArray(d.ids)) return { ids: d.ids.filter(x => typeof x === 'string'), at: String(d.at || '') };
  } catch (e) { /* sin datos */ }
  return { ids: [], at: '' };
}

const escribir = (d) => {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* lleno o bloqueado */ }
  try { window.dispatchEvent(new CustomEvent(EVENTO_FAVORITAS)); } catch (e) { /* sin ventana */ }
};

export const idsFavoritas = () => leerFavoritas().ids;
export const esFavorita = (id) => leerFavoritas().ids.includes(id);

// on = true marca, false desmarca. Devuelve si quedó marcada.
export function marcarFavorita(id, on = true) {
  const d = leerFavoritas();
  const ya = d.ids.includes(id);
  if (on === ya) return ya;
  const ids = on ? [id, ...d.ids] : d.ids.filter(x => x !== id);
  escribir({ ids: ids.slice(0, 200), at: new Date().toISOString() });
  return on;
}

// Lo que llega de la cuenta: se adopta solo si es más nuevo que lo de aquí.
export function adoptarFavoritasNube(remoto) {
  if (!remoto || !Array.isArray(remoto.ids)) return;
  const local = leerFavoritas();
  if (String(remoto.at || '') > local.at) escribir({ ids: remoto.ids.filter(x => typeof x === 'string').slice(0, 200), at: String(remoto.at || '') });
}

// Para subir a la cuenta (undefined si nunca tocó la estrella).
export function favoritasParaNube() {
  const d = leerFavoritas();
  return d.at ? d : undefined;
}
