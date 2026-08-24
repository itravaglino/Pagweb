import { analyzeDay, extractJsonObject, localNarrative } from "@shared/analyze.js";
import { PERSONAS, getPersonaPayload, payloadFromManual, toMetrics } from "@shared/sampleFitbit.js";
import {
  CHARACTER,
  CHARACTER_TO,
  getCharacterPayload,
  getCharacterSummary,
  listCharacterDays,
  publicIdentity,
} from "@shared/character.js";
import {
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_URL,
  nvidiaSystemPrompt,
} from "@shared/fitness.js";

async function tryJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function dayFromManual(settings = {}) {
  const payload = payloadFromManual({
    sleepHours: settings.mySleepHours,
    steps: settings.mySteps,
    restingHeartRate: settings.myRhr,
    hrv: settings.myHrv,
    activeMinutes: settings.myActiveMinutes,
    waterMl: settings.myWaterMl,
    displayName: settings.name || "vos",
  });
  return {
    payload,
    metrics: toMetrics(payload),
    connected: false,
    demo: true,
    persona: "mio",
    personas: Object.values(PERSONAS),
    fitbitReady: false,
  };
}

export async function fetchDay(persona = "mixto", source, settings, { date } = {}) {
  if (persona === "mio") return dayFromManual(settings);
  const wantCharacter = persona === CHARACTER.id || Boolean(date);
  try {
    const qs = new URLSearchParams();
    if (wantCharacter) qs.set("date", date || CHARACTER_TO);
    else qs.set("persona", persona);
    if (source) qs.set("source", source);
    return await tryJson(`/api/day?${qs}`);
  } catch {
    if (wantCharacter) {
      const payload = getCharacterPayload(date || CHARACTER_TO);
      return {
        payload,
        metrics: toMetrics(payload),
        connected: false,
        demo: true,
        character: true,
        offline: true,
        persona: CHARACTER.id,
        identity: publicIdentity(),
        personas: Object.values(PERSONAS),
        fitbitReady: false,
      };
    }
    const payload = getPersonaPayload(persona);
    return {
      payload,
      metrics: toMetrics(payload),
      connected: false,
      demo: true,
      offline: true,
      persona,
      personas: Object.values(PERSONAS),
      fitbitReady: false,
    };
  }
}

export async function fetchCharacter() {
  try {
    return await tryJson("/api/character");
  } catch {
    return { identity: publicIdentity(), summary: getCharacterSummary(), offline: true };
  }
}

export async function fetchCharacterDays() {
  try {
    return await tryJson("/api/character/days");
  } catch {
    return { identity: publicIdentity(), days: listCharacterDays(), offline: true };
  }
}

export async function fetchFitbitStatus() {
  try {
    return await tryJson("/api/fitbit/status");
  } catch {
    return { configured: false, connected: false, offline: true };
  }
}

export async function fetchHost() {
  try {
    return await tryJson("/api/host");
  } catch {
    return null;
  }
}

export async function fetchNvidiaStatus() {
  try {
    return await tryJson("/api/nvidia");
  } catch {
    return {
      ok: false,
      connected: false,
      source: "none",
      model: DEFAULT_NVIDIA_MODEL,
      docs: "https://build.nvidia.com",
    };
  }
}

async function nvidiaFromBrowser({ metrics, profile, analysis, apiKey, model, mode }) {
  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: model || DEFAULT_NVIDIA_MODEL,
      messages: [
        {
          role: "system",
          content: nvidiaSystemPrompt(profile, analysis, mode),
        },
        {
          role: "user",
          content: JSON.stringify({ fitbit: metrics, persona: profile, analisisLocal: analysis }),
        },
      ],
      temperature: 0.55,
      max_tokens: 900,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, reason: "nvidia_error", message: body?.error?.message || `HTTP ${res.status}` };
  const parsed = extractJsonObject(body?.choices?.[0]?.message?.content || "");
  if (!parsed?.headline) return { ok: false, reason: "bad_json" };
  return {
    ok: true,
    model: body.model || model,
    narrative: {
      headline: parsed.headline,
      dayStory: parsed.dayStory || analysis.summary,
      energyWindow: parsed.energyWindow || "",
      closing: parsed.closing || "",
      plan: Array.isArray(parsed.bestDayPlan)
        ? parsed.bestDayPlan.slice(0, 5).map((step) => ({
            when: step.when || "hoy",
            action: step.action || "",
            why: step.why || "",
            kind: "nvidia",
          }))
        : analysis.plan,
      watchouts: Array.isArray(parsed.watchouts) ? parsed.watchouts : analysis.watchouts,
      mode,
    },
  };
}

export async function fetchCoach({ metrics, persona, nvidiaKey, model, profile, mode }) {
  try {
    return await tryJson("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics, persona, nvidiaKey, model, profile, mode }),
    });
  } catch {
    const analysis = analyzeDay(metrics, { ...profile, mode });
    if (nvidiaKey) {
      try {
        const nvidia = await nvidiaFromBrowser({
          metrics,
          profile,
          analysis,
          apiKey: nvidiaKey,
          model,
          mode,
        });
        if (nvidia.ok) {
          return { analysis, narrative: nvidia.narrative, engine: "nvidia", model: nvidia.model, mode };
        }
      } catch {
        /* CORS u otro recorte: motor local */
      }
    }
    return {
      analysis,
      narrative: localNarrative(analysis),
      engine: "local",
      fallbackReason: "offline",
      mode,
    };
  }
}
