import crypto from "node:crypto";

const FITBIT_AUTH = "https://www.fitbit.com/oauth2/authorize";
const FITBIT_TOKEN = "https://api.fitbit.com/oauth2/token";
const FITBIT_API = "https://api.fitbit.com";

const SCOPES = ["activity", "heartrate", "sleep", "profile"];

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

export async function fetchToday(accessToken, date = "today") {
  const [profile, activity, sleep, heart, hrv] = await Promise.all([
    fitbitGet("/1/user/-/profile.json", accessToken).catch(() => null),
    fitbitGet(`/1/user/-/activities/date/${date}.json`, accessToken),
    fitbitGet(`/1.2/user/-/sleep/date/${date}.json`, accessToken).catch(() => null),
    fitbitGet(`/1/user/-/activities/heart/date/${date}/1d.json`, accessToken).catch(() => null),
    fitbitGet(`/1/user/-/hrv/date/${date}.json`, accessToken).catch(() => null),
  ]);

  const mainSleep = (sleep?.sleep || []).find((s) => s.isMainSleep) || sleep?.sleep?.[0];
  const heartDay = heart?.["activities-heart"]?.[0];
  const hrvDay = hrv?.hrv?.[0]?.value;

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
    activity: { summary: activity?.summary || {} },
    heart: {
      restingHeartRate: heartDay?.value?.restingHeartRate || activity?.summary?.restingHeartRate,
      zones: heartDay?.value?.heartRateZones || [],
    },
    hrv: hrvDay ? { dailyRmssd: hrvDay.dailyRmssd || hrvDay.rmssd } : null,
  };
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
