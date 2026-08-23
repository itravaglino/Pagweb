import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDay, extractJsonObject, minutesToHm } from "../shared/analyze.js";
import { PERSONAS, getPersonaPayload, toMetrics } from "../shared/sampleFitbit.js";

test("minutesToHm formatea sueño", () => {
  assert.equal(minutesToHm(378), "6h 18m");
});

test("persona agotada puntúa peor que recargada", () => {
  const tired = analyzeDay(toMetrics(getPersonaPayload("agotado")), { timezone: "UTC" }, new Date("2026-08-22T15:00:00Z"));
  const fresh = analyzeDay(toMetrics(getPersonaPayload("recargado")), { timezone: "UTC" }, new Date("2026-08-22T15:00:00Z"));
  assert.ok(fresh.overall > tired.overall, `${fresh.overall} vs ${tired.overall}`);
  assert.equal(tired.band.id, "recuperacion");
  assert.ok(fresh.scores.sleep > 75);
});

test("tarde agotada no pide una caminata larga", () => {
  const evening = new Date("2026-08-22T17:30:00-03:00");
  const analysis = analyzeDay(
    toMetrics(getPersonaPayload("agotado")),
    { timezone: "America/Argentina/Buenos_Aires" },
    evening
  );
  const blob = analysis.plan.map((p) => p.action).join(" ").toLowerCase();
  assert.equal(analysis.band.id, "recuperacion");
  assert.ok(!blob.includes("36 min") && !blob.includes("45 min"));
  assert.ok(blob.includes("mínimo") || blob.includes("minimo") || blob.includes("estirar"));
});

test("plan de la noche prioriza sueño si hay deuda", () => {
  const night = new Date("2026-08-22T23:30:00-03:00");
  const analysis = analyzeDay(toMetrics(getPersonaPayload("agotado")), {
    timezone: "America/Argentina/Buenos_Aires",
    name: "Nacho",
  }, night);
  assert.ok(analysis.plan.length >= 3);
  const blob = analysis.plan.map((p) => p.action + p.why).join(" ").toLowerCase();
  assert.ok(blob.includes("cama") || blob.includes("sueño") || blob.includes("apagar") || blob.includes("aterrizaje"));
});

test("extractJsonObject tolera fences markdown", () => {
  const parsed = extractJsonObject('```json\n{"headline":"hola","bestDayPlan":[]}\n```');
  assert.equal(parsed.headline, "hola");
});

test("personas exportadas", () => {
  assert.deepEqual(Object.keys(PERSONAS).sort(), ["agotado", "mixto", "recargado"]);
  const metrics = toMetrics(getPersonaPayload("mixto"));
  assert.ok(metrics.steps > 0);
  assert.ok(metrics.sleepMinutes > 0);
});

test("payloadFromManual respeta sueño y pasos", async () => {
  const { payloadFromManual } = await import("../shared/sampleFitbit.js");
  const { energyWindowFor, localNarrative } = await import("../shared/analyze.js");
  const metrics = toMetrics(
    payloadFromManual({ sleepHours: 5, steps: 1234, displayName: "Nacho", restingHeartRate: 78, hrv: 20 })
  );
  assert.equal(metrics.steps, 1234);
  assert.equal(metrics.sleepMinutes, 300);
  assert.equal(metrics.source, "manual");
  const analysis = analyzeDay(metrics, { timezone: "UTC" }, new Date("2026-08-22T18:00:00Z"));
  const story = localNarrative(analysis);
  assert.ok(story.energyWindow.length > 12);
  assert.ok(energyWindowFor(10, { sleep: 90, recovery: 90 }).toLowerCase().includes("profundo") || energyWindowFor(10, { sleep: 90, recovery: 90 }).length > 8);
});
