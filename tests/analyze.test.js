import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDay, extractJsonObject, minutesToHm, localNarrative } from "../shared/analyze.js";
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
  assert.ok(["agotado", "mixto", "recargado"].every((id) => PERSONAS[id]));
  assert.ok(PERSONAS.examen && PERSONAS.barrio);
  for (const id of Object.keys(PERSONAS)) {
    const metrics = toMetrics(getPersonaPayload(id));
    assert.ok(metrics.steps > 0, id);
    assert.ok(metrics.sleepMinutes > 0, id);
    assert.equal(metrics.hourlySteps.length, 24, id);
    assert.equal(
      metrics.hourlySteps.reduce((a, b) => a + b.value, 0),
      metrics.steps,
      id
    );
    assert.equal(metrics.week.length, 7, id);
    assert.ok(metrics.heartZones.length >= 3, id);
    assert.ok(metrics.spo2 > 90, id);
  }
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

test("modo fitness pide estímulo si hay margen", () => {
  const at = new Date("2026-08-22T11:00:00-03:00");
  const analysis = analyzeDay(
    toMetrics(getPersonaPayload("recargado")),
    {
      timezone: "America/Argentina/Buenos_Aires",
      name: "Nacho",
      focus: "estudio UNC",
      mode: "fitness",
    },
    at
  );
  const blob = analysis.plan.map((p) => `${p.action} ${p.why}`).join(" ").toLowerCase();
  assert.ok(
    blob.includes("estímulo") || blob.includes("estimulo") || blob.includes("volumen") || blob.includes("progresión") || blob.includes("progresion"),
    blob
  );
});

test("modo recovery nunca pide HIIT", () => {
  const at = new Date("2026-08-22T11:00:00-03:00");
  const analysis = analyzeDay(
    toMetrics(getPersonaPayload("recargado")),
    { timezone: "America/Argentina/Buenos_Aires", mode: "recovery" },
    at
  );
  const blob = analysis.plan.map((p) => `${p.action} ${p.why}`).join(" ").toLowerCase();
  assert.ok(blob.includes("nada de hiit") || blob.includes("hiit"), blob);
  assert.ok(blob.includes("recupero") || blob.includes("movilidad") || blob.includes("caminata"), blob);
});

test("modo sleep y focus cambian el plan local", () => {
  const at = new Date("2026-08-22T15:00:00-03:00");
  const profile = { timezone: "America/Argentina/Buenos_Aires", name: "Nacho", focus: "estudio UNC" };
  const sleep = analyzeDay(toMetrics(getPersonaPayload("mixto")), { ...profile, mode: "sleep" }, at);
  const focus = analyzeDay(toMetrics(getPersonaPayload("mixto")), { ...profile, mode: "focus" }, at);
  const sleepBlob = sleep.plan.map((p) => `${p.action} ${p.why}`).join(" ").toLowerCase();
  const focusBlob = focus.plan.map((p) => `${p.action} ${p.why}`).join(" ").toLowerCase();
  assert.ok(sleepBlob.includes("noche larga") || sleepBlob.includes("cafeína") || sleepBlob.includes("cafeina") || sleepBlob.includes("apagado"), sleepBlob);
  assert.ok(focusBlob.includes("unc") || focusBlob.includes("bloque"), focusBlob);
  const sleepStory = localNarrative(sleep);
  const focusStory = localNarrative(focus);
  assert.notEqual(sleepStory.closing, focusStory.closing);
});

test("nvidiaSystemPrompt incluye el modo y a Nacho", async () => {
  const { nvidiaSystemPrompt } = await import("../shared/fitness.js");
  const prompt = nvidiaSystemPrompt(
    { name: "Nacho", org: "UNC", city: "Córdoba", focus: "estudio UNC" },
    { hour: 11 },
    "fitness"
  );
  assert.ok(prompt.includes("Nacho"));
  assert.ok(prompt.includes("UNC"));
  assert.ok(prompt.toLowerCase().includes("fitness"));
  assert.ok(prompt.includes("build.nvidia.com") || prompt.includes("NVIDIA"));
});
