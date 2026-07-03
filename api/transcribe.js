// /api/transcribe.js
// Proxy serverless que reenvía el audio del cliente a la API de Whisper de OpenAI
// para transcribirlo. La key de OpenAI vive solo en variables de entorno de Vercel.
//
// Espera un POST con multipart/form-data que contiene:
//   - file: el blob de audio (webm/mp4/wav)
//   - model: "whisper-1" (lo envía el frontend)
//   - language: "es"   (lo envía el frontend)
//
// Devuelve: { text: "transcripción..." }

import { guard } from './_guard.js';

export const config = {
  api: {
    bodyParser: false, // necesitamos el cuerpo raw para reenviar el multipart
  },
};

// Whisper acepta hasta 25MB; un dictado de comida jamás pasa de unos pocos MB.
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  if (!guard(req, res, { key: 'transcribe', limit: 10 })) return;

  try {
    // Acumulamos el body raw del multipart
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_AUDIO_BYTES) {
        return res.status(413).json({ error: 'Audio too large' });
      }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return res.status(400).json({ error: 'Expected multipart/form-data' });
    }

    // Lo reenviamos tal cual a OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': contentType,
      },
      body: body,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'OpenAI Whisper API error',
      });
    }

    return res.status(200).json({ text: data.text || '' });
  } catch (error) {
    console.error('Transcribe proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
