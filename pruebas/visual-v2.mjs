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
        { id: 're-e10', rutina_id: 'r1', ejercicio_id: 'e10', orden: 6, series: 1, reps: '30 s', descanso_seg: null },
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
      ].map(([id, nombre, mus, tipo], i) => ({ id, nombre, tipo: tipo || 'fuerza', musculos_primarios: mus, video_fuente: 'youtube', video_ref: yt[i % yt.length],
        alias: { e1: 'Barbell Bench Press', e2: 'Barbell Back Squat', e3: 'Dumbbell Single Arm Row', e4: 'Dumbbell Lateral Raise', e5: 'Bench Single Leg Hip Thrust', e6: 'Wide Grip Lat Pulldown',
          e7: 'Running', e8: 'SuperBand Dislocates', e9: 'Table Top Half Arm Thoracic Rotation', e10: "Child's Pose" }[id],
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
  await p.route('https://centro.test/**', r => r.fulfill({ status: 200, contentType: 'text/html',
    body: `<body style="margin:0;font:600 20px sans-serif;background:#F4F1EA;color:#333;display:grid;place-items:center;height:100vh"><div id=t>Centro · ${'${location.search}'}</div><script>document.getElementById('t').textContent='Centro de aprendizaje · '+(new URLSearchParams(location.search).get('mt_go')||'inicio');addEventListener('message',e=>{if(e.data&&e.data.tipo==='em-ir')document.getElementById('t').textContent='Centro de aprendizaje · '+e.data.a})</script></body>` }));
  await p.goto('http://localhost:5198/');
  return { p, ctx, errores, db };
}
const foto = (p, nombre) => p.screenshot({ path: path.join(CAPTURAS, nombre + '.png') });

try {
  // ── Mauro ──
  const { p, ctx, errores, db } = await abrir('Mauro Morón');
  await p.getByText('Tu constancia').waitFor({ timeout: 25000 });
  ok('apertura fría: cae en el Dash', true);
  await p.getByText('Últimas 8 semanas').waitFor({ timeout: 10000 });
  await espera(800);
  ok('el saludo está en el Dash', (await p.getByText('Hola, Mauro').count()) === 1);
  const dash = p.locator('[data-view="dash"]');
  ok('atajos de recordatorios y reto', (await dash.getByRole('button', { name: /Recordatorios/ }).count()) === 1
    && (await dash.getByRole('button', { name: 'Reto' }).count()) === 1);
  await dash.getByRole('button', { name: 'Reto' }).click();
  const wa = await dash.getByRole('link', { name: /Escríbele a tu coach/ }).getAttribute('href');
  ok('los tres atajos se ven enteros', await dash.evaluate(() => [...document.querySelectorAll('[data-view="dash"] a, [data-view="dash"] button')]
    .filter(b => /Recordatorios|Reto|Escríbele/.test(b.textContent)).every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
  ok('WhatsApp: el botón abre tu chat', /^https:\/\/wa\.me\/573008527043\?text=Hola%20coach/.test(wa || ''), wa);
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
  await espera(900);
  await foto(p, '03d-calendario-comidas');
  ok('el calendario de comidas se abre desde el Dash', (await p.getByText(/Mes|Semana/).count()) > 0);
  await p.keyboard.press('Escape');
  await p.goto('http://localhost:5198/');
  await p.getByText('Tu constancia').waitFor({ timeout: 25000 });

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
  // La rutina por dentro
  await p.getByRole('button', { name: /Push/ }).first().click();
  await p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 });
  ok('la rutina se parte en calentamiento, fuerza y enfriamiento',
    (await p.locator('[data-view="entrena"]').getByText('Fuerza', { exact: true }).count()) === 1 && (await p.locator('[data-view="entrena"]').getByText('Enfriamiento', { exact: true }).count()) === 1,
    `${await p.locator('[data-view="entrena"]').getByText('Fuerza', { exact: true }).count()} / ${await p.locator('[data-view="entrena"]').getByText('Enfriamiento', { exact: true }).count()} / ${await p.getByText('Enfriamiento').count()}`);
  ok('el calentamiento no pide kilos', (await p.getByText('SuperBand Dislocates').first().locator('xpath=ancestor::div[3]').locator('input').count()) === 0);
  ok('las reps van vacías con el rango de sugerencia', (await p.getByLabel('Repeticiones serie 1').first().getAttribute('placeholder')) === '6-12'
    && (await p.getByLabel('Repeticiones serie 1').first().inputValue()) === '');
  ok('la última vez se lee en claro', (await p.getByText(/Última vez/).count()) > 0);
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
  ok('el calentamiento se marca con un toque y se pliega', (await p.getByText('1/5', { exact: true }).count()) === 1);
  // Tu récord abre su hoja y el scroll no se va a la rutina de atrás
  await p.getByRole('button', { name: /Tu récord/ }).first().click();
  await p.getByText(/Tu récord ·/).waitFor({ timeout: 5000 });
  const antesSc = await scRut();
  await p.mouse.move(195, 700); await p.mouse.wheel(0, 600); await espera(300);
  ok('con la hoja abierta la rutina de atrás no se mueve', (await scRut()) === antesSc, `${antesSc} → ${await scRut()}`);
  await foto(p, '04d-tu-record');
  await p.keyboard.press('Escape');
  await espera(300);
  await p.getByRole('button', { name: 'Hoy', exact: true }).first().click();
  await espera(800);
  await p.getByRole('button', { name: 'Calendario' }).click();
  await espera(1500);
  await foto(p, '05-entreno-calendario');
  const cal = p.locator('[data-view="entrena"]');
  ok('calendario: «Lo que viene» con el nombre entero', await cal.getByText('Lower Body + Core Training').last().isVisible());
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
  await p.locator('text=Qué trabaja').scrollIntoViewIfNeeded();
  await espera(400);
  await foto(p, '07b-ficha-cuerpo');
  await p.keyboard.press('Escape');
  await p.mouse.click(20, 80);
  await espera(400);

  await p.getByRole('button', { name: 'Alimentación', exact: true }).click();
  await espera(1200);
  await foto(p, '08-comida-hoy');
  ok('Hoy de alimentación ya no saluda ni trae herramientas', (await p.getByText('Hola, Mauro').count()) === 0
    && (await p.getByText('Tus herramientas').count()) === 0);
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
  await p.getByText('Tu constancia').waitFor();
  ok('vuelve al Dash', true);
  ok('sin errores de JavaScript (Mauro)', errores.length === 0, errores.join(' | '));
  await ctx.close();

  // ── Teléfono angosto ──
  const n = await abrir('Mauro Morón', { ancho: 375 });
  await n.p.getByText('Tu constancia').waitFor({ timeout: 25000 });
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
  await a.p.getByText('Últimas 8 semanas').waitFor({ timeout: 20000 });
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
  ok('…y no abre en el Dash', (await o.p.getByText('Tu constancia').count()) === 0);
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
  console.log('  MAL  se cortó: ' + e.message.split('\n')[0]);
} finally {
  await b.close();
  await vite.close();
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
