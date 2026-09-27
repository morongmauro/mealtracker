// La visual nueva (v2) en Chromium, con la app ENTERA: barra de secciones,
// Dash, Entrenamiento, Alimentación y Aprendizaje. Saca capturas a
// pruebas/capturas/ y comprueba lo que se puede comprobar solo:
//
//   · Mauro ve la barra nueva; otra persona ve la de siempre, sin cambios
//   · cada sección abre en su opción por defecto y cambia al tocar
//   · la letra nueva solo se carga para Mauro
//   · la barra no se sale de la pantalla en un teléfono de 375 px
//
//   node pruebas/visual-v2.mjs
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

const require_ = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require_('playwright')); }
catch { try { ({ chromium } = require_(path.join(process.execPath, '../../lib/node_modules/playwright'))); }
catch { console.error('Falta playwright:  npm i -g playwright'); process.exit(2); } }

process.env.CRM_SUPABASE_URL = 'https://crm.test';
process.env.CRM_SUPABASE_SERVICE_KEY = 'k';
const { default: handler } = await import('../api/training.js');
const { hoyBogota, lunesDe, sumarDiasISO } = await import('../api/_entreno.js');

const hoy = hoyBogota();
const lunes = lunesDe(hoy);
const hace = (sem, dia = 0) => sumarDiasISO(lunes, -7 * sem + dia);
const CAPTURAS = path.join(import.meta.dirname, 'capturas');
fs.mkdirSync(CAPTURAS, { recursive: true });

