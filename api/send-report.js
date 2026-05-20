// /api/send-report.js
// Proxy serverless that sends a weekly report email via Resend.
// API key lives only in Vercel environment variables.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Resend API key not configured' });
  }

  try {
    const { clientName, summary, pdfBase64, weekLabel } = req.body;

    if (!clientName || !summary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Resend send endpoint
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Meal Tracker <onboarding@resend.dev>',
        to: ['morongmauro@gmail.com'],
        subject: `Reporte semanal — ${clientName}`,
        html: summary,
        attachments: pdfBase64 ? [{
          filename: `reporte-${clientName.replace(/\s+/g, '-').toLowerCase()}-${weekLabel || 'semana'}.pdf`,
          content: pdfBase64,
        }] : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Resend API error',
        details: data,
      });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (error) {
    console.error('Send report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
