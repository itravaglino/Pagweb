import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { getPersonaPayload, PERSONAS, toMetrics } from "../shared/sampleFitbit.js";
import { buildCoach } from "./nvidia.js";
import { NACHO } from "../shared/profile.js";
import {
  DEFAULT_NVIDIA_MODEL,
  FITNESS_MODE_ORDER,
  FITNESS_MODES,
  NVIDIA_DOCS,
  NVIDIA_MODELS,
  NVIDIA_URL,
} from "../shared/fitness.js";
import {
  authorizeUrl,
  configured as fitbitConfigured,
  exchangeCode,
  fetchToday,
  makePkce,
} from "./fitbit.js";
import { addEntry, mountDbRoutes, seedIfEmpty } from "./db.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);
const sessions = new Map();

function publicUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}`;
}

function redirectUri(req) {
  return process.env.FITBIT_REDIRECT_URI || `${publicUrl(req)}/api/fitbit/callback`;
}

function getSession(req, res) {
  let sid = req.cookies.pagweb_sid;
  if (!sid || !sessions.has(sid)) {
    sid = crypto.randomUUID();
    sessions.set(sid, { createdAt: Date.now() });
    const secure = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https";
    res.cookie("pagweb_sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  return sessions.get(sid);
}

function profileFrom(body = {}, payload = {}) {
  return {
    name: body.profile?.name || payload.profile?.displayName || NACHO.shortName,
    focus: body.profile?.focus || NACHO.focus,
    timezone: body.profile?.timezone || payload.profile?.timezone || NACHO.timezone,
    stepsGoal: Number(body.profile?.stepsGoal) || 10000,
    sleepGoal: Number(body.profile?.sleepGoal) || 7.5,
    activeGoal: Number(body.profile?.activeGoal) || 30,
    bedtime: body.profile?.bedtime || "23:15",
    mode: body.profile?.mode || body.mode || "general",
    org: body.profile?.org || NACHO.org,
    city: body.profile?.city || NACHO.city,
    role: body.profile?.role || NACHO.role,
  };
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/data", express.static(path.join(ROOT, "data")));

seedIfEmpty();
mountDbRoutes(app);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "pagweb",
    public: true,
    nvidia: Boolean(process.env.NVIDIA_API_KEY),
    nvidiaModel: process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL,
    fitbit: fitbitConfigured(),
  });
});

app.get("/api/nvidia", (_req, res) => {
  const connected = Boolean(process.env.NVIDIA_API_KEY);
  res.json({
    ok: true,
    connected,
    source: connected ? "env" : "none",
    model: process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL,
    models: NVIDIA_MODELS,
    modes: FITNESS_MODE_ORDER.map((id) => ({
      id,
      label: FITNESS_MODES[id].label,
      blurb: FITNESS_MODES[id].blurb,
    })),
    docs: NVIDIA_DOCS,
    endpoint: NVIDIA_URL,
    hint: connected
      ? "El servidor ya tiene NVIDIA_API_KEY. También podés pegar otra clave nvapi- en el navegador."
      : "Pedí una API key gratis en build.nvidia.com (Get API Key). Empieza con nvapi-.",
  });
});

app.get("/api/host", (req, res) => {
  res.json({
    origin: publicUrl(req),
    forwardedHost: req.get("host"),
    note: "Cursor Cloud abre el puerto 3000. Esta URL pública es el túnel HTTPS mientras el agente corre.",
  });
});

app.get("/api/demo/personas", (_req, res) => {
  res.json({ personas: Object.values(PERSONAS) });
});

app.get("/api/day", async (req, res) => {
  const session = getSession(req, res);
  const persona = String(req.query.persona || "mixto");
  try {
    if (session.fitbit?.access_token && req.query.source !== "demo") {
      const payload = await fetchToday(session.fitbit.access_token);
      return res.json({
        payload,
        metrics: toMetrics(payload),
        connected: true,
        personas: Object.values(PERSONAS),
      });
    }
    const payload = getPersonaPayload(persona);
    res.json({
      payload,
      metrics: toMetrics(payload),
      connected: false,
      demo: true,
      persona,
      personas: Object.values(PERSONAS),
      fitbitReady: fitbitConfigured(),
    });
  } catch (error) {
    if (error.status === 401) {
      session.fitbit = null;
    }
    const payload = getPersonaPayload(persona);
    res.status(200).json({
      payload,
      metrics: toMetrics(payload),
      connected: false,
      demo: true,
      persona,
      personas: Object.values(PERSONAS),
      warning: error.message,
    });
  }
});

app.post("/api/coach", async (req, res) => {
  try {
    const session = getSession(req, res);
    let metrics = req.body?.metrics;
    if (!metrics) {
      if (session.fitbit?.access_token) {
        const payload = await fetchToday(session.fitbit.access_token);
        metrics = toMetrics(payload);
      } else {
        metrics = toMetrics(getPersonaPayload(req.body?.persona || "mixto"));
      }
    }
    const profile = profileFrom(req.body);
    const result = await buildCoach({
      metrics,
      profile,
      apiKey: req.body?.nvidiaKey,
      model: req.body?.model,
      mode: req.body?.mode || profile.mode,
    });
    try {
      addEntry({
        kind: "fitbit-day",
        persona: req.body?.persona || metrics?.persona || "mixto",
        label: profile.name,
        metrics,
        analysis: {
          overall: result.analysis?.overall,
          band: result.analysis?.band,
          scores: result.analysis?.scores,
        },
        narrative: result.narrative,
        engine: result.engine,
        mode: req.body?.mode || profile.mode,
      });
    } catch (persistError) {
      result.persistWarning = persistError.message;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "coach_failed" });
  }
});

app.get("/api/fitbit/status", (req, res) => {
  const session = getSession(req, res);
  res.json({
    configured: fitbitConfigured(),
    connected: Boolean(session.fitbit?.access_token),
    displayName: session.fitbit?.displayName || null,
  });
});

app.get("/api/fitbit/login", (req, res) => {
  if (!fitbitConfigured()) {
    return res.status(400).json({
      error: "missing_fitbit_client",
      hint: "Cargá FITBIT_CLIENT_ID en .env (app Client en dev.fitbit.com).",
    });
  }
  const session = getSession(req, res);
  const pkce = makePkce();
  const state = crypto.randomBytes(8).toString("hex");
  session.pkce = { ...pkce, state };
  const url = authorizeUrl({
    redirectUri: redirectUri(req),
    challenge: pkce.challenge,
    state,
  });
  res.redirect(url);
});

app.get("/api/fitbit/callback", async (req, res) => {
  const session = getSession(req, res);
  const { code, state, error } = req.query;
  if (error) {
    return res.redirect(`/#/dia?fitbit=error&reason=${encodeURIComponent(String(error))}`);
  }
  if (!code || !session.pkce || session.pkce.state !== state) {
    return res.redirect("/#/dia?fitbit=error&reason=state");
  }
  try {
    const tokens = await exchangeCode({
      code: String(code),
      redirectUri: redirectUri(req),
      verifier: session.pkce.verifier,
    });
    session.fitbit = tokens;
    session.pkce = null;
    res.redirect("/#/dia?fitbit=ok");
  } catch (err) {
    res.redirect(`/#/dia?fitbit=error&reason=${encodeURIComponent(err.message)}`);
  }
});

app.post("/api/fitbit/logout", (req, res) => {
  const session = getSession(req, res);
  session.fitbit = null;
  res.json({ ok: true });
});

async function main() {
  if (process.env.NODE_ENV === "production") {
    const dist = path.join(ROOT, "dist");
    if (!fs.existsSync(path.join(dist, "index.html"))) {
      console.error("Falta dist/. Corré `npm run build` antes de `npm start`.");
      process.exit(1);
    }
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Pagweb listo en http://localhost:${PORT}`);
    });
    return;
  }

  const { createServer: createViteServer } = await import("vite");
  const httpServer = http.createServer(app);
  const vite = await createViteServer({
    configFile: path.join(ROOT, "client/vite.config.js"),
    server: {
      middlewareMode: true,
      allowedHosts: true,
      hmr: { server: httpServer },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
  httpServer.listen(PORT, "0.0.0.0", () => {
    const envHint = fs.existsSync(path.join(ROOT, ".env")) ? "con .env" : "sin .env (modo demo)";
    console.log(`Pagweb listo en http://localhost:${PORT} (${envHint})`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
