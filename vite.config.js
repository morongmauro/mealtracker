import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Genera /version.json en cada build. El cliente lo consulta periódicamente
// para auto-actualizarse sin pedirle refresh al usuario (ver src/main.jsx).
function buildVersionPlugin() {
  const version = `${Date.now()}`;
  return {
    name: 'build-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version, builtAt: new Date().toISOString() }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
});
