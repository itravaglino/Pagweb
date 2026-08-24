import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = path.join(os.tmpdir(), `pagweb-db-${Date.now()}.json`);
process.env.PAGWEB_DB_PATH = tmp;

const { addEntry, loadOrSeed, listEntries, seedDatabase } = await import("../server/db.js");

test("siembra días de prueba de Nacho", () => {
  const db = loadOrSeed();
  assert.ok(db.entries.length >= 7);
  assert.ok(db.entries.some((e) => String(e.id).startsWith("seed-semana-")));
  assert.equal(db.profile.shortName, "Nacho");
  assert.ok(db.entries.some((e) => e.persona === "mixto" || e.label));
  assert.ok(fs.existsSync(tmp));
});

test("addEntry prepends and caps", () => {
  const before = listEntries().length;
  const saved = addEntry({ kind: "note", title: "test", text: "hola UNC" });
  assert.ok(saved.id);
  assert.equal(listEntries()[0].id, saved.id);
  assert.equal(listEntries().length, before + 1);
});

test("seedDatabase is deterministic enough", () => {
  const seed = seedDatabase();
  assert.equal(seed.profile.org, "UNC");
  assert.equal(seed.version, 3);
  const week = seed.entries.filter((e) => String(e.id).startsWith("seed-semana-"));
  assert.equal(week.length, 7);
  assert.equal(week[0].metrics.hourlySteps.length, 24);
  assert.ok(seed.entries.length >= 3);
});
