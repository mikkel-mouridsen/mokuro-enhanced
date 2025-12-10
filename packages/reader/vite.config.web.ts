import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Web configuration (standalone web app)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/reader/', // Serve from /reader path
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
  server: {
    port: 5174, // Different port for web dev server
    proxy: {
      // Proxy API requests to the server during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env.BUILD_TARGET': JSON.stringify('web'),
  },
});

