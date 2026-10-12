import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sello único por build. Se publica en /version.json Y se incrusta en el
// bundle (__BUILD_VERSION__): la app compara su propio sello contra el del
// servidor para auto-actualizarse sin pedirle refresh al usuario (main.jsx).
const buildVersion = `${Date.now()}`;

function buildVersionPlugin() {
  return {
    name: 'build-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: buildVersion, builtAt: new Date().toISOString() }),
      });
    },
  };
}

// La entrada animada (index.html) arranca apenas se abre la app. Si el código
// de la app se ejecuta mientras se dibuja el ícono, el teléfono se ocupa y la
// animación se traba a la mitad. Este plugin hace que el código y los estilos
// se DESCARGUEN desde el primer instante (modulepreload / preload) pero se
// EJECUTEN cuando el ícono y el nombre ya entraron (~1,8 s desde que arrancó). Sin
// entrada (recargas, otros clientes) se cargan al tiro, como siempre. Los
// estilos van antes que el código, para que la app nunca se vea sin estilo.
function entradaSinTrabasPlugin() {
  return {
    name: 'entrada-sin-trabas',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const js = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
        if (!js) return html;
        const css = [...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g)].map(m => m[1]);
        let out = html.replace(js[0], `<link rel="modulepreload" crossorigin href="${js[1]}">`);
        css.forEach(h => { out = out.replace(`<link rel="stylesheet" crossorigin href="${h}">`, `<link rel="preload" as="style" crossorigin href="${h}">`); });
        const cargador = `<script>
(function () {
  var JS = ${JSON.stringify(js[1])}, CSS = ${JSON.stringify(css)};
  var r = document.documentElement, hecho = false;
  var espera = r.classList.contains('intro-anda') ? Math.max(0, (window.__introDesde || 0) + 1800 - performance.now()) : 0;
  var pendientes = CSS.length;
  function codigo() {
    if (hecho) return; hecho = true;
    var s = document.createElement('script'); s.type = 'module'; s.crossOrigin = ''; s.src = JS;
    document.head.appendChild(s);
  }
  function estilos() {
    if (!CSS.length) return setTimeout(codigo, 0);
    CSS.forEach(function (h) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.crossOrigin = ''; l.href = h;
      l.onload = l.onerror = function () { if (--pendientes <= 0) codigo(); };
      document.head.appendChild(l);
    });
  }
  setTimeout(estilos, espera);
  // Por si un estilo nunca avisa: el código entra igual.
  setTimeout(codigo, espera + 4000);
})();
</script>`;
        return out.replace('</body>', `${cargador}\n</body>`);
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), buildVersionPlugin(), entradaSinTrabasPlugin()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
});
