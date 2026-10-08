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
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'America/Bogota' });
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
  const caja = document.querySelector(`[data-cabecera-hoy="${tema}"] .cab-ilus svg`);
  const frase = document.querySelector(`[data-cabecera-hoy="${tema}"] [data-frase]`);
  if (!caja || !frase) return false;
  // Lo dibujado (sin el lienzo vacío): el grupo del personaje.
  const g = caja.querySelector('g').getBoundingClientRect();
  const f = frase.getBoundingClientRect();
  const r = document.createRange(); r.selectNodeContents(frase);
  const lineas = [...r.getClientRects()];
  const derechaTexto = Math.max(...lineas.map(l => l.right));
  // Con el aro al lado, lo que queda junto a la frase es el aro.
  const aro = document.querySelector(`[data-cabecera-hoy="${tema}"] [data-aro-cabecera]`);
  const izq = aro ? Math.min(aro.getBoundingClientRect().left, g.left) : g.left;
  const bien = g.left >= 0 && g.right <= innerWidth && g.top >= 0 && derechaTexto <= izq + 4 && izq - f.right < 40 && g.top < f.bottom
    && (!aro || aro.getBoundingClientRect().right <= g.left + 12);
  if (!bien) console.log('ilusBien', tema, JSON.stringify({ g: [g.left, g.right, g.top], derechaTexto, fRight: f.right, fBottom: f.bottom, w: innerWidth }));
  return bien;
}, tema);
const foto = (p, nombre) => p.screenshot({ path: path.join(CAPTURAS, nombre + '.png') });

try {
  const { p } = await abrir('Mauro Morón');
  await p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
  const dash = p.locator('[data-view="dash"]');
  const foto2 = async (nombre) => { await espera(400); await p.screenshot({ path: '/tmp/claude-0/-home-user/72c7c01f-58d6-5368-9640-a3136112d4a6/scratchpad/ap-' + nombre + '.png' }); };
  for (const k of ['actual', 'apple']) {
    await p.reload(); await p.getByText('Tu performance semanal', { exact: true }).waitFor({ timeout: 25000 });
    await p.addScriptTag({ path: '/tmp/claude-0/-home-user/72c7c01f-58d6-5368-9640-a3136112d4a6/scratchpad/apple-graficas.js' }); await espera(2500);
    if (k === 'apple') await p.evaluate(() => window.__apple());
    await dash.evaluate(el => el.scrollTo(0, 360)); await foto2(k + '-1');
    await dash.evaluate(el => el.scrollTo(0, 1060)); await foto2(k + '-2');
    await p.getByText('Profundiza en tus gráficas de entrenamiento').click(); await espera(1800);
    if (k === 'apple') await p.evaluate(() => { window.__apple(); window.__selector(); });
    await dash.evaluate(el => el.scrollTo(0, 120)); await foto2(k + '-3');
  }
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
