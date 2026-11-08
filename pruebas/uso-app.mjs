// Lo que abre cada cliente en su app (api/_uso.js): una fila por día, las
// secciones que abrió (solo las conocidas) y las recetas, sin repetir.
//   node pruebas/uso-app.mjs
import { fusionarUso } from '../api/_uso.js';
import { recetasDe } from '../api/coach-data.js';

let fallos = 0, casos = 0;
const caso = (n, fn) => { casos++; try { fn(); console.log('  ok   ' + n); } catch (e) { fallos++; console.log('  MAL  ' + n + '\n         ' + e.message); } };
const igual = (a, b, q) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${q}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

caso('el primer reporte del día crea la fila', () => {
  igual(fusionarUso(null, { secciones: ['dash', 'recetas'], recetas: ['Bowl burrito de pollo'] }), { secciones: { dash: 1, recetas: 1 }, recetas: ['Bowl burrito de pollo'] }, 'fila');
});
caso('los siguientes suman sin repetir y sin secciones inventadas', () => {
  const ex = { secciones: { dash: 1 }, recetas: ['Bowl burrito de pollo'] };
  igual(fusionarUso(ex, { secciones: ['dash', 'chat', 'hackeo'], recetas: ['Bowl burrito de pollo', 'Wrap de carne'] }), { secciones: { dash: 1, chat: 1 }, recetas: ['Bowl burrito de pollo', 'Wrap de carne'] }, 'fila');
});
caso('las recetas que cocinó salen de lo que registró desde una receta (28 días)', () => {
  const r = recetasDe({ recetario_menus: [1, 2], favorites: [1], historyDetail: { '2026-10-30': [{ rawInput: 'receta: Bowl burrito de pollo' }, { rawInput: 'huevos' }], '2026-09-01': [{ rawInput: 'receta: Vieja' }] }, today: '2026-11-01', today_entries: [{ rawInput: 'receta: Huevos con atún' }] }, '2026-11-01');
  igual(r, { menus_creados: 2, favoritos: 1, recetas_registradas: [{ fecha: '2026-10-30', nombre: 'Bowl burrito de pollo' }, { fecha: '2026-11-01', nombre: 'Huevos con atún' }] }, 'recetas');
});
caso('Respira: cada vez que la termina suma una entrada (hora, segundos, minutos y desde dónde)', () => {
  let f = fusionarUso({ secciones: { dash: 1 }, recetas: [] }, { respira: [{ h: '07:10', s: 180, m: 3, o: 'fin-entreno' }] });
  f = fusionarUso(f, { respira: [{ h: '21:05', s: 61.4, m: 1, o: 'dash' }, { h: 'mal', s: 20 }, { h: '22:00', s: 99999 }] });
  igual(f.secciones, { dash: 1, respira: [{ h: '07:10', s: 180, m: 3, o: 'fin-entreno' }, { h: '21:05', s: 61, m: 1, o: 'dash' }] }, 'respira');
});
caso('encuesta y dirección: «Ahora no» pesa más que «vista» ese día; la dirección se guarda', () => {
  let f = fusionarUso(null, { encuesta: 'vista', visual: 'nueva' });
  igual([f.secciones.encuesta, f.secciones.visual], ['vista', 'nueva'], 'le salió');
  f = fusionarUso(f, { encuesta: 'luego' });
  igual(f.secciones.encuesta, 'luego', 'tocó Ahora no');
  f = fusionarUso(f, { encuesta: 'vista', visual: 'otra' });
  igual([f.secciones.encuesta, f.secciones.visual], ['luego', 'nueva'], 'no vuelve a «vista» ni acepta valores raros');
});
caso('Respira: como mucho 20 por día', () => {
  let f = null;
  for (let i = 0; i < 25; i++) f = fusionarUso(f, { respira: [{ h: '10:00', s: 60, m: 1 }] });
  igual(f.secciones.respira.length, 20, 'tope');
});
caso('resumen del mes: queda guardado que ya lo vio (solo AAAA-MM)', () => {
  igual(fusionarUso({ secciones: { dash: 1 }, recetas: [] }, { resumen: '2026-10' }).secciones, { dash: 1, resumen_mes: '2026-10' }, 'visto');
  igual(fusionarUso(null, { resumen: 'x' }).secciones, {}, 'mal formado');
});
// La consulta «¿ya lo vio?» (por su clave o por su nombre, en cualquier día).
{
  process.env.SUPABASE_URL = 'https://app.test'; process.env.SUPABASE_SERVICE_KEY = 'k';
  const { default: handler } = await import('../api/_uso.js?con-env');
  const filas = [{ id: 1, clave: 'n:Mauro Morón', name: 'Mauro Morón', fecha: '2026-11-01', secciones: { dash: 1, resumen_mes: '2026-10' } }];
  const pedidas = [];
  globalThis.fetch = async (url) => {
    pedidas.push(decodeURIComponent(url));
    const u = new URL(url); const or = u.searchParams.get('or') || ''; const mes = u.searchParams.get('secciones->>resumen_mes') || '';
    const r = filas.filter(f => (or.includes(`clave.eq."${f.clave}"`) || or.toLowerCase().includes(`name.ilike."${f.name.toLowerCase()}"`)) && mes === `eq.${f.secciones.resumen_mes}`);
    return { ok: true, status: 200, json: async () => r };
  };
  const llamar = async (body) => { let out; const res = { status: () => res, json: (x) => { out = x; return res; }, setHeader() {} };
    await handler({ method: 'POST', headers: { host: 'a.test', origin: 'https://a.test' }, socket: {}, body }, res); return out; };
  const otroTel = await llamar({ name: 'mauro morón', user_id: null, hoy: '2026-11-02', consulta: 'resumen', mes: '2026-10' });
  const nuevo = await llamar({ name: 'Ana', user_id: null, hoy: '2026-11-02', consulta: 'resumen', mes: '2026-10' });
  caso('resumen del mes: ya lo vio ayer en otro teléfono (nombre en minúsculas) → no sale otra vez', () => igual(otroTel, { ok: true, visto: true }, 'mauro'));
  caso('resumen del mes: quien no lo ha visto → sale', () => igual(nuevo, { ok: true, visto: false }, 'ana'));
}
console.log(`\n${casos - fallos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
