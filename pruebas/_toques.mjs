// MEDICIÓN DE TOQUES (no es parte de la suite): ¿qué se ve tocable y qué no?
// Cuenta lo tocable de cada pantalla, lo que no da pista, lo chico (< 40 px) y
// lo que parece botón sin serlo; deja capturas marcadas en $SAL.
//   SAL=/carpeta NODE_PATH=… node pruebas/_toques.mjs
// (Abajo, el mismo arranque de visual-v2.mjs.)

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

// ── Medición: ¿qué se ve tocable y qué no? ──
const SAL = process.env.SAL;
const auditar = (p, nombre) => p.evaluate((nombre) => {
  const W = innerWidth, H = innerHeight;
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.right <= 0 || r.left >= W) return null;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null; return r; };
  const esInteractivo = (el) => {
    const t = el.tagName;
    if (t === 'BUTTON' || (t === 'A' && el.getAttribute('href')) || t === 'SUMMARY' || t === 'SELECT' || t === 'TEXTAREA' || (t === 'INPUT' && el.type !== 'hidden')) return true;
    if (/^(button|tab|link|switch|checkbox|menuitem)$/.test(el.getAttribute('role') || '')) return true;
    const cs = getComputedStyle(el); if (cs.cursor !== 'pointer') return false;
    const pa = el.parentElement; return !pa || getComputedStyle(pa).cursor !== 'pointer';
  };
  const colorFondo = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(.*, 0\)$/.test(c) && c !== 'transparent') return c; } return 'rgb(255,255,255)'; };
  const BODY = ['rgb(31, 31, 31)', 'rgb(29, 29, 31)', 'rgb(58, 58, 60)', 'rgb(99, 99, 102)', 'rgb(142, 142, 147)', 'rgb(110, 110, 115)', 'rgb(72, 72, 74)'];
  const pistas = (el) => {
    const cs = getComputedStyle(el), dentro = el.querySelector('svg, img, [data-circulo]');
    const fondoPropio = cs.backgroundColor && !/rgba\(.*, 0\)$/.test(cs.backgroundColor) && cs.backgroundColor !== colorFondo(el.parentElement || el);
    const borde = parseFloat(cs.borderTopWidth) > 0 && !/rgba\(.*, 0\)$/.test(cs.borderTopColor);
    const sombra = cs.boxShadow && cs.boxShadow !== 'none';
    const subrayado = /underline/.test(cs.textDecorationLine);
    const colorMarca = !BODY.includes(cs.color);
    return { fondoPropio, borde, sombra, icono: !!dentro, subrayado, colorMarca, alguna: fondoPropio || borde || sombra || !!dentro || subrayado || colorMarca };
  };
  const res = { nombre, tocables: [], escondidos: [], chicos: [], falsos: [], enPantalla: 0 };
  // Solo la pantalla de adelante: la capa activa (las de atrás están «inert»).
  const capa = [...document.querySelectorAll('[data-capa-v2][data-activa]')].sort((a, b) => (+getComputedStyle(b).zIndex || 0) - (+getComputedStyle(a).zIndex || 0))[0];
  const delante = (el) => !el.closest('[inert]') && (!capa || capa.contains(el));
  const vistos = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!esInteractivo(el) || !delante(el)) continue;
    if (el.closest('nav[aria-label="Secciones"]')) continue;          // la barra de abajo se mide aparte
    const r = vis(el); if (!r) continue;
    // Un botón dentro de otro cuenta una vez.
    if ([...vistos].some(v => v.contains(el))) continue; vistos.add(el);
    const texto = (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const caja = [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)];
    const it = { texto, caja, tag: el.tagName, pis: pistas(el) };
    res.tocables.push(it);
    if (r.top < H && r.bottom > 0) res.enPantalla++;
    if (!it.pis.alguna) res.escondidos.push(it);
    if (Math.min(r.width, r.height) < 40 && !/^(INPUT|TEXTAREA)$/.test(el.tagName)) res.chicos.push(it);
    el.dataset.auditoria = !it.pis.alguna ? 'escondido' : Math.min(r.width, r.height) < 40 ? 'chico' : 'ok';
  }
  // Lo que PARECE botón y no lo es: una píldora o cajita rellena, chica, con
  // texto corto, sin nada tocable adentro ni afuera.
  for (const el of document.querySelectorAll('body div, body span')) {
    if (!delante(el)) continue;
    const r = vis(el); if (!r) continue;
    if (r.height < 22 || r.height > 52 || r.width > 240 || r.width < 30) continue;
    const cs = getComputedStyle(el);
    const relleno = cs.backgroundColor && !/rgba\(.*, 0\)$/.test(cs.backgroundColor) && cs.backgroundColor !== colorFondo(el.parentElement);
    if (!relleno || parseFloat(cs.borderRadius) < 8) continue;
    const txt = (el.innerText || '').trim(); if (!txt || txt.length > 26 || el.children.length > 3) continue;
    let tocable = false; for (let e = el; e; e = e.parentElement) if (esInteractivo(e)) { tocable = true; break; }
    if (tocable || el.querySelector('button, a, [role=button]')) continue;
    if (el.closest('nav[aria-label="Secciones"], [data-pildora-marca]')) continue;
    res.falsos.push({ texto: txt.replace(/\s+/g, ' '), caja: [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)] });
    el.dataset.auditoria = 'falso';
  }
  return res;
}, nombre);
const marcar = (p) => p.addStyleTag({ content: `
  [data-auditoria="ok"] { outline: 2.5px solid #2F9E55 !important; outline-offset: 1px; }
  [data-auditoria="chico"] { outline: 2.5px dashed #2F9E55 !important; outline-offset: 1px; }
  [data-auditoria="escondido"] { outline: 3px solid #E5484D !important; outline-offset: 1px; }
  [data-auditoria="falso"] { outline: 3px solid #F2A60C !important; outline-offset: 1px; }` });
