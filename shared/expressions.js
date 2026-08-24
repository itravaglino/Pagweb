export const EMOTIONS = [
  'idle',
  'listen',
  'think',
  'speak',
  'happy',
  'confused',
  'sleepy',
  'excited',
];

export const EXPRESSION_MAP = {
  idle: {
    eyeWidth: 11,
    eyeHeight: 11,
    eyeGap: 28,
    pupil: 5.2,
    mouth: 'smile',
    mouthOpen: 0.15,
    blush: 0.35,
    brow: 0,
    sparkle: 0,
  },
  listen: {
    eyeWidth: 13,
    eyeHeight: 14,
    eyeGap: 30,
    pupil: 6.1,
    mouth: 'o',
    mouthOpen: 0.55,
    blush: 0.45,
    brow: 4,
    sparkle: 0.2,
  },
  think: {
    eyeWidth: 10,
    eyeHeight: 7,
    eyeGap: 26,
    pupil: 4.4,
    mouth: 'flat',
    mouthOpen: 0.05,
    blush: 0.2,
    brow: -3,
    sparkle: 0,
  },
  speak: {
    eyeWidth: 11,
    eyeHeight: 11,
    eyeGap: 28,
    pupil: 5,
    mouth: 'speak',
    mouthOpen: 0.7,
    blush: 0.4,
    brow: 1,
    sparkle: 0.1,
  },
  happy: {
    eyeWidth: 12,
    eyeHeight: 8,
    eyeGap: 28,
    pupil: 4.6,
    mouth: 'grin',
    mouthOpen: 0.45,
    blush: 0.7,
    brow: 6,
    sparkle: 0.55,
  },
  confused: {
    eyeWidth: 10,
    eyeHeight: 12,
    eyeGap: 32,
    pupil: 5.4,
    mouth: 'wavy',
    mouthOpen: 0.2,
    blush: 0.15,
    brow: -6,
    sparkle: 0,
  },
  sleepy: {
    eyeWidth: 12,
    eyeHeight: 3.2,
    eyeGap: 26,
    pupil: 2.4,
    mouth: 'flat',
    mouthOpen: 0.05,
    blush: 0.5,
    brow: -2,
    sparkle: 0,
  },
  excited: {
    eyeWidth: 13,
    eyeHeight: 13,
    eyeGap: 30,
    pupil: 6.4,
    mouth: 'grin',
    mouthOpen: 0.85,
    blush: 0.8,
    brow: 8,
    sparkle: 1,
  },
};

const ALIASES = {
  sad: 'sleepy',
  triste: 'sleepy',
  feliz: 'happy',
  alegre: 'happy',
  contenta: 'happy',
  contento: 'happy',
  sorpresa: 'listen',
  surprised: 'listen',
  thinking: 'think',
  pensar: 'think',
  hablando: 'speak',
  talking: 'speak',
  listening: 'listen',
  escuchar: 'listen',
  dormida: 'sleepy',
  cansada: 'sleepy',
  emocionada: 'excited',
  excited: 'excited',
  wow: 'excited',
  confundida: 'confused',
  confusa: 'confused',
  normal: 'idle',
  neutra: 'idle',
};

export function normalizeEmotion(value, fallback = 'idle') {
  if (!value || typeof value !== 'string') return fallback;
  const key = value.trim().toLowerCase();
  if (EMOTIONS.includes(key)) return key;
  if (ALIASES[key]) return ALIASES[key];
  return fallback;
}

export function expressionFor(emotion) {
  return EXPRESSION_MAP[normalizeEmotion(emotion)];
}

export function clamp01(value, fallback = 0.45) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}
