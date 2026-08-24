import assert from "node:assert/strict";
import test from "node:test";
import {
  CHARACTER,
  CHARACTER_FROM,
  CHARACTER_TO,
  allCharacterPayloads,
  getCharacterPayload,
  getCharacterSummary,
  hasCharacterDate,
  hourlyKindLengths,
  listCharacterDays,
  publicIdentity,
} from "../shared/character.js";
import { characterSummary } from "../shared/coach.js";
import { toMetrics } from "../shared/sampleFitbit.js";

test("personaje tiene identidad completa", () => {
  const id = publicIdentity();
  assert.equal(id.name, CHARACTER.name);
  assert.ok(CHARACTER.name);
  assert.ok(CHARACTER.nickname);
  assert.equal(CHARACTER.age, 22);
  assert.match(CHARACTER.faculty, /UNC|FCE|Económicas/);
  assert.match(CHARACTER.barrio, /Nueva Córdoba|Güemes|Centro/);
  assert.match(CHARACTER.device, /Charge 6/);
  assert.ok(CHARACTER.goal.steps >= 8000);
  assert.ok(CHARACTER.rhythm.length > 20);
  assert.equal(id.from, CHARACTER_FROM);
  assert.equal(id.to, CHARACTER_TO);
});

test("28 días únicos 2026-07-27 a 2026-08-23", () => {
  const days = listCharacterDays();
  assert.equal(days.length, 28);
  const dates = days.map((d) => d.date);
  assert.equal(new Set(dates).size, 28);
  assert.equal(dates[0], "2026-07-27");
  assert.equal(dates.at(-1), "2026-08-23");
  assert.ok(days.every((d) => d.log && d.log.length > 20));
  assert.ok(days.every((d) => d.metrics));
});

test("hourlySteps suma exactamente a steps", () => {
  for (const payload of allCharacterPayloads()) {
    const metrics = toMetrics(payload);
    assert.equal(metrics.hourlySteps.length, 24, payload.date);
    const sum = metrics.hourlySteps.reduce((a, b) => a + b.value, 0);
    assert.equal(sum, metrics.steps, payload.date);
    assert.equal(metrics.sleepMinutes, payload.sleep.summary.totalMinutesAsleep);
    assert.ok(metrics.heartZones.length >= 3, payload.date);
    assert.ok(metrics.spo2 > 90, payload.date);
    assert.ok(Array.isArray(metrics.sleepStages));
    assert.equal(metrics.source, "character");
  }
});

test("etapas de sueño suman los minutos dormidos", () => {
  for (const payload of allCharacterPayloads()) {
    const s = payload.sleep.summary.stages;
    assert.equal(s.deep + s.rem + s.light, payload.sleep.summary.totalMinutesAsleep, payload.date);
  }
});

test("API shape de /character y un día", () => {
  const summary = getCharacterSummary();
  const deep = characterSummary();
  assert.equal(summary.days, 28);
  assert.equal(summary.weeks.length, 4);
  assert.ok(summary.thisWeek.avgSteps > summary.lastWeek.avgSteps);
  assert.ok(summary.streak >= 1);
  assert.equal(summary.lastNight.date, CHARACTER_TO);
  assert.ok(deep.lastLogs.length === 7);
  assert.ok(deep.mesasWeek.nights >= 4);
  assert.ok(deep.worstSleepNight.date);
  const payload = getCharacterPayload("2026-08-11");
  assert.equal(payload.kind, "exam");
  assert.ok(payload.log.toLowerCase().includes("mesa"));
  assert.ok(hasCharacterDate("2026-08-23"));
  assert.equal(hasCharacterDate("2026-08-24"), false);
  const lengths = hourlyKindLengths();
  for (const n of Object.values(lengths)) assert.equal(n, 24);
});
