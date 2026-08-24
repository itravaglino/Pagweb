import assert from "node:assert/strict";
import test from "node:test";
import { CHARACTER, getCharacterPayload, getCharacterSummary } from "../shared/character.js";
import { toMetrics } from "../shared/sampleFitbit.js";
import {
  completeByPhrase,
  defaultGoals,
  loadStoredTasks,
  localVoiceReply,
  makeTask,
  mergeTasks,
  parseCompletePhrases,
  parseNewTodos,
  progressVsGoals,
  similar,
} from "../shared/tasks.js";

test("mergeTasks agrega to-dos nuevos y no borra lo tachado", () => {
  const existing = [
    makeTask("mandar el TP de macro", { done: true, id: "t-tp" }),
    makeTask("pasar por Smart Fit", { id: "t-gym" }),
  ];
  const merged = mergeTasks(existing, ["llamar a mamá", "TP de macro", { title: "Smart Fit", done: true }]);
  assert.equal(merged.length, 3, "suma llamar a mamá, no pisa el historial");
  const tp = merged.find((t) => similar(t.title, "mandar el TP de macro"));
  assert.equal(tp.done, true, "lo tachado sigue tachado");
  const gym = merged.find((t) => similar(t.title, "Smart Fit"));
  assert.equal(gym.done, true, "incoming done completa la existente");
  assert.ok(merged.some((t) => similar(t.title, "llamar a mamá")));
});

test("completeByPhrase entiende terminé / ya hice / tacho", () => {
  const tasks = [
    makeTask("mandar el TP de macro"),
    makeTask("pasar por Smart Fit"),
    makeTask("llamar a mamá"),
  ];
  const a = completeByPhrase(tasks, "terminé el TP de macro");
  assert.deepEqual(a.completed, ["mandar el TP de macro"]);
  assert.equal(a.tasks[0].done, true);

  const b = completeByPhrase(a.tasks, "ya hice smart fit");
  assert.equal(b.tasks[1].done, true);

  const c = completeByPhrase(b.tasks, "tacho llamar a mamá");
  assert.equal(c.tasks[2].done, true);
  assert.ok(c.tasks.every((t) => t.done));
});

test("parseNewTodos arma lista desde un relato rioplatense", () => {
  const text =
    "Hoy me fue bien, dormí decente. Tengo que mandar el TP de macro, pasar por Smart Fit y llamar a mamá.";
  const todos = parseNewTodos(text);
  assert.ok(todos.some((t) => /macro/i.test(t)));
  assert.ok(todos.some((t) => /smart fit/i.test(t)));
  assert.ok(todos.some((t) => /mama|mamá/i.test(t)));
  assert.ok(parseCompletePhrases("ya hice el TP").length >= 1);
});

test("progressVsGoals cita meta de Cami y promedio de 4 semanas", () => {
  const summary = getCharacterSummary();
  const metrics = toMetrics(getCharacterPayload());
  const goals = defaultGoals();
  const progress = progressVsGoals(metrics, goals, summary);
  assert.equal(goals.sleepHours, 7.5);
  assert.equal(goals.steps, 8000);
  assert.equal(goals.gymPerWeek, 3);
  assert.equal(summary.days, 28);
  assert.equal(progress.rows.length, 3);
  const sleep = progress.rows.find((r) => r.id === "sleep");
  const steps = progress.rows.find((r) => r.id === "steps");
  const gym = progress.rows.find((r) => r.id === "gym");
  assert.match(sleep.cite, /meta/);
  assert.match(sleep.cite, /promedio|4 semanas/i);
  assert.match(String(steps.goal), /8/);
  assert.match(gym.cite, /3/);
  assert.ok(progress.avgSteps > 0);
  assert.ok(progress.avgSleepMinutes > 0);
  assert.equal(CHARACTER.goal.sleepHours, 7.5);
});

test("localVoiceReply no pisa historial al agregar y tachar", () => {
  const summary = getCharacterSummary();
  const metrics = toMetrics(getCharacterPayload());
  const first = localVoiceReply({
    transcript: "Tengo que mandar el TP de macro, pasar por Smart Fit y llamar a mamá.",
    metrics,
    openTasks: [],
    summary,
  });
  assert.ok(first.tasks.length >= 3);
  assert.ok(first.spoken.includes("7h") || first.spoken.includes("meta"));
  const second = localVoiceReply({
    transcript: "terminé el TP de macro",
    metrics,
    openTasks: first.tasks,
    summary,
  });
  const tp = second.tasks.find((t) => similar(t.title, "TP de macro"));
  assert.equal(tp.done, true);
  assert.equal(second.tasks.length, first.tasks.length);
  assert.ok(second.completed.length >= 1);
});

test("loadStoredTasks tolera JSON roto", () => {
  assert.deepEqual(loadStoredTasks({ getItem: () => "{nope" }), []);
});
