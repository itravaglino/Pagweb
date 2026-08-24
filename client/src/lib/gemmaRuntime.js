import {
  DEFAULT_GEMMA_VARIANT,
  GEMMA_TASKS_CDN,
  GEMMA_WASM,
  gemmaModel,
  gemmaSystemPrompt,
  gemmaUserPrompt,
  parseGemmaWatchReply,
} from "@shared/gemma.js";
import { localWatchReply } from "@shared/watchMetrics.js";
import { analyzeDay } from "@shared/analyze.js";

const MODEL_CACHE = "pagweb-gemma-models-v1";

function hasWebGpu() {
  return typeof navigator !== "undefined" && Boolean(navigator.gpu);
}

async function cachePut(url, response) {
  if (typeof caches === "undefined") return;
  const cache = await caches.open(MODEL_CACHE);
  await cache.put(url, response);
}

async function cacheMatch(url) {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open(MODEL_CACHE);
  return cache.match(url);
}

export async function downloadGemmaModel(variantId, { hfToken, onProgress } = {}) {
  const spec = gemmaModel(variantId);
  const url = `/api/gemma/asset/${spec.id}`;
  const cached = await cacheMatch(url);
  if (cached && cached.ok) {
    onProgress?.({ loaded: 1, total: 1, cached: true });
    return cached.blob();
  }
  const headers = {};
  if (hfToken) headers.Authorization = `Bearer ${hfToken}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.hint || data.error || `No pude bajar ${spec.file} (${res.status})`);
  }
  const total = Number(res.headers.get("content-length") || 0);
  if (!res.body || !onProgress) {
    const blob = await res.blob();
    await cachePut(url, new Response(blob.slice(), { headers: { "Content-Type": "application/octet-stream" } }));
    return blob;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress({ loaded, total, cached: false });
  }
  const blob = new Blob(chunks, { type: "application/octet-stream" });
  await cachePut(url, new Response(blob.slice(), { headers: { "Content-Type": "application/octet-stream" } }));
  return blob;
}

let worker = null;
let workerReady = false;

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./gemma.worker.js", import.meta.url), { type: "module" });
  return worker;
}

function workerCall(payload, transfer = []) {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const onMsg = (event) => {
      if (event.data?.id !== id) return;
      w.removeEventListener("message", onMsg);
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ ...payload, id }, transfer);
  });
}

export async function loadGemmaOnDevice(variantId, { hfToken, file, onProgress } = {}) {
  if (!hasWebGpu()) {
    throw new Error("Este celular/navegador no tiene WebGPU. Gemma on-device necesita Chrome actualizado.");
  }
  let blob = file;
  if (!blob) {
    blob = await downloadGemmaModel(variantId, { hfToken, onProgress });
  }
  const blobUrl = URL.createObjectURL(blob);
  const spec = gemmaModel(variantId);
  await workerCall({
    type: "load",
    blobUrl,
    wasm: GEMMA_WASM,
    cdn: GEMMA_TASKS_CDN,
    maxTokens: spec.maxTokens,
    temperature: spec.temperature,
    topK: spec.topK,
  });
  workerReady = true;
  return spec;
}

export function gemmaIsReady() {
  return workerReady;
}

export async function unloadGemma() {
  if (!worker) return;
  try {
    await workerCall({ type: "unload" });
  } catch {
    /* ignore */
  }
  worker.terminate();
  worker = null;
  workerReady = false;
}

export async function askGemmaWatch({ question, questionId, metrics, profile, variantId }) {
  const analysis = analyzeDay(metrics, profile);
  const local = localWatchReply(questionId || "como-vengo", metrics, profile);
  if (!workerReady) {
    return { ...local, engine: "local", fallbackReason: "gemma_not_loaded" };
  }
  const spec = gemmaModel(variantId || DEFAULT_GEMMA_VARIANT);
  try {
    const prompt = `${gemmaSystemPrompt(profile, spec.id)}\n\n${gemmaUserPrompt({
      question,
      snapshot: local.snapshot,
      analysis,
    })}`;
    const result = await workerCall({ type: "generate", prompt });
    const parsed = parseGemmaWatchReply(result.text, local.watch);
    return {
      watch: parsed.watch,
      title: parsed.title,
      engine: "gemma",
      model: spec.name,
      variant: spec.id,
      snapshot: local.snapshot,
    };
  } catch (error) {
    return { ...local, engine: "local", fallbackReason: error.message };
  }
}

export async function sendWatchNotification(title, body) {
  if (typeof Notification === "undefined") {
    throw new Error("Este navegador no soporta notificaciones.");
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    throw new Error("Sin permiso de notificaciones. El Fitbit las copia del teléfono cuando están activadas.");
  }
  new Notification(title || "Fitbit · Lumen", {
    body,
    tag: "pagweb-watch-lumen",
    lang: "es-AR",
  });
}

export async function postWatchReply(payload) {
  try {
    const res = await fetch("/api/fitbit/watch-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json().catch(() => ({ ok: false }));
  } catch {
    return { ok: false, offline: true };
  }
}
