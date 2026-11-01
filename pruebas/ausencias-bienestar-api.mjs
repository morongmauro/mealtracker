// Ausencias y bienestar (api/_ausencias.js por api/training.js):
//   · bienestar: desde su segunda semana, cada 14 días; guarda 1 a 5;
//   · ausencias: las marca el cliente (hacia adelante o atrás), las edita o
//     las quita (sin borrar); esos días no cuentan en su semana (plan, Dash
//     y mes) salvo que igual entrene.
//
//   node pruebas/ausencias-bienestar-api.mjs
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const { default: handler, armarDash } = await import('../api/training.js');
const { hoyBogota, lunesDe, sumarDiasISO } = await import('../api/_entreno.js');
const { tocaBienestar, diasAusente, validarAusencia } = await import('../api/_ausencias.js');

let mal = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); if (!c) mal++; };
const hoy = hoyBogota();
const lunes = lunesDe(hoy);
const mas = (n) => sumarDiasISO(hoy, n);
// Dos días seguidos de ESTA semana que no son hoy (la prueba corre cualquier día).
const SEM = [0, 1, 2, 3, 4, 5, 6].map(i => sumarDiasISO(lunes, i));
const [A1, A2] = (() => { const i = SEM.indexOf(hoy); return i <= 4 ? [SEM[i + 1], SEM[i + 2]] : [SEM[i - 2], SEM[i - 1]]; })();

// ── Reglas puras ──
ok('bienestar: primera semana no; desde el día 7 sí; 14 días después del último', !tocaBienestar({ activo: true, inicio: mas(-3), ultima: null, hoy })
  && tocaBienestar({ activo: true, inicio: mas(-7), ultima: null, hoy }) && !tocaBienestar({ activo: true, inicio: mas(-90), ultima: mas(-13), hoy })
  && tocaBienestar({ activo: true, inicio: mas(-90), ultima: mas(-14), hoy }) && !tocaBienestar({ activo: false, inicio: mas(-90), ultima: null, hoy }));
ok('días de ausencia: el rango completo, sin las anuladas', diasAusente([{ desde: mas(0), hasta: mas(2) }, { desde: mas(5), hasta: mas(6), anulada_en: 'x' }]).size === 3);
ok('validar: orden, largo, muy atrás', validarAusencia({ desde: mas(2), hasta: mas(1) }, hoy).error === 'orden'
  && validarAusencia({ desde: mas(0), hasta: mas(130) }, hoy).error === 'muy_larga' && validarAusencia({ desde: mas(-90), hasta: mas(-70) }, hoy).error === 'muy_atras'
  && validarAusencia({ desde: mas(-10), hasta: mas(-8), motivo: 'raro' }, hoy).motivo === 'otro');

// La semana con una ausencia del martes al jueves: de L/X/V, el miércoles no cuenta.
const d = armarDash({ hoy, fases: [{ fecha_inicio: sumarDiasISO(lunes, -28), semanas: 12, dias_semana: ['L', 'X', 'V'] }],
  ausentes: diasAusente([{ desde: sumarDiasISO(lunes, 1), hasta: sumarDiasISO(lunes, 3) }]) });
ok('Dash: esa semana se planean 2 (no 3); las otras siguen en 3', d.semana.fuerza.planeados === 2 && d.semanas[d.semanas.length - 2].planeados === 3, JSON.stringify(d.semanas.slice(-2).map(w => w.planeados)));

// ── Con la base falsa ──
function preparar({ conTablas = true, inicio = mas(-40) } = {}) {
  const tablas = {
    clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Ana Pérez', estado: 'activo', fecha_inicio: inicio }],
    fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Ciclo 1', semanas: 12, fecha_inicio: sumarDiasISO(lunes, -28), dias_semana: ['L', 'M', 'X', 'J', 'V', 'S', 'D'], orden: 1, estado: 'activa', visible_cliente: true }],
    rutinas: [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: `r${n}`, fase_id: 'f1', cliente_id: 'c1', nombre: `Rutina ${n}`, dia_orden: n, archivada: false, visible_cliente: true })),
    rutina_ejercicios: [], sesiones: [{ id: 's1', cliente_id: 'c1', rutina_id: 'r1', fecha: hoy, estado: 'completada' }],
    actividades: [], eventos: [], evento_registros: [], rutina_movimientos: [], rutina_extras: [], rutina_quitadas: [],
    mediciones_corporales: [], actividades_catalogo: [], series_log: [], ejercicios: [], videos_tecnica: [],
  };
  if (conTablas) { tablas.ausencias = []; tablas.bienestar = []; }
  const sb = crearSupabaseFalso({ tablas, estricto: !conTablas });
  globalThis.fetch = (url, opts) => sb.fetch(url, opts);
  return sb;
}
const pedir = (accion, extra = {}) => llamar(handler, { accion, name: 'Ana Pérez', ...extra });

