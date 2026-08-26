import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig(() => {
  return {
    define: {
      /** 单一真源：package.json version → 编译期注入到 import.meta.env.VITE_APP_VERSION。 */
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(String(pkg.version ?? '0.1.0')),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // Keep in sync with "paths" in tsconfig.json.
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavy vendors for better caching and smaller initial chunks.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
