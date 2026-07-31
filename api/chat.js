// /api/chat.js
// Proxy serverless que protege la API key de Anthropic.
// La key vive solo en variables de entorno de Vercel, nunca en el navegador.

import { guard } from './_guard.js';

// Solo los modelos que la app usa realmente. Sin esto, cualquiera que
// descubriera el endpoint podía usar nuestra key con el modelo más caro.
const ALLOWED_MODEL_PREFIXES = ['claude-haiku-', 'claude-sonnet-'];
// Sonnet 5 cuenta ~30% más tokens que Haiku para el mismo texto (tokenizador
// nuevo), así que el techo sube para que las respuestas largas no se corten.
const MAX_TOKENS_CAP = 8000;

// ─── Registro de consumo de IA (para el tablero del CRM) ─────────────────
// Cada llamada al chat escribe una fila en la tabla `ia_uso` del Supabase del
// CRM (las MISMAS credenciales que ya usan payment-status.js y push-cron.js).
// Guarda: cliente, modelo, tokens (entrada/salida/caché) y costo calculado.
// Es "fire-and-forget": si el registro falla NUNCA rompe el chat del cliente.
const CRM_URL = (process.env.CRM_SUPABASE_URL || '').replace(/\/+$/, ''); // sin barra final: '...supabase.co/' rompia la URL (doble // -> 404)
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

// Precios por millón de tokens (USD). Sonnet 5 tiene precio introductorio
// hasta 2026-08-31; después sube ~50%. Se elige según la fecha de la llamada
// para que el costo guardado sea el real de ese día.
function pricingFor(model) {
  const m = String(model || '');
  if (m.startsWith('claude-haiku-')) {
    return { in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.10 };
  }
  // Sonnet 5
  const introHasta = Date.UTC(2026, 7, 31, 23, 59, 59); // 31 ago 2026
  const intro = Date.now() <= introHasta;
  return intro
    ? { in: 2, out: 10, cacheWrite: 2.50, cacheRead: 0.20 }
    : { in: 3, out: 15, cacheWrite: 3.75, cacheRead: 0.30 };
}

function costoUSD(model, u) {
  const p = pricingFor(model);
  const inp = Number(u.input_tokens || 0);
  const out = Number(u.output_tokens || 0);
  const cw = Number(u.cache_creation_input_tokens || 0);
  const cr = Number(u.cache_read_input_tokens || 0);
  return (inp * p.in + out * p.out + cw * p.cacheWrite + cr * p.cacheRead) / 1e6;
}

// Extrae el objeto usage de un stream SSE ya bufferizado. input/caché vienen
// en message_start; output_tokens final viene en el último message_delta.
function usageFromSSE(buffer) {
  const u = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  for (const line of String(buffer).split('\n')) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const json = t.slice(5).trim();
    if (!json || json === '[DONE]') continue;
    let ev; try { ev = JSON.parse(json); } catch (e) { continue; }
    if (ev.type === 'message_start' && ev.message?.usage) {
      const mu = ev.message.usage;
      u.input_tokens = Number(mu.input_tokens || 0);
      u.cache_creation_input_tokens = Number(mu.cache_creation_input_tokens || 0);
      u.cache_read_input_tokens = Number(mu.cache_read_input_tokens || 0);
      u.output_tokens = Number(mu.output_tokens || 0);
    } else if (ev.type === 'message_delta' && ev.usage) {
      if (ev.usage.output_tokens != null) u.output_tokens = Number(ev.usage.output_tokens);
    }
  }
  return u;
}

