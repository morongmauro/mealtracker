// La encuesta de la app (api/training.js, acciones 'encuesta' y
// 'encuesta_responder'): sale desde la segunda semana del cliente, una sola
// vez, y guarda lo que respondió con su puntaje.
//   node pruebas/encuesta-app-api.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
// La fecha desde la que sale se prueba al final; antes, apagada.
process.env.ENCUESTA_DESDE = '';
const { default: handler, semanaCliente } = await import('../api/training.js');

let mal = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); if (!c) mal++; };
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const haceDias = (n) => new Date(Date.parse(hoy) - n * 86400000).toISOString().slice(0, 10);

ok('semana 1 los primeros 7 días, semana 2 desde el día 8', semanaCliente('2026-10-01', '2026-10-07') === 1 && semanaCliente('2026-10-01', '2026-10-08') === 2);
ok('sin fecha de inicio (o en el futuro) no hay semana', semanaCliente(null, hoy) === null && semanaCliente('2099-01-01', hoy) === null);

function preparar(inicio, conTabla = true) {
  const tablas = { clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Ana Pérez', estado: 'activo', fecha_inicio: inicio }] };
  if (conTabla) tablas.encuesta_app = [];
  const sb = crearSupabaseFalso({ tablas, estricto: !conTabla });
  globalThis.fetch = (url, opts) => sb.fetch(url, opts);
  return sb;
}

let sb = preparar(haceDias(3));
let r = await llamar(handler, { accion: 'encuesta', name: 'Ana Pérez' });
ok('cliente nuevo en su primera semana: todavía no', r.ok && r.toca === false && r.semana === 1, JSON.stringify(r));

sb = preparar(haceDias(9));
r = await llamar(handler, { accion: 'encuesta', name: 'Ana Pérez' });
ok('en su segunda semana: le toca', r.ok && r.toca === true && r.semana === 2, JSON.stringify(r));

sb = preparar(haceDias(120));
r = await llamar(handler, { accion: 'encuesta', name: 'Ana Pérez' });
ok('cliente de hace meses que no la ha hecho: le toca una vez', r.toca === true, JSON.stringify(r));
r = await llamar(handler, { accion: 'encuesta_responder', name: 'Ana Pérez', util: 5, facil: 4, agradable: 5 });
ok('incompleta no se guarda', r.ok === false && r.motivo === 'incompleta' && sb.db.encuesta_app.length === 0, JSON.stringify(r));
r = await llamar(handler, { accion: 'encuesta_responder', name: 'Ana Pérez', util: 5, facil: 4, agradable: 3, recomienda: 9, mejoraria: '  Que el chat responda más rápido  ' });
const fila = sb.db.encuesta_app[0] || {};
ok('la quinta (opcional) se guarda limpia', fila.mejoraria === 'Que el chat responda más rápido', JSON.stringify(fila));
ok('responde: queda guardada con su puntaje, su coach y su semana', r.ok && sb.db.encuesta_app.length === 1 && fila.cliente_id === 'c1' && fila.user_id === 'coach-1'
  && fila.util === 5 && fila.facil === 4 && fila.agradable === 3 && fila.recomienda === 9 && fila.semana >= 2 && fila.encuesta === 'app-1', JSON.stringify(fila));
r = await llamar(handler, { accion: 'encuesta', name: 'Ana Pérez' });
ok('ya la hizo: no vuelve a salir', r.toca === false && r.motivo === 'respondida', JSON.stringify(r));
r = await llamar(handler, { accion: 'encuesta_responder', name: 'Ana Pérez', util: 9, facil: 4, agradable: 3, recomienda: 11 });
ok('valores fuera de rango no se guardan', r.ok === false, JSON.stringify(r));

// Sin la quinta: se guarda igual (es opcional).
sb = preparar(haceDias(30));
r = await llamar(handler, { accion: 'encuesta_responder', name: 'Ana Pérez', util: 4, facil: 4, agradable: 4, recomienda: 8 });
ok('sin la pregunta abierta también se guarda', r.ok && sb.db.encuesta_app.length === 1 && !sb.db.encuesta_app[0].mejoraria, JSON.stringify(r));

sb.db.clientes[0].estado = 'pausado';
r = await llamar(handler, { accion: 'encuesta', name: 'Ana Pérez' });
ok('cliente no activo: no le sale', r.toca === false, JSON.stringify(r));

// Desde qué fecha sale: antes no, aunque le toque; ese día, sí.
sb = preparar(haceDias(40));
process.env.ENCUESTA_DESDE = new Date(Date.parse(hoy) + 7 * 86400000).toISOString().slice(0, 10);
r = await llamar(handler, { accion: 'encuesta', name: 'Ana Pérez' });
ok('antes de la fecha de arranque no sale (aunque le toque)', r.ok && r.toca === false && r.motivo === 'antes_de_fecha', JSON.stringify(r));
process.env.ENCUESTA_DESDE = hoy;
r = await llamar(handler, { accion: 'encuesta', name: 'Ana Pérez' });
ok('desde ese día, sí', r.toca === true, JSON.stringify(r));
delete process.env.ENCUESTA_DESDE;
const { ENCUESTA_DESDE } = await import('../api/training.js');
ok('la fecha de arranque es el lunes 2 de noviembre', ENCUESTA_DESDE === '2026-11-02');

console.log(mal ? `\n${mal} falla(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
