import { analyzeDay, extractJsonObject, localNarrative } from "@shared/analyze.js";
import { PERSONAS, getPersonaPayload, payloadFromManual, toMetrics } from "@shared/sampleFitbit.js";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

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

export async function fetchDay(persona = "mixto", source, settings) {
  if (persona === "mio") return dayFromManual(settings);
  try {
    const qs = new URLSearchParams({ persona });
    if (source) qs.set("source", source);
    return await tryJson(`/api/day?${qs}`);
  } catch {
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

export async function fetchFitbitStatus() {
  try {
    return await tryJson("/api/fitbit/status");
  } catch {
    return { configured: false, connected: false, offline: true };
  }
}

async function nvidiaFromBrowser({ metrics, profile, analysis, apiKey, model }) {
  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: model || "meta/llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content:
            "Sos Lumen, coach en español rioplatense. Devolvé JSON {headline, dayStory, energyWindow, bestDayPlan:[{when,action,why}], watchouts, closing}. No inventes métricas.",
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
    const analysis = analyzeDay(metrics, profile);
    if (nvidiaKey) {
      try {
        const nvidia = await nvidiaFromBrowser({ metrics, profile, analysis, apiKey: nvidiaKey, model });
        if (nvidia.ok) {
          return { analysis, narrative: nvidia.narrative, engine: "nvidia", model: nvidia.model };
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
    };
  }
}
