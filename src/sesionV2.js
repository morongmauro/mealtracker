// La sesión de la cuenta (correo + contraseña) guardada en el teléfono.
// Vive aparte de CuentaV2.jsx para que la pantalla de la cuenta se cargue
// solo cuando hace falta (la app arranca sin ella).
export const CLAVE_SESION = 'mt:sesion';
export const leerSesion = () => { try { return localStorage.getItem(CLAVE_SESION) || ''; } catch (e) { return ''; } };
export const guardarSesion = (s) => { try { s ? localStorage.setItem(CLAVE_SESION, s) : localStorage.removeItem(CLAVE_SESION); } catch (e) { /* nada */ } };
