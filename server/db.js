import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS, getPersonaPayload, toMetrics } from "../shared/sampleFitbit.js";
import { analyzeDay, localNarrative } from "../shared/analyze.js";
import { NACHO } from "../shared/profile.js";

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

function seededDay({ persona, date, at }) {
  const payload = getPersonaPayload(persona);
  payload.date = date;
  const metrics = toMetrics(payload);
  metrics.date = date;
  const analysis = analyzeDay(metrics, coachProfile(), new Date(at));
  return {
    id: `seed-${persona}`,
    kind: "fitbit-day",
    persona,
    date,
    label: PERSONAS[persona]?.label || persona,
    metrics,
    analysis: {
      overall: analysis.overall,
      band: analysis.band,
      scores: analysis.scores,
    },
    narrative: localNarrative(analysis),
    engine: "local",
    createdAt: new Date(at).toISOString(),
  };
}

export function seedDatabase() {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    profile: { ...NACHO },
    studio: {
      title: "Pagweb",
      owner: NACHO.fullName,
      theme: "caliza",
      font: "editorial",
    },
    entries: [
      seededDay({ persona: "mixto", date: "2026-08-20", at: "2026-08-20T14:30:00-03:00" }),
      seededDay({ persona: "recargado", date: "2026-08-21", at: "2026-08-21T09:15:00-03:00" }),
      seededDay({ persona: "agotado", date: "2026-08-22", at: "2026-08-22T18:40:00-03:00" }),
      {
        id: "seed-unc-note",
        kind: "note",
        date: "2026-08-23",
        title: "Nota UNC",
        text: `${NACHO.fullName}, ${NACHO.role} en la ${NACHO.org} (${NACHO.city}). Archivo de prueba de Pagweb: tres días Fitbit (mixto, recargado, agotado) y esta nota. Zona ${NACHO.timezone}. Mail: ${NACHO.email}.`,
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
  if (existing?.entries?.length) return existing;
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
  db.entries = [next, ...(db.entries || []).filter((item) => item.id !== next.id)].slice(0, 80);
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