const resultados = [];
const pv = await abrir('Mauro Morón', { caliente: true });
const p = pv.p;
await espera(3500);
const pantallas = [
  ['Dash', async () => {}],
  ['Entrenamiento · Hoy', async () => { await p.getByRole('button', { name: 'Entrenamiento', exact: true }).click(); await espera(2500); }],
  ['Entrenamiento · Calendario', async () => { await p.getByRole('button', { name: 'Calendario', exact: true }).first().click().catch(() => {}); await espera(1800); }],
  ['Alimentación · Hoy', async () => { await p.getByRole('button', { name: 'Alimentación', exact: true }).click(); await espera(2000); await p.getByRole('button', { name: 'Hoy', exact: true }).first().click().catch(() => {}); await espera(1500); }],
];
for (const [nom, ir] of pantallas) {
  await ir();
  await p.evaluate(() => document.querySelectorAll('[data-auditoria]').forEach(e => delete e.dataset.auditoria));
  const r = await auditar(p, nom);
  resultados.push(r);
  await marcar(p);
  const base = nom.replace(/[^a-záéíóú]+/gi, '-').toLowerCase();
  await p.screenshot({ path: `${SAL}/${base}.png` });
  // Y la pantalla siguiente (bajando).
  await p.evaluate(() => { const els = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.getBoundingClientRect().width > 300 && e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true })); els.forEach(e => e.scrollTop = Math.min(e.scrollTop + 640, e.scrollHeight)); window.scrollBy(0, 640); });
  await espera(500);
  await p.screenshot({ path: `${SAL}/${base}-2.png` });
  await p.evaluate(() => { [...document.querySelectorAll('*')].forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); window.scrollTo(0, 0); });
  await espera(300);
}
const fs2 = await import('node:fs');
fs2.writeFileSync(`${SAL}/medicion.json`, JSON.stringify(resultados, null, 1));
for (const r of resultados) console.log(`${r.nombre}: ${r.tocables.length} tocables (${r.enPantalla} en la 1ª pantalla) · sin pista ${r.escondidos.length} · chicos ${r.chicos.length} · falsos ${r.falsos.length}`);
await b.close(); process.exit(0);
