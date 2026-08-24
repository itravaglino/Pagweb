import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(root, '../shared'),
    },
  },
  optimizeDeps: {
    include: ['gemma-webgpu'],
  },
  server: {
    headers: isolationHeaders,
  },
  preview: {
    headers: isolationHeaders,
  },
  build: {
    outDir: path.resolve(root, 'dist'),
    emptyOutDir: true,
  },
});