// ── Una base con historia: 10 semanas de Push/Lower/Pull y sus series ──
function base() {
  const sesiones = [], series_log = [];
  let n = 0;
  const plan = [['r1', 0], ['r2', 2], ['r3', 4]];
  for (let sem = 9; sem >= 0; sem--) {
    plan.forEach(([rid, dia], k) => {
      const fecha = hace(sem, dia);
      if (fecha >= hoy) return;
      if ((sem === 6 && k === 2) || (sem === 3 && k === 1)) return;          // semanas flojas
      const id = `s${sem}${rid}`;
      sesiones.push({ id, cliente_id: 'c1', rutina_id: rid, fase_id: 'f1', fecha, estado: 'completada', origen: 'cliente' });
      const ej = { r1: [['e1', 60, 8], ['e4', 20, 10]], r2: [['e2', 90, 6], ['e5', 40, 10]], r3: [['e3', 26, 10], ['e6', 55, 8]] }[rid];
      ej.forEach(([eid, base, reps]) => {
        for (let s = 1; s <= 3; s++) {
          series_log.push({ id: `l${n++}`, sesion_id: id, ejercicio_id: eid, rutina_ejercicio_id: `re-${eid}`,
            serie_num: s, reps: reps - (s === 3 ? 1 : 0), peso: base + (9 - sem) * (eid === 'e2' ? 2.5 : 1.25), unidad: 'kg', completada: true });
        }
      });
    });
  }
  const yt = ['xjlz8lRXOOI', 'ONRRAgNLVac', 'U3Atcn3wFjY', 'kpkg8r7dex4', '-IOZiL1Ojv4', '8G-jnVP_f2s'];
  return crearSupabaseFalso({
    porDefecto: { sesiones: { estado: 'en_curso' }, series_log: { completada: true } },
    tablas: {
      clientes: [{ id: 'c1', user_id: 'coach', nombre: 'Mauro Morón', estado: 'activo' },
                 { id: 'c2', user_id: 'coach', nombre: 'Ana Pérez', estado: 'activo' }],
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Fase 2 · Fuerza', estado: 'activa', visible_cliente: true, orden: 2,
        fecha_inicio: hace(9), semanas: 12, dias_semana: ['L', 'X', 'V'], objetivo: 'Subir la fuerza en los básicos.' }],
      rutinas: [
        { id: 'r1', cliente_id: 'c1', fase_id: 'f1', nombre: 'Push', dia_orden: 1, dias_semana: ['L'], archivada: false },
        { id: 'r2', cliente_id: 'c1', fase_id: 'f1', nombre: 'Lower', dia_orden: 2, dias_semana: ['X'], archivada: false },
        { id: 'r3', cliente_id: 'c1', fase_id: 'f1', nombre: 'Pull', dia_orden: 3, dias_semana: ['V'], archivada: false },
      ],
      rutina_bloques: [],
      rutina_ejercicios: [
        { id: 're-e1', rutina_id: 'r1', ejercicio_id: 'e1', orden: 1, series: 3, reps: '8', descanso_seg: 120 },
        { id: 're-e4', rutina_id: 'r1', ejercicio_id: 'e4', orden: 2, series: 3, reps: '10', descanso_seg: 90 },
        { id: 're-e2', rutina_id: 'r2', ejercicio_id: 'e2', orden: 1, series: 3, reps: '6', descanso_seg: 150 },
        { id: 're-e5', rutina_id: 'r2', ejercicio_id: 'e5', orden: 2, series: 3, reps: '10' },
        { id: 're-e3', rutina_id: 'r3', ejercicio_id: 'e3', orden: 1, series: 3, reps: '10' },
        { id: 're-e6', rutina_id: 'r3', ejercicio_id: 'e6', orden: 2, series: 3, reps: '8' },
      ],
      ejercicios: [
        ['e1', 'Press banca con barra', ['pectoral_mayor', 'triceps']], ['e2', 'Sentadilla con barra', ['cuadriceps', 'gluteo_mayor']],
        ['e3', 'Remo con mancuerna', ['dorsal_ancho']], ['e4', 'Elevación lateral', ['deltoides_lateral']],
        ['e5', 'Hip thrust a una pierna', ['gluteo_mayor']], ['e6', 'Jalón al pecho', ['dorsal_ancho', 'biceps']],
      ].map(([id, nombre, mus], i) => ({ id, nombre, musculos_primarios: mus, video_fuente: 'youtube', video_ref: yt[i],
        musculos_secundarios: id === 'e2' ? ['isquiotibiales', 'aductores', 'erectores'] : [] })),
      sesiones, series_log,
      actividades: [{ id: 'a1', cliente_id: 'c1', user_id: 'coach', fecha: hace(0), tipo: 'cinta', duracion_min: 25 }],
      actividades_catalogo: [], eventos: [], notas_entreno: [],
      mediciones_corporales: [
        { id: 'm1', cliente_id: 'c1', user_id: 'coach', fecha: hace(9), peso: 84.6, grasa_pct: 21.4 },
        { id: 'm2', cliente_id: 'c1', user_id: 'coach', fecha: hace(6), peso: 83.9, grasa_pct: 20.6 },
        { id: 'm3', cliente_id: 'c1', user_id: 'coach', fecha: hace(3), peso: 83.1, grasa_pct: 19.8 },
        { id: 'm4', cliente_id: 'c1', user_id: 'coach', fecha: hace(0), peso: 82.4, grasa_pct: 19.1 },
      ],
    },
  });
}

// Lo que el teléfono tiene guardado del mealtracker.
function almacen(nombre) {
  const history = {};
  const hoyLocal = new Date();
  for (let i = 0; i < 84; i++) {
    const d = new Date(hoyLocal); d.setDate(d.getDate() - i);
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if ((i * 7) % 5 === 3 && i > 0) continue;            // días sin registrar
    const kcal = Math.round(2300 + Math.sin(i * 1.7) * 260 + (i % 4) * 40);
    history[f] = { kcal, p: Math.round(150 + Math.cos(i * 1.3) * 28), c: 240, g: 70, water: 0 };
  }
  return {
    'mt:name': JSON.stringify(nombre),
    'mt:goals': JSON.stringify({ kcal: 2400, p: 165, c: 250, g: 70 }),
    'mt:history': JSON.stringify(history),
    'mt:lastActiveAt': '0',
    cloudConsent: 'declined',
    'mt:novedadesVistas': JSON.stringify(['2026-08-26-aprendizaje-y-recetas']),
    trainingOn: '1',
    learningUrl: 'https://centro.test/',
  };
}

