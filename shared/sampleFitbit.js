/** Personas de demo con forma de respuesta Fitbit Web API (activity, sleep, heart, HRV, SpO2, AZM). */

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

function shiftDate(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function scaleHourly(weights, total) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const rounded = raw.map((n) => Math.round(n));
  let drift = total - rounded.reduce((a, b) => a + b, 0);
  for (let i = 0; drift !== 0 && i < 24; i += 1) {
    const idx = (i * 7) % 24;
    if (rounded[idx] + Math.sign(drift) >= 0) {
      rounded[idx] += Math.sign(drift);
      drift -= Math.sign(drift);
    }
  }
  return rounded;
}

/** Perfil de Córdoba: picos de bondi/caminata UNC 8h y 18h, almuerzo, noche quieta. */
function hourlyFor(kind, total) {
  const night = [8, 4, 2, 2, 3, 6, 18, 90];
  const campus = [820, 310, 280, 340, 620, 250, 240, 270, 880];
  const evening = [420, 210, 140, 90, 40, 18, 12];
  const rest = [12, 6, 3, 2, 2, 4, 10, 40, 80, 60, 50, 40, 70, 40, 35, 30, 90, 110, 80, 50, 30, 20, 14, 10];
  const gym = [6, 3, 2, 2, 2, 5, 20, 80, 240, 180, 160, 140, 400, 220, 180, 160, 210, 1240, 680, 260, 140, 80, 40, 18];
  const exam = [4, 2, 1, 1, 2, 4, 12, 40, 180, 90, 70, 60, 110, 50, 40, 35, 40, 220, 90, 50, 30, 20, 12, 8];
  const barrio = [10, 5, 3, 2, 3, 8, 40, 180, 640, 880, 720, 540, 960, 820, 700, 640, 980, 1100, 740, 420, 260, 140, 80, 30];
  const map = { mixto: [...night, ...campus, ...evening], recargado: gym, agotado: rest, examen: exam, barrio };
  return scaleHourly(map[kind] || map.mixto, total);
}

export const PERSONAS = {
  mixto: {
    id: "mixto",
    label: "Martes UNC",
    blurb: "Córdoba, 18 °C. Sueño corto, bondi + pabellón, recuperación justa. El caso más común.",
  },
  recargado: {
    id: "recargado",
    label: "Sábado gym",
    blurb: "Dormiste bien. Parque Sarmiento + pesas. HRV alto: hay margen de estímulo.",
  },
  agotado: {
    id: "agotado",
    label: "Post parcial",
    blurb: "Noche corta, FC alta, casi sin movimiento. Prioridad: recuperar el sistema nervioso.",
  },
  examen: {
    id: "examen",
    label: "Semana de mesas",
    blurb: "Biblioteca, café y silla. Pocos pasos, HRV abajo. El reloj pide foco, no HIIT.",
  },
  barrio: {
    id: "barrio",
    label: "Domingo Güemes",
    blurb: "Caminata larga por el barrio. Sueño decente, zona 2, calor de siesta cordobesa.",
  },
};

