// /api/push-cron.js
// El emisor de recordatorios push. Lo dispara un cron EXTERNO cada hora en
// punto (GitHub Action del repo: .github/workflows/push-cron.yml) con
// ?key=<CRON_SECRET>. En cada corrida revisa la hora LOCAL de cada
// suscripción (tz capturada del teléfono al suscribirse) y envía el
// recordatorio del turno si corresponde:
//
//   09:00 local → mañana (llega ANTES de las 10: registra tu desayuno;
//                 skip si ya registró algo hoy)
//   14:00 local → tarde (registra tu almuerzo; skip si ya lleva 2+ registros)
//   19:30 local → recordatorio de pago SOLO a quien está en deuda
//                 (misma regla que el banner de payment-status: corte
//                 vencido y mes sin pago marcado en el CRM)
//   20:00 local → cierre del día por % de meta: si el cliente tiene meta de
//                 kcal y va por DEBAJO del 80%, se le recuerda registrar
//                 todo el día (con su % real en el mensaje); al 80%+ no se
//                 le molesta. Sin meta configurada cae a la regla vieja por
//                 conteo (solo si lleva menos de 3 registros).
//
// RESILIENCIA: los crons de GitHub son "mejor esfuerzo" y a veces SALTAN
// horas completas (documentado: bajo carga, los schedules se retrasan o se
// omiten). Por eso cada turno tiene una VENTANA de 2 horas (la hora objetivo
// y la siguiente) y una marca `last_slot` en push_subs evita duplicados: si
// la corrida de las 9 se saltó, la de las 10 entrega el turno igual.
// Requiere columna:  alter table push_subs add column if not exists last_slot text;
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
const CRM_URL = (process.env.CRM_SUPABASE_URL || '').replace(/\/+$/, ''); // sin barra final: '...supabase.co/' rompia la URL (doble // -> 404)
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

const sbHeaders = (key) => ({ 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' });

const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

// ── Copys: profesionales, cálidos, accionables — 3 variantes por turno ──
const MSGS = {
  morning: [
    'Buenos días ☀️ Un registro a tiempo vale más que uno perfecto. Cuando desayunes, cuéntamelo.',
    'Arranca el día con claridad: registra tu desayuno antes de las 10 y el resto fluye ☀️',
    'Nuevo día, mismo método. Tu primer registro marca la pauta 💪',
  ],
  midday: [
    '¿Almuerzo listo? Dos líneas en tu registro y tu día sigue en orden 🍽',
    'Mitad del día: registrar ahora te ahorra hacer memoria en la noche.',
    'Tu almuerzo cuenta — regístralo y sigue en lo tuyo 🍽',
  ],
  // Cierre del día SIN meta configurada (regla vieja por conteo)
  evening: [
    'Cierra el día como se debe: registra tu cena y mira tu jornada completa 🌙',
    'Último empujón: tu cena al registro y quedas al día 🌙',
    'Antes de desconectar, registra la cena — un día cerrado es un día que cuenta.',
  ],
  // Cierre del día CON meta: {pct} se reemplaza por el avance real de kcal.
  // Solo se envía a quien va por DEBAJO del 80% de su meta — quien ya llegó
  // al 80%+ lleva el día bien y no se le molesta.
  eveningLow: [
    'Vas en un {pct}% de tu meta de hoy. Antes de cerrar el día, registra todo lo que comiste 🌙',
    'Tu día va en {pct}% de la meta — registra lo que falte y cierra la jornada completa 📋',
    'Aún estás en {pct}% de tu meta. Dos minutos: registra todo lo de hoy y duerme tranquilo 🌙',
  ],
  payment: [
    'Recordatorio: tu mensualidad del programa está pendiente. Ponerte al día toma un minuto — gracias por entrenar con método 🤝',
    'Tu mensualidad sigue pendiente. Cuando puedas, realiza el pago para seguir sin interrupciones 🤝',
    'Pendiente por pagar tu mes del programa — un minuto y quedas al día. ¡Gracias! 💪',
  ],
};

const dayOfYear = () => Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const pick = (arr) => arr[dayOfYear() % arr.length];

// Hora, minuto y fecha locales de una zona horaria
function localNow(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date());
    const get = (t) => parts.find(p => p.type === t)?.value;
    return { hour: Number(get('hour')), minute: Number(get('minute')), date: `${get('year')}-${get('month')}-${get('day')}` };
  } catch (e) {
    return { hour: -1, minute: -1, date: '' };
  }
}

