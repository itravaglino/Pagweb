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

const BASE_FACE = {
  browSkew: 0,
  lookX: 0,
  lookY: 0,
  tongue: 0,
  derp: 0,
  tooth: 0,
};

export const EXPRESSION_MAP = {
  idle: {
    eyeWidth: 11.5,
    eyeHeight: 11.2,
    eyeGap: 27,
    pupil: 5.4,
    mouth: 'cat',
    mouthOpen: 0.12,
    blush: 0.42,
    brow: 2,
    sparkle: 0.15,
    lookX: 0.18,
    lookY: 0.06,
  },
  listen: {
    eyeWidth: 14,
    eyeHeight: 15,
    eyeGap: 31,
    pupil: 6.6,
    mouth: 'o',
    mouthOpen: 0.62,
    blush: 0.5,
    brow: 7,
    sparkle: 0.35,
    lookY: -0.12,
  },
  think: {
    eyeWidth: 10,
    eyeHeight: 7.5,
    eyeGap: 26,
    pupil: 4.6,
    mouth: 'smirk',
    mouthOpen: 0.08,
    blush: 0.22,
    brow: -2,
    sparkle: 0,
    browSkew: 10,
    lookX: 0.55,
    lookY: -0.42,
  },
  speak: {
    eyeWidth: 11.5,
    eyeHeight: 11,
    eyeGap: 28,
    pupil: 5.1,
    mouth: 'speak',
    mouthOpen: 0.72,
    blush: 0.44,
    brow: 2,
    sparkle: 0.18,
    lookY: 0.08,
  },
  happy: {
    eyeWidth: 12.5,
    eyeHeight: 7.2,
    eyeGap: 28,
    pupil: 4.4,
    mouth: 'grin',
    mouthOpen: 0.52,
    blush: 0.82,
    brow: 8,
    sparkle: 0.7,
    tooth: 1,
    lookY: 0.1,
  },
  confused: {
    eyeWidth: 10.5,
    eyeHeight: 12.5,
    eyeGap: 33,
    pupil: 5.6,
    mouth: 'wavy',
    mouthOpen: 0.22,
    blush: 0.18,
    brow: -7,
    sparkle: 0,
    browSkew: 16,
    derp: 1,
    lookX: -0.4,
    lookY: 0.28,
  },
  sleepy: {
    eyeWidth: 13,
    eyeHeight: 3.4,
    eyeGap: 25,
    pupil: 2.2,
    mouth: 'tongue',
    mouthOpen: 0.12,
    blush: 0.55,
    brow: -4,
    sparkle: 0,
    tongue: 0.85,
    lookY: 0.45,
    derp: 0.4,
  },
  excited: {
    eyeWidth: 13.5,
    eyeHeight: 13.8,
    eyeGap: 30,
    pupil: 6.8,
    mouth: 'grin',
    mouthOpen: 0.92,
    blush: 0.88,
    brow: 9,
    sparkle: 1,
    tooth: 1,
    tongue: 0.55,
    lookY: -0.08,
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
  return { ...BASE_FACE, ...EXPRESSION_MAP[normalizeEmotion(emotion)] };
}

export function clamp01(value, fallback = 0.45) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}
