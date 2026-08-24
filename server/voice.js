import { CHARACTER, getCharacterSummary } from "../shared/character.js";
import { DEFAULT_NVIDIA_MODEL, NVIDIA_URL } from "../shared/fitness.js";
import { defaultGoals, localVoiceReply, mergeTasks, normalizeVoicePayload } from "../shared/tasks.js";
import { addEntry } from "./db.js";

const FAST_MODEL = "meta/llama-3.1-8b-instruct";

function extractJsonObject(text) {
  if (!text) return null;
  const fenced = String(text).match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function voiceSystemPrompt({ goals, summary }) {
  const avgSleep = summary?.avgSleepMinutes
    ? `${Math.floor(summary.avgSleepMinutes / 60)}h ${String(summary.avgSleepMinutes % 60).padStart(2, "0")}m`
    : "—";
  return `Sos el loop de voz de Nacho en Pagweb. Hablás español rioplatense con voseo (vos tenés, hacé, anotá). Córdoba / UNC. No eres consejo médico.

Respondé SOLO un JSON:
{
  "spoken": "texto para TTS, 4-8 oraciones. Cómo viene el día, qué hacer, vs objetivos y vs promedios de 4 semanas. Cifras concretas.",
  "tasks": [{ "title": "...", "done": false }],
  "progressVsGoals": [{ "id": "sleep"|"steps"|"gym", "label": "...", "today": "...", "goal": "...", "average": "...", "cite": "..." }],
  "noticing": "una observación corta"
}

Reglas:
- tasks: to-dos nuevos o confirmaciones. NO borres tareas ya hechas del historial.
- Si dice "terminé X" / "ya hice X" / "tacho X", marcá esa tarea done:true.
- Citá números de Fitbit de hoy y del resumen de Cami (28 días, meta ${goals.sleepHours}h sueño, ${goals.steps} pasos, gym ${goals.gymPerWeek}×; promedio sueño ${avgSleep}, pasos ${summary?.avgSteps ?? "—"}, gym ${summary?.gymDays ?? "—"} / ${summary?.days ?? 28} días).
- spoken en voseo, cálido, directo, sin emojis.`;
}

async function callNvidiaVoice({ key, modelId, payload, ms }) {
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
        messages: [
          { role: "system", content: voiceSystemPrompt(payload) },
          {
            role: "user",
            content: JSON.stringify(
              {
                transcript: payload.transcript,
                fitbitHoy: payload.metrics,
                tareasAbiertas: payload.openTasks,
                metas: payload.goals,
                cami4semanas: {
                  nickname: payload.summary?.nickname || CHARACTER.nickname,
                  days: payload.summary?.days,
                  avgSteps: payload.summary?.avgSteps,
                  avgSleepMinutes: payload.summary?.avgSleepMinutes,
                  gymDays: payload.summary?.gymDays,
                  goal: payload.summary?.goal || CHARACTER.goal,
                },
                persona: payload.persona,
              },
              null,
              2
            ),
          },
        ],
        temperature: 0.55,
        top_p: 0.85,
        max_tokens: 700,
        stream: false,
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, reason: "nvidia_error", message: body?.error?.message || `HTTP ${response.status}` };
    }
    const parsed = extractJsonObject(body?.choices?.[0]?.message?.content || "");
    if (!parsed?.spoken) {
      return { ok: false, reason: "bad_json", raw: String(body?.choices?.[0]?.message?.content || "").slice(0, 400) };
    }
    return { ok: true, model: body?.model || modelId, parsed };
  } catch (error) {
    const reason = error.name === "AbortError" ? "timeout" : "network";
    return { ok: false, reason, message: error.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleVoiceTurn(body = {}) {
  const summary = body.summary || getCharacterSummary();
  const goals = defaultGoals(body.goals || {});
  const openTasks = Array.isArray(body.openTasks) ? body.openTasks : [];
  const metrics = body.metrics || {};
  const transcript = String(body.transcript || "");
  const context = {
    transcript,
    metrics,
    openTasks,
    goals,
    summary,
    persona: body.persona || CHARACTER.id,
  };

  const key = body.nvidiaKey || process.env.NVIDIA_API_KEY;
  if (key) {
    const chosen = body.model || process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;
    const firstTimeout = /70b/i.test(String(chosen)) ? 18000 : 22000;
    let nvidia = await callNvidiaVoice({ key, modelId: chosen, payload: context, ms: firstTimeout });
    if (!nvidia.ok && chosen !== FAST_MODEL) {
      nvidia = await callNvidiaVoice({ key, modelId: FAST_MODEL, payload: context, ms: 18000 });
    }
    if (nvidia.ok) {
      const normalized = normalizeVoicePayload(nvidia.parsed, context);
      return {
        ...normalized,
        tasks: mergeTasks(openTasks, normalized.tasks),
        engine: "nvidia",
        model: nvidia.model,
      };
    }
    const fallback = localVoiceReply(context);
    return { ...fallback, engine: "local", fallbackReason: nvidia.reason, fallbackMessage: nvidia.message };
  }

  return localVoiceReply(context);
}

export function mountVoiceRoutes(app) {
  app.post("/api/voice", async (req, res) => {
    try {
      const result = await handleVoiceTurn(req.body || {});
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message || "voice_failed" });
    }
  });

  app.post("/api/voice/archive", (req, res) => {
    try {
      const saved = addEntry({
        kind: "voice-day",
        persona: req.body?.persona || CHARACTER.id,
        label: "Voz del día",
        transcript: req.body?.transcript,
        tasks: req.body?.tasks,
        spoken: req.body?.spoken,
        engine: req.body?.engine,
      });
      res.status(201).json({ ok: true, id: saved.id });
    } catch (error) {
      res.status(200).json({ ok: false, warning: error.message });
    }
  });
}
