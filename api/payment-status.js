// /api/payment-status.js
// Estado de pago del cliente, leído del CRM (la MISMA fuente que authorize.js:
// la tabla `clientes` del Supabase del CRM). Sirve para mostrar en la app un
// recordatorio de pago cuando la fecha de corte del mes ya pasó y el coach
// todavía no marcó el pago.
//
// Regla ("debe pagar") — se evalúa sobre TODOS los meses del historial
// reciente, no solo el mes en curso:
//   - cliente activo con dia_pago configurado, y
//   - de cada mes desde que arrancó (máx. 12 atrás) cuya fecha de corte ya
//     pasó, se descartan los que están cubiertos (pago marcado como pagado o
//     mes de cortesía en $0); lo que queda es la deuda.
// El recordatorio PERSISTE día a día hasta que el coach marca los pagos en el
// CRM (tabla `pagos`); en cuanto los marca, este endpoint devuelve due:false y
// el aviso desaparece solo. No expone datos de otros clientes.
//
// OJO (bug que esto corrige): antes solo se miraba el MES ACTUAL y se salía
// con due:false si el día de hoy aún no había pasado el día de corte. Un
// cliente con dos meses vencidos y corte el día 15 no veía NADA entre el 1 y
// el 15 de cada mes — justo el caso reportado.
//
// Config (Vercel → proyecto mealtracker → Environment Variables) — las MISMAS
// que ya usa authorize.js:
//   CRM_SUPABASE_URL          → Project URL del Supabase del CRM
//   CRM_SUPABASE_SERVICE_KEY  → key service_role del Supabase del CRM
//
// GET  /api/payment-status?name=...   (o POST { name })
//   → { due: bool, dia_corte?, dias_vencido?, meses_deuda?, monto?,
//       monto_total?, moneda?, meses? }

import { guard } from './_guard.js';

const CRM_URL = (process.env.CRM_SUPABASE_URL || '').replace(/\/+$/, ''); // sin barra final: '...supabase.co/' rompia la URL (doble // -> 404)
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

// Igual que en authorize.js: ignora mayúsculas, tildes y espacios de más.
const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

// Fecha de HOY en hora de Colombia. Los servidores de Vercel corren en UTC
// (5 horas adelante de Bogotá): sin esto, desde las ~7pm hora local el server
// ya cree que es "mañana" y el recordatorio aparecería la noche del MISMO día
// de corte (debe empezar al día siguiente), y el cambio de mes se adelantaría
// 5 horas. en-CA da el formato YYYY-MM-DD directo; Colombia no tiene horario
// de verano, así que la zona es estable todo el año.
function todayInBogota() {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })
    .format(new Date()); // "YYYY-MM-DD"
  const [y, m, d] = ymd.split('-');
  return { mes: `${y}-${m}`, dia: Number(d), ymd, anio: Number(y), mesNum: Number(m) };
}

// Fecha de corte REAL de un mes: si el cliente paga el 31 y el mes tiene 30
// días, el corte es el último día de ese mes (nunca una fecha inexistente).
function fechaCorte(anio, mesNum, diaPago) {
  const ultimoDia = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate();
  const dia = Math.min(diaPago, ultimoDia);
  return `${anio}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Días transcurridos entre dos fechas 'YYYY-MM-DD' (ambas a mediodía UTC para
// que ningún horario de verano ajeno mueva el resultado).
function diasEntre(desdeYmd, hastaYmd) {
  const a = Date.parse(`${desdeYmd}T12:00:00Z`);
  const b = Date.parse(`${hastaYmd}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Los N meses (YYYY-MM) hasta el actual, del más viejo al más nuevo.
function mesesHasta(anio, mesNum, cuantos) {
  const out = [];
  for (let i = cuantos - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(anio, mesNum - 1 - i, 1));
    out.push({ mes: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, anio: d.getUTCFullYear(), mesNum: d.getUTCMonth() + 1 });
  }
  return out;
}

// ─── EL NÚCLEO ───────────────────────────────────────────────────────────
// La regla vive UNA sola vez. La consulta del cliente y el listado que ve el
// coach en su CRM llaman a esto mismo: si algún día se afinara la regla en un
// lado y no en el otro, el coach vería una cosa y su cliente otra — que es
// exactamente el problema que este tablero existe para evitar.

