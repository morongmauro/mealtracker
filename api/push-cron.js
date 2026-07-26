// /api/push-cron.js
// El emisor de recordatorios push. Lo dispara un cron EXTERNO cada hora en
// punto (GitHub Action del repo: .github/workflows/push-cron.yml) con
// ?key=<CRON_SECRET>. En cada corrida revisa la hora LOCAL de cada
// suscripción (tz capturada del teléfono al suscribirse) y envía el
// recordatorio del turno si corresponde:
//
//   08:00 local → arranque del día (registra tu desayuno)
//   12:00 local → medio día (skip si ya registró algo hoy: no molestamos
//                 a quien ya está usando la app)
//   20:00 local → cierre del día (skip si ya lleva 3+ registros hoy)
//   12:00 local → ADEMÁS recordatorio de pago SOLO a quien está en deuda
//                 (misma regla que el banner de payment-status: corte
//                 vencido y mes sin pago marcado en el CRM)
//
// Mensajes rotativos (por día del año) para no sonar a robot repetido.
// Suscripciones muertas (410/404) se eliminan solas.
//
// Env (Vercel): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET,
//               SUPABASE_URL, SUPABASE_SERVICE_KEY (ya existentes),
//               CRM_SUPABASE_URL, CRM_SUPABASE_SERVICE_KEY (ya existentes).
//
// TAMBIÉN atiende el push MANUAL del coach ("📲 Push" del CRM) vía POST
// (autenticado con el token de coach). Vive aquí y no en /api/push-send.js
// porque el plan Hobby de Vercel permite máximo 12 funciones serverless y
// este repo ya está en el límite; vercel.json reescribe /api/push-send
// hacia esta función para que el CRM no cambie.
//   POST { user_id?, name?, title?, body } → { ok, sent } | { ok:false, causa }

import webpush from 'web-push';
import { verifyCoachToken } from './coach-auth.js';
import { checkOrigin } from './_guard.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRM_URL = process.env.CRM_SUPABASE_URL;
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

const sbHeaders = (key) => ({ 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' });

const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

// ── Copys: profesionales, cálidos, accionables — 3 variantes por turno ──
const MSGS = {
  morning: [
    'Buenos días ☀️ Un registro a tiempo vale más que uno perfecto. Cuando desayunes, cuéntamelo.',
    'Arranca el día con claridad: registra tu desayuno y el resto fluye ☀️',
    'Nuevo día, mismo método. Tu primer registro marca la pauta 💪',
  ],
  midday: [
    '¿Almuerzo listo? Dos líneas en tu registro y tu día sigue en orden 🍽',
    'Mitad del día: registrar ahora te ahorra hacer memoria en la noche.',
    'Tu almuerzo cuenta — regístralo y sigue en lo tuyo 🍽',
  ],
  evening: [
    'Cierra el día como se debe: registra tu cena y mira tu jornada completa 🌙',
    'Último empujón: tu cena al registro y quedas al día 🌙',
    'Antes de desconectar, registra la cena — un día cerrado es un día que cuenta.',
  ],
  payment: [
    'Recordatorio: tu mensualidad del programa está pendiente. Ponerte al día toma un minuto — gracias por entrenar con método 🤝',
    'Tu mensualidad sigue pendiente. Cuando puedas, realiza el pago para seguir sin interrupciones 🤝',
    'Pendiente por pagar tu mes del programa — un minuto y quedas al día. ¡Gracias! 💪',
  ],
};

const dayOfYear = () => Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const pick = (arr) => arr[dayOfYear() % arr.length];

// Hora y fecha locales de una zona horaria
function localNow(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    }).formatToParts(new Date());
    const get = (t) => parts.find(p => p.type === t)?.value;
    return { hour: Number(get('hour')), date: `${get('year')}-${get('month')}-${get('day')}` };
  } catch (e) {
    return { hour: -1, date: '' };
  }
}