function pack({
  date,
  persona,
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
  spo2 = 96.4,
  skinTemp = 0,
  azmFat = 12,
  azmCardio = 4,
  azmPeak = 0,
  activities = [],
  story = "",
  source = "demo",
}) {
  const hourly = hourlyFor(persona || "mixto", steps);
  const fat = Math.max(0, fairly);
  const cardio = Math.max(0, very - 4);
  const peak = Math.min(4, very);
  return {
    date,
    source,
    story,
    persona,
    profile: {
      displayName,
      timezone: "America/Argentina/Buenos_Aires",
      encodedId: "DEMO6NACHO",
    },
    sleep: {
      summary: {
        totalMinutesAsleep: sleepMinutes,
        totalTimeInBed: sleepMinutes + awake,
        efficiency,
        stages: { deep, rem, light, wake: awake },
      },
      main: {
        startTime: `${date}T${start}-03:00`,
        endTime: `${date}T${end}-03:00`,
        minutesAsleep: sleepMinutes,
        efficiency,
        awakenings,
      },
      stages: [
        { stage: "wake", minutes: Math.round(awake * 0.15) },
        { stage: "light", minutes: Math.round(light * 0.35) },
        { stage: "deep", minutes: Math.round(deep * 0.55) },
        { stage: "light", minutes: Math.round(light * 0.25) },
        { stage: "rem", minutes: Math.round(rem * 0.45) },
        { stage: "light", minutes: Math.round(light * 0.4) },
        { stage: "deep", minutes: Math.max(0, deep - Math.round(deep * 0.55)) },
        { stage: "rem", minutes: Math.max(0, rem - Math.round(rem * 0.45)) },
        { stage: "wake", minutes: Math.max(0, awake - Math.round(awake * 0.15)) },
      ],
    },
    activity: {
      summary: {
        steps,
        caloriesOut: calories,
        caloriesBMR: Math.round(calories * 0.62),
        floors,
        distances: [{ activity: "total", distance: distanceKm }],
        sedentaryMinutes: sedentary,
        lightlyActiveMinutes: lightly,
        fairlyActiveMinutes: fairly,
        veryActiveMinutes: very,
        restingHeartRate: rhr,
        activeZoneMinutes: { fatBurn: azmFat, cardio: azmCardio, peak: azmPeak, total: azmFat + azmCardio + azmPeak },
      },
      intraday: {
        steps: hourly.map((value, hour) => ({ hour, value })),
      },
      list: activities,
    },
    heart: {
      restingHeartRate: rhr,
      zones: [
        { name: "Out of Range", minutes: sedentary, min: 30, max: 104 },
        { name: "Fat Burn", minutes: fat, min: 105, max: 131 },
        { name: "Cardio", minutes: cardio, min: 132, max: 159 },
        { name: "Peak", minutes: peak, min: 160, max: 220 },
      ],
    },
    hrv: hrv == null ? null : { dailyRmssd: hrv, deepRmssd: Math.round(hrv * 1.12) },
    spo2: { avg: spo2 },
    temp: { relative: skinTemp },
    waterMl,
  };
}

const RECIPES = {
  mixto: {
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
    spo2: 96.1,
    skinTemp: 0.15,
    azmFat: 18,
    azmCardio: 6,
    azmPeak: 0,
    story: "Martes típico: 6h 18m de sueño, bondi a Ciudad Universitaria, 6.420 pasos y HRV 32 ms.",
    activities: [
      { name: "Walk", duration: 18, calories: 72, steps: 1840 },
      { name: "Walk", duration: 14, calories: 58, steps: 1320 },
    ],
  },
  recargado: {
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
    spo2: 97.2,
    skinTemp: -0.12,
    azmFat: 36,
    azmCardio: 18,
    azmPeak: 4,
    story: "Sábado recargado: 7h 52m, HRV 49 ms, pesas + Parque Sarmiento. 10.840 pasos.",
    activities: [
      { name: "Sport", duration: 52, calories: 340, steps: 2100 },
      { name: "Walk", duration: 48, calories: 190, steps: 5200 },
    ],
  },
  agotado: {
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
    spo2: 95.4,
    skinTemp: 0.42,
    azmFat: 8,
    azmCardio: 0,
    azmPeak: 0,
    story: "Post parcial: 5h 12m, 5 despertares, FC 76, HRV 21 ms. El reloj pide cama, no gym.",
    activities: [{ name: "Walk", duration: 11, calories: 38, steps: 980 }],
  },
  examen: {
    sleepMinutes: 348,
    efficiency: 74,
    deep: 38,
    rem: 52,
    light: 258,
    awake: 46,
    awakenings: 4,
    start: "01:05:00",
    end: "07:18:00",
    steps: 4120,
    calories: 1760,
    floors: 4,
    distanceKm: 3.1,
    sedentary: 754,
    lightly: 112,
    fairly: 10,
    very: 2,
    rhr: 72,
    hrv: 24,
    waterMl: 900,
    spo2: 95.8,
    skinTemp: 0.28,
    azmFat: 10,
    azmCardio: 2,
    azmPeak: 0,
    story: "Semana de mesas: 5h 48m, 4.120 pasos (casi todo silla). Café sí, HIIT no.",
    activities: [{ name: "Walk", duration: 16, calories: 54, steps: 1480 }],
  },
  barrio: {
    sleepMinutes: 438,
    efficiency: 88,
    deep: 72,
    rem: 88,
    light: 278,
    awake: 28,
    awakenings: 2,
    start: "23:40:00",
    end: "07:26:00",
    steps: 12880,
    calories: 2380,
    floors: 11,
    distanceKm: 9.6,
    sedentary: 490,
    lightly: 248,
    fairly: 42,
    very: 12,
    rhr: 60,
    hrv: 41,
    waterMl: 1600,
    spo2: 96.8,
    skinTemp: -0.04,
    azmFat: 42,
    azmCardio: 12,
    azmPeak: 1,
    story: "Domingo por Güemes: 7h 18m y 12.880 pasos de zona 2. Siesta corta, no PR.",
    activities: [
      { name: "Walk", duration: 96, calories: 380, steps: 9800 },
      { name: "Walk", duration: 22, calories: 86, steps: 2100 },
    ],
  },
};

