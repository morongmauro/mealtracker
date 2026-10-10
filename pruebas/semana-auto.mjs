// La semana de cada cliente, sola (api/_semana.js): se crea con lo que marcó
// en su app, con los mismos scores del CRM, y nunca pisa lo que ya existe.
//
//   node pruebas/semana-auto.mjs
import { cerrarSemana, semanaISO, rangoSemana, calcScores } from '../api/_semana.js';

let fallos = 0;
const ok = (n, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + extra}`); };

const hoy = '2026-10-12';                 // lunes
const semana = semanaISO('2026-10-05');   // la que cerró
const { dias } = rangoSemana(semana);
ok('semana: el lunes se registra la semana anterior (lunes a domingo)', semana === '2026-W41' && dias[0] === '2026-10-05' && dias[6] === '2026-10-11', `${semana} ${dias[0]} ${dias[6]}`);

const crmDb = {
  clientes: [
    { id: 'c1', user_id: 'coach', nombre: 'Ana Pérez', estado: 'activo', meta_calorias: 2000, meta_proteina_g: 120, mealtracker_id: null },
    { id: 'c2', user_id: 'coach', nombre: 'Beto Ruiz', estado: 'activo', meta_calorias: 2400, meta_proteina_g: 150 },
    { id: 'c3', user_id: 'coach', nombre: 'Sin App', estado: 'activo', meta_calorias: 2000 },
    { id: 'c4', user_id: 'coach', nombre: 'En Pausa', estado: 'pausa' },
  ],
  seguimientos: [{ id: 's-beto', user_id: 'coach', cliente_id: 'c2', semana, fuerza_ejecutados: 2, notas: 'del coach' }],
  sesiones: [
    { id: 1, cliente_id: 'c1', fecha: '2026-10-05', estado: 'completada', origen: 'cliente' },
    { id: 2, cliente_id: 'c1', fecha: '2026-10-07', estado: 'completada', origen: 'cliente' },
    { id: 3, cliente_id: 'c1', fecha: '2026-10-09', estado: 'en_curso', origen: 'cliente' },
    { id: 4, cliente_id: 'c1', fecha: '2026-10-02', estado: 'completada', origen: 'cliente' },   // semana anterior
    { id: 5, cliente_id: 'c3', fecha: '2026-10-06', estado: 'completada', origen: 'importada' },
  ],
  fases: [{ id: 'f1', cliente_id: 'c1', estado: 'activa', orden: 1 }],
  rutinas: [{ id: 'r1', fase_id: 'f1', archivada: false }, { id: 'r2', fase_id: 'f1', archivada: false }, { id: 'r3', fase_id: 'f1', archivada: false }, { id: 'r4', fase_id: 'f1', archivada: true }],
};
const mtDb = { user_data: [
  { user_id: 'u-ana', name: 'ana perez', updated_at: '2026-10-11', data: {
    history: { '2026-10-05': { kcal: 1800, p: 100 }, '2026-10-06': { kcal: 2200, p: 140 }, '2026-10-07': { kcal: 2000, p: 120 }, '2026-10-01': { kcal: 9000, p: 9 } },
    historyDetail: {} } },
] };
const filtra = (filas, q) => filas.filter(f => [...q.entries()].every(([k, v]) => {
  if (['select', 'order', 'limit', 'on_conflict'].includes(k)) return true;
  const [op, ...r] = v.split('.'); const a = r.join('.');
  if (op === 'eq') return String(f[k]) === a;
  if (op === 'gte') return String(f[k]) >= a;
  if (op === 'lte') return String(f[k]) <= a;
  if (op === 'in') return a.replace(/^\(|\)$/g, '').split(',').includes(String(f[k]));
  return true;
}));
const crm = async (path, opts = {}) => {
  const [t, qs] = path.split('?'); const q = new URLSearchParams(qs || '');
  if (opts.method === 'POST') {
    const fila = JSON.parse(opts.body);
    if (!crmDb[t].some(s => s.user_id === fila.user_id && s.cliente_id === fila.cliente_id && s.semana === fila.semana)) crmDb[t].push(fila);
    return null;
  }
  return filtra(crmDb[t] || [], q);
};
const mt = async (path) => { const [t, qs] = path.split('?'); return filtra(mtDb[t] || [], new URLSearchParams(qs || '')); };

const r = await cerrarSemana({ crm, mt, hoy });
const ana = crmDb.seguimientos.find(s => s.cliente_id === 'c1');
ok('Ana: su semana se crea sola', r.creadas === 1 && !!ana, JSON.stringify(r));
ok('Ana: entrenos hechos (solo los terminados de esa semana) contra los programados de su fase', ana && ana.fuerza_ejecutados === 2 && ana.fuerza_planeados === 3, JSON.stringify(ana));
ok('Ana: kcal y proteína promedio y días con registro (solo de esa semana)', ana && ana.kcal_promedio === 2000 && ana.proteina_promedio_g === 120 && ana.dias_registro_alim === 3, JSON.stringify(ana));
const esp = calcScores({ fuerza_ejecutados: 2, fuerza_planeados: 3, kcal_promedio: 2000, proteina_promedio_g: 120, dias_registro_alim: 3 }, crmDb.clientes[0]);
ok('Ana: los scores, con la misma regla del CRM', ana && Math.round(ana.score_entreno) === 67 && Math.round(ana.score_alim_metas) === 100 && Math.round(ana.score_global) === Math.round(esp.score_global), JSON.stringify(ana));
ok('Beto: su semana ya la guardó el coach y NO se toca', crmDb.seguimientos.filter(s => s.cliente_id === 'c2').length === 1 && crmDb.seguimientos.find(s => s.cliente_id === 'c2').notas === 'del coach');
ok('sin app (solo historial importado de Trainerize): no se le inventa un 0 %', !crmDb.seguimientos.some(s => s.cliente_id === 'c3') && r.sinUso === 1);
ok('clientes en pausa: no', !crmDb.seguimientos.some(s => s.cliente_id === 'c4'));
const r2 = await cerrarSemana({ crm, mt, hoy: '2026-10-13' });
ok('el martes (si el lunes se saltó) no duplica nada', r2.creadas === 0 && crmDb.seguimientos.filter(s => s.cliente_id === 'c1').length === 1, JSON.stringify(r2));
const r3 = await cerrarSemana({ crm, mt, hoy: '2026-10-15' });
ok('otros días no corre', !!r3.omitido);

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
