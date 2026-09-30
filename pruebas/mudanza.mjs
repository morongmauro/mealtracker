// La mudanza a la dirección nueva, de punta a punta, en un navegador real.
// Dos direcciones que para el navegador son dos apps distintas (cada una con
// su almacenamiento, como la vieja y la nueva): localhost y 127.0.0.1.
//
//   · En la vieja sale el aviso; «Pasar a la app nueva» sube TODO a la
//     cuenta (aunque el cliente hubiera dicho que no a la nube) y abre la
//     nueva con el nombre.
//   · En la nueva entra directo, trae la cuenta y explica cómo instalarla.
//   · Una instalación en blanco (el iPhone tras «Agregar a inicio») recupera
//     la cuenta sola al poner el nombre, sin volver a preguntar por la nube.
//   · Quien dijo que no a la nube EN ESE teléfono no es forzado.
//
//   NODE_PATH=/opt/node22/lib/node_modules node pruebas/mudanza.mjs

import { createServer } from 'vite';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const raiz = path.resolve(import.meta.dirname, '..');
const vite = await createServer({ root: raiz, logLevel: 'error', server: { port: 5199, strictPort: true, host: true } });
await vite.listen();
const VIEJA = 'http://localhost:5199/';
const NUEVA = 'http://127.0.0.1:5199/';
const b = await chromium.launch();

