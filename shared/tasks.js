/**
 * Lista de tareas del día: merge sin borrar historial, "terminé X" / "ya hice" / "tacho",
 * y progreso vs metas + promedios de 4 semanas (Cami).
 */

import { CHARACTER } from "./character.js";

export const TASKS_STORAGE_KEY = "pagweb-day-tasks-v1";

const COMPLETE_LEAD =
  /^(?:termine(?:\s+de)?|ya\s+hice|ya\s+termine|tacho|tache|listo(?:\s+con)?|complete|cruzo|marque)\s+/i;

const COMPLETE_GLOBAL =
  /(?:^|[.,;]\s*)(?:termine(?:\s+de)?|ya\s+hice|ya\s+termine|tacho|tache|listo(?:\s+con)?|complete)\s+(.+?)(?=(?:\s+y\s+(?:termine|ya hice|tacho|tache|listo|complete))|[.,;]|$)/gi;

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function minutesToHm(mins) {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export function hoursToHm(hours) {
  return minutesToHm(Math.max(0, Math.round(Number(hours || 0) * 60)));
}

export function slugTask(title) {
  return normalizeText(title).replace(/\s+/g, "-").slice(0, 72) || "tarea";
}

export function makeTask(title, extra = {}) {
  const text = String(title || "").trim();
  const createdAt = extra.createdAt || new Date().toISOString();
  return {
    id: extra.id || `t-${slugTask(text)}-${createdAt}`,
    title: text,
    done: Boolean(extra.done),
    source: extra.source || "voice",
    createdAt,
    doneAt: extra.done ? extra.doneAt || createdAt : extra.doneAt || null,
  };
}

export function similar(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" ").filter((w) => w.length > 2));
  const tb = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return false;
  let overlap = 0;
  for (const w of ta) if (tb.has(w)) overlap += 1;
  return overlap / Math.min(ta.size, tb.size) >= 0.55;
}

export function defaultGoals(overrides = {}) {
  return {
    sleepHours: Number(overrides.sleepHours ?? overrides.sleepGoal ?? CHARACTER.goal.sleepHours),
    steps: Number(overrides.steps ?? overrides.stepsGoal ?? CHARACTER.goal.steps),
    gymPerWeek: Number(overrides.gymPerWeek ?? CHARACTER.goal.gymPerWeek),
  };
}

function stripLead(text) {
  return String(text || "")
    .replace(/^(de|el|la|los|las|un|una|mi)\s+/i, "")
    .replace(/\s+(hoy|ya|listo)$/i, "")
    .trim();
}

export function parseCompletePhrases(transcript) {
  const raw = normalizeText(transcript);
  const found = [];
  const re = new RegExp(COMPLETE_GLOBAL.source, COMPLETE_GLOBAL.flags);
  let match;
  while ((match = re.exec(raw))) {
    const item = stripLead(match[1] || "");
    if (item.length >= 2) found.push(item);
  }
  if (!found.length && COMPLETE_LEAD.test(raw)) {
    const item = stripLead(raw.replace(COMPLETE_LEAD, ""));
    if (item.length >= 2) found.push(item);
  }
  return [...new Set(found)];
}

export function parseNewTodos(transcript) {
  const raw = String(transcript || "");
  const withoutDone = raw.replace(
    /(?:terminé(?: de)?|termine(?: de)?|ya hice|ya termin[eé]|tacho|taché|tache|listo(?: con)?|completé|complete)\s+[^.,;]+/gi,
    " "
  );
  const match = withoutDone.match(
    /(?:tengo que(?: hacer)?|hay que|me falta|hoy (?:tengo que|hago)|anotá(?:me)?|anota(?:me)?|agend[ae]|después tengo que|despues tengo que)\s+(.+)/i
  );
  if (!match) return [];
  return match[1]
    .split(/\s*(?:,|;| y | después | despues )\s*/i)
    .map((part) => stripLead(part.replace(/[.\s]+$/g, "")))
    .filter((part) => part.length > 2 && part.split(/\s+/).length < 14);
}

