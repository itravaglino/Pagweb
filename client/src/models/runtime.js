import {
  parseDurationSeconds,
  parseModelJson,
  routeIntent,
  normalizeRoute,
} from '@shared/router.js';
import { demoChatReply, streamText } from '@shared/fallback.js';

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

export async function createDualRuntime({ onProgress, forceDemo = false } = {}) {
  if (forceDemo || !hasWebGPU()) {
    onProgress?.({ status: 'demo', loaded: 1, total: 1 });
    return createDemoRuntime();
  }

  try {
    onProgress?.({ status: 'Cargando Gemma 3 270M…', loaded: 0, total: 1, stage: '270m' });
    const light = await loadEngine('270m', (p) => onProgress?.({ ...p, stage: '270m' }));

    let chat = null;
    try {
      onProgress?.({ status: 'Cargando Gemma 3 1B…', loaded: 0, total: 1, stage: '1b' });
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

export { hasWebGPU };
