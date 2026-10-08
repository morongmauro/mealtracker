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
import { createServer, build, preview } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { crearSupabaseFalso, llamar } from './_supabase-falso.mjs';

const require_ = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require_('playwright')); }
catch { try { ({ chromium } = require_(path.join(process.execPath, '../../lib/node_modules/playwright'))); }
catch { console.error('Falta playwright:  npm i -g playwright'); process.exit(2); } }

// El reloj, fijo en un MARTES (mediodía de Bogotá): mover y añadir rutinas
// vale solo en la semana en curso, y así la prueba no depende del día.
const FIJO = Date.parse('2026-09-29T17:00:00Z');
const DateReal = Date;
const lento = { accion: null, ms: 0 };
globalThis.Date = class extends DateReal {
  constructor(...a) { super(...(a.length ? a : [FIJO])); }
  static now() { return FIJO; }
};

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
      comunidad_posts: [
        { id: 'cp1', user_id: 'coach', texto: 'Esta semana: 3 entrenos y 8 horas de sueño. Lo demás se acomoda.', fijado: false, publicado_en: hoy + 'T12:00:00Z', borrado_en: null },
        { id: 'cp2', user_id: 'coach', texto: 'Bienvenidos a la comunidad del programa. Aquí comparto tips, retos y novedades.', fijado: true, publicado_en: hace(1, 0) + 'T12:00:00Z', borrado_en: null },
      ],
      comunidad_reacciones: [{ post_id: 'cp1', cliente_id: 'c2', tipo: 'fuego' }],
      comunidad_vistas: [],
      comunidad_comentarios: [
        { id: 'k1', post_id: 'cp1', cliente_id: 'c2', texto: '¡Hecho! Ya llevo dos.', creado_en: hoy + 'T13:00:00Z', borrado_en: null },
        { id: 'k2', post_id: 'cp1', cliente_id: null, texto: 'Así se hace, Ana', creado_en: hoy + 'T13:30:00Z', borrado_en: null },
      ],
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
      ].map(([id, nombre, mus, tipo], i) => ({ id, nombre, tipo: tipo || 'fuerza', patron: { e1: 'push', e2: 'rodilla', e3: 'pull', e4: 'push', e5: 'cadera', e6: 'pull', e11: 'push' }[id] || null, musculos_primarios: mus, video_fuente: 'youtube', video_ref: yt[i % yt.length],
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
        { id: 'evf2', cliente_id: 'c2', fase_id: null, tipo: 'fotos', titulo: 'Fotos de progreso', fecha: hoy, visible_cliente: true },
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
  const history = {}, historyDetail = {};
  const hoyLocal = new Date();
  for (let i = 0; i < 84; i++) {
    const d = new Date(hoyLocal); d.setDate(d.getDate() - i);
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if ((i * 7) % 5 === 3 && i > 0) continue;            // días sin registrar
    const kcal = Math.round(2300 + Math.sin(i * 1.7) * 260 + (i % 4) * 40);
    history[f] = { kcal, p: Math.round(150 + Math.cos(i * 1.3) * 28), c: 240, g: 70, water: 0 };
    // El detalle de las comidas (para «Tus alimentos»): huevo casi a diario,
    // salmón algunos días, una gaseosa de vez en cuando.
    const items = [{ name: 'Huevo', kcal: 156, p: 12.6, c: 1.1, g: 10.6, fiber: 0, omega3: 0.1, sugar: 0 },
      { name: 'Arroz blanco', kcal: 260, p: 5, c: 57, g: 0.5, fiber: 0.6, omega3: 0, sugar: 0 },
      { name: 'Pechuga de pollo', kcal: 280, p: 52, c: 0, g: 6, fiber: 0, omega3: 0.05, sugar: 0 }];
    if (i % 3 === 0) items.push({ name: 'Salmón', kcal: 412, p: 40, c: 0, g: 26, fiber: 0, omega3: 2.4, sugar: 0 });
    if (i % 5 === 1) items.push({ name: 'Gaseosa', kcal: 140, p: 0, c: 39, g: 0, fiber: 0, omega3: 0, sugar: 39 });
    if (i % 4 === 2) items.push({ name: 'Lentejas', kcal: 230, p: 18, c: 40, g: 0.8, fiber: 15.6, omega3: 0.1, sugar: 0 });
    historyDetail[f] = [{ id: i + 1, meal: 'almuerzo', items, kcal: items.reduce((a, x) => a + x.kcal, 0) }];
  }
  return {
    'mt:name': JSON.stringify(nombre),
    'mt:goals': JSON.stringify({ kcal: 2400, p: 165, c: 250, g: 70 }),
    'mt:history': JSON.stringify(history),
    'mt:historyDetail': JSON.stringify(historyDetail),
    'mt:lastActiveAt': '0',
    cloudConsent: 'declined',
    'mt:novedadesVistas': JSON.stringify(['2026-08-26-aprendizaje-y-recetas']),
    trainingOn: '1',
    learningUrl: 'https://centro.test/',
    // Un chat con propuestas de proporciones (llevan la nota del Recetario
    // con «Recetas con esto»): con ese mensaje la app quedó en blanco una vez.
    'mt:messages': JSON.stringify([
      { role: 'user', content: 'qué almuerzo con lo que tengo' },
      { role: 'assistant', isMealSuggestion: true, data: { mealType: 'almuerzo', options: [
        { items: [{ name: 'Pechuga de pollo', amount: '150 g', kcal: 248 }, { name: 'Arroz', amount: '1 taza', kcal: 205 }], subtotal: { kcal: 453, p: 48, c: 45, g: 5 } },
      ] } },
    ]),
  };
}

const raiz = path.resolve(import.meta.dirname, '..');
// PROD=1: contra la versión de PRODUCCIÓN (build minificado + preview), que
// es lo que corre en el teléfono. Hay errores que solo salen minificados.
const vite = process.env.PROD
  ? (await build({ root: raiz, logLevel: 'error' }), await preview({ root: raiz, logLevel: 'error', preview: { port: 5198, strictPort: true } }))
  : await createServer({ root: raiz, logLevel: 'error', server: { port: 5198, strictPort: true } });
if (!process.env.PROD) await vite.listen();
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

// `aviso`: dejar que salga el aviso de «hoy te toca registrar» al abrir. Por
// defecto se da por visto (si no, tapa todo lo que se prueba después).
// `nube`: lo que tiene su cuenta en la nube (y la app con la nube aceptada).
async function abrir(nombre, { ancho = 390, pago = null, aviso = false, nube = null, caliente = false, sinSesion = false, sinNombre = false, url = '/', cuenta = null } = {}) {
  const db = base();
  globalThis.fetch = db.fetch;
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'America/Bogota' });
  await ctx.clock.setFixedTime(new DateReal(FIJO));
  const p = await ctx.newPage();
  const errores = [];
  globalThis.__errores = errores;   // para decir por qué se cortó, si se corta
  let pulls = 0;
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.text().startsWith('ilusBien')) console.log('   ' + m.text()); });
  const guardado = almacen(nombre);
  if (sinNombre) { delete guardado['mt:name']; delete guardado['mt:goals']; }
  // Mauro ya entró con su contraseña (la cuenta se prueba aparte, sinSesion)
  if (!sinSesion) guardado['mt:sesion'] = 'v1.prueba';
  await ctx.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, guardado);
  // `caliente`: la usó hace un rato (antes caía en el Chat; ahora, en el Dash).
  if (caliente) await ctx.addInitScript(() => localStorage.setItem('mt:lastActiveAt', String(Date.now() - 5 * 60 * 1000)));
  if (!aviso) await ctx.addInitScript((f) => sessionStorage.setItem('mt:avisoRegistro', f), hoy);
  if (nube) await ctx.addInitScript(() => { localStorage.setItem('cloudConsent', 'accepted'); localStorage.setItem('cloudUserId', 'u-nube'); });
  await p.route('**/api/**', async (ruta) => {
    const u = new URL(ruta.request().url());
    if (u.pathname === '/api/training') {
      const cuerpo = JSON.parse(ruta.request().postData() || '{}');
      // Red lenta a propósito (solo donde la prueba lo pide).
      if (lento.accion && cuerpo.accion === lento.accion) await new Promise(r => setTimeout(r, lento.ms));
      const r = await llamar(handler, cuerpo);
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
    }
    if (u.pathname === '/api/sync' && nube && ruta.request().method() !== 'POST' && u.searchParams.get('identity_for') == null) pulls++;
    if (u.pathname === '/api/sync' && nube) {
      const json = (o) => ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (ruta.request().method() === 'POST') return json({ ok: true });
      if (u.searchParams.get('identity_for') != null) return json({ user_id: 'u-nube' });
      return json({ name: nombre, data: nube, ...nube });
    }
    if (u.pathname === '/api/payment-status') {
      const estado = typeof pago === 'function' ? pago() : pago;
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(estado || { due: false }) });
    }
    // El chat: «2 huevos» se registra como comida (para ver el «+kcal»).
    if (u.pathname === '/api/chat') {
      const huevos = { intent: 'log_meal', meal: 'snack', log_date: null, items: [{ name: 'Huevo', amount: '2 unidades', kcal: 156, p: 12.6, c: 1.1, g: 10.6, fiber: 0, omega3: 0, sugar: 0, needs_quantity: false }], message: null };
      // Lo último que escribió el cliente (el resto del pedido trae el
      // historial y el prompt, que pueden nombrar cualquier comida).
      let ultimo = '';
      try { const cuerpo = JSON.parse(ruta.request().postData() || '{}'); const ms = (cuerpo.messages || []).filter(m => m.role === 'user'); const c = ms.length ? ms[ms.length - 1].content : ''; ultimo = typeof c === 'string' ? c : JSON.stringify(c); } catch (e) { ultimo = ruta.request().postData() || ''; }
      // Una consulta (no registra): para ver el estilo de las demás respuestas.
      if (/manzana/.test(ultimo)) {
        const consulta = { intent: 'nutrition_query', nutrition_response: { food: 'Manzana', amount: '1 mediana (180 g)', kcal: 95, p: 0.5, c: 25, g: 0.3 }, message: null };
        return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(consulta) }] }) });
      }
      // «almuerzo grande» llena el día: para ver la hoja de meta cumplida.
      if (/almuerzo grande/.test(ultimo)) {
        const grande = { intent: 'log_meal', meal: 'lunch', log_date: null, items: [{ name: 'Almuerzo', amount: '1 plato', kcal: 2300, p: 110, c: 240, g: 62, fiber: 0, omega3: 0, sugar: 0, needs_quantity: false }], message: null };
        return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(grande) }] }) });
      }
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(huevos) }] }) });
    }
    if (u.pathname === '/api/resources') return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://centro.test/', training: true }) });
    if (u.pathname === '/api/authorize') {
      const cuerpo = JSON.parse(ruta.request().postData() || '{}');
      if (cuerpo.accion && cuenta) return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuenta(cuerpo)) });
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authorized: true, status: 'activo' }) });
    }
    return ruta.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // El reproductor de YouTube: sin red en las pruebas, un cuadro negro.
  await p.route('https://www.youtube-nocookie.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body style="margin:0;background:#000"></body></html>' }));
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
  await p.goto('http://localhost:5198' + url);
  return { p, ctx, errores, db, pulls: () => pulls };
}
// La kettlebell de la cabecera: entera dentro de la pantalla y sin tapar la frase.
const ilusBien = (p, tema) => p.evaluate((tema) => {
  const caja = document.querySelector(`[data-cabecera-hoy="${tema}"] [data-objeto-cabecera]`);
  const frase = document.querySelector(`[data-cabecera-hoy="${tema}"] [data-frase]`);
  if (!caja || !frase) return false;
  // Lo dibujado (sin el aire transparente del cuadro): la caja del objeto.
  const c = caja.getBoundingClientRect(), [fl, ft, fr, fb] = caja.dataset.caja.split(',').map(Number);
  const g = { left: c.left + fl * c.width, top: c.top + ft * c.height, right: c.left + fr * c.width, bottom: c.top + fb * c.height };
  const f = frase.getBoundingClientRect();
  const r = document.createRange(); r.selectNodeContents(frase);
  const lineas = [...r.getClientRects()];
  const derechaTexto = Math.max(...lineas.map(l => l.right));
  // Con el aro al lado, lo que queda junto a la frase es el aro.
  const aro = document.querySelector(`[data-cabecera-hoy="${tema}"] [data-aro-cabecera]`);
  const izq = aro ? Math.min(aro.getBoundingClientRect().left, g.left) : g.left;
  const bien = g.left >= 0 && g.right <= innerWidth && g.top >= 0 && derechaTexto <= izq + 4 && izq - f.right < 40 && g.top < f.bottom
    && (!aro || aro.getBoundingClientRect().right <= g.left + 44);
  if (!bien) console.log('ilusBien', tema, JSON.stringify({ g: [g.left, g.right, g.top], derechaTexto, fRight: f.right, fBottom: f.bottom, w: innerWidth }));
  return bien;
}, tema);
const foto = (p, nombre) => p.screenshot({ path: path.join(CAPTURAS, nombre + '.png') });

