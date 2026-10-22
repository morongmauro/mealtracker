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
const modelosPedidos = [];
const falla55 = { on: false };
// Lo último que mandó la app al chat (para ver qué instrucciones viajan).
const ultimoChat = { texto: '' };
// Lo que la app sube a su cuenta en la nube (POST /api/sync).
const postsNube = [];
// Lo que la app manda para la alarma del descanso minimizada (/api/push-cron?descanso=…).
const avisosDescanso = [];
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
      actividades_catalogo: [
        { slug: 'cinta', nombre: 'Caminadora', categoria: 'cardio', icono: '🏃', remate: true, pide_distancia: true, orden: 10, activo: true },
        { slug: 'eliptica', nombre: 'Elíptica', categoria: 'cardio', icono: '🌀', remate: true, pide_distancia: false, orden: 20, activo: true },
        { slug: 'running', nombre: 'Running en calle', categoria: 'cardio', icono: '👟', remate: false, pide_distancia: true, orden: 60, activo: true },
        { slug: 'caminata', nombre: 'Caminata', categoria: 'cardio', icono: '🚶', remate: false, pide_distancia: true, orden: 70, activo: true },
        { slug: 'natacion', nombre: 'Natación', categoria: 'deporte', icono: '🏊', remate: false, pide_distancia: true, orden: 100, activo: true },
        { slug: 'otro', nombre: 'Otra actividad', categoria: 'otro', icono: '✨', remate: false, pide_distancia: false, orden: 900, activo: true },
      ], notas_entreno: [],
      // Lo que el coach puso para registrar: peso y fotos hoy, medición el miércoles.
      eventos: [
        { id: 'evp', cliente_id: 'c1', fase_id: null, tipo: 'peso', titulo: 'Pesarse en ayunas', fecha: hoy, visible_cliente: true },
        // El cardio de después de entrenar que el coach le dejó hoy.
        { id: 'evc', cliente_id: 'c1', fase_id: null, tipo: 'actividad', titulo: 'Caminadora con inclinación después de entrenar', detalle: 'Inclinación 8-10', duracion_min: 15, fecha: hoy, visible_cliente: true },
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
      // Fotos de progreso de Mauro: tres de frente (la primera y la última con
      // medición cerca; la del medio con su kg) y una sola de lado.
      fotos_progreso: [
        { id: 'fp1', cliente_id: 'c1', fecha: hace(9), pose: 'frente', ruta: 'c1/fp1.jpg', peso_kg: null, nota: null },
        { id: 'fp2', cliente_id: 'c1', fecha: hace(6), pose: 'frente', ruta: 'c1/fp2.jpg', peso_kg: 83.9, nota: null },
        { id: 'fp3', cliente_id: 'c1', fecha: hace(0), pose: 'frente', ruta: 'c1/fp3.jpg', peso_kg: null, nota: null },
        { id: 'fp4', cliente_id: 'c1', fecha: hace(0), pose: 'lado', ruta: 'c1/fp4.jpg', peso_kg: null, nota: null },
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
    // Las ventanas de primera vez ya vistas (se prueban aparte).
    'mt:primeraVezVista': '1',
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
  ? (await build({ root: raiz, logLevel: 'error' }), await preview({ root: raiz, logLevel: 'error', preview: { port: 5215, strictPort: true } }))
  : await createServer({ root: raiz, logLevel: 'error', server: { port: 5215, strictPort: true } });
if (!process.env.PROD) await vite.listen();
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

let fallos = 0;
const ok = (nombre, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${nombre}${c ? '' : '  ' + extra}`); };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

// `aviso`: dejar que salga el aviso de «hoy te toca registrar» al abrir. Por
// defecto se da por visto (si no, tapa todo lo que se prueba después).
// `nube`: lo que tiene su cuenta en la nube (y la app con la nube aceptada).
async function abrir(nombre, { ancho = 390, pago = null, aviso = false, nube = null, caliente = false, sinSesion = false, sinNombre = false, url = '/', cuenta = null, extra = null, instalada = false, verComo = null, bitacora = null, ua = null, instalable = false, ajustar = null } = {}) {
  const db = base();
  // `ajustar`: tocar la base falsa antes de abrir (otra fase, otro ciclo…).
  if (ajustar) ajustar(db);
  globalThis.fetch = db.fetch;
  const ctx = await b.newContext({ viewport: { width: ancho, height: 844 }, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'America/Bogota', ...(ua ? { userAgent: ua } : {}) });
  // `instalable`: el navegador ya ofreció su instalador (beforeinstallprompt).
  if (instalable) await ctx.addInitScript(() => { window.__pwaPrompt = { prompt() { window.__pwaPrompted = true; }, userChoice: new Promise(() => {}) }; });
  await ctx.clock.setFixedTime(new DateReal(FIJO));
  const p = await ctx.newPage();
  const errores = [];
  globalThis.__errores = errores;   // para decir por qué se cortó, si se corta
  let pulls = 0;
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.text().startsWith('ilusBien')) console.log('   ' + m.text()); });
  const guardado = almacen(nombre);
  // Lo que era la vista en prueba ya es de todos (PRUEBA_TODOS en
  // src/vistaApp.js). Las pruebas de siempre siguen mirando la vista de antes
  // con este apagador de pruebas; las de «para todos» lo quitan (extra null).
  guardado['mt:pruebaTodos'] = '0';
  if (sinNombre) { delete guardado['mt:name']; delete guardado['mt:goals']; }
  if (extra) for (const [k, v] of Object.entries(extra)) { if (v === null) delete guardado[k]; else guardado[k] = v; }
  // Mauro ya entró con su contraseña (la cuenta se prueba aparte, sinSesion)
  if (!sinSesion) guardado['mt:sesion'] = 'v1.prueba';
  await ctx.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, guardado);
  // `caliente`: la usó hace un rato (antes caía en el Chat; ahora, en el Dash).
  if (caliente) await ctx.addInitScript(() => localStorage.setItem('mt:lastActiveAt', String(Date.now() - 5 * 60 * 1000)));
  if (!aviso) await ctx.addInitScript((f) => sessionStorage.setItem('mt:avisoRegistro', f), hoy);
  if (nube) await ctx.addInitScript(() => { localStorage.setItem('cloudConsent', 'accepted'); localStorage.setItem('cloudUserId', 'u-nube'); });
  // `instalada`: abierta desde el ícono de la pantalla de inicio.
  if (instalada) await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'standalone', { get: () => true }); } catch (e) {} });
  await p.route('**/api/**', async (ruta) => {
    const u = new URL(ruta.request().url());
    if (u.pathname === '/api/training') {
      const cuerpo = JSON.parse(ruta.request().postData() || '{}');
      // Red lenta a propósito (solo donde la prueba lo pide).
      if (lento.accion && cuerpo.accion === lento.accion) await new Promise(r => setTimeout(r, lento.ms));
      const r = await llamar(handler, cuerpo);
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
    }
    if (u.pathname === '/api/push-cron' && u.searchParams.get('descanso')) {
      try { avisosDescanso.push({ que: u.searchParams.get('descanso'), body: JSON.parse(ruta.request().postData() || '{}') }); } catch (e) {}
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    if (u.pathname === '/api/sync' && nube && ruta.request().method() !== 'POST' && u.searchParams.get('identity_for') == null) pulls++;
    if (u.pathname === '/api/sync' && nube) {
      const json = (o) => ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
      if (ruta.request().method() === 'POST') { try { postsNube.push(JSON.parse(ruta.request().postData() || '{}')); } catch (e) {} return json({ ok: true }); }
      if (u.searchParams.get('identity_for') != null) return json({ user_id: 'u-nube' });
      return json({ name: nombre, data: nube, ...nube });
    }
    if (u.pathname === '/api/payment-status') {
      const estado = typeof pago === 'function' ? pago() : pago;
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(estado || { due: false }) });
    }
    // El chat: «2 huevos» se registra como comida (para ver el «+kcal»).
    if (u.pathname === '/api/chat') {
      // Modelos pedidos (para la prueba del respaldo). Con `falla55`, los
      // 5.5 contestan 400 como si la API no los aceptara.
      let pedido = {};
      try { pedido = JSON.parse(ruta.request().postData() || '{}'); } catch (e) {}
      modelosPedidos.push(pedido.model);
      if (falla55.on && /^claude-(haiku|sonnet)-5-5/.test(pedido.model || '')) return ruta.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'modelo no disponible' }) });
      const huevos = { intent: 'log_meal', meal: 'snack', log_date: null, items: [{ name: 'Huevo', amount: '2 unidades', kcal: 156, p: 12.6, c: 1.1, g: 10.6, fiber: 0, omega3: 0, sugar: 0, needs_quantity: false }], message: null };
      // Lo último que escribió el cliente (el resto del pedido trae el
      // historial y el prompt, que pueden nombrar cualquier comida).
      let ultimo = '';
      try { const cuerpo = JSON.parse(ruta.request().postData() || '{}'); const ms = (cuerpo.messages || []).filter(m => m.role === 'user'); const c = ms.length ? ms[ms.length - 1].content : ''; ultimo = typeof c === 'string' ? c : JSON.stringify(c); } catch (e) { ultimo = ruta.request().postData() || ''; }
      ultimoChat.texto = ultimo;
      // Pesado en crudo: el chat lo registra con los valores del crudo y su equivalente cocido.
      if (/pollo crudo/.test(ultimo)) {
        const crudo = { intent: 'log_meal', meal: 'lunch', log_date: null, items: [{ name: 'pechuga de pollo', amount: '200 g crudo (≈150 g cocido)', kcal: 240, p: 45, c: 0, g: 5.2, fiber: 0, omega3: 0, sugar: 0, needs_quantity: false }], message: null };
        return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(crudo) }] }) });
      }
      // Una consulta (no registra): para ver el estilo de las demás respuestas.
      if (/manzana/.test(ultimo)) {
        const consulta = { intent: 'nutrition_query', nutrition_response: { food: 'Manzana', amount: '1 mediana (180 g)', kcal: 95, p: 0.5, c: 25, g: 0.3 }, message: null };
        return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(consulta) }] }) });
      }
      // «almuerzo grande» llena el día: para ver la hoja de meta cumplida.
      if (/almuerzo grande/.test(ultimo)) {
        const grande = { intent: 'log_meal', meal: 'lunch', log_date: null, items: [{ name: 'Almuerzo', amount: '1 plato', kcal: 2300, p: 152, c: 240, g: 62, fiber: 0, omega3: 0, sugar: 0, needs_quantity: false }], message: null };
        return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(grande) }] }) });
      }
      return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(huevos) }] }) });
    }
    if (u.pathname === '/api/resources') return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://centro.test/', training: true }) });
    // «Ver como cliente»: el pase vale si la prueba lo dice (verComo = el nombre del cliente).
    if (u.pathname === '/api/ver-como') return ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verComo ? { ok: true, name: verComo, user_id: '22222222-3333-4444-5555-666666666666', exp: Date.now() + 15 * 60 * 1000 } : { ok: false, error: 'pase_vencido' }) });
    // La bitácora de errores: se anota lo que la app reporta.
    if (u.pathname === '/api/bitacora') { try { (bitacora || []).push(JSON.parse(ruta.request().postData() || '{}')); } catch (e) {} return ruta.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
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
  await p.goto('http://localhost:5215' + url);
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
  // El blob del módulo a la derecha de la frase, sin taparla y entero en la
  // pantalla; encima, el aro en blanco; el objeto (a dos colores, nítido) y el
  // número ADENTRO del aro; el pie debajo del blob.
  const aro = document.querySelector(`[data-cabecera-hoy="${tema}"] [data-aro-cabecera]`);
  const an = aro && aro.querySelector('[data-anillo]');
  const centro = aro && aro.querySelector('[data-aro-centro]');
  const blob = aro && aro.querySelector('svg[data-blob]');
  const pie = aro && aro.querySelector('[data-aro-pie]');
  if (!an || !centro || !blob) { console.log('ilusBien', tema, 'sin gráfica'); return false; }
  // La caja del blob sin girar (el svg girado sobresale por las esquinas).
  const a = an.getBoundingClientRect(), k = centro.getBoundingClientRect(), b = aro.querySelector('[data-blob-cabecera]').getBoundingClientRect(), pf = pie ? pie.getBoundingClientRect() : null;
  const opac = Number(getComputedStyle(caja.parentElement.parentElement).opacity);
  const bien = a.width >= 88 && b.left >= 0 && b.right <= innerWidth - 4 && derechaTexto <= b.left + 4
    && g.left >= a.left && g.right <= a.right && g.top >= a.top && g.bottom <= a.bottom && (g.right - g.left) <= 64 && opac === 1
    && k.top >= a.top && k.bottom <= a.bottom + 1 && Math.abs((k.left + k.right) / 2 - (a.left + a.right) / 2) <= 4 && f.top < a.bottom
    && caja.dataset.tono === 'dos' && getComputedStyle(centro).color === ({ dash: 'rgb(60, 123, 214)', entreno: 'rgb(95, 102, 112)', comida: 'rgb(70, 150, 90)', aprende: 'rgb(238, 132, 52)' })[tema]
    && (!pf || pf.top >= b.bottom - 2);
  if (!bien) console.log('ilusBien', tema, JSON.stringify({ g: [g.left, g.right, g.top, g.bottom], a: [a.left, a.right, a.top, a.bottom], b: [b.left, b.right, b.bottom], derechaTexto, opac, k: [k.left, k.top, k.bottom], tono: caja.dataset.tono }));
  return bien;
}, tema);
// El recorrido completo (ya no se puede saltar): Empezar y Siguiente hasta Finalizar.
const hacerRecorrido = async (p) => {
  await p.locator('[data-empezar-recorrido]').click();
  await p.locator('[data-recorrido]').waitFor({ timeout: 8000 });
  for (let i = 0; i < 20 && await p.locator('[data-recorrido]').count(); i++) { await p.locator('[data-rec-siguiente]').click(); await espera(250); }
};
const foto = (p, nombre) => p.screenshot({ path: path.join(CAPTURAS, nombre + '.png') });

try {
  // MAQUETA=archivo.json: fotos de propuestas visuales SIN tocar la app. Cada
  // variante trae { nombre, css, js, pantallas } y se pinta encima de la app
  // real de Mauro; MAQUETA_FUENTES=carpeta sirve letras en https://maqueta.fuentes/.
  if (process.env.MAQUETA) {
    const variantes = JSON.parse(fs.readFileSync(process.env.MAQUETA, 'utf8'));
    for (const v of variantes) {
      // `prueba`: con la «Vista en prueba».
      const pv = await abrir('Mauro Morón', { caliente: true, ...(v.prueba ? { extra: { 'mt:vistaApp': JSON.stringify({ modo: 'prueba', desde: '2026-01-01T00:00:00.000Z', por: 'cliente' }) } } : {}) });
      const p = pv.p;
      // `alto`: un teléfono muy alto, para ver de una vez cómo sigue el fondo al bajar.
      if (v.alto) await p.setViewportSize({ width: 390, height: v.alto });
      if (process.env.MAQUETA_FUENTES) await p.route('https://maqueta.fuentes/**', r => r.fulfill({ status: 200, contentType: 'font/ttf', body: fs.readFileSync(path.join(process.env.MAQUETA_FUENTES, new URL(r.request().url()).pathname.slice(1))) }));
      const pintar = async () => {
        if (v.css) await p.addStyleTag({ content: v.css });
        if (v.js) await p.evaluate(v.js);
      };
      await espera(4500); await pintar();
      const tomar = async (n, { completa = false, alto = v.alto || 844 } = {}) => {
        await espera(2600); await pintar(); await espera(400);
        await p.screenshot({ path: path.join(CAPTURAS, `maq-${v.nombre}-${n}.png`), fullPage: completa, ...(completa ? {} : { clip: { x: 0, y: 0, width: 390, height: alto } }) });
      };
      const quiere = (n) => !v.pantallas || v.pantallas.includes(n);
      if (quiere('dash')) await tomar('dash', { completa: !!v.completa });
      if (quiere('entreno') || quiere('rutina')) {
        await p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click();
        if (quiere('entreno')) await tomar('entreno', { completa: !!v.completa });
        if (quiere('rutina')) {
          await p.locator(`[data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click().catch(() => {});
          await p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 }).catch(() => {});
          await p.locator('[data-tip-entendido]').click().catch(() => {});
          await p.locator('[data-ejercicio="Barbell Bench Press"]').evaluate(el => el.scrollIntoView({ block: 'center' })).catch(() => {});
          await tomar('rutina');
          await p.locator('[data-volver-semana]').first().click().catch(() => {});
          await espera(800);
        }
      }
      if (quiere('comida')) {
        await p.getByRole('button', { name: 'Alimentación', exact: true }).click(); await espera(600);
        await p.getByRole('button', { name: 'Hoy', exact: true }).click().catch(() => {});
        await tomar('comida', { completa: !!v.completa });
      }
      if (quiere('aprende')) {
        await p.getByRole('button', { name: 'Aprendizaje', exact: true }).click();
        await p.locator('[data-cabecera-hoy="aprende"]').waitFor({ timeout: 15000 }).catch(() => {});
        await tomar('aprende');
      }
      console.log('maqueta', v.nombre, 'errores', pv.errores.slice(0, 3));
      await pv.ctx.close();
    }
    await b.close(); await vite.close(); process.exit(0);
  }
  // VISTA=1: solo las fotos de la prueba de la gráfica grande en las cabeceras.
  if (process.env.VISTA) {
    // VISTA_PRUEBA=1: con la «Vista en prueba».
    const pv = await abrir('Mauro Morón', { caliente: true, ...(process.env.VISTA_PRUEBA || process.env.VISTA_MODO ? { extra: { 'mt:vistaApp': JSON.stringify({ modo: process.env.VISTA_MODO || 'prueba', desde: '2026-01-01T00:00:00.000Z', por: 'cliente' }) } } : {}) });
    await espera(4500);
    // VISTA_COMPACTA=1 (con VISTA_MODO=compacta): las pantallas de la vista compacta.
    if (process.env.VISTA_COMPACTA) {
      const f = async (n) => { await espera(2200); await pv.p.screenshot({ path: path.join(CAPTURAS, `compacta-${n}.png`) }); };
      const ir = async (b) => { await pv.p.locator(`[data-compacta-boton="${b}"]`).click().catch(() => {}); };
      console.log('DBG', await pv.p.evaluate(() => [document.documentElement.hasAttribute('data-vista-prueba'), document.documentElement.hasAttribute('data-fondo-blanco'), localStorage.getItem('mt:vistaApp'), localStorage.getItem('mt:name')].join(' | ')));
      await ir('entreno'); await f('entreno');
      await pv.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-chip]`).first().click().catch(() => {}); await f('rutina');
      await pv.p.locator('[data-volver-semana], [data-volver]').first().click().catch(() => {}); await espera(800);
      await ir('comida'); await f('comida');
      await ir('mas'); await f('mas');
      console.log('errores', pv.errores.slice(0, 3)); await pv.ctx.close(); await b.close(); await vite.close(); process.exit(0);
    }
    // VISTA_CHAT=1: el chat de Alimentación (en la vista que diga VISTA_MODO).
    if (process.env.VISTA_CHAT) {
      if (await pv.p.locator('[data-compacta-boton="comida"]').count()) await pv.p.locator('[data-compacta-boton="comida"]').click();
      else { await pv.p.getByRole('button', { name: 'Alimentación', exact: true }).click().catch(() => {}); await espera(600); await pv.p.getByRole('button', { name: 'Chat', exact: true }).click().catch(() => {}); }
      await espera(2500); await pv.p.screenshot({ path: path.join(CAPTURAS, `chat-${process.env.VISTA_MODO || 'prueba'}.png`) });
      console.log('errores', pv.errores.slice(0, 3)); await pv.ctx.close(); await b.close(); await vite.close(); process.exit(0);
    }
    // VISTA_SIN_ARO=1: el aro y el objeto se esconden (para componer propuestas encima).
    if (process.env.VISTA_SIN_ARO) await pv.p.addStyleTag({ content: '[data-aro-cabecera],[data-ilus-cabecera],[data-objeto-cabecera]{visibility:hidden!important}' });
    const cab = async (n) => { await espera(2600); await pv.p.screenshot({ path: path.join(CAPTURAS, `vista-${n}.png`), clip: { x: 0, y: 0, width: 390, height: 420 } });
      // VISTA_MEDIR=1: la franja curva de cada sección (alto, ancho, dónde) y la barra de abajo.
      if (process.env.VISTA_MEDIR) {
        const m = await pv.p.evaluate(() => { return [...document.querySelectorAll('[data-banda]')].map(b => { const r = b.getBoundingClientRect(), cab = b.closest('[data-cabecera-hoy]'), cr = cab.getBoundingClientRect(); return { tema: cab.dataset.cabeceraHoy, top: Math.round(r.top), alto: Math.round(r.height), ancho: Math.round(r.width), cabTop: Math.round(cr.top), vis: b.checkVisibility({ opacityProperty: true, visibilityProperty: true }), blobTop: (() => { const x = cab.querySelector('[data-blob-cabecera]'); return x ? Math.round(x.getBoundingClientRect().top) : null; })() }; }); });
        console.log('banda', n, JSON.stringify(m));
        await pv.p.screenshot({ path: path.join(CAPTURAS, `vista-barra-${n}.png`), clip: { x: 0, y: 844 - 110, width: 390, height: 110 } });
      } };
    await cab('dash');
    await pv.p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await cab('entreno');
    await pv.p.getByRole('button', { name: 'Alimentación', exact: true }).click(); await espera(600);
    await pv.p.getByRole('button', { name: 'Hoy', exact: true }).click().catch(() => {}); await cab('comida');
    await pv.p.getByRole('button', { name: 'Aprendizaje', exact: true }).click(); await pv.p.locator('[data-cabecera-hoy="aprende"]').waitFor({ timeout: 15000 }).catch(() => {}); await espera(2000); await cab('aprende');
    // VISTA_TIRA=1: fotos seguidas mientras cambia de Entreno a Dash.
    if (process.env.VISTA_TIRA) {
      await pv.p.locator('nav [data-seccion-boton="entreno"]').click().catch(() => {}); await espera(1500);
      await pv.p.evaluate(() => document.querySelector('nav [data-seccion-boton="dash"]').click());
      for (let i = 0; i < 10; i++) { await pv.p.screenshot({ path: path.join(CAPTURAS, `tira-${i}.png`), clip: { x: 0, y: 0, width: 390, height: 844 } }); }
    }
    // VISTA_LENTO=1: el cambio de sección a cámara lenta (x0,05), fotos seguidas.
    if (process.env.VISTA_LENTO) {
      const cdp = await pv.ctx.newCDPSession(pv.p); await cdp.send('Animation.enable');
      for (const [de, a] of JSON.parse(process.env.VISTA_LENTO_PASOS || '[["dash","entreno"],["entreno","comida"],["comida","dash"]]')) {
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
        await pv.p.evaluate((de) => document.querySelector(`nav [data-seccion-boton="${de}"]`)?.click(), de); await espera(1800);
        await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.05 });
        await pv.p.evaluate((a) => document.querySelector(`nav [data-seccion-boton="${a}"]`).click(), a);
        for (let i = 0; i < 8; i++) { await pv.p.screenshot({ path: path.join(CAPTURAS, `lento-${de}-${a}-${i}.png`), clip: { x: 0, y: 0, width: 390, height: 844 } }); await espera(450); }
      }
      await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
    }
    // VISTA_CINE=1: cada cuadro pintado (tiempo real) al cambiar de sección.
    if (process.env.VISTA_CINE) {
      const cdp = await pv.ctx.newCDPSession(pv.p);
      for (const [de, a] of JSON.parse(process.env.VISTA_LENTO_PASOS || '[["dash","entreno"],["entreno","comida"],["comida","dash"]]')) {
        await pv.p.evaluate((de) => document.querySelector(`nav [data-seccion-boton="${de}"]`)?.click(), de); await espera(1800);
        let n = 0; const t0 = Date.now();
        const h = async (f) => { const i = n++; if (i < 40) fs.writeFileSync(path.join(CAPTURAS, `cine-${de}-${a}-${String(i).padStart(2, '0')}-${Date.now() - t0}.jpg`), Buffer.from(f.data, 'base64')); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); };
        cdp.on('Page.screencastFrame', h);
        await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, everyNthFrame: 1 });
        await espera(150);
        await pv.p.evaluate((a) => document.querySelector(`nav [data-seccion-boton="${a}"]`).click(), a);
        await espera(900);
        await cdp.send('Page.stopScreencast'); cdp.off('Page.screencastFrame', h);
      }
    }
    // VISTA_TRANS=1: qué se mueve, cuadro a cuadro, al cambiar de sección.
    if (process.env.VISTA_TRANS) {
      for (const [de, a] of [['entreno', 'dash'], ['dash', 'comida'], ['comida', 'entreno'], ['entreno', 'aprende'], ['aprende', 'dash']]) {
        await pv.p.locator(`nav [data-seccion-boton="${de}"]`).click().catch(() => {}); await espera(1200);
        const r = await pv.p.evaluate(async (a) => {
          const frames = [];
          const medir = () => {
            const capas = [...document.querySelectorAll('[data-capa-v2]')].map(c => ({ v: c.dataset.view || (c.hasAttribute('data-aprende') ? 'aprende' : '?'), act: c.hasAttribute('data-activa'), op: +getComputedStyle(c).opacity, tr: getComputedStyle(c).transform, h1: (() => { const h = c.querySelector('[data-cabecera-hoy] h1'); return h ? Math.round(h.getBoundingClientRect().top * 10) / 10 : null; })(), st: c.scrollTop }));
            const nav = document.querySelector('nav[aria-label="Secciones"]'); const nr = nav && nav.getBoundingClientRect();
            frames.push({ t: Math.round(performance.now()), capas, nav: nr ? [Math.round(nr.left), Math.round(nr.width)] : null });
          };
          document.querySelector(`nav [data-seccion-boton="${a}"]`).click();
          const t0 = performance.now();
          await new Promise(res => { const f = () => { medir(); if (performance.now() - t0 < 600) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
          return frames;
        }, a);
        // Resumen: saltos de posición (h1 o scroll) de la capa que entra o sale, y cambios de transform.
        const salt = []; let prev = null;
        for (const fr of r) { if (prev) fr.capas.forEach((c, i) => { const p = prev.capas[i]; if (!p) return; if (c.h1 != null && p.h1 != null && Math.abs(c.h1 - p.h1) > 0.5) salt.push(`${fr.t - r[0].t}ms ${c.v} h1 ${p.h1}->${c.h1}`); if (c.st !== p.st) salt.push(`${fr.t - r[0].t}ms ${c.v} scroll ${p.st}->${c.st}`); if (c.tr !== p.tr) salt.push(`${fr.t - r[0].t}ms ${c.v} transform ${c.tr}`); }); prev = fr; }
        const ops = r.filter((_, i) => i % 3 === 0).map(fr => fr.capas.map(c => `${c.v}:${c.op.toFixed(2)}`).join(' ')).join(' | ');
        console.log(`TRANS ${de}->${a}: ${salt.slice(0, 12).join('; ') || 'sin saltos'}\n   opacidades: ${ops.slice(0, 600)}`);
      }
    }
    // VISTA_SUBS=1: también Calendario y Galería de Entreno, y Recetas y Calendario de Alimentación.
    if (process.env.VISTA_SUBS) {
      const sub = async (sec, nombre, archivo) => {
        await pv.p.locator(`nav [data-seccion-boton="${sec}"]`).click().catch(() => {}); await espera(700);
        await pv.p.getByRole('button', { name: nombre, exact: true }).first().click().catch(() => {}); await espera(2400);
        await pv.p.screenshot({ path: path.join(CAPTURAS, `vista-sub-${archivo}.png`) });
      };
      await sub('entreno', 'Calendario', 'calendario'); await sub('entreno', 'Galería', 'galeria');
      await sub('comida', 'Recetas', 'recetas'); await sub('comida', 'Calendario', 'cal-comida');
      for (const [t, n] of [['Semana', 'cal-comida-semana'], ['Día', 'cal-comida-dia']]) {
        await pv.p.getByRole('button', { name: t, exact: true }).first().click().catch(() => {}); await espera(1500);
        await pv.p.evaluate(() => { const el = document.querySelector('[data-view="calendario-comida"]'); if (el) el.scrollTop = 600; }); await espera(700);
        await pv.p.screenshot({ path: path.join(CAPTURAS, `vista-sub-${n}.png`) });
      }
    }
    console.log('errores', pv.errores.slice(0, 3));
    await pv.ctx.close(); await b.close(); await vite.close(); process.exit(0);
  }
  // FOTOS=1: fotos sueltas para propuestas (separadores del Dash en tres
  // variantes y el circuito de la rutina tal como está).
  if (process.env.FOTOS) {
    const pv = await abrir('Mauro Morón', { caliente: true });
    const dash = pv.p.locator('[data-view="dash"]');
    await dash.getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 });
    await espera(2000);
    const VARIANTES = {
      sin: '',
      gris: '[data-seccion]{margin-top:26px!important}[data-seccion]::before{content:"";display:block;height:1px;background:rgba(31,31,31,.09);margin:0 2px 16px}',
      azul: '[data-seccion]{margin-top:22px!important}[data-seccion]::before{content:"";display:block;height:2px;border-radius:9px;background:rgba(60,123,214,.55);margin:0 2px 12px;width:44px}',
    };
    for (const [k, css] of Object.entries(VARIANTES)) {
      await pv.p.evaluate((css) => { let st = document.getElementById('foto-css'); if (!st) { st = document.createElement('style'); st.id = 'foto-css'; document.head.appendChild(st); } st.textContent = css; }, css);
      await dash.evaluate(el => { const t = el.querySelector('[data-seccion]'); el.scrollTop = t.getBoundingClientRect().top + el.scrollTop - 150; });
      await espera(500);
      await pv.p.screenshot({ path: path.join(CAPTURAS, `separadores-${k}.png`) });
    }
    await pv.p.evaluate(() => { document.getElementById('foto-css').textContent = ''; });
    await pv.p.getByRole('button', { name: 'Entrenamiento', exact: true }).click();
    await espera(1200);
    await pv.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
    await pv.p.locator('[data-circuito]').first().waitFor({ timeout: 10000 });
    await espera(1200);
    await pv.p.locator('[data-circuito]').first().screenshot({ path: path.join(CAPTURAS, 'circuito-actual.png') });
    await pv.p.screenshot({ path: path.join(CAPTURAS, 'circuito-pantalla.png') });
    console.log('errores', pv.errores.slice(0, 3));
    await pv.ctx.close(); await b.close(); await vite.close(); process.exit(0);
  }
  // RECARGA=1: solo la prueba de recargar a mitad del entreno, con rastro.
  if (process.env.RECARGA) {
    const rr = await abrir('Mauro Morón', { caliente: true });
    await rr.p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await espera(800);
    await rr.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
    await rr.p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 });
    const bancaR = rr.p.locator('[data-ejercicio="Barbell Bench Press"]');
    await bancaR.getByLabel('Repeticiones serie 1').fill('8');
    await bancaR.getByLabel('Peso serie 1').fill('60');
    await bancaR.getByRole('button', { name: 'Marcar serie 1' }).click(); await espera(400);
    console.log('antes de recargar: deshacer =', await bancaR.getByRole('button', { name: 'Deshacer serie 1' }).count(), 'marcar =', await bancaR.getByRole('button', { name: 'Marcar serie 1' }).count());
    await bancaR.getByLabel('Repeticiones serie 2').fill('7'); await espera(300);
    await rr.p.reload();
    for (let i = 1; i <= 8; i++) {
      await espera(1000);
      const b2 = rr.p.locator('[data-ejercicio="Barbell Bench Press"]');
      console.log(`${i}s: warm=${await rr.p.evaluate(() => document.documentElement.className)} ready=${await rr.p.evaluate(() => document.body.classList.contains('app-ready'))} calent=${await rr.p.getByText('Calentamiento y movilidad').count()} deshacer=${await b2.getByRole('button', { name: 'Deshacer serie 1' }).count()} deshacerTodos=${await rr.p.getByRole('button', { name: /Deshacer serie/ }).count()} marcar1=${await b2.getByRole('button', { name: 'Marcar serie 1' }).count()} rep2=${await b2.getByLabel('Repeticiones serie 2').inputValue().catch(() => '?')}`);
      if (i === 3 || i === 6) await rr.p.screenshot({ path: path.join(CAPTURAS, `recarga-${i}s.png`) });
    }
    console.log('errores', rr.errores.slice(0, 3));
    await rr.ctx.close(); await b.close(); await vite.close(); process.exit(0);
  }
  // BARRA=1: el cristal que viaja al cambiar de sección, cuadro a cuadro.
  if (process.env.BARRA) {
    const pv = await abrir('Mauro Morón', { caliente: true });
    await pv.p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 });
    await pv.p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await espera(1200);
    const nav = pv.p.locator('nav[aria-label="Secciones"]');
    const caja = await nav.boundingBox();
    const clip = { x: 0, y: Math.max(0, caja.y - 70), width: 390, height: Math.min(844 - Math.max(0, caja.y - 70), caja.height + 90) };
    await pv.p.screenshot({ path: path.join(CAPTURAS, 'barra-0.png'), clip });
    // Se congelan las animaciones recién creadas y se recorren a mano: la
    // captura tarda más que un cuadro y, en vivo, los tiempos se corren.
    await pv.p.getByRole('button', { name: 'Alimentación', exact: true }).click();
    await pv.p.evaluate(() => document.getAnimations().forEach(a => { if (a.playState === 'running') a.pause(); }));
    console.log('animaciones', await pv.p.evaluate(() => document.getAnimations().length));
    for (const t of [40, 120, 200, 280, 380, 520, 800]) {
      await pv.p.evaluate(t => document.getAnimations().forEach(a => { try { a.currentTime = Math.min(t, (a.effect.getTiming().duration || 0) + (a.effect.getTiming().delay || 0)); } catch (e) {} }), t);
      await espera(60);
      await pv.p.screenshot({ path: path.join(CAPTURAS, `barra-${t}.png`), clip });
    }
    console.log('lente', await pv.p.locator('[data-lente]').evaluate(l => ({ op: getComputedStyle(l).opacity, w: l.getBoundingClientRect().width })));
    console.log('errores', pv.errores.slice(0, 3));
    await pv.ctx.close(); await b.close(); await vite.close(); process.exit(0);
  }
  // INSTALAR=1: las fotos de «Instala la app» en un Android (Dash, Ajustes y la hoja).
  if (process.env.INSTALAR) {
    const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
    const pv = await abrir('Mauro Morón', { caliente: true, ua: ANDROID, instalable: true });
    await pv.p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 });
    await espera(2500);
    await pv.p.screenshot({ path: path.join(CAPTURAS, 'instalar-1-dash.png') });
    await pv.p.locator('[data-view="dash"] [data-abrir-config]').click();
    await pv.p.locator('[data-config="instalar"]').waitFor({ timeout: 5000 });
    await espera(600);
    await pv.p.screenshot({ path: path.join(CAPTURAS, 'instalar-2-ajustes.png') });
    await pv.p.locator('[data-config="instalar"]').click();
    await pv.p.locator('[data-instalar-app] [data-instalar]').waitFor({ timeout: 5000 });
    await espera(600);
    await pv.p.screenshot({ path: path.join(CAPTURAS, 'instalar-3-hoja.png') });
    console.log('errores', pv.errores.slice(0, 3));
    await pv.ctx.close(); await b.close(); await vite.close(); process.exit(0);
  }
  {
    const DIR = process.env.PDIR; const VP = JSON.stringify({ modo: 'prueba', desde: '2026-01-01T00:00:00.000Z', por: 'cliente' });
    const l = await abrir('Mauro Morón', { caliente: true, extra: { 'mt:vistaApp': VP } }); const p = l.p;
    await p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 }); await espera(1200);
    await p.locator('[data-view="dash"] [data-aro-tocar]').first().click(); await p.locator('[data-explicacion-aro]').waitFor({ timeout: 5000 }); await espera(700);
    await p.screenshot({ path: `${DIR}/${process.env.TAG}-aro.png` }); await p.keyboard.press('Escape'); await espera(500);
    await p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await espera(1500);
    await p.getByText('Añadir cardio o deporte', { exact: true }).click(); await espera(1200);
    await p.screenshot({ path: `${DIR}/${process.env.TAG}-actividad.png` }); await p.keyboard.press('Escape'); await espera(500);
    await p.locator('[data-abrir-config]').click().catch(() => {}); await espera(300);
    await p.getByRole('button', { name: 'Dash', exact: true }).first().click().catch(() => {}); await espera(1000);
    await p.locator('[data-abrir-config]').click(); await espera(900);
    await p.getByText('Notificaciones', { exact: true }).click().catch(() => {}); await espera(900); await p.screenshot({ path: `${DIR}/${process.env.TAG}-avisos.png` });
    await l.ctx.close();
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
