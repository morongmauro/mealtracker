// Cierre de ciclo (api/training.js → ent.ciclo y src/cierreCiclo.js) y Tu
// balance (src/cierreCiclo.js):
//   · el cierre sale solo cuando empezó el ciclo nuevo (y menos de 3 semanas);
//   · entrenos hechos y semanas completas del ciclo que terminó;
//   · récords: superó su mejor 1RM de antes del ciclo, con su mejor serie;
//   · comida: días en meta de calorías y de proteína;
//   · el tono: felicitación si lo logró, aliento si le faltó;
//   · balance: última medición contra la anterior, primera = punto de partida,
//     sin medición reciente no sale.
//   node pruebas/cierre-ciclo.mjs
const { armarDash } = await import('../api/training.js');
const { sumarDiasISO, lunesDe } = await import('../api/_entreno.js');
const { cierreDelCiclo, balanceDe, textoCierre } = await import('../src/cierreCiclo.js');

let fallos = 0, casos = 0;
async function caso(nombre, fn) { casos++; try { await fn(); console.log('  ok   ' + nombre); } catch (e) { fallos++; console.log('  MAL  ' + nombre + '\n         ' + e.message); } }
const igual = (a, b, q) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${q}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`); };

// Ciclo de 4 semanas (L, X, V) que terminó el domingo; el nuevo empezó el lunes.
const hoy = '2026-11-18';                              // miércoles
const lunes = lunesDe(hoy);                            // 2026-11-16
const ini = sumarDiasISO(lunes, -28);                  // 2026-10-19
const fases = [{ id: 'f1', fecha_inicio: ini, semanas: 4, dias_semana: ['L', 'X', 'V'] }, { id: 'f2', fecha_inicio: lunes, semanas: 4, dias_semana: ['L', 'X', 'V'] }];
const sesiones = [], series = [];
// Semanas 1-3 completas (3 de 3), semana 4: 1 de 3. Antes del ciclo: sentadilla 60 × 8.
let n = 0;
const ses = (fecha, kg, reps, ej = 'sq') => { const id = 's' + (++n); sesiones.push({ id, fecha, estado: 'completada' }); series.push({ sesion_id: id, ejercicio_id: ej, reps, peso: kg, unidad: 'kg' }); };
ses(sumarDiasISO(ini, -7), 60, 8);
for (let w = 0; w < 3; w++) [0, 2, 4].forEach(d => ses(sumarDiasISO(ini, 7 * w + d), 60 + w * 5, 8));
ses(sumarDiasISO(ini, 21), 75, 6);
const nombres = { sq: 'Sentadilla' }, alias = { sq: 'Back Squat' };

await caso('servidor: el ciclo que terminó, con entrenos, semanas completas y récord', async () => {
  const d = armarDash({ hoy, fases, sesiones, series, nombres, alias });
  igual(d.ciclo && d.ciclo.id, 'f1', 'ciclo');
  igual(d.ciclo.rutinas, { hechos: 10, planeados: 12 }, 'entrenos');
  igual(d.ciclo.semanas_completas, 3, 'semanas completas');
  igual(d.ciclo.records_n, 1, 'un récord');
  igual([d.ciclo.records[0].alias, d.ciclo.records[0].kg, d.ciclo.records[0].reps], ['Back Squat', 75, 6], 'su mejor serie');
});
await caso('servidor: sin ciclo nuevo empezado, no hay cierre; ni con el nuevo de más de 3 semanas', async () => {
  igual(armarDash({ hoy, fases: [fases[0]], sesiones, series, nombres }).ciclo, null, 'sin nuevo');
  igual(armarDash({ hoy: sumarDiasISO(lunes, 25), fases, sesiones, series, nombres }).ciclo, null, 'nuevo viejo');
});

const ciclo = armarDash({ hoy, fases, sesiones, series, nombres, alias }).ciclo;
const goals = { kcal: 2000, p: 150 };
const comida = (dias, kcal, p) => Object.fromEntries(Array.from({ length: dias }, (_, i) => [sumarDiasISO(ini, i), { kcal, p }]));
await caso('cierre: buen entreno + comida en meta → felicitación', async () => {
  const c = cierreDelCiclo({ ciclo, history: comida(24, 2050, 150), goals });
  igual(c.tono, 'logro', 'tono');
  igual(c.titulo[0], 'Ciclo cumplido.', 'título');
  igual(c.filas.map(f => [f.clave, f.valor]), [['rutinas', '10 de 12'], ['semanas', '3 de 4'], ['kcal', '24 de 28'], ['proteina', '24 de 28']], 'filas');
  igual(c.records[0].nombre, 'Back Squat', 'récord en inglés');
  if (!/Récord en Back Squat: 75 kg × 6/.test(textoCierre(c))) throw new Error('texto para el coach');
});
await caso('cierre: le faltó (pocos entrenos y sin comida en meta) → aliento con foco', async () => {
  const pocos = { ...ciclo, rutinas: { hechos: 3, planeados: 12 }, semanas_completas: 0 };
  const c = cierreDelCiclo({ ciclo: pocos, history: comida(5, 3000, 60), goals });
  igual(c.tono, 'aliento', 'tono');
  igual(c.titulo[0], 'Este ciclo costó.', 'título');
  if (!/Tu foco: registrar tu comida/.test(c.foco || '')) throw new Error('foco (lo más flojo: la comida): ' + c.foco);
  const c2 = cierreDelCiclo({ ciclo: pocos, history: comida(20, 2000, 150), goals });
  if (!/Tu foco: tus 3 entrenos de cada semana/.test(c2.foco || '')) throw new Error('foco (lo más flojo: el entreno): ' + c2.foco);
});
await caso('cierre: a medias → «Buen ciclo, con margen»', async () => {
  const c = cierreDelCiclo({ ciclo: { ...ciclo, rutinas: { hechos: 7, planeados: 12 } }, history: comida(10, 2000, 150), goals });
  igual(c.tono, 'medio', 'tono');
});

await caso('balance: contra la anterior, con días; mismo peso y menos grasa', async () => {
  const b = balanceDe([{ fecha: '2026-10-12', peso: 78.2, grasa_pct: 24.5 }, { fecha: '2026-11-15', peso: 78.2, grasa_pct: 23.1 }], hoy);
  igual([b.dias, b.titulo[0]], [34, 'Mismo peso,'], 'días y título');
  igual(b.filas.map(f => [f.clave, f.cambio]), [['peso', 0], ['grasa', -1.4], ['magra', 1.1]], 'cambios');
});
await caso('balance: la primera medición es el punto de partida; una vieja (más de 3 semanas) no sale', async () => {
  igual(balanceDe([{ fecha: '2026-11-10', peso: 70 }], hoy).titulo, ['Tu punto', 'de partida.'], 'primera');
  igual(balanceDe([{ fecha: '2026-09-01', peso: 70 }, { fecha: '2026-10-01', peso: 69 }], hoy), null, 'vieja');
});

console.log(fallos ? `\n${fallos} de ${casos} MAL` : `\n${casos}/${casos} bien`);
process.exit(fallos ? 1 : 0);
