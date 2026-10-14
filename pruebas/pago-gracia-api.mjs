// Día de gracia por mora (api/payment-status.js): bloqueado, pero hoy instaló
// la app nueva → hoy no se bloquea. Con fetch de mentira (CRM + base de la app).
//   node pruebas/pago-gracia-api.mjs
process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
process.env.SUPABASE_URL = 'https://app.test';
process.env.SUPABASE_SERVICE_KEY = 'k';
const UID = '11111111-2222-3333-4444-555555555555';
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
let instalo = null, nombreFila = 'Ana Pérez';
const cliente = { id: 'c1', nombre: 'Ana Pérez', estado: 'activo', dia_pago: 1, monto: 250000, moneda: 'COP', fecha_inicio: '2026-01-01' };
globalThis.fetch = async (url) => {
  const u = String(url);
  const json = (o) => ({ ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o) });
  if (u.startsWith('https://crm.test/rest/v1/clientes')) return json([cliente]);
  if (u.startsWith('https://crm.test/rest/v1/pagos')) {
    // Un cobro registrado y sin pagar el mes pasado (corte el 1): mora larga.
    const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
    return json([{ mes: d.toISOString().slice(0, 7), pagado: false, monto: 250000 }]);
  }
  if (u.startsWith('https://crm.test')) return json([]);
  if (u.startsWith('https://app.test/rest/v1/user_data')) return json(instalo === undefined ? [] : [{ name: nombreFila, pwa_nueva_at: instalo }]);
  return json([]);
};
const { default: handler } = await import('../api/payment-status.js');
async function pedir(q) {
  let salida = null;
  const req = { method: 'GET', query: q, headers: { host: 'app.test', 'x-forwarded-for': `9.9.9.${Math.random()}` } };
  const res = { status() { return this; }, json(o) { salida = o; return this; }, end() { return this; }, setHeader() {} };
  await handler(req, res);
  return salida;
}
let mal = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); if (!c) mal++; };

let r = await pedir({ name: 'Ana Pérez' });
ok('mora larga, sin uid: bloqueada', r.due && r.bloqueo === true && !r.gracia, JSON.stringify(r));
const dias = r.dias_vencido;

instalo = new Date().toISOString();
r = await pedir({ name: 'Ana Pérez', uid: UID });
ok('instaló la app HOY: no se bloquea y viene «gracia»', r.due && r.bloqueo === false && r.gracia === true && r.instalada === 'hoy', JSON.stringify(r));

instalo = new Date(Date.now() - 2 * 86400000).toISOString();
r = await pedir({ name: 'Ana Pérez', uid: UID });
ok('la instaló hace dos días: bloqueada', r.bloqueo === true && !r.gracia && r.instalada === 'antes', JSON.stringify(r));

instalo = null;
r = await pedir({ name: 'Ana Pérez', uid: UID });
ok('nunca la instaló (o no ha llegado): bloqueada, y le dice a la app que mire su marca', r.bloqueo === true && r.instalada === 'nunca' && r.hoy === hoy, JSON.stringify(r));

instalo = new Date().toISOString(); nombreFila = 'Otra Persona';
r = await pedir({ name: 'Ana Pérez', uid: UID });
ok('el uid de OTRO cliente no presta el día', r.bloqueo === true && !r.gracia, JSON.stringify(r));
nombreFila = 'Ana Pérez';

r = await pedir({ name: 'Ana Pérez', uid: 'no-es-uuid' });
ok('uid inválido: como siempre', r.bloqueo === true && !r.gracia);
console.log(`  (días de mora en la prueba: ${dias})`);
console.log(mal ? `\n${mal} falla(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