// CORS para el POST manual desde el CRM (otro dominio)
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !checkOrigin(req)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Push MANUAL del coach (antes /api/push-send.js) ──
async function handleCoachSend(req, res) {
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !verifyCoachToken(token)) return res.status(401).json({ error: 'unauthorized' });

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(200).json({ ok: false, causa: 'Faltan las llaves VAPID en Vercel (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).' });
  }
  webpush.setVapidDetails('mailto:morongmauro@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const { user_id, name, title, body } = req.body || {};
  const texto = String(body || '').trim().slice(0, 400);
  if (!texto) return res.status(400).json({ error: 'body requerido' });

  try {
    const rs = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,user_id,name,sub`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
    const subs = rs.ok ? await rs.json() : [];
    const objetivo = (Array.isArray(subs) ? subs : []).filter(s =>
      (user_id && s.user_id === user_id) ||
      (name && s.name && normalizeName(s.name) === normalizeName(name))
    );
    if (objetivo.length === 0) {
      return res.status(200).json({ ok: false, causa: 'Este cliente no tiene el push activado en su app (aún no ha tocado "Activar" en el banner de recordatorios).' });
    }

    let sent = 0;
    for (const s of objetivo) {
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({
          title: String(title || 'Tu coach').slice(0, 80),
          body: texto,
          tag: 'ecm-coach',
          url: '/',
        }));
        sent++;
      } catch (e) {
        const code = e && e.statusCode;
        if (code === 404 || code === 410) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
            method: 'DELETE', headers: sbHeaders(SUPABASE_SERVICE_KEY),
          });
        }
      }
    }
    return res.status(200).json({ ok: sent > 0, sent, ...(sent === 0 ? { causa: 'Las suscripciones del cliente ya no son válidas (revocó el permiso o reinstaló). Pídele re-activar en la app.' } : {}) });
  } catch (e) {
    return res.status(500).json({ error: 'push failed', detail: String(e) });
  }
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  // POST = push manual del coach (llega vía la rewrite /api/push-send)
  if (req.method === 'POST') return handleCoachSend(req, res);

  const key = req.query.key || req.headers['x-cron-key'];
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'vapid not configured' });
  }
  webpush.setVapidDetails('mailto:morongmauro@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  try {
    // 1) Todas las suscripciones
    const rs = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,user_id,name,tz,sub`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
    const subs = rs.ok ? await rs.json() : [];
    if (!Array.isArray(subs) || subs.length === 0) return res.status(200).json({ ok: true, sent: 0, subs: 0 });

    // 2) Actividad de HOY por cliente (para no molestar a quien ya registró).
    //    Una sola consulta liviana: user_id + fecha del día + nº de entries.
    const ra = await fetch(`${SUPABASE_URL}/rest/v1/user_data?select=user_id,today:data->today,today_entries:data->today_entries`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
    const rows = ra.ok ? await ra.json() : [];
    const activity = new Map(); // user_id → { date, count }
    for (const r of rows) {
      activity.set(r.user_id, { date: r.today || '', count: Array.isArray(r.today_entries) ? r.today_entries.length : 0 });
    }

    // 3) Deudores (solo se consulta si alguna suscripción está en su mediodía)
    let deudores = null; // Set de nombres normalizados
    const cargarDeudores = async () => {
      if (deudores || !CRM_URL || !CRM_KEY) return;
      deudores = new Set();
      const rc = await fetch(`${CRM_URL}/rest/v1/clientes?select=id,nombre,estado,dia_pago`, { headers: sbHeaders(CRM_KEY) });
      const clientes = rc.ok ? await rc.json() : [];
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
      const mes = ymd.slice(0, 7);
      const diaHoy = Number(ymd.slice(8));
      const candidatos = (clientes || []).filter(c =>
        String(c.estado || 'activo').toLowerCase() === 'activo' &&
        Number.isFinite(Number(c.dia_pago)) && Number(c.dia_pago) >= 1 && Number(c.dia_pago) <= 31 &&
        diaHoy > Number(c.dia_pago)
      );
      for (const c of candidatos) {
        const rp = await fetch(`${CRM_URL}/rest/v1/pagos?select=pagado,monto&cliente_id=eq.${c.id}&mes=eq.${mes}`, { headers: sbHeaders(CRM_KEY) });
        const pagos = rp.ok ? await rp.json() : [];
        const cubierto = Array.isArray(pagos) && pagos.some(p => p.pagado === true || Number(p.monto) === 0);
        if (!cubierto) deudores.add(normalizeName(c.nombre));
      }
    };

    let sent = 0, removed = 0;
    for (const s of subs) {
      const { hour, date } = localNow(s.tz || 'America/Bogota');
      const act = activity.get(s.user_id) || { date: '', count: 0 };
      const registrosHoy = act.date === date ? act.count : 0;

      const payloads = [];
      if (hour === 8) {
        payloads.push({ title: 'Entrena con Método', body: pick(MSGS.morning), tag: 'ecm-m' });
      } else if (hour === 12) {
        if (registrosHoy < 1) payloads.push({ title: 'Entrena con Método', body: pick(MSGS.midday), tag: 'ecm-d' });
        // Pago: DIARIO al mediodía mientras dure la deuda (los copys rotan
        // por día para no sonar a robot repetido). Desaparece solo al marcar
        // el pago en el CRM.
        await cargarDeudores();
        if (deudores && s.name && deudores.has(normalizeName(s.name))) {
          payloads.push({ title: 'Entrena con Método', body: pick(MSGS.payment), tag: 'ecm-p' });
        }
      } else if (hour === 20) {
        if (registrosHoy < 3) payloads.push({ title: 'Entrena con Método', body: pick(MSGS.evening), tag: 'ecm-n' });
      }

      for (const p of payloads) {
        try {
          await webpush.sendNotification(s.sub, JSON.stringify({ ...p, url: '/' }));
          sent++;
        } catch (e) {
          const code = e && e.statusCode;
          if (code === 404 || code === 410) {
            // Suscripción muerta (app desinstalada / permiso revocado): fuera
            await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
              method: 'DELETE', headers: sbHeaders(SUPABASE_SERVICE_KEY),
            });
            removed++;
          }
        }
      }
    }

    return res.status(200).json({ ok: true, subs: subs.length, sent, removed });
  } catch (e) {
    return res.status(500).json({ error: 'cron failed', detail: String(e) });
  }
}
