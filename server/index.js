import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mountFitbitRoutes } from './fitbit.js';
import { mountOllamaRoutes } from './ollama.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  for (const [key, value] of Object.entries(isolationHeaders)) {
    res.setHeader(key, value);
  }
  next();
});
mountFitbitRoutes(app);
mountOllamaRoutes(app);

if (isProd) {
  const dist = path.join(root, 'client/dist');
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pagweb Fitbit emulator on http://localhost:${PORT}`);
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    configFile: path.join(root, 'client/vite.config.js'),
    server: { middlewareMode: true, hmr: { server: undefined } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pagweb Fitbit emulator (dev) on http://localhost:${PORT}`);
  });
  vite.httpServer = server;
}
