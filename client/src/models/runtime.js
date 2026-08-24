import {
  parseDurationSeconds,
  parseModelJson,
  routeIntent,
  normalizeRoute,
} from '@shared/router.js';
import { demoChatReply, streamText } from '@shared/fallback.js';
import { parseOllamaStreamLine } from '@shared/ollama.js';

const LIGHT_PROMPT = `Eres el cerebro ligero del reloj Gemma.
Responde SOLO un JSON válido, sin markdown ni texto extra.
Formato:
{"intent":"chat|timer|stats|face|clock|stop","emotion":"idle|listen|think|speak|happy|confused|sleepy|excited","bounce":0.0,"seconds":null,"reply":"frase corta en español"}
Reglas: intent timer necesita seconds. reply máximo 12 palabras.`;

const CHAT_PROMPT_PREFIX =
  'Eres Gemma, mascota circular de un reloj Fitbit. Habla en español, máximo 2 frases, cálida, breve, sin markdown ni listas.';

function hasWebGPU() {
  return typeof navigator !== 'undefined' && Boolean(navigator.gpu);
}

export function createDemoRuntime() {
  return {
    mode: 'demo',
    lightReady: true,
    chatReady: true,
    gpuLabel: '',
    async route(text) {
      return routeIntent(text);
    },
    async *chat(text) {
      yield* streamText(demoChatReply(text), 16);
    },
    reset() {},
    dispose() {},
  };
}

function createLiveRuntime(lightEngine, chatEngine) {
  const chat = chatEngine || lightEngine;
  return {
    mode: chatEngine ? 'dual' : 'light',
    lightReady: true,
    chatReady: true,
    gpuLabel: 'WebGPU',
    async route(text) {
      try {
        lightEngine.resetConversation();
        lightEngine.addUserMessage(`${LIGHT_PROMPT}\nUsuario: ${text}`);
        let raw = '';
        for await (const token of lightEngine.generate({
          temperature: 0.2,
          maxTokens: 96,
        })) {
          raw += token;
        }
        const routed = normalizeRoute(parseModelJson(raw), text);
        if (routed.intent === 'timer' && !routed.seconds) {
          routed.seconds = parseDurationSeconds(text);
        }
        return routed;
      } catch {
        return routeIntent(text);
      }
    },
    async *chat(text) {
      try {
        chat.resetConversation();
        chat.addUserMessage(`${CHAT_PROMPT_PREFIX}\nUsuario: ${text}`);
        for await (const token of chat.generate({
          temperature: 0.7,
          maxTokens: 96,
        })) {
          yield token;
        }
      } catch {
        yield* streamText(demoChatReply(text), 16);
      }
    },
    reset() {
      lightEngine.resetConversation();
      if (chatEngine) chatEngine.resetConversation();
    },
    dispose() {
      lightEngine.dispose();
      if (chatEngine && chatEngine !== lightEngine) chatEngine.dispose();
    },
  };
}

async function loadEngine(model, onProgress) {
  const { createGemmaEngine } = await import('gemma-webgpu');
  return createGemmaEngine({
    model,
    onProgress,
  });
}

async function probeOllama() {
  try {
    const res = await fetch('/api/ollama/status', { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !data.chat) return null;
    return data;
  } catch {
    return null;
  }
}

async function* streamOllama({ model, messages, options }) {
  const res = await fetch('/api/ollama/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, options }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const parsed = parseOllamaStreamLine(line);
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.text) yield parsed.text;
    }
  }
  if (buf.trim()) {
    const parsed = parseOllamaStreamLine(buf);
    if (parsed.text) yield parsed.text;
  }
}

async function ollamaCollect(args) {
  let raw = '';
  for await (const token of streamOllama(args)) raw += token;
  return raw;
}

export function createOllamaRuntime({ light, chat } = {}) {
  const chatModel = chat || light;
  const lightModel = light || chat;
  return {
    mode: 'gpu',
    lightReady: true,
    chatReady: true,
    gpuLabel: chatModel,
    lightModel,
    chatModel,
    async route(text) {
      try {
        const raw = await ollamaCollect({
          model: lightModel,
          messages: [
            { role: 'system', content: LIGHT_PROMPT },
            { role: 'user', content: text },
          ],
          options: { temperature: 0.1, num_predict: 96 },
        });
        const routed = normalizeRoute(parseModelJson(raw), text);
        if (routed.intent === 'timer' && !routed.seconds) {
          routed.seconds = parseDurationSeconds(text);
        }
        return routed;
      } catch {
        return routeIntent(text);
      }
    },
    async *chat(text) {
      try {
        for await (const token of streamOllama({
          model: chatModel,
          messages: [
            { role: 'system', content: CHAT_PROMPT_PREFIX },
            { role: 'user', content: text },
          ],
          options: { temperature: 0.7, num_predict: 96 },
        })) {
          yield token;
        }
      } catch {
        yield* streamText(demoChatReply(text), 16);
      }
    },
    reset() {},
    dispose() {},
  };
}

export async function createDualRuntime({ onProgress, forceDemo = false } = {}) {
  if (forceDemo) {
    onProgress?.({ status: 'demo', loaded: 1, total: 1 });
    return createDemoRuntime();
  }

  onProgress?.({ status: 'Buscando GPU local (Ollama)…', loaded: 0, total: 1 });
  const ollama = await probeOllama();
  if (ollama?.chat) {
    onProgress?.({
      status: `GPU local · ${ollama.chat}`,
      loaded: 1,
      total: 1,
    });
    return createOllamaRuntime({ light: ollama.light, chat: ollama.chat });
  }

  if (!hasWebGPU()) {
    onProgress?.({ status: 'demo', loaded: 1, total: 1 });
    return createDemoRuntime();
  }

  try {
    onProgress?.({ status: 'Cargando Gemma 3 270M en WebGPU…', loaded: 0, total: 1, stage: '270m' });
    const light = await loadEngine('270m', (p) => onProgress?.({ ...p, stage: '270m' }));

    let chat = null;
    try {
      onProgress?.({ status: 'Cargando Gemma 3 1B en WebGPU…', loaded: 0, total: 1, stage: '1b' });
      chat = await loadEngine('1b', (p) => onProgress?.({ ...p, stage: '1b' }));
    } catch (err) {
      console.warn('Gemma 1B unavailable, using 270M for chat', err);
    }

    onProgress?.({ status: chat ? 'dual' : 'light', loaded: 1, total: 1 });
    return createLiveRuntime(light, chat);
  } catch (err) {
    console.warn('Falling back to demo runtime', err);
    onProgress?.({ status: 'demo', loaded: 1, total: 1 });
    return createDemoRuntime();
  }
}

export { hasWebGPU, probeOllama };
