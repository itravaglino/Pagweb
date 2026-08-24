export const VOICE_STORAGE_KEY = 'gemma-voice';

export const VOICE_PRESETS = {
  gemma: { id: 'gemma', label: 'Gemma', rate: 1.06, pitch: 1.12, volume: 1 },
  clara: { id: 'clara', label: 'Clara', rate: 0.98, pitch: 1, volume: 1 },
  baja: { id: 'baja', label: 'Baja', rate: 0.88, pitch: 0.9, volume: 0.95 },
};

export const DEFAULT_VOICE = {
  preset: 'gemma',
  voiceURI: '',
  lang: 'es-AR',
  rate: VOICE_PRESETS.gemma.rate,
  pitch: VOICE_PRESETS.gemma.pitch,
  volume: VOICE_PRESETS.gemma.volume,
};

const FEMALE_HINT =
  /\b(elena|sabina|dalia|helena|paloma|catalina|sofia|sofía|luciana|paulina|monica|mónica|pilar|laura|carmen|isabel|maria|maría|zira|eva|elsa|nuria|conchita)\b/i;
const NATURAL_HINT = /neural|natural|online|google|microsoft|premium|enhanced/i;
const ROBOT_HINT = /compact|espeak|dummy|microsoft david|microsoft mark|microsoft sam/i;

export function scoreVoice(voice, preferredLang = 'es-AR') {
  if (!voice) return -Infinity;
  const lang = String(voice.lang || '').toLowerCase();
  const name = String(voice.name || '');
  const preferred = String(preferredLang || 'es-AR').toLowerCase();
  let score = 0;
  if (ROBOT_HINT.test(name)) score -= 40;
  if (lang.startsWith('es-ar') || lang === 'es_ar') score += 48;
  else if (lang.startsWith('es-mx')) score += 36;
  else if (lang.startsWith('es-es')) score += 28;
  else if (lang.startsWith('es')) score += 18;
  if (preferred && lang.startsWith(preferred.slice(0, 5))) score += 12;
  if (NATURAL_HINT.test(name)) score += 22;
  if (FEMALE_HINT.test(name)) score += 18;
  if (voice.localService === false && NATURAL_HINT.test(name)) score += 8;
  if (voice.default && lang.startsWith('es')) score += 4;
  return score;
}

export function pickBestVoice(voices, { voiceURI = '', lang = 'es-AR' } = {}) {
  const list = Array.isArray(voices) ? voices : [];
  if (!list.length) return null;
  if (voiceURI) {
    const exact = list.find((v) => v.voiceURI === voiceURI || v.name === voiceURI);
    if (exact) return exact;
  }
  return [...list].sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang))[0] || null;
}

export function applyPreset(settings, presetId) {
  const preset = VOICE_PRESETS[presetId] || VOICE_PRESETS.gemma;
  return {
    ...DEFAULT_VOICE,
    ...settings,
    preset: preset.id,
    rate: preset.rate,
    pitch: preset.pitch,
    volume: preset.volume,
  };
}

export function normalizeVoiceSettings(raw) {
  const base = { ...DEFAULT_VOICE, ...(raw && typeof raw === 'object' ? raw : {}) };
  const rate = Number(base.rate);
  const pitch = Number(base.pitch);
  const volume = Number(base.volume);
  return {
    preset: VOICE_PRESETS[base.preset] ? base.preset : 'gemma',
    voiceURI: typeof base.voiceURI === 'string' ? base.voiceURI : '',
    lang: typeof base.lang === 'string' && base.lang ? base.lang : 'es-AR',
    rate: Number.isFinite(rate) ? Math.min(1.6, Math.max(0.6, rate)) : DEFAULT_VOICE.rate,
    pitch: Number.isFinite(pitch) ? Math.min(1.6, Math.max(0.6, pitch)) : DEFAULT_VOICE.pitch,
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1,
  };
}

export function loadVoiceSettings(storage) {
  try {
    const raw = storage?.getItem?.(VOICE_STORAGE_KEY);
    return normalizeVoiceSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_VOICE };
  }
}

export function saveVoiceSettings(settings, storage) {
  const next = normalizeVoiceSettings(settings);
  try {
    storage?.setItem?.(VOICE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}
