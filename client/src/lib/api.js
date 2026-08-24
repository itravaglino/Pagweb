const SERVER_DOWN = "no llegó el servidor";

async function tryJson(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    const error = new Error(SERVER_DOWN);
    error.cause = err;
    error.offline = true;
    throw error;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || data.message || SERVER_DOWN);
    error.status = res.status;
    error.data = data;
    error.offline = res.status >= 500 || res.status === 0;
    throw error;
  }
  return data;
}

function jsonPost(url, body) {
  return tryJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

export function manualDayBody(settings = {}) {
  return {
    persona: "mio",
    settings: {
      sleepHours: settings.mySleepHours,
      steps: settings.mySteps,
      restingHeartRate: settings.myRhr,
      hrv: settings.myHrv,
      activeMinutes: settings.myActiveMinutes,
      waterMl: settings.myWaterMl,
      displayName: settings.name || "vos",
    },
  };
}

export async function fetchDay(persona = "mixto", source, settings, { date } = {}) {
  if (persona === "mio") {
    return jsonPost("/api/day", manualDayBody(settings));
  }
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  if (persona) qs.set("persona", persona);
  if (source) qs.set("source", source);
  const suffix = qs.toString();
  return tryJson(suffix ? `/api/day?${suffix}` : "/api/day");
}

export function fetchPersonas() {
  return tryJson("/api/demo/personas");
}

export function fetchCharacter() {
  return tryJson("/api/character");
}

export function fetchCharacterDays() {
  return tryJson("/api/character/days");
}

export function fetchFitbitStatus() {
  return tryJson("/api/fitbit/status").catch(() => ({
    configured: false,
    connected: false,
    offline: true,
  }));
}

export function fetchHost() {
  return tryJson("/api/host").catch(() => null);
}

export function fetchNvidiaStatus() {
  return tryJson("/api/nvidia").catch(() => ({
    ok: false,
    connected: false,
    source: "none",
  }));
}

export function fetchGemmaStatus() {
  return tryJson("/api/gemma/models").catch(() => ({
    ok: false,
    models: [],
    offline: true,
  }));
}

export function fetchCoach({ metrics, persona, nvidiaKey, model, profile, mode, history, persist } = {}) {
  return jsonPost("/api/coach", {
    metrics,
    persona,
    nvidiaKey,
    model,
    profile,
    mode,
    history,
    persist,
  });
}

export function fetchVoice(body = {}) {
  return jsonPost("/api/voice", body);
}