let fallos = 0;
const ok = (n, c, extra = '') => { if (!c) fallos++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + extra}`); };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

// La nube (/api/sync) en memoria: user_id → { name, data }.
const nube = new Map();
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

function historial(dias) {
  const h = {};
  for (let i = 1; i <= dias; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    h[f] = { kcal: 2000 + i, p: 150, c: 200, g: 60, water: 0 };
  }
  return h;
}

async function contexto(almacen = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((kv) => {
    if (sessionStorage.getItem('__sembrado')) return;
    sessionStorage.setItem('__sembrado', '1');
    for (const [k, v] of Object.entries(kv[location.host] || {})) localStorage.setItem(k, v);
  }, almacen);
  await ctx.route('**/api/**', async (ruta) => {
    const u = new URL(ruta.request().url());
    const json = (o) => ruta.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.pathname === '/api/sync') {
      if (ruta.request().method() === 'POST') {
        const b = JSON.parse(ruta.request().postData() || '{}');
        nube.set(b.user_id, { name: b.name, data: b.data });
        return json({ ok: true });
      }
      const idf = u.searchParams.get('identity_for');
      if (idf != null) {
        const hit = [...nube.entries()].find(([, v]) => norm(v.name) === norm(idf));
        return json({ user_id: hit ? hit[0] : null });
      }
      const uid = u.searchParams.get('user_id');
      const row = nube.get(uid);
      if (u.searchParams.get('goals_only')) return json(row ? { goals: row.data.goals } : null);
      return json(row ? { name: row.name, data: row.data } : null);
    }
    if (u.pathname === '/api/authorize') return json({ authorized: true, status: 'activo' });
    if (u.pathname === '/api/payment-status') return json({ due: false });
    if (u.pathname === '/api/training') return json({ ok: false });
    return json({});
  });
  return ctx;
}

const BASE = {
  'mt:name': JSON.stringify('Ana Prueba'),
  'mt:goals': JSON.stringify({ kcal: 2000, p: 150, c: 200, g: 60 }),
  'mt:lastActiveAt': String(Date.now()),
  'mt:novedadesVistas': JSON.stringify(['2026-08-26-aprendizaje-y-recetas']),
};

try {
  // ── 1. En la dirección vieja: quien dijo que NO a la nube, con 12 días ──
  const ctx = await contexto({
    'localhost:5199': { ...BASE, 'mt:history': JSON.stringify(historial(12)), cloudConsent: 'declined',
      'mt:probarMudanza': '1', 'mt:urlNuevaPrueba': NUEVA },
  });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto(VIEJA);
  await p.locator('[data-mudanza="aviso"]').waitFor({ timeout: 20000 });
  ok('vieja: sale el aviso de la mudanza', true);
  await espera(400);
  await p.screenshot({ path: path.join(import.meta.dirname, 'capturas', '20-mudanza-aviso.png') });
  ok('vieja: sin datos en la nube todavía (había dicho que no)', nube.size === 0);
  await p.locator('[data-pasar]').click();
  await p.waitForURL(u => u.host === '127.0.0.1:5199', { timeout: 30000 });
  const subida = [...nube.values()][0];
  ok('pasar: TODO quedó en la cuenta antes de irse (12 días)', !!subida && Object.keys(subida.data.history || {}).length === 12,
    JSON.stringify(subida && Object.keys(subida.data.history || {}).length));
  ok('pasar: con su nombre', subida && subida.name === 'Ana Prueba');

  // ── 2. Llega a la nueva ──
  await p.locator('[data-mudanza="llegada"]').waitFor({ timeout: 20000 });
  ok('nueva: entra directo (sin bienvenida) y explica cómo instalarla', (await p.getByText('Listo, ya estás en la app nueva').count()) === 1);
  ok('nueva: la dirección queda limpia', !/mudanza|n=/.test(p.url()), p.url());
  await espera(2500);
  await p.screenshot({ path: path.join(import.meta.dirname, 'capturas', '21-mudanza-llegada.png') });
  const hNueva = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mt:history') || '{}')).length);
  ok('nueva: trajo los 12 días de la cuenta', hNueva === 12, String(hNueva));
  ok('nueva: sin el aviso de la nube encima', (await p.getByText(/nube/i).count()) === 0 || (await p.locator('[data-mudanza]').count()) === 1);
  await p.getByRole('button', { name: 'Entendido' }).click();
  await espera(300);
  ok('nueva: «Entendido» cierra el aviso y no vuelve', (await p.locator('[data-mudanza]').count()) === 0
    && (await p.evaluate(() => localStorage.getItem('mt:llegoDeMudanza'))) === null);
  ok('sin errores de JavaScript', errores.length === 0, errores.join(' | '));
  await ctx.close();

  // ── 3. Instalación en blanco (iPhone tras «Agregar a inicio») ──
  const ctx2 = await contexto({ '127.0.0.1:5199': { 'mt:name': JSON.stringify('Ana Prueba'), 'mt:lastActiveAt': String(Date.now()),
    'mt:novedadesVistas': JSON.stringify(['2026-08-26-aprendizaje-y-recetas']) } });
  const p2 = await ctx2.newPage();
  await p2.goto(NUEVA);
  await espera(5000);
  const c2 = await p2.evaluate(() => ({ consent: localStorage.getItem('cloudConsent'), dias: Object.keys(JSON.parse(localStorage.getItem('mt:history') || '{}')).length }));
  ok('instalación nueva: la cuenta se recupera sola al tener el nombre', c2.consent === 'accepted' && c2.dias === 12, JSON.stringify(c2));
  ok('instalación nueva: sin preguntar por la nube', (await p2.getByRole('button', { name: /No, gracias|Ahora no|Solo en este/ }).count()) === 0);
  ok('instalación nueva: sin aviso de mudanza (ya está en la nueva)', (await p2.locator('[data-mudanza]').count()) === 0);
  await ctx2.close();

  // ── 4. Quien dijo que NO en ese teléfono no es forzado ──
  const ctx3 = await contexto({ '127.0.0.1:5199': { ...BASE, cloudConsent: 'declined' } });
  const p3 = await ctx3.newPage();
  await p3.goto(NUEVA);
  await espera(4000);
  ok('un «no» dado en este teléfono se respeta', (await p3.evaluate(() => localStorage.getItem('cloudConsent'))) === 'declined');
  await ctx3.close();

  // ── 5. Nombre sin cuenta en la nube: pregunta como siempre ──
  const ctx4 = await contexto({ '127.0.0.1:5199': { ...BASE, 'mt:name': JSON.stringify('Nadie Nuevo') } });
  const p4 = await ctx4.newPage();
  await p4.goto(NUEVA);
  await espera(4000);
  ok('nombre sin cuenta: no se acepta la nube por su cuenta', (await p4.evaluate(() => localStorage.getItem('cloudConsent'))) === null);
  await ctx4.close();
} catch (e) {
  fallos++;
  console.log('  MAL  se cortó: ' + String(e.message || e).split('\n').slice(0, 3).join(' | '));
}

await b.close();
await vite.close();
console.log(fallos ? `\n${fallos} MAL` : '\ntodo bien');
process.exit(fallos ? 1 : 0);
