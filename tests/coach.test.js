import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDay, localNarrative } from "../shared/analyze.js";
import { characterSummary } from "../shared/coach.js";
import { coachUserPayload, nvidiaSystemPrompt } from "../shared/fitness.js";
import { getCharacterPayload } from "../shared/character.js";
import { getPersonaPayload, toMetrics } from "../shared/sampleFitbit.js";

function storyFor(persona, mode, at, profile = {}) {
  const metrics = toMetrics(getPersonaPayload(persona));
  const analysis = analyzeDay(
    metrics,
    {
      timezone: "America/Argentina/Buenos_Aires",
      name: "Nacho",
      nickname: "Nacho",
      focus: "estudio UNC",
      mode,
      ...profile,
    },
    at
  );
  return { metrics, analysis, narrative: localNarrative(analysis, metrics, { profile: { name: "Nacho", nickname: "Nacho", mode } }) };
}

test("noticing cita números exactos del Charge 6 (post parcial)", () => {
  const at = new Date("2026-08-22T15:00:00-03:00");
  const { metrics, narrative } = storyFor("agotado", "general", at);
  assert.equal(metrics.sleepMinutes, 312);
  assert.equal(metrics.hrvRmssd, 21);
  assert.equal(metrics.steps, 2840);
  const blob = (narrative.noticing || []).map((n) => n.text).join(" ");
  assert.ok(blob.includes("5h 12m"), blob);
  assert.ok(/\b21\s*ms/.test(blob), blob);
  assert.ok(blob.includes("2.840") || blob.includes("2840"), blob);
  assert.ok((narrative.noticing || []).length >= 3);
  assert.ok(narrative.plan.every((step) => /\d/.test(step.why)), JSON.stringify(narrative.plan));
  assert.ok(narrative.dayStory.length > 280);
  assert.ok(narrative.tonight);
  assert.ok(narrative.tradeoff);
  assert.match(narrative.dayStory, /5h 12m/);
});

test("localNarrative why cita métrica y cambia con el modo", () => {
  const at = new Date("2026-08-22T11:00:00-03:00");
  const sleep = storyFor("mixto", "sleep", at).narrative;
  const fitness = storyFor("recargado", "fitness", at).narrative;
  const sleepBlob = sleep.noticing.map((n) => n.text).join(" ").toLowerCase();
  const fitBlob = fitness.noticing.map((n) => n.text).join(" ").toLowerCase();
  assert.ok(sleepBlob.includes("profundo") || sleepBlob.includes("rem") || sleepBlob.includes("etapas"), sleepBlob);
  assert.ok(fitBlob.includes("azm") || fitBlob.includes("cardio") || fitBlob.includes("peak"), fitBlob);
  assert.notEqual(sleepBlob, fitBlob);
  assert.ok(sleep.plan.some((s) => /\d/.test(s.why)));
  assert.ok(fitness.because.join(" ").toLowerCase().includes("azm") || fitness.because.join(" ").includes("HRV"));
});

test("nvidia prompt pide noticing y archivo de 4 semanas", () => {
  const prompt = nvidiaSystemPrompt(
    { name: "Cami", nickname: "Cami", org: "FCE-UNC", city: "Córdoba", barrio: "Nueva Córdoba", focus: "facu" },
    { hour: 11 },
    "sleep"
  );
  assert.ok(prompt.includes("Cami"));
  assert.ok(prompt.includes("noticing"));
  assert.ok(prompt.includes("archivo4semanasCami") || prompt.includes("4 semanas"));
  assert.ok(prompt.toLowerCase().includes("voseo") || prompt.includes("vos"));
  assert.ok(prompt.includes("fitbitField"));
  assert.ok(prompt.includes("dayStory"));
  assert.ok(prompt.toLowerCase().includes("sueño") || prompt.includes("SUEÑO"));
});

test("normalizeCoachNarrative no deja objetos en because/watchouts", async () => {
  const { normalizeCoachNarrative } = await import("../shared/fitness.js");
  const local = {
    headline: "local",
    noticing: [{ text: "HRV 21 ms", cite: "21 ms", fitbitField: "hrv" }],
    because: ["porque 21 ms"],
    dayStory: "historia",
    energyWindow: "tarde",
    plan: [{ when: "ahora", action: "agua", why: "700 ml" }],
    watchouts: ["ojo"],
    tonight: "23:15",
    tradeoff: "sueño",
    closing: "dale",
  };
  const out = normalizeCoachNarrative(
    {
      headline: "Nacho, suavidad",
      noticing: [{ text: "Tu HRV bajó a 21 ms", cite: "21 ms", fitbitField: "hrv" }],
      because: [{ text: "HRV 21 ms → nada de HIIT", cite: "21 ms", fitbitField: "hrv" }],
      watchouts: [{ text: "Café gigante con FC 76", cite: "76" }],
      dayStory: "Anoche 5h 12m.",
    },
    local,
    "nvidia"
  );
  assert.equal(typeof out.because[0], "string");
  assert.match(out.because[0], /21 ms/);
  assert.equal(typeof out.watchouts[0], "string");
  assert.match(out.watchouts[0], /76/);
});

test("coachUserPayload incluye historial de Cami y el diario de hoy", () => {
  const payload = getCharacterPayload("2026-08-11");
  const metrics = toMetrics(payload);
  metrics.log = payload.log;
  const analysis = analyzeDay(metrics, { name: "Cami", nickname: "Cami", mode: "focus" });
  const user = coachUserPayload({
    metrics,
    profile: { name: "Cami", nickname: "Cami", barrio: "Nueva Córdoba" },
    analysis,
    mode: "focus",
    character: characterSummary(),
  });
  assert.equal(user.fitbitHoy.sueno.minutos, 306);
  assert.ok(user.fitbitHoy.diario.toLowerCase().includes("mesa"));
  assert.ok(user.archivo4semanasCami.promedios4semanas.hrv > 0);
  assert.ok(user.archivo4semanasCami.ultimosDiarios.length === 7);
  assert.ok(user.archivo4semanasCami.semanaMesas.nights >= 4);
  assert.ok(user.quien.esCami);
  const packed = JSON.stringify(user);
  assert.ok(packed.includes("promedios4semanas"));
  assert.ok(packed.includes("ultimosDiarios"));
});

test("characterSummary expone peor noche, mesas y diarios", () => {
  const summary = characterSummary();
  assert.equal(summary.days, 28);
  assert.ok(summary.lastLogs.length === 7);
  assert.ok(summary.worstSleepNight.sleepMinutes < summary.avgSleepMinutes);
  assert.ok(summary.mesasWeek.nights >= 4);
  assert.ok(summary.gymStreak >= 1);
  assert.ok(typeof summary.vsLastWeek.steps === "number");
});

test("buildCoach siempre devuelve engine y narrative desde el servidor", async () => {
  const prev = process.env.NVIDIA_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  const { buildCoach } = await import("../server/nvidia.js");
  const metrics = toMetrics(getPersonaPayload("mixto"));
  const result = await buildCoach({
    metrics,
    profile: { name: "Nacho", nickname: "Nacho", timezone: "America/Argentina/Buenos_Aires" },
    mode: "general",
  });
  if (prev !== undefined) process.env.NVIDIA_API_KEY = prev;
  assert.ok(result.engine === "local" || result.engine === "nvidia", result.engine);
  assert.ok(result.narrative?.headline);
  assert.ok(Array.isArray(result.narrative?.plan));
  assert.ok(result.analysis?.overall != null);
});
