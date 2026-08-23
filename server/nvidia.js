import { analyzeDay, extractJsonObject, localNarrative } from "../shared/analyze.js";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

const FITNESS_MODES = {
  general: "Coach de un día mejor posible: sueño, movimiento, recupero y foco.",
  fitness: "Modo FITNESS: priorizá estímulo, volumen y progresión, sin machacar si el HRV o el sueño están bajos.",
  recovery: "Modo RECUPERO: el objetivo es bajar inflamación y sistema nervioso. Nada de HIIT.",
  sleep: "Modo SUEÑO: todo el plan empuja a una noche larga. Corte de cafeína, luz y hora de apagado.",
  focus: "Modo FOCO / ESTUDIO: bloques profundos para UNC, sin overtraining. Movimiento corto entre bloques.",
};

function modePrompt(mode) {
  return FITNESS_MODES[mode] || FITNESS_MODES.general;
}

function buildMessages(metrics, profile, analysis, mode = "general") {
  return [
    {
      role: "system",
      content: `Sos Lumen, coach de un día mejor posible. Hablás en español rioplatense (voseo).
No sos médico. No diagnostiques. No inventes métricas: usá solo las que te pasan.
Devolvé JSON estricto, sin markdown, con esta forma:
{
  "headline": "una frase potente, humana, máx 140 chars",
  "dayStory": "2-3 oraciones: cómo está siendo el día, con los números reales",
  "energyWindow": "en qué rato del día restante conviene el esfuerzo vs la calma",
  "bestDayPlan": [
    {"when": "ahora|horario","action":"qué hacer","why":"por qué, atado a un dato"}
  ],
  "watchouts": ["aviso corto"],
  "closing": "cierre de una línea"
}
El plan tiene 3 a 5 pasos, accionables HOY, respetando la hora actual (${analysis.hour} h en su zona).
Si el sueño fue corto, no pidas un PR en el gym. Si está recargado, no lo trates como paciente.
Modo activo: ${modePrompt(mode)}
La persona quiere una IA personalizada de health/wellness vía NVIDIA NIM (build.nvidia.com).`,
    },
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
  const analysis = analyzeDay(metrics, profile);
  const nvidia = await coachWithNvidia({ metrics, profile, analysis, apiKey, model, mode });
  if (nvidia.ok) {
    return {
      analysis,
      narrative: nvidia.narrative,
      engine: "nvidia",
      model: nvidia.model,
    };
  }
  return {
    analysis,
    narrative: localNarrative(analysis),
    engine: "local",
    fallbackReason: nvidia.reason,
    fallbackMessage: nvidia.message,
  };
}
