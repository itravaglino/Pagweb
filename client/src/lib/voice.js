import { fetchVoice } from "./api.js";
import {
  completeByPhrase,
  parseCompletePhrases,
  parseNewTodos,
} from "@shared/tasks.js";

export { completeByPhrase, parseCompletePhrases, parseNewTodos };

export function speechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function canUseSpeech() {
  return Boolean(speechRecognitionCtor());
}

export function canUseMic() {
  return Boolean(typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia);
}

export function createRecognizer({ lang = "es-AR", onPartial, onFinal, onError } = {}) {
  const Ctor = speechRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onresult = (event) => {
    let interim = "";
    let finals = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript || "";
      if (event.results[i].isFinal) finals += `${piece} `;
      else interim += piece;
    }
    if (interim && onPartial) onPartial(interim.trim());
    if (finals.trim() && onFinal) onFinal(finals.trim());
  };
  rec.onerror = (event) => onError?.(event.error || event.message || "speech");
  return rec;
}

export async function startRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
    (type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)
  );
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.addEventListener("dataavailable", (event) => {
    if (event.data?.size) chunks.push(event.data);
  });
  rec.start();
  return {
    rec,
    stream,
    chunks,
    stop() {
      return new Promise((resolve) => {
        rec.addEventListener(
          "stop",
          () => {
            stream.getTracks().forEach((track) => track.stop());
            const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
            resolve(blob);
          },
          { once: true }
        );
        if (rec.state !== "inactive") rec.stop();
        else {
          stream.getTracks().forEach((track) => track.stop());
          resolve(new Blob(chunks));
        }
      });
    },
  };
}

export function pickSpanishVoice() {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices() || [];
  return (
    voices.find((voice) => /es-AR/i.test(voice.lang)) ||
    voices.find((voice) => /es-MX|es-US|es-CL|es-CO/i.test(voice.lang)) ||
    voices.find((voice) => /^es/i.test(voice.lang)) ||
    null
  );
}

export function speakSpanish(text, { onstart, onend, onerror } = {}) {
  if (typeof speechSynthesis === "undefined") {
    onerror?.(new Error("no-speechSynthesis"));
    return null;
  }
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "es-AR";
  const voice = pickSpanishVoice();
  if (voice) utter.voice = voice;
  utter.rate = 1.02;
  utter.pitch = 1;
  if (onstart) utter.onstart = onstart;
  if (onend) utter.onend = onend;
  if (onerror) utter.onerror = () => onerror(new Error("tts"));
  speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

export function postVoice(body) {
  return fetchVoice(body);
}

export async function archiveVoiceDay(body) {
  try {
    await fetch("/api/voice/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    /* archivo opcional */
  }
}
