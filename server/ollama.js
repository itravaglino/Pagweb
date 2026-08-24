import { CHAT_MODEL_FALLBACKS, DEFAULT_OLLAMA_HOST, LIGHT_MODEL_FALLBACKS, pickOllamaModel } from '../shared/ollama.js';

function ollamaHost() {
  return process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST;
}

async function fetchTags(host) {
  const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return (data.models || []).map((m) => m.name).filter(Boolean);
}

export function mountOllamaRoutes(app) {
  app.get('/api/ollama/status', async (_req, res) => {
    const host = ollamaHost();
    try {
      const models = await fetchTags(host);
      const light = pickOllamaModel(models, process.env.OLLAMA_LIGHT_MODEL, LIGHT_MODEL_FALLBACKS);
      const chat = pickOllamaModel(models, process.env.OLLAMA_CHAT_MODEL, CHAT_MODEL_FALLBACKS);
      res.json({
        ok: Boolean(light || chat),
        host,
        models,
        light,
        chat,
        gpu: true,
      });
    } catch {
      res.json({ ok: false, host, models: [], light: null, chat: null, gpu: false });
    }
  });

  app.post('/api/ollama/chat', async (req, res) => {
    const host = ollamaHost();
    try {
      const upstream = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: req.body?.model,
          messages: req.body?.messages || [],
          stream: req.body?.stream !== false,
          options: req.body?.options || {},
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        res.status(upstream.status).json({ error: detail || 'Ollama chat failed' });
        return;
      }
      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Cache-Control', 'no-cache');
      if (!upstream.body) {
        res.end();
        return;
      }
      for await (const chunk of upstream.body) {
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      res.status(502).json({ error: err?.message || 'Ollama no disponible' });
    }
  });
}
