// La performance de cada cliente, al día (api/_semana.js): la semana en curso
// se va llenando con lo que registra (entrenos, actividad extra, comida), con
// los mismos scores del CRM, y nunca pisa lo que guardó el coach.
//
//   node pruebas/semana-auto.mjs
import { cerrarSemana, semanaISO, rangoSemana, calcScores, NOTA_AUTO } from '../api/_semana.js';
import { tipoExtra, bonoExtra } from '../api/_actividad.js';

let fallos = 0;
const ok = (n, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + extra}`); };

const enCurso = semanaISO('2026-10-14');   // miércoles
const anterior = semanaISO('2026-10-07');
const { dias } = rangoSemana(enCurso);
ok('semana ISO de lunes a domingo', enCurso === '2026-W42' && dias[0] === '2026-10-12' && dias[6] === '2026-10-18', `${enCurso} ${dias[0]} ${dias[6]}`);
ok('actividad extra: cada tipo a su grupo', tipoExtra('running') === 'running' && tipoExtra('cinta') === 'caminata' && tipoExtra('natacion') === 'natacion'
  && tipoExtra('futbol') === 'deporte' && tipoExtra('otro', 'Yoga') === 'movilidad' && tipoExtra('bicicleta') === 'ciclismo');
ok('actividad extra: puntos por día con tope de +10', bonoExtra({ running: 2, caminata: 1 }) === 7 && bonoExtra({ running: 5 }) === 10 && bonoExtra(null) === 0);

const crmDb = {
  clientes: [
    { id: 'c1', user_id: 'coach', nombre: 'Ana Pérez', estado: 'activo', meta_calorias: 2000, meta_proteina_g: 120 },
    { id: 'c2', user_id: 'coach', nombre: 'Beto Ruiz', estado: 'activo', meta_calorias: 2400, meta_proteina_g: 150 },
    { id: 'c3', user_id: 'coach', nombre: 'Sin App', estado: 'activo', meta_calorias: 2000 },
    { id: 'c4', user_id: 'coach', nombre: 'En Pausa', estado: 'pausa' },
  ],
  seguimientos: [{ user_id: 'coach', cliente_id: 'c2', semana: enCurso, fuerza_ejecutados: 2, notas: 'del coach' }],
  sesiones: [
    { cliente_id: 'c1', fecha: '2026-10-12', estado: 'completada', origen: 'cliente' },
    { cliente_id: 'c1', fecha: '2026-10-13', estado: 'en_curso', origen: 'cliente' },
    { cliente_id: 'c1', fecha: '2026-10-07', estado: 'completada', origen: 'cliente' },
    { cliente_id: 'c3', fecha: '2026-10-13', estado: 'completada', origen: 'importada' },
  ],
  actividades: [
    { cliente_id: 'c1', fecha: '2026-10-13', tipo: 'running' },
    { cliente_id: 'c1', fecha: '2026-10-13', tipo: 'caminata' },
    { cliente_id: 'c1', fecha: '2026-10-14', tipo: 'running' },
  ],
  fases: [{ id: 'f1', cliente_id: 'c1', estado: 'activa', orden: 1 }],
  rutinas: [{ fase_id: 'f1', archivada: false }, { fase_id: 'f1', archivada: false }, { fase_id: 'f1', archivada: false }, { fase_id: 'f1', archivada: true }],
};
const mtDb = { user_data: [
  { user_id: 'u-ana', name: 'ana perez', updated_at: '2026-10-14', history: { '2026-10-12': { kcal: 1800, p: 100 }, '2026-10-13': { kcal: 2200, p: 140 }, '2026-10-05': { kcal: 9000, p: 9 } },
    today: '2026-10-14', today_totals: { kcal: 2000, p: 120 } },
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
    const i = crmDb[t].findIndex(s => s.user_id === fila.user_id && s.cliente_id === fila.cliente_id && s.semana === fila.semana);
    if (i >= 0) crmDb[t][i] = { ...crmDb[t][i], ...fila }; else crmDb[t].push(fila);
    return null;
  }
  return filtra(crmDb[t] || [], q);
};
const mt = async (path) => { const [t, qs] = path.split('?'); return filtra(mtDb[t] || [], new URLSearchParams(qs || '')); };

// Miércoles: la semana en curso, hasta hoy.
let r = await cerrarSemana({ crm, mt, hoy: '2026-10-14' });
let ana = crmDb.seguimientos.find(s => s.cliente_id === 'c1' && s.semana === enCurso);
ok('miércoles: la semana de Ana ya está en el CRM, con lo que lleva hasta hoy', !!ana && r.semanas[enCurso].creadas === 1, JSON.stringify(r));
ok('entrenos: 1 hecho de 3 programados (el de a medias no cuenta)', ana && ana.fuerza_ejecutados === 1 && ana.fuerza_planeados === 3, JSON.stringify(ana));
ok('actividad extra: 2 días de running y 1 de caminata, con su bono', ana && ana.actividad_extra.running === 2 && ana.actividad_extra.caminata === 1 && ana.cardio_ejecutados === 3);
ok('el bono suma al entreno: 33 % + 7 = 40 %', ana && Math.round(ana.score_entreno) === 40, String(ana && ana.score_entreno));
ok('comida: promedio de los 3 días registrados (incluye hoy)', ana && ana.kcal_promedio === 2000 && ana.proteina_promedio_g === 120 && ana.dias_registro_alim === 3, JSON.stringify(ana));
ok('lleva la marca de semana automática', ana && ana.notas === NOTA_AUTO);
ok('Beto: su semana la guardó el coach y NO se toca', crmDb.seguimientos.find(s => s.cliente_id === 'c2').notas === 'del coach' && crmDb.seguimientos.filter(s => s.cliente_id === 'c2').length === 1);
ok('sin app (solo historial de Trainerize): no se le inventa un 0 %', !crmDb.seguimientos.some(s => s.cliente_id === 'c3'));
ok('en pausa: no', !crmDb.seguimientos.some(s => s.cliente_id === 'c4'));

// Jueves: entrena otra vez → la misma semana se actualiza (no se duplica).
crmDb.sesiones.push({ cliente_id: 'c1', fecha: '2026-10-15', estado: 'completada', origen: 'cliente' });
r = await cerrarSemana({ crm, mt, hoy: '2026-10-15' });
ana = crmDb.seguimientos.find(s => s.cliente_id === 'c1' && s.semana === enCurso);
ok('jueves: la semana se actualiza sola (2 de 3) sin duplicarse', ana.fuerza_ejecutados === 2 && crmDb.seguimientos.filter(s => s.cliente_id === 'c1' && s.semana === enCurso).length === 1 && r.semanas[enCurso].actualizadas === 1, JSON.stringify(r));

// El coach la guarda desde el CRM (se quita la marca) → ya no se toca más.
ana.notas = 'revisada'; ana.fuerza_ejecutados = 3;
await cerrarSemana({ crm, mt, hoy: '2026-10-16' });
ok('cuando el coach la guarda, es suya: no se vuelve a pisar', crmDb.seguimientos.find(s => s.cliente_id === 'c1' && s.semana === enCurso).fuerza_ejecutados === 3);

// Lunes: además se cierra la semana anterior.
r = await cerrarSemana({ crm, mt, hoy: '2026-10-19' });
ok('lunes: se cierra también la semana anterior', !!r.semanas[enCurso] && !!r.semanas[semanaISO('2026-10-19')], JSON.stringify(Object.keys(r.semanas)));
ok('mismos scores que el CRM', Math.round(calcScores({ fuerza_ejecutados: 2, fuerza_planeados: 4, actividad_extra: { deporte: 1 }, kcal_promedio: 1800, proteina_promedio_g: 120, dias_registro_alim: 7 }, { meta_calorias: 2000, meta_proteina_g: 120 }).score_global) === Math.round((52 + 95 + 100) / 3));
void anterior;

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