// Lee de una vez lo que sirve para todos: la tabla de clientes y la fecha.
async function leerContexto(headers) {
  const rc = await fetch(
    `${CRM_URL}/rest/v1/clientes?select=id,nombre,estado,dia_pago,monto,moneda,fecha_inicio,aviso_pago_visto_at`,
    { headers }
  );
  if (!rc.ok) {
    // Si `aviso_pago_visto_at` todavía no existe (falta el SQL), PostgREST
    // responde 400. Se reintenta sin esa columna: el aviso al cliente no puede
    // depender de una mejora del tablero del coach.
    const r2 = await fetch(
      `${CRM_URL}/rest/v1/clientes?select=id,nombre,estado,dia_pago,monto,moneda,fecha_inicio`,
      { headers }
    );
    if (!r2.ok) return { error: `no pude leer la tabla clientes del CRM (HTTP ${rc.status})`, clientes: [] };
    const cs = await r2.json();
    const t = todayInBogota();
    return { clientes: Array.isArray(cs) ? cs : [], ...t, hoyYmd: t.ymd, sinColumnaVisto: true };
  }
  const cs = await rc.json();
  const t = todayInBogota();
  return { clientes: Array.isArray(cs) ? cs : [], ...t, hoyYmd: t.ymd };
}

// El veredicto de UN cliente, con su traza mes a mes.
async function evaluarCliente(nombre, ctx, headers) {
  const n = normalizeName(nombre);
  const cliente = ctx.clientes.find(c => normalizeName(c.nombre) === n);
  if (!cliente) return { due: false, motivo: 'no está en el CRM con ese nombre' };

  const estado = String(cliente.estado || 'activo').toLowerCase();
  const diaPago = Number(cliente.dia_pago);
  const visto = cliente.aviso_pago_visto_at || null;
  if (estado !== 'activo') return { due: false, motivo: `está en estado "${estado}", no "activo"`, visto };
  if (!Number.isFinite(diaPago) || diaPago < 1 || diaPago > 31) {
    return { due: false, motivo: 'no tiene "día de pago" (fecha de corte) en su ficha del CRM — es el motivo más común', visto };
  }

  const ventana = mesesHasta(ctx.anio, ctx.mesNum, 12);
  const vencidos = ventana
    .map(m => ({ ...m, corte: fechaCorte(m.anio, m.mesNum, diaPago) }))
    .filter(m => m.corte < ctx.hoyYmd);
  if (!vencidos.length) {
    return { due: false, dia_corte: diaPago, visto, motivo: `todavía no hay ningún mes con la fecha de corte cumplida (corte el ${diaPago}; el aviso empieza al día SIGUIENTE)` };
  }

  const desde = vencidos[0].mes;
  const rp = await fetch(
    `${CRM_URL}/rest/v1/pagos?select=mes,pagado,monto&cliente_id=eq.${cliente.id}&mes=gte.${desde}&mes=lte.${ctx.mes}`,
    { headers }
  );
  const pagos = rp.ok ? await rp.json() : [];
  const porMes = new Map();
  if (Array.isArray(pagos)) for (const p of pagos) {
    if (!porMes.has(p.mes)) porMes.set(p.mes, []);
    porMes.get(p.mes).push(p);
  }

  const inicioYmd = String(cliente.fecha_inicio || '').slice(0, 10);
  const montoMensual = (cliente.monto != null && Number(cliente.monto) > 0) ? Number(cliente.monto) : 0;
  const deuda = [];
  const detalle = [];
  for (const m of vencidos) {
    const filas = porMes.get(m.mes) || [];
    if (filas.length) {
      const anyPaid = filas.some(p => p.pagado === true);
      const maxMonto = Math.max(0, ...filas.map(p => Number(p.monto) || 0));
      if (anyPaid) { detalle.push({ mes: m.mes, cuenta: false, motivo: 'marcado como PAGADO en la tabla pagos' }); continue; }
      if (maxMonto === 0) { detalle.push({ mes: m.mes, cuenta: false, motivo: 'registro(s) en $0 → se interpreta como mes de cortesía' }); continue; }
      deuda.push({ mes: m.mes, corte: m.corte, monto: maxMonto });
      detalle.push({ mes: m.mes, cuenta: true, monto: maxMonto, motivo: 'registro PENDIENTE en la tabla pagos (existe la fila pero sin marcar pagado)' });
    } else if (inicioYmd && m.corte < inicioYmd) {
      detalle.push({ mes: m.mes, cuenta: false, motivo: `sin registro y el corte (${m.corte}) es anterior a su fecha de inicio (${inicioYmd})` });
    } else {
      deuda.push({ mes: m.mes, corte: m.corte, monto: montoMensual });
      detalle.push({ mes: m.mes, cuenta: true, monto: montoMensual, motivo: 'NO hay ninguna fila de ese mes en la tabla pagos → se cobra el monto de su ficha' });
    }
  }

  const base = {
    dia_corte: diaPago, visto, detalle,
    meses_evaluados: vencidos.map(v => v.mes),
    moneda: cliente.moneda || 'COP',
  };
  if (!deuda.length) {
    return { ...base, due: false, motivo: `todos los meses vencidos (${vencidos.map(v => v.mes).join(', ')}) figuran cubiertos en la tabla pagos` };
  }
  const montoTotal = deuda.reduce((s, d) => s + (Number(d.monto) || 0), 0);
  return {
    ...base,
    due: true,
    dias_vencido: diasEntre(deuda[0].corte, ctx.hoyYmd),
    meses_deuda: deuda.length,
    meses: deuda.map(d => d.mes),
    monto: montoMensual || null,
    monto_total: montoTotal > 0 ? montoTotal : null,
    motivo: `debe ${deuda.length} mes(es): ${deuda.map(d => d.mes).join(', ')}`,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  // GET puede venir sin Origin (navegadores con privacidad endurecida); no
  // escribe nada, solo lee, así que lo permitimos igual que en /api/sync.
  if (!guard(req, res, { key: 'payment-status', limit: 40, allowNoOrigin: req.method === 'GET' })) return;

  // Modo diagnóstico (solo para el coach): ?debug=1 añade "reason" y "crm_host"
  // (el host del Supabase que la función está usando). Así verificas que apunte
  // al CRM correcto sin tener que ver la variable en Vercel (que la oculta por
  // seguridad). NO expone la key ni datos de otros clientes: el host del
  // Supabase ya viaja al navegador en config.js, no es secreto.
  const debug = req.method === 'GET' && (req.query.debug === '1' || req.query.debug === 'true');
  const crmHost = (() => { try { return new URL(CRM_URL).host; } catch (e) { return CRM_URL || '(vacío)'; } })();
  const out = (obj, reason) => res.status(200).json(debug ? { ...obj, reason, crm_host: crmHost } : obj);

  // Sin CRM configurado no molestamos con recordatorios (fail-safe).
  if (!CRM_URL || !CRM_KEY) {
    return out({ due: false }, 'CRM_SUPABASE_URL o CRM_SUPABASE_SERVICE_KEY no están configuradas en Vercel');
  }

  // Prueba de escritura en ia_uso (?testlog=1): inserta una fila marcada
  // '__PRUEBA__' y devuelve el resultado HTTP. Sirve para saber si el tablero
  // puede grabar, sin depender del flujo del chat. Borra esa fila del tablero
  // o en Supabase cuando confirmes que funciona.
  if (req.method === 'GET' && (req.query.testlog === '1' || req.query.testlog === 'true')) {
    try {
      const r = await fetch(`${CRM_URL}/rest/v1/ia_uso`, {
        method: 'POST',
        headers: {
          'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          cliente_nombre: '__PRUEBA__', modelo: 'test', accion: 'test',
          input_tokens: 1, output_tokens: 1, costo_usd: 0, mensaje: 'prueba de escritura',
        }),
      });
      const body = await r.text();
      return res.status(200).json({
        escritura_ok: r.ok, http: r.status, crm_host: crmHost,
        detalle: body ? body.slice(0, 300) : '(vacío = insert exitoso)',
      });
    } catch (e) {
      return res.status(200).json({ escritura_ok: false, error: String(e).slice(0, 200), crm_host: crmHost });
    }
  }

  const headers = { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}` };

  // ── "LO VIO" ─────────────────────────────────────────────────────────
  // La app avisa cuando el banner de pago se le PINTÓ en pantalla al cliente.
  // Se guarda la hora en clientes.aviso_pago_visto_at del CRM, para que el
  // coach pueda ver en su tablero si el recordatorio llegó a los ojos del
  // cliente o si está reclamando algo que nunca vio.
  //
  // Solo marca la hora: ni un dato más. Y si la columna todavía no existe
  // (falta correr el SQL), no pasa nada — la app nunca se entera.
  if (req.method === 'POST' && req.body?.visto === true) {
    const n = normalizeName(req.body?.name);
    if (!n) return res.status(200).json({ ok: false });
    try {
      const rc = await fetch(`${CRM_URL}/rest/v1/clientes?select=id,nombre`, { headers });
      const cs = rc.ok ? await rc.json() : [];
      const c = Array.isArray(cs) ? cs.find(x => normalizeName(x.nombre) === n) : null;
      if (c) {
        await fetch(`${CRM_URL}/rest/v1/clientes?id=eq.${c.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ aviso_pago_visto_at: new Date().toISOString() }),
        });
      }
    } catch (e) { /* nunca rompe la app del cliente */ }
    return res.status(200).json({ ok: true });
  }

  // ── MODO LOTE (para el CRM) ──────────────────────────────────────────
  // El coach necesita ver de un vistazo a QUIÉN le está apareciendo el aviso.
  // Preguntar cliente por cliente serían 30 viajes; con `names` va uno solo.
  // Corre EXACTAMENTE el mismo cálculo que ve el cliente — no una copia de la
  // regla en el CRM, que tarde o temprano se despegaría de esta.
  if (req.method === 'POST' && Array.isArray(req.body?.names)) {
    const nombres = req.body.names.slice(0, 200).map(x => String(x || ''));
    const salida = {};
    try {
      const ctx = await leerContexto(headers);
      for (const nom of nombres) salida[nom] = await evaluarCliente(nom, ctx, headers);
    } catch (e) {
      return res.status(200).json({ error: 'no pude leer el CRM', clientes: {} });
    }
    return res.status(200).json({ clientes: salida });
  }

  const rawName = req.method === 'POST' ? req.body?.name : req.query.name;
  const normalized = normalizeName(rawName);
  if (!normalized) return out({ due: false }, 'nombre vacío en la petición');

  try {
    const ctx = await leerContexto(headers);
    if (ctx.error) return out({ due: false }, ctx.error);
    const cliente = ctx.clientes.find(c => normalizeName(c.nombre) === normalized);
    if (!cliente) return out({ due: false }, `ningún cliente del CRM coincide con el nombre "${rawName}" (revisa que el nombre en la app sea igual al del CRM)`);

    const v = await evaluarCliente(cliente.nombre, ctx, headers);
    if (!v.due) return out({ due: false, dia_corte: v.dia_corte, detalle: v.detalle }, v.motivo);

    const payload = {
      due: true,
      dia_corte: v.dia_corte,
      dias_vencido: v.dias_vencido,
      meses_deuda: v.meses_deuda,
      meses: v.meses,
      monto: v.monto,
      monto_total: v.monto_total,
      moneda: v.moneda,
    };
    if (debug) {
      payload.debug = {
        crm_host: crmHost,
        cliente: { nombre: cliente.nombre, monto_ficha: cliente.monto, dia_pago: v.dia_corte, fecha_inicio: cliente.fecha_inicio || null },
        hoy: ctx.hoyYmd,
        meses_evaluados: v.meses_evaluados,
        detalle: v.detalle,
        suma: v.monto_total,
      };
    }
    return res.status(200).json(payload);
  } catch (e) {
    // Ante cualquier fallo, no mostramos recordatorio (nunca bloqueamos la app).
    return res.status(200).json({ due: false });
  }
}
