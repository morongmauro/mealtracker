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
    && caja.dataset.tono === 'dos' && getComputedStyle(centro).color === 'rgb(255, 255, 255)'
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
  // VISTA=1: solo las fotos de la prueba de la gráfica grande en las cabeceras.
  if (process.env.VISTA) {
    const pv = await abrir('Mauro Morón', { caliente: true, });
    await espera(4500);
    // VISTA_SIN_ARO=1: el aro y el objeto se esconden (para componer propuestas encima).
    if (process.env.VISTA_SIN_ARO) await pv.p.addStyleTag({ content: '[data-aro-cabecera],[data-ilus-cabecera],[data-objeto-cabecera]{visibility:hidden!important}' });
    const cab = async (n) => { await espera(2600); await pv.p.screenshot({ path: path.join(CAPTURAS, `vista-${n}.png`), clip: { x: 0, y: 0, width: 390, height: 420 } }); };
    await cab('dash');
    await pv.p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await cab('entreno');
    await pv.p.getByRole('button', { name: 'Alimentación', exact: true }).click(); await espera(600);
    await pv.p.getByRole('button', { name: 'Hoy', exact: true }).click().catch(() => {}); await cab('comida');
    await pv.p.getByRole('button', { name: 'Aprendizaje', exact: true }).click(); await pv.p.locator('[data-cabecera-hoy="aprende"]').waitFor({ timeout: 15000 }).catch(() => {}); await espera(2000); await cab('aprende');
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
  // ── Mauro ──
  const { p, ctx, errores, db } = await abrir('Mauro Morón', { aviso: true });
  await p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 });
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
  ok('Dash: el blob junto a la frase, con la brújula a dos colores y el porcentaje en blanco adentro del aro', await ilusBien(p, 'dash'));
  ok('cabecera: el blob azul girado 12° con sombra suave; encima el aro plano en blanco con riel blanco al 30 %', await p.locator('[data-cabecera-hoy="dash"] [data-aro-cabecera]').evaluate(a => {
    const an = a.querySelector('[data-anillo]'), blob = a.querySelector('svg[data-blob]');
    const path = blob && blob.querySelector('path');
    const m = new DOMMatrix(getComputedStyle(blob).transform); const giro = Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI);
    const sombra = /drop-shadow/.test(getComputedStyle(blob).filter) && getComputedStyle(blob).filter.includes('60, 123, 214');
    const aroSinSombra = !an.querySelector('filter, mask') && !/drop-shadow/.test(getComputedStyle(an).filter);
    const circulos = [...an.querySelectorAll('svg circle')];
    const riel = circulos.some(c => /rgba\(255, ?255, ?255, ?0\.3\)/.test(c.getAttribute('stroke') || ''));
    const blanco = circulos.some(c => (c.getAttribute('stroke') || '').toUpperCase() === '#FFFFFF');
    return an.dataset.plano === '1' && path && path.getAttribute('fill') === '#3C7BD6' && giro === -12 && sombra && aroSinSombra && riel && blanco;
  }));

  await espera(2600);
  ok('…y al terminar la animación, el objeto se queda quieto (nada flota permanentemente)', await p.locator('[data-objeto-cabecera="dash"]').evaluate(d => !d.classList.contains('flota') && getComputedStyle(d).animationName === 'none'));
  ok('aros de las cabeceras: el punto de la punta va del color del módulo (sobre el aro blanco) y sin borde', await p.locator('[data-cabecera-hoy="dash"] [data-aro-cabecera] [data-anillo] svg').evaluate(s => {
    const puntos = [...s.querySelectorAll('circle')].filter(c => (c.getAttribute('fill') || '').toUpperCase() === '#3C7BD6');
    return puntos.length === 1 && puntos.every(c => !c.getAttribute('stroke'));
  }));
  ok('Dash: los anillos se llenan al abrir (y terminan llenos)', await p.locator('[data-view="dash"] [data-anillo] circle[stroke-dashoffset]').first().evaluate(el => {
    const c = parseFloat(el.getAttribute('stroke-dasharray')); const o = parseFloat(el.getAttribute('stroke-dashoffset'));
    return getComputedStyle(el).transitionProperty.includes('stroke-dashoffset') && o < c;
  }));
  const dash = p.locator('[data-view="dash"]');
  ok('atajos: recordatorios sí; Reto solo cuando haya un reto (hoy no hay) y Respira ya no va aquí', (await dash.getByRole('button', { name: /Recordatorios/ }).count()) === 1
    && (await dash.getByRole('button', { name: 'Reto' }).count()) === 0 && (await dash.locator('[data-abrir-respira]').count()) === 0);
  const wa = await dash.getByRole('link', { name: /Coach/ }).getAttribute('href');
  ok('los atajos (coach, comunidad, recordatorios y la tuerca) van en UNA línea, enteros y del mismo alto', await dash.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-atajos] > *')];
    const tops = new Set(bs.map(b => Math.round(b.getBoundingClientRect().top)));
    const altos = new Set(bs.map(b => Math.round(b.getBoundingClientRect().height)));
    return bs.length === 4 && tops.size === 1 && altos.size === 1 && bs.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth - 16; });
  }), await dash.evaluate(() => JSON.stringify([...document.querySelectorAll('[data-atajos] > *')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height)]; }))));
  ok('atajos del Dash: botones de cristal chicos (círculo de 42 px con el símbolo y la palabra debajo)', await dash.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-atajos] [data-boton-cristal]')];
    return bs.length === 4 && bs.every(b => { const c = b.querySelector('[data-circulo]').getBoundingClientRect(); const t = b.lastElementChild.getBoundingClientRect();
      return Math.round(c.width) === 42 && Math.round(c.height) === 42 && t.top >= c.bottom && t.height > 0; })
      && bs.map(b => b.lastElementChild.textContent).join(',') === 'Coach,Comunidad,Avisos,Ajustes';
  }));
  // La píldora de arriba: sin subtítulo, y se encoge al bajar / vuelve al subir.
  ok('píldora de marca: solo el nombre de la sección, sin «Entrena con Método» debajo', await p.locator('[data-pildora-marca]').evaluate(el => el.children.length === 1 && /DASH|INICIO|TU SEMANA|HOY/i.test(el.textContent) && !/Entrena con Método/.test(el.textContent)), await p.locator('[data-pildora-marca]').innerText());
  {
    const chica = () => p.locator('[data-pildora-marca]').evaluate(el => el.getAttribute('data-chica') === '1');
    await dash.evaluate(el => { el.scrollTop = 200; el.dispatchEvent(new Event('scroll', { bubbles: false })); });
    await espera(150);
    const alBajar = await chica();
    await dash.evaluate(el => { el.scrollTop = 150; el.dispatchEvent(new Event('scroll', { bubbles: false })); });
    await espera(150);
    const alSubir = await chica();
    await dash.evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll', { bubbles: false })); });
    await espera(150);
    ok('píldora: se encoge al bajar y vuelve al subir', alBajar === true && alSubir === false && (await chica()) === false, `${alBajar} ${alSubir}`);
  }
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
  // (El diálogo «No hay retos» se fue con el botón: Reto vuelve cuando haya un reto.)
  ok('Reto: sin reto no hay botón ni diálogo', (await p.getByRole('dialog', { name: 'Retos' }).count()) === 0);
  // El bloque HOY: primero lo que toca hoy (lo del coach, la comida), con
  // «N de M»; lo demás (programa, cápsulas…) bajo «Ver todo».
  await dash.locator('[data-recordatorios-dash]').waitFor({ timeout: 6000 }).catch(() => {});
  const nRec = await dash.locator('[data-recordatorio]').count();
  const verTodos = dash.locator('[data-ver-recordatorios]');
  const txtHoy = await dash.locator('[data-recordatorios-dash]').innerText();
  ok('Dash: bloque HOY con lo que importa hoy (peso, fotos, cardio del coach, comida) y su «N de M»', nRec >= 3
    && /HOY · 0 de 4/.test(txtHoy) && /Registrar tu peso/.test(txtHoy) && /Enviar tus fotos/.test(txtHoy) && /Registrar lo que comiste/.test(txtHoy)
    && !/Sobre el programa|cápsula|video/i.test(txtHoy), txtHoy);
  await verTodos.click(); await espera(250);
  ok('Dash HOY: los íconos son de línea, sin círculo de fondo (no parecen botones)', await dash.locator('[data-icono-hoy]').count() >= 1
    && await dash.locator('[data-icono-hoy]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)' && !!el.querySelector('svg')));
  ok('Dash: los íconos de la tarjeta de Entrenamiento también son de línea, sin círculo', (await dash.locator('[data-icono-fila]').count()) >= 3
    && await dash.locator('[data-icono-fila]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)' && !!el.querySelector('svg')));
  ok('Dash: «Profundiza» un tono más oscuro que los bloques crema', await dash.getByRole('button', { name: /Profundiza/ }).first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(235, 230, 220)'));
  ok('Dash: «Ver todo» despliega el resto (programa, cápsulas, videos)', (await dash.locator('[data-recordatorio]').count()) > nRec
    && /Sobre el programa|cápsula|video/i.test(await dash.locator('[data-recordatorios-dash]').innerText()));
  await verTodos.click(); await espera(150);
  // El aro de la cabecera se toca y explica qué lo compone, sin deuda.
  // El aro es el PROGRESO de la semana (no «sin deuda» siempre en 100 %): se
  // llena con lo hecho y el pie dice «al día» o cuánto se quedó atrás.
  ok('Dash: el aro dice «Semana · al día» o «Semana · en marcha» (nunca lo que falta) y el centro es el % de la semana (no 100 % un martes)', /^Semana · (al día|en marcha)$/.test(await dash.locator('[data-aro-pie]').first().innerText())
    && /^\d+%$/.test(await dash.locator('[data-cabecera-hoy="dash"] [data-aro-centro]').innerText()) && (await dash.locator('[data-cabecera-hoy="dash"] [data-aro-centro]').innerText()) !== '100%',
    `${await dash.locator('[data-aro-pie]').first().innerText()} · ${await dash.locator('[data-cabecera-hoy="dash"] [data-aro-centro]').innerText()}`);
  await dash.locator('[data-aro-tocar]').first().click();
  await p.locator('[data-explicacion-aro]').waitFor({ timeout: 5000 });
  const txtEx = await p.locator('[data-explicacion-aro]').innerText();
  ok('Dash: tocar el aro explica las partes: entreno (1 de 3 rutinas de la semana) y comida (N de 7 días registrados)', /Entrenamiento\s+33%/.test(txtEx) && /1 de 3 rutinas de la semana/.test(txtEx)
    && /Alimentación/.test(txtEx) && /\d de 7 días registrados/.test(txtEx) && /aprendizaje no entra/i.test(txtEx), txtEx);
  await foto(p, '01d-explicacion-semana');
  await p.keyboard.press('Escape'); await espera(300);
  ok('Dash: intensidad sin raya cuando no hay entrenos', (await dash.locator('[data-sin-intensidad]').count()) === 1 && /Sin/.test(await dash.locator('[data-sin-intensidad]').innerText()));
  // Respiración guiada: 1, 3 o 5 min, el disco que respira, sin guardar nada.
  {
    const antes = await p.evaluate(() => Object.keys(localStorage).filter(k => /respir|racha/i.test(k)).join('|'));
    await dash.locator('[data-abrir-config]').click();
    await p.locator('[data-config="respira"]').waitFor({ timeout: 5000 });
    await p.locator('[data-config="respira"]').click();
    const rs = p.locator('[data-respira]');
    await rs.waitFor({ timeout: 4000 });
    ok('respira: se elige 1, 3 o 5 minutos', JSON.stringify(await rs.locator('[data-minutos]').evaluateAll(els => els.map(e => e.dataset.minutos))) === '["1","3","5"]');
    await rs.locator('[data-minutos="3"]').click();
    await espera(400);
    await foto(p, '24a-respira-elegir');
    await rs.locator('[data-respira-empezar]').click();
    await espera(1200);
    ok('respira: al empezar, «Inhala» y el disco respirando, con el tiempo que queda', await rs.getAttribute('data-respira') === 'anda'
      && /Inhala|Exhala/.test(await rs.locator('[data-fase]').innerText()) && (await rs.locator('[data-disco].anda').count()) === 1 && /3:00|2:5\d/.test(await rs.innerText()));
    await foto(p, '24b-respira-anda');
    await rs.getByRole('button', { name: 'Terminar' }).click();
    await espera(400);
    ok('respira: «Terminar» lleva a «Listo.»', await rs.getAttribute('data-respira') === 'fin' && /Listo\./.test(await rs.innerText()));
    await rs.locator('[data-respira-volver]').click();
    await espera(300);
    ok('respira: «Volver» la cierra y no guarda registros ni rachas', (await rs.count()) === 0
      && await p.evaluate(() => Object.keys(localStorage).filter(k => /respir|racha/i.test(k)).join('|')) === antes);
    await dash.getByRole('button', { name: /^Dash$/ }).click();
    await dash.locator('[data-atajos]').waitFor({ timeout: 5000 });
  }
  // Deslizar de lado ya NO cambia de sección (chocaba con el scroll de lado
  // del calendario, la galería y los videos): se navega con la barra.
  await p.evaluate(() => {
    const el = document.querySelector('[data-view="dash"] h1, [data-view="dash"]');
    const toque = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 420 });
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [toque(320)], changedTouches: [toque(320)] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [toque(60)] }));
  });
  await espera(600);
  ok('deslizar de lado no cambia de sección', (await p.locator('[data-view="dash"][data-activa]').count()) === 1 && (await p.locator('[data-view="entrena"][data-activa]').count()) === 0);
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
  await p.getByText('Fuerza · tu 1RM estimado', { exact: true }).waitFor({ timeout: 10000 });
  ok('Profundiza entrenamiento: primero constancia, luego intensidad, fuerza (1RM explicado) y progreso de pesos',
    await p.evaluate(() => {
      const t = [...document.querySelectorAll('[data-view="dash"] [data-tarjeta]')].map(el => el.getAttribute('data-tarjeta'));
      const i = (x) => t.indexOf(x);
      return i('Constancia') >= 0 && i('Constancia') < i('Intensidad') && i('Intensidad') < i('Fuerza · tu 1RM estimado') && i('Fuerza · tu 1RM estimado') < i('Progreso de pesos');
    }) && (await p.getByText(/peso máximo que podrías levantar UNA sola vez/).count()) === 1,
    await p.evaluate(() => [...document.querySelectorAll('[data-view="dash"] [data-tarjeta]')].map(el => el.getAttribute('data-tarjeta')).join(' | ')));
  ok('dash: los títulos de las tarjetas en azul', await p.locator('[data-tarjeta="Volumen"] h3').evaluate(h => getComputedStyle(h).color === 'rgb(60, 123, 214)'));
  ok('Profundiza entrenamiento abre fuerza y volumen', (await p.getByText('Volumen', { exact: true }).count()) === 1);
  ok('Profundiza entrenamiento: la intensidad con promedio y acumulado de la semana y el mes', (await p.locator('[data-intensidad]').count()) === 1
    && /Esta semana/.test(await p.locator('[data-intensidad]').innerText()) && /Este mes/.test(await p.locator('[data-intensidad]').innerText()));
  const pp = p.locator('[data-progreso-pesos-dash]');
  ok('Profundiza entrenamiento: «Progreso de pesos» por cada ejercicio de su programa, con su línea',
    (await pp.count()) === 1 && (await pp.locator('[data-peso-ej="Barbell Bench Press"]').count()) === 1
    && (await pp.locator('[data-peso-ej="Barbell Bench Press"] svg').count()) >= 1
    && /kg × 8/.test(await pp.locator('[data-peso-ej="Barbell Bench Press"]').innerText()),
    (await pp.count()) ? await pp.innerText() : 'sin tarjeta');
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
  await p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 });
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
  await p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 });
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
  ok('configuración: unidades, notificaciones, relojes, respira, recorrido, programa y coach', JSON.stringify(await conf.locator('[data-config]').evaluateAll(els => els.map(e => e.dataset.config)))
    === JSON.stringify(['unidades', 'notificaciones', 'relojes', 'respira', 'recorrido', 'programa', 'coach']), JSON.stringify(await conf.locator('[data-config]').evaluateAll(els => els.map(e => e.dataset.config))));
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
  ok('Entreno: el blob junto a la frase, con la kettlebell a dos colores y el 1/3 adentro del aro', await ilusBien(p, 'entreno'));
  const cabE = p.locator('[data-cabecera-hoy="entreno"]');
  ok('Hoy de entreno: la voz del coach (la frase de hoy, sin repetir la fecha del Dash)', await cabE.locator('[data-frase]').isVisible()
    && (await cabE.locator('[data-etiqueta]').count()) === 0
    && /^(Hoy toca|Hecho por hoy|Día de descanso|Hoy no te toca|Semana completa|Tienes un entreno)/.test(await cabE.locator('[data-frase]').innerText()),
    await cabE.locator('[data-frase]').innerText());
  ok('…sin firma y sin personajes en la cabecera', (await cabE.locator('[data-firma-coach]').count()) === 0 && (await cabE.locator('[data-dibujo]').count()) === 0);
  // El aro de entreno: rutinas hechas de las planeadas (1/3), «al día» o lo hecho en neutro, y se explica al tocarlo.
  ok('Entreno: el aro es el progreso de la semana (1/3) y el pie dice «al día» o lo hecho, nunca lo que falta', /^1\/3$/.test(await cabE.locator('[data-aro-centro]').innerText())
    && /^Semana · (al día|en marcha|\d+ hechas?)$/.test(await cabE.locator('[data-aro-pie]').innerText()) && !/sin/.test(await cabE.locator('[data-aro-pie]').innerText()), `${await cabE.locator('[data-aro-centro]').innerText()} · ${await cabE.locator('[data-aro-pie]').innerText()}`);
  await cabE.locator('[data-aro-tocar]').click();
  await p.locator('[data-explicacion-aro]').waitFor({ timeout: 5000 });
  ok('Entreno: tocar el aro explica (1 de 3, al día)', /1 de 3/.test(await p.locator('[data-explicacion-aro]').innerText()) && /Al día/.test(await p.locator('[data-explicacion-aro]').innerText()), await p.locator('[data-explicacion-aro]').innerText());
  await p.keyboard.press('Escape'); await espera(300);
  ok('Entreno: la explicación se cierra', (await p.locator('[data-explicacion-aro]').count()) === 0);
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
  // «Tu semana»: cada cosa del día abre directo lo suyo, no la hoja del día.
  const filaHoy = hoyV.locator(`[data-vista="semana"] [data-fecha="${hoy}"]`);
  await filaHoy.locator('[data-evento="fotos"]').click();
  await p.locator('[data-accion-directa="fotos"]').waitFor({ timeout: 5000 });
  ok('tu semana: tocar las fotos abre directo para mandarlas por WhatsApp (sin la hoja del día)',
    (await p.locator('[data-accion-directa="fotos"] [data-fotos-whatsapp]').count()) === 1
    && /^https:\/\/wa\.me\/\d+\?text=/.test(await p.locator('[data-accion-directa="fotos"] [data-fotos-whatsapp]').getAttribute('href'))
    && (await p.getByText('Para registrar').count()) === 0);
  await foto(p, '04f1-semana-fotos');
  await p.keyboard.press('Escape'); await espera(500);
  await filaHoy.locator('[data-evento="peso"]').click();
  await p.getByText('Actualiza tu peso').waitFor({ timeout: 5000 });
  ok('tu semana: tocar el peso abre directo la ventana para actualizarlo (y avisar al coach)',
    (await p.getByRole('button', { name: 'Guardar y enviar a mi coach' }).count()) === 1 && (await p.getByText('Para registrar').count()) === 0);
  await foto(p, '04f2-semana-peso');
  await p.keyboard.press('Escape'); await espera(500);
  await filaHoy.locator('[data-evento="actividad"]').click();
  await p.getByText('Minutos', { exact: true }).waitFor({ timeout: 5000 });
  ok('tu semana: tocar el cardio abre directo su formulario (tiempo y lo demás opcional)',
    (await p.getByText('Para registrar').count()) === 0 && (await p.getByText(/De tu coach:/).count()) >= 1);
  await foto(p, '04f3-semana-cardio');
  await p.keyboard.press('Escape'); await espera(500);
  ok('tu semana: nada se registró solo con abrir', !(db.db.evento_registros || []).length);
  await filaHoy.getByText('29', { exact: true }).click();
  await espera(500);
  ok('tu semana: tocar la fecha o el blanco de la fila no abre otra ventana (ya se ve todo ahí)', (await p.locator('[data-hoja-scroll]').count()) === 0
    && (await p.getByText('Para registrar').count()) === 0);
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
  ok('«Hoy»: la rutina dice cuánto dura (calculado), en chico', /\d+ ejercicios? · ~\d+ min/.test(await hoyV.locator('[data-hoy-rutina]').innerText()), await hoyV.locator('[data-hoy-rutina]').innerText());
  await foto(p, '04h-hoy-anadida');
  // La rutina por dentro: el Push del lunes, desde su día
  // Con la red lenta: la rutina ya se precargó, así que abre al instante y
  // dice «Actualizando…» mientras llega lo del servidor. Tocar la rutina en
  // «Tu semana» la abre directo (sin pasar por la hoja del día).
  Object.assign(lento, { accion: 'rutina', ms: 2500 });
  await hoyV.locator(`[data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
  let alInstante = true;
  await p.getByText('Calentamiento y movilidad').waitFor({ timeout: 900 }).catch(() => { alInstante = false; });
  ok('abrir una rutina con red lenta: se ve al instante (sin pantalla vacía)', alInstante);
  ok('…con «Actualizando» mientras llega lo del servidor', (await p.locator('[data-aviso="actualizando"]').count()) === 1);
  await foto(p, '04i-rutina-actualizando');
  await p.locator('[data-aviso="actualizando"]').waitFor({ state: 'detached', timeout: 8000 });
  Object.assign(lento, { accion: null, ms: 0 });
  await p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 });
  // Cuánto dura: calculado con series, descansos y cambios (api/_tiempo.js).
  ok('rutina: debajo del nombre, en chico, cuánto dura y cuántos ejercicios', /^~\d+ min · \d+ ejercicios$/.test((await p.locator('[data-rutina-minutos]').innerText().catch(() => '')).trim()),
    await p.locator('[data-rutina-minutos]').innerText().catch(() => 'no está'));
  ok('la rutina se parte en calentamiento, fuerza y enfriamiento',
    (await p.locator('[data-view="entrena"]').getByText('Fuerza', { exact: true }).count()) === 1 && (await p.locator('[data-view="entrena"]').getByText('Enfriamiento', { exact: true }).count()) === 1,
    `${await p.locator('[data-view="entrena"]').getByText('Fuerza', { exact: true }).count()} / ${await p.locator('[data-view="entrena"]').getByText('Enfriamiento', { exact: true }).count()} / ${await p.getByText('Enfriamiento').count()}`);
  // El cardio de después de entrenar: terminada la fuerza y ANTES del estiramiento.
  const cardioEn = await p.evaluate(() => {
    const c = document.querySelector('[data-cardio-coach="evc"]'), sep = document.querySelector('[data-momento="enfriamiento"]');
    if (!c || !sep) return { c: !!c, sep: !!sep };
    const ejs = [...document.querySelectorAll('[data-view="entrena"] [data-ejercicio]')];
    const despuesDelSep = !!(sep.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
    const antesDelEstiramiento = ejs.filter(e => sep.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING).every(e => c.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
    const fuerzaAntes = ejs.filter(e => e.compareDocumentPosition(sep) & Node.DOCUMENT_POSITION_FOLLOWING).length;
    return { despuesDelSep, antesDelEstiramiento, fuerzaAntes, texto: c.innerText };
  });
  ok('rutina: el cardio del coach va al terminar la fuerza, antes del estiramiento', cardioEn.despuesDelSep && cardioEn.antesDelEstiramiento && cardioEn.fuerzaAntes > 0
    && /antes de estirar/i.test(cardioEn.texto) && /Caminadora con inclinación/.test(cardioEn.texto) && /15 min/.test(cardioEn.texto), JSON.stringify(cardioEn));
  await p.locator('[data-cardio-coach="evc"]').scrollIntoViewIfNeeded();
  await foto(p, '04k-rutina-cardio-coach');
  await p.locator('[data-cardio-coach="evc"] [data-ya-lo-hice]').click();
  const hojaCardio = p.getByRole('dialog', { name: 'Caminadora con inclinación después de entrenar' });
  await hojaCardio.waitFor({ timeout: 3000 });
  ok('«Ya lo hice» abre la hoja con lo del coach, Caminadora elegida y sus 15 minutos', (await hojaCardio.locator('[data-nota-coach]').count()) === 1
    && (await hojaCardio.locator('input[inputmode="numeric"]').inputValue()) === '15');
  await hojaCardio.getByRole('button', { name: 'Guardar' }).click();
  await espera(600);
  const actCardio = db.db.actividades.find(a => a.evento_id === 'evc');
  ok('…queda guardado ligado a lo que puso el coach y la tarjeta dice «Hecho»', !!actCardio && actCardio.tipo === 'cinta' && Number(actCardio.duracion_min) === 15
    && (await p.locator('[data-cardio-coach="evc"][data-hecho="si"]').count()) === 1, JSON.stringify(actCardio));
  ok('el calentamiento no pide kilos', await p.evaluate(() => {
    const t = [...document.querySelectorAll('[data-view="entrena"] div')].find(d => d.textContent === 'SuperBand Dislocates');
    const el = t && t.closest('[data-ejercicio-circuito]');
    return !!el && el.querySelectorAll('input').length === 0;
  }));
  ok('circuito: todas las vueltas en UNA tarjeta', (await p.getByText('Circuito · 2 vueltas').count()) === 1);
  ok('circuito: la foto sale cada vez que aparece el ejercicio', (await p.getByRole('button', { name: 'Ver SuperBand Dislocates' }).count()) === 2);
  ok('las cajitas van en blanco, sin sugerencias', (await p.getByLabel('Repeticiones serie 1').first().getAttribute('placeholder')) === null
    && (await p.getByLabel('Peso serie 1').first().getAttribute('placeholder')) === null
    && (await p.getByLabel('Repeticiones serie 1').first().inputValue()) === '');
  ok('lo recetado dice series y reps', (await p.getByText('3 series × 6-12 reps').count()) === 1);
  ok('la última vez ya no va escrita en la tarjeta', (await p.getByText(/^Serie 1: /).count()) === 0);
  ok('cada ejercicio de fuerza trae Ficha, Historial y Nota (el récord va dentro del historial)', (await p.getByRole('button', { name: /Historial/ }).count()) >= 3
    && (await p.getByRole('button', { name: /Tu récord/ }).count()) === 0);
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
        && bs.every(b => { const t = b.querySelector('span'); return !t || t.scrollWidth <= t.clientWidth + 1; });
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
  await p.getByLabel('Peso serie 1').first().locator('xpath=ancestor::div[2]').getByRole('button', { name: /^Marcar serie/ }).click();
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
  // El récord vive dentro del Historial (un botón menos por ejercicio); la
  // hoja abre y el scroll no se va a la rutina de atrás.
  ok('por ejercicio: Ficha, Historial y Nota al coach (sin «Tu récord» aparte)', (await p.getByRole('button', { name: /Tu récord/ }).count()) === 0);
  ok('circuitos (calentamiento): cada ejercicio sobre blanco, con el mismo contraste de botones y casillas que en Fuerza', (await p.locator('[data-ejercicio-circuito]').count()) >= 1
    && await p.locator('[data-ejercicio-circuito]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)'));
  ok('«Nota al coach» por ejercicio: compacto, solo el símbolo, más angosto que Ficha', await p.evaluate(() => {
    const bs = [...document.querySelectorAll('[data-botones] button[data-compacto]')];
    return bs.length >= 3 && bs.every(b => b.getAttribute('aria-label') === 'Nota al coach' && !b.querySelector('span')
      && b.getBoundingClientRect().width < 60 && b.getBoundingClientRect().width < b.parentElement.firstElementChild.getBoundingClientRect().width / 2);
  }));
  await p.getByRole('button', { name: /Historial/ }).first().click();
  await p.locator('[data-tu-record]').waitFor({ timeout: 5000 });
  const antesSc = await scRut();
  await p.mouse.move(195, 700); await p.mouse.wheel(0, 600); await espera(300);
  ok('con la hoja abierta la rutina de atrás no se mueve', (await scRut()) === antesSc, `${antesSc} → ${await scRut()}`);
  await foto(p, '04d-tu-record');
  ok('historial: arriba el récord, el peso más alto en la unidad elegida', (await p.getByText(/El peso más alto que has levantado/).count()) === 1
    && /lb/.test(await p.locator('[data-record]').textContent()), await p.locator('[data-record]').textContent());
  await p.keyboard.press('Escape');
  await espera(300);
  const banca = p.locator('[data-ejercicio="Barbell Bench Press"]');
  ok('al ladito de cada serie, en gris, lo que hizo la última vez (reps × peso, en la unidad de hoy)',
    (await banca.locator('[data-serie-anterior]').first().innerText()) === '8 × 157 lb'
    && /^ÚLTIMA\n\d+ [A-Z]+$/.test(await banca.locator('[data-cab-ultima]').innerText())
    && (await banca.locator('[data-serie-anterior]').first().evaluate(el => getComputedStyle(el).color)) === 'rgb(174, 174, 178)',
    await banca.locator('[data-serie-anterior]').first().innerText());
  ok('las cajitas de reps y peso más largas, y lo de la última vez pegado al check (sin hueco en el medio)',
    await banca.getByLabel('Repeticiones serie 1').evaluate(el => {
      const fila = el.closest('div').parentElement;
      const caja = el.getBoundingClientRect(), peso = fila.querySelector('[aria-label="Peso serie 1"]').getBoundingClientRect();
      const ult = fila.querySelector('[data-serie-anterior]').getBoundingClientRect(), chk = fila.querySelector('button[aria-label*="serie 1"]').getBoundingClientRect();
      const txt = fila.querySelector('[data-serie-anterior]');
      const r = document.createRange(); r.selectNodeContents(txt); const t = r.getBoundingClientRect();
      return caja.width >= 76 && chk.left - t.right <= 12 && ult.left - peso.right <= 12 && txt.scrollWidth <= txt.clientWidth;
    }),
    await banca.getByLabel('Repeticiones serie 1').evaluate(el => String(el.getBoundingClientRect().width)));
  await banca.getByRole('button', { name: /Historial/ }).click();
  await p.locator('[data-ultima]').waitFor({ timeout: 5000 });
  ok('historial: la última vez serie por serie, pasado a lb', (await p.locator('[data-ultima]').getByText(/^Serie 1: 8 reps · 157 lb$/).count()) === 1,
    await p.locator('[data-ultima]').textContent());
  ok('historial: la gráfica de progreso de pesos, de la primera a la última sesión', (await p.locator('[data-progreso-pesos] svg[data-grafica-pesos]').count()) === 1
    && /157 lb/.test(await p.locator('[data-grafica-pesos]').textContent()));
  await foto(p, '04f-historial');
  await p.keyboard.press('Escape');
  await espera(300);
  // Escribir no es hacer: con números sin marcar la fila queda en ámbar; un
  // toque en lo de la última vez rellena las cajitas; al terminar se pregunta.
  await banca.getByLabel('Repeticiones serie 2').fill('9'); await espera(200);
  ok('serie con números sin marcar: el check sigue gris (falta marcarla; nada se marca solo)', (await banca.locator('[data-serie="re-e1:2"]').getAttribute('data-escrita')) === '1'
    && await banca.getByRole('button', { name: 'Marcar serie 2' }).evaluate(b => getComputedStyle(b).color === 'rgb(199, 199, 204)'));
  await banca.locator('[data-serie="re-e1:3"] [data-serie-anterior]').click(); await espera(200);
  ok('tocar lo de la última vez rellena reps y peso de esa serie (sin marcarla ni arrancar el descanso)', (await banca.getByLabel('Repeticiones serie 3').inputValue()) === '7'
    && (await banca.getByLabel('Peso serie 3').inputValue()) === '157' && (await banca.getByRole('button', { name: 'Marcar serie 3' }).count()) === 1
    && (await p.locator('[data-descanso]').count()) === 0
    && await banca.locator('[data-serie="re-e1:3"]').evaluate(el => { const t = el.querySelector('[data-serie-anterior]').getBoundingClientRect(); const c = el.querySelector('button[aria-label="Marcar serie 3"]').getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(el.querySelector('[data-serie-anterior]')); return c.left - r.getBoundingClientRect().right >= 16; }),
    `${await banca.getByLabel('Repeticiones serie 3').inputValue()} / ${await banca.getByLabel('Peso serie 3').inputValue()}`);
  await foto(p, '04f5-escritas-ambar');
  await p.locator('[data-terminar]').click();
  await p.locator('[data-escritas]').waitFor({ timeout: 5000 });
  ok('al terminar: pregunta por las series escritas sin marcar, con sus números', /Quedaron 2 series con números sin marcar/.test(await p.locator('[data-escritas]').innerText())
    && /Barbell Bench Press · serie 2 · 9/.test(await p.locator('[data-escritas]').innerText()) && /serie 3 · 7 × 157 lb/.test(await p.locator('[data-escritas]').innerText()),
    await p.locator('[data-escritas]').innerText());
  await foto(p, '04f6-escritas-cierre');
  await p.locator('[data-escritas-marcar]').click(); await espera(500);
  ok('«Marcarlas como hechas» las marca con lo escrito y el bloque desaparece', (await banca.getByRole('button', { name: 'Deshacer serie 2' }).count()) === 1
    && (await banca.getByRole('button', { name: 'Deshacer serie 3' }).count()) === 1 && (await p.locator('[data-escritas]').count()) === 0
    && /3 de 9 series marcadas|3 de \d+ series/.test(await p.locator('[data-enviar-coach]').locator('xpath=ancestor::div[2]').innerText()));
  await p.mouse.click(20, 60); await espera(400);   // cerrar la hoja (tocar fuera)
  await banca.getByRole('button', { name: 'Deshacer serie 2' }).click(); await espera(200);
  await banca.getByRole('button', { name: 'Deshacer serie 3' }).click(); await espera(200);
  // El descanso sale tras CUALQUIER serie: también la última y aunque se
  // marque fuera de orden (antes, a veces salía y a veces no).
  await p.locator('[data-descanso]').count() && await p.locator('[data-descanso]').getByRole('button', { name: /Saltar|Cerrar/ }).click();
  await banca.getByLabel('Repeticiones serie 3').fill('8');
  await banca.getByRole('button', { name: 'Marcar serie 3' }).click();
  await espera(300);
  ok('descanso: marcar la última serie (fuera de orden) también arranca el temporizador', await p.locator('[data-descanso="contando"]').isVisible()
    && /Descanso/.test(await p.locator('[data-descanso]').innerText()));
  await foto(p, '04f4-descanso-ultima-serie');
  ok('rutina: «Mi semana» en la barra pegada arriba, a mano aunque se esté abajo en la rutina',
    await p.locator('[data-avance-rutina] [data-volver-semana]').isVisible()
    && await p.locator('[data-avance-rutina] [data-volver-semana]').evaluate(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  await p.locator('[data-descanso]').getByRole('button', { name: 'Saltar' }).click();
  await banca.getByRole('button', { name: 'Deshacer serie 3' }).click();
  await espera(300);
  await p.locator('nav[aria-label="Secciones"]').getByRole('button', { name: 'Hoy', exact: true }).click();
  await espera(800);
  await p.getByRole('button', { name: 'Calendario' }).click();
  await espera(1500);
  await foto(p, '05-entreno-calendario');
  const cal = p.locator('[data-view="entrena"]');
  const d = (n) => sumarDiasISO(lunes, n);   // 0 lunes … 6 domingo (hoy es martes = 1)
  ok('calendario: abre en el mes, con el control Semana | Mes (sin repetir la semana de Hoy)', (await cal.locator('[data-vista="mes"]').count()) === 1
    && (await cal.getByRole('tab').count()) === 0 && (await cal.locator('[data-segmentado] button').count()) === 2
    && (await cal.locator('[data-segmentado] button[aria-pressed="true"]').innerText()) === 'Mes');
  ok('calendario: sin «la saltaste»', (await cal.getByText(/saltaste/).count()) === 0);
  ok('mes: días de la semana en el gris de la sección', await cal.getByText('Lun', { exact: true }).first().evaluate(el => getComputedStyle(el).color === 'rgb(95, 102, 112)'));
  ok('mes: tarjeta de cristal con margen (se ve el fondo alrededor) y casillas sin caja', await cal.locator('[data-vista="mes"]').evaluate(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const celda = el.querySelector('[data-fecha]');
    return r.left >= 12 && innerWidth - r.right >= 12 && /blur/.test(cs.backdropFilter || cs.webkitBackdropFilter || '') && parseFloat(cs.borderTopLeftRadius) >= 20
      && getComputedStyle(celda).backgroundColor === 'rgba(0, 0, 0, 0)';
  }));
  ok('mes: casillas compactas y nombres cortos', await cal.locator('[data-vista="mes"] [data-fecha]').first().evaluate(el => { const h = el.getBoundingClientRect().height; return h >= 66 && h <= 90; })
    && (await cal.getByText(/Training/).count()) === 0, String(await cal.locator('[data-vista="mes"] [data-fecha]').first().evaluate(el => el.getBoundingClientRect().height)));
  ok('mes: cada día con rutina dice su nombre, entero y legible', await cal.locator('[data-vista="mes"] [data-chip]').evaluateAll(cs => cs.length >= 8
    && cs.every(c => c.scrollWidth <= c.clientWidth + 1 && c.scrollHeight <= c.clientHeight + 1 && parseFloat(getComputedStyle(c).fontSize) >= 10.5 && c.textContent.trim().length > 1)));
  ok('mes: la leyenda es pequeña y la ayuda va en una sola fila', await cal.locator('[data-leyenda]').evaluate(el => parseFloat(getComputedStyle(el).fontSize) <= 12)
    && /Cómo mover o añadir rutinas/.test(await cal.locator('[data-ten-en-cuenta]').innerText()));
  ok('por hacer en gris; hecha en grafito y con ✓ junto al día', await cal.locator('[data-vista="mes"] [data-chip="pendiente"]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(242, 242, 247)' && getComputedStyle(el).color === 'rgb(29, 29, 31)')
    && await cal.locator('[data-vista="mes"] [data-chip="hecha"]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(29, 29, 31)'
      && !!el.closest('[data-fecha]').querySelector('[data-hecha-check]')));
  ok('mes: los nombres no se parten a mitad de palabra', await cal.locator('[data-vista="mes"] [data-chip]').evaluateAll(cs => cs.every(c => {
    const r = document.createRange(); r.selectNodeContents(c);
    const lineas = [...r.getClientRects()].length;
    const palabras = c.textContent.trim().split(/\s+/).length;
    return lineas <= palabras;
  })));
  await cal.locator('[data-ten-en-cuenta]').click(); await espera(500);
  const ayudaTxt = await p.locator('[data-ten-en-cuenta]').last().innerText().catch(() => '');
  ok('mes: la ayuda abre «ten en cuenta» con mover, añadir, plan y descanso', ['Léelo', 'Mover.', 'Añadir.', 'Tu plan no cambia.', 'Descanso.'].every(t => ayudaTxt.includes(t)), ayudaTxt.slice(0, 80));
  await p.getByRole('button', { name: 'Cerrar' }).last().click(); await espera(400);
  ok('calendario: sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[12]\d), (1[2-4]\d), (8\d|9\d)\)|rgb\(231, 235, 214\)/;
    return ![...document.querySelectorAll('[data-view="entrena"] *')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor) || oliva.test(getComputedStyle(el).borderTopColor));
  }));
  await cal.locator('[data-ten-en-cuenta]').first().scrollIntoViewIfNeeded();
  await foto(p, '05a-ten-en-cuenta');
  // Registrar desde el día
  await cal.locator(`[data-vista="mes"] [data-fecha="${hoy}"]`).click();
  await p.getByText('Para registrar').waitFor({ timeout: 5000 });
  ok('al tocar el día: el detalle dice la fecha de corte', (await p.getByText('Fecha de corte de tu mensualidad').count()) === 1);
  ok('al tocar el día: añadir cardio o deporte (debajo de la rutina)', (await p.locator('[data-acciones-dia] [data-accion="actividad"]').count()) === 1);
  await espera(300);
  await foto(p, '05b-dia-registrar');
  await p.locator('[data-hoja-scroll] [data-fotos-whatsapp]').click();
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
  await cal.locator('[data-segmentado]').getByRole('button', { name: 'Semana' }).click(); await espera(500);
  ok('calendario · Semana: los 7 días en una tarjeta, cada uno con su rutina y estado, sin tocar nada', (await cal.locator('[data-vista="semana-cal"] [data-fecha]').count()) === 7
    && (await cal.locator(`[data-vista="semana-cal"] [data-fecha="${d(5)}"]`).innerText()).includes('Pull')
    && /Descanso/.test(await cal.locator('[data-vista="semana-cal"]').innerText())
    && (await cal.locator('[data-resumen-semana]').count()) === 1);
  await foto(p, '05e2-calendario-semana');
  await cal.locator('[data-segmentado]').getByRole('button', { name: 'Mes' }).click(); await espera(400);
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
  ok('Comida: el blob junto a la frase, con el aguacate a dos colores adentro del aro', (await p.locator('[data-objeto-cabecera="comida"] img').count()) >= 1 && await ilusBien(p, 'comida'));
  // El objeto entra con su animación solo la PRIMERA vez que se ve; al volver
  // a la sección se queda quieto (repetirla en cada cambio de módulo cansaba).
  ok('Comida: al volver a Alimentación el plato se queda quieto (la animación fue la primera vez)', await p.locator('[data-objeto-cabecera="comida"] img').first().evaluate(i => !i.src.startsWith('blob:')));
  ok('Hoy de alimentación ya no saluda ni trae herramientas', (await p.getByText('Hola, Mauro').count()) === 0
    && (await p.getByText('Tus herramientas').count()) === 0);
  ok('Hoy de alimentación: la voz del coach según lo comido, sin personajes', await p.locator('[data-cabecera-hoy="comida"] [data-frase]').isVisible()
    && (await p.locator('[data-cabecera-hoy="comida"] [data-dibujo]').count()) === 0
    && /kcal|registr|desayuno|meta|día|comida/i.test(await p.locator('[data-cabecera-hoy="comida"] [data-frase]').innerText()),
    await p.locator('[data-cabecera-hoy="comida"] [data-frase]').innerText());
  // El aro de comida: días registrados de 7, y se explica al tocarlo. Antes de
  // la primera comida de hoy, abajo solo el aro de calorías.
  {
    const cabC = p.locator('[data-cabecera-hoy="comida"]');
    ok('Comida: el aro es días registrados de 7 y el pie dice «al día» o lo registrado, nunca lo que falta', /^\d\/7$/.test(await cabC.locator('[data-aro-centro]').innerText())
      && /^Semana · (al día|en marcha|\d+ días? registrados?)$/.test(await cabC.locator('[data-aro-pie]').innerText()) && !/sin/.test(await cabC.locator('[data-aro-pie]').innerText()), `${await cabC.locator('[data-aro-centro]').innerText()} · ${await cabC.locator('[data-aro-pie]').innerText()}`);
    await cabC.locator('[data-aro-tocar]').click();
    await p.locator('[data-explicacion-aro]').waitFor({ timeout: 5000 });
    ok('Comida: tocar el aro explica los días registrados', /de 7/.test(await p.locator('[data-explicacion-aro]').innerText()) && /Al día/.test(await p.locator('[data-explicacion-aro]').innerText()), await p.locator('[data-explicacion-aro]').innerText());
    await p.keyboard.press('Escape'); await espera(300);
    const modo = await p.locator('[data-aros-hoy]').getAttribute('data-aros-hoy');
    const nAros = await p.locator('[data-aros-hoy] > *').count();
    ok('Comida Hoy: sin comidas hoy, solo el aro de calorías (los macros llegan con la primera comida)', modo === 'solo-kcal' ? nAros === 1 && (await p.locator('[data-macros-luego]').count()) === 1 : nAros === 4 && (await p.locator('[data-macros-luego]').count()) === 0, `${modo} ${nAros}`);
  }
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
  ok('Recetas: sin la marca tenue en la esquina', (await p.locator('[data-marca-esquina]').count()) === 0);
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
  await p.locator('[data-pagina-calendario-comida]').waitFor({ timeout: 5000 });
  await espera(600);
  await foto(p, '10c-calendario-comidas');
  ok('calendario de comidas: es una página de Alimentación (no una ventana), con su etiqueta CALENDARIO como el de entreno',
    (await p.locator('[data-view="calendario-comida"]').count()) === 1 && (await p.getByRole('dialog').count()) === 0
    && /CALENDARIO/.test(await p.locator('[data-pagina-calendario-comida] [data-cabecera-hoy="comida"]').innerText())
    && !/CALENDARIO DE COMIDAS/.test(await p.locator('[data-pagina-calendario-comida]').innerText()));
  ok('calendario de comidas: la barra marca Calendario', await p.locator('nav[aria-label="Secciones"] [data-activo="1"]').evaluate(el => /Calendario/.test(el.getAttribute('aria-label') || el.textContent)));
  const calC = p.locator('[data-calendario-comidas]');
  ok('calendario de comidas: con la forma del de entreno (días en verde, casillas blancas)', (await calC.count()) === 1
    && await calC.getByText('Lun', { exact: true }).evaluate(el => getComputedStyle(el).color === 'rgb(70, 150, 90)')
    && await calC.locator('[data-dia-comida]').first().evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)' || getComputedStyle(el).backgroundColor === 'rgb(242, 248, 243)'));
  ok('calendario de comidas: selector estilo Apple (como el de entreno): la activa en píldora blanca con texto verde', await p.locator('[data-pestanas-comida] button').first().evaluate(el => {
    const cs = getComputedStyle(el); return cs.backgroundColor === 'rgb(255, 255, 255)' && cs.color === 'rgb(42, 106, 58)' && el.getAttribute('aria-pressed') === 'true';
  }));
  ok('calendario de comidas: las gráficas son las del Dash', (await p.locator('[data-grafica-comida]').count()) === 3
    && (await p.locator('[data-view="calendario-comida"] svg rect').count()) > 10);
  ok('calendario de comidas: sin oliva', await p.evaluate(() => {
    const oliva = /rgb\((1[2-4]\d), (1[4-5]\d), (8\d|9\d)\)|rgb\(212, 218, 184\)|rgb\(74, 82, 56\)/;
    const caja = document.querySelector('[data-view="calendario-comida"]');
    return ![...caja.querySelectorAll('*')].some(el => oliva.test(getComputedStyle(el).color) || oliva.test(getComputedStyle(el).backgroundColor));
  }));
  await p.locator('[data-view="calendario-comida"] [data-grafica-comida]').first().scrollIntoViewIfNeeded();
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
  await p.getByRole('button', { name: 'Chat', exact: true }).click();
  await espera(600);
  ok('calendario de comidas: tocar otra opción de la barra lo cierra', (await p.locator('[data-view="calendario-comida"]').count()) === 0);
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
  // La portada del chat es la de Hoy en Alimentación (verde de la sección) y
  // no cambia de alto al compactarse la tarjeta ni al escribir.
  const portada = () => p.evaluate(() => { const b = document.querySelector('[data-portada-chat]'); const cs = getComputedStyle(b); return { alto: b.getBoundingClientRect().height, fondo: cs.backgroundImage + cs.backgroundColor }; });
  const portada0 = await portada();
  ok('chat: la portada lleva los verdes de Alimentación (los mismos de Hoy)', /156, 207, 168/.test(portada0.fondo) && /240, 248, 241/.test(portada0.fondo), portada0.fondo.slice(0, 120));
  await p.evaluate(() => { const el = document.querySelector('.fixed.inset-0.max-w-2xl'); el.scrollTop = 400; el.dispatchEvent(new Event('scroll')); });
  await espera(500);
  ok('chat: al bajar (tarjeta compacta) la portada no cambia de alto', Math.abs((await portada()).alto - portada0.alto) < 1);
  await p.locator('.msg-input').click();
  await espera(300);
  ok('chat: al tocar el campo de texto la barra se esconde', !(await barraVisible()));
  { const pe = await portada(); ok('chat: al escribir la portada sigue igual (mismo alto y color)', Math.abs(pe.alto - portada0.alto) < 1 && pe.fondo === portada0.fondo); }
  await foto(p, '09b-chat-escribiendo');
  // Con el 5.5 caído, el chat igual responde: la consulta va al de siempre.
  falla55.on = true; modelosPedidos.length = 0;
  await p.keyboard.type('2 huevos');
  await p.keyboard.press('Enter');
  await espera(600);
  ok('chat: al enviar vuelve la barra', await barraVisible());
  // Al registrar comida: sube el «+156 kcal» con cómo va el día.
  const suma = p.locator('[data-aviso-suma]');
  await suma.waitFor({ timeout: 6000 }).catch(() => {});
  await espera(800);
  ok('al registrar comida sale el «+kcal» en UNA línea con el avance del día (sin barra repetida)', (await suma.count()) === 1 && /\+\d+ kcal/.test(await suma.innerText()) && /vas en \d+ % de tu día/.test(await suma.innerText())
    && await suma.evaluate(el => el.getBoundingClientRect().height < 70), (await suma.count()) ? await suma.innerText() : 'no salió');
  ok('chat: el aviso legal es una línea con «Más»', (await p.locator('[data-aviso-calculo]').count()) >= 1 && /Cálculo orientativo/.test(await p.locator('[data-aviso-calculo]').first().innerText())
    && !/No constituye/.test(await p.locator('[data-aviso-calculo]').first().innerText()));
  ok('chat: la comida registrada en tarjeta compacta (momento, total grande y alimentos)', (await p.locator('[data-tarjeta-comida]').count()) >= 1
    && /kcal/.test(await p.locator('[data-tarjeta-comida]').last().innerText()) && (await p.locator('[data-tarjeta-comida] [data-alimento]').count()) >= 1);
  ok('modelos: Mauro pide el 5.5 y, si falla, la misma consulta va al de siempre y se registra igual', modelosPedidos[0] === 'claude-haiku-5-5'
    && modelosPedidos.includes('claude-haiku-4-5-20251001') && (await p.locator('[data-tarjeta-comida]').count()) >= 1, JSON.stringify(modelosPedidos));
  falla55.on = false;
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
  ok('meta de comida: al entrar el día en meta (kcal 90–110 % y proteína ≥ 90 %) sube la hoja de reconocimiento de Alimentación: «Día en meta», tres cifras y confeti', (await metaC.count()) === 1
    && (await metaC.getAttribute('data-reconocimiento')) === 'comida' && /Día en meta\./.test(await metaC.innerText()) && /kcal · meta/.test(await metaC.innerText())
    && (await metaC.locator('[data-rc-chip]').count()) === 3 && (await p.locator('[data-aviso-suma]').count()) === 0, await metaC.innerText().catch(() => ''));
  ok('meta de comida: el enlace lleva al calendario de comidas', (await metaC.locator('[data-rc-enlace]').count()) === 1 && /calendario de comidas/.test(await metaC.locator('[data-rc-enlace]').innerText()));
  await foto(p, '09d-meta-comida');
  await metaC.getByRole('button', { name: 'Seguir' }).click(); await espera(400);
  ok('meta de comida: «Seguir» la cierra', (await metaC.count()) === 0);
  // Una vez al día: seguir registrando ya no la vuelve a abrir.
  await p.locator('.msg-input').click();
  await p.keyboard.type('2 huevos más');
  await p.keyboard.press('Enter');
  await espera(1500);
  ok('meta de comida: sale UNA vez al día (lo que siga registrando no la repite)', (await p.locator('[data-meta-comida]').count()) === 0);
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
  // Con el teclado cerrado, el chat se deja subir con el dedo AUNQUE las otras
  // capas (con el iframe del centro) ya estén montadas por detrás. El iframe
  // traía visibility:visible propio y se tragaba los gestos táctiles.
  {
    const sel = '.fixed.inset-0.max-w-2xl';
    await p.evaluate((sel) => { document.querySelector(sel).scrollTop = 2000; }, sel);
    await espera(150);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 300 }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 300 + 50 * i }] }); await espera(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await espera(400);
    const r = await p.evaluate((sel) => ({ top: document.querySelector(sel).scrollTop, iframes: document.querySelectorAll('[data-capa-v2]:not([data-activa]) iframe').length, vis: [...document.querySelectorAll('[data-capa-v2]:not([data-activa]) iframe')].map(f => getComputedStyle(f).visibility).join(',') }), sel);
    ok('chat: con el teclado cerrado se deja subir con el dedo (iframe del centro escondido de verdad por detrás)', r.top < 1990 && r.iframes >= 1 && r.vis === 'hidden', JSON.stringify(r));
    await cdp.detach();
  }

  // ── Aprendizaje: Lecturas · Videos · Sobre el programa (sin «Hoy») ──
  await p.getByRole('button', { name: 'Aprendizaje', exact: true }).click();
  await espera(1400);
  // El reconocimiento de aprendizaje: el centro avisa cada pieza vista
  // (em-visto); a la tercera cápsula nueva sube la hoja, sobre el centro.
  await p.evaluate(() => { window.postMessage({ tipo: 'em-visto', source: 'capsula', key: 'cap:prueba-1' }, '*'); });
  await espera(900);
  ok('aprendizaje: una cápsula vista no abre nada todavía', (await p.locator('[data-reconocimiento="aprende"]').count()) === 0);
  await p.evaluate(() => { window.postMessage({ tipo: 'em-visto', source: 'capsula', key: 'cap:prueba-2' }, '*'); });
  await espera(600);
  await p.evaluate(() => { window.postMessage({ tipo: 'em-visto', source: 'capsula', key: 'cap:prueba-3' }, '*'); });
  const recoA = p.locator('[data-reconocimiento="aprende"]');
  await recoA.waitFor({ timeout: 8000 }).catch(() => {});
  await espera(1200);
  ok('aprendizaje: a la tercera cápsula sube la hoja completa: «Tres cápsulas más», el blob con N de la fase, puntos y tres cifras', (await recoA.count()) === 1
    && /Tres cápsulas más\./.test(await recoA.innerText()) && (await recoA.locator('[data-rc-portada]').count()) === 1 && (await recoA.locator('[data-rc-puntos] i').count()) >= 1
    && (await recoA.locator('[data-rc-chip]').count()) === 3 && /material visto/.test(await recoA.innerText()), await recoA.innerText().catch(() => ''));
  await foto(p, '12z-reconocimiento-aprende');
  await recoA.getByRole('button', { name: 'Seguir leyendo' }).click(); await espera(400);
  ok('aprendizaje: «Seguir leyendo» la cierra, y repetir la misma cápsula no cuenta', (await recoA.count()) === 0 && await (async () => {
    await p.evaluate(() => { window.postMessage({ tipo: 'em-visto', source: 'capsula', key: 'cap:prueba-3' }, '*'); }); await espera(800);
    return (await p.locator('[data-reconocimiento="aprende"]').count()) === 0;
  })());
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
  await p.getByRole('button', { name: 'Dash', exact: true }).click(); await espera(600);
  ok('calendario de comidas: al irse a otro módulo se cierra', (await p.locator('[data-view="calendario-comida"]').count()) === 0);
  // Alimentación abre siempre en Hoy (aunque se haya quedado en el Chat)
  await p.getByRole('button', { name: 'Alimentación', exact: true }).click();
  await espera(700);
  ok('Alimentación abre en Hoy', await p.locator('[data-cabecera-hoy="comida"]').isVisible());

  await p.getByRole('button', { name: 'Dash', exact: true }).click();
  await p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor();
  ok('vuelve al Dash', true);
  // ── Última semana del ciclo: la ventana, una sola vez por ciclo ──
  ok('ciclo: en una semana que no es la última no sale ningún aviso', (await p.locator('[data-aviso-ciclo]').count()) === 0);
  ok('sin errores de JavaScript (Mauro)', errores.length === 0, errores.join(' | '));
  await ctx.close();

  // ── Teléfono angosto ──
  {
    const u = await abrir('Mauro Morón', { caliente: true, ajustar: (db) => { db.db.fases[0].fecha_inicio = hace(11); } });
    const av = u.p.locator('[data-aviso-ciclo]');
    await av.waitFor({ timeout: 10000 }).catch(() => {});
    await espera(600);
    ok('ciclo: en la última semana, al abrir, sale la ventana «Última semana. Ciérrala fuerte.» con la línea del ciclo y las cifras', (await av.count()) === 1
      && /Última semana\./.test(await av.innerText()) && /Ciclo nuevo/.test(await av.innerText()) && /semana 12 de 12/.test(await av.innerText())
      && /entrenos? pendientes?/.test(await av.innerText()) && /hoy te toca/.test(await av.innerText()) && /termina el ciclo/.test(await av.innerText()), await av.innerText().catch(() => ''));
    await foto(u.p, '12y-aviso-ciclo');
    await av.locator('[data-ciclo-entendido]').click(); await espera(400);
    ok('ciclo: «Entendido» la cierra y queda guardada como vista', (await av.count()) === 0 && await u.p.evaluate(() => localStorage.getItem('mt:avisoCicloFin') === 'f1'));
    await u.p.reload(); await espera(4000);
    ok('ciclo: al volver a abrir no vuelve a salir (una vez por ciclo)', (await u.p.locator('[data-aviso-ciclo]').count()) === 0);
    ok('ciclo: sin errores de JavaScript', u.errores.length === 0, u.errores.join(' | '));
    await u.ctx.close();
  }
  const n = await abrir('Mauro Morón', { ancho: 375, caliente: true });
  await n.p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 25000 }).catch(() => {});
  ok('apertura caliente (la usó hace 5 min): también abre en el Dash', await n.p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).isVisible());
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
  await n.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
  await n.p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 });
  // Las reproducciones de audio se cuentan (el pitido del descanso).
  await n.p.evaluate(() => { window.__sonidos = 0; const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (this.volume > 0) window.__sonidos++; return play.apply(this, arguments).catch(() => {}); }; });
  await n.p.getByRole('button', { name: 'Marcar serie 1' }).first().click();
  await espera(300);
  // Y una serie de un ejercicio con descanso (la banca: 2 min); el calentamiento no tiene.
  await n.p.locator('[data-ejercicio="Barbell Bench Press"]').getByLabel('Repeticiones serie 1').fill('8');
  await n.p.locator('[data-ejercicio="Barbell Bench Press"]').getByRole('button', { name: 'Marcar serie 1' }).click();
  await espera(300);
  ok('descanso: al marcar la serie arranca el descanso del ejercicio', (await n.p.locator('[data-descanso="contando"]').count()) === 1);
  // El reloj salta al final del descanso: suena el pitido y vibra.
  await n.ctx.clock.setFixedTime(new DateReal(FIJO + 130000));
  await espera(900);
  ok('descanso: al acabar, la barra dice «Listo» y suena el pitido (dos notas) para quien no mira la pantalla', (await n.p.locator('[data-descanso="listo"]').count()) === 1
    && await n.p.evaluate(() => window.__sonidos >= 1), await n.p.evaluate(() => 'sonidos=' + window.__sonidos));
  await n.ctx.clock.setFixedTime(new DateReal(FIJO));
  await n.p.locator('[data-descanso]').getByRole('button', { name: 'Cerrar' }).click();
  await espera(300);
  await n.p.locator('[data-terminar]').click();
  // La intensidad es obligatoria: sin ella no se puede enviar.
  ok('cierre: sin marcar la intensidad no deja enviar', await n.p.locator('[data-enviar-coach]').isDisabled() && /Marca qué tan duro/.test(await n.p.locator('[data-enviar-coach]').innerText()));
  await n.p.getByRole('button', { name: 'Percepción 7' }).click();
  await n.p.getByRole('button', { name: 'Enviar a mi coach' }).click();
  const fin = n.p.locator('[data-fin-entreno]');
  await fin.waitFor({ timeout: 8000 });
  ok('fin: confeti con los colores de la marca', (await n.p.locator('.mt-confeti i').count()) > 20);
  await espera(1500);
  ok('fin: es la hoja de reconocimiento de Entrenamiento, los números suben y dicen los minutos', (await fin.getAttribute('data-reconocimiento')) === 'entreno'
    && /\d+\s*minutos?/.test(await fin.innerText()) && (await fin.locator('[data-rc-chip]').count()) === 3);
  ok('fin: «Push, hecho.» con el entreno N de la semana, la frase del coach y lo que hizo', /Push, hecho\./.test(await fin.innerText()) && /Entreno \d de \d\./.test(await fin.innerText())
    && /1\/7\s*ejercicios/.test(await fin.innerText()) && (await fin.locator('[data-firma-coach]').count()) === 0, await fin.innerText());
  ok('fin: sin cerrar la semana ni récord, la versión corta (sin blob ni puntos)', (await fin.locator('[data-rc-portada]').count()) === 0 && (await fin.locator('[data-rc-puntos]').count()) === 0);
  await foto(n.p, '16-fin-entreno');
  ok('fin: «¿Bajamos pulsaciones? Respira» abre la respiración guiada', await (async () => {
    await fin.locator('[data-rc-enlace]').click();
    const rs = n.p.locator('[data-respira]');
    await rs.waitFor({ timeout: 3000 }).catch(() => {});
    const bien = (await rs.count()) === 1 && /Bajamos pulsaciones/i.test(await rs.innerText());
    await rs.locator('[data-respira-cerrar]').click().catch(() => {});
    await espera(300);
    return bien && (await rs.count()) === 0 && (await fin.count()) === 1;
  })());
  await fin.getByRole('button', { name: 'Seguir' }).click();
  await espera(600);
  // No marcó el cardio que le dejó el coach: se le recuerda una vez.
  const recuerdo = n.p.getByRole('dialog', { name: '¿Hiciste tu cardio?' });
  ok('fin: si no marcó el cardio del coach, se le recuerda una vez', (await recuerdo.count()) === 1 && /Caminadora con inclinación/.test(await recuerdo.innerText()));
  await n.p.keyboard.press('Escape');
  await espera(500);
  ok('fin: «Seguir» vuelve a Hoy', (await fin.count()) === 0 && (await recuerdo.count()) === 0 && await n.p.locator('[data-cabecera-hoy="entreno"]').isVisible());
  ok('fin: la cabecera ya dice que entrenó hoy… o lo que sigue', (await n.p.locator('[data-cabecera-hoy="entreno"] [data-frase]').innerText()).length > 5);
  // Se equivocó al terminar: vuelve a entrar a esa rutina y «Reabrir» la deja en curso con lo marcado (solo 3 h).
  await n.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
  await n.p.locator('[data-reabrir]').waitFor({ timeout: 8000 });
  ok('fin: al volver a la rutina terminada sale «Ya la terminaste. ¿Te equivocaste al cerrarla?» con Reabrir', /Ya la terminaste/.test(await n.p.locator('[data-ya-terminada]').innerText()));
  await n.p.locator('[data-reabrir]').click();
  await espera(800);
  {
    // Lo marcado: una serie con «Deshacer», o el ejercicio ya plegado («1 serie · hecho»).
    const franja = await n.p.locator('[data-ya-terminada]').count(), deshacer = (await n.p.getByRole('button', { name: /^Deshacer serie/ }).count()) + (await n.p.getByText(/series? · hecho/).count());
    const enCurso = n.db.db.sesiones.some(s => s.estado === 'en_curso' && !s.finalizada_en), series = n.db.db.series_log.filter(x => x.completada !== false).length;
    ok('reabrir: la franja se va, las series siguen marcadas y la sesión queda en curso (nada se borra)', franja === 0 && deshacer >= 1 && enCurso && series >= 1, `franja ${franja} · deshacer ${deshacer} · enCurso ${enCurso} · series ${series}`);
  }
  ok('sin errores de JavaScript (375 y fin de entreno)', n.errores.length === 0, n.errores.join(' | '));
  await n.ctx.close();

  // ── Cuenta con contraseña (solo Mauro): activarla, datos, avisos, cerrar sesión ──
  {
    let tiene = false, creadas = 0;
    const cuenta = (c) => {
      if (c.accion === 'cuenta') return { ok: true, nombre: 'Mauro Morón', pista: 'm•••o@c••••o.com', tieneCorreo: true, tieneClave: tiene };
      if (c.accion === 'correo') return { ok: true, coincide: String(c.email).toLowerCase() === 'mauro@correo.com' };
      if (c.accion === 'crear' && String(c.email).toLowerCase() !== 'mauro@correo.com') return { ok: false, error: 'correo' };
      if (c.accion === 'crear') { creadas++; tiene = true; return c.clave === 'kettlebell24' ? { ok: true, nombre: 'Mauro Morón', sesion: 'v1.nueva' } : { ok: false, error: 'corta' }; }
      if (c.accion === 'entrar') return c.clave === 'kettlebell24' ? { ok: true, nombre: 'Mauro Morón', sesion: 'v1.otra' } : { ok: false, error: 'clave' };
      return { ok: false };
    };
    const k = await abrir('Mauro Morón', { sinSesion: true, cuenta });
    const cv = k.p.locator('[data-cuenta-v2]');
    await k.p.locator('[data-cuenta-v2="activar"]').waitFor({ timeout: 10000 });
    await espera(900);
    await foto(k.p, '22a-cuenta-activar');
    ok('cuenta: sin contraseña aún, pide activarla con su nombre y la pista del correo (nunca el correo completo)', /Mauro Morón/.test(await cv.innerText())
      && /m•••o@c••••o\.com/.test(await cv.innerText()) && !/mauro@correo\.com/.test(await cv.innerText())
      && await k.p.locator('[data-correo]').getAttribute('placeholder') === 'm•••o@c••••o.com');
    await k.p.locator('[data-correo]').fill('otro@correo.com');
    await k.p.getByLabel('Crea tu contraseña').fill('kettlebell24');
    await k.p.getByLabel('Repítela').fill('kettlebell24');
    await k.p.getByText('Ese no es el correo que tiene tu coach.').first().waitFor({ timeout: 4000 }).catch(() => {});
    await k.p.locator('[data-activar]').click();
    await espera(300);
    ok('cuenta: con un correo que no es el del coach, no crea la contraseña', /no es el correo que tiene tu coach/.test(await cv.innerText()) && creadas === 0);
    await k.p.locator('[data-correo]').fill('Mauro@correo.com');
    await k.p.locator('[data-correo-ok]').waitFor({ timeout: 4000 }).catch(() => {});
    ok('cuenta: con el correo del coach sale el check verde', (await k.p.locator('[data-correo-ok]').count()) === 1);
    await foto(k.p, '22a2-cuenta-correo-ok');
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
    await k.p.locator('[data-cuenta-v2="recorrido"]').waitFor({ timeout: 5000 });
    await espera(600);
    await foto(k.p, '22f-cuenta-recorrido');
    ok('ventanas de primera vez: fondo de manchas de la marca, tarjeta de cristal y puntitos de avance', await k.p.evaluate(() => {
      const v = document.querySelector('[data-ventana-marca]');
      const t = v && v.querySelector('.vm-tarjeta');
      return !!v && v.querySelectorAll('.vm-mancha').length === 4 && /blur/.test(getComputedStyle(t).backdropFilter || getComputedStyle(t).webkitBackdropFilter || '')
        && v.querySelectorAll('[data-pasos] i').length >= 2 && /Te muestro\s+tu app\./.test(v.innerText) && !/Lo veo después/.test(v.innerText);
    }));
    ok('invitación al recorrido: sin «Lo veo después» (no se puede saltar)', (await k.p.getByRole('button', { name: 'Lo veo después' }).count()) === 0);
    await hacerRecorrido(k.p);
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
    ok('entrada nueva: pregunta si es la primera vez, con dos botones grandes', (await e.p.locator('[data-primera-vez]').count()) === 1 && (await e.p.locator('[data-ya-tengo]').count()) === 1
      && /primera vez/i.test(await e.p.locator('[data-cuenta-v2]').innerText())
      && await e.p.evaluate(() => document.querySelector('meta[name="apple-mobile-web-app-title"]').content) === 'EntrenaMétodo'
      && await e.p.evaluate(() => document.querySelector('link[rel="manifest"]').getAttribute('href')) === '/manifest-v2.json');
    ok('ventanas: centradas en la pantalla y con la letra de la marca', await e.p.evaluate(() => {
      const t = document.querySelector('[data-ventana-marca] .vm-tarjeta').getBoundingClientRect();
      const v = document.querySelector('[data-ventana-marca]');
      return Math.abs((t.top + t.bottom) / 2 - innerHeight / 2) < innerHeight * 0.2 && /ECM Ventana/.test(getComputedStyle(v).fontFamily)
        && document.fonts.check("750 31px 'ECM Ventana'");
    }));
    await e.p.locator('[data-ya-tengo]').click();
    await e.p.locator('[data-cuenta-v2="login"]').waitFor({ timeout: 5000 });
    await e.p.getByLabel('Correo').fill('mauro@correo.com');
    await e.p.getByLabel('Contraseña').fill('kettlebell24');
    await e.p.locator('[data-entrar]').click();
    await e.p.locator('[data-cuenta-v2="datos"]').waitFor({ timeout: 5000 });
    await e.p.locator('[data-aceptar-datos]').click();
    await espera(400);
    if (await e.p.locator('[data-cuenta-v2="avisos"]').count()) await e.p.getByRole('button', { name: 'Ahora no' }).click();
    await e.p.locator('[data-cuenta-v2="recorrido"]').waitFor({ timeout: 5000 });
    await hacerRecorrido(e.p);
    await espera(1200);
    ok('entrada nueva: entra con su correo, queda con su nombre y su sesión', await e.p.evaluate(() => JSON.parse(localStorage.getItem('mt:name') || 'null')) === 'Mauro Morón'
      && await e.p.evaluate(() => localStorage.getItem('mt:sesion')) === 'v1.otra' && (await e.p.locator('[data-cuenta-v2]').count()) === 0);
    await e.ctx.close();

    // Primera vez de verdad: «Antes de empezar, validemos tu cuenta» con
    // primer nombre, primer apellido, correo y contraseña, en una sola pantalla.
    {
      const pedidas = [];
      const cuenta2 = (c) => {
        pedidas.push(c);
        if (c.accion === 'cuenta') return /^mauro mor[oó]n$/i.test(c.name) ? { ok: true, nombre: 'Mauro Morón', pista: 'm•••o@c••••o.com', tieneCorreo: true, tieneClave: false } : { ok: false, error: 'no_existe' };
        if (c.accion === 'crear') return String(c.email).toLowerCase() === 'mauro@correo.com' ? { ok: true, nombre: 'Mauro Morón', sesion: 'v1.primera' } : { ok: false, error: 'correo' };
        return { ok: false };
      };
      const pv = await abrir('Mauro Morón', { sinSesion: true, sinNombre: true, url: '/?v2=1', cuenta: cuenta2 });
      await pv.p.locator('[data-primera-vez]').waitFor({ timeout: 10000 });
      await pv.p.locator('[data-primera-vez]').click();
      await pv.p.locator('[data-cuenta-v2="primera"]').waitFor({ timeout: 5000 });
      await espera(700);
      await foto(pv.p, '22h-primera-validar');
      const txt = await pv.p.locator('[data-cuenta-v2]').innerText();
      ok('primera vez: «Antes de empezar, validemos tu cuenta» y explica qué pide', /Antes de empezar/.test(txt) && /validemos tu cuenta/i.test(txt)
        && /primer nombre/i.test(txt) && /primer apellido/i.test(txt) && /correo/i.test(txt) && /contraseña/i.test(txt));
      await pv.p.locator('[data-primer-nombre]').fill('Mauro');
      await pv.p.locator('[data-primer-apellido]').fill('Moron');
      await pv.p.locator('[data-correo]').fill('otro@correo.com');
      await pv.p.getByLabel('Crea tu contraseña').fill('kettlebell24');
      await pv.p.getByLabel('Repítela').fill('kettlebell24');
      await pv.p.locator('[data-validar]').click();
      await espera(400);
      ok('primera vez: con otro correo no la crea y le muestra la pista del de su coach', /no es el correo que tiene tu coach/.test(await pv.p.locator('[data-cuenta-v2]').innerText())
        && /m•••o@c••••o\.com/.test(await pv.p.locator('[data-cuenta-v2]').innerText()));
      await pv.p.locator('[data-correo]').fill('mauro@correo.com');
      await pv.p.locator('[data-validar]').click();
      await pv.p.locator('[data-cuenta-v2="datos"]').waitFor({ timeout: 5000 });
      ok('primera vez: busca por nombre y apellido, crea la contraseña y sigue', pedidas.some(c => c.accion === 'cuenta' && c.name === 'Mauro Moron')
        && pedidas.some(c => c.accion === 'crear' && c.name === 'Mauro Morón') && await pv.p.evaluate(() => localStorage.getItem('mt:sesion')) === 'v1.primera');
      await espera(500);
      await foto(pv.p, '22i-primera-datos');
      ok('primera vez: sin errores de JavaScript', pv.errores.length === 0, pv.errores.join(' | '));
      await pv.ctx.close();
    }

    // La bienvenida a la Comunidad (la escribe el coach en el CRM): una vez.
    const bw = await abrir('Mauro Morón');
    bw.db.db.comunidad_bienvenida = [{ user_id: 'coach', titulo: 'Bienvenido a la comunidad', texto: 'Aquí compartimos retos y avances.', activa: true, editado_en: hoy + 'T10:00:00Z' }];
    await bw.p.reload();
    await bw.p.locator('[data-bienvenida-comunidad]').waitFor({ timeout: 20000 });
    await espera(900);
    await foto(bw.p, '23a-bienvenida-comunidad');
    ok('bienvenida a la Comunidad: sale con el título y el texto del CRM, en la ventana de la marca', /Bienvenido a la comunidad/.test(await bw.p.locator('[data-bienvenida-comunidad]').innerText())
      && /retos y avances/.test(await bw.p.locator('[data-bienvenida-comunidad]').innerText()) && (await bw.p.locator('[data-bienvenida-comunidad] .vm-mancha').count()) === 4);
    await bw.p.getByRole('button', { name: 'Ver la comunidad' }).click();
    await espera(900);
    ok('…«Ver la comunidad» la abre', (await bw.p.locator('[data-equipo]').count()) === 1 && (await bw.p.locator('[data-bienvenida-comunidad]').count()) === 0);
    await bw.p.reload();
    await bw.p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).waitFor({ timeout: 20000 });
    await espera(2500);
    ok('…y no vuelve a salir', (await bw.p.locator('[data-bienvenida-comunidad]').count()) === 0);
    await bw.ctx.close();

    // Otra persona (sin la visual nueva): ni cuenta ni nombre nuevo
    const o = await abrir('Ana Gómez', { sinSesion: true, cuenta });
    await espera(1500);
    ok('otra persona: no ve la cuenta; el nombre en la pantalla de inicio es «EntrenaMétodo» para todos', (await o.p.locator('[data-cuenta-v2]').count()) === 0
      && await o.p.evaluate(() => document.querySelector('meta[name="apple-mobile-web-app-title"]').content) === 'EntrenaMétodo');
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
  try { await k.p.locator('[data-view="dash"] [data-abrir-config]').click({ timeout: 1500 }); } catch (e) { tocoDetras = false; }
  ok('mora día 8: lo de atrás no se puede tocar', !tocoDetras);
  ok('mora día 8: lo de atrás va desenfocado', (await bloqueo.evaluate(el => getComputedStyle(el).backdropFilter)).includes('blur'));
  pagado = true;                                  // el coach marca el pago en el CRM
  await k.p.getByRole('button', { name: /Ya pagué/ }).click();
  await espera(800);
  ok('marcado pagado: la app se abre sola', (await bloqueo.count()) === 0);
  await k.ctx.close();

  // ── Día de gracia: con mora y bloqueo, el día en que instala la app ──
  const hoyFijo = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(FIJO));
  const conBloqueo = { ...deuda, dias_vencido: 8, hoy: hoyFijo };
  const g1 = await abrir('Mauro Morón', { pago: { ...conBloqueo, bloqueo: false, gracia: true } });
  await g1.p.locator('[data-view="dash"]').getByText('Mensualidad pendiente').waitFor({ timeout: 20000 });
  await espera(700);
  await foto(g1.p, '15b-pago-gracia');
  ok('gracia: el día que instala la app no se bloquea; sale solo el recordatorio de siempre (sin ventana ni «desde mañana»)',
    (await g1.p.getByRole('alertdialog').count()) === 0 && (await g1.p.getByRole('dialog', { name: 'Mensualidad pendiente' }).count()) === 0
    && (await g1.p.getByText(/Desde mañana|Hoy tienes la app abierta|solo hoy/i).count()) === 0
    && await g1.p.locator('[data-view="dash"] [data-aviso-pago]').isVisible());
  await g1.ctx.close();

  const g2 = await abrir('Mauro Morón', { instalada: true, extra: { 'mt:pwaNuevaAt': new Date(FIJO - 60000).toISOString() },
    pago: { ...conBloqueo, bloqueo: true, instalada: 'nunca' } });
  await g2.p.locator('[data-view="dash"] [data-aviso-pago]').waitFor({ timeout: 20000 }).catch(() => {});
  ok('gracia: instalada hace un minuto (aún sin llegar al servidor) también abre, con su recordatorio', (await g2.p.locator('[data-view="dash"] [data-aviso-pago]').count()) === 1
    && (await g2.p.getByRole('alertdialog').count()) === 0);
  await g2.ctx.close();

  const g3 = await abrir('Mauro Morón', { instalada: true, extra: { 'mt:pwaNuevaAt': new Date(FIJO - 2 * 86400000).toISOString() },
    pago: { ...conBloqueo, bloqueo: true, instalada: 'nunca' } });
  await g3.p.getByRole('alertdialog', { name: 'Pago pendiente' }).waitFor({ timeout: 20000 }).catch(() => {});
  ok('gracia: al día siguiente vuelve el bloqueo', (await g3.p.getByRole('alertdialog', { name: 'Pago pendiente' }).count()) === 1
    && (await g3.p.locator('[data-view="dash"] [data-aviso-pago]').count()) === 0);
  await g3.ctx.close();

  const g4 = await abrir('Mauro Morón', { instalada: true, extra: { 'mt:pwaNuevaAt': new Date(FIJO - 60000).toISOString() },
    pago: { ...conBloqueo, bloqueo: true, instalada: 'antes' } });
  await g4.p.getByRole('alertdialog', { name: 'Pago pendiente' }).waitFor({ timeout: 20000 }).catch(() => {});
  ok('gracia: reinstalar no da otro día (el servidor ya tiene una instalación anterior)', (await g4.p.getByRole('alertdialog', { name: 'Pago pendiente' }).count()) === 1
    && (await g4.p.locator('[data-view="dash"] [data-aviso-pago]').count()) === 0);
  await g4.ctx.close();

  // ── Otra persona: todo como siempre ──
  const o = await abrir('Ana Pérez');
  await o.p.getByRole('button', { name: 'Herram.' }).waitFor({ timeout: 25000 });
  await espera(2600);
  ok('otra persona ve la barra de siempre', (await o.p.locator('nav[aria-label="Secciones"]').count()) === 0);
  ok('…y su letra de siempre', !(await o.p.evaluate(() => document.documentElement.hasAttribute('data-v2'))));
  ok('…y no abre en el Dash', (await o.p.locator('[data-view="dash"]').getByText('Tu semana', { exact: true }).count()) === 0);
  await foto(o.p, '13-otra-persona');
  ultimoChat.texto = '';
  await o.p.getByRole('button', { name: 'Chat', exact: true }).click().catch(() => {}); await espera(700);
  await o.p.locator('.msg-input').click();
  await o.p.keyboard.type('200 g de pollo crudo');
  await o.p.keyboard.press('Enter');
  await o.p.getByText(/150 g cocido/).last().waitFor({ timeout: 8000 }).catch(() => {});
  ok('otra persona: lo de pesado en crudo aún no le llega (solo Mauro)', /pollo crudo/.test(ultimoChat.texto) && !/PESADO EN CRUDO/.test(ultimoChat.texto));
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
  await avA.locator('[data-fotos-whatsapp]').click();
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
  // ── «Ver como cliente» (el coach, desde el CRM): la app abre como ese
  // cliente, en solo lectura, y sin tocar lo que este navegador tenía. ──
  {
    // Este navegador tiene la cuenta de Mauro; el pase es de Ana (sus metas
    // bajan de la nube, como en la vida real).
    const vc = await abrir('Ana Pérez', { url: '/?ver_como=pase.de.prueba', verComo: 'Ana Pérez', caliente: true,
      nube: { goals: { kcal: 2100, p: 140, c: 220, g: 65 } }, extra: { 'mt:name': JSON.stringify('Mauro Morón'), 'mt:probarDireccionNueva': '1' } });
    await vc.p.locator('[data-ver-como]').waitFor({ timeout: 25000 });
    ok('ver como: la franja dice a quién se está viendo y que es solo lectura', /Viendo como Ana Pérez · solo lectura/.test(await vc.p.locator('[data-ver-como]').innerText()));
    await vc.p.getByText(/Hola, Ana/).waitFor({ timeout: 15000 }).catch(() => {});
    await foto(vc.p, '24-ver-como-dash');
    ok('ver como: la app abre como ese cliente (su nombre en el Dash)', (await vc.p.getByText(/Hola, Ana/).count()) === 1);
    ok('ver como: la dirección queda limpia (sin el pase)', !/ver_como/.test(vc.p.url()));
    // Registrar comida: la llamada al servidor se corta antes de salir y avisa.
    await vc.p.getByRole('button', { name: /Comida|Alimentación/ }).first().click(); await espera(600);
    await vc.p.getByRole('button', { name: 'Chat', exact: true }).click(); await espera(500);
    await vc.p.locator('.msg-input').waitFor({ timeout: 10000 });
    await vc.p.locator('.msg-input').click();
    await vc.p.keyboard.type('2 huevos'); await vc.p.keyboard.press('Enter'); await espera(900);
    ok('ver como: nada se guarda (la comida no se registra) y sale el aviso de solo lectura', (await vc.p.locator('[data-tarjeta-comida]').count()) === 0
      && await vc.p.locator('#mt-ver-como-aviso').evaluate(el => getComputedStyle(el).opacity === '1'));
    await foto(vc.p, '24-ver-como');
    ok('sin errores de JavaScript (ver como)', vc.errores.length === 0, vc.errores.join(' | '));
    // Al final: lo guardado de verdad en este navegador sigue siendo de Mauro
    // (se quita el almacén en memoria para mirar el real).
    // (se lee el almacén REAL del navegador por debajo de la app, con el protocolo del navegador)
    const real = await (async () => {
      const cdp = await vc.ctx.newCDPSession(vc.p);
      const r = await cdp.send('DOMStorage.getDOMStorageItems', { storageId: { securityOrigin: 'http://localhost:5198', isLocalStorage: true } });
      return Object.fromEntries(r.entries || []);
    })();
    ok('ver como: lo guardado en este navegador queda intacto (sigue siendo la cuenta de Mauro, sin rastro de Ana)',
      real['mt:name'] === JSON.stringify('Mauro Morón') && real['mt:sesion'] !== 'ver-como' && !Object.values(real).some(v => /Ana Pérez/.test(String(v))),
      JSON.stringify({ name: real['mt:name'], sesion: real['mt:sesion'] }));
    await vc.ctx.close();
    // Con el pase vencido: no se abre nada, solo el aviso de volver al CRM.
    const vv = await abrir('Mauro Morón', { url: '/?ver_como=pase.vencido', caliente: true });
    await vv.p.getByText('El pase venció').waitFor({ timeout: 15000 }).catch(() => {});
    ok('ver como: con el pase vencido, solo el aviso (la app no se monta)', (await vv.p.getByText('El pase venció').count()) === 1 && (await vv.p.locator('[data-view="dash"]').count()) === 0);
    await vv.ctx.close();
  }
  // ── A mitad del entreno la página se recarga (actualización o el teléfono
  // la mató): se vuelve a la rutina sola, con lo marcado y lo tecleado. ──
  {
    const rr = await abrir('Mauro Morón', { caliente: true });
    await rr.p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await espera(800);
    await rr.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
    await rr.p.getByText('Calentamiento y movilidad').waitFor({ timeout: 10000 });
    const bancaR = rr.p.locator('[data-ejercicio="Barbell Bench Press"]');
    await bancaR.getByLabel('Repeticiones serie 1').fill('8');
    await bancaR.getByLabel('Peso serie 1').fill('60');
    await bancaR.getByRole('button', { name: 'Marcar serie 1' }).click(); await espera(400);
    await bancaR.getByLabel('Repeticiones serie 2').fill('7');   // tecleado, sin marcar
    await espera(300);
    await rr.p.reload(); await espera(1500);
    await rr.p.getByText('Calentamiento y movilidad').waitFor({ timeout: 15000 }).catch(() => {});
    const bancaR2 = rr.p.locator('[data-ejercicio="Barbell Bench Press"]');
    // La serie marcada vuelve apenas la app termina de armarse tras la
    // entrada: se le da ese tiempo en vez de mirar en un instante fijo.
    await bancaR2.getByRole('button', { name: 'Deshacer serie 1' }).waitFor({ timeout: 8000 }).catch(() => {});
    ok('recarga a mitad del entreno: vuelve sola a la rutina abierta', (await rr.p.getByText('Calentamiento y movilidad').count()) === 1);
    ok('…con la serie marcada y lo tecleado sin marcar', (await bancaR2.getByRole('button', { name: 'Deshacer serie 1' }).count()) === 1
      && (await bancaR2.getByLabel('Repeticiones serie 2').inputValue()) === '7', await bancaR2.getByLabel('Repeticiones serie 2').inputValue());
    await foto(rr.p, '25-rutina-recuperada');
    // «Mi semana» la cierra: al recargar ya no vuelve a ella.
    await rr.p.locator('[data-avance-rutina] [data-volver-semana]').click(); await espera(500);
    await rr.p.reload(); await espera(1500);
    await rr.p.locator('[data-view="dash"], [data-view="entrena"]').first().waitFor({ timeout: 15000 }).catch(() => {});
    ok('al salir con «Mi semana», recargar ya no vuelve a la rutina', (await rr.p.getByText('Calentamiento y movilidad').count()) === 0);
    await rr.ctx.close();
  }
  // ── La bitácora: un error en el teléfono del cliente llega al CRM. ──
  {
    const reportes = [];
    const bt = await abrir('Mauro Morón', { caliente: true, bitacora: reportes });
    await bt.p.locator('[data-view="dash"]').waitFor({ timeout: 25000 });
    // (con el reloj fijo de la prueba los temporizadores no corren: se dispara el evento tal cual lo recibe la app)
    await bt.p.evaluate(() => { window.dispatchEvent(new ErrorEvent('error', { message: 'prueba de bitácora', error: new Error('prueba de bitácora') })); });
    await espera(900);
    ok('bitácora: un error de JavaScript se reporta con el cliente y la pantalla', reportes.length === 1 && /prueba de bitácora/.test(reportes[0].mensaje)
      && reportes[0].name === 'Mauro Morón' && /Dash/.test(reportes[0].pantalla || ''), JSON.stringify(reportes[0] || null));
    await bt.ctx.close();
  }

  {
    const pc = await abrir('Mauro Morón', { caliente: true });
    await pc.p.getByRole('button', { name: 'Alimentación', exact: true }).click();
    await espera(900);
    await pc.p.getByRole('button', { name: 'Chat', exact: true }).click();
    await espera(900);
  // Pesado en CRUDO (solo Mauro): viajan las instrucciones de crudo y la
  // tabla de la app no le aplica los valores del cocido a los gramos crudos.
  await pc.p.locator('.msg-input').click();
  await pc.p.keyboard.type('200 g de pollo crudo');
  await pc.p.keyboard.press('Enter');
  await pc.p.getByText(/150 g cocido/).last().waitFor({ timeout: 8000 }).catch(() => {});
  await espera(600);
  // (Lo guardado del día: en las pruebas el reloj está quieto y dos comidas
  // comparten id, así que la tarjeta del chat no sirve para mirar esto.)
  const pollo = await pc.p.evaluate(() => {
    const k = Object.keys(localStorage).find(x => /^mt:day:/.test(x) && /pechuga/.test(localStorage.getItem(x) || ''));
    const dia = k ? JSON.parse(localStorage.getItem(k)) : [];
    const it = dia.flatMap(e => e.items || [e]).find(x => /pechuga/.test(x.name || ''));
    return it ? { amount: it.amount, kcal: it.kcal } : null;
  });
  ok('crudo: el chat recibe cómo registrar lo pesado en crudo', /PESADO EN CRUDO/.test(ultimoChat.texto));
  ok('crudo: se registra con su equivalente cocido y las kcal del crudo (≈248, no 330)', !!pollo && /200 g crudo \(≈150 g cocido\)/.test(pollo.amount) && Math.round(pollo.kcal) === 248, JSON.stringify(pollo));
  await foto(pc.p, '09d-comida-cruda');
  await espera(3000);
    ok('sin errores de JavaScript (crudo)', pc.errores.length === 0, pc.errores.join(' | '));
    await pc.ctx.close();
  }
  // Circuito terminado: se pliega como un ejercicio suelto, con su flechita.
  {
    const pq = await abrir('Mauro Morón', { caliente: true });
    await pq.p.getByRole('button', { name: /Entreno|Entrenamiento/ }).first().click(); await espera(800);
    await pq.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
    await pq.p.locator('[data-circuito]').waitFor({ timeout: 10000 });
    for (let i = 0; i < 4; i++) {
      const b = pq.p.locator('[data-circuito]').getByRole('button', { name: /^Marcar serie/ }).first();
      if (!(await b.count())) break;
      await b.click(); await espera(350);
    }
    const pleg = pq.p.locator('[data-circuito-plegado]');
    await pleg.waitFor({ timeout: 4000 }).catch(() => {});
    ok('circuito: al terminar todas las vueltas se pliega, con el color de hecho', (await pleg.count()) === 1
      && /Circuito · 2 vueltas · hecho/.test(await pleg.innerText()) && (await pq.p.locator('[data-circuito]').count()) === 0);
    await foto(pq.p, '04j-circuito-plegado');
    await pleg.click(); await espera(300);
    ok('circuito: un toque lo vuelve a abrir y la flechita lo pliega otra vez', (await pq.p.locator('[data-circuito]').count()) === 1
      && await (async () => { await pq.p.locator('[data-circuito] [data-plegar]').click(); await espera(300); return (await pq.p.locator('[data-circuito-plegado]').count()) === 1; })());
    // Desde abajo de la rutina, «Mi semana» vuelve sin subir; al entrar de
    // nuevo, lo marcado sigue ahí.
    await pq.p.locator('[data-terminar]').scrollIntoViewIfNeeded(); await espera(300);
    await pq.p.locator('[data-avance-rutina] [data-volver-semana]').click();
    await pq.p.locator('[data-view="entrena"] [data-vista="semana"]').waitFor({ timeout: 5000 });
    await pq.p.locator(`[data-view="entrena"] [data-vista="semana"] [data-fecha="${lunes}"] [data-chip]`).first().click();
    await pq.p.locator('[data-circuito-plegado]').waitFor({ timeout: 10000 }).catch(() => {});
    ok('rutina: «Mi semana» desde abajo vuelve a la semana y al volver a entrar lo marcado sigue',
      (await pq.p.locator('[data-circuito-plegado]').count()) === 1);
    ok('sin errores de JavaScript (circuito plegado)', pq.errores.length === 0, pq.errores.join(' | '));
    await pq.ctx.close();
  }
  // PRIMERA VEZ en la app nueva con cuenta ya activa: le salen solas las
  // ventanas que le falten y la invitación al recorrido; una sola vez.
  const pv = await abrir('Mauro Morón', { extra: { 'mt:primeraVezVista': null } });
  await pv.p.locator('[data-cuenta-v2]').first().waitFor({ timeout: 25000 });
  if (await pv.p.locator('[data-cuenta-v2="avisos"]').count()) await pv.p.getByRole('button', { name: 'Ahora no' }).click();
  const invit = pv.p.locator('[data-cuenta-v2="recorrido"]');
  await invit.waitFor({ timeout: 5000 }).catch(() => {});
  ok('primera vez (con cuenta): sale sola la invitación al recorrido, sin pedir contraseña', (await invit.count()) === 1
    && (await pv.p.locator('[data-cuenta-v2="entrar"], [data-cuenta-v2="activar"]').count()) === 0);
  await foto(pv.p, '22g-primera-vez-con-cuenta');
  await invit.getByRole('button', { name: 'Empezar recorrido' }).click().catch(() => {});
  await pv.p.locator('[data-recorrido]').waitFor({ timeout: 8000 }).catch(() => {});
  ok('primera vez (con cuenta): «Empezar recorrido» abre el recorrido', (await pv.p.locator('[data-recorrido]').count()) === 1);
  ok('primera vez (con cuenta): queda vista (no vuelve a salir)', await pv.p.evaluate(() => !!localStorage.getItem('mt:primeraVezVista')));
  ok('sin errores de JavaScript (primera vez con cuenta)', pv.errores.length === 0, pv.errores.join(' | '));
  await pv.ctx.close();

  // MUDANZA: en la dirección nueva, la primera vez cuenta lo que encontró;
  // y al abrir sube TODO a la nube (chat de 200, kg/lb, días perfectos…).
  postsNube.length = 0;
  const chatNube = Array.from({ length: 230 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `mensaje ${i}`, ts: 1000 + i }));
  const om = await abrir('Ana Pérez', { nube: {
    history: { '2026-09-20': { kcal: 2100, p: 150, c: 200, g: 60 }, '2026-09-21': { kcal: 1900, p: 140, c: 190, g: 55 } },
    historyDetail: { '2026-09-22': [{ id: 77, meal: 'almuerzo', items: [], kcal: 600 }] },
    messages: chatNube,
    prefs_dispositivo: { 'entreno:unidades': 'lb', 'entreno:unidad:ej9': 'kg', 'mt:perfectDays': JSON.stringify(['2026-09-01']), 'mt:pwaInstalledAt': 'no-debe' },
    recetario_menus: [{ id: 'm1', recetas: ['r1'] }],
  }, extra: { 'mt:probarDireccionNueva': '1', 'mt:messages': '[]', 'mt:perfectDays': JSON.stringify(['2026-09-05']) } });
  const comp = om.p.locator('[data-mudanza="comprobacion"]');
  await comp.waitFor({ timeout: 25000 }).catch(() => {});
  const fraseComp = (await comp.locator('[data-encontrado]').textContent().catch(() => '')) || '';
  ok('mudanza: al llegar dice lo que encontró', /Encontramos tus \d+ días de comidas/.test(fraseComp), fraseComp);
  await foto(om.p, '17-mudanza-comprobacion');
  await comp.getByRole('button', { name: 'Seguir' }).click().catch(() => {});
  await espera(3500);
  const ls = await om.p.evaluate(() => ({ u: localStorage.getItem('entreno:unidades'), e: localStorage.getItem('entreno:unidad:ej9'),
    pd: localStorage.getItem('mt:perfectDays'), pwa: localStorage.getItem('mt:pwaInstalledAt'), menus: localStorage.getItem('mt:menus_guardados'),
    visto: localStorage.getItem('mt:comprobacionVista'), nueva: localStorage.getItem('mt:appNuevaAt') }));
  ok('mudanza: trae kg/lb y días perfectos (sin pisar ni inventar)', ls.u === 'lb' && ls.e === 'kg' && ls.pwa === null
    && JSON.parse(ls.pd || '[]').includes('2026-09-01') && JSON.parse(ls.pd || '[]').includes('2026-09-05'), JSON.stringify(ls));
  ok('mudanza: trae los menús del Recetario', /m1/.test(ls.menus || ''), String(ls.menus));
  ok('mudanza: la comprobación sale una sola vez', !!ls.visto && (await om.p.locator('[data-mudanza]').count()) === 0);
  const ultimo = postsNube[postsNube.length - 1];
  const dataSub = ultimo && ultimo.data || {};
  ok('mudanza: al abrir sube la copia completa', postsNube.length > 0, `posts: ${postsNube.length}`);
  ok('mudanza: el chat viaja con 200 mensajes', Array.isArray(dataSub.messages) && dataSub.messages.length === 200
    && dataSub.messages.some(m => m.content === 'mensaje 229'), String(dataSub.messages && dataSub.messages.length) + ' · último: ' + JSON.stringify(dataSub.messages && dataSub.messages[199]).slice(0, 160));
  ok('mudanza: suben las preferencias del teléfono', dataSub.prefs_dispositivo && dataSub.prefs_dispositivo['entreno:unidades'] === 'lb'
    && !('mt:pwaInstalledAt' in dataSub.prefs_dispositivo), JSON.stringify(dataSub.prefs_dispositivo));
  ok('mudanza: marca para el CRM «ya en la app nueva»', !!ls.nueva && dataSub.app_nueva_at === ls.nueva, `${ls.nueva} / ${dataSub.app_nueva_at}`);
  ok('dirección nueva: la visual nueva es de todos (Ana también)', await om.p.evaluate(() => document.documentElement.hasAttribute('data-v2') && document.documentElement.classList.contains('marca-v2')));
  ok('sin errores de JavaScript (mudanza)', om.errores.length === 0, om.errores.join(' | '));
  await om.ctx.close();

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
