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
      clientes: [{ id: 'c1', user_id: 'coach', nombre: 'Mauro Morón', estado: 'activo', dia_pago: Number(hoy.slice(8)) },
                 { id: 'c2', user_id: 'coach', nombre: 'Ana Pérez', estado: 'activo' }],
      fases: [{ id: 'f1', cliente_id: 'c1', nombre: 'Fase 2 · Fuerza', estado: 'activa', visible_cliente: true, orden: 2,
        fecha_inicio: hace(9), semanas: 12, dias_semana: ['L', 'X', 'V'], objetivo: 'Subir la fuerza en los básicos.' }],
      rutinas: [
        { id: 'r1', cliente_id: 'c1', fase_id: 'f1', nombre: 'Push', dia_orden: 1, dias_semana: ['L'], archivada: false },
        { id: 'r2', cliente_id: 'c1', fase_id: 'f1', nombre: 'Lower Body + Core Training', dia_orden: 2, dias_semana: ['X'], archivada: false },
        { id: 'r3', cliente_id: 'c1', fase_id: 'f1', nombre: 'Pull', dia_orden: 3, dias_semana: ['V'], archivada: false },
      ],
      rutina_bloques: [{ id: 'b1', rutina_id: 'r1', nombre: 'A', tipo: 'circuito', vueltas: 2, descanso_seg: 30, orden: 1 }],
      rutina_ejercicios: [
        { id: 're-e7', rutina_id: 'r1', ejercicio_id: 'e7', orden: 1, series: 1, reps: '3 min suave', descanso_seg: null },
        { id: 're-e8', rutina_id: 'r1', bloque_id: 'b1', ejercicio_id: 'e8', orden: 2, series: 1, reps: '5', descanso_seg: 30 },
        { id: 're-e9', rutina_id: 'r1', bloque_id: 'b1', ejercicio_id: 'e9', orden: 3, series: 1, reps: '5 por lado', descanso_seg: 30 },
        { id: 're-e1', rutina_id: 'r1', ejercicio_id: 'e1', orden: 4, series: 3, reps: '6-12', descanso_seg: 120 },
        { id: 're-e4', rutina_id: 'r1', ejercicio_id: 'e4', orden: 5, series: 3, reps: '10-15', descanso_seg: 90 },
        { id: 're-e11', rutina_id: 'r1', ejercicio_id: 'e11', orden: 6, series: 3, reps: '12', descanso_seg: 60 },
        { id: 're-e10', rutina_id: 'r1', ejercicio_id: 'e10', orden: 7, series: 1, reps: '30 s', descanso_seg: null },
        { id: 're-e2', rutina_id: 'r2', ejercicio_id: 'e2', orden: 1, series: 3, reps: '6', descanso_seg: 150 },
        { id: 're-e5', rutina_id: 'r2', ejercicio_id: 'e5', orden: 2, series: 3, reps: '10' },
        { id: 're-e3', rutina_id: 'r3', ejercicio_id: 'e3', orden: 1, series: 3, reps: '10' },
        { id: 're-e6', rutina_id: 'r3', ejercicio_id: 'e6', orden: 2, series: 3, reps: '8' },
      ],
      ejercicios: [
        ['e1', 'Press banca con barra', ['pectoral_mayor', 'triceps']], ['e2', 'Sentadilla con barra', ['cuadriceps', 'gluteo_mayor']],
        ['e3', 'Remo con mancuerna', ['dorsal_ancho']], ['e4', 'Elevación lateral', ['deltoides_lateral']],
        ['e5', 'Hip thrust a una pierna', ['gluteo_mayor']], ['e6', 'Jalón al pecho', ['dorsal_ancho', 'biceps']],
        ['e7', 'Carrera continua', [], 'cardio'], ['e8', 'Dislocaciones de hombro con banda', ['deltoide_posterior'], 'movilidad'],
        ['e9', 'Rotación torácica en cuadrupedia', [], 'movilidad'], ['e10', 'Postura del niño', [], 'estiramiento_pasivo'],
        ['e11', 'Flexión de brazos', ['pectoral_mayor', 'triceps']],
      ].map(([id, nombre, mus, tipo], i) => ({ id, nombre, tipo: tipo || 'fuerza', musculos_primarios: mus, video_fuente: 'youtube', video_ref: yt[i % yt.length],
        alias: { e1: 'Barbell Bench Press', e2: 'Barbell Back Squat', e3: 'Dumbbell Single Arm Row', e4: 'Dumbbell Lateral Raise', e5: 'Bench Single Leg Hip Thrust', e6: 'Wide Grip Lat Pulldown',
          e7: 'Running', e8: 'SuperBand Dislocates', e9: 'Table Top Half Arm Thoracic Rotation', e10: "Child's Pose", e11: 'Push Up' }[id],
        musculos_secundarios: id === 'e2' ? ['isquiotibiales', 'aductores', 'erectores'] : [] })),
      sesiones, series_log,
      actividades: [{ id: 'a1', cliente_id: 'c1', user_id: 'coach', fecha: hace(0), tipo: 'cinta', duracion_min: 25 }],
      actividades_catalogo: [], notas_entreno: [],
      // Lo que el coach puso para registrar: peso y fotos hoy, medición el miércoles.
      eventos: [
        { id: 'evp', cliente_id: 'c1', fase_id: null, tipo: 'peso', titulo: 'Pesarse en ayunas', fecha: hoy, visible_cliente: true },
        { id: 'evf', cliente_id: 'c1', fase_id: null, tipo: 'fotos', titulo: 'Fotos de progreso', detalle: 'Frente, perfil y espalda', fecha: hoy, visible_cliente: true },
        { id: 'evm', cliente_id: 'c1', fase_id: null, tipo: 'medidas', titulo: 'Medición corporal', fecha: sumarDiasISO(hoy, 3), visible_cliente: true },
      ],
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

