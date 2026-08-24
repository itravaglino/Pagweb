import crypto from "node:crypto";

const FITBIT_AUTH = "https://www.fitbit.com/oauth2/authorize";
const FITBIT_TOKEN = "https://api.fitbit.com/oauth2/token";
const FITBIT_API = "https://api.fitbit.com";

/** Scopes de la Web API para un reloj de mano. Hay que re-autorizar si la app era más vieja. */
export const SCOPES = [
  "activity",
  "heartrate",
  "sleep",
  "profile",
  "oxygen_saturation",
  "respiratory_rate",
  "temperature",
  "nutrition",
  "cardio_fitness",
  "settings",
];

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function makePkce() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function configured() {
  return Boolean(process.env.FITBIT_CLIENT_ID);
}

export function authorizeUrl({ redirectUri, challenge, state }) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.FITBIT_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  return `${FITBIT_AUTH}?${params.toString()}`;
}

export async function exchangeCode({ code, redirectUri, verifier }) {
  const body = new URLSearchParams({
    client_id: process.env.FITBIT_CLIENT_ID,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  });
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (process.env.FITBIT_CLIENT_SECRET) {
    const basic = Buffer.from(
      `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
    ).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }
  const res = await fetch(FITBIT_TOKEN, { method: "POST", headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.errors?.[0]?.message || data?.error || `token ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

async function fitbitGet(path, accessToken) {
  const res = await fetch(`${FITBIT_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.errors?.[0]?.message || `fitbit ${res.status} ${path}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function optionalGet(path, accessToken) {
  try {
    return await fitbitGet(path, accessToken);
  } catch {
    return null;
  }
}

function lastIntradayHeart(intraday) {
  const dataset = intraday?.["activities-heart-intraday"]?.dataset;
  if (!Array.isArray(dataset) || !dataset.length) return null;
  for (let i = dataset.length - 1; i >= 0; i -= 1) {
    const value = Number(dataset[i]?.value);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function spo2From(payload) {
  if (!payload) return null;
  const value = payload.value || payload;
  const avg = value.avg ?? payload.avg;
  if (avg == null && value.min == null) return null;
  return { avg, min: value.min ?? null, max: value.max ?? null };
}

function trackerDevice(devices) {
  if (!Array.isArray(devices) || !devices.length) return null;
  const tracker = devices.find((d) => /tracker|watch/i.test(d.type || d.deviceVersion || "")) || devices[0];
  return {
    name: tracker.deviceVersion || tracker.id || "Fitbit",
    type: tracker.type || "TRACKER",
    batteryLevel: tracker.batteryLevel ?? null,
    battery: tracker.battery || null,
    lastSyncTime: tracker.lastSyncTime || null,
  };
}

export async function fetchToday(accessToken, date = "today") {
  const [
    profile,
    activity,
    sleep,
    heart,
    hrv,
    spo2,
    temp,
    breath,
    devices,
    water,
    cardio,
    heartIntraday,
  ] = await Promise.all([
    optionalGet("/1/user/-/profile.json", accessToken),
    fitbitGet(`/1/user/-/activities/date/${date}.json`, accessToken),
    optionalGet(`/1.2/user/-/sleep/date/${date}.json`, accessToken),
    optionalGet(`/1/user/-/activities/heart/date/${date}/1d.json`, accessToken),
    optionalGet(`/1/user/-/hrv/date/${date}.json`, accessToken),
    optionalGet(`/1/user/-/spo2/date/${date}.json`, accessToken),
    optionalGet(`/1/user/-/temp/skin/date/${date}.json`, accessToken),
    optionalGet(`/1/user/-/br/date/${date}.json`, accessToken),
    optionalGet("/1/user/-/devices.json", accessToken),
    optionalGet(`/1/user/-/foods/log/water/date/${date}.json`, accessToken),
    optionalGet(`/1/user/-/cardioscore/date/${date}.json`, accessToken),
    optionalGet(`/1/user/-/activities/heart/date/${date}/1d/1min.json`, accessToken),
  ]);

  const mainSleep = (sleep?.sleep || []).find((s) => s.isMainSleep) || sleep?.sleep?.[0];
  const heartDay = heart?.["activities-heart"]?.[0];
  const hrvDay = hrv?.hrv?.[0]?.value;
  const spo2Value = spo2From(spo2);
  const tempDay = temp?.tempSkin?.[0]?.value || temp?.tempSkin?.[0];
  const brDay = breath?.br?.[0]?.value || breath?.br?.[0];
  const cardioDay = cardio?.cardioScore?.[0]?.value || cardio?.cardioScore?.[0];
  const waterMl = water?.summary?.water ?? water?.water ?? null;
  const device = trackerDevice(devices);
  const logged = activity?.activities || [];

  return {
    date: activity?.summary ? date : todayStamp(),
    source: "fitbit",
    profile: {
      displayName: profile?.user?.displayName || profile?.user?.fullName || "Fitbit",
      timezone: profile?.user?.timezone || "America/Argentina/Buenos_Aires",
    },
    sleep: {
      summary: {
        totalMinutesAsleep: sleep?.summary?.totalMinutesAsleep || mainSleep?.minutesAsleep || 0,
        totalTimeInBed: sleep?.summary?.totalTimeInBed || 0,
        efficiency: mainSleep?.efficiency || 0,
        stages: sleep?.summary?.stages || {},
      },
      main: mainSleep
        ? {
            startTime: mainSleep.startTime,
            endTime: mainSleep.endTime,
            minutesAsleep: mainSleep.minutesAsleep,
            efficiency: mainSleep.efficiency,
            awakenings: mainSleep.levels?.summary?.wake?.count || mainSleep.awakeCount,
          }
        : null,
    },
    activity: {
      summary: activity?.summary || {},
      list: logged.map((item) => ({
        name: item.name || item.activityName,
        duration: Math.round((item.duration || 0) / 60000),
        calories: item.calories,
        steps: item.steps,
      })),
    },
    heart: {
      restingHeartRate: heartDay?.value?.restingHeartRate || activity?.summary?.restingHeartRate,
      current: lastIntradayHeart(heartIntraday),
      zones: heartDay?.value?.heartRateZones || [],
    },
    hrv: hrvDay ? { dailyRmssd: hrvDay.dailyRmssd || hrvDay.rmssd } : null,
    spo2: spo2Value,
    temp: tempDay ? { relative: tempDay.nightlyRelative ?? tempDay.relative ?? tempDay.value ?? null } : null,
    waterMl: typeof waterMl === "number" ? waterMl : 0,
    breathingRate: brDay?.breathingRate ?? brDay?.value ?? null,
    vo2Max: cardioDay?.vo2Max ?? cardioDay?.value ?? null,
    device,
  };
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
