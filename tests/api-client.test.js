import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { afterEach } from "node:test";
import { fileURLToPath } from "node:url";
import {
  fetchCharacter,
  fetchCharacterDays,
  fetchCoach,
  fetchDay,
  fetchPersonas,
  fetchVoice,
  manualDayBody,
} from "../client/src/lib/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiSrc = fs.readFileSync(path.join(__dirname, "../client/src/lib/api.js"), "utf8");

const originalFetch = globalThis.fetch;

function jsonRes(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

function mockFetch(impl) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options: options || {} });
    return impl(url, options);
  };
  return calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("el cliente no reescribe coach ni habla con NVIDIA", () => {
  assert.equal(apiSrc.includes("nvidiaFromBrowser"), false);
  assert.equal(apiSrc.includes("integrate.api.nvidia.com"), false);
  assert.equal(apiSrc.includes("localNarrative"), false);
  assert.equal(apiSrc.includes("getCharacterPayload"), false);
  assert.equal(apiSrc.includes("getPersonaPayload"), false);
});

test("fetchDay GET /api/day y no inventa el payload", async () => {
  const calls = mockFetch(() => jsonRes({ metrics: { steps: 2840 }, personas: [{ id: "mixto" }] }));
  const data = await fetchDay("mixto", "demo");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^\/api\/day/);
  assert.match(calls[0].url, /persona=mixto/);
  assert.equal(calls[0].options.method || "GET", "GET");
  assert.equal(data.metrics.steps, 2840);
});

test("fetchDay de Cami manda date a /api/day", async () => {
  const calls = mockFetch(() => jsonRes({ metrics: {}, date: "2026-08-11" }));
  await fetchDay("cami", "demo", {}, { date: "2026-08-11" });
  assert.match(calls[0].url, /\/api\/day/);
  assert.match(calls[0].url, /date=2026-08-11/);
  assert.match(calls[0].url, /persona=cami/);
});

test("Mis números POST /api/day con settings", async () => {
  const calls = mockFetch(() => jsonRes({ persona: "mio", metrics: { steps: 1234 } }));
  const data = await fetchDay("mio", undefined, { mySteps: 1234, mySleepHours: 5, name: "Nacho" });
  assert.equal(calls[0].url, "/api/day");
  assert.equal(calls[0].options.method, "POST");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.persona, "mio");
  assert.equal(body.settings.steps, 1234);
  assert.equal(body.settings.sleepHours, 5);
  assert.equal(data.persona, "mio");
  assert.deepEqual(manualDayBody({ mySteps: 1 }).persona, "mio");
});

test("fetchCoach POST /api/coach y renderiza lo que vuelve", async () => {
  const calls = mockFetch(() =>
    jsonRes({ engine: "nvidia", narrative: { headline: "Hoy descansá" }, analysis: { overall: 42 } })
  );
  const res = await fetchCoach({ metrics: { steps: 10 }, persona: "examen", mode: "sleep" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/coach");
  assert.equal(calls[0].options.method, "POST");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.persona, "examen");
  assert.equal(body.mode, "sleep");
  assert.equal(res.engine, "nvidia");
  assert.equal(res.narrative.headline, "Hoy descansá");
});

test("si el API cae, fetchCoach no arma un relato local", async () => {
  mockFetch(async () => {
    throw new Error("network");
  });
  await assert.rejects(() => fetchCoach({ metrics: { steps: 1 } }), /no llegó el servidor/);
});

test("fetchCharacter, days, personas y voice pegan a /api", async () => {
  const calls = mockFetch((url) => jsonRes({ ok: true, url: String(url) }));
  await fetchCharacter();
  await fetchCharacterDays();
  await fetchPersonas();
  await fetchVoice({ transcript: "terminé el TP" });
  assert.deepEqual(
    calls.map((c) => c.url),
    ["/api/character", "/api/character/days", "/api/demo/personas", "/api/voice"]
  );
  assert.equal(calls[3].options.method, "POST");
});