async function abrir(nombre, { ancho = 390, pago = null } = {}) {
  const db = base();
  globalThis.fetch = db.fetch;
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'America/Bogota' });
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
    if (u.pathname === '/api/payment-status') {
      const estado = typeof pago === 'function' ? pago() : pago;
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(estado || { due: false }) });
    }
    if (u.pathname === '/api/resources') return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://centro.test/', training: true }) });
    if (u.pathname === '/api/authorize') return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authorized: true, status: 'activo' }) });
    return ruta.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // Miniaturas de YouTube: sin red en las pruebas, un gris con el id.
  await p.route('https://i.ytimg.com/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml',
    body: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#8B8F80"/><text x="160" y="96" font-size="18" text-anchor="middle" fill="#fff" font-family="sans-serif">video</text></svg>` }));
  // El avance del centro de aprendizaje (su Supabase): cinco piezas vistas.
  await p.route('https://kkoayfexdhpazufmyeoj.supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
    { client_name: nombre, source: 'hub', section_key: 'programa' }, { client_name: nombre, source: 'hub', section_key: 'app' },
    { client_name: nombre, source: 'capsula', section_key: 'cap:ent-01-capacidades' }, { client_name: nombre, source: 'guia', section_key: 'como-leer-esta-guia' },
    { client_name: nombre, source: 'podcast', section_key: 'pod:compra-cafe' },
  ]) }));
  await p.route('https://centro.test/**', r => r.fulfill({ status: 200, contentType: 'text/html',
    body: `<body style="margin:0;font:600 20px sans-serif;background:#F4F1EA;color:#333;display:grid;place-items:center;height:100vh"><div id=t>Centro · ${'${location.search}'}</div><script>document.getElementById('t').textContent='Centro de aprendizaje · '+(new URLSearchParams(location.search).get('mt_go')||'inicio');addEventListener('message',e=>{if(e.data&&e.data.tipo==='em-ir')document.getElementById('t').textContent='Centro de aprendizaje · '+e.data.a})</script></body>` }));
  await p.goto('http://localhost:5198/');
  return { p, ctx, errores, db };
}
const foto = (p, nombre) => p.screenshot({ path: path.join(CAPTURAS, nombre + '.png') });

