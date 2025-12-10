import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Default configuration (desktop/Electron)
// Use vite.config.web.ts for web builds
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  define: {
    'process.env.BUILD_TARGET': JSON.stringify('desktop'),
  },
});