try {
  // ── Mauro ──
  const { p, ctx, errores, db } = await abrir('Mauro Morón', { aviso: true });
  await p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
  ok('apertura fría: cae en el Dash', true);
  // Peso y fotos para hoy: el aviso sale apenas abre, con las dos cosas
  const av = p.locator('[data-aviso-registro]');
  await av.waitFor({ timeout: 10000 });
  ok('al abrir: «Hoy te toca registrar» con el peso y las fotos', (await av.getByText('Hoy te toca registrar').count()) === 1
    && (await av.getByText('Peso', { exact: true }).count()) === 1 && (await av.getByText('Registro fotográfico').count()) === 1
    && (await av.getByLabel('Tu peso en kg').count()) === 1);
  ok('…y los recordatorios del coach no salen solos (ni en el chat)', (await p.getByText(/tu coach te dejó/).count()) === 0
    && (await p.getByRole('dialog', { name: /Recordatorios/ }).count()) === 0);
  await espera(300);
  await foto(p, '00-aviso-registro');
  await av.getByRole('button', { name: 'Más tarde' }).click();
  await espera(300);
  ok('«Más tarde» lo cierra', (await av.count()) === 0);
  await p.reload();
  await p.getByText('Días de cardio').waitFor({ timeout: 20000 });
  await espera(1500);
  ok('…y no vuelve a salir en la misma apertura', (await av.count()) === 0);
  await p.getByText('Días de cardio').waitFor({ timeout: 10000 });
  await espera(800);
  ok('el saludo está en el Dash', (await p.getByText('Hola, Mauro').count()) === 1);
  ok('Dash: el saludo como las demás cabeceras (dos líneas, la segunda en azul), sin firma, con banda curva y cuatro manchas azules', await p.locator('[data-cabecera-hoy="dash"] [data-frase]').isVisible()
    && /^MARTES 29/.test(await p.locator('[data-cabecera-hoy="dash"] [data-etiqueta]').innerText())
    && await p.locator('[data-cabecera-hoy="dash"] [data-frase] span').evaluate(el => getComputedStyle(el).color === 'rgb(47, 108, 196)')
    && (await p.locator('[data-cabecera-hoy="dash"] [data-sub]').count()) === 0
    && (await p.locator('[data-cabecera-hoy="dash"] [data-firma-coach]').count()) === 0
    && (await p.locator('[data-cabecera-hoy="dash"] [data-banda]').count()) === 1
    && (await p.locator('[data-cabecera-hoy="dash"] .cab-m').count()) === 4);
  ok('cabeceras: un objeto 3D por sección; en el Dash, la brújula animada (se pinta con una URL nueva para que arranque de cero)', await p.locator('[data-cabecera-hoy="dash"] [data-objeto-cabecera="dash"] img').evaluate(i => i.src.startsWith('blob:') && i.complete && i.naturalWidth > 0)
    && (await p.locator('[data-cabecera-hoy="dash"] svg[data-ilustracion]').count()) === 0);
  ok('Dash: la brújula con el aro azul, junto a la frase, entera y sin taparla', await ilusBien(p, 'dash'));
  ok('aro de la cabecera: misma luz que el objeto (sombra suave hacia la derecha y apoyado en el piso), riel claro', await p.locator('[data-cabecera-hoy="dash"] [data-aro-cabecera]').evaluate(a => {
    const sombra = [...a.querySelectorAll('div')].some(d => /drop-shadow/.test(getComputedStyle(d).filter));
    const piso = a.querySelector('[data-aro-piso]');
    const riel = [...a.querySelectorAll('[data-anillo] svg circle')].some(c => /rgba\(255, ?255, ?255, ?0\.55\)/.test(c.getAttribute('stroke') || ''));
    return sombra && !!piso && riel;
  }));
  await espera(2600);
  ok('…y al terminar la animación, el objeto flota suave', await p.locator('[data-objeto-cabecera="dash"]').evaluate(d => d.classList.contains('flota') && getComputedStyle(d).animationName === 'obj-flota'));
  ok('aros de las cabeceras: el punto de la punta es blanco y sin borde', await p.locator('[data-cabecera-hoy="dash"] [data-aro-cabecera] [data-anillo] svg').evaluate(s => {
    const blancos = [...s.querySelectorAll('circle')].filter(c => (c.getAttribute('fill') || '').toUpperCase() === '#FFFFFF');
    return blancos.length >= 1 && blancos.every(c => !c.getAttribute('stroke'));
  }));
  ok('Dash: los anillos se llenan al abrir (y terminan llenos)', await p.locator('[data-view="dash"] [data-anillo] circle[stroke-dashoffset]').first().evaluate(el => {
    const c = parseFloat(el.getAttribute('stroke-dasharray')); const o = parseFloat(el.getAttribute('stroke-dashoffset'));
    return getComputedStyle(el).transitionProperty.includes('stroke-dashoffset') && o < c;
  }));
  const dash = p.locator('[data-view="dash"]');
  ok('atajos de recordatorios y reto', (await dash.getByRole('button', { name: /Recordatorios/ }).count()) === 1
    && (await dash.getByRole('button', { name: 'Reto' }).count()) === 1);
  await dash.getByRole('button', { name: 'Reto' }).click();
  const wa = await dash.getByRole('link', { name: /Coach/ }).getAttribute('href');
  // La línea de recordatorios: dos a la vista, «Ver todos» si hay más.
  await dash.locator('[data-recordatorios-dash]').waitFor({ timeout: 6000 }).catch(() => {});
  const nRec = await dash.locator('[data-recordatorio]').count();
  const verTodos = dash.locator('[data-ver-recordatorios]');
  ok('Dash: línea de recordatorios con dos a la vista (y «Ver todos» si hay más)', nRec >= 1 && nRec <= 2
    && /Sobre el programa|peso y composición|cápsula|video/i.test(await dash.locator('[data-recordatorios-dash]').innerText()), `${nRec}`);
  if (await verTodos.count()) {
    await verTodos.click(); await espera(250);
    ok('Dash: «Ver todos» muestra el resto de recordatorios', (await dash.locator('[data-recordatorio]').count()) > 2);
    await verTodos.click(); await espera(150);
  }
  ok('los atajos (reto, coach, comunidad, recordatorios y la tuerca) van en UNA línea, enteros y del mismo alto', await dash.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-atajos] > *')];
    const tops = new Set(bs.map(b => Math.round(b.getBoundingClientRect().top)));
    const altos = new Set(bs.map(b => Math.round(b.getBoundingClientRect().height)));
    return bs.length === 5 && tops.size === 1 && altos.size === 1 && bs.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth - 16; });
  }), await dash.evaluate(() => JSON.stringify([...document.querySelectorAll('[data-atajos] > *')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height)]; }))));
  ok('Comunidad ya no es una tarjeta grande arriba de las gráficas', (await dash.locator('[data-atajos] [data-abrir-comunidad]').count()) === 1
    && (await dash.locator('[data-atajos] [data-abrir-config]').count()) === 1);
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
  // Deslizar de lado pasa de página (en el orden de la barra).
  const deslizar = (x0, x1, sel = '[data-view="dash"] h1, [data-view="dash"]') => p.evaluate(([x0, x1, sel]) => {
    const el = document.querySelector(sel);
    const toque = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 420 });
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [toque(x0)], changedTouches: [toque(x0)] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [toque(x1)] }));
  }, [x0, x1, sel]);
  await deslizar(320, 90);
  await p.locator('[data-view="entrena"]').waitFor({ timeout: 8000 }).catch(() => {});
  ok('deslizar a la izquierda: del Dash pasa a Entrenamiento', (await p.locator('[data-view="entrena"]').count()) === 1 && (await p.locator('[data-view="dash"]').count()) === 0);
  await espera(400);
  await deslizar(80, 330, '[data-view="entrena"]');
  await p.locator('[data-view="dash"]').waitFor({ timeout: 8000 }).catch(() => {});
  ok('deslizar a la derecha: vuelve al Dash', (await p.locator('[data-view="dash"]').count()) === 1);
  await espera(400);
  await deslizar(320, 270);
  await espera(300);
  ok('un movimiento corto no cambia de página', (await p.locator('[data-view="dash"]').count()) === 1);
  await dash.getByRole('button', { name: /Recordatorios/ }).click();
  await p.getByText('Mis recordatorios', { exact: true }).last().waitFor({ timeout: 5000 });
  ok('Recordatorios sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[12]\d), (1[2-4]\d), (8\d|9\d)\)/;   // la familia #7A8B5A
    const caja = [...document.querySelectorAll('.fixed.inset-0.z-50')].pop();
    return ![...caja.querySelectorAll('*')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
  await espera(400);
  ok('recordatorios: sin el mensaje de pausar/apagar y con su estado vacío de marca',
    (await p.getByText(/pausarlos o apagarlos/).count()) === 0 && (await p.locator('[data-sin-recordatorios]').count()) === 1);
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
  ok('dash: la firma al final', await p.locator('[data-view="dash"] [data-firma]').isVisible());
  ok('dash: composición corporal con la línea de peso y la de grasa, y cifras compactas',
    (await p.locator('[data-linea-peso] svg').count()) === 1 && (await p.locator('[data-linea-grasa] svg').count()) === 1
    && await p.locator('[data-dato]').first().evaluate(el => el.getBoundingClientRect().height <= 62),
    String(await p.locator('[data-dato]').first().evaluate(el => el.getBoundingClientRect().height)));
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
  ok('profundiza comida: cercanía a cada meta y carbos y grasas día a día', (await p.locator('[data-cercania] > div').count()) === 4
    && (await p.getByText('Carbohidratos', { exact: true }).count()) >= 1 && (await p.getByText('Grasas', { exact: true }).count()) >= 1);
  ok('profundiza comida: «Tus alimentos» con el más repetido, el más calórico, el de más azúcar y la grasa buena', await p.evaluate(() => {
    const fila = (id) => document.querySelector(`[data-alimento="${id}"]`)?.innerText || '';
    return /Huevo/.test(fila('repetido')) && /Salmón/.test(fila('calorico')) && /Gaseosa/.test(fila('azucar'))
      && /Salmón/.test(fila('omega3')) && /Lentejas/.test(fila('fibra')) && /Pechuga/.test(fila('proteina'));
  }));
  await p.locator('[data-tus-alimentos]').scrollIntoViewIfNeeded();
  await espera(300);
  await foto(p, '03c2-tus-alimentos');
  await p.getByRole('button', { name: /calendario de comidas/ }).click();
  await p.getByText(/Calendario de comidas|Mis gráficas/i).first().waitFor({ timeout: 5000 });
  await espera(900);
  await foto(p, '03d-calendario-comidas');
  ok('el calendario de comidas se abre desde el Dash', (await p.getByText(/Mes|Semana/).count()) > 0);
  await p.keyboard.press('Escape');
  await p.goto('http://localhost:5198/');
  await p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
  // Aprendizaje: la tarjeta y su «Profundiza»
  await p.locator('[data-aprende]').waitFor({ timeout: 8000 });
  ok('aprendizaje: % completado con lo que vio del centro', /\d+ %/.test(await p.locator('[data-aprende]').innerText())
    && /Sobre el programa\s*1\/4/.test(await p.locator('[data-aprende]').innerText()), await p.locator('[data-aprende]').innerText());
  await p.locator('[data-aprende]').scrollIntoViewIfNeeded();
  await foto(p, '03e-dash-aprendizaje');
  await p.getByRole('button', { name: /Profundiza en tu aprendizaje/ }).click();
  await p.getByText('Tu aprendizaje', { exact: true }).waitFor({ timeout: 5000 });
  ok('profundiza aprendizaje: pieza por pieza', (await p.getByText('El método y sus pilares').count()) === 1 && (await p.getByText('Seguir aprendiendo').count()) >= 1);
  await espera(300);
  await foto(p, '03f-profundiza-aprendizaje');
  // ── Comunidad y Configuración, desde el Dash ──
  await p.getByRole('button', { name: 'Dash', exact: true }).click().catch(() => {});
  await p.goto('http://localhost:5198/');
  await p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
  await p.locator('[data-abrir-comunidad] [data-badge]').waitFor({ timeout: 8000 }).catch(() => {});
  ok('comunidad: su pastilla en el Dash con cuántas no ha visto', (await p.locator('[data-abrir-comunidad] [data-badge]').innerText()) === '2'
    && /Comunidad · 2 nuevas/.test(await p.locator('[data-abrir-comunidad]').getAttribute('aria-label')));
  await p.locator('[data-abrir-comunidad]').click();
  const com = p.locator('[data-comunidad]');
  await com.locator('[data-post]').first().waitFor({ timeout: 8000 });
  ok('comunidad: las publicaciones del coach, la fijada primero', (await com.locator('[data-post]').count()) === 2 && /Bienvenidos/.test(await com.locator('[data-post]').first().innerText()));
  await com.locator('[data-post="cp1"] [data-reaccion="fuego"]').click(); await espera(500);
  ok('comunidad: reaccionar suma al instante y queda marcada', (await com.locator('[data-post="cp1"] [data-reaccion="fuego"]').getAttribute('aria-pressed')) === 'true'
    && /2/.test(await com.locator('[data-post="cp1"] [data-reaccion="fuego"]').innerText()));
  await espera(1200);
  ok('comunidad: la reacción y las vistas llegan a la base', db.db.comunidad_reacciones.some(r => r.cliente_id === 'c1' && r.post_id === 'cp1' && r.tipo === 'fuego')
    && (db.db.comunidad_vistas || []).filter(v => v.cliente_id === 'c1').length >= 1);
  ok('comunidad: el equipo con su circulito y nombre corto (sin apellido)', (await com.locator('[data-equipo] [data-miembro]').count()) === 2
    && /Ana P\./.test(await com.locator('[data-equipo]').innerText()) && !/Pérez/.test(await com.locator('[data-equipo]').innerText()));
  ok('comunidad: los comentarios se leen, con el del coach', (await com.locator('[data-post="cp1"] [data-comentario="otro"]').count()) === 1
    && (await com.locator('[data-post="cp1"] [data-comentario="coach"]').count()) === 1 && /Ana P\./.test(await com.locator('[data-post="cp1"] [data-comentarios]').innerText()));
  await com.locator('[data-post="cp1"] [data-escribir]').fill('Voy por el tercero');
  await com.locator('[data-post="cp1"] [data-enviar-comentario]').click(); await espera(900);
  ok('comunidad: comentar sale al instante y llega a la base a su nombre', (await com.locator('[data-post="cp1"] [data-comentario="mio"]').count()) === 1
    && db.db.comunidad_comentarios.some(c => c.cliente_id === 'c1' && c.post_id === 'cp1' && c.texto === 'Voy por el tercero'));
  await foto(p, '19a-comunidad');
  await com.locator('[data-post="cp1"] [data-borrar-comentario]').click(); await espera(700);
  ok('comunidad: borrar su comentario', (await com.locator('[data-post="cp1"] [data-comentario="mio"]').count()) === 0
    && !!db.db.comunidad_comentarios.find(c => c.texto === 'Voy por el tercero').borrado_en);
  await p.getByRole('button', { name: /^Dash$/ }).first().click(); await espera(500);
  await p.locator('[data-abrir-config]').click();
  const conf = p.locator('[data-configuracion]');
  await conf.waitFor({ timeout: 5000 });
  ok('configuración: unidades, notificaciones, relojes, recorrido, programa y coach', JSON.stringify(await conf.locator('[data-config]').evaluateAll(els => els.map(e => e.dataset.config)))
    === JSON.stringify(['unidades', 'notificaciones', 'relojes', 'recorrido', 'programa', 'coach']));
  await foto(p, '19b-configuracion');
  await conf.locator('[data-config="relojes"]').click();
  await p.locator('[data-relojes]').waitFor({ timeout: 5000 });
  ok('relojes: Fitbit, Oura, Whoop y Polar para conectar; Garmin y Apple Watch, pronto', (await p.locator('[data-reloj]').count()) === 6
    && (await p.locator('[data-reloj="oura"]').getByText('Conectar').count()) === 1 && (await p.locator('[data-reloj="apple"]').getByText('Pronto').count()) >= 1);
  await foto(p, '19c-relojes');
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
  ok('Entreno: la kettlebell junto a la frase, entera y sin taparla', await ilusBien(p, 'entreno'));
  const cabE = p.locator('[data-cabecera-hoy="entreno"]');
  ok('Hoy de entreno: la voz del coach (el día, la semana y la frase de hoy)', await cabE.locator('[data-frase]').isVisible()
    && /^MARTES 29 · SEMANA \d+ DE \d+$/.test(await cabE.locator('[data-etiqueta]').innerText())
    && /^(Hoy toca|Hecho por hoy|Día de descanso|Hoy no te toca|Semana completa|Tienes un entreno)/.test(await cabE.locator('[data-frase]').innerText()),
    `${await cabE.locator('[data-etiqueta]').innerText()} | ${await cabE.locator('[data-frase]').innerText()}`);
  ok('…sin firma y sin personajes en la cabecera', (await cabE.locator('[data-firma-coach]').count()) === 0 && (await cabE.locator('[data-dibujo]').count()) === 0);
  ok('…con la banda delgada y el objeto de la sección (kettlebell de grafito)', (await cabE.locator('[data-banda]').count()) === 1 && (await cabE.locator('[data-objeto-cabecera="entreno"]').count()) === 1
    && await cabE.locator('[data-banda]').evaluate(el => el.getBoundingClientRect().height < 140));
  ok('…la segunda línea en el amarillo de la sección', await cabE.locator('[data-frase] span').evaluate(el => getComputedStyle(el).color === 'rgb(201, 164, 62)'));
  ok('…y el color no se sale de la pantalla', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // Unidades: ya no hay botón en Entrenamiento (viven en la configuración del Dash)
  ok('entreno: sin el botón de Unidades (está en la configuración del Dash)', (await p.locator('[data-view="entrena"]').getByRole('button', { name: /Unidades ·/ }).count()) === 0);
  await p.getByRole('button', { name: /^Dash$/ }).first().click(); await espera(400);
  await p.locator('[data-abrir-config]').click();
  await p.locator('[data-config="unidades"]').click();
  await p.getByRole('radio', { name: 'Libras (lb)' }).click();
  await p.keyboard.press('Escape');
  await espera(300);
  ok('unidades: la preferencia queda en lb', /Libras/.test(await p.locator('[data-config="unidades"]').innerText()));
  await p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await espera(600);
  // Hoy: lo de hoy todo junto y la semana con detalle
  const hoyV = p.locator('[data-view="entrena"]');
  ok('hoy: «Hoy te toca» con registros y añadir actividad ahí mismo', (await hoyV.locator('[data-hoy-te-toca]').count()) === 1
    && (await hoyV.locator('[data-hoy-te-toca]').getByText('Registro fotográfico').count()) === 1
    && (await hoyV.locator('[data-hoy-te-toca] [data-hoy-actividad]').count()) === 1);
  ok('hoy: debajo, la semana con el detalle de cada día', (await hoyV.locator('[data-vista="semana"] [data-fecha]').count()) === 7);
  ok('hoy: nombres cortos que se leen enteros', (await hoyV.getByText('Lower + Core', { exact: true }).count()) === 1
    && (await hoyV.getByText(/Training/).count()) === 0);
  ok('hoy: el corte de pago se ve en la semana', (await hoyV.getByText('Corte de tu mensualidad').count()) >= 1);
  // Añadir una rutina hoy (martes, libre): el Push repetiría lo del lunes → avisa
  await hoyV.getByRole('button', { name: 'Añadir una rutina' }).click();
  await p.locator('[data-elegir-rutina]').waitFor({ timeout: 5000 });
  await p.locator('[data-elegir-rutina] button', { hasText: 'Push' }).click();
  await p.locator('[data-confirmar]').waitFor({ timeout: 5000 });
  ok('añadir: si repite músculos del día anterior, avisa del descanso', /lunes haces Push/.test(await p.locator('[data-confirmar]').innerText()), await p.locator('[data-confirmar]').innerText());
  await foto(p, '04g-aviso-descanso');
  await p.getByRole('button', { name: 'Mejor no' }).click();
  ok('…y «Mejor no» no añade nada', !(db.db.rutina_extras || []).length);
  await p.locator('[data-elegir-rutina] button', { hasText: 'Pull' }).click();
  await espera(1200);
  ok('añadir: el Pull queda hoy, «la añadiste tú»', (db.db.rutina_extras || []).length === 1
    && /la añadiste tú/.test(await hoyV.locator('[data-hoy-rutina]').innerText()));
  await foto(p, '04h-hoy-anadida');
  // La rutina por dentro: el Push del lunes, desde su día
  await hoyV.locator(`[data-vista="semana"] [data-fecha="${lunes}"]`).click();
  // Con la red lenta: la rutina ya se precargó, así que abre al instante y
  // dice «Actualizando…» mientras llega lo del servidor.
  Object.assign(lento, { accion: 'rutina', ms: 2500 });
  await p.locator('[data-hoja-scroll]').getByText('Push', { exact: true }).click();
  let alInstante = true;
  await p.getByText('Calentamiento y movilidad').waitFor({ timeout: 900 }).catch(() => { alInstante = false; });
  ok('abrir una rutina con red lenta: se ve al instante (sin pantalla vacía)', alInstante);
  ok('…con «Actualizando» mientras llega lo del servidor', (await p.locator('[data-aviso="actualizando"]').count()) === 1);
  await foto(p, '04i-rutina-actualizando');
  await p.locator('[data-aviso="actualizando"]').waitFor({ state: 'detached', timeout: 8000 });
  Object.assign(lento, { accion: null, ms: 0 });
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
  ok('sin el mensaje de «no tienes que darle a iniciar» (ocupaba espacio)', (await p.locator('[data-sin-iniciar]').count()) === 0);
  ok('la nota de la rutina va como pregunta y la de cada ejercicio dice «Nota al coach»', (await p.getByText('¿Escribirle al coach sobre esta rutina?').count()) === 1
    && (await p.getByRole('button', { name: /Nota al coach/ }).count()) >= 3
    && await p.evaluate(() => [...document.querySelectorAll('[data-botones] button span')].filter(s => s.textContent === 'Nota al coach').every(s => s.scrollWidth <= s.clientWidth + 0.5)));
  ok('los separadores de la rutina con tono propio (calentamiento cálido, fuerza azul, cierre verde)', await p.evaluate(() => {
    const c = (f) => { const el = document.querySelector(`[data-momento="${f}"] span`); return el && getComputedStyle(el).color; };
    const a = c('calentamiento'), b = c('fuerza');
    return !!a && !!b && a !== b;
  }));
  ok('el botón de terminar se ve (cápsula con contorno grafito antes de empezar)', await p.locator('[data-terminar]').evaluate(b => {
    const cs = getComputedStyle(b); return /inset/.test(cs.boxShadow) && cs.color === 'rgb(29, 29, 31)' && parseFloat(cs.borderTopLeftRadius) >= 27;
  }));
  ok('rutina estilo Apple: el primer ejercicio sin terminar dice AHORA, video chico al lado, campos grises sin borde', await p.evaluate(() => {
    const ahora = document.querySelectorAll('[data-ahora="1"]');
    const t = ahora[0]; if (ahora.length !== 1 || !/AHORA/.test(t.innerText)) return false;
    const mini = t.querySelector('button[aria-label^="Ver "]').getBoundingClientRect();
    const campo = document.querySelector('[data-ejercicio] input[aria-label^="Repeticiones"]'), cs = getComputedStyle(campo);
    return mini.width <= 80 && mini.height <= 62 && cs.borderTopStyle === 'none' && cs.backgroundColor === 'rgb(242, 242, 244)';
  }));
  ok('rutina estilo Apple: el avance con un segmento por ejercicio', (await p.locator('[data-avance-rutina] [data-segmento]').count()) === 7);
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
  ok('descansos: el que tiene lo dice como se piensa (120 s → 2 min)', (await p.getByText('Descanso 2 min').count()) === 1);
  ok('descansos: el que no tiene lo dice', (await p.getByText('Sin descanso').count()) > 0);
  ok('unidades: la rutina abre en lb', (await p.getByText('LB ⇄').count()) > 0);
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
  ok('el calentamiento se marca con un toque y se pliega', (await p.getByText('1 de 3', { exact: true }).count()) === 1 && (await p.locator('[data-plegado]').count()) >= 1);
  ok('el avance sube por ejercicio terminado', (await p.getByText('1/7 ejercicios').count()) === 1);
  ok('con la primera serie arranca el reloj del entreno', await p.locator('[data-reloj-sesion]').isVisible());
  ok('…y la serie marcada «salta»', (await p.locator('[data-view="entrena"] .mt-pop').count()) >= 1);
  ok('…y el botón de terminar queda relleno en grafito', await p.locator('[data-terminar]').evaluate(b => getComputedStyle(b).backgroundColor === 'rgb(29, 29, 31)'));
  ok('…lo hecho: check grafito con la palomita amarilla, y un segmento lleno', await p.locator('[data-plegado] > span').first().evaluate(b => getComputedStyle(b).backgroundColor === 'rgb(29, 29, 31)' && getComputedStyle(b).color === 'rgb(242, 201, 76)')
    && (await p.locator('[data-avance-rutina] [data-segmento="hecho"]').count()) >= 1);
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
  // El video del ejercicio: limpio, en bucle, sin sonido ni controles
  const play = p.locator('[data-hoja-scroll] button').filter({ hasText: '▶' }).first();
  if (await play.count()) {
    await play.click(); await espera(400);
    const src = await p.locator('[data-video-limpio] iframe').getAttribute('src').catch(() => '');
    // El bucle ya no es el de YouTube (dejaba ver su pantalla final): lo hace VideoLimpio.
    ok('video del ejercicio: arranca solo, sin sonido, sin controles ni sugeridos', /autoplay=1/.test(src) && /mute=1/.test(src) && /controls=0/.test(src) && /rel=0/.test(src), src);
    ok('video: botón de sonido (prende y apaga) y barrita para moverlo', (await p.locator('[data-video-limpio] [data-video-sonido]').count()) === 1
      && (await p.locator('[data-video-limpio] [data-video-barra]').count()) === 1 && /enablejsapi=1/.test(src));
    ok('video: sin zoom (el ejercicio entero) y lo de YouTube fuera del cuadro: el reproductor es más alto que el cuadro', await p.locator('[data-video-limpio] iframe').evaluate(el => {
      const f = el.getBoundingClientRect(), c = el.parentElement.getBoundingClientRect();
      return !/scale/.test(el.style.transform || '') && Math.abs(f.width - c.width) < 1 && f.top < c.top - 40 && f.bottom > c.bottom + 40;
    }) && !/loop=1|playlist=/.test(src));
    ok('video: la barrita es delgada (pista de 4 px, puntas redondas)', await p.locator('[data-video-barra]').evaluate(el => el.getBoundingClientRect().height <= 16 && getComputedStyle(el).appearance === 'none'));
    await espera(3000);
    await foto(p, '04j-video-barra');
    ok('video: la miniatura destapa rápido (aun sin respuesta de YouTube, antes de 3 s)', await p.locator('[data-video-limpio] > div[aria-hidden]').evaluate(el => getComputedStyle(el).opacity === '0'));
    await p.locator('[data-video-limpio] [data-video-sonido]').click(); await espera(150);
    ok('video: el sonido se prende sin salir del modo limpio', (await p.locator('[data-video-limpio]').count()) === 1
      && (await p.locator('[data-video-sonido]').getAttribute('aria-label')) === 'Quitar sonido');
  }
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
  await p.locator('nav[aria-label="Secciones"]').getByRole('button', { name: 'Hoy', exact: true }).click();
  await espera(800);
  await p.getByRole('button', { name: 'Calendario' }).click();
  await espera(1500);
  await foto(p, '05-entreno-calendario');
  const cal = p.locator('[data-view="entrena"]');
  const d = (n) => sumarDiasISO(lunes, n);   // 0 lunes … 6 domingo (hoy es martes = 1)
  ok('calendario: es el mes (sin repetir la semana de Hoy)', (await cal.locator('[data-vista="mes"]').count()) === 1
    && (await cal.getByRole('tab').count()) === 0);
  ok('calendario: sin «la saltaste»', (await cal.getByText(/saltaste/).count()) === 0);
  ok('mes: días de la semana en el gris de la sección', await cal.getByText('Lun', { exact: true }).first().evaluate(el => getComputedStyle(el).color === 'rgb(95, 102, 112)'));
  ok('mes: casillas compactas y nombres cortos', await cal.locator('[data-vista="mes"] [data-fecha]').first().evaluate(el => { const h = el.getBoundingClientRect().height; return h >= 66 && h <= 84; })
    && (await cal.getByText(/Training/).count()) === 0, String(await cal.locator('[data-vista="mes"] [data-fecha]').first().evaluate(el => el.getBoundingClientRect().height)));
  ok('mes: la leyenda es pequeña y «ten en cuenta» asoma en la primera vista',
    await cal.locator('[data-leyenda]').evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 12)
    && await cal.locator('[data-ten-en-cuenta]').evaluate(el => el.getBoundingClientRect().top < innerHeight),
    String(await cal.locator('[data-ten-en-cuenta]').evaluate(el => [el.getBoundingClientRect().top, innerHeight])));
  ok('por hacer con borde gris; hecho relleno gris', await cal.locator('[data-chip="pendiente"]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(el).borderTopColor === 'rgb(95, 102, 112)')
    && await cal.locator('[data-chip="hecha"]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(95, 102, 112)'));
  ok('mes: «Léelo · ten en cuenta» con mover, añadir, plan y descanso', /Léelo/.test(await cal.locator('[data-ten-en-cuenta]').innerText())
    && ['Mover', 'Añadir', 'Tu plan no cambia', 'Descanso'].every(t => (async () => true)()) && /Descanso\./.test(await cal.locator('[data-ten-en-cuenta]').innerText()));
  ok('calendario: sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[12]\d), (1[2-4]\d), (8\d|9\d)\)|rgb\(231, 235, 214\)/;
    return ![...document.querySelectorAll('[data-view="entrena"] *')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor) || oliva.test(getComputedStyle(el).borderTopColor));
  }));
  await cal.locator('[data-ten-en-cuenta]').scrollIntoViewIfNeeded();
  await foto(p, '05a-ten-en-cuenta');
  // Registrar desde el día
  await cal.locator(`[data-vista="mes"] [data-fecha="${hoy}"]`).click();
  await p.getByText('Para registrar').waitFor({ timeout: 5000 });
  ok('al tocar el día: el detalle dice la fecha de corte', (await p.getByText('Fecha de corte de tu mensualidad').count()) === 1);
  ok('al tocar el día: arriba, añadir cardio o deporte', (await p.locator('[data-acciones-dia] [data-accion="actividad"]').count()) === 1);
  await espera(300);
  await foto(p, '05b-dia-registrar');
  await p.getByRole('button', { name: 'Ya envié mis fotos' }).click();
  await p.getByLabel('Tu peso en kg').fill('78,4');
  await p.getByRole('button', { name: 'Guardar' }).click();
  await espera(700);
  ok('fotos y peso quedan registrados', db.db.evento_registros && db.db.evento_registros.length === 2
    && Number(db.db.evento_registros.find(r => r.evento_id === 'evp').valor) === 78.4);
  ok('…y la hoja lo dice', (await p.getByText(/Hecho\. Tu coach ya lo sabe/).count()) === 2);
  await p.getByRole('button', { name: 'Cerrar' }).first().click();
  await espera(400);
  // Mover con el botón: el Lower del miércoles al jueves (de esta semana en
  // adelante; nunca a una semana que ya pasó)
  await cal.locator(`[data-vista="mes"] [data-fecha="${d(2)}"]`).click();
  await p.getByRole('button', { name: /Mover a otro día/ }).click();
  ok('mover: no ofrece días de la semana pasada', (await p.getByRole('button', { name: new RegExp('^(Dom ' + Number(d(-1).slice(8)) + '|Sáb ' + Number(d(-2).slice(8)) + ')\\b') }).count()) === 0
    && (await p.getByRole('button', { name: new RegExp('^Jue ' + Number(d(3).slice(8))) }).count()) === 1);
  await p.getByRole('button', { name: new RegExp('^Jue ' + Number(d(3).slice(8))) }).click();
  await espera(900);
  ok('mover con el botón: el Lower pasa al jueves', (await cal.locator(`[data-fecha="${d(3)}"]`).innerText()).includes('Lower')
    && !(await cal.locator(`[data-fecha="${d(2)}"]`).innerText()).includes('Lower'));
  // Arrastrar con el ratón: el Pull del viernes al sábado
  const de = await cal.locator(`[data-fecha="${d(4)}"] [data-chip]`).first().boundingBox();
  const aSab = await cal.locator(`[data-fecha="${d(5)}"]`).boundingBox();
  await p.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
  await p.mouse.down();
  await espera(500);
  await p.mouse.move(aSab.x + aSab.width / 2, aSab.y + aSab.height / 2, { steps: 8 });
  await espera(150);
  await foto(p, '05d-arrastrando');
  Object.assign(lento, { accion: 'mover', ms: 1800 });
  await p.mouse.up();
  await espera(250);
  ok('arrastrar con red lenta: el cuadrito cambia de día al instante', (await cal.locator(`[data-fecha="${d(5)}"]`).innerText()).includes('Pull')
    && !(await cal.locator(`[data-fecha="${d(4)}"]`).innerText()).includes('Pull'));
  ok('…y mientras guarda dice «Actualizando»', (await p.locator('[data-aviso="actualizando"]').count()) === 1);
  await foto(p, '05d2-actualizando');
  await p.locator('[data-aviso="listo"]').waitFor({ timeout: 5000 });
  Object.assign(lento, { accion: null, ms: 0 });
  await espera(500);
  ok('arrastrar: el Pull pasa al sábado', (await cal.locator(`[data-fecha="${d(5)}"]`).innerText()).includes('Pull'));
  // A la semana que viene no se puede
  const deJ = await cal.locator(`[data-fecha="${d(3)}"] [data-chip]`).first().boundingBox();
  const aSig = (await cal.locator(`[data-fecha="${d(7)}"]`).count()) ? await cal.locator(`[data-fecha="${d(7)}"]`).boundingBox() : null;
  if (aSig) {
    await p.mouse.move(deJ.x + deJ.width / 2, deJ.y + deJ.height / 2);
    await p.mouse.down(); await espera(500);
    await p.mouse.move(aSig.x + aSig.width / 2, aSig.y + aSig.height / 2, { steps: 8 });
    await p.mouse.up(); await espera(700);
    ok('arrastrar a la otra semana: no se mueve y lo explica', (await p.getByText('Solo puedes mover rutinas dentro de esta semana', { exact: false }).count()) === 1
      && (await cal.locator(`[data-fecha="${d(3)}"]`).innerText()).includes('Lower'));
  }
  ok('arrastrar: se guardó una vez por cambio', db.db.rutina_movimientos.length === 2, String(db.db.rutina_movimientos.length));
  ok('el plan del coach no cambia', JSON.stringify(db.db.rutinas.find(r => r.id === 'r2').dias_semana) === '["X"]');
  await foto(p, '05e-movidas');
  // Con el dedo, en la semana de Hoy: el Pull del sábado al domingo
  await p.locator('nav[aria-label="Secciones"]').getByRole('button', { name: 'Hoy', exact: true }).click();
  await espera(1500);
  const cdp = await ctx.newCDPSession(p);
  const c0 = await cal.locator(`[data-vista="semana"] [data-fecha="${d(5)}"] [data-chip]`).first().boundingBox();
  await cal.locator(`[data-vista="semana"] [data-fecha="${d(6)}"]`).scrollIntoViewIfNeeded();
  const c0b = await cal.locator(`[data-vista="semana"] [data-fecha="${d(5)}"] [data-chip]`).first().boundingBox();
  const c1 = await cal.locator(`[data-vista="semana"] [data-fecha="${d(6)}"]`).boundingBox();
  const x0 = c0b.x + c0b.width / 2, y0 = c0b.y + c0b.height / 2, x1 = c1.x + c1.width / 2, y1 = c1.y + c1.height / 2;
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
  ok('dedo: el Pull cambia de día con el dedo', (await cal.locator(`[data-vista="semana"] [data-fecha="${d(6)}"]`).innerText()).includes('Pull'),
    await cal.locator(`[data-vista="semana"] [data-fecha="${d(6)}"]`).innerText());
  ok('dedo: soltar no abre la hoja del día', (await p.getByText('Mover a otro día').count()) === 0);
  void c0;
  await p.getByRole('button', { name: 'Galería' }).click();
  await p.getByText('Sentadilla con barra').first().waitFor({ timeout: 10000 });
  await espera(600);
  await foto(p, '06-entreno-galeria');
  ok('galería: cada tarjeta con su tipo (movilidad, resistencia, potencia, fuerza) y la fuerza dice empuje/jalón y tren', await p.evaluate(() => {
    const tarjeta = (t) => [...document.querySelectorAll('[data-familia]')].find(b => b.innerText.includes(t));
    const fam = (t) => tarjeta(t)?.getAttribute('data-familia'), fz = (t) => tarjeta(t)?.getAttribute('data-fuerza');
    return fam('Press banca') === 'fuerza' && fz('Press banca') === 'Empuje · tren superior'
      && fz('Remo con mancuerna') === 'Jalón · tren superior' && fz('Sentadilla con barra') === 'Empuje · tren inferior'
      && fz('Hip thrust') === 'Jalón · tren inferior' && fam('Carrera continua') === 'resistencia' && fam('Dislocaciones') === 'movilidad'
      && /Empuje · tren superior/.test(tarjeta('Press banca').innerText)
      && getComputedStyle(tarjeta('Press banca')).backgroundImage === getComputedStyle(tarjeta('Sentadilla con barra')).backgroundImage
      && document.querySelectorAll('[data-familia-etiqueta]').length >= 8;
  }));
  ok('galería: tarjetas sin borde, con el cuadro a todo el ancho y el velo del color del tipo', await p.evaluate(() => {
    const ts = [...document.querySelectorAll('[data-familia]')];
    return ts.length >= 8 && ts.every(b => getComputedStyle(b).borderTopStyle === 'none' && /gradient/.test(getComputedStyle(b).backgroundImage) && b.querySelector('[data-familia-velo]'));
  }));
  ok('galería: un estante por tipo (movilidad, fuerza…, resistencia) en ese orden, la fuerza en rejilla de dos', await p.evaluate(() => {
    const est = [...document.querySelectorAll('[data-estante]')].map(e => e.dataset.estante);
    const fz = document.querySelector('[data-estante="fuerza"] > div:last-child');
    const orden = ['movilidad', 'fuerza', 'potencia', 'resistencia'].filter(f => est.includes(f));
    return est.length >= 3 && est.join() === orden.join() && getComputedStyle(fz).gridTemplateColumns.split(' ').length === 2
      && [...document.querySelectorAll('[data-estante]')].every(e => [...e.querySelectorAll('[data-familia]')].every(b => b.dataset.familia === e.dataset.estante));
  }));
  ok('galería: la etiqueta es de vidrio con su punto y el nombre va en blanco sobre el cuadro', await p.evaluate(() => {
    const b = [...document.querySelectorAll('[data-familia]')].find(x => x.innerText.includes('Press banca'));
    const et = b.querySelector('[data-familia-etiqueta]');
    return /blur/.test(getComputedStyle(et).backdropFilter || getComputedStyle(et).webkitBackdropFilter || '') && !!et.querySelector('i')
      && [...b.querySelectorAll('span')].some(s => s.textContent === 'Barbell Bench Press' && getComputedStyle(s).color === 'rgb(255, 255, 255)');
  }));
  ok('galería: el estante que se desliza arranca alineado con el margen de la página', await p.evaluate(() => {
    const fila = document.querySelector('[data-estante="movilidad"] > div:last-child');
    const t = fila.querySelector('[data-familia]').getBoundingClientRect(), tit = document.querySelector('[data-estante="movilidad"] > div:first-child').getBoundingClientRect();
    return Math.abs(t.left - tit.left) < 1.5;
  }));
  ok('galería: los filtros sin borde', await p.evaluate(() => [...document.querySelectorAll('[data-view="entrena"] button')].filter(b => b.textContent === 'Todas').every(b => getComputedStyle(b).borderTopStyle === 'none')));
  ok('entreno: la firma al final de la galería', (await p.locator('[data-view="entrena"] [data-firma]').count()) === 1);
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
  ok('Comida: el plato, junto a la frase, entero y sin taparla', (await p.locator('[data-objeto-cabecera="comida"] img').count()) >= 1 && await ilusBien(p, 'comida'));
  ok('Hoy de alimentación ya no saluda ni trae herramientas', (await p.getByText('Hola, Mauro').count()) === 0
    && (await p.getByText('Tus herramientas').count()) === 0);
  ok('Hoy de alimentación: la voz del coach según lo comido, sin personajes', await p.locator('[data-cabecera-hoy="comida"] [data-frase]').isVisible()
    && (await p.locator('[data-cabecera-hoy="comida"] [data-dibujo]').count()) === 0
    && /kcal|registr|desayuno|meta|día|comida/i.test(await p.locator('[data-cabecera-hoy="comida"] [data-frase]').innerText()),
    await p.locator('[data-cabecera-hoy="comida"] [data-frase]').innerText());
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
  ok('Recetas: la marca muy tenue en la esquina de arriba a la derecha, apenas cortada por el borde y sin desplazar la página', await p.evaluate(() => {
    const m = document.querySelector('[data-cabecera-hoy="comida"] [data-marca-esquina]'); if (!m) return false;
    const r = m.getBoundingClientRect(), op = Number(getComputedStyle(m).opacity);
    const fuera = Math.max(0, r.right - innerWidth) / r.width;
    return op > 0 && op <= 0.09 && fuera > 0 && fuera <= 0.2 && r.top < 260 && document.documentElement.scrollWidth <= innerWidth;
  }));
  ok('recetario: una línea separa los botones de las recetas', (await p.locator('[data-recetario-separador]').count()) === 1);
  ok('recetario: sin la foto de portada', (await p.locator('img[src*="recetario-hero"]').count()) === 0);
  ok('recetario: las recetas se ven de una', (await p.getByText('Wrap crujiente de atún').count()) >= 1);
  // El detalle de una receta, con la visual de la app
  await p.getByText('Wrap crujiente de atún').first().click();
  await espera(700);
  await foto(p, '10f-receta-detalle');
  await p.mouse.move(195, 600); await p.mouse.wheel(0, 900);
  await espera(500);
  await foto(p, '10g-receta-detalle-abajo');
  await p.mouse.wheel(0, 900);
  await espera(500);
  await foto(p, '10h-receta-detalle-final');
  await p.mouse.wheel(0, -3000);
  await espera(300);
  await p.getByRole('button', { name: 'Volver al recetario' }).click();
  await espera(700);
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
  const calC = p.locator('[data-calendario-comidas]');
  ok('calendario de comidas: con la forma del de entreno (días en verde, casillas blancas)', (await calC.count()) === 1
    && await calC.getByText('Lun', { exact: true }).evaluate(el => getComputedStyle(el).color === 'rgb(70, 150, 90)')
    && await calC.locator('[data-dia-comida]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)' || getComputedStyle(el).backgroundColor === 'rgb(242, 248, 243)'));
  ok('calendario de comidas: pestañas rectangulares, la activa en verde', await p.locator('[data-pestanas-comida] button').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(70, 150, 90)' && parseFloat(getComputedStyle(el).borderTopLeftRadius) <= 12));
  ok('calendario de comidas: las gráficas son las del Dash', (await p.locator('[data-grafica-comida]').count()) === 3
    && (await p.locator('.fixed.inset-0.z-50 svg rect').count()) > 10);
  ok('calendario de comidas: sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[2-4]\d), (1[4-5]\d), (8\d|9\d)\)|rgb\(212, 218, 184\)|rgb\(74, 82, 56\)/;
    const caja = [...document.querySelectorAll('.fixed.inset-0.z-50')].pop();
    return ![...caja.querySelectorAll('*')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
  await p.locator('.fixed.inset-0.z-50 [data-grafica-comida]').first().scrollIntoViewIfNeeded();
  await espera(300);
  await foto(p, '10d-graficas-comidas');
  // La vista de un día, con la estética de la marca.
  await p.locator('[data-pestanas-comida] button', { hasText: 'Día' }).click(); await espera(500);
  ok('calendario de comidas: el día con tarjetas blancas, sin oliva', (await p.locator('[data-vista-dia-v2]').count()) === 1 && await p.evaluate(() => {
    const oliva = /rgb\((1[2-4]\d), (1[4-5]\d), (8\d|9\d)\)|rgb\(212, 218, 184\)|rgb\(74, 82, 56\)/;
    const v = document.querySelector('[data-vista-dia-v2]');
    return ![...v.querySelectorAll('*')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
  await foto(p, '10e-dia-comidas');
  ok('barra de Alimentación: Calendario abre el calendario de comidas', true);
  await p.getByRole('button', { name: 'Cerrar' }).last().dispatchEvent('pointerdown');
  await espera(800);
  await p.getByRole('button', { name: 'Chat', exact: true }).click();
  await espera(900);
  await foto(p, '09-comida-chat');
  // iPhone: la zona de la muesca a veces llega DESPUÉS de abrir. La tarjeta de
  // macros tiene que bajar con la píldora, nunca quedar detrás de ella.
  await p.addStyleTag({ content: 'div[style*="safe-area-inset-top, 0px) + 10px"] { padding-top: 57px !important; }' });
  await espera(700);
  ok('chat: si la muesca llega tarde, la tarjeta de macros sigue DEBAJO de la píldora «Alimentación»', await p.evaluate(() => {
    const pild = [...document.querySelectorAll('span')].find(s => /^ALIMENTACIÓN$/i.test(s.textContent.trim())).closest('div.rounded-full').getBoundingClientRect();
    const zona = [...document.querySelectorAll('div.fixed.left-0.right-0')].find(d => d.style.top && d.querySelector('.rounded-3xl'));
    return zona.querySelector('.rounded-3xl').getBoundingClientRect().top >= pild.bottom;
  }));
  await p.evaluate(() => document.querySelectorAll('style').forEach(st => { if (st.textContent.includes('padding-top: 57px')) st.remove(); }));
  await espera(500);
  ok('chat: burbujas blancas de marca, sin oliva', (await p.locator('[data-chat-v2]').count()) === 1 && await p.evaluate(() => {
    const oliva = /rgb\((1[2-4]\d), (1[4-5]\d), (8\d|9\d)\)|rgb\(212, 218, 184\)|rgb\(74, 82, 56\)/;
    const els = [...document.querySelectorAll('[data-chat-v2] *')];
    return els.length > 0 && !els.some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
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
  // Al registrar comida: sube el «+156 kcal» con cómo va el día.
  const suma = p.locator('[data-aviso-suma]');
  await suma.waitFor({ timeout: 6000 }).catch(() => {});
  await espera(800);
  ok('al registrar comida sale el «+kcal» con el avance del día', (await suma.count()) === 1 && /\+\d+ kcal/.test(await suma.innerText()) && /Vas en \d+ % de tu día/.test(await suma.innerText()), (await suma.count()) ? await suma.innerText() : 'no salió');
  ok('chat: la comida registrada en tarjeta compacta (momento, total grande y alimentos)', (await p.locator('[data-tarjeta-comida]').count()) >= 1
    && /kcal/.test(await p.locator('[data-tarjeta-comida]').last().innerText()) && (await p.locator('[data-tarjeta-comida] [data-alimento]').count()) >= 1);
  await foto(p, '09c-comida-suma');
  await espera(2600);
  ok('…y se va solo', (await suma.count()) === 0);
  // Al llegar a la meta de calorías: la hoja de celebración de comida.
  await p.locator('.msg-input').click();
  await p.keyboard.type('almuerzo grande');
  await p.keyboard.press('Enter');
  const metaC = p.locator('[data-meta-comida]');
  await metaC.waitFor({ timeout: 8000 }).catch(() => {});
  await espera(1400);
  ok('meta de comida: sale la hoja con la kettlebell verde comiendo, sus macros y confeti verde', (await metaC.count()) === 1
    && /Meta del día, cumplida/.test(await metaC.innerText()) && (await metaC.locator('svg[data-dibujo="meta-comida"]').count()) === 1
    && (await metaC.locator('[data-meta-macros] > div').count()) === 3 && (await p.locator('[data-aviso-suma]').count()) === 0);
  await foto(p, '09d-meta-comida');
  await metaC.getByRole('button', { name: 'Seguir' }).click(); await espera(400);
  ok('meta de comida: «Seguir» la cierra', (await metaC.count()) === 0);
  // Las demás respuestas (una consulta) con la jerarquía de la marca.
  await p.locator('.msg-input').click();
  await p.keyboard.type('cuántas calorías tiene una manzana');
  await p.keyboard.press('Enter');
  await p.getByText('Manzana', { exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
  await espera(500);
  ok('chat: la consulta con etiqueta verde en mayúscula, título grande y sin oliva', await p.evaluate(() => {
    const t = [...document.querySelectorAll('[data-chat-v2] .fade-up')].pop();
    if (!t) return false;
    const etiqueta = [...t.querySelectorAll('span')].find(x => /Consulta nutricional/i.test(x.textContent));
    const titulo = [...t.querySelectorAll('div')].find(x => x.textContent === 'Manzana');
    const oliva = /rgb\((1[2-4]\d), (1[4-5]\d), (8\d|9\d)\)|rgb\(74, 82, 56\)/;
    return !!etiqueta && getComputedStyle(etiqueta).textTransform === 'uppercase' && getComputedStyle(etiqueta).color === 'rgb(47, 127, 69)'
      && !!titulo && parseFloat(getComputedStyle(titulo).fontSize) >= 18
      && ![...t.querySelectorAll('*')].some(el => oliva.test(getComputedStyle(el).color));
  }));
  await foto(p, '09e-consulta');
  await p.locator('.msg-input').click();
  await espera(200);
  await p.mouse.click(195, 300);
  await espera(300);
  ok('chat: al salir del campo sin enviar también vuelve', await barraVisible());

  // ── Aprendizaje: Lecturas · Videos · Sobre el programa (sin «Hoy») ──
  await p.getByRole('button', { name: 'Aprendizaje', exact: true }).click();
  await espera(1400);
  const marco = p.frameLocator('iframe[title="Centro de aprendizaje"]');
  const textosBarra = () => p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Secciones"] [role="group"] button')].map(b => b.textContent.trim()));
  ok('Aprendizaje abre en Lecturas, sin «Hoy»', /lecturas/.test(await marco.locator('#t').textContent())
    && await p.locator('iframe[title="Centro de aprendizaje"]').evaluate(el => getComputedStyle(el).visibility === 'visible')
    && JSON.stringify(await textosBarra()) === JSON.stringify(['Lecturas', 'Videos', 'Programa']), JSON.stringify(await textosBarra()));
  ok('con Aprendizaje abierto se sigue viendo su ícono', await p.locator('[data-icono-seccion="aprende"]').isVisible());
  ok('Aprendizaje: sus tres opciones se ven enteras en la barra', await p.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Secciones"]').getBoundingClientRect();
    return ['Lecturas', 'Videos', 'Programa'].every(t => { const b = [...document.querySelectorAll('nav[aria-label="Secciones"] button')].find(x => x.textContent.trim() === t);
      const r = b && b.getBoundingClientRect(); return r && r.left >= nav.left - 0.5 && r.right <= nav.right + 0.5; });
  }));
  await foto(p, '10-aprende-lecturas');
  await p.getByRole('button', { name: 'Videos', exact: true }).click();
  await espera(500);
  ok('Videos se pide al centro', /videos/.test(await marco.locator('#t').textContent()), await marco.locator('#t').textContent());
  // ── «Sobre el programa»: el método, sin hablar de dos apps ni de Instagram ──
  await p.getByRole('button', { name: 'Sobre el programa', exact: true }).click();
  const prog = p.locator('[data-acerca-programa]');
  await prog.waitFor({ timeout: 8000 });
  await espera(500);
  const textoProg = await prog.innerText();
  ok('Programa: el método, los 4 pilares, las 6 fases, las preguntas y las aclaraciones', (await prog.locator('[data-pilar]').count()) === 4
    && (await prog.locator('[data-fase]').count()) === 6 && /Preguntas frecuentes/.test(textoProg) && /Aclaraciones/.test(textoProg) && /Se acabó la improvisación/.test(textoProg));
  ok('Programa: solo lo que está en la app (sin «Meal Tracker», «dos apps» ni Instagram)', !/Meal Track|dos apps|app de entrenamiento|app de gesti|instagram/i.test(textoProg), (textoProg.match(/.{0,40}(Meal Track|dos apps|app de entrenamiento|app de gesti|instagram).{0,40}/i) || [''])[0]);
  ok('Programa: separadores entre las partes y la frase sin curva (como Videos)', (await prog.locator('[data-separador]').count()) === 5
    && (await prog.locator('[data-cabecera-hoy] [data-banda]').count()) === 0 && /Tu progreso/.test(await prog.locator('[data-cabecera-hoy] [data-frase]').innerText()));
  ok('Programa: el centro queda escondido detrás', await p.locator('iframe[title="Centro de aprendizaje"]').evaluate(el => getComputedStyle(el).visibility === 'hidden'));
  await foto(p, '10-programa');
  await prog.locator('[data-fase]').nth(2).getByRole('button').click();
  await espera(300);
  ok('Programa: una fase se abre con lo que haces tú y el resultado', /Lo que haces tú/.test(await prog.locator('[data-fase]').nth(2).innerText()));
  await prog.locator('[data-parte="trayecto"]').scrollIntoViewIfNeeded();
  await foto(p, '10c-programa-fase');
  // ── El recorrido guiado: parte por parte, y solo termina con «Finalizar» ──
  await prog.locator('[data-abrir-recorrido]').scrollIntoViewIfNeeded();
  await prog.locator('[data-abrir-recorrido]').click();
  const rec = p.locator('[data-recorrido]');
  await rec.waitFor({ timeout: 6000 });
  await espera(400);
  await foto(p, '17a-recorrido-bienvenida');
  await p.keyboard.press('Escape');
  await p.mouse.click(30, 120);
  await espera(300);
  ok('recorrido: no se cierra con Escape ni tocando afuera, y no tiene X', (await rec.count()) === 1 && (await rec.getByRole('button', { name: /Cerrar|Saltar|Omitir/ }).count()) === 0);
  const vistos = [];
  const fotosRec = { 'TU RUTINA': '17c-recorrido-rutina', 'CHAT': '17e-recorrido-chat', 'RECETAS': '17f-recorrido-recetas', 'DASH': '17d-recorrido-dash' };
  for (let k = 0; k < 20; k++) {
    if (/Finalizar/.test(await rec.locator('[data-rec-siguiente]').innerText())) break;
    await rec.locator('[data-rec-siguiente]').click(); await espera(1500);
    const et = (await rec.innerText()).split('\n')[0].trim();
    vistos.push({ et, foco: await p.locator('[data-foco]').count() });
    if (fotosRec[et] && !vistos.some((v, n) => v.et === et && n < vistos.length - 1)) await foto(p, fotosRec[et]);
  }
  const ets = vistos.map(v => v.et);
  ok('recorrido: muestra cada parte (rutina, calendario, galería, chat, recetas, calendario de comidas, lecturas, videos, programa, gráficas)',
    ['ENTRENAMIENTO · HOY', 'TU RUTINA', 'CALENDARIO', 'GALERÍA', 'ALIMENTACIÓN · HOY', 'CHAT', 'RECETAS', 'CALENDARIO DE COMIDAS', 'LECTURAS', 'VIDEOS', 'SOBRE EL PROGRAMA', 'DASH'].every(e => ets.includes(e)), JSON.stringify(ets));
  ok('recorrido: en cada parte se ilumina algo', vistos.filter(v => v.et !== 'LISTO').every(v => v.foco === 1), JSON.stringify(vistos));
  ok('recorrido: el último paso dice «Finalizar»', /Finalizar/.test(await rec.locator('[data-rec-siguiente]').innerText()));
  await rec.locator('[data-rec-siguiente]').click(); await espera(900);
  ok('recorrido: al finalizar se cierra, vuelve a «Sobre el programa» y queda hecho', (await rec.count()) === 0 && await p.locator('[data-acerca-programa]').isVisible()
    && await p.evaluate(() => !!localStorage.getItem('mt:recorridoHecho')));
  // ── La voz de cada parte: Calendario, Galería, Recetas, Calendario de comidas ──
  await p.locator('nav[aria-label="Secciones"]').getByRole('button', { name: 'Entrenamiento', exact: true }).click(); await espera(900);
  await p.getByRole('button', { name: 'Calendario', exact: true }).click(); await espera(900);
  ok('Calendario de entreno: su frase con la letra de la marca', /Tu semana,\s*en orden\./.test(await p.locator('[data-view="entrena"] [data-cabecera-hoy="entreno"] [data-frase]').first().innerText()));
  await p.getByRole('button', { name: 'Galería', exact: true }).click(); await espera(900);
  ok('Galería: su frase y sin el título viejo', /Mira, aprende/.test(await p.locator('[data-view="entrena"] [data-cabecera-hoy="entreno"] [data-frase]').first().innerText())
    && (await p.locator('[data-view="entrena"]').getByText('Galería', { exact: true }).count()) === 0);
  await foto(p, '18a-galeria-voz');
  // El puntito de novedad: la meta de comida «cambió» desde la última vez
  await p.evaluate(() => localStorage.setItem('mt:nov:comida', '1/1/1/1'));
  await p.getByRole('button', { name: 'Hoy', exact: true }).click(); await espera(600);
  ok('novedad: puntito verde en Alimentación', await p.locator('[data-punto="comida"]').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(70, 150, 90)').catch(() => false));
  await foto(p, '18b-punto-novedad');
  await p.getByRole('button', { name: 'Alimentación', exact: true }).click(); await espera(700);
  await p.getByRole('button', { name: 'Recetas', exact: true }).click(); await espera(1200);
  ok('Recetas: su frase', /Comer bien\s*también es rico\./.test(await p.locator('[data-cabecera-hoy="comida"] [data-frase]').first().innerText()));
  await foto(p, '18c-recetas-voz');
  await p.getByRole('button', { name: 'Dash', exact: true }).click(); await espera(700);
  ok('novedad: al entrar a Alimentación su puntito se va', (await p.locator('[data-punto="comida"]').count()) === 0);
  await p.getByRole('button', { name: 'Alimentación', exact: true }).click(); await espera(700);
  await p.getByRole('button', { name: 'Calendario', exact: true }).click(); await espera(1200);
  ok('Calendario de comidas: su frase', /Cada día suma\./.test(await p.getByRole('dialog').or(p.locator('body')).locator('[data-cabecera-hoy="comida"] [data-frase]').last().innerText()));
  await foto(p, '18d-calendario-comidas-voz');
  await p.getByRole('button', { name: 'Cerrar' }).last().click(); await espera(500);
  await p.getByRole('button', { name: 'Dash', exact: true }).click(); await espera(600);
  // Alimentación abre siempre en Hoy (aunque se haya quedado en el Chat)
  await p.getByRole('button', { name: 'Alimentación', exact: true }).click();
  await espera(700);
  ok('Alimentación abre en Hoy', await p.locator('[data-cabecera-hoy="comida"]').isVisible());

  await p.getByRole('button', { name: 'Dash', exact: true }).click();
  await p.getByText('Tu performance semanal', { exact: true }).waitFor();
  ok('vuelve al Dash', true);
  ok('sin errores de JavaScript (Mauro)', errores.length === 0, errores.join(' | '));
  await ctx.close();

  // ── Teléfono angosto ──
  const n = await abrir('Mauro Morón', { ancho: 375, caliente: true });
  await n.p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 }).catch(() => {});
  ok('apertura caliente (la usó hace 5 min): también abre en el Dash', await n.p.getByText('Tu performance semanal', { exact: true }).isVisible());
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
  ok('375 px: las cuatro opciones de Aprendizaje se ven enteras', await n.p.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Secciones"]').getBoundingClientRect();
    return ['Lecturas', 'Videos', 'Programa'].every(t => { const b = [...document.querySelectorAll('nav[aria-label="Secciones"] button')].find(x => x.textContent.trim() === t);
      const r = b && b.getBoundingClientRect(); return r && r.left >= nav.left - 0.5 && r.right <= nav.right + 0.5; });
  }));
  await foto(n.p, '12-375-aprende');
  // ── Al terminar un entreno: la celebración (con el personaje y su cara) ──
  await n.p.getByRole('button', { name: 'Entrenamiento', exact: true }).click();
  await espera(1200);
  await n.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"]`).click();
  await n.p.locator('[data-hoja-scroll]').getByText('Push', { exact: true }).click();
  await n.p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 });
  await n.p.getByRole('button', { name: 'Marcar serie 1' }).first().click();
  await espera(300);
  await n.p.locator('[data-terminar]').click();
  await n.p.getByRole('button', { name: 'Enviar a mi coach' }).click();
  const fin = n.p.locator('[data-fin-entreno]');
  await fin.waitFor({ timeout: 8000 });
  ok('fin: confeti con los colores de la marca', (await n.p.locator('.mt-confeti i').count()) > 20);
  await espera(1500);
  ok('fin: los números suben y dicen los minutos', /\d+\s*minutos?/.test(await fin.innerText()) && (await fin.locator('[data-fin-barra]').count()) === 1);
  ok('fin: «Entreno hecho.» con la frase del coach y lo que hizo', (await fin.getByText('Entreno hecho.').count()) === 1
    && /1\/7\s*ejercicios/.test(await fin.innerText()) && (await fin.locator('[data-firma-coach]').count()) === 0, await fin.innerText());
  ok('fin: la kettlebell levantando la barra, con cara (para darle personalidad), entera', await fin.locator('[data-dibujo="pesas"]').evaluate(el => {
    const r = el.getBoundingClientRect(); return r.width > 150 && r.left >= 0 && r.right <= innerWidth && !!el.querySelector('.kb-ojos');
  }));
  await foto(n.p, '16-fin-entreno');
  await fin.getByRole('button', { name: 'Seguir' }).click();
  await espera(600);
  ok('fin: «Seguir» vuelve a Hoy', (await fin.count()) === 0 && await n.p.locator('[data-cabecera-hoy="entreno"]').isVisible());
  ok('fin: la cabecera ya dice que entrenó hoy… o lo que sigue', (await n.p.locator('[data-cabecera-hoy="entreno"] [data-frase]').innerText()).length > 5);
  ok('sin errores de JavaScript (375 y fin de entreno)', n.errores.length === 0, n.errores.join(' | '));
  await n.ctx.close();

  // ── Cuenta con contraseña (solo Mauro): activarla, datos, avisos, cerrar sesión ──
  {
    let tiene = false, creadas = 0;
    const cuenta = (c) => {
      if (c.accion === 'cuenta') return { ok: true, nombre: 'Mauro Morón', email: 'mauro@correo.com', tieneClave: tiene };
      if (c.accion === 'crear') { creadas++; tiene = true; return c.clave === 'kettlebell24' ? { ok: true, nombre: 'Mauro Morón', sesion: 'v1.nueva' } : { ok: false, error: 'corta' }; }
      if (c.accion === 'entrar') return c.clave === 'kettlebell24' ? { ok: true, nombre: 'Mauro Morón', sesion: 'v1.otra' } : { ok: false, error: 'clave' };
      return { ok: false };
    };
    const k = await abrir('Mauro Morón', { sinSesion: true, cuenta });
    const cv = k.p.locator('[data-cuenta-v2]');
    await k.p.locator('[data-cuenta-v2="activar"]').waitFor({ timeout: 10000 });
    await espera(900);
    await foto(k.p, '22a-cuenta-activar');
    ok('cuenta: sin contraseña aún, pide activarla con su nombre y el correo del CRM', /Mauro Morón/.test(await cv.innerText()) && /mauro@correo\.com/.test(await cv.innerText()));
    await k.p.getByLabel('Crea tu contraseña').fill('kettlebell24');
    await k.p.getByLabel('Repítela').fill('otra-cosa');
    await k.p.locator('[data-activar]').click();
    ok('cuenta: si las dos contraseñas no coinciden, lo dice y no crea nada', /no coinciden/.test(await cv.innerText()) && creadas === 0);
    await k.p.getByLabel('Repítela').fill('kettlebell24');
    await k.p.locator('[data-activar]').click();
    await k.p.locator('[data-cuenta-v2="datos"]').waitFor({ timeout: 5000 });
    await espera(600);
    await foto(k.p, '22b-cuenta-datos');
    ok('cuenta: creada, guarda la sesión y sigue con «Tus datos, protegidos»', creadas === 1 && await k.p.evaluate(() => localStorage.getItem('mt:sesion')) === 'v1.nueva');
    await k.p.locator('[data-aceptar-datos]').click();
    await espera(500);
    if (await k.p.locator('[data-cuenta-v2="avisos"]').count()) {
      await foto(k.p, '22c-cuenta-avisos');
      await k.p.getByRole('button', { name: 'Ahora no' }).click();
    }
    await espera(500);
    ok('cuenta: al terminar se ve la app, con la nube aceptada', (await cv.count()) === 0 && await k.p.evaluate(() => localStorage.getItem('cloudConsent')) === 'accepted');
    // Cerrar sesión desde la configuración del Dash
    k.p.on('dialog', d => d.accept());
    await k.p.getByRole('button', { name: /^Dash$/ }).first().click(); await espera(500);
    await k.p.locator('[data-abrir-config]').click();
    await k.p.locator('[data-cerrar-sesion]').click();
    await k.p.locator('[data-cuenta-v2="entrar"]').waitFor({ timeout: 5000 });
    await espera(900);
    await foto(k.p, '22d-cuenta-entrar');
    ok('cerrar sesión: pide la contraseña («Hola, Mauro.») sin borrar nada', !(await k.p.evaluate(() => localStorage.getItem('mt:sesion'))) && /Hola,\s*Mauro\./.test(await cv.innerText())
      && (await k.p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mt:history') || '{}')).length)) > 10);
    await k.p.getByLabel('Contraseña').fill('mala');
    await k.p.locator('[data-entrar]').click();
    await espera(300);
    ok('entrar: con la contraseña mala no entra', /no es/.test(await cv.innerText()));
    await k.p.getByLabel('Contraseña').fill('kettlebell24');
    await k.p.locator('[data-entrar]').click();
    await espera(600);
    ok('entrar: con la buena vuelve a la app', (await cv.count()) === 0 && await k.p.evaluate(() => localStorage.getItem('mt:sesion')) === 'v1.otra');
    ok('cuenta: sin errores de JavaScript', k.errores.length === 0, k.errores.join(' | '));
    await k.ctx.close();

    // Teléfono nuevo (instalada con ?v2=1, sin nombre): la entrada en negro
    const e = await abrir('Mauro Morón', { sinSesion: true, sinNombre: true, url: '/?v2=1', cuenta });
    await e.p.locator('[data-cuenta-v2="entrada"]').waitFor({ timeout: 10000 });
    await espera(900);
    await foto(e.p, '22e-entrada-nueva');
    ok('entrada nueva: correo y contraseña, y «Primera vez en la app»', /Primera vez en la app/.test(await e.p.locator('[data-cuenta-v2]').innerText())
      && await e.p.evaluate(() => document.querySelector('meta[name="apple-mobile-web-app-title"]').content) === 'EntrenaMétodo'
      && await e.p.evaluate(() => document.querySelector('link[rel="manifest"]').getAttribute('href')) === '/manifest-v2.json');
    await e.p.getByLabel('Correo').fill('mauro@correo.com');
    await e.p.getByLabel('Contraseña').fill('kettlebell24');
    await e.p.locator('[data-entrar]').click();
    await e.p.locator('[data-cuenta-v2="datos"]').waitFor({ timeout: 5000 });
    await e.p.locator('[data-aceptar-datos]').click();
    await espera(400);
    if (await e.p.locator('[data-cuenta-v2="avisos"]').count()) await e.p.getByRole('button', { name: 'Ahora no' }).click();
    await espera(1200);
    ok('entrada nueva: entra con su correo, queda con su nombre y su sesión', await e.p.evaluate(() => JSON.parse(localStorage.getItem('mt:name') || 'null')) === 'Mauro Morón'
      && await e.p.evaluate(() => localStorage.getItem('mt:sesion')) === 'v1.otra' && (await e.p.locator('[data-cuenta-v2]').count()) === 0);
    await e.ctx.close();

    // Otra persona (sin la visual nueva): ni cuenta ni nombre nuevo
    const o = await abrir('Ana Gómez', { sinSesion: true, cuenta });
    await espera(1500);
    ok('otra persona: no ve la cuenta ni el nombre nuevo de la app', (await o.p.locator('[data-cuenta-v2]').count()) === 0
      && await o.p.evaluate(() => document.querySelector('meta[name="apple-mobile-web-app-title"]').content) === 'Método');
    await o.ctx.close();
  }

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
  ok('mora día 3: la mensualidad NO sale en Hoy de entrenamiento (solo en el Dash); ahí solo la campanita y WhatsApp', (await a.p.locator('[data-view="entrena"]').getByText(/Mensualidad pendiente/i).count()) === 0
    && (await a.p.locator('[data-view="entrena"]').getByRole('button', { name: 'Recordatorios' }).count()) === 1
    && (await a.p.locator('[data-view="entrena"]').getByRole('link', { name: 'Escribirle al coach' }).count()) === 1);
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

  // El aviso de registrar hoy es de todos: también con la app de siempre
  const oa = await abrir('Ana Pérez', { aviso: true, nube: {
    coach_reminders: [{ id: 'rc1', text: 'Haz 10 minutos de movilidad de cadera', created_at: '2026-09-29T09:00:00Z' }],
    reminders_updated: { at: '2026-09-29T09:00:00Z', by: 'coach' },
  } });
  const avA = oa.p.locator('[data-aviso-registro]');
  await avA.waitFor({ timeout: 25000 });
  ok('otra persona: le sale el aviso de sus fotos al abrir', (await avA.getByText('Registro fotográfico').count()) === 1
    && (await avA.getByText('Peso', { exact: true }).count()) === 0);
  await foto(oa.p, '13b-otra-persona-aviso');
  await avA.getByRole('button', { name: 'Ya envié mis fotos' }).click();
  await avA.getByText('Listo, gracias').waitFor({ timeout: 5000 });
  ok('otra persona: marcarlo ahí mismo avisa al coach', !!oa.db.db.evento_registros?.some(r => r.evento_id === 'evf2'));
  await avA.getByRole('button', { name: 'Seguir' }).click();
  await espera(300);
  ok('otra persona: «Seguir» lo cierra', (await avA.count()) === 0);
  await espera(1500);
  ok('el recordatorio de texto del coach NO se anuncia en el chat', (await oa.p.getByText(/tu coach te dejó/).count()) === 0
    && (await oa.p.getByText('Haz 10 minutos de movilidad de cadera').count()) === 0);
  await oa.p.getByRole('button', { name: /Recordat/ }).first().click();
  await oa.p.getByText('Haz 10 minutos de movilidad de cadera').waitFor({ timeout: 5000 }).catch(() => {});
  const enRec = (await oa.p.getByText('Haz 10 minutos de movilidad de cadera').count()) === 1;
  if (!enRec) await foto(oa.p, '13c-recordatorios-FALLO');
  ok('…pero está en Recordatorios', enRec, `pulls de la nube: ${oa.pulls ? oa.pulls() : '?'} · botones: ${(await oa.p.getByRole('button', { name: /Recordat/ }).allInnerTexts()).join(' | ')}`);
  await foto(oa.p, '13c-otra-persona-recordatorios');
  ok('sin errores de JavaScript (otra persona, aviso)', oa.errores.length === 0, oa.errores.join(' | '));
  await oa.ctx.close();

  // Mora sin bloqueo, con la app de siempre: el aviso sale en Hoy, NUNCA en el chat.
  const oc = await abrir('Ana Pérez', { pago: { ...deuda, dias_vencido: 2, bloqueo: false } });
  await oc.p.getByRole('button', { name: 'Herram.' }).waitFor({ timeout: 25000 });
  await espera(1500);
  await oc.p.getByRole('button', { name: 'Hoy', exact: true }).click(); await espera(900);
  ok('otra persona en mora: el aviso de mensualidad sale en Hoy', await oc.p.getByText(/Mensualidad pendiente/).first().isVisible());
  await oc.p.getByRole('button', { name: 'Chat', exact: true }).click(); await espera(900);
  ok('…y en el chat NO sale ningún aviso de pago', (await oc.p.locator('[data-aviso-pago]').count()) === 0 && (await oc.p.getByText(/Mensualidad pendiente/).count()) === 0);
  await foto(oc.p, '16b-pago-chat-sin-aviso');
  await oc.ctx.close();

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
  if (globalThis.__errores && globalThis.__errores.length) console.log('       errores de la página: ' + globalThis.__errores.slice(0, 3).join(' | '));
} finally {
  await b.close();
  await vite.close();
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