let sb = preparar({ inicio: mas(-3) });
let r = await pedir('bienestar');
ok('bienestar: cliente de 3 días, todavía no', r.ok && r.toca === false, JSON.stringify(r));
sb = preparar();
r = await pedir('bienestar');
ok('bienestar: le toca', r.ok && r.toca === true, JSON.stringify(r));
r = await pedir('bienestar_responder', { sueno: 4, energia: 3 });
ok('incompleto no se guarda', r.ok === false && sb.db.bienestar.length === 0);
r = await pedir('bienestar_responder', { sueno: 4, energia: 3, estres: 2 });
const b = sb.db.bienestar[0] || {};
ok('se guarda con su coach, su fecha y sus 3 valores', r.ok && b.cliente_id === 'c1' && b.user_id === 'coach-1' && b.fecha === hoy && b.sueno === 4 && b.energia === 3 && b.estres === 2, JSON.stringify(b));
r = await pedir('bienestar');
ok('respondido hoy: no vuelve a salir', r.toca === false && r.ultima === hoy, JSON.stringify(r));

// Ausencia de mañana a pasado mañana (y hoy, que entrenó: sigue contando).
r = await pedir('ausencia_guardar', { motivo: 'viaje', desde: A1, hasta: A2, nota: 'Me voy a Cartagena' });
const a = sb.db.ausencias[0] || {};
ok('el cliente marca su viaje: queda como suya y para su coach', r.ok && a.origen === 'cliente' && a.user_id === 'coach-1' && a.motivo === 'viaje' && a.nota === 'Me voy a Cartagena' && !a.vista_en, JSON.stringify(a));
r = await pedir('ausencia_guardar', { motivo: 'viaje', desde: mas(3), hasta: mas(1) });
ok('«Hasta» antes de «Desde»: no se guarda', r.ok === false && r.motivo === 'orden');
r = await pedir('ausencia_guardar', { motivo: 'enfermedad', desde: mas(-10), hasta: mas(-8) });
ok('algo que ya pasó (hace 10 días): se puede', r.ok && sb.db.ausencias.length === 2);
const plan = await pedir('plan');
const dia = (f) => (plan.dias || []).find(x => x.fecha === f);
const enSemana = (f) => f >= lunes && f <= sumarDiasISO(lunes, 6);
ok('plan: los días fuera no tienen rutina y dicen el motivo', [A1, A2].every(f => dia(f) && !dia(f).rutina && dia(f).descanso && dia(f).ausencia === 'viaje'), JSON.stringify((plan.dias || []).map(x => [x.fecha, !!x.rutina, x.ausencia])));
ok('plan: fuera de la ausencia los días siguen con su rutina', (plan.dias || []).filter(x => !x.ausencia).every(x => !!x.rutina), JSON.stringify((plan.dias || []).map(x => [x.fecha, !!x.rutina, x.ausencia])));
const mes = await pedir('mes', { ym: A1.slice(0, 7) });
const dm = (f) => (mes.dias || []).find(x => x.fecha === f);
const enMes = [A1, A2].filter(f => f.slice(0, 7) === A1.slice(0, 7)).length;
ok(`mes: los días fuera traen el motivo (${enMes} en este mes) y la ausencia viene en la lista`, (mes.ausencias || []).some(x => x.motivo === 'viaje') && [A1, A2].filter(f => f.slice(0, 7) === A1.slice(0, 7)).every(f => dm(f).ausencia === 'viaje' && !dm(f).rutina), JSON.stringify(mes.ausencias));
{
  sb.db.sesiones.push({ id: 's2', cliente_id: 'c1', fecha: A1, estado: 'en_curso' });
  const p3 = await pedir('plan');
  ok('si igual entrena un día de la ausencia, ese día vuelve a contar', !!(p3.dias || []).find(x => x.fecha === A1).rutina);
  sb.db.sesiones.pop();
}
r = await pedir('ausencias');
ok('sus ausencias: las dos', r.ok && r.ausencias.length === 2);

// El coach la vio; el cliente la cambia: le vuelve a llegar.
sb.db.ausencias[0].vista_en = new Date().toISOString();
r = await pedir('ausencia_guardar', { id: a.id, motivo: 'trabajo', desde: A1, hasta: mas(3) > A2 ? mas(3) : A2 });
ok('editarla: cambia y le vuelve a llegar al coach', r.ok && sb.db.ausencias[0].motivo === 'trabajo' &&  sb.db.ausencias[0].vista_en === null, JSON.stringify(sb.db.ausencias[0]));
r = await pedir('ausencia_quitar', { id: a.id });
ok('quitarla: no se borra, queda anulada', r.ok && sb.db.ausencias.length === 2 && !!sb.db.ausencias[0].anulada_en);
const plan2 = await pedir('plan');
ok('quitada: esos días vuelven a tener su rutina', [A1, A2].every(f => !!(plan2.dias || []).find(x => x.fecha === f).rutina));
// Otra clienta no puede tocar la de Ana.
sb.db.clientes.push({ id: 'c2', user_id: 'coach-1', nombre: 'Luz Mar', estado: 'activo', fecha_inicio: mas(-40) });
r = await llamar(handler, { accion: 'ausencia_quitar', name: 'Luz Mar', id: sb.db.ausencias[1].id });
ok('la de otra persona no se toca', r.ok === false && !sb.db.ausencias[1].anulada_en);

// Sin las tablas (SQL sin correr): nada se rompe.
sb = preparar({ conTablas: false });
r = await pedir('plan');
ok('sin la tabla de ausencias el plan sale igual', r.ok && (r.dias || []).length === 7, JSON.stringify(r).slice(0, 200));

console.log(mal ? `\n${mal} falla(s)` : '\ntodo bien');
process.exit(mal ? 1 : 0);
