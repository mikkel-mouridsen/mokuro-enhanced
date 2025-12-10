import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Desktop (Electron) configuration
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

