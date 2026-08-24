import { analyzeDay, extractJsonObject, localNarrative } from "../shared/analyze.js";
import { characterSummary } from "../shared/coach.js";
import {
  DEFAULT_NVIDIA_MODEL,
  NVIDIA_MAX_TOKENS,
  NVIDIA_TEMPERATURE,
  NVIDIA_URL,
  coachUserPayload,
  normalizeCoachNarrative,
  normalizeMode,
  nvidiaSystemPrompt,
} from "../shared/fitness.js";

const DEFAULT_MODEL = process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;
const FAST_MODEL = "meta/llama-3.1-8b-instruct";

function resolveHistory(metrics, history) {
  try {
    return { character: history || characterSummary() };
  } catch {
    return { character: history || null };
  }
}

function buildMessages(metrics, profile, analysis, mode = "general", character) {
  return [
    { role: "system", content: nvidiaSystemPrompt(profile, analysis, mode) },
    {
      role: "user",
      content: JSON.stringify(coachUserPayload({ metrics, profile, analysis, mode, character }), null, 2),
    },
  ];
}

async function callNvidia({ key, modelId, metrics, profile, analysis, mode, character, local, ms }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: buildMessages(metrics, profile, analysis, mode, character),
        temperature: NVIDIA_TEMPERATURE,
        top_p: 0.85,
        max_tokens: NVIDIA_MAX_TOKENS,
        stream: false,
        response_format: { type: "json_object" },
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
    const usable =
      parsed &&
      typeof parsed === "object" &&
      (parsed.headline || parsed.dayStory || parsed.noticing || parsed.plan);
    if (!usable) {
      return { ok: false, reason: "bad_json", raw: text.slice(0, 500) };
    }
    return {
      ok: true,
      model: body?.model || modelId,
      narrative: normalizeCoachNarrative(parsed, local, "nvidia"),
    };
  } catch (error) {
    const reason = error.name === "AbortError" ? "timeout" : "network";
    return { ok: false, reason, message: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function coachWithNvidia({ metrics, profile, analysis, apiKey, model, mode, character, local }) {
  const key = apiKey || process.env.NVIDIA_API_KEY;
  if (!key) {
    return { ok: false, reason: "missing_key" };
  }

  const chosen = model || DEFAULT_MODEL;
  const firstTimeout = /70b/i.test(chosen) ? 22000 : 32000;
  let result = await callNvidia({
    key,
    modelId: chosen,
    metrics,
    profile,
    analysis,
    mode,
    character,
    local,
    ms: firstTimeout,
  });

  if (!result.ok && chosen !== FAST_MODEL) {
    result = await callNvidia({
      key,
      modelId: FAST_MODEL,
      metrics,
      profile,
      analysis,
      mode,
      character,
      local,
      ms: 24000,
    });
  }
  return result;
}

export async function buildCoach({ metrics, profile, apiKey, model, mode, history, persona }) {
  const resolved = normalizeMode(mode || profile?.mode);
  const tagged = {
    ...metrics,
    persona: metrics?.persona || persona,
  };
  const { character } = resolveHistory(tagged, history);
  const analysis = analyzeDay(tagged, { ...profile, mode: resolved });
  const local = localNarrative(analysis, tagged, { profile: { ...profile, mode: resolved }, character });
  const nvidia = await coachWithNvidia({
    metrics: tagged,
    profile: { ...profile, mode: resolved },
    analysis,
    apiKey,
    model,
    mode: resolved,
    character,
    local,
  });
  if (nvidia.ok) {
    return {
      analysis,
      narrative: nvidia.narrative,
      engine: "nvidia",
      model: nvidia.model,
      mode: resolved,
      writtenFor: profile.nickname || profile.name,
    };
  }
  return {
    analysis,
    narrative: local,
    engine: "local",
    fallbackReason: nvidia.reason,
    fallbackMessage: nvidia.message,
    mode: resolved,
    writtenFor: profile.nickname || profile.name,
  };
}