const raiz = path.resolve(import.meta.dirname, '..');
const vite = await createServer({ root: raiz, logLevel: 'error', server: { port: 5198, strictPort: true } });
await vite.listen();
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

async function abrir(nombre, { ancho = 390 } = {}) {
  const db = base();
  globalThis.fetch = db.fetch;
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await ctx.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, almacen(nombre));
  await p.route('**/api/**', async (ruta) => {
    const u = new URL(ruta.request().url());
    if (u.pathname === '/api/training') {
      const r = await llamar(handler, JSON.parse(ruta.request().postData() || '{}'));
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
    }
    if (u.pathname === '/api/resources') return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://centro.test/', training: true }) });
    if (u.pathname === '/api/authorize') return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authorized: true, status: 'activo' }) });
    return ruta.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // Miniaturas de YouTube: sin red en las pruebas, un gris con el id.
  await p.route('https://i.ytimg.com/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml',
    body: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#8B8F80"/><text x="160" y="96" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">video</text></svg>` }));
  await p.route('https://centro.test/**', r => r.fulfill({ status: 200, contentType: 'text/html',
    body: `<body style="margin:0;font:600 20px sans-serif;background:#F4F1EA;color:#333;display:grid;place-items:center;height:100vh"><div id=t>Centro · ${'${location.search}'}</div><script>document.getElementById('t').textContent='Centro de aprendizaje · '+(new URLSearchParams(location.search).get('mt_go')||'inicio');addEventListener('message',e=>{if(e.data&&e.data.tipo==='em-ir')document.getElementById('t').textContent='Centro de aprendizaje · '+e.data.a})</script></body>` }));
  await p.goto('http://localhost:5198/');
  return { p, ctx, errores };
}
const foto = (p, nombre) => p.screenshot({ path: path.join(CAPTURAS, nombre + '.png') });

