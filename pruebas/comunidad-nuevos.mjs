// Comunidad para clientes nuevos (comunidadParaCliente en api/training.js):
// lo publicado ANTES de que empezara le sale una por semana, de la más
// antigua a la más reciente; lo de después y lo fijado, normal.
//   node pruebas/comunidad-nuevos.mjs
process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const { comunidadParaCliente } = await import('../api/training.js');
let mal = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); if (!c) mal++; };
const post = (id, fecha, fijado = false) => ({ id, publicado_en: `${fecha}T15:00:00Z`, fijado });
const posts = [post('fij', '2026-05-01', true), post('p1', '2026-06-01'), post('p2', '2026-07-01'), post('p3', '2026-08-01'), post('p4', '2026-09-01'), post('nuevo', '2026-10-20')];
const ids = (l) => l.map(p => p.id).join(',');

let r = comunidadParaCliente(posts, '2026-10-15', '2026-10-15');
ok('el día que empieza: lo fijado, lo publicado después y UNA anterior (la más antigua)', ids(r) === 'fij,nuevo,p1' || ids(r) === 'fij,p1,nuevo', ids(r));
ok('la anterior sale con la fecha en que se le libera y marcada para él', r.find(p => p.id === 'p1').para_ti === true && r.find(p => p.id === 'p1').publicado_en.startsWith('2026-10-15') && r.find(p => p.id === 'p1').publicado_original.startsWith('2026-06-01'));
r = comunidadParaCliente(posts, '2026-10-15', '2026-10-22');
ok('a la semana: dos anteriores (p1 y p2), p3 y p4 todavía no', r.some(p => p.id === 'p2') && !r.some(p => p.id === 'p3') && !r.some(p => p.id === 'p4'), ids(r));
r = comunidadParaCliente(posts, '2026-10-15', '2026-12-31');
ok('con el tiempo le salen todas', ['p1', 'p2', 'p3', 'p4'].every(id => r.some(p => p.id === id)), ids(r));
ok('lo fijado siempre primero', r[0].id === 'fij');
r = comunidadParaCliente(posts, '2026-01-10', '2026-10-30');
ok('cliente antiguo (empezó antes que todo): todo normal, sin cambiar fechas', r.length === posts.length && !r.some(p => p.para_ti), ids(r));
r = comunidadParaCliente(posts, null, '2026-10-30');
ok('sin fecha de inicio: todo normal', r.length === posts.length);
const muchas = Array.from({ length: 70 }, (_, i) => post(`x${i}`, `2026-0${1 + (i % 9)}-1${i % 9}`));
ok('nunca más de 40', comunidadParaCliente(muchas, null, '2026-10-30').length === 40 && comunidadParaCliente(muchas, '2026-01-01', '2026-10-30').length <= 40);
console.log(mal ? `\n${mal} falla(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
