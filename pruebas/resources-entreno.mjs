// /api/resources decide quién ve el módulo de Entreno: quien tenga un ciclo
// ENVIADO en el CRM (activo y visible), aunque no esté en la lista de
// prueba, y también si en la app entra con uno de sus nombres alternos.
//   node pruebas/resources-entreno.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';
process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const { default: handler } = await import('../api/resources.js');
const { default: training } = await import('../api/training.js');
// Con TRAINING_PARA_TODOS (lo que está puesto ahora) TODOS lo ven; si algún
// día se apaga, decide el ciclo enviado.
const { TRAINING_PARA_TODOS } = await import('../api/_clients.js');

let mal = 0, n = 0;
const ok = (nombre, c, extra = '') => { n++; if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };
const sb = crearSupabaseFalso({ tablas: {
  clientes: [
    { id: 'c1', user_id: 'coach', nombre: 'Juan Sinisterra', estado: 'activo', nombres_alternos: ['Juan S'] },
    { id: 'c2', user_id: 'coach', nombre: 'Sin Ciclo', estado: 'activo' },
    { id: 'c3', user_id: 'coach', nombre: 'Borrador Nomas', estado: 'activo' },
  ],
  fases: [
    { id: 'f1', cliente_id: 'c1', nombre: 'Ciclo 5', estado: 'activa', visible_cliente: true, orden: 1, fecha_inicio: '2026-10-05', semanas: 4, dias_semana: ['L'] },
    { id: 'f3', cliente_id: 'c3', nombre: 'Ciclo 1', estado: 'borrador', visible_cliente: false, orden: 1, fecha_inicio: '2026-10-05', semanas: 4 },
  ],
  rutinas: [{ id: 'r1', cliente_id: 'c1', fase_id: 'f1', nombre: 'Push', dia_orden: 1, dias_semana: ['L'], archivada: false, visible_cliente: null }],
} });
globalThis.fetch = sb.fetch;
ok('con ciclo enviado ve Entreno (aunque no esté en la prueba)', (await llamar(handler, { name: 'Juan Sinisterra' })).training === true);
ok('también con un nombre alterno', (await llamar(handler, { name: 'juan s' })).training === true);
ok(TRAINING_PARA_TODOS ? 'para todos: también lo ve quien no tiene ciclo' : 'sin ciclo no lo ve', (await llamar(handler, { name: 'Sin Ciclo' })).training === !!TRAINING_PARA_TODOS);
ok(TRAINING_PARA_TODOS ? 'para todos: también con el ciclo en borrador' : 'con el ciclo en borrador no lo ve', (await llamar(handler, { name: 'Borrador Nomas' })).training === !!TRAINING_PARA_TODOS);
ok('para todos: cualquier nombre lo ve', (await llamar(handler, { name: 'Alguien Nuevo' })).training === !!TRAINING_PARA_TODOS);
ok('Mauro (lista de prueba) lo ve igual', (await llamar(handler, { name: 'Mauro Morón' })).training === true);
const p = await llamar(training, { accion: 'plan', name: 'Juan S' });
ok('la API de entreno lo encuentra por su nombre alterno', p.ok !== false && p.motivo !== 'sin_cliente', JSON.stringify(p).slice(0, 200));
// Sin la columna nombres_alternos en la base: sigue funcionando por el nombre.
const sb2 = crearSupabaseFalso({ columnas: { clientes: ['id', 'user_id', 'nombre', 'estado', 'dias_entreno', 'dias_entreno_cantidad', 'lugar_entreno', 'dia_pago'] }, tablas: { clientes: [{ id: 'c1', user_id: 'coach', nombre: 'Juan Sinisterra', estado: 'activo' }], fases: sb.db.fases, rutinas: sb.db.rutinas } });
globalThis.fetch = sb2.fetch;
ok('sin la columna de nombres alternos, por el nombre sigue funcionando', (await llamar(handler, { name: 'Juan Sinisterra' })).training === true);
console.log(mal ? `\n${mal} fallo(s)` : `\n${n}/${n} bien`);
process.exit(mal ? 1 : 0);
