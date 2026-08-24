import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_GEMMA_VARIANT,
  GEMMA_MODELS,
  clipWatchText,
  gemmaModel,
  listGemmaModels,
  parseGemmaWatchReply,
  resolveGemmaVariant,
} from "../shared/gemma.js";
import { buildWatchSnapshot, detectWatchAlerts, localWatchReply } from "../shared/watchMetrics.js";
import { getPersonaPayload, toMetrics } from "../shared/sampleFitbit.js";
import { getCharacterPayload } from "../shared/character.js";

test("catálogo: 270M liviano y E2B para monitoreo", () => {
  const models = listGemmaModels();
  assert.equal(models.length, 2);
  assert.equal(GEMMA_MODELS.light.file, "gemma3-270m-it-q8-web.task");
  assert.match(GEMMA_MODELS.light.name, /270M/);
  assert.match(GEMMA_MODELS.watch.name, /E2B/);
  assert.match(GEMMA_MODELS.watch.file, /int4-Web\.litertlm/);
  assert.equal(DEFAULT_GEMMA_VARIANT, "watch");
  assert.equal(gemmaModel("watch").id, "watch");
});

test("ahorro de batería fuerza el modelo liviano", () => {
  assert.equal(resolveGemmaVariant({ variant: "watch", batterySaver: true }), "light");
  assert.equal(resolveGemmaVariant({ variant: "watch", batterySaver: false }), "watch");
  assert.equal(resolveGemmaVariant({ deviceMemory: 3 }), "light");
  assert.equal(resolveGemmaVariant({ variant: "watch", deviceMemory: 3 }), "watch");
});

test("respuestas del reloj no superan 180 caracteres", () => {
  const long = "x".repeat(400);
  assert.ok(clipWatchText(long).length <= 180);
  const parsed = parseGemmaWatchReply('{"watch":"FC 68 en reposo. Vas bien.","title":"Ritmo"}');
  assert.equal(parsed.title, "Ritmo");
  assert.match(parsed.watch, /FC 68/);
});

test("el snapshot trae métricas de reloj de mano, no inventa huecos", () => {
  const metrics = toMetrics(getPersonaPayload("mixto"));
  assert.ok(metrics.battery > 0);
  assert.ok(metrics.currentHeartRate > metrics.restingHeartRate);
  assert.ok(metrics.spo2 > 90);
  assert.ok(metrics.deviceName);
  const snap = buildWatchSnapshot(metrics, { stepsGoal: 10000 });
  assert.equal(snap.device.name, "Fitbit Charge 6");
  assert.ok(snap.heart.resting);
  assert.ok(snap.movement.steps > 0);
  assert.ok(snap.sleep.minutes > 0);
  assert.ok(snap.recovery.hrvRmssd > 0);
  assert.ok(snap.recovery.spo2 > 90);
});

test("alertas de FC alta, inactividad y batería salen de datos reales", () => {
  const high = detectWatchAlerts({ currentHeartRate: 132, fairlyActiveMinutes: 0, veryActiveMinutes: 0 });
  assert.ok(high.some((a) => a.id === "high-hr"));
  const sit = detectWatchAlerts({ sedentaryMinutes: 820, steps: 4000, sleepMinutes: 420 });
  assert.ok(sit.some((a) => a.id === "inactive"));
  const bat = detectWatchAlerts({ battery: 12, sleepMinutes: 420 });
  assert.ok(bat.some((a) => a.id === "battery"));
});

test("respuestas locales cortas cubren el reloj y no fingen SpO2 ausente", () => {
  const metrics = toMetrics(getPersonaPayload("recargado"));
  const hr = localWatchReply("fc", metrics, { stepsGoal: 10000 });
  assert.ok(hr.watch.length <= 180);
  assert.match(hr.watch, /lpm|reposo/i);
  const noSpo2 = localWatchReply("oxigeno", { ...metrics, spo2: null, breathingRate: null });
  assert.match(noSpo2.watch.toLowerCase(), /no trae|no midió|hace falta|spo/);
  const how = localWatchReply("como-vengo", metrics);
  assert.ok(how.watch.includes("pasos") || /FC|HRV|sueño/i.test(how.watch));
});

test("el personaje Cami también expone batería y FC actual", () => {
  const metrics = toMetrics(getCharacterPayload());
  assert.ok(metrics.battery > 0);
  assert.ok(metrics.currentHeartRate);
  assert.match(metrics.deviceName, /Charge 6/);
});