// Devuelve la LISTA de clientes EN DEUDA hoy con su nombre real y días de
// vencimiento (misma regla que el banner de payment-status). Compartida por
// el cron, la prueba y el envío masivo para que no se desincronicen.
//   → [{ id, nombre, nombreNorm, dia_pago, dias_vencido }]
async function fetchDeudores() {
  if (!CRM_URL || !CRM_KEY) return [];
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
  const lista = [];
  for (const c of candidatos) {
    const rp = await fetch(`${CRM_URL}/rest/v1/pagos?select=pagado,monto&cliente_id=eq.${c.id}&mes=eq.${mes}`, { headers: sbHeaders(CRM_KEY) });
    const pagos = rp.ok ? await rp.json() : [];
    const cubierto = Array.isArray(pagos) && pagos.length > 0 &&
      (pagos.some(p => p.pagado === true) ||
       Math.max(0, ...pagos.map(p => Number(p.monto) || 0)) === 0);
    if (!cubierto) lista.push({ id: c.id, nombre: c.nombre, nombreNorm: normalizeName(c.nombre), dia_pago: Number(c.dia_pago), dias_vencido: diaHoy - Number(c.dia_pago) });
  }
  return lista;
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

  // ── MODO PRUEBA del push de pago (a demanda, sin esperar a las 7:30pm) ──
  // Ejecuta la MISMA lógica del recordatorio automático de pago para un
  // cliente y reporta cada etapa: ¿es deudor? ¿tiene push activo? ¿se envió?
  if (req.body && req.body.mode === 'test_payment') {
    const nombre = String(req.body.name || '').trim();
    if (!nombre) return res.status(400).json({ ok: false, causa: 'Falta el nombre del cliente a probar.' });
    try {
      const listaDeudores = await fetchDeudores();
      const esDeudor = listaDeudores.some(d => d.nombreNorm === normalizeName(nombre));
      const rs = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,user_id,name,sub`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
      const subs = rs.ok ? await rs.json() : [];
      const objetivo = (Array.isArray(subs) ? subs : []).filter(s => s.name && normalizeName(s.name) === normalizeName(nombre));
      const tieneSub = objetivo.length > 0;
      let sent = 0;
      if (esDeudor && tieneSub) {
        for (const s of objetivo) {
          try {
            await webpush.sendNotification(s.sub, JSON.stringify({ title: 'Tu coach', body: pick(MSGS.payment), tag: 'ecm-p', url: '/' }));
            sent++;
          } catch (e) {
            const code = e && e.statusCode;
            if (code === 404 || code === 410) {
              await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers: sbHeaders(SUPABASE_SERVICE_KEY) });
            }
          }
        }
      }
      return res.status(200).json({
        ok: sent > 0,
        es_deudor: esDeudor,
        tiene_push_activo: tieneSub,
        enviados: sent,
        causa: !esDeudor ? `"${nombre}" NO figura como deudor hoy (revisa: activo, día de corte configurado y ya vencido este mes, y mes sin pago marcado).`
          : !tieneSub ? `"${nombre}" es deudor pero NO tiene el push activado en su app (que toque "Activar" en el banner).`
          : sent === 0 ? 'Es deudor y tiene push, pero el envío falló (suscripción vencida — que reactive el push).'
          : '✓ Enviado. Debería llegarte la notificación de pago en unos segundos.',
      });
    } catch (e) {
      return res.status(500).json({ ok: false, causa: 'Error en la prueba: ' + String(e).slice(0, 150) });
    }
  }

  // ── LISTAR deudores + si tienen push (para la confirmación antes de enviar) ──
  if (req.body && req.body.mode === 'list_debtors') {
    try {
      const lista = await fetchDeudores();
      const rs = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=name`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
      const subs = rs.ok ? await rs.json() : [];
      const conPush = new Set((Array.isArray(subs) ? subs : []).map(s => normalizeName(s.name)).filter(Boolean));
      const deudores = lista
        .map(d => ({ nombre: d.nombre, dias_vencido: d.dias_vencido, tiene_push: conPush.has(d.nombreNorm) }))
        .sort((a, b) => b.dias_vencido - a.dias_vencido);
      return res.status(200).json({ ok: true, deudores });
    } catch (e) {
      return res.status(500).json({ ok: false, causa: 'Error al listar: ' + String(e).slice(0, 150) });
    }
  }

  // ── ENVIAR el recordatorio de pago a TODOS los deudores con push activo ──
  if (req.body && req.body.mode === 'send_payment_all') {
    try {
      const lista = await fetchDeudores();
      const rs = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,name,sub`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
      const subs = rs.ok ? await rs.json() : [];
      const porNombre = new Map();
      for (const s of (Array.isArray(subs) ? subs : [])) {
        const n = normalizeName(s.name);
        if (!n) continue;
        if (!porNombre.has(n)) porNombre.set(n, []);
        porNombre.get(n).push(s);
      }
      const enviadosNombres = [];
      let dispositivos = 0;
      for (const d of lista) {
        const objetivo = porNombre.get(d.nombreNorm) || [];
        let alguno = false;
        for (const s of objetivo) {
          try {
            await webpush.sendNotification(s.sub, JSON.stringify({ title: 'Tu coach', body: pick(MSGS.payment), tag: 'ecm-p', url: '/' }));
            dispositivos++; alguno = true;
          } catch (e) {
            const code = e && e.statusCode;
            if (code === 404 || code === 410) {
              await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers: sbHeaders(SUPABASE_SERVICE_KEY) });
            }
          }
        }
        if (alguno) enviadosNombres.push(d.nombre);
      }
      // Historial en el CRM (tabla push_pago_log). No rompe la respuesta si falla.
      if (CRM_URL && CRM_KEY && enviadosNombres.length) {
        try {
          await fetch(`${CRM_URL}/rest/v1/push_pago_log`, {
            method: 'POST',
            headers: { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ enviados: enviadosNombres.length, destinatarios: enviadosNombres }),
          });
        } catch (e) { /* el historial no bloquea el envío */ }
      }
      return res.status(200).json({ ok: enviadosNombres.length > 0, enviados: enviadosNombres.length, dispositivos, destinatarios: enviadosNombres });
    } catch (e) {
      return res.status(500).json({ ok: false, causa: 'Error al enviar: ' + String(e).slice(0, 150) });
    }
  }

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
    // 1) Todas las suscripciones (last_slot = marca anti-duplicado por turno)
    const rs = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?select=endpoint,user_id,name,tz,sub,last_slot`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
    const subs = rs.ok ? await rs.json() : [];
    if (!Array.isArray(subs) || subs.length === 0) return res.status(200).json({ ok: true, sent: 0, subs: 0 });

    // 2) Actividad de HOY por cliente (para no molestar a quien ya registró)
    //    + meta de kcal y total consumido (para el cierre del día por %).
    //    Una sola consulta liviana con columnas extraídas del JSON.
    const ra = await fetch(`${SUPABASE_URL}/rest/v1/user_data?select=user_id,today:data->today,today_entries:data->today_entries,goals:data->goals,totals:data->today_totals`, { headers: sbHeaders(SUPABASE_SERVICE_KEY) });
    const rows = ra.ok ? await ra.json() : [];
    const activity = new Map(); // user_id → { date, count, goalKcal, kcalHoy }
    for (const r of rows) {
      activity.set(r.user_id, {
        date: r.today || '',
        count: Array.isArray(r.today_entries) ? r.today_entries.length : 0,
        goalKcal: Number(r.goals?.kcal) || 0,
        kcalHoy: Number(r.totals?.kcal) || 0,
      });
    }

    // 3) Deudores (solo se consulta si alguna suscripción está en su turno de
    //    pago). Usa la función compartida fetchDeudores (misma que el modo
    //    de prueba del coach), con caché por invocación.
    let deudores = null; // Set de nombres normalizados
    const cargarDeudores = async () => {
      if (deudores) return;
      const lista = await fetchDeudores();
      deudores = new Set(lista.map(d => d.nombreNorm));
    };

    // Turnos con VENTANA de 2 horas (resiliencia a saltos del cron de GitHub).
    // El orden importa: son secuenciales en el día, así una sola marca
    // `last_slot` ("YYYY-MM-DD#id") basta para no duplicar dentro del turno.
    let sent = 0, removed = 0;
    for (const s of subs) {
      const { hour, minute, date } = localNow(s.tz || 'America/Bogota');
      const act = activity.get(s.user_id) || { date: '', count: 0 };
      const registrosHoy = act.date === date ? act.count : 0;

      // ¿Qué turno cae en esta hora? (ventana: hora objetivo o la siguiente)
      // La mañana apunta a las 9 para que el recordatorio llegue ANTES de
      // las 10 (su ventana de gracia es la hora 10 por si el cron saltó).
      // La cobranza apunta a las 7:30pm HORA LOCAL del cliente: la corrida
      // de las 19:37 la entrega (el cron corre a los minutos :07 y :37, así
      // que 7:37pm es lo más cerca posible a las 7:30). Solo esa corrida, sin
      // gracia en la hora 20 para no pisar el recordatorio nocturno de las 8.
      let slot = null;
      if (hour === 9 || hour === 10) slot = 'm';
      else if (hour === 14 || hour === 15) slot = 'd';
      else if (hour === 19 && minute >= 30) slot = 'p';
      else if (hour === 20 || hour === 21) slot = 'n';
      if (!slot) continue;

      // Anti-duplicado: si este turno ya se atendió hoy, saltar
      const marca = `${date}#${slot}`;
      if (s.last_slot === marca) continue;

      const payloads = [];
      if (slot === 'm') {
        // Mañana (10am): solo a quien no ha registrado nada aún
        if (registrosHoy < 1) payloads.push({ title: 'Tu coach', body: pick(MSGS.morning), tag: 'ecm-m' });
      } else if (slot === 'p') {
        // Pago (5:30pm): DIARIO mientras dure la deuda (copys rotan por
        // día). Desaparece solo al marcar el pago en el CRM.
        await cargarDeudores();
        if (deudores && s.name && deudores.has(normalizeName(s.name))) {
          payloads.push({ title: 'Tu coach', body: pick(MSGS.payment), tag: 'ecm-p' });
        }
      } else if (slot === 'd') {
        // Tarde (2pm): a quien lleva menos de 2 registros (desayuno+almuerzo)
        if (registrosHoy < 2) payloads.push({ title: 'Tu coach', body: pick(MSGS.midday), tag: 'ecm-d' });
      } else if (slot === 'n') {
        // Noche (8pm): DIARIO por % de meta de kcal. Los totales solo valen
        // si el "today" sincronizado es el día local del cliente (si no,
        // son de un día viejo y cuentan como 0).
        const metaKcal = act.goalKcal;
        const kcalHoy = act.date === date ? act.kcalHoy : 0;
        if (metaKcal > 0) {
          // 80% o más de la meta = día bien llevado: no molestamos. Solo se
          // recuerda a quien va por debajo del 80%.
          const pct = Math.min(999, Math.max(0, Math.round((kcalHoy / metaKcal) * 100)));
          if (pct < 80) {
            payloads.push({ title: 'Tu coach', body: pick(MSGS.eveningLow).replace('{pct}', String(pct)), tag: 'ecm-n' });
          }
        } else if (registrosHoy < 3) {
          // Sin meta configurada: regla vieja por conteo de registros
          payloads.push({ title: 'Tu coach', body: pick(MSGS.evening), tag: 'ecm-n' });
        }
      }

      // Marcar el turno como atendido AUNQUE no haya nada que enviar (p.ej.
      // ya registró, o no debe): así la hora siguiente de la ventana no
      // reevalúa, y el turno queda cerrado para hoy.
      await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
        method: 'PATCH', headers: sbHeaders(SUPABASE_SERVICE_KEY),
        body: JSON.stringify({ last_slot: marca }),
      }).catch(() => {});

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
