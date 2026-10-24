// «Ahora no» de la encuesta de la app: vuelve a salir la semana siguiente.
// Va aparte de EncuestaApp.jsx para que la app no cargue la ventana entera
// solo para saber si la pospusieron.
import { hoyLocal, sumarDias, aFecha } from './entrenoDatos.js';

export const CLAVE_LUEGO = 'mt:encuestaLuego';
const lunesDeHoy = () => { const h = hoyLocal(); return sumarDias(h, -((aFecha(h).getDay() + 6) % 7)); };
export const encuestaPospuesta = () => { try { return localStorage.getItem(CLAVE_LUEGO) === lunesDeHoy(); } catch (e) { return false; } };
export const posponerEncuesta = () => { try { localStorage.setItem(CLAVE_LUEGO, lunesDeHoy()); } catch (e) { /* sin almacenamiento */ } };
