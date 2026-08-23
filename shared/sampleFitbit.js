/** Personas de demo con forma de respuesta Fitbit Web API (resumida). */

function todayISO(timeZone = "America/Argentina/Buenos_Aires") {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export const PERSONAS = {
  mixto: {
    id: "mixto",
    label: "Hoy realista",
    blurb: "Sueño corto, pasos a medias, recuperación justa. El caso más común.",
  },
  recargado: {
    id: "recargado",
    label: "Día recargado",
    blurb: "Buen sueño y HRV. Hay margen para el trabajo pesado y moverse.",
  },
  agotado: {
    id: "agotado",
    label: "Día en deuda",
    blurb: "Poco sueño, FC alta, casi sin movimiento. Prioridad: recuperar.",
  },
};

function pack({
  date,
  sleepMinutes,
  efficiency,
  deep,
  rem,
  light,
  awake,
  awakenings,
  start,
  end,
  steps,
  calories,
  floors,
  distanceKm,
  sedentary,
  lightly,
  fairly,
  very,
  rhr,
  hrv,
  waterMl,
  displayName,
  source = "demo",
}) {
  return {
    date,
    source,
    profile: {
      displayName,
      timezone: "America/Argentina/Buenos_Aires",
    },
    sleep: {
      summary: {
        totalMinutesAsleep: sleepMinutes,
        totalTimeInBed: sleepMinutes + awake,
        efficiency,
        stages: { deep, rem, light, wake: awake },
      },
      main: {
        startTime: `${date}T${start}`,
        endTime: `${date}T${end}`,
        minutesAsleep: sleepMinutes,
        efficiency,
        awakenings,
      },
    },
    activity: {
      summary: {
        steps,
        caloriesOut: calories,
        floors,
        distances: [{ activity: "total", distance: distanceKm }],
        sedentaryMinutes: sedentary,
        lightlyActiveMinutes: lightly,
        fairlyActiveMinutes: fairly,
        veryActiveMinutes: very,
        restingHeartRate: rhr,
      },
    },
    heart: {
      restingHeartRate: rhr,
      zones: [
        { name: "Out of Range", minutes: sedentary },
        { name: "Fat Burn", minutes: fairly },
        { name: "Cardio", minutes: Math.max(0, very - 4) },
        { name: "Peak", minutes: Math.min(4, very) },
      ],
    },
    hrv: hrv == null ? null : { dailyRmssd: hrv },
    waterMl,
  };
}

export function getPersonaPayload(personaId = "mixto") {
  const date = todayISO();
  if (personaId === "recargado") {
    return pack({
      date,
      displayName: "Nacho (demo)",
      sleepMinutes: 472,
      efficiency: 91,
      deep: 86,
      rem: 102,
      light: 284,
      awake: 22,
      awakenings: 1,
      start: "23:18:00",
      end: "07:22:00",
      steps: 10840,
      calories: 2460,
      floors: 14,
      distanceKm: 8.2,
      sedentary: 428,
      lightly: 210,
      fairly: 38,
      very: 22,
      rhr: 56,
      hrv: 49,
      waterMl: 1800,
    });
  }
  if (personaId === "agotado") {
    return pack({
      date,
      displayName: "Nacho (demo)",
      sleepMinutes: 312,
      efficiency: 71,
      deep: 32,
      rem: 48,
      light: 232,
      awake: 58,
      awakenings: 5,
      start: "01:40:00",
      end: "07:10:00",
      steps: 2840,
      calories: 1620,
      floors: 3,
      distanceKm: 2.1,
      sedentary: 812,
      lightly: 90,
      fairly: 8,
      very: 0,
      rhr: 76,
      hrv: 21,
      waterMl: 700,
    });
  }
  return pack({
    date,
    displayName: "Nacho (demo)",
    sleepMinutes: 378,
    efficiency: 78,
    deep: 48,
    rem: 64,
    light: 266,
    awake: 42,
    awakenings: 3,
    start: "00:22:00",
    end: "07:04:00",
    steps: 6420,
    calories: 1980,
    floors: 8,
    distanceKm: 4.7,
    sedentary: 612,
    lightly: 164,
    fairly: 18,
    very: 6,
    rhr: 68,
    hrv: 32,
    waterMl: 1100,
  });
}

/** Armá un payload estilo Fitbit con los números que ves en la app (sin OAuth). */
export function payloadFromManual({
  sleepHours = 7,
  steps = 6000,
  restingHeartRate = 64,
  hrv = 35,
  activeMinutes = 20,
  waterMl = 1200,
  displayName = "vos",
} = {}) {
  const hours = Number(sleepHours) || 0;
  const sleepMinutes = Math.round(hours * 60);
  const active = Math.max(0, Number(activeMinutes) || 0);
  const fairly = Math.round(active * 0.65);
  const very = Math.max(0, Math.round(active - fairly));
  const stepCount = Math.max(0, Number(steps) || 0);
  const efficiency = Math.round(Math.min(95, Math.max(68, 72 + (hours - 6.5) * 6)));
  const deep = Math.round(sleepMinutes * 0.14);
  const rem = Math.round(sleepMinutes * 0.18);
  const awake = hours < 6 ? 48 : 24;
  const light = Math.max(0, sleepMinutes - deep - rem);
  const rhrRaw = restingHeartRate;
  const rhr = rhrRaw === "" || rhrRaw == null ? 64 : Number(rhrRaw);
  const hrvRaw = hrv;
  const hrvN = hrvRaw === "" || hrvRaw == null ? null : Number(hrvRaw);

  return pack({
    date: todayISO(),
    displayName,
    sleepMinutes,
    efficiency,
    deep,
    rem,
    light,
    awake,
    awakenings: hours < 6 ? 4 : hours < 7 ? 3 : 1,
    start: hours >= 7.5 ? "23:20:00" : "00:40:00",
    end: "07:30:00",
    steps: stepCount,
    calories: 1550 + Math.round(stepCount / 18),
    floors: Math.max(1, Math.round(stepCount / 1200)),
    distanceKm: Math.round((stepCount / 1320) * 10) / 10,
    sedentary: Math.max(240, 880 - fairly - very - 100),
    lightly: 150,
    fairly,
    very,
    rhr: Number.isFinite(rhr) ? rhr : 64,
    hrv: Number.isFinite(hrvN) ? hrvN : null,
    waterMl: Math.max(0, Number(waterMl) || 0),
    source: "manual",
  });
}

export function toMetrics(payload) {
  const s = payload.activity?.summary || {};
  const sleep = payload.sleep?.summary || {};
  const main = payload.sleep?.main || {};
  return {
    date: payload.date,
    displayName: payload.profile?.displayName,
    steps: s.steps || 0,
    calories: s.caloriesOut || 0,
    floors: s.floors || 0,
    distanceKm: s.distances?.[0]?.distance || 0,
    sedentaryMinutes: s.sedentaryMinutes || 0,
    lightlyActiveMinutes: s.lightlyActiveMinutes || 0,
    fairlyActiveMinutes: s.fairlyActiveMinutes || 0,
    veryActiveMinutes: s.veryActiveMinutes || 0,
    restingHeartRate: payload.heart?.restingHeartRate || s.restingHeartRate,
    hrvRmssd: payload.hrv?.dailyRmssd ?? null,
    sleepMinutes: sleep.totalMinutesAsleep || main.minutesAsleep || 0,
    timeInBed: sleep.totalTimeInBed || 0,
    sleepEfficiency: sleep.efficiency || main.efficiency || 0,
    deepMinutes: sleep.stages?.deep || 0,
    remMinutes: sleep.stages?.rem || 0,
    lightMinutes: sleep.stages?.light || 0,
    awakeMinutes: sleep.stages?.wake || 0,
    awakenings: main.awakenings || 0,
    sleepStart: main.startTime,
    sleepEnd: main.endTime,
    waterMl: payload.waterMl || 0,
    source: payload.source,
  };
}
