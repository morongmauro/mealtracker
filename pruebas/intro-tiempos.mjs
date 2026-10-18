// La entrada animada (visual nueva): cuánto dura de punta a punta y que la
// app de abajo no se asome mientras la entrada la tapa. Guarda un cuadro
// cada ~50 ms en el scratch para revisarla a ojo.
//   NODE_PATH=… node pruebas/intro-tiempos.mjs   (SIN_BUILD=1 si ya está dist/)
import { createRequire } from 'module'; import path from 'node:path'; import fs from 'node:fs';
const r = createRequire(import.meta.url); const { chromium } = r('playwright');
import { build, preview } from 'vite';
const raiz = path.resolve(import.meta.dirname, '..');
const D = path.join(import.meta.dirname, 'capturas', 'intro') + '/'; fs.mkdirSync(D, { recursive: true });
if (!process.env.SIN_BUILD) await build({ root: raiz, logLevel: 'error' });
const v = await preview({ root: raiz, logLevel: 'error', preview: { port: 5199, strictPort: true } });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => { if (!sessionStorage.getItem('__ok')) { localStorage.setItem('mt:name', JSON.stringify('Mauro Moron')); localStorage.setItem('mt:sesion', 'v1.prueba'); localStorage.setItem('mt:probarDireccionNueva', '1'); sessionStorage.setItem('__ok', '1'); } });
const p = await ctx.newPage();
await p.route('**/*', ru => { const u = ru.request().url(); if (u.startsWith('http://localhost:5199') && !u.includes('/api/')) return ru.continue(); return ru.fulfill({ status: 200, contentType: 'application/json', body: u.includes('/rest/') ? '[]' : '{}' }); });
await p.goto('http://localhost:5199/');
const t0 = Date.now(); const marcas = [];
while (Date.now() - t0 < 4200) {
  const t = Date.now() - t0;
  const info = await p.evaluate(() => ({ raiz: getComputedStyle(document.getElementById('root')).visibility, desde: Math.round(performance.now() - (window.__introDesde || 0)), listo: document.body.classList.contains('app-ready'), op: getComputedStyle(document.getElementById('splash2')).opacity }));
  await p.screenshot({ path: D + `f${String(t).padStart(5, '0')}.png` });
  marcas.push(`${t}ms intro+${info.desde} listo=${info.listo} op=${(+info.op).toFixed(2)} root=${info.raiz}`);
}
const fin = marcas.find(m => /op=0\.00/.test(m));
const asoma = marcas.filter(m => /listo=false/.test(m) && !/root=hidden/.test(m));
let mal = 0; const ok = (n, c, x = '') => { if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + x}`); };
const ms = fin ? Number(fin.match(/intro\+(\d+)/)[1]) : Infinity;
ok(`la entrada termina en ~3,2 s (${ms} ms)`, ms <= 3700, fin || 'no terminó');
ok('la app no se asoma mientras la entrada la tapa', asoma.length === 0, asoma.slice(0, 3).join(' | '));
console.log(mal ? `${mal} MAL` : 'todo bien');
await b.close(); v.httpServer.close();
