import { analyzeDay, extractJsonObject, localNarrative } from "../shared/analyze.js";
import {
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_URL,
  normalizeMode,
  nvidiaSystemPrompt,
} from "../shared/fitness.js";

const DEFAULT_MODEL = process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;

function buildMessages(metrics, profile, analysis, mode = "general") {
  return [
    { role: "system", content: nvidiaSystemPrompt(profile, analysis, mode) },
    {
      role: "user",
      content: JSON.stringify(
        {
          persona: profile,
          fitbit: metrics,
          analisisLocal: {
            overall: analysis.overall,
            band: analysis.band,
            scores: analysis.scores,
            headline: analysis.headline,
            planBase: analysis.plan,
            watchouts: analysis.watchouts,
            hour: analysis.hour,
            mode: analysis.mode,
          },
        },
        null,
        2
      ),
    },
  ];
}

export async function coachWithNvidia({ metrics, profile, analysis, apiKey, model, mode }) {
  const key = apiKey || process.env.NVIDIA_API_KEY;
  if (!key) {
    return { ok: false, reason: "missing_key" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: buildMessages(metrics, profile, analysis, mode),
        temperature: 0.55,
        top_p: 0.85,
        max_tokens: 900,
        stream: false,
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.message || body?.message || `HTTP ${response.status}`;
      return { ok: false, reason: "nvidia_error", message, status: response.status };
    }

    const text = body?.choices?.[0]?.message?.content || "";
    const parsed = extractJsonObject(text);
    if (!parsed?.headline) {
      return { ok: false, reason: "bad_json", raw: text.slice(0, 500) };
    }

    const plan = Array.isArray(parsed.bestDayPlan)
      ? parsed.bestDayPlan.slice(0, 5).map((step) => ({
          when: step.when || "hoy",
          action: step.action || "",
          why: step.why || "",
          kind: "nvidia",
        }))
      : analysis.plan;

    return {
      ok: true,
      model: body?.model || model || DEFAULT_MODEL,
      narrative: {
        headline: parsed.headline,
        dayStory: parsed.dayStory || analysis.summary,
        energyWindow: parsed.energyWindow || "",
        closing: parsed.closing || "",
        plan,
        watchouts: Array.isArray(parsed.watchouts) ? parsed.watchouts.slice(0, 4) : analysis.watchouts,
        mode: normalizeMode(mode),
      },
    };
  } catch (error) {
    const reason = error.name === "AbortError" ? "timeout" : "network";
    return { ok: false, reason, message: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function buildCoach({ metrics, profile, apiKey, model, mode }) {
  const resolved = normalizeMode(mode || profile?.mode);
  const analysis = analyzeDay(metrics, { ...profile, mode: resolved });
  const nvidia = await coachWithNvidia({
    metrics,
    profile: { ...profile, mode: resolved },
    analysis,
    apiKey,
    model,
    mode: resolved,
  });
  if (nvidia.ok) {
    return {
      analysis,
      narrative: nvidia.narrative,
      engine: "nvidia",
      model: nvidia.model,
      mode: resolved,
    };
  }
  return {
    analysis,
    narrative: localNarrative(analysis),
    engine: "local",
    fallbackReason: nvidia.reason,
    fallbackMessage: nvidia.message,
    mode: resolved,
  };
}
