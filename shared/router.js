import { clamp01, normalizeEmotion } from './expressions.js';

export const WAKE_WORDS = [
  'hey gemma',
  'oye gemma',
  'hola gemma',
  'hey gema',
  'oye gema',
  'hola gema',
  'hi gemma',
  'ok gemma',
];

export const INTENTS = ['chat', 'timer', 'stats', 'face', 'clock', 'stop'];

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[¿?¡!.,;:()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractWake(text) {
  const raw = String(text || '');
  const n = normalizeText(raw);
  for (const word of WAKE_WORDS) {
    const i = n.indexOf(word);
    if (i !== -1) {
      return {
        woke: true,
        rest: n.slice(i + word.length).trim(),
        raw,
      };
    }
  }
  return { woke: false, rest: n, raw };
}

export function parseDurationSeconds(text) {
  const n = normalizeText(text);
  if (!n) return null;

  const minMatch = n.match(/(\d+(?:[.,]\d+)?)\s*(minutos?|mins?|m)\b/);
  if (minMatch) return Math.round(Number(minMatch[1].replace(',', '.')) * 60);

  const secMatch = n.match(/(\d+(?:[.,]\d+)?)\s*(segundos?|secs?|s)\b/);
  if (secMatch) return Math.round(Number(secMatch[1].replace(',', '.')));

  if (/\b(un|una)\s+minuto\b/.test(n)) return 60;
  if (/\bmedio\s+minuto\b/.test(n)) return 30;
  if (/\b(un|una)\s+hora\b/.test(n)) return 3600;

  const bare = n.match(/\b(\d+)\b/);
  if (bare && /\b(timer|temporizador|cuenta atras|alarma|pomodoro)\b/.test(n)) {
    const value = Number(bare[1]);
    return value > 10 ? value : value * 60;
  }
  return null;
}

const FACE_WORDS = {
  feliz: 'happy',
  alegre: 'happy',
  contenta: 'happy',
  contento: 'happy',
  sonrie: 'happy',
  sonreir: 'happy',
  triste: 'sleepy',
  cansada: 'sleepy',
  cansado: 'sleepy',
  dormida: 'sleepy',
  dormido: 'sleepy',
  duerme: 'sleepy',
  emocionada: 'excited',
  emocionado: 'excited',
  wow: 'excited',
  confundida: 'confused',
  confundido: 'confused',
  confusa: 'confused',
  despierta: 'listen',
  escucha: 'listen',
};

function emotionFromText(n) {
  for (const [word, emotion] of Object.entries(FACE_WORDS)) {
    if (n.includes(word)) return emotion;
  }
  return null;
}

function wantsFace(n) {
  return (
    /\b(cara|expresion|ponte|sonrie|sonreir|duerme|despierta)\b/.test(n) ||
    emotionFromText(n) != null
  );
}

export function routeIntent(text) {
  const n = normalizeText(text);
  if (!n) {
    return { intent: 'chat', emotion: 'listen', bounce: 0.4, seconds: null, reply: null };
  }

  if (/\b(para|stop|cancela|silencio|callate|basta)\b/.test(n) && n.split(' ').length <= 4) {
    return {
      intent: 'stop',
      emotion: 'idle',
      bounce: 0.2,
      seconds: null,
      reply: 'Vale, me quedo quietecita.',
    };
  }

  if (
    /\b(hora|reloj|que hora|hora es)\b/.test(n) &&
    !/\b(timer|temporizador|cuenta)\b/.test(n)
  ) {
    return {
      intent: 'clock',
      emotion: 'happy',
      bounce: 0.35,
      seconds: null,
      reply: null,
    };
  }

  if (
    /\b(pasos|calorias|stat|estadisticas|ritmo|frecuencia|bateria|corazon|zona)\b/.test(n)
  ) {
    return {
      intent: 'stats',
      emotion: 'excited',
      bounce: 0.55,
      seconds: null,
      reply: null,
    };
  }

  const seconds = parseDurationSeconds(n);
  if (
    seconds != null &&
    /\b(timer|temporizador|cuenta atras|pon|ponme|pon un|alarma|avisa|cronometro)\b/.test(n)
  ) {
    return {
      intent: 'timer',
      emotion: 'excited',
      bounce: 0.7,
      seconds,
      reply: null,
    };
  }

  if (wantsFace(n)) {
    return {
      intent: 'face',
      emotion: emotionFromText(n) || 'happy',
      bounce: 0.8,
      seconds: null,
      reply: '¡Cambio de cara!',
    };
  }

  return {
    intent: 'chat',
    emotion: 'think',
    bounce: 0.45,
    seconds: null,
    reply: null,
  };
}

export function parseModelJson(text) {
  const raw = String(text || '');
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function normalizeRoute(partial, fallbackText = '') {
  const fallback = routeIntent(fallbackText);
  const parsed = partial && typeof partial === 'object' ? partial : {};
  const intent = INTENTS.includes(parsed.intent) ? parsed.intent : fallback.intent;
  const emotion = normalizeEmotion(parsed.emotion, fallback.emotion);
  const bounce = clamp01(parsed.bounce, fallback.bounce);
  const seconds =
    parsed.seconds == null || parsed.seconds === ''
      ? fallback.seconds
      : Math.max(1, Number(parsed.seconds) || fallback.seconds);
  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim()
      : fallback.reply;
  return { intent, emotion, bounce, seconds: Number.isFinite(seconds) ? seconds : null, reply };
}

export function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimer(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
