// «Ahora no» de la encuesta de la app: la ventana sale UNA sola vez. Si dice
// «Ahora no», no vuelve a salir sola (insistir cada semana predispone); queda
// una línea tranquila en «Ver todo» del Dash para responderla cuando quiera.
// Va aparte de EncuestaApp.jsx para que la app no cargue la ventana entera
// solo para saber si la pospusieron.
export const CLAVE_LUEGO = 'mt:encuestaLuego';
export const encuestaPospuesta = () => { try { return !!localStorage.getItem(CLAVE_LUEGO); } catch (e) { return false; } };
export const posponerEncuesta = () => { try { localStorage.setItem(CLAVE_LUEGO, 'luego'); } catch (e) { /* sin almacenamiento */ } };
// Respondida: la línea de «Ver todo» se va.
export const encuestaRespondida = () => { try { localStorage.setItem(CLAVE_LUEGO, 'hecha'); } catch (e) { /* sin almacenamiento */ } };
// (Quien la pospuso con la versión anterior tiene guardada una fecha: también cuenta como «luego».)
export const encuestaEnVerTodo = () => { try { const v = localStorage.getItem(CLAVE_LUEGO); return !!v && v !== 'hecha'; } catch (e) { return false; } };
// Desde «Ver todo» se abre la misma ventana (la escucha MealTracker.jsx).
export const abrirEncuesta = () => { try { window.dispatchEvent(new Event('mt:abrirEncuesta')); } catch (e) { /* nada */ } };
