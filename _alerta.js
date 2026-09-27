// /api/_alerta.js
// Aviso push AL COACH, al instante, cuando un cliente hace algo que pide que
// lo mires: registra una medida nueva o te deja una nota sobre su rutina.
//
// Llega a los teléfonos donde el coach tiene la app de cliente con los
// recordatorios activados (se busca su suscripción por nombre). El nombre sale
// de COACH_PUSH_NAME en Vercel; si no está, 'Mauro Morón'.
//
// NUNCA rompe lo que la originó: si no hay push configurado o falla, el dato
// ya quedó guardado y aparece igual en la Bandeja del CRM.

import webpush from 'web-push';
import { normalizeName } from './_entreno.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const COACH = process.env.COACH_PUSH_NAME || 'Mauro Morón';

export async function alertarCoach({ title, body, tag = 'ecm-coach-alerta' }) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return 0;
    webpush.setVapidDetails('mailto:morongmauro@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,name,sub`, { headers: h });
    const subs = r.ok ? await r.json() : [];
    const mias = (Array.isArray(subs) ? subs : []).filter(s => normalizeName(s.name) === normalizeName(COACH));
    let n = 0;
    for (const s of mias) {
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({ title: String(title).slice(0, 80), body: String(body).slice(0, 300), tag, url: '/' }));
        n++;
      } catch (e) { /* suscripción vieja: la limpia el cron de siempre */ }
    }
    return n;
  } catch (e) {
    return 0;
  }
}