const WEEK_ORDER = [
  ["agotado", -6],
  ["examen", -5],
  ["mixto", -4],
  ["mixto", -3],
  ["examen", -2],
  ["recargado", -1],
  ["barrio", 0],
];

function weekFor(today) {
  return WEEK_ORDER.map(([id, offset]) => {
    const recipe = RECIPES[id];
    const date = shiftDate(today, offset);
    return {
      date,
      persona: id,
      label: PERSONAS[id].label,
      steps: recipe.steps,
      sleepMinutes: recipe.sleepMinutes,
      hrv: recipe.hrv,
      rhr: recipe.rhr,
      calories: recipe.calories,
    };
  });
}

export function getPersonaPayload(personaId = "mixto") {
  const date = todayISO();
  const id = RECIPES[personaId] ? personaId : "mixto";
  const recipe = RECIPES[id];
  const payload = pack({
    ...recipe,
    date,
    persona: id,
    displayName: "Nacho (Charge 6 · demo)",
  });
  payload.week = weekFor(date);
  return payload;
}

export function listDemoWeek(anchor = todayISO()) {
  return WEEK_ORDER.map(([id, offset]) => {
    const date = shiftDate(anchor, offset);
    const recipe = RECIPES[id];
    const payload = pack({
      ...recipe,
      date,
      persona: id,
      displayName: "Nacho (Charge 6 · demo)",
    });
    payload.week = weekFor(anchor);
    payload.date = date;
    return payload;
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

  const payload = pack({
    date: todayISO(),
    persona: "mixto",
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
    spo2: hours < 6 ? 95.2 : 96.6,
    skinTemp: hours < 6 ? 0.3 : 0,
    azmFat: Math.round(fairly * 0.9),
    azmCardio: Math.round(very * 0.7),
    azmPeak: Math.min(3, Math.round(very * 0.15)),
    story: "Números pegados a mano desde la app Fitbit.",
    source: "manual",
  });
  payload.week = weekFor(todayISO());
  return payload;
}

export function toMetrics(payload) {
  const s = payload.activity?.summary || {};
  const sleep = payload.sleep?.summary || {};
  const main = payload.sleep?.main || {};
  const azm = s.activeZoneMinutes || {};
  return {
    date: payload.date,
    displayName: payload.profile?.displayName,
    persona: payload.persona,
    story: payload.story || "",
    steps: s.steps || 0,
    calories: s.caloriesOut || 0,
    caloriesBmr: s.caloriesBMR || 0,
    floors: s.floors || 0,
    distanceKm: s.distances?.[0]?.distance || 0,
    sedentaryMinutes: s.sedentaryMinutes || 0,
    lightlyActiveMinutes: s.lightlyActiveMinutes || 0,
    fairlyActiveMinutes: s.fairlyActiveMinutes || 0,
    veryActiveMinutes: s.veryActiveMinutes || 0,
    azmTotal: azm.total || 0,
    azmFat: azm.fatBurn || 0,
    azmCardio: azm.cardio || 0,
    azmPeak: azm.peak || 0,
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
    sleepStages: payload.sleep?.stages || [],
    hourlySteps: payload.activity?.intraday?.steps || [],
    heartZones: payload.heart?.zones || [],
    activities: payload.activity?.list || [],
    spo2: payload.spo2?.avg ?? null,
    skinTemp: payload.temp?.relative ?? null,
    waterMl: payload.waterMl || 0,
    week: payload.week || [],
    source: payload.source,
  };
}
