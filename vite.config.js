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

export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
});
