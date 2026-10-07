// La cuenta con contraseña (api/authorize.js): crear, entrar, sesión que
// sobrevive y se anula al cambiar la clave, sin tocar los datos del cliente.
//
//   node pruebas/cuenta.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';
process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'llave-servidor';

const db = crearSupabaseFalso({ tablas: { clientes: [
  { id: 'c1', nombre: 'Mauro Morón', email: 'mauro@correo.com', estado: 'activo', nombres_alternos: ['Mauro Moron'], app_clave_hash: null, notas: 'no se toca' },
  { id: 'c2', nombre: 'Ana Pérez', email: null, estado: 'activo', nombres_alternos: [], app_clave_hash: null },
  { id: 'c3', nombre: 'Pedro Gil', email: 'pedro@x.com', estado: 'pausa', nombres_alternos: [], app_clave_hash: null },
] } });
globalThis.fetch = db.fetch;
const { default: handler, sesionValida } = await import('../api/authorize.js');

let fallos = 0;
const ok = (n, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + extra}`); };
const fila = (id) => db.db.clientes.find(c => c.id === id);

let r = await llamar(handler, { accion: 'cuenta', name: 'mauro moron' });
ok('cuenta: trae su nombre y el correo del CRM, sin clave aún', r.ok && r.nombre === 'Mauro Morón' && r.email === 'mauro@correo.com' && r.tieneClave === false, JSON.stringify(r));
r = await llamar(handler, { accion: 'crear', name: 'Mauro Morón', clave: '123' });
ok('crear: la clave corta no pasa', !r.ok && r.error === 'corta');
r = await llamar(handler, { accion: 'crear', name: 'Mauro Morón', clave: 'kettlebell24' });
ok('crear: devuelve la sesión', r.ok && /^v1\./.test(r.sesion || ''), JSON.stringify(r));
const sesion = r.sesion;
const m = fila('c1');
ok('crear: guarda solo el hash (nunca la clave) y no toca lo demás', m && /^scrypt\$/.test(m.app_clave_hash) && !m.app_clave_hash.includes('kettlebell24') && m.notas === 'no se toca' && m.email === 'mauro@correo.com', JSON.stringify(m));
r = await llamar(handler, { accion: 'crear', name: 'Mauro Morón', clave: 'otraclave99' });
ok('crear: no se puede crear dos veces', !r.ok && r.error === 'ya_tiene');
r = await llamar(handler, { accion: 'cuenta', name: 'Mauro Morón' });
ok('cuenta: ahora dice que ya tiene clave', r.ok && r.tieneClave === true);
r = await llamar(handler, { accion: 'entrar', name: 'Mauro Morón', clave: 'mala' });
ok('entrar: clave equivocada no entra', !r.ok && r.error === 'clave');
r = await llamar(handler, { accion: 'entrar', email: 'MAURO@correo.com', clave: 'kettlebell24' });
ok('entrar: con el correo y la clave entra y devuelve su nombre', r.ok && r.nombre === 'Mauro Morón' && /^v1\./.test(r.sesion), JSON.stringify(r));
r = await llamar(handler, { name: 'Mauro Morón', sesion });
ok('abrir la app: la sesión guardada sigue valiendo', r.authorized && r.sesion === 'ok', JSON.stringify(r));
r = await llamar(handler, { name: 'Mauro Moron', sesion });
ok('…también con el nombre sin tilde', r.authorized && r.sesion === 'ok', JSON.stringify(r));
r = await llamar(handler, { name: 'Ana Pérez', sesion });
ok('la sesión de otro no sirve', r.sesion === 'invalida', JSON.stringify(r));
r = await llamar(handler, { name: 'Mauro Morón', sesion: sesion.slice(0, -3) + 'abc' });
ok('una sesión alterada no sirve', r.sesion === 'invalida');
r = await llamar(handler, { name: 'Ana Pérez' });
ok('sin sesión, el acceso de siempre no cambia (los demás clientes)', r.authorized === true && r.status === 'activo' && !('sesion' in r), JSON.stringify(r));
// Cambiar la clave (el coach la borra en el CRM y la crea de nuevo) anula la sesión vieja
m.app_clave_hash = null;
r = await llamar(handler, { accion: 'crear', name: 'Mauro Morón', clave: 'nuevaclave1' });
const r2 = await llamar(handler, { name: 'Mauro Morón', sesion });
ok('cambiar la clave anula la sesión vieja', r.ok && r2.sesion === 'invalida', JSON.stringify(r2));
r = await llamar(handler, { accion: 'crear', name: 'Ana Pérez', clave: 'clave123', email: 'ana@x.com' });
ok('crear: si el CRM no tenía correo, guarda el que puso', r.ok && fila('c2').email === 'ana@x.com');
r = await llamar(handler, { accion: 'cuenta', name: 'Pedro Gil' });
ok('un plan en pausa no puede crear cuenta', !r.ok && r.error === 'inactivo');
r = await llamar(handler, { accion: 'cuenta', name: 'Nadie Nunca' });
ok('un nombre que no está en el CRM no existe', !r.ok && r.error === 'no_existe');
ok('sesionValida rechaza basura', !sesionValida('x.y.z', 'Mauro Morón', 'scrypt$a$b'));

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
