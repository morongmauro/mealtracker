// Regla de bloqueo por mora (api/_pagos.js): aviso los primeros 8 días tras
// el corte, bloqueo desde el día 9, y «Dar más días» (prorroga_hasta) evita
// el bloqueo hasta esa fecha incluida. Fecha fija y fetch de mentira.
//   node pruebas/pago-prorroga-api.mjs
process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
let sinColumna = false;
const cliente = { id: 'c1', nombre: 'Ana Pérez', estado: 'activo', dia_pago: 10, monto: 250000, moneda: 'COP', fecha_inicio: '2026-01-01' };
globalThis.fetch = async (url) => {
  const u = String(url);
  const json = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o) });
  if (u.startsWith('https://crm.test/rest/v1/clientes')) {
    if (sinColumna && u.includes('prorroga_hasta')) return json({ message: 'column clientes.prorroga_hasta does not exist' }, 400);
    const { prorroga_hasta, ...resto } = cliente;
    return json([sinColumna ? resto : cliente]);
  }
  // Un cobro registrado y sin pagar en octubre (corte el 10 de octubre).
  if (u.startsWith('https://crm.test/rest/v1/pagos')) return json([{ mes: '2026-10', pagado: false, monto: 250000 }]);
  return json([]);
};
const { evaluarCliente, leerContexto, DIAS_GRACIA } = await import('../api/_pagos.js');
// El día de hoy se fija a mano: corte el 10 de octubre + N días.
const dia = async (ymd) => {
  const ctx = await leerContexto({});
  const [y, m, d] = ymd.split('-');
  Object.assign(ctx, { ymd, hoyYmd: ymd, anio: Number(y), mesNum: Number(m), mes: `${y}-${m}`, dia: Number(d) });
  return evaluarCliente('Ana Pérez', ctx, {});
};
let mal = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); if (!c) mal++; };

ok('la regla general es de 8 días', DIAS_GRACIA === 8);
let r = await dia('2026-10-11');
ok('día 1 tras el corte: aviso, sin bloqueo', r.due && r.dias_vencido === 1 && r.bloqueo === false, JSON.stringify(r));
r = await dia('2026-10-18');
ok('día 8: todavía solo el aviso', r.due && r.dias_vencido === 8 && r.bloqueo === false, JSON.stringify(r));
r = await dia('2026-10-19');
ok('día 9: la app se bloquea', r.due && r.dias_vencido === 9 && r.bloqueo === true && !r.prorroga_hasta, JSON.stringify(r));

// Ya bloqueado (día 13) y el coach le da +5 desde hoy → hasta el 28.
cliente.prorroga_hasta = '2026-10-28';
r = await dia('2026-10-23');
ok('ya bloqueado + prórroga: se desbloquea y el aviso sigue', r.due && r.bloqueo === false && r.prorroga_hasta === '2026-10-28' && r.dias_vencido === 13, JSON.stringify(r));
r = await dia('2026-10-28');
ok('el último día de la prórroga sigue desbloqueado', r.bloqueo === false && r.prorroga_hasta === '2026-10-28', JSON.stringify(r));
r = await dia('2026-10-29');
ok('al día siguiente la prórroga vence sola y vuelve el bloqueo', r.bloqueo === true && !r.prorroga_hasta, JSON.stringify(r));

// Una prórroga vieja (de otro mes) no presta nada.
cliente.prorroga_hasta = '2026-09-30';
r = await dia('2026-10-20');
ok('una prórroga ya vencida no evita el bloqueo', r.bloqueo === true && !r.prorroga_hasta, JSON.stringify(r));

// Al pagar, nada: sin deuda no hay aviso ni bloqueo, haya o no prórroga.
cliente.prorroga_hasta = '2026-10-28';
const fetchAntes = globalThis.fetch;
globalThis.fetch = async (url) => (String(url).includes('/pagos') ? { ok: true, status: 200, json: async () => [{ mes: '2026-10', pagado: true, monto: 250000 }] } : fetchAntes(url));
r = await dia('2026-10-23');
ok('marcado como pagado: sin aviso', r.due === false, JSON.stringify(r));
globalThis.fetch = fetchAntes;

// Antes de correr la SQL (la columna no existe): todo funciona como siempre.
sinColumna = true;
r = await dia('2026-10-19');
ok('sin la columna nueva: lee igual y bloquea el día 9', r.due && r.bloqueo === true, JSON.stringify(r));
r = await dia('2026-10-18');
ok('sin la columna nueva: día 8 solo aviso', r.due && r.bloqueo === false, JSON.stringify(r));
console.log(mal ? `\n${mal} falla(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
