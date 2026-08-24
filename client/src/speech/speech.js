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

export function speak(text, { lang = 'es-ES', muted = false } = {}) {
  if (muted || !text || !isTtsSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.04;
  u.pitch = 1.15;
  const voices = window.speechSynthesis.getVoices();
  const es = voices.find((v) => v.lang.startsWith('es'));
  if (es) u.voice = es;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}

export function createMic({ onPartial, onFinal, onError, lang = 'es-ES' } = {}) {
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
