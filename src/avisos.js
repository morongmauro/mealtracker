// ─────────────────────────────────────────────────────────────────────────
// AVISOS AL TELÉFONO · qué recibir (Configuración → Notificaciones)
//
// El cliente apaga lo que no quiere, por tipo. Vive en el teléfono
// (mt:avisos) y viaja con las preferencias del dispositivo a la nube
// (prefs_dispositivo), donde el servidor lo mira ANTES de enviar: lo apagado
// no le llega (api/_avisos.js). Sin nada guardado, llega todo.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

export const CLAVE_AVISOS = 'mt:avisos';

export const TIPOS_AVISO = [
  { id: 'dia', titulo: 'Recordatorio del día', detalle: 'Hoy te toca entrenar / registrar' },
  { id: 'coach', titulo: 'Comentarios de tu coach', detalle: 'Para la próxima vez y respuestas' },
  { id: 'ciclo', titulo: 'Ciclo o rutina nueva', detalle: 'Cuando tu coach te envía el plan' },
  { id: 'descanso', titulo: 'Fin del descanso', detalle: 'Con la app minimizada' },
];

export function leerAvisos() {
  try { const o = JSON.parse(localStorage.getItem(CLAVE_AVISOS) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}

export function guardarAviso(id, encendido) {
  const o = { ...leerAvisos(), [id]: !!encendido };
  try { localStorage.setItem(CLAVE_AVISOS, JSON.stringify(o)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('mt:avisos')); } catch (e) {}
  return o;
}

// Solo «false» apaga: lo que nunca se tocó sigue llegando.
export const avisoPermitido = (id) => leerAvisos()[id] !== false;

export function useAvisos() {
  const [avisos, setAvisos] = useState(leerAvisos);
  useEffect(() => {
    const f = () => setAvisos(leerAvisos());
    window.addEventListener('mt:avisos', f); window.addEventListener('storage', f);
    return () => { window.removeEventListener('mt:avisos', f); window.removeEventListener('storage', f); };
  }, []);
  return avisos;
}