try {
  // ── Mauro ──
  const { p, ctx, errores } = await abrir('Mauro Morón');
  await p.getByText('Cómo vas').waitFor({ timeout: 25000 });
  ok('apertura fría: cae en el Dash', true);
  await p.getByText('Fuerza', { exact: true }).waitFor({ timeout: 10000 });
  await espera(800);
  ok('la letra nueva está puesta', await p.evaluate(() => document.documentElement.hasAttribute('data-v2')));
  ok('la barra nueva está y la vieja no', (await p.locator('nav[aria-label="Secciones"]').count()) === 1
    && (await p.getByRole('button', { name: 'Herram.' }).count()) === 0);
  await foto(p, '01-dash');
  await p.evaluate(() => document.querySelector('[data-view="dash"]').scrollTo(0, 700));
  await espera(300);
  await foto(p, '02-dash-abajo');
  await p.evaluate(() => document.querySelector('[data-view="dash"]').scrollTo(0, 99999));
  await espera(300);
  await foto(p, '03-dash-final');

  await p.getByRole('button', { name: 'Entrenamiento' }).click();
  await p.getByRole('button', { name: 'Calendario' }).waitFor();
  await espera(1800);
  for (const nom of ['Hoy', 'Calendario', 'Galería']) {
    const bx = await p.getByRole('button', { name: nom, exact: true }).last().boundingBox();
    const nv = await p.locator('nav[aria-label="Secciones"]').boundingBox();
    ok(`«${nom}» se ve entera en 390 px`, bx && bx.x >= nv.x && bx.x + bx.width <= nv.x + nv.width, JSON.stringify(bx));
  }
  ok('Entrenamiento abre en Hoy', (await p.getByRole('button', { name: 'Hoy', exact: true }).first().getAttribute('aria-current')) === 'page');
  ok('sin la navegación de arriba del módulo', (await p.getByRole('button', { name: 'Resumen', exact: true }).count()) === 0);
  await foto(p, '04-entreno-hoy');
  await p.getByRole('button', { name: 'Calendario' }).click();
  await espera(1500);
  await foto(p, '05-entreno-calendario');
  await p.getByRole('button', { name: 'Galería' }).click();
  await p.getByText('Sentadilla con barra').first().waitFor({ timeout: 10000 });
  await espera(600);
  await foto(p, '06-entreno-galeria');
  await p.getByText('Sentadilla con barra').first().click();
  await espera(700);
  await foto(p, '07-galeria-ficha');
  ok('la ficha pinta el cuerpo nuevo con lo que trabaja', (await p.locator('path[data-activo="1"]').count()) >= 4);
  await p.locator('text=Qué trabaja').scrollIntoViewIfNeeded();
  await espera(400);
  await foto(p, '07b-ficha-cuerpo');
  await p.keyboard.press('Escape');
  await p.mouse.click(20, 80);
  await espera(400);

  await p.getByRole('button', { name: 'Alimentación' }).click();
  await espera(1200);
  await foto(p, '08-comida-hoy');
  await p.getByRole('button', { name: 'Chat', exact: true }).click();
  await espera(900);
  await foto(p, '09-comida-chat');

  await p.getByRole('button', { name: 'Aprendizaje' }).click();
  await espera(1200);
  const marco = p.frameLocator('iframe[title="Centro de aprendizaje"]');
  ok('Aprendizaje abre en su inicio', /inicio/.test(await marco.locator('#t').textContent()));
  await p.getByRole('button', { name: 'Onboarding' }).click();
  await espera(500);
  ok('Onboarding se pide al centro sin recargarlo', /onboarding/.test(await marco.locator('#t').textContent()));
  await foto(p, '10-aprende');

  await p.getByRole('button', { name: 'Dash' }).click();
  await p.getByText('Cómo vas').waitFor();
  ok('vuelve al Dash', true);
  ok('sin errores de JavaScript (Mauro)', errores.length === 0, errores.join(' | '));
  await ctx.close();

  // ── Teléfono angosto ──
  const n = await abrir('Mauro Morón', { ancho: 375 });
  await n.p.getByText('Cómo vas').waitFor({ timeout: 25000 });
  await n.p.getByRole('button', { name: 'Entrenamiento' }).click();
  await espera(900);
  const caja = await n.p.locator('nav[aria-label="Secciones"]').boundingBox();
  ok('la barra cabe en 375 px', caja && caja.x >= 0 && caja.x + caja.width <= 375, JSON.stringify(caja));
  const gal = await n.p.getByRole('button', { name: 'Galería' }).boundingBox();
  ok('las tres opciones de Entrenamiento se ven enteras en 375 px', gal && gal.x + gal.width <= caja.x + caja.width - 2, JSON.stringify(gal));
  await foto(n.p, '11-375-entreno');
  await n.p.getByRole('button', { name: 'Aprendizaje' }).click();
  await espera(900);
  await foto(n.p, '12-375-aprende');
  await n.ctx.close();

  // ── Otra persona: todo como siempre ──
  const o = await abrir('Ana Pérez');
  await o.p.getByRole('button', { name: 'Herram.' }).waitFor({ timeout: 25000 });
  await espera(2600);
  ok('otra persona ve la barra de siempre', (await o.p.locator('nav[aria-label="Secciones"]').count()) === 0);
  ok('…y su letra de siempre', !(await o.p.evaluate(() => document.documentElement.hasAttribute('data-v2'))));
  ok('…y no abre en el Dash', (await o.p.getByText('Cómo vas').count()) === 0);
  await foto(o.p, '13-otra-persona');
  ok('sin errores de JavaScript (otra persona)', o.errores.length === 0, o.errores.join(' | '));
  await o.ctx.close();
} catch (e) {
  fallos++;
  console.log('  MAL  se cortó: ' + e.message.split('\n')[0]);
} finally {
  await b.close();
  await vite.close();
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
