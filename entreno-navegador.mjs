// El módulo de entrenamiento en Chromium, de punta a punta: la pantalla real
// (src/Entrenamiento.jsx) contra la API real (api/training.js) sobre una base
// en memoria. Nada de la red sale del proceso.
//
//   node pruebas/entreno-navegador.mjs
//
// Necesita playwright (global o en NODE_PATH) y el navegador preinstalado.

import { createRequire } from 'node:module';
import { createServer } from 'vite';
import path from 'node:path';
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

const require_ = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require_('playwright')); }
catch { try { ({ chromium } = require_(path.join(process.execPath, '../../lib/node_modules/playwright'))); }
catch { console.error('Falta playwright:  npm i -g playwright'); process.exit(2); } }

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const { default: handler } = await import('../api/training.js');

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const mas = (ymd, n) => { const t = new Date(Date.parse(ymd + 'T00:00:00Z')); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const lunes = (() => { const t = new Date(Date.parse(hoy + 'T00:00:00Z')); return mas(hoy, -((t.getUTCDay() + 6) % 7)); })();

const sb = crearSupabaseFalso({
  porDefecto: { sesiones: { estado: 'en_curso' }, series_log: { completada: true } },
  tablas: {
    clientes: [{ id: 'c1', user_id: 'coach-1', nombre: 'Mauro Morón', estado: 'activo' }],
    fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Fase 1', estado: 'activa', visible_cliente: true, orden: 1,
      fecha_inicio: mas(lunes, -14), semanas: 8, dias_semana: ['L', 'M', 'J', 'V'] }],
    rutinas: [
      { id: 'r1', cliente_id: 'c1', fase_id: 'f1', nombre: 'Push', dia_orden: 1, dias_semana: ['L', 'J'], archivada: false },
      { id: 'r2', cliente_id: 'c1', fase_id: 'f1', nombre: 'Lower', dia_orden: 2, dias_semana: ['M', 'V'], archivada: false },
      { id: 'r3', cliente_id: 'c1', fase_id: 'f1', nombre: 'Pull', dia_orden: 3, dias_semana: ['X'], archivada: false },
    ],
    rutina_bloques: [],
    rutina_ejercicios: [
      { id: 're1', rutina_id: 'r1', ejercicio_id: 'e1', orden: 1, series: 3, reps: '8', descanso_seg: 120 },
      { id: 're2', rutina_id: 'r2', ejercicio_id: 'e2', orden: 1, series: 3, reps: '10' },
      { id: 're3', rutina_id: 'r3', ejercicio_id: 'e3', orden: 1, series: 2, reps: '12' },
    ],
    ejercicios: [{ id: 'e1', nombre: 'Press banca' }, { id: 'e2', nombre: 'Sentadilla' }, { id: 'e3', nombre: 'Remo con mancuerna' }],
    sesiones: [{ id: 's0', cliente_id: 'c1', rutina_id: 'r1', fase_id: 'f1', fecha: mas(lunes, -7), estado: 'completada' }],
    series_log: [{ id: 'l0', sesion_id: 's0', rutina_ejercicio_id: 're1', ejercicio_id: 'e1', serie_num: 1, reps: 8, peso: 60, unidad: 'kg', completada: true }],
    actividades: [], actividades_catalogo: [], eventos: [], mediciones_corporales: [], notas_entreno: [],
  },
});
globalThis.fetch = sb.fetch;

const raiz = path.resolve(import.meta.dirname, '..');
const vite = await createServer({ root: raiz, logLevel: 'error', server: { port: 5199, strictPort: true } });
await vite.listen();

const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errores = [];
p.on('pageerror', e => errores.push(e.message));
let sinRed = false;
await p.route('**/api/training', async (ruta) => {
  if (sinRed) return ruta.abort('internetdisconnected');
  const r = await llamar(handler, JSON.parse(ruta.request().postData() || '{}'));
  await ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
});

let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };
const sesionesDe = (rid) => sb.db.sesiones.filter(s => s.rutina_id === rid && s.fecha === hoy);
const espera = (ms) => new Promise(r => setTimeout(r, ms));

