// ¿Se pide instalar la app antes de la cuenta? (InstalarPrimero.jsx). Va
// aparte para que la app no cargue la ventana entera solo para saberlo.
import { esIphone, esAndroid, appInstalada } from './InstalarApp.jsx';
import { enVerComo } from './verComo.js';

export const CLAVE_SALTO = 'mt:seguirNavegador';
const saltado = () => { try { return sessionStorage.getItem(CLAVE_SALTO) === '1'; } catch (e) { return false; } };

// Solo en teléfonos, en el navegador, sin la app instalada, sin «ver como
// cliente» y si no eligió seguir en el navegador en esta visita.
export const pedirInstalarPrimero = () => (esIphone() || esAndroid()) && !appInstalada() && !enVerComo() && !saltado();
