// /api/_whatsapp.js
// Un WhatsApp AL COACH cuando un cliente le deja una nota de entreno.
//
// Va por CallMeBot: un servicio gratuito para mandarte mensajes a TU PROPIO
// número. No es la API oficial de WhatsApp Business (esa pide número de
// empresa aparte y plantillas aprobadas por Meta), pero para avisarse a uno
// mismo es lo más simple que existe.
//
// Se activa con dos variables en Vercel:
//   CALLMEBOT_APIKEY   la llave que te manda CallMeBot por WhatsApp
//   COACH_WHATSAPP     el número con indicativo, sin «+» (por defecto el tuyo)
//
// NUNCA rompe lo que la originó: sin llave, sin red o si CallMeBot falla, la
// nota ya quedó guardada y sale igual en la Bandeja del CRM y en el push.

const TELEFONO = () => String(process.env.COACH_WHATSAPP || '573008527043').replace(/\D/g, '');

export async function whatsappCoach(texto) {
  const key = process.env.CALLMEBOT_APIKEY;
  if (!key || !texto) return false;
  const url = 'https://api.callmebot.com/whatsapp.php'
    + `?phone=${TELEFONO()}&text=${encodeURIComponent(String(texto).slice(0, 900))}&apikey=${encodeURIComponent(key)}`;
  try {
    // CallMeBot a veces tarda; la nota no puede quedarse esperando por él.
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 6000) : null;
    const r = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
    if (t) clearTimeout(t);
    return !!(r && r.ok);
  } catch (e) {
    return false;
  }
}

// El texto del mensaje. Se arma aparte para poder probarlo.
//   📝 Nota de Juan Pérez
//   Ejercicio: Dumbbell Bench Press (Press banca con mancuernas)
//   Rutina: Push
//   «Me molesta el hombro en la bajada»
export function textoNotaWhatsapp({ cliente, ejercicio, rutina, alCerrar, texto }) {
  const lineas = [`📝 Nota de ${cliente}`];
  if (ejercicio) lineas.push(`Ejercicio: ${ejercicio}`);
  if (rutina) lineas.push(`${ejercicio ? 'Rutina' : alCerrar ? 'Al cerrar la rutina' : 'Sobre la rutina'}: ${rutina}`);
  else if (!ejercicio) lineas.push('Nota general');
  lineas.push(`«${String(texto).trim()}»`);
  return lineas.join('\n');
}