try {
  await p.goto('http://localhost:5199/pruebas/arnes/entreno.html');
  await p.getByText('Tu semana').waitFor({ timeout: 20000 });

  // 1. Abrir la rutina y solo mirarla
  await p.getByRole('button', { name: /Push/ }).first().click();
  await p.getByText('Press banca').first().waitFor();
  await espera(600);
  ok('mirar la rutina no crea sesión', sesionesDe('r1').length === 0, `sesiones: ${sesionesDe('r1').length}`);

  // 2. Marcar con coma decimal; el descanso arranca y sobrevive a los renders del padre
  await p.getByLabel('Peso serie 1').fill('62,5');
  await p.getByLabel('Peso serie 2').fill('65');          // tecleado, sin marcar
  await p.getByLabel('Marcar serie 1').click();
  await p.getByText('Descanso', { exact: true }).waitFor({ timeout: 3000 });
  await espera(1500);                                    // ~5 renders del padre
  ok('el descanso sigue en pantalla tras varios renders del padre',
    await p.getByText('Descanso', { exact: true }).isVisible());
  ok('lo tecleado sin marcar no se borra', (await p.getByLabel('Peso serie 2').inputValue()) === '65',
    `valor: ${await p.getByLabel('Peso serie 2').inputValue()}`);
  await espera(500);
  const s1 = sb.db.series_log.find(l => l.rutina_ejercicio_id === 're1' && l.serie_num === 1 && l.sesion_id !== 's0');
  ok('la primera serie crea la sesión y guarda 62,5 como 62.5', sesionesDe('r1').length === 1 && s1 && s1.peso === 62.5,
    JSON.stringify(s1));

  // 3. Sin señal
  sinRed = true; await ctx.setOffline(true);
  await p.getByLabel('Marcar serie 2').click();
  await p.getByText(/guardada en tu teléfono/).waitFor({ timeout: 5000 });
  ok('sin señal avisa que la serie quedó en el teléfono', true);
  ok('…y no llegó al servidor', !sb.db.series_log.some(l => l.rutina_ejercicio_id === 're1' && l.serie_num === 2));
  sinRed = false; await ctx.setOffline(false);
  await p.getByText(/guardada en tu teléfono/).waitFor({ state: 'detached', timeout: 20000 });
  ok('al volver la señal sube sola', sb.db.series_log.some(l => l.rutina_ejercicio_id === 're1' && l.serie_num === 2 && l.peso === 65));

  // 4. Terminar: récord y cierre
  await p.getByRole('button', { name: 'Terminar entrenamiento' }).click();
  await p.getByRole('button', { name: 'Enviar a mi coach' }).click();
  await p.getByText(/Récord nuevo/).waitFor({ timeout: 5000 });
  ok('celebra el récord', true);
  ok('la sesión queda completada', sesionesDe('r1')[0]?.estado === 'completada');
  ok('el cardio no se abre encima de la celebración', !(await p.getByText('¿Hiciste algo de cardio al terminar?').isVisible()));
  await p.getByRole('button', { name: 'Seguir' }).click();
  await p.getByText('¿Hiciste algo de cardio al terminar?').waitFor({ timeout: 3000 });
  ok('…y se ofrece después', true);

  // 5. No pude entrenar
  await p.goto('http://localhost:5199/pruebas/arnes/entreno.html');
  await p.getByText('Tu semana').waitFor();
  await p.getByRole('button', { name: /Lower/ }).first().click();
  await p.getByText('Sentadilla').first().waitFor();
  await p.getByRole('button', { name: 'Terminar', exact: true }).click();
  await p.getByRole('button', { name: 'No pude entrenar hoy' }).click();
  await p.getByText('Tu semana').waitFor({ timeout: 5000 });
  ok('«No pude entrenar hoy» deja el día como saltado', sesionesDe('r2')[0]?.estado === 'saltada',
    JSON.stringify(sesionesDe('r2')));

  // 6. kg ⇄ lb, nota al coach y medida
  ok('la pestaña Fotos ya no está', !(await p.getByRole('button', { name: 'Fotos', exact: true }).count()));
  await p.getByRole('button', { name: /Pull/ }).first().click();
  await p.getByText('Remo con mancuerna').first().waitFor();
  await p.getByRole('button', { name: 'Cambiar a libras' }).click();
  await p.getByLabel('Peso serie 1').fill('50');
  await p.getByLabel('Marcar serie 1').click();
  await espera(800);
  const enLb = sb.db.series_log.find(l => l.rutina_ejercicio_id === 're3');
  ok('la serie se guarda en libras', enLb && enLb.unidad === 'lb' && enLb.peso === 50, JSON.stringify(enLb));
  await p.getByRole('button', { name: 'Nota al coach' }).click();
  await p.getByRole('button', { name: 'No tengo esta máquina' }).click();
  await p.getByRole('button', { name: 'Enviar a mi coach' }).click();
  await p.getByRole('button', { name: 'Enviada ✓' }).waitFor({ timeout: 5000 });
  const nota = (sb.db.notas_entreno || [])[0];
  ok('la nota llega pegada al ejercicio', nota && nota.rutina_ejercicio_id === 're3' && /máquina/.test(nota.texto), JSON.stringify(nota));
  await espera(1200);
  await p.getByRole('button', { name: /Mi semana/ }).click();
  await p.getByRole('button', { name: 'Resumen', exact: true }).click();
  await p.getByText('Mis medidas').waitFor({ timeout: 10000 });
  await p.getByRole('button', { name: '+ Registrar' }).last().click();
  await p.getByLabel(/Peso \(kg\)/).fill('80,4');
  await p.getByRole('button', { name: 'Guardar y enviar a mi coach' }).click();
  await p.getByText('80,4 kg').waitFor({ timeout: 5000 });
  const med = (sb.db.mediciones_corporales || [])[0];
  ok('la medida llega al CRM y se ve en su resumen', med && med.peso === 80.4 && med.origen === 'cliente', JSON.stringify(med));

  ok('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
} catch (e) {
  fallos++;
  console.log('  MAL  se cortó: ' + e.message.split('\n')[0]);
  await p.screenshot({ path: path.join(import.meta.dirname, 'entreno-navegador-fallo.png') }).catch(() => {});
} finally {
  await b.close();
  await vite.close();
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
