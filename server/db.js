import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS, listDemoWeek, toMetrics } from "../shared/sampleFitbit.js";
import { analyzeDay, localNarrative } from "../shared/analyze.js";
import { NACHO } from "../shared/profile.js";
import { CHARACTER, allCharacterPayloads } from "../shared/character.js";
import { characterSummary } from "../shared/coach.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export const LOCAL_DB_PATH = path.join(ROOT, "data", "pagweb.json");
export const CURSOR_DB_PATH = "/cursor/stores/self/pagweb/db.json";

export function dbPaths() {
  if (process.env.PAGWEB_DB_PATH) {
    return [path.resolve(process.env.PAGWEB_DB_PATH)];
  }
  const paths = [];
  try {
    if (fs.existsSync("/cursor/stores/self")) paths.push(CURSOR_DB_PATH);
  } catch {
    /* store ausente fuera de Cursor */
  }
  paths.push(LOCAL_DB_PATH);
  return [...new Set(paths)];
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function coachProfile() {
  return {
    name: NACHO.shortName,
    focus: NACHO.focus,
    timezone: NACHO.timezone,
    stepsGoal: 10000,
    sleepGoal: 7.5,
    activeGoal: 30,
    bedtime: "23:15",
  };
}

function hasRichWeek(db) {
  const week = (db?.entries || []).filter(
    (e) => String(e.id).startsWith("seed-semana-") && (e.metrics?.hourlySteps?.length || 0) === 24
  );
  const character = (db?.entries || []).filter(
    (e) => String(e.id).startsWith("seed-personaje-") && (e.metrics?.hourlySteps?.length || 0) === 24
  );
  return (db?.version || 0) >= 5 && week.length >= 7 && character.length >= 28;
}

function entryFromPayload(payload, { id, label, at, extra = {} }) {
  const metrics = { ...toMetrics(payload), log: payload.log || payload.story || "" };
  const isCami = Boolean(extra.character || payload.source === "character" || payload.persona === CHARACTER.id);
  const profile = isCami
    ? {
        name: CHARACTER.nickname,
        nickname: CHARACTER.nickname,
        barrio: CHARACTER.barrio,
        timezone: CHARACTER.timezone,
        stepsGoal: CHARACTER.goal.steps,
        sleepGoal: CHARACTER.goal.sleepHours,
      }
    : coachProfile();
  const analysis = analyzeDay(metrics, profile, new Date(at));
  return {
    id,
    kind: "fitbit-day",
    persona: payload.persona,
    date: payload.date,
    label,
    metrics,
    log: payload.log || payload.story || "",
    analysis: {
      overall: analysis.overall,
      band: analysis.band,
      scores: analysis.scores,
    },
    narrative: localNarrative(analysis, metrics, {
      profile,
      character: isCami ? characterSummary() : null,
    }),
    engine: "local",
    createdAt: new Date(at).toISOString(),
    ...extra,
  };
}

export function seedDatabase() {
  const week = listDemoWeek("2026-08-23").map((payload, i) => {
    const at = `${payload.date}T${["18:40", "16:10", "14:30", "11:05", "19:20", "09:15", "13:00"][i]}:00-03:00`;
    return entryFromPayload(payload, {
      id: `seed-semana-${payload.persona}-${payload.date}`,
      label: PERSONAS[payload.persona]?.label || payload.persona,
      at,
    });
  });
  const characterDays = allCharacterPayloads().map((payload, i) => {
    const hour = String(10 + (i % 8)).padStart(2, "0");
    const at = `${payload.date}T${hour}:20:00-03:00`;
    return entryFromPayload(payload, {
      id: `seed-personaje-${payload.date}`,
      label: `${payload.weekday} · ${CHARACTER.nickname}`,
      at,
      extra: { character: true, kindDay: payload.kind },
    });
  });
  return {
    version: 5,
    updatedAt: new Date().toISOString(),
    profile: { ...NACHO },
    studio: {
      title: "Pagweb",
      owner: NACHO.fullName,
      theme: "caliza",
      font: "editorial",
    },
    entries: [
      ...characterDays,
      ...week,
      {
        id: "seed-unc-note",
        kind: "note",
        date: "2026-08-23",
        title: "Diario de Cami (28 días)",
        text: `${CHARACTER.name} (${CHARACTER.nickname}), ${CHARACTER.age}, ${CHARACTER.faculty}, ${CHARACTER.barrio}. Charge 6 del ${CHARACTER.goal.label}. Archivo 2026-07-27 → 2026-08-23: campus, gym, Güemes, mesas y un día enferma. Demo para ${NACHO.shortName} (${NACHO.org} · ${NACHO.city}).`,
        createdAt: "2026-08-23T14:00:00.000Z",
      },
    ],
  };
}

function normalize(raw) {
  return {
    version: raw?.version || 2,
    updatedAt: raw?.updatedAt || new Date().toISOString(),
    profile: { ...NACHO, ...(raw?.profile || {}) },
    studio: raw?.studio || {},
    entries: Array.isArray(raw?.entries) ? raw.entries : [],
  };
}

export function readDb() {
  for (const filePath of dbPaths()) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (raw && typeof raw === "object") return normalize(raw);
    } catch {
      /* archivo ilegible: probar el siguiente */
    }
  }
  return null;
}

export function writeDb(db) {
  const payload = normalize({ ...db, updatedAt: new Date().toISOString() });
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const written = [];
  const errors = [];
  for (const filePath of dbPaths()) {
    try {
      ensureDir(filePath);
      fs.writeFileSync(filePath, json);
      written.push(filePath);
    } catch (error) {
      errors.push({ path: filePath, error: error.message });
    }
  }
  if (!written.length) {
    const err = new Error("No se pudo escribir la base de Pagweb");
    err.details = errors;
    throw err;
  }
  return { db: payload, written };
}

export function loadOrSeed() {
  const existing = readDb();
  if (hasRichWeek(existing)) return existing;
  return writeDb(seedDatabase()).db;
}

export function seedIfEmpty() {
  return loadOrSeed();
}

export function addEntry(entry = {}) {
  const db = loadOrSeed();
  const next = {
    id: entry.id || crypto.randomUUID(),
    createdAt: entry.createdAt || new Date().toISOString(),
    kind: entry.kind || "fitbit-day",
    ...entry,
  };
  db.entries = [next, ...(db.entries || []).filter((item) => item.id !== next.id)].slice(0, 120);
  writeDb(db);
  return next;
}

export function listEntries() {
  return loadOrSeed().entries || [];
}

export function mountDbRoutes(app) {
  app.get("/api/db", (_req, res) => {
    const db = loadOrSeed();
    res.json({ ...db, source: "api" });
  });

  app.post("/api/db", (req, res) => {
    const current = loadOrSeed();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const merged = {
      ...current,
      ...body,
      profile: { ...current.profile, ...(body.profile || {}) },
      studio: { ...current.studio, ...(body.studio || {}) },
      entries: Array.isArray(body.entries) ? body.entries : current.entries,
    };
    res.json(writeDb(merged).db);
  });

  const sendEntries = (_req, res) => res.json({ entries: listEntries() });
  const createEntry = (req, res) => {
    const saved = addEntry(req.body && typeof req.body === "object" ? req.body : {});
    res.status(201).json(saved);
  };

  app.get("/api/db/entries", sendEntries);
  app.post("/api/db/entries", createEntry);
}