export function mergeTasks(existing = [], incoming = []) {
  const out = existing.map((task) => ({ ...task }));
  for (const raw of incoming || []) {
    const title = typeof raw === "string" ? raw : raw?.title;
    if (!title || !String(title).trim()) continue;
    const done = typeof raw === "object" ? Boolean(raw.done) : false;
    const found = out.find((task) => similar(task.title, title));
    if (found) {
      if (done && !found.done) {
        found.done = true;
        found.doneAt = raw.doneAt || new Date().toISOString();
      }
    } else {
      out.push(makeTask(title, typeof raw === "object" ? raw : {}));
    }
  }
  return out;
}

export function completeByPhrase(tasks = [], phrase = "") {
  const targets = parseCompletePhrases(phrase);
  if (!targets.length) {
    return { tasks: tasks.map((task) => ({ ...task })), completed: [] };
  }
  const completed = [];
  const next = tasks.map((task) => {
    if (task.done) return { ...task };
    const hit = targets.some(
      (target) => similar(task.title, target) || normalizeText(task.title).includes(normalizeText(target))
    );
    if (!hit) return { ...task };
    completed.push(task.title);
    return { ...task, done: true, doneAt: new Date().toISOString() };
  });
  return { tasks: next, completed };
}

function sleepMinutesOf(metrics = {}) {
  return Number(metrics.sleepMinutes ?? metrics.sleepMinutes ?? 0) || 0;
}

function stepsOf(metrics = {}) {
  return Number(metrics.steps || 0) || 0;
}

export function progressVsGoals(metrics = {}, goalsInput = {}, summary = null) {
  const goals = defaultGoals(goalsInput);
  const sleepMin = sleepMinutesOf(metrics);
  const sleepH = sleepMin / 60;
  const steps = stepsOf(metrics);
  const avgSleepMin = summary ? Number(summary.avgSleepMinutes || 0) : 0;
  const avgSteps = summary ? Number(summary.avgSteps || 0) : 0;
  const days = Number(summary?.days || 28) || 28;
  const gymDays = Number(summary?.gymDays || 0);
  const gymPerWeek = gymDays / (days / 7);

  const rows = [
    {
      id: "sleep",
      label: "Sueño",
      today: minutesToHm(sleepMin),
      goal: hoursToHm(goals.sleepHours),
      average: summary ? minutesToHm(avgSleepMin) : "—",
      metGoal: sleepH >= goals.sleepHours,
      deltaGoal: sleepH - goals.sleepHours,
      cite: `Hoy ${minutesToHm(sleepMin)} vs meta ${hoursToHm(goals.sleepHours)}${
        summary ? ` y vs promedio 4 semanas ${minutesToHm(avgSleepMin)}` : ""
      }`,
    },
    {
      id: "steps",
      label: "Pasos",
      today: steps.toLocaleString("es-AR"),
      goal: goals.steps.toLocaleString("es-AR"),
      average: summary ? avgSteps.toLocaleString("es-AR") : "—",
      metGoal: steps >= goals.steps,
      deltaGoal: steps - goals.steps,
      cite: `Hoy ${steps.toLocaleString("es-AR")} pasos vs meta ${goals.steps.toLocaleString("es-AR")}${
        summary ? ` y vs promedio ${avgSteps.toLocaleString("es-AR")}` : ""
      }`,
    },
    {
      id: "gym",
      label: "Gym",
      today: metrics.kind === "gym" || metrics.kind === "futbol" ? "hoy hay estímulo" : "hoy no es día de gym",
      goal: `${goals.gymPerWeek}× / sem`,
      average: summary ? `${gymPerWeek.toFixed(1)}× / sem` : "—",
      metGoal: gymPerWeek >= goals.gymPerWeek,
      deltaGoal: gymPerWeek - goals.gymPerWeek,
      cite: summary
        ? `${gymDays} sesiones en ${days} días (~${gymPerWeek.toFixed(1)}×/semana) vs meta ${goals.gymPerWeek}×`
        : `meta ${goals.gymPerWeek}× por semana`,
    },
  ];

  return {
    goals,
    sleepHours: sleepH,
    sleepMinutes: sleepMin,
    steps,
    avgSleepMinutes: avgSleepMin,
    avgSteps,
    gymDays,
    gymPerWeek,
    rows,
    cites: rows.map((row) => row.cite),
  };
}

