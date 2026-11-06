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

// Las suscripciones del CRM del coach (coach-data?action=push_sub) llevan
// este nombre. Si tiene alguna, los avisos van al CRM (y abren donde hay que
// actuar: `ir`, p. ej. '?seg=<cliente>' o '?ver=bandeja'); si no, a su app de
// cliente como siempre.
export const CRM_COACH = 'crm:coach';

export async function alertarCoach({ title, body, tag = 'ecm-coach-alerta', ir = '?ver=bandeja' }) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return 0;
    webpush.setVapidDetails('mailto:morongmauro@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,name,sub`, { headers: h });
    const subs = r.ok ? await r.json() : [];
    const todas = Array.isArray(subs) ? subs : [];
    // A su app (la de cliente, con la vista coach adentro): al tocarlo abre el
    // CRM en ese cliente (?coach=…). Y si además activó avisos en el CRM de
    // un navegador, también ahí.
    const destino = String(ir || '').replace(/^\/+/, '');
    const mias = [
      ...todas.filter(s => normalizeName(s.name) === normalizeName(COACH)).map(s => [s, `/?coach=${encodeURIComponent(destino)}`]),
      ...todas.filter(s => s.name === CRM_COACH).map(s => [s, `/${destino}`]),
    ];
    let n = 0;
    for (const [s, url] of mias) {
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({ title: String(title).slice(0, 80), body: String(body).slice(0, 300), tag, url }));
        n++;
      } catch (e) { /* suscripción vieja: la limpia el cron de siempre */ }
    }
    return n;
  } catch (e) {
    return 0;
  }
}
