// La revisión automática de los videos de YouTube (api/_videos.js): cada
// video una vez por semana, en tandas, y sin pisar lo que encontró el botón
// «Revisar YouTube» del CRM (bloqueos por país).
//
//   node pruebas/videos-rotos.mjs
import { revisarVideos, porRevisar, filaNueva, revisarUno } from '../api/_videos.js';

let mal = 0;
const ok = (n, c, extra = '') => { if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + extra}`); };
const AHORA = Date.parse('2026-10-28T12:00:00Z');
const hace = (d) => new Date(AHORA - d * 86400000).toISOString();

// YouTube de mentira: cada id contesta con su código.
const RESPUESTA = { bueno1: 200, bueno2: 200, borrado: 400, privado: 401, sinInsertar: 403, nuevo: 200, pais: 200, lento: 'red', limite: 429 };
const pedir = async (url) => {
  const id = new URL(new URL(url).searchParams.get('url')).searchParams.get('v');
  const c = RESPUESTA[id];
  if (c === 'red') throw new Error('timeout');
  return { status: c || 404 };
};

console.log('\nrespuesta de YouTube');
ok('200 → se ve', (await revisarUno('bueno1', pedir)).estado === 'ok');
ok('400 → no existe (problema)', (await revisarUno('borrado', pedir)).codigo === 400);
ok('401 → privado o no deja insertarlo (problema)', (await revisarUno('privado', pedir)).estado === 'problema');
ok('sin respuesta o límite de consultas → no se anota nada', (await revisarUno('lento', pedir)) === null && (await revisarUno('limite', pedir)) === null);

console.log('\nqué toca revisar');
const refs = ['a', 'b', 'c', 'd', 'e'].map(r => ({ ref: r, ejercicio_id: r, user_id: 'u' }));
const est = [
  { video_ref: 'a', estado: 'ok', codigo: null, revisado_en: hace(2) },        // revisado hace 2 días: no
  { video_ref: 'b', estado: 'ok', codigo: null, revisado_en: hace(8) },        // hace 8: sí
  { video_ref: 'c', estado: 'problema', codigo: 150, revisado_en: hace(30) },  // lo encontró el botón: no
  { video_ref: 'd', estado: 'problema', codigo: 404, revisado_en: hace(9) },   // lo encontró el servidor: sí
];
const toca = porRevisar(refs, est, AHORA).map(r => r.ref);
ok('una vez por semana: no repite lo revisado hace menos de 7 días', !toca.includes('a') && toca.includes('b'));
ok('los nunca revisados van primero', toca[0] === 'e', toca.join(','));
ok('lo que encontró el botón del CRM (bloqueo por país) no se repasa', !toca.includes('c'));
ok('un problema que encontró la revisión automática sí se vuelve a mirar', toca.includes('d'));
ok('en tandas: nunca más de las que caben en una pasada', porRevisar(Array.from({ length: 80 }, (_, i) => ({ ref: 'x' + i })), [], AHORA).length === 25);
ok('un «se ve» no borra un problema del botón', filaNueva({ estado: 'problema', codigo: 150 }, refs[0], { estado: 'ok', codigo: null }) === null);
ok('un «se ve» sí limpia un problema de la revisión automática', filaNueva({ estado: 'problema', codigo: 404 }, refs[0], { estado: 'ok', codigo: null }).estado === 'ok');

console.log('\nuna pasada completa');
const escritos = [];
const tablas = {
  ejercicio_video_estado: [{ video_ref: 'bueno2', estado: 'ok', codigo: null, revisado_en: hace(1), user_id: 'coach' }, { video_ref: 'pais', estado: 'problema', codigo: 150, revisado_en: hace(20), user_id: 'coach' }],
  ejercicios: [
    { id: 1, user_id: 'coach', video_ref: 'bueno1' }, { id: 2, user_id: 'coach', video_ref: 'bueno2' }, { id: 3, user_id: 'coach', video_ref: 'borrado' },
    { id: 4, user_id: 'coach', video_ref: 'privado' }, { id: 5, user_id: 'coach', video_ref: 'pais' }, { id: 6, user_id: 'coach', video_ref: 'lento' },
    { id: 7, user_id: 'coach', video_ref: 'borrado' }, { id: 8, user_id: 'coach', video_ref: 'viejo', archivado: true },
  ],
};
const crm = async (path, opts = {}) => {
  if (opts.method === 'POST') { escritos.push(...JSON.parse(opts.body)); return null; }
  if (opts.method && opts.method !== 'GET') throw new Error('solo lee y escribe filas nuevas');
  return tablas[path.split('?')[0]];
};
const r = await revisarVideos({ crm, pedir, ahora: AHORA });
const de = Object.fromEntries(escritos.map(f => [f.video_ref, f]));
ok('anota los rotos (borrado y privado) con su código', de.borrado?.estado === 'problema' && de.borrado?.codigo === 400 && de.privado?.codigo === 401);
ok('anota el que se ve', de.bueno1?.estado === 'ok');
ok('el mismo video en dos ejercicios se revisa una sola vez', escritos.filter(f => f.video_ref === 'borrado').length === 1);
ok('no toca lo revisado ayer, ni lo del botón, ni los archivados, ni los que no contestaron', !de.bueno2 && !de.pais && !de.viejo && !de.lento);
ok('lleva el dueño (user_id) en cada fila', escritos.every(f => f.user_id === 'coach'));
ok('cuenta lo que hizo', r.revisados === 3 && r.problemas === 2 && r.sinRespuesta === 1, JSON.stringify(r));
const sinTabla = await revisarVideos({ crm: async () => { throw new Error('crm 404 relation does not exist'); }, pedir, ahora: AHORA });
ok('sin la tabla en el CRM no revienta (avisa sinTabla)', sinTabla.sinTabla === true);

console.log(mal ? `\n${mal} falla(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