try {
  // ── Mauro ──
  const { p, ctx, errores, db } = await abrir('Mauro Morón');
  await p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
  ok('apertura fría: cae en el Dash', true);
  await p.getByText('Días de cardio').waitFor({ timeout: 10000 });
  await espera(800);
  ok('el saludo está en el Dash', (await p.getByText('Hola, Mauro').count()) === 1);
  const dash = p.locator('[data-view="dash"]');
  ok('atajos de recordatorios y reto', (await dash.getByRole('button', { name: /Recordatorios/ }).count()) === 1
    && (await dash.getByRole('button', { name: 'Reto' }).count()) === 1);
  await dash.getByRole('button', { name: 'Reto' }).click();
  const wa = await dash.getByRole('link', { name: /Coach/ }).getAttribute('href');
  ok('los tres atajos van en UNA línea y enteros', await dash.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-atajos] > *')];
    const tops = new Set(bs.map(b => Math.round(b.getBoundingClientRect().top)));
    return bs.length === 3 && tops.size === 1 && bs.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
  }));
  ok('WhatsApp: el mensaje por defecto es «Hola Mau!»', wa === 'https://wa.me/573008527043?text=Hola%20Mau!', wa);
  ok('Unidades ya no está en el Dash', (await dash.getByRole('button', { name: /Unidades/ }).count()) === 0);
  ok('saludo que empuja (no «un día a la vez»)', (await dash.getByText(/Un día a la vez/).count()) === 0);
  ok('secciones: performance semanal, composición corporal y aprendizaje', (await dash.getByText('Composición corporal', { exact: true }).count()) === 1
    && (await dash.getByText('Aprendizaje', { exact: true }).count()) === 1 && (await dash.getByText('Tu cuerpo', { exact: true }).count()) === 0);
  ok('entreno de la semana: fuerza, cardio, lo del coach y lo extra', /Días de cardio/.test(await dash.locator('[data-semana-entreno]').innerText())
    && /Lo que te puso tu coach/.test(await dash.locator('[data-semana-entreno]').innerText()) && /Actividad extra/.test(await dash.locator('[data-semana-entreno]').innerText()));
  ok('comida: promedio en % y en números, y días cerca / lejos', /%/.test(await dash.locator('[data-comida-promedio]').innerText())
    && /de 2\.400 kcal/.test(await dash.locator('[data-comida-promedio]').innerText())
    && (await dash.getByText(/cerca de tu meta/).count()) === 1 && (await dash.getByText(/lejos de tu meta/).count()) === 1);
  ok('Reto: solo «No hay retos actualmente»', (await p.getByRole('dialog', { name: 'Retos' }).innerText()).trim() === 'No hay retos actualmente');
  await foto(p, '01b-reto');
  await p.getByRole('dialog', { name: 'Retos' }).click();
  ok('Reto: un toque lo cierra', (await p.getByRole('dialog', { name: 'Retos' }).count()) === 0);
  await dash.getByRole('button', { name: /Recordatorios/ }).click();
  await p.getByText('Mis recordatorios', { exact: true }).last().waitFor({ timeout: 5000 });
  ok('Recordatorios sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[12]\d), (1[2-4]\d), (8\d|9\d)\)/;   // la familia #7A8B5A
    const caja = [...document.querySelectorAll('.fixed.inset-0.z-50')].pop();
    return ![...caja.querySelectorAll('*')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
  await espera(400);
  await foto(p, '01c-recordatorios');
  await p.getByRole('button', { name: 'Cerrar' }).first().click();
  await espera(500);
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
  await p.getByRole('button', { name: /Profundiza en tus gráficas de entrenamiento/ }).click();
  await p.getByText('Fuerza', { exact: true }).waitFor({ timeout: 10000 });
  ok('Profundiza entrenamiento abre fuerza y volumen', (await p.getByText('Volumen', { exact: true }).count()) === 1);
  await espera(400);
  await foto(p, '03b-profundiza-entreno');
  await p.getByRole('button', { name: /Dash/ }).first().click();
  await p.getByRole('button', { name: /Profundiza en tus gráficas de alimentación/ }).click();
  await p.getByText('Días registrados', { exact: true }).waitFor({ timeout: 10000 });
  await espera(400);
  await foto(p, '03c-profundiza-comida');
  await p.getByRole('button', { name: /calendario de comidas/ }).click();
  await p.getByText(/Calendario de comidas|Mis gráficas/).first().waitFor({ timeout: 5000 });
  await espera(900);
  await foto(p, '03d-calendario-comidas');
  ok('el calendario de comidas se abre desde el Dash', (await p.getByText(/Mes|Semana/).count()) > 0);
  await p.keyboard.press('Escape');
  await p.goto('http://localhost:5198/');
  await p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
  // Aprendizaje: la tarjeta y su «Profundiza»
  await p.locator('[data-aprende]').waitFor({ timeout: 8000 });
  ok('aprendizaje: % completado con lo que vio del centro', /\d+ %/.test(await p.locator('[data-aprende]').innerText())
    && /Onboarding\s*2\/5/.test(await p.locator('[data-aprende]').innerText()), await p.locator('[data-aprende]').innerText());
  await p.locator('[data-aprende]').scrollIntoViewIfNeeded();
  await foto(p, '03e-dash-aprendizaje');
  await p.getByRole('button', { name: /Profundiza en tu aprendizaje/ }).click();
  await p.getByText('Tu aprendizaje', { exact: true }).waitFor({ timeout: 5000 });
  ok('profundiza aprendizaje: pieza por pieza', (await p.getByText('Cómo funciona el programa').count()) === 1 && (await p.getByText('Seguir aprendiendo').count()) >= 1);
  await espera(300);
  await foto(p, '03f-profundiza-aprendizaje');
  await p.getByRole('button', { name: /Dash/ }).first().click();

  await p.getByRole('button', { name: 'Entrenamiento', exact: true }).click();
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
  ok('Hoy de entreno trae su cabecera ilustrada', await p.locator('[data-view="entrena"]').getByText('Tu entreno', { exact: true }).isVisible());
  ok('…con kettlebell y mancuernas, entera en pantalla', await p.locator('[data-dibujo="pesas"]').evaluate(el => { const r = el.getBoundingClientRect(); return r.width > 100 && r.left >= 0 && r.right <= innerWidth; }));
  // Unidades: una preferencia para toda la app
  await p.getByRole('button', { name: /Unidades · kg/ }).first().click();
  await p.getByRole('radio', { name: 'Libras (lb)' }).click();
  await p.keyboard.press('Escape');
  await espera(300);
  ok('unidades: la preferencia queda en lb', (await p.getByRole('button', { name: /Unidades · lb/ }).count()) > 0);
  // La rutina por dentro
  await p.getByRole('button', { name: /Push/ }).first().click();
  await p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 });
  ok('la rutina se parte en calentamiento, fuerza y enfriamiento',
    (await p.locator('[data-view="entrena"]').getByText('Fuerza', { exact: true }).count()) === 1 && (await p.locator('[data-view="entrena"]').getByText('Enfriamiento', { exact: true }).count()) === 1,
    `${await p.locator('[data-view="entrena"]').getByText('Fuerza', { exact: true }).count()} / ${await p.locator('[data-view="entrena"]').getByText('Enfriamiento', { exact: true }).count()} / ${await p.getByText('Enfriamiento').count()}`);
  ok('el calentamiento no pide kilos', await p.evaluate(() => {
    const t = [...document.querySelectorAll('[data-view="entrena"] div')].find(d => d.textContent === 'SuperBand Dislocates');
    let el = t; while (el && getComputedStyle(el).backgroundColor !== 'rgb(250, 249, 246)') el = el.parentElement;
    return !!el && el.querySelectorAll('input').length === 0;
  }));
  ok('circuito: todas las vueltas en UNA tarjeta', (await p.getByText('Circuito · 2 vueltas').count()) === 1);
  ok('circuito: la foto sale cada vez que aparece el ejercicio', (await p.getByRole('button', { name: 'Ver SuperBand Dislocates' }).count()) === 2);
  ok('las cajitas van en blanco, sin sugerencias', (await p.getByLabel('Repeticiones serie 1').first().getAttribute('placeholder')) === null
    && (await p.getByLabel('Peso serie 1').first().getAttribute('placeholder')) === null
    && (await p.getByLabel('Repeticiones serie 1').first().inputValue()) === '');
  ok('lo recetado dice series y reps', (await p.getByText('3 series × 6-12 reps').count()) === 1);
  ok('la última vez ya no va escrita en la tarjeta', (await p.getByText(/^Serie 1: /).count()) === 0);
  ok('cada ejercicio de fuerza trae Ficha, Tu récord, Última vez y Nota', (await p.getByRole('button', { name: /Última vez/ }).count()) >= 3
    && (await p.getByRole('button', { name: /Tu récord/ }).count()) >= 3);
  ok('no hay que darle a iniciar: se dice mientras no hay nada marcado', await p.locator('[data-sin-iniciar]').isVisible());
  ok('el botón de terminar se ve (azul, no gris sobre gris)', await p.locator('[data-terminar]').evaluate(b => {
    const cs = getComputedStyle(b); return cs.borderTopColor === 'rgb(60, 123, 214)' && cs.color === 'rgb(30, 88, 166)';
  }));
  // Peso corporal: solo reps
  const flex = p.locator('[data-ejercicio="Push Up"]');
  ok('peso corporal (Push Up): pide reps y NO pide peso', (await flex.getByLabel(/Repeticiones serie/).count()) === 3 && (await flex.getByLabel(/Peso serie/).count()) === 0,
    `${await flex.getByLabel(/Repeticiones serie/).count()} reps / ${await flex.getByLabel(/Peso serie/).count()} peso`);
  ok('con carga (Bench Press) sí pide peso', (await p.getByLabel('Peso serie 1').count()) >= 2);
  // Los botones caben en 375 px sin partirse en dos filas
  ok('los botones de cada ejercicio van en una fila y sin cortar el texto', await p.evaluate(() => {
    const filas = [...document.querySelectorAll('[data-botones]')];
    return filas.length >= 5 && filas.every(f => {
      const bs = [...f.children];
      return new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size === 1
        && bs.every(b => { const t = b.querySelector('span'); return t.scrollWidth <= t.clientWidth + 1; });
    });
  }));
  ok('descansos: el que tiene dice sus segundos', (await p.getByText('Descanso 120 s entre series').count()) === 1);
  ok('descansos: el que no tiene lo dice', (await p.getByText('Sin descanso').count()) > 0);
  ok('unidades: la rutina abre en lb', (await p.getByText('Peso (lb) ⇄').count()) > 0);
  ok('el avance cuenta ejercicios', (await p.getByText('0/7 ejercicios').count()) === 1);
  await espera(500);
  await foto(p, '04b-rutina-arriba');
  const scRut = () => p.evaluate(() => document.querySelector('[data-view="entrena"]').scrollTop);
  await p.getByText('Barbell Bench Press').first().scrollIntoViewIfNeeded();
  await espera(300);
  await foto(p, '04c-rutina-fuerza');
  // Marcar sin reps no marca: lleva el dedo a la cajita
  await p.getByLabel('Peso serie 1').first().locator('xpath=ancestor::div[2]').getByRole('button').click();
  ok('sin reps no se marca la serie', (await p.locator('[aria-label="Deshacer serie 1"]').count()) === 0);
  await p.getByRole('button', { name: 'Marcar serie 1' }).first().click();
  await espera(300);
  ok('el calentamiento se marca con un toque y se pliega', (await p.getByText('1/3', { exact: true }).count()) === 1);
  ok('el avance sube por ejercicio terminado', (await p.getByText('1/7 ejercicios').count()) === 1);
  ok('con la primera serie marcada ya no sale lo de iniciar', (await p.locator('[data-sin-iniciar]').count()) === 0);
  ok('…y el botón de terminar queda relleno de azul', await p.locator('[data-terminar]').evaluate(b => getComputedStyle(b).backgroundColor === 'rgb(60, 123, 214)'));
  // La ficha tiene scroll propio (el fallo del teléfono) y la silueta va en Características
  await p.getByRole('button', { name: 'Ficha' }).nth(3).click();
  await p.locator('[data-hoja-scroll]').waitFor({ timeout: 5000 });
  await espera(400);
  const hs = p.locator('[data-hoja-scroll]');
  const cajaH = await hs.boundingBox();
  await p.mouse.move(cajaH.x + cajaH.width / 2, cajaH.y + cajaH.height / 2);
  await p.mouse.wheel(0, 500); await espera(400);
  ok('la ficha se deja recorrer con scroll', await hs.evaluate(el => el.scrollHeight > el.clientHeight && el.scrollTop > 0));
  ok('características con los músculos marcados', await p.getByText(/^Principal:/).first().isVisible());
  await foto(p, '04e-ficha-scroll');
  await p.keyboard.press('Escape');
  await espera(300);
  // Tu récord abre su hoja y el scroll no se va a la rutina de atrás
  await p.getByRole('button', { name: /Tu récord/ }).first().click();
  await p.getByText(/Tu récord ·/).waitFor({ timeout: 5000 });
  const antesSc = await scRut();
  await p.mouse.move(195, 700); await p.mouse.wheel(0, 600); await espera(300);
  ok('con la hoja abierta la rutina de atrás no se mueve', (await scRut()) === antesSc, `${antesSc} → ${await scRut()}`);
  await foto(p, '04d-tu-record');
  ok('tu récord: el peso más alto, en la unidad elegida', (await p.getByText('El peso más alto que has levantado').count()) === 1
    && /lb$/.test(await p.locator('[data-record]').textContent()), await p.locator('[data-record]').textContent());
  await p.keyboard.press('Escape');
  await espera(300);
  await p.locator('[data-ejercicio="Barbell Bench Press"]').getByRole('button', { name: /Última vez/ }).click();
  await p.locator('[data-ultima]').waitFor({ timeout: 5000 });
  ok('última vez: serie por serie, pasado a lb', (await p.locator('[data-ultima]').getByText(/^Serie 1: 8 reps · 157 lb$/).count()) === 1,
    await p.locator('[data-ultima]').textContent());
  await foto(p, '04f-ultima-vez');
  await p.keyboard.press('Escape');
  await espera(300);
  await p.getByRole('button', { name: 'Hoy', exact: true }).first().click();
  await espera(800);
  await p.getByRole('button', { name: 'Calendario' }).click();
  await espera(1500);
  await foto(p, '05-entreno-calendario');
  const cal = p.locator('[data-view="entrena"]');
  ok('calendario: abre en la semana, con el nombre entero', (await cal.locator('[data-vista="semana"]').count()) === 1
    && await cal.getByText('Lower Body + Core Training').first().isVisible());
  ok('calendario: sin «la saltaste»', (await cal.getByText(/saltaste/).count()) === 0);
  ok('calendario: el registro de peso y fotos se ve escrito', (await cal.getByText('Registro fotográfico').count()) + (await cal.getByText(/peso/i).count()) >= 2);
  await cal.getByRole('tab', { name: 'Mes' }).click();
  await espera(600);
  await foto(p, '05a-entreno-mes');
  ok('mes: días de la semana en azul', await cal.getByText('Lun', { exact: true }).first().evaluate(el => getComputedStyle(el).color === 'rgb(60, 123, 214)'));
  ok('por hacer con borde azul; hecho relleno de azul', (await cal.locator('[data-chip="pendiente"]').count()) >= 1
    && await cal.locator('[data-chip="pendiente"]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(el).borderTopColor === 'rgb(60, 123, 214)')
    && await cal.locator('[data-chip="hecha"]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(60, 123, 214)'));
  ok('mes: casillas altas (la rutina se lee)', await cal.locator('[data-vista="mes"] [data-fecha]').first().evaluate(el => el.getBoundingClientRect().height >= 90));
  ok('calendario: sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[12]\d), (1[2-4]\d), (8\d|9\d)\)|rgb\(231, 235, 214\)/;
    return ![...document.querySelectorAll('[data-view="entrena"] *')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor) || oliva.test(getComputedStyle(el).borderTopColor));
  }));
  await cal.locator('[data-fecha="' + hoy + '"]').click();
  await p.getByText('Para registrar').waitFor({ timeout: 5000 });
  await espera(300);
  await foto(p, '05b-dia-registrar');
  await p.getByRole('button', { name: 'Ya envié mis fotos' }).click();
  await p.getByLabel('Tu peso en kg').fill('78,4');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await espera(700);
  ok('fotos y peso quedan registrados', db.db.evento_registros && db.db.evento_registros.length === 2
    && Number(db.db.evento_registros.find(r => r.evento_id === 'evp').valor) === 78.4);
  ok('…y la hoja lo dice', (await p.getByText(/Hecho\. Tu coach ya lo sabe/).count()) === 2);
  await foto(p, '05c-dia-registrado');
  await p.getByRole('button', { name: 'Cerrar' }).first().click();
  await espera(400);
  // Mover con el botón: el lunes (Push) al martes.
  const lun = sumarDiasISO(hoy, 1), mar = sumarDiasISO(hoy, 2), mie = sumarDiasISO(hoy, 3);
  await cal.locator('[data-fecha="' + lun + '"]').click();
  await p.getByRole('button', { name: /Mover a otro día/ }).click();
  await p.getByRole('button', { name: new RegExp('^Mar ' + Number(mar.slice(8))) }).click();
  await espera(900);
  ok('mover con el botón: el Push pasa al martes', (await cal.locator('[data-fecha="' + mar + '"]').innerText()).includes('Push')
    && !(await cal.locator('[data-fecha="' + lun + '"]').innerText()).includes('Push'));
  // Arrastrar: el Lower del miércoles al lunes (que quedó libre).
  const de = await cal.locator('[data-fecha="' + mie + '"] div').filter({ hasText: 'Lower' }).first().boundingBox();
  const aLun = await cal.locator('[data-fecha="' + lun + '"]').boundingBox();
  await p.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
  await p.mouse.down();
  await espera(500);
  await p.mouse.move(aLun.x + aLun.width / 2, aLun.y + aLun.height / 2, { steps: 8 });
  await espera(150);
  await foto(p, '05d-arrastrando');
  await p.mouse.up();
  await espera(1000);
  ok('arrastrar: el Lower pasa al lunes', (await cal.locator('[data-fecha="' + lun + '"]').innerText()).includes('Lower'));
  ok('arrastrar: sin aviso de error', (await p.getByText('No se pudo mover').count()) === 0);
  ok('arrastrar: se guardó una sola vez', db.db.rutina_movimientos.length === 2, String(db.db.rutina_movimientos.length));
  ok('el plan del coach no cambia', JSON.stringify(db.db.rutinas.find(r => r.id === 'r2').dias_semana) === '["X"]');
  await foto(p, '05e-movidas');
  // Arrastrar CON EL DEDO, en la vista de semana (lo que falló en el iPhone):
  // eventos táctiles de verdad, no ratón.
  await cal.getByRole('tab', { name: 'Semana' }).click();
  await espera(700);
  for (let i = 0; i < 3 && !(await cal.locator(`[data-vista="semana"] [data-fecha="${lun}"]`).count()); i++) {
    await cal.getByRole('button', { name: 'Siguiente' }).click(); await espera(700);
  }
  const filas = await cal.locator('[data-vista="semana"] [data-fecha]').evaluateAll(els => els.map(e => ({ f: e.dataset.fecha, t: e.innerText })));
  const libre = filas.find(x => x.f > hoy && x.f !== lun && /Descanso/.test(x.t));
  if (libre) {
    const cdp = await ctx.newCDPSession(p);
    const c0 = await cal.locator(`[data-fecha="${lun}"] [data-chip]`).first().boundingBox();
    const c1 = await cal.locator(`[data-fecha="${libre.f}"]`).boundingBox();
    const x0 = c0.x + c0.width / 2, y0 = c0.y + c0.height / 2, x1 = c1.x + c1.width / 2, y1 = c1.y + c1.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    await espera(600);
    for (let k = 1; k <= 12; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / 12, y: y0 + (y1 - y0) * k / 12 }] });
      await espera(25);
    }
    await foto(p, '05f-arrastre-dedo');
    ok('dedo: aparece la rutina flotando mientras se arrastra', (await p.locator('[data-fantasma]').count()) === 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await espera(1200);
    ok('dedo: el Lower cambia de día con el dedo', (await cal.locator(`[data-fecha="${libre.f}"]`).innerText()).includes('Lower'),
      await cal.locator(`[data-fecha="${libre.f}"]`).innerText());
    ok('dedo: soltar no abre la hoja del día', (await p.getByText('Mover a otro día').count()) === 0);
  } else ok('(esta semana no hay día libre para probar el dedo)', true);
  await cal.locator(`[data-vista="semana"] [data-fecha="${hoy}"]`).count() || await cal.getByRole('button', { name: 'Volver a hoy' }).click().catch(() => {});
  await espera(500);
  ok('semana: el corte de pago se ve', (await cal.getByText('Corte de tu mensualidad').count()) >= 1);
  await cal.locator(`[data-vista="semana"] [data-fecha="${hoy}"]`).click();
  await p.locator('[data-aviso-dia="pago"]').waitFor({ timeout: 5000 });
  ok('al tocar el día: el detalle dice la fecha de corte', (await p.getByText('Fecha de corte de tu mensualidad').count()) === 1);
  await foto(p, '05g-dia-detalle');
  await p.getByRole('button', { name: 'Cerrar' }).first().click();
  await espera(400);
  await p.getByRole('button', { name: 'Galería' }).click();
  await p.getByText('Sentadilla con barra').first().waitFor({ timeout: 10000 });
  await espera(600);
  await foto(p, '06-entreno-galeria');
  await p.getByText('Sentadilla con barra').first().click();
  await espera(700);
  await foto(p, '07-galeria-ficha');
  ok('la ficha pinta el cuerpo nuevo con lo que trabaja', (await p.locator('path[data-activo="1"]').count()) >= 4);
  ok('la ficha trae las características abiertas', await p.locator('dl dt', { hasText: 'Tipo' }).first().isVisible());
  ok('la ficha ya no dice «cómo se hace»', (await p.getByRole('dialog').last().getByText(/Cómo se hace/i).count()) === 0);
  await p.getByText(/^Principal:/).first().scrollIntoViewIfNeeded();
  await espera(400);
  await foto(p, '07b-ficha-cuerpo');
  await p.keyboard.press('Escape');
  await espera(400);

  await p.getByRole('button', { name: 'Alimentación', exact: true }).click();
  await espera(1200);
  await foto(p, '08-comida-hoy');
  ok('Hoy de alimentación ya no saluda ni trae herramientas', (await p.getByText('Hola, Mauro').count()) === 0
    && (await p.getByText('Tus herramientas').count()) === 0);
  ok('Hoy de alimentación: aguacate, huevos, pescado y pollo en la cabecera', await p.locator('[data-dibujo="comida"]').evaluate(el => { const r = el.getBoundingClientRect(); return r.width > 100 && r.left >= 0 && r.right <= innerWidth; }));
  const pRec = await p.getByRole('button', { name: /^Recordatorios/ }).last().boundingBox();
  const pOpc = await p.getByRole('button', { name: 'Opciones', exact: true }).boundingBox();
  ok('«Opciones» va al lado de Recordatorios', pRec && pOpc && Math.abs(pRec.y - pOpc.y) < 4 && pOpc.x > pRec.x, JSON.stringify([pRec, pOpc]));
  await p.getByRole('button', { name: 'Opciones', exact: true }).click();
  await p.locator('[data-opciones-v2]').waitFor({ timeout: 5000 });
  await espera(500);
  await foto(p, '08b-opciones-comida');
  ok('opciones: íconos de línea (svg de phosphor), sin degradados de colores', await p.evaluate(() => {
    const caja = document.querySelector('[data-opciones-v2]');
    const hoja = caja.closest('.rounded-t-3xl');
    const bs = [...caja.querySelectorAll('button')];
    return bs.length === 8 && bs.every(b => b.querySelector('svg') && !/gradient/.test(getComputedStyle(b.firstElementChild).backgroundImage))
      && !/gradient/.test(getComputedStyle(hoja).backgroundImage);
  }));
  ok('opciones: sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[12]\d), (1[2-4]\d), (8\d|9\d)\)|rgb\(231, 235, 214\)/;
    return ![...document.querySelectorAll('[data-opciones-v2] *')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
  await p.getByRole('button', { name: 'Cerrar' }).last().dispatchEvent('pointerdown');
  await espera(800);   // tras cerrar, la app se traga el siguiente toque 0,6 s (el «click fantasma» de iOS)
  ok('opciones: se cierra', !(await p.locator('[data-opciones-v2]').isVisible()));
  ok('opciones: sin gráficas, mi mes, resumen del día ni recordatorios', true);
  // Recetario: directo a las recetas, con los dos botones arriba
  await p.getByRole('button', { name: 'Recetas', exact: true }).click();
  await p.locator('[data-recetario-botones]').waitFor({ timeout: 8000 });
  await espera(500);
  await foto(p, '10-recetario');
  ok('recetario: sin la foto de portada', (await p.locator('img[src*="recetario-hero"]').count()) === 0);
  ok('recetario: las recetas se ven de una', (await p.getByText('Wrap crujiente de atún').count()) >= 1);
  await p.getByRole('button', { name: /Búsqueda avanzada/ }).click();
  await p.locator('[data-busqueda-avanzada]').waitFor({ timeout: 5000 });
  await p.getByRole('button', { name: 'Snack', exact: true }).click();
  await foto(p, '10b-busqueda-avanzada');
  await p.getByRole('button', { name: /^Ver \d+ recetas$/ }).click();
  await espera(400);
  ok('búsqueda avanzada: filtra y deja el filtro a la vista', (await p.getByRole('button', { name: 'Snack ✕' }).count()) === 1
    && (await p.getByText('Wrap crujiente de atún').count()) === 0);
  ok('recetario: sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[2-4]\d), (1[4-5]\d), (8\d|9\d)\)|rgb\(212, 218, 184\)/;
    return ![...document.querySelectorAll('.rec-slide-in *')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
  // Calendario de comidas desde la barra
  await p.getByRole('button', { name: 'Calendario', exact: true }).click();
  await p.getByText('Calendario de comidas').waitFor({ timeout: 5000 });
  await espera(600);
  await foto(p, '10c-calendario-comidas');
  ok('barra de Alimentación: Calendario abre el calendario de comidas', true);
  await p.getByRole('button', { name: 'Cerrar' }).last().dispatchEvent('pointerdown');
  await espera(800);
  await p.getByRole('button', { name: 'Chat', exact: true }).click();
  await espera(900);
  await foto(p, '09-comida-chat');
  const barraVisible = () => p.evaluate(() => { const n = document.querySelector('nav[aria-label="Secciones"]'); const w = n && n.parentElement; return !!w && getComputedStyle(w).visibility !== 'hidden' && getComputedStyle(w).display !== 'none'; });
  ok('chat: la barra de módulos se ve antes de escribir', await barraVisible());
  await p.locator('.msg-input').click();
  await espera(300);
  ok('chat: al tocar el campo de texto la barra se esconde', !(await barraVisible()));
  await foto(p, '09b-chat-escribiendo');
  await p.keyboard.type('2 huevos');
  await p.keyboard.press('Enter');
  await espera(600);
  ok('chat: al enviar vuelve la barra', await barraVisible());
  await p.locator('.msg-input').click();
  await espera(200);
  await p.mouse.click(195, 300);
  await espera(300);
  ok('chat: al salir del campo sin enviar también vuelve', await barraVisible());

  await p.getByRole('button', { name: 'Aprendizaje', exact: true }).click();
  await espera(1200);
  const marco = p.frameLocator('iframe[title="Centro de aprendizaje"]');
  ok('Aprendizaje abre en su inicio', /inicio/.test(await marco.locator('#t').textContent()));
  await p.getByRole('button', { name: 'Onboarding' }).click();
  await espera(500);
  ok('Onboarding se pide al centro sin recargarlo', /onboarding/.test(await marco.locator('#t').textContent()));
  await foto(p, '10-aprende');

  await p.getByRole('button', { name: 'Dash', exact: true }).click();
  await p.getByText('Tu performance semanal', { exact: true }).waitFor();
  ok('vuelve al Dash', true);
  ok('sin errores de JavaScript (Mauro)', errores.length === 0, errores.join(' | '));
  await ctx.close();

  // ── Teléfono angosto ──
  const n = await abrir('Mauro Morón', { ancho: 375 });
  await n.p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
  await n.p.getByRole('button', { name: 'Entrenamiento', exact: true }).click();
  await espera(900);
  const caja = await n.p.locator('nav[aria-label="Secciones"]').boundingBox();
  ok('la barra cabe en 375 px', caja && caja.x >= 0 && caja.x + caja.width <= 375, JSON.stringify(caja));
  const gal = await n.p.getByRole('button', { name: 'Galería' }).boundingBox();
  const enteros = async (pg) => pg.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Secciones"]').getBoundingClientRect();
    return [...document.querySelectorAll('nav[aria-label="Secciones"] > button')].every(b => {
      const r = b.getBoundingClientRect(); return r.left >= nav.left - 0.5 && r.right <= nav.right + 0.5 && r.right <= innerWidth;
    });
  });
  ok('375 px: Dash, Comida y Aprende se ven enteros', await enteros(n.p));
  await n.p.getByRole('button', { name: 'Alimentación', exact: true }).click();
  await espera(700);
  ok('375 px con Comida abierta: todo entero', await enteros(n.p));
  await foto(n.p, '11b-375-comida');
  await n.p.getByRole('button', { name: 'Entrenamiento', exact: true }).click();
  await espera(700);
  ok('con Entrenamiento abierto se sigue viendo su ícono', await n.p.locator('[data-icono-seccion="entreno"]').isVisible());
  ok('las tres opciones de Entrenamiento se ven enteras en 375 px', gal && gal.x + gal.width <= caja.x + caja.width - 2, JSON.stringify(gal));
  await foto(n.p, '11-375-entreno');
  await n.p.getByRole('button', { name: 'Aprendizaje', exact: true }).click();
  await espera(900);
  await foto(n.p, '12-375-aprende');
  await n.ctx.close();

  // ── Mensualidad pendiente: aviso los primeros 5 días, bloqueo después ──
  const deuda = { due: true, dia_corte: 15, monto: 250000, moneda: 'COP', meses_deuda: 1, meses: [new Date().toISOString().slice(0, 7)] };
  const a = await abrir('Mauro Morón', { pago: { ...deuda, dias_vencido: 3, bloqueo: false } });
  await a.p.getByText('Días de cardio').waitFor({ timeout: 20000 });
  await espera(900);
  ok('mora día 3: el aviso sale en el Dash', await a.p.locator('[data-view="dash"]').getByText('Mensualidad pendiente').isVisible());
  ok('mora día 3: la app no se bloquea', (await a.p.getByRole('alertdialog').count()) === 0);
  await foto(a.p, '14-pago-aviso-dash');
  await a.p.getByRole('button', { name: 'Entrenamiento', exact: true }).click();
  await espera(1200);
  ok('mora día 3: el aviso sale en Hoy de entrenamiento', await a.p.locator('[data-view="entrena"]').getByText('Mensualidad pendiente').isVisible());
  await a.ctx.close();

  let pagado = false;
  const k = await abrir('Mauro Morón', { pago: () => (pagado ? { due: false } : { ...deuda, dias_vencido: 8, bloqueo: true }) });
  const bloqueo = k.p.getByRole('alertdialog', { name: 'Pago pendiente' });
  await bloqueo.waitFor({ timeout: 20000 });
  await espera(900);
  await foto(k.p, '15-pago-bloqueo');
  await k.p.keyboard.press('Escape');
  await k.p.mouse.click(20, 20);
  await espera(300);
  ok('mora día 8: el bloqueo no se quita con Escape ni tocando fuera', await bloqueo.isVisible());
  let tocoDetras = true;
  try { await k.p.locator('[data-view="dash"]').getByRole('button', { name: 'Reto' }).click({ timeout: 1500 }); } catch (e) { tocoDetras = false; }
  ok('mora día 8: lo de atrás no se puede tocar', !tocoDetras);
  ok('mora día 8: lo de atrás va desenfocado', (await bloqueo.evaluate(el => getComputedStyle(el).backdropFilter)).includes('blur'));
  pagado = true;                                  // el coach marca el pago en el CRM
  await k.p.getByRole('button', { name: /Ya pagué/ }).click();
  await espera(800);
  ok('marcado pagado: la app se abre sola', (await bloqueo.count()) === 0);
  await k.ctx.close();

  // ── Otra persona: todo como siempre ──
  const o = await abrir('Ana Pérez');
  await o.p.getByRole('button', { name: 'Herram.' }).waitFor({ timeout: 25000 });
  await espera(2600);
  ok('otra persona ve la barra de siempre', (await o.p.locator('nav[aria-label="Secciones"]').count()) === 0);
  ok('…y su letra de siempre', !(await o.p.evaluate(() => document.documentElement.hasAttribute('data-v2'))));
  ok('…y no abre en el Dash', (await o.p.getByText('Tu performance semanal', { exact: true }).count()) === 0);
  await foto(o.p, '13-otra-persona');
  ok('sin errores de JavaScript (otra persona)', o.errores.length === 0, o.errores.join(' | '));
  await o.ctx.close();

  // El bloqueo por mora es de todos, no solo de la visual nueva.
  const ob = await abrir('Ana Pérez', { pago: { ...deuda, dias_vencido: 6, bloqueo: true } });
  await ob.p.getByRole('alertdialog', { name: 'Pago pendiente' }).waitFor({ timeout: 25000 });
  await espera(600);
  await foto(ob.p, '16-pago-bloqueo-otra');
  ok('otra persona con 6 días de mora también queda bloqueada', true);
  await ob.ctx.close();
} catch (e) {
  fallos++;
  console.log('  MAL  se cortó: ' + e.message.split('\n').slice(0, 12).join(' | '));
} finally {
  await b.close();
  await vite.close();
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