function joinList(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

export function localSpoken({ transcript, progress, completed = [], added = [], summary, name = "Nacho" } = {}) {
  const sleep = progress?.rows?.find((row) => row.id === "sleep");
  const steps = progress?.rows?.find((row) => row.id === "steps");
  const gym = progress?.rows?.find((row) => row.id === "gym");
  const bits = [];
  bits.push(`${name}, te escucho.`);
  if (transcript) {
    const clip = String(transcript).replace(/\s+/g, " ").trim().slice(0, 160);
    bits.push(`De lo que contaste: ${clip}${clip.length >= 160 ? "…" : "."}`);
  }
  if (sleep) {
    bits.push(
      `Hoy dormiste ${sleep.today} contra una meta de ${sleep.goal}. ${
        summary ? `El promedio de las 4 semanas de ${CHARACTER.nickname} está en ${sleep.average}, ` : ""
      }así que ${sleep.metGoal ? "estás arriba de la meta de sueño" : "te falta un toque para la meta de sueño"}.`
    );
  }
  if (steps) {
    bits.push(
      `Pasos: ${steps.today} vs ${steps.goal} de objetivo${summary ? ` y vs ${steps.average} de promedio` : ""}.`
    );
  }
  if (gym) bits.push(`Gym: ${gym.cite}.`);
  if (added.length) bits.push(`Te anoto: ${joinList(added)}.`);
  if (completed.length) bits.push(`Tacho ${joinList(completed)}. Bien.`);
  bits.push(`Cuando termines algo, decime "terminé" o "ya hice" y lo cruzo. No borro lo que ya tachaste.`);
  return bits.join(" ");
}

export function applyTranscriptToTasks(openTasks = [], transcript = "") {
  const addedTitles = parseNewTodos(transcript);
  const merged = mergeTasks(
    openTasks,
    addedTitles.map((title) => makeTask(title, { source: "voice" }))
  );
  const finished = completeByPhrase(merged, transcript);
  const added = addedTitles.filter(
    (title) =>
      finished.tasks.some((task) => similar(task.title, title)) &&
      !openTasks.some((prev) => similar(prev.title, title))
  );
  return { tasks: finished.tasks, completed: finished.completed, added };
}

export function localVoiceReply({
  transcript = "",
  metrics = {},
  openTasks = [],
  goals,
  summary = null,
  persona,
} = {}) {
  const progress = progressVsGoals(metrics, goals, summary);
  const applied = applyTranscriptToTasks(openTasks, transcript);
  const name = persona === CHARACTER.id ? CHARACTER.nickname : "Nacho";
  return {
    spoken: localSpoken({
      transcript,
      progress,
      completed: applied.completed,
      added: applied.added,
      summary,
      name,
    }),
    tasks: applied.tasks,
    progressVsGoals: progress.rows,
    noticing: progress.cites.join(" · "),
    completed: applied.completed,
    added: applied.added,
    engine: "local",
  };
}

export function normalizeVoicePayload(parsed, context = {}) {
  const incoming = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  const applied = applyTranscriptToTasks(mergeTasks(context.openTasks || [], incoming), context.transcript || "");
  const progress = progressVsGoals(context.metrics || {}, context.goals, context.summary);
  const rows =
    Array.isArray(parsed?.progressVsGoals) && parsed.progressVsGoals.length ? parsed.progressVsGoals : progress.rows;
  const spoken = String(parsed?.spoken || parsed?.spoken || "").trim();
  return {
    spoken:
      spoken ||
      localSpoken({
        transcript: context.transcript,
        progress,
        completed: applied.completed,
        added: applied.added,
        summary: context.summary,
        name: context.persona === CHARACTER.id ? CHARACTER.nickname : "Nacho",
      }),
    tasks: applied.tasks,
    progressVsGoals: rows,
    noticing: parsed?.noticing || progress.cites.join(" · "),
    completed: applied.completed,
    added: applied.added,
  };
}

export function loadStoredTasks(storage) {
  try {
    const raw = storage?.getItem?.(TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((task) => task && task.title) : [];
  } catch {
    return [];
  }
}

export function saveStoredTasks(storage, tasks) {
  try {
    storage?.setItem?.(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* quota / private mode */
  }
}
