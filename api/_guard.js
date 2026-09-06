// /api/_guard.js
// Protecciones compartidas para los endpoints (el prefijo "_" evita que
// Vercel lo exponga como función).
//
// ⚠ ANTES DE AGREGAR UN ARCHIVO NUEVO A api/ ⚠
// El plan Hobby de Vercel permite COMO MÁXIMO 12 funciones serverless por
// deploy. Cada .js de esta carpeta SIN guion bajo al principio cuenta como
// una. Pasarse de 12 no da un error de código: el deploy falla en ~13
// segundos y Vercel deja publicada la versión anterior — la app se ve
// "congelada" sin que nada parezca roto. Y `vite build` NO lo detecta:
// compila src/, no cuenta esta carpeta. Para contarlas:
//
//     ls api/*.js | grep -v '/_' | wc -l
//
// Si ya hay 12, no agregues otra: mete la acción nueva dentro de un endpoint
// existente (como training.js, que enruta por `accion`) o pon el prefijo "_"
// a lo que sea código compartido y no un endpoint.
//
// 1) checkOrigin: el navegador manda Origin/Referer; exigimos que coincida
//    con el host de la app (o con ALLOWED_ORIGINS, separados por coma).
//    Detiene el abuso casual de las keys (Anthropic/OpenAI) desde scripts o
//    sitios de terceros. No es autenticación fuerte, pero cierra la puerta
//    que estaba abierta de par en par.
// 2) rateLimit: límite simple por IP en memoria. Cada instancia serverless
//    tiene su propio contador (se reinicia con la instancia), suficiente
//    para frenar ráfagas y loops.

const buckets = new Map();

export function checkOrigin(req, { allowNoOrigin = false } = {}) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0].trim().toLowerCase();
  const source = req.headers.origin || req.headers.referer || '';
  if (!source) return allowNoOrigin;
  let sourceHost;
  try { sourceHost = new URL(source).host.toLowerCase(); } catch (e) { return false; }
  if (sourceHost === host) return true;
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return extra.some(o => {
    try { return new URL(o).host.toLowerCase() === sourceHost; } catch (e) { return o === sourceHost; }
  });
}

export function rateLimit(req, key, { limit = 30, windowMs = 60000 } = {}) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  if (buckets.size > 5000) buckets.clear();
  const bucketKey = `${key}:${ip}`;
  const b = buckets.get(bucketKey);
  if (!b || now - b.start > windowMs) {
    buckets.set(bucketKey, { start: now, count: 1 });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

// true = pasa; false = ya respondió 403/429.
export function guard(req, res, { key = 'api', limit = 30, allowNoOrigin = false } = {}) {
  if (!checkOrigin(req, { allowNoOrigin })) {
    res.status(403).json({ error: 'forbidden' });
    return false;
  }
  if (!rateLimit(req, key, { limit })) {
    res.status(429).json({ error: 'too many requests' });
    return false;
  }
  return true;
}
