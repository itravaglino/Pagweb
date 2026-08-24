import {
  DEFAULT_VOICE,
  loadVoiceSettings,
  pickBestVoice,
  saveVoiceSettings,
} from '@shared/voices.js';

const WAKE_RE = /(hey|oye|hola|hi|ok)\s+gem+a/i;

export function isSpeechSupported() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

export function isTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function listVoices() {
  if (!isTtsSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function waitForVoices(timeoutMs = 1500) {
  if (!isTtsSupported()) return Promise.resolve([]);
  const current = listVoices();
  if (current.length) return Promise.resolve(current);
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(listVoices());
    };
    const onChange = () => done();
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    window.setTimeout(done, timeoutMs);
  });
}

export async function speak(text, options = {}) {
  const {
    muted = false,
    voiceURI = '',
    lang = DEFAULT_VOICE.lang,
    rate = DEFAULT_VOICE.rate,
    pitch = DEFAULT_VOICE.pitch,
    volume = DEFAULT_VOICE.volume,
  } = options;
  if (muted || !text || !isTtsSupported()) return;
  const voices = await waitForVoices();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  const chosen = pickBestVoice(voices, { voiceURI, lang });
  if (chosen) {
    u.voice = chosen;
    u.lang = chosen.lang || lang;
  } else {
    u.lang = lang;
  }
  u.rate = rate;
  u.pitch = pitch;
  u.volume = volume;
  await new Promise((resolve) => {
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}

export function createMic({ onPartial, onFinal, onError, lang = 'es-AR' } = {}) {
  if (!isSpeechSupported()) {
    return {
      supported: false,
      start() {},
      stop() {},
    };
  }

  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (event) => {
    let partial = '';
    let finals = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0].transcript;
      if (event.results[i].isFinal) finals += `${piece} `;
      else partial += piece;
    }
    if (partial) onPartial?.(partial.trim());
    if (finals.trim()) onFinal?.(finals.trim());
  };
  rec.onerror = (event) => onError?.(event.error);

  return {
    supported: true,
    start() {
      try {
        rec.start();
      } catch {
        /* already started */
      }
    },
    stop() {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

export function containsWake(text) {
  return WAKE_RE.test(String(text || ''));
}

export { loadVoiceSettings, saveVoiceSettings, pickBestVoice };
