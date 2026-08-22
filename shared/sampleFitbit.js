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
}) {
  return {
    date,
    source: "demo",
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