// Inserta una fila en ia_uso. No await bloqueante en la ruta del chat.
async function registrarUso({ model, usage, name, accion, mensaje }) {
  if (!CRM_URL || !CRM_KEY) return;             // CRM no configurado → no molesta
  const u = usage || {};
  const tokens = Number(u.input_tokens || 0) + Number(u.output_tokens || 0)
    + Number(u.cache_creation_input_tokens || 0) + Number(u.cache_read_input_tokens || 0);
  if (tokens === 0) return;                      // nada que registrar
  const row = {
    cliente_nombre: String(name || '').slice(0, 120) || null,
    modelo: model || null,
    accion: accion || 'chat',
    input_tokens: Number(u.input_tokens || 0),
    output_tokens: Number(u.output_tokens || 0),
    cache_read: Number(u.cache_read_input_tokens || 0),
    cache_write: Number(u.cache_creation_input_tokens || 0),
    costo_usd: Number(costoUSD(model, u).toFixed(6)),
    // Mensaje recortado a 500 chars: alcanza para leer el registro de comida
    // sin almacenar textos largos. Cambiar el 500 si se quiere más/menos.
    mensaje: mensaje ? String(mensaje).slice(0, 500) : null,
  };
  try {
    await fetch(`${CRM_URL}/rest/v1/ia_uso`, {
      method: 'POST',
      headers: {
        'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch (e) { /* el registro nunca rompe el chat */ }
}

// Permite enviar la respuesta por partes (streaming) en vez de esperar a que
// Anthropic termine de generar todo. El frontend muestra el avance en vivo.
export const config = { supportsResponseStreaming: true };

export default async function handler(req, res) {
  // Diagnóstico: GET ?ping=1 confirma qué versión de chat.js está desplegada
  // y prueba que ESTE archivo puede escribir en ia_uso. Sin secretos.
  if (req.method === 'GET' && (req.query?.ping === '1' || req.query?.ping === 'true')) {
    const host = (() => { try { return new URL(CRM_URL).host; } catch (e) { return CRM_URL || '(vacío)'; } })();
    let escritura = { ok: false, motivo: 'CRM no configurado' };
    if (CRM_URL && CRM_KEY) {
      try {
        const r = await fetch(`${CRM_URL}/rest/v1/ia_uso`, {
          method: 'POST',
          headers: { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ cliente_nombre: '__PING_CHAT__', modelo: 'test', accion: 'test', input_tokens: 1, output_tokens: 1, costo_usd: 0, mensaje: 'ping desde chat.js' }),
        });
        escritura = { ok: r.ok, http: r.status };
      } catch (e) { escritura = { ok: false, error: String(e).slice(0, 150) }; }
    }
    return res.status(200).json({
      version: 'ia-logging-2026-07-29',
      crm_configurado: !!(CRM_URL && CRM_KEY),
      crm_host: host,
      escritura_ia_uso: escritura,
    });
  }

  // Solo aceptamos POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificamos que la API key esté configurada
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!guard(req, res, { key: 'chat', limit: 20 })) return;

  try {
    const { model, max_tokens, system, messages, stream, name, accion, output_config, mensaje_cliente } = req.body;
    // Texto del cliente para el registro (qué dijo). El frontend nuevo lo
    // manda LIMPIO en `mensaje_cliente` (solo se registra, NO viaja a
    // Anthropic). OJO: el último mensaje del chat NO sirve tal cual — es el
    // prompt completo, que arranca con un bloque grande de CONTEXTO interno
    // idéntico para todos los clientes; registrar sus primeros 500 chars
    // mostraba "lo mismo" en todos en el tablero del CRM. Fallback para
    // versiones viejas de la app: recortar desde el marcador del mensaje.
    const ultimoMsg = Array.isArray(messages) && messages.length
      ? messages[messages.length - 1]?.content : null;
    const crudo = typeof ultimoMsg === 'string' ? ultimoMsg
      : (Array.isArray(ultimoMsg) ? ultimoMsg.map(b => b?.text || '').join(' ').trim() : null);
    const MARCA_MSG = '═══ MENSAJE ACTUAL DEL CLIENTE ═══';
    const mensajeTexto = (typeof mensaje_cliente === 'string' && mensaje_cliente.trim())
      ? mensaje_cliente.trim()
      : (crudo && crudo.includes(MARCA_MSG) ? crudo.split(MARCA_MSG).pop().trim() : crudo);

    if (typeof model === 'string' && !ALLOWED_MODEL_PREFIXES.some(p => model.startsWith(p))) {
      return res.status(400).json({ error: 'Model not allowed' });
    }

    // Validación básica
    if (!model || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hasContent = (c) => {
      if (typeof c === 'string') return c.trim().length > 0;
      if (Array.isArray(c)) return c.length > 0;
      return c != null;
    };
    const cleanedMessages = Array.isArray(messages)
      ? messages.filter((m) => m && hasContent(m.content))
      : messages;

    if (Array.isArray(cleanedMessages) && cleanedMessages.length === 0) {
      return res.status(400).json({ error: 'No messages with content' });
    }

    // Llamada real a Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-5',
        max_tokens: Math.min(Number(max_tokens) || 4000, MAX_TOKENS_CAP),
        // Parámetros por modelo, fijados en el server:
        // - Sonnet 5 RECHAZA temperature con error 400 (la API la eliminó en
        //   esa generación). Para consistencia de macros y respuesta rápida se
        //   apaga el "thinking" (razonamiento extendido): sin él, Sonnet 5
        //   responde casi tan rápido como Haiku y no gasta tokens extra de
        //   salida. El parseo de comidas no necesita razonamiento profundo.
        // - Haiku sigue con temperature 0: el mismo "arepa mediana" daba
        //   números distintos cada día con la temperature por defecto (1.0) —
        //   el reporte de inconsistencia de los clientes. Determinismo primero.
        ...(String(model || '').startsWith('claude-sonnet-5')
          ? {
              thinking: { type: 'disabled' },
              // Con el thinking ya apagado, el esfuerzo controla cuántos tokens
              // de salida gasta. Registros de comida → 'low' (extraer macros no
              // requiere deliberación); generar planes → 'medium' (un poco más
              // de calidad). El cliente no nota la diferencia en el chat diario.
              // format (si el frontend lo manda): salida estructurada — la API
              // garantiza JSON válido con esa forma. Solo se acepta json_schema.
              output_config: {
                effort: accion === 'plan' ? 'medium' : 'low',
                ...(output_config && output_config.format && output_config.format.type === 'json_schema'
                  ? { format: output_config.format } : {}),
              },
            }
          : { temperature: 0 }),
        system: system || '',
        messages: cleanedMessages,
        ...(stream ? { stream: true } : {}),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: data.error?.message || 'Anthropic API error',
        status: response.status,
      });
    }

    if (stream) {
      // Reenvía los eventos SSE de Anthropic tal cual llegan. Así la primera
      // parte de la respuesta viaja al navegador apenas se genera, en vez de
      // quedarse retenida acá hasta el final.
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      let sseBuffer = '';
      // TextDecoder: los chunks del stream llegan como Uint8Array, y su
      // .toString('utf8') NO decodifica — devuelve "104,101,..." (los bytes
      // como números). Por eso usageFromSSE encontraba 0 tokens y el registro
      // se saltaba. TextDecoder decodifica bien y arma chars partidos entre
      // chunks. Este era el motivo de que el chat real no grabara en ia_uso.
      const _dec = new TextDecoder();
      for await (const chunk of response.body) {
        res.write(chunk);
        try { sseBuffer += _dec.decode(chunk, { stream: true }); } catch (e) {}
      }
      try { sseBuffer += _dec.decode(); } catch (e) {}
      // El registro va ANTES de res.end(): en serverless la función se congela
      // al cerrar la respuesta, y un await DESPUÉS de res.end() no alcanza a
      // correr. El cliente ya recibió todos los chunks por res.write(); solo
      // se demora ~100ms el cierre del stream (imperceptible).
      const usage = usageFromSSE(sseBuffer);
      await registrarUso({ model, usage, name, accion, mensaje: mensajeTexto });
      res.end();
      return;
    }

    const data = await response.json();
    // Se ESPERA el registro antes de responder: en serverless, el trabajo
    // async lanzado sin await tras enviar la respuesta se cancela cuando la
    // función se congela — por eso las filas de ia_uso no se guardaban.
    // registrarUso tiene su propio try/catch, así que nunca rompe el chat.
    await registrarUso({ model, usage: data.usage, name, accion, mensaje: mensajeTexto });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    // Si el stream ya arrancó no se puede cambiar el status: solo cerramos y
    // el frontend detecta el JSON incompleto y reintenta.
    if (res.headersSent) return res.end();
    return res.status(500).json({ error: 'Internal server error' });
  }
}
