/** Catálogo Gemma on-device (MediaPipe LLM Inference / LiteRT web) y prompts cortos para el reloj. */

import { extractJsonObject } from "./analyze.js";

export const GEMMA_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.25/wasm";
export const GEMMA_TASKS_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.25/+esm";

export const WATCH_MAX_CHARS = 180;

export const GEMMA_MODELS = {
  light: {
    id: "light",
    role: "lightest",
    label: "Liviano",
    name: "Gemma 3 270M IT",
    blurb: "El Gemma oficial más chico para web. Cabe en un celular de gama media y ahorra batería.",
    file: "gemma3-270m-it-q8-web.task",
    repo: "litert-community/gemma-3-270m-it",
    url: "https://huggingface.co/litert-community/gemma-3-270m-it/resolve/main/gemma3-270m-it-q8-web.task",
    license: "https://huggingface.co/litert-community/gemma-3-270m-it",
    sizeHint: "~0.3 GB",
    ramHint: "~0.6 GB",
    quant: "int8 web.task",
    maxTokens: 1024,
    maxReplyTokens: 96,
    temperature: 0.35,
    topK: 20,
    defaultFor: "battery",
  },
  watch: {
    id: "watch",
    role: "monitoring",
    label: "Monitoreo",
    name: "Gemma 3n E2B IT",
    blurb: "Arquitectura mobile-first. El más capaz que sigue siendo viable en un teléfono para leer el reloj (FC, sueño, HRV, zonas).",
    file: "gemma-3n-E2B-it-int4-Web.litertlm",
    repo: "google/gemma-3n-E2B-it-litert-lm",
    url: "https://huggingface.co/google/gemma-3n-E2B-it-litert-lm/resolve/main/gemma-3n-E2B-it-int4-Web.litertlm",
    license: "https://huggingface.co/google/gemma-3n-E2B-it-litert-lm",
    sizeHint: "~1.5 GB",
    ramHint: "~2 GB",
    quant: "int4 Web.litertlm",
    maxTokens: 2048,
    maxReplyTokens: 128,
    temperature: 0.45,
    topK: 30,
    defaultFor: "monitoring",
  },
};

export const DEFAULT_GEMMA_VARIANT = "watch";
export const LIGHT_GEMMA_VARIANT = "light";

export function gemmaModel(id) {
  return GEMMA_MODELS[id] || GEMMA_MODELS[DEFAULT_GEMMA_VARIANT];
}

export function listGemmaModels() {
  return [GEMMA_MODELS.light, GEMMA_MODELS.watch];
}

/** Baja a liviano solo con ahorro de batería. Si no hay variante, el default de monitoreo es E2B; en teléfonos de poca RAM sugerimos 270M. */
export function resolveGemmaVariant({ variant, batterySaver, deviceMemory } = {}) {
  if (batterySaver) return LIGHT_GEMMA_VARIANT;
  if (GEMMA_MODELS[variant]) return variant;
  if (Number(deviceMemory) > 0 && Number(deviceMemory) < 4) return LIGHT_GEMMA_VARIANT;
  return DEFAULT_GEMMA_VARIANT;
}

export function clipWatchText(text, max = WATCH_MAX_CHARS) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[`*_#>]/g, "")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 48 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function gemmaSystemPrompt(profile = {}, variantId = DEFAULT_GEMMA_VARIANT) {
  const spec = gemmaModel(variantId);
  const name = profile.name || "vos";
  return `Sos Lumen en el teléfono. Contestás para una pantalla de Fitbit (Charge 6 u otro tracker): ${WATCH_MAX_CHARS} caracteres máximo, 1 o 2 frases, español rioplatense (voseo).
No sos médico. No diagnostiques. No inventes números: usá solo el JSON de métricas. Si un campo es null, decí que el reloj no lo midió.
Persona: ${name}. Modelo on-device: ${spec.name} (${spec.quant}).
Devolvé JSON estricto, sin markdown:
{"watch":"texto corto para el reloj","title":"máx 18 chars"}
El campo watch es lo que se muestra en el Fitbit. Nada de ensayos.`;
}

export function gemmaUserPrompt({ question, snapshot, analysis }) {
  return JSON.stringify(
    {
      pregunta: question,
      reloj: snapshot,
      scores: analysis
        ? {
            overall: analysis.overall,
            band: analysis.band?.label,
            sleep: analysis.scores?.sleep,
            movement: analysis.scores?.movement,
            recovery: analysis.scores?.recovery,
          }
        : undefined,
    },
    null,
    0
  );
}

export function parseGemmaWatchReply(text, fallback = "") {
  const parsed = extractJsonObject(text);
  const watch = clipWatchText(parsed?.watch || parsed?.title || rawWatchFallback(text) || fallback);
  const title = clipWatchText(parsed?.title || "Lumen", 18);
  return { watch, title, raw: String(text || "").slice(0, 500) };
}

function rawWatchFallback(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[{}"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
