// La entrada animada (visual nueva) en un «teléfono lento» (CPU ×4):
//   - arranca al instante: nunca pantalla vacía mientras la app carga
//   - el ícono y el nombre se ven completos un buen rato antes de salir
//   - no se traba: ningún cuadro largo mientras se dibuja el ícono
//
//   node pruebas/intro.mjs        (hace el build y lo sirve)
import { createRequire } from 'module';
import path from 'node:path';
import { build, preview } from 'vite';
const require_ = createRequire(import.meta.url);
const { chromium } = require_('playwright');
const raiz = path.join(import.meta.dirname, '..');
await build({ root: raiz, logLevel: 'error' });
const srv = await preview({ root: raiz, logLevel: 'error', preview: { port: 5197, strictPort: true } });
const BASE = 'http://localhost:5197';

const b = await chromium.launch();
let mal = 0;
const ok = (n, c, extra = '') => { if (!c) mal++; console.log(`  ${c ? 'ok ' : 'MAL'}  ${n}${c ? '' : '  ' + extra}`); };

for (const vuelta of [1, 2]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    localStorage.setItem('mt:probarDireccionNueva', '1');
    // Registro de cuadros desde el primer instante.
    window.__cuadros = [];
    const t0 = performance.now();
    const paso = (t) => { window.__cuadros.push(t); if (t - t0 < 4000) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(BASE + '/', { waitUntil: 'commit' });

  // A los ~250 ms: la entrada ya se mueve (manchas a la vista), no está vacía.
  await p.waitForFunction(() => document.getElementById('splash2'), null, { timeout: 5000 });
  await p.waitForTimeout(250);
  const temprano = await p.evaluate(() => ({
    anda: document.documentElement.classList.contains('intro-anda'),
    manchas: [...document.querySelectorAll('#splash2 .m')].map(m => +getComputedStyle(m).opacity).reduce((a, x) => a + x, 0),
    t: performance.now() - (window.__introDesde || 0),
  }));
  ok(`vuelta ${vuelta} · arranca al instante (manchas a la vista a los ${Math.round(temprano.t)} ms)`, temprano.anda && temprano.manchas > 0.3, JSON.stringify(temprano));

  // Cuándo el ícono y el nombre están completos, y cuándo se va.
  const tiempos = await p.evaluate(() => new Promise(res => {
    const desde = window.__introDesde;
    let completo = null;
    const mira = () => {
      const t = performance.now() - desde;
      const letras = [...document.querySelectorAll('#splash2 .nombre .linea, #splash2 .nombre .pto')];
      const trazas = [...document.querySelectorAll('#splash2 .traza')];
      const listo = letras.every(l => +getComputedStyle(l).opacity > 0.98)
        && trazas.every(x => parseFloat(getComputedStyle(x).strokeDashoffset) < 1);
      if (listo && completo == null) completo = t;
      if (document.body.classList.contains('app-ready')) return res({ completo, sale: t });
      if (t > 9000) return res({ completo, sale: null });
      requestAnimationFrame(mira);
    };
    mira();
  }));
  ok(`vuelta ${vuelta} · ícono + nombre completos a los ${Math.round(tiempos.completo)} ms`, tiempos.completo != null && tiempos.completo < 3600, JSON.stringify(tiempos));
  ok(`vuelta ${vuelta} · y se ven ${Math.round(tiempos.sale - tiempos.completo)} ms antes de pasar a la app`, tiempos.sale && tiempos.sale - tiempos.completo >= 800, JSON.stringify(tiempos));

  // Que no se trabe: cuadros mientras se dibuja el ícono y sale el nombre.
  const cuadros = await p.evaluate(() => {
    const d = window.__introDesde, c = window.__cuadros.filter(t => t >= d + 50 && t <= d + 1780);
    let peor = 0;
    for (let i = 1; i < c.length; i++) peor = Math.max(peor, c[i] - c[i - 1]);
    const largos = []; for (let i = 1; i < c.length; i++) if (c[i] - c[i - 1] > 60) largos.push([Math.round(c[i - 1] - d), Math.round(c[i] - c[i - 1])]);
    return { n: c.length, peor: Math.round(peor), largos };
  });
  ok(`vuelta ${vuelta} · no se traba mientras se dibuja (peor cuadro ${cuadros.peor} ms)`, cuadros.peor < 120, JSON.stringify(cuadros)); if (process.env.DET) console.log(JSON.stringify(cuadros));

  await p.waitForTimeout(900);
  const app = await p.evaluate(() => ({ raiz: document.getElementById('root').childElementCount, splash: +getComputedStyle(document.getElementById('splash2')).opacity }));
  ok(`vuelta ${vuelta} · después aparece la app`, app.raiz > 0 && app.splash < 0.05, JSON.stringify(app));
  ok(`vuelta ${vuelta} · sin errores de JavaScript`, errores.length === 0, errores.join(' | '));
  await ctx.close();
}

// Un teléfono que reporta la pantalla MÁS BAJA que la vista (pasa en
// algunos): el fondo de la entrada tiene que llegar igual hasta abajo.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 760 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => localStorage.setItem('mt:probarDireccionNueva', '1'));
  const p = await ctx.newPage();
  await p.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.goto(BASE + '/');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(import.meta.dirname, 'capturas', 'intro-1500ms.png') });
  const abajo = await p.evaluate(() => {
    const e = document.querySelector('#splash2 .escena').getBoundingClientRect();
    return { escenaHasta: Math.round(e.bottom), alto: innerHeight };
  });
  ok('la escena de la entrada cubre hasta abajo aunque la pantalla diga ser más baja', abajo.escenaHasta >= abajo.alto + 100, JSON.stringify(abajo));
  await ctx.close();
}

await b.close();
srv.httpServer.close();
console.log(mal ? `\n${mal} MAL` : '\ntodo bien');
process.exit(mal ? 1 : 0);
