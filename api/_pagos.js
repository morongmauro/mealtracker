// /api/_pagos.js
// LA REGLA DE COBRO, en un solo sitio.
//
// El prefijo "_" es a propósito: Vercel no lo cuenta como función serverless
// (el plan Hobby permite 12 y ya están las 12), y esto no es un endpoint sino
// el criterio que comparten los dos caminos que le hablan al cliente de su
// pago: el banner dentro de la app (payment-status.js) y el recordatorio push
// de la tarde (push-cron.js).
//
// Vivía duplicado en los dos, y las copias se desincronizaron: el banner se
// arregló y el push siguió con la regla vieja, mandándole una notificación
// DIARIA a gente que no debía nada. Un criterio que le cobra dinero a una
// persona no puede estar escrito dos veces.
//
// QUÉ CUENTA COMO DEUDA
//   · fila con monto > 0 y sin marcar pagado → deuda
//   · fila marcada como pagada               → cubierto
//   · fila en $0                             → cortesía, cubierto
//   · SIN fila                               → no tuvo coaching, no se cobra
//
// Un mes sin fila NO es "no me ha pagado": es un mes en el que esa persona no
// tuvo coaching. Es exactamente lo que el coach ve en su tabla: deuda es lo
// que está en rojo con una cifra.

const CRM_URL = (process.env.CRM_SUPABASE_URL || '').replace(/\/+$/, '');
const CRM_KEY = process.env.CRM_SUPABASE_SERVICE_KEY;

export function crmHeaders() {
  return { 'apikey': CRM_KEY, 'Authorization': `Bearer ${CRM_KEY}` };
}
export function crmConfigurado() { return !!(CRM_URL && CRM_KEY); }
export function crmHost() {
  try { return new URL(CRM_URL).host; } catch (e) { return CRM_URL || '(vacío)'; }
}

// Igual que en authorize.js: ignora mayúsculas, tildes y espacios de más.
export const normalizeName = (str) => String(str || '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim();

// Fecha de HOY en hora de Colombia. Los servidores de Vercel corren en UTC
// (5 horas adelante de Bogotá): sin esto, desde las ~7pm hora local el server
// ya cree que es "mañana" y el recordatorio aparecería la noche del MISMO día
// de corte (debe empezar al día siguiente), y el cambio de mes se adelantaría
// 5 horas. en-CA da el formato YYYY-MM-DD directo; Colombia no tiene horario
// de verano, así que la zona es estable todo el año.
export function todayInBogota() {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })
    .format(new Date()); // "YYYY-MM-DD"
  const [y, m, d] = ymd.split('-');
  return { mes: `${y}-${m}`, dia: Number(d), ymd, anio: Number(y), mesNum: Number(m) };
}

// Fecha de corte REAL de un mes: si el cliente paga el 31 y el mes tiene 30
// días, el corte es el último día de ese mes (nunca una fecha inexistente).
export function fechaCorte(anio, mesNum, diaPago) {
  const ultimoDia = new Date(Date.UTC(anio, mesNum, 0)).getUTCDate();
  const dia = Math.min(diaPago, ultimoDia);
  return `${anio}-${String(mesNum).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Días transcurridos entre dos fechas 'YYYY-MM-DD' (ambas a mediodía UTC para
// que ningún horario de verano ajeno mueva el resultado).
export function diasEntre(desdeYmd, hastaYmd) {
  const a = Date.parse(`${desdeYmd}T12:00:00Z`);
  const b = Date.parse(`${hastaYmd}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Los N meses (YYYY-MM) hasta el actual, del más viejo al más nuevo.
export function mesesHasta(anio, mesNum, cuantos) {
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
export async function leerContexto(headers) {
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
export async function evaluarCliente(nombre, ctx, headers) {
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

  // QUÉ CUENTA COMO DEUDA
  //
  // Solo un cobro que el coach REGISTRÓ y todavía no está marcado como pagado.
  // Es decir: exactamente lo que en su tabla se ve en rojo con una cifra.
  //
  // Un mes SIN fila no es deuda: significa que esa persona no tuvo coaching
  // ese mes. Antes se cobraba igual, inventando el monto de la ficha, y por eso
  // a un cliente al día le aparecía "mensualidad pendiente" — su tabla estaba
  // llena de guiones de meses en los que ni era cliente. La fila manda: si no
  // hay cobro registrado, no hay nada que cobrar.
  //
  // El precio de esta regla, dicho claro: si el coach olvida generar el cobro
  // de un mes, a ese cliente no le va a llegar recordatorio. Es el lado
  // correcto en el que equivocarse — mejor no recordarle a quien debe que
  // cobrarle a quien no.
  const deuda = [];
  const detalle = [];
  for (const m of vencidos) {
    const filas = porMes.get(m.mes) || [];
    if (!filas.length) {
      detalle.push({ mes: m.mes, cuenta: false, motivo: 'sin cobro registrado ese mes → no tuvo coaching, no se cobra' });
      continue;
    }
    const anyPaid = filas.some(p => p.pagado === true);
    if (anyPaid) { detalle.push({ mes: m.mes, cuenta: false, motivo: 'marcado como PAGADO' }); continue; }
    const maxMonto = Math.max(0, ...filas.map(p => Number(p.monto) || 0));
    if (maxMonto === 0) { detalle.push({ mes: m.mes, cuenta: false, motivo: 'cobro en $0 → mes de cortesía' }); continue; }
    deuda.push({ mes: m.mes, corte: m.corte, monto: maxMonto });
    detalle.push({ mes: m.mes, cuenta: true, monto: maxMonto, motivo: 'cobro registrado y SIN marcar como pagado' });
  }

  const base = {
    dia_corte: diaPago, visto, detalle,
    meses_evaluados: vencidos.map(v => v.mes),
    moneda: cliente.moneda || 'COP',
  };
  if (!deuda.length) {
    return { ...base, due: false, motivo: 'no tiene ningún cobro vencido sin pagar' };
  }
  const montoTotal = deuda.reduce((s, d) => s + (Number(d.monto) || 0), 0);
  return {
    ...base,
    due: true,
    dias_vencido: diasEntre(deuda[0].corte, ctx.hoyYmd),
    meses_deuda: deuda.length,
    meses: deuda.map(d => d.mes),
    // La "mensualidad" que muestra el aviso: la del cobro más viejo sin pagar.
    // Antes salía del monto de la ficha, que con la regla nueva ya no se usa
    // para nada — el que manda es el cobro que registró el coach.
    monto: Number(deuda[0].monto) || null,
    monto_total: montoTotal > 0 ? montoTotal : null,
    motivo: `debe ${deuda.length} mes(es): ${deuda.map(d => d.mes).join(', ')}`,
  };
}

