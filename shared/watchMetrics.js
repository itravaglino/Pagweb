/** Snapshot estructurado de un reloj de mano + respuestas locales cortas (sin inventar sensores). */

import { minutesToHm } from "./analyze.js";
import { clipWatchText } from "./gemma.js";

export const WATCH_QUESTIONS = [
  { id: "como-vengo", label: "¿Cómo vengo?", ask: "¿Cómo vengo hoy? Resumen de reloj." },
  { id: "fc", label: "Ritmo", ask: "Ritmo cardíaco actual, en reposo y zonas." },
  { id: "pasos", label: "Pasos", ask: "Pasos, distancia, pisos, calorías y minutos activos." },
  { id: "sueno", label: "Sueño", ask: "Sueño de anoche: duración, eficiencia, etapas." },
  { id: "estres", label: "Estrés / HRV", ask: "HRV, recupero y estrés según el reloj." },
  { id: "oxigeno", label: "SpO₂", ask: "Oxígeno en sangre y respiración si hay datos." },
  { id: "bateria", label: "Batería", ask: "Batería del reloj, último sync y tipo de actividad." },
  { id: "alertas", label: "Alertas", ask: "¿Hay algo raro: FC alta, inactividad, sueño corto?" },
];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function detectWatchAlerts(metrics = {}, now = new Date()) {
  const alerts = [];
  const rhr = num(metrics.restingHeartRate);
  const current = num(metrics.currentHeartRate);
  const inActivity = (metrics.fairlyActiveMinutes || 0) + (metrics.veryActiveMinutes || 0) > 12;
  if (current != null && current >= 120 && !inActivity) {
    alerts.push({ id: "high-hr", level: "warn", text: `FC ${Math.round(current)} lpm alta en reposo.` });
  }
  if (rhr != null && rhr >= 75) {
    alerts.push({ id: "high-rhr", level: "warn", text: `FC en reposo ${rhr} lpm, más alta de lo cómodo.` });
  }
  if (num(metrics.hrvRmssd) != null && metrics.hrvRmssd < 25) {
    alerts.push({ id: "low-hrv", level: "warn", text: `HRV ${Math.round(metrics.hrvRmssd)} ms: el cuerpo pide suavidad.` });
  }
  if ((metrics.sleepMinutes || 0) < 360) {
    alerts.push({ id: "short-sleep", level: "warn", text: `Sueño corto: ${minutesToHm(metrics.sleepMinutes)}.` });
  }
  if ((metrics.sedentaryMinutes || 0) > 700) {
    alerts.push({ id: "inactive", level: "info", text: `${metrics.sedentaryMinutes} min sentado. Levantate un rato.` });
  }
  if (num(metrics.spo2) != null && metrics.spo2 < 95) {
    alerts.push({ id: "low-spo2", level: "warn", text: `SpO₂ ${metrics.spo2}%. El reloj lo marcó bajo.` });
  }
  if (num(metrics.battery) != null && metrics.battery < 20) {
    alerts.push({ id: "battery", level: "info", text: `Batería ${metrics.battery}%. Cargá el reloj.` });
  }
  const hour = now.getHours();
  if (hour >= 11 && hour < 21 && (metrics.steps || 0) < 1500) {
    alerts.push({ id: "low-steps", level: "info", text: `Vas ${metrics.steps || 0} pasos. Todavía hay margen.` });
  }
  return alerts.slice(0, 4);
}

export function buildWatchSnapshot(metrics = {}, profile = {}, now = new Date()) {
  const active =
    (metrics.fairlyActiveMinutes || 0) + (metrics.veryActiveMinutes || 0);
  const activityName = metrics.activities?.[0]?.name || metrics.activityType || null;
  const alerts = detectWatchAlerts(metrics, now);
  const measured = (value) => (value == null || value === "" ? null : value);
  return {
    at: now.toISOString(),
    date: metrics.date || null,
    source: metrics.source || "unknown",
    device: {
      name: measured(metrics.deviceName),
      type: measured(metrics.deviceType),
      battery: measured(metrics.battery),
      batteryLabel: measured(metrics.batteryLabel),
      lastSync: measured(metrics.lastSync),
    },
    heart: {
      current: measured(metrics.currentHeartRate),
      resting: measured(metrics.restingHeartRate),
      zones: (metrics.heartZones || []).map((z) => ({
        name: z.name,
        minutes: z.minutes || 0,
        min: z.min,
        max: z.max,
      })),
    },
    movement: {
      steps: metrics.steps || 0,
      stepsGoal: Number(profile.stepsGoal) || 10000,
      distanceKm: measured(metrics.distanceKm),
      floors: metrics.floors || 0,
      calories: metrics.calories || 0,
      caloriesBmr: measured(metrics.caloriesBmr),
      activeMinutes: active,
      lightlyActiveMinutes: metrics.lightlyActiveMinutes || 0,
      sedentaryMinutes: metrics.sedentaryMinutes || 0,
      azm: {
        total: metrics.azmTotal || 0,
        fat: metrics.azmFat || 0,
        cardio: metrics.azmCardio || 0,
        peak: metrics.azmPeak || 0,
      },
    },
    sleep: {
      minutes: metrics.sleepMinutes || 0,
      timeInBed: metrics.timeInBed || 0,
      efficiency: measured(metrics.sleepEfficiency),
      deep: metrics.deepMinutes || 0,
      rem: metrics.remMinutes || 0,
      light: metrics.lightMinutes || 0,
      awake: metrics.awakeMinutes || 0,
      awakenings: metrics.awakenings || 0,
      start: measured(metrics.sleepStart),
      end: measured(metrics.sleepEnd),
    },
    recovery: {
      hrvRmssd: measured(metrics.hrvRmssd),
      spo2: measured(metrics.spo2),
      spo2Min: measured(metrics.spo2Min),
      spo2Max: measured(metrics.spo2Max),
      skinTemp: measured(metrics.skinTemp),
      breathingRate: measured(metrics.breathingRate),
      vo2Max: measured(metrics.vo2Max),
    },
    activity: {
      type: activityName,
      list: (metrics.activities || []).slice(0, 4).map((a) => ({
        name: a.name,
        minutes: a.duration || a.minutes,
        calories: a.calories,
        steps: a.steps,
      })),
    },
    waterMl: measured(metrics.waterMl) || 0,
    alerts,
    missing: missingSensors(metrics),
  };
}

export function missingSensors(metrics = {}) {
  const missing = [];
  if (metrics.currentHeartRate == null) missing.push("fc_actual");
  if (metrics.hrvRmssd == null) missing.push("hrv");
  if (metrics.spo2 == null) missing.push("spo2");
  if (metrics.breathingRate == null) missing.push("respiracion");
  if (metrics.battery == null) missing.push("bateria");
  if (metrics.lastSync == null) missing.push("sync");
  if (metrics.vo2Max == null) missing.push("vo2");
  if (!(metrics.sleepMinutes > 0)) missing.push("sueno");
  return missing;
}

function zoneLine(metrics) {
  const zones = metrics.heartZones || [];
  if (!zones.length) return "";
  const fat = zones.find((z) => /fat/i.test(z.name));
  const cardio = zones.find((z) => /cardio/i.test(z.name));
  const peak = zones.find((z) => /peak/i.test(z.name));
  const bits = [];
  if (fat) bits.push(`fat ${fat.minutes || 0}m`);
  if (cardio) bits.push(`cardio ${cardio.minutes || 0}m`);
  if (peak) bits.push(`peak ${peak.minutes || 0}m`);
  return bits.join(", ");
}

export function localWatchReply(questionId, metrics = {}, profile = {}, now = new Date()) {
  const snapshot = buildWatchSnapshot(metrics, profile, now);
  const q = WATCH_QUESTIONS.find((item) => item.id === questionId)?.id || "como-vengo";
  const rhr = snapshot.heart.resting;
  const current = snapshot.heart.current;
  const steps = snapshot.movement.steps;
  const goal = snapshot.movement.stepsGoal;
  let watch = "";
  let title = "Lumen";

  if (q === "fc") {
    title = "Ritmo";
    const bits = [];
    if (current != null) bits.push(`Ahora ${Math.round(current)} lpm`);
    else bits.push("Sin FC en vivo (la Web API no trae el pulso al segundo sin permiso intraday)");
    if (rhr != null) bits.push(`reposo ${rhr}`);
    const zones = zoneLine(metrics);
    if (zones) bits.push(zones);
    watch = bits.join(". ") + ".";
  } else if (q === "pasos") {
    title = "Movimiento";
    watch = `${steps.toLocaleString("es-AR")} pasos (${snapshot.movement.distanceKm ?? "—"} km), ${snapshot.movement.floors} pisos, ${snapshot.movement.calories} kcal, ${snapshot.movement.activeMinutes} min activos.`;
  } else if (q === "sueno") {
    title = "Sueño";
    if (!snapshot.sleep.minutes) {
      watch = "El reloj no mandó sueño de anoche.";
    } else {
      watch = `${minutesToHm(snapshot.sleep.minutes)}, eficiencia ${snapshot.sleep.efficiency ?? "—"}%. Profundo ${snapshot.sleep.deep}m, REM ${snapshot.sleep.rem}m, ${snapshot.sleep.awakenings} despertares.`;
    }
  } else if (q === "estres") {
    title = "Recupero";
    if (snapshot.recovery.hrvRmssd == null && rhr == null) {
      watch = "No hay HRV ni FC en reposo en estos datos.";
    } else {
      const hrv = snapshot.recovery.hrvRmssd;
      const vibe = hrv == null ? "sin HRV" : hrv >= 40 ? "holgado" : hrv >= 28 ? "justo" : "cargado";
      watch = `HRV ${hrv ?? "—"} ms, FC reposo ${rhr ?? "—"}. El reloj te ve ${vibe}.`;
    }
  } else if (q === "oxigeno") {
    title = "SpO2";
    if (snapshot.recovery.spo2 == null && snapshot.recovery.breathingRate == null) {
      watch = "Este día no trae SpO₂ ni respiración. En Fitbit real hace falta el scope oxygen_saturation.";
    } else {
      const bits = [];
      if (snapshot.recovery.spo2 != null) bits.push(`SpO₂ ${snapshot.recovery.spo2}%`);
      if (snapshot.recovery.breathingRate != null) bits.push(`resp ${snapshot.recovery.breathingRate}/min`);
      watch = bits.join(", ") + ".";
    }
  } else if (q === "bateria") {
    title = "Reloj";
    const bat = snapshot.device.battery;
    const sync = snapshot.device.lastSync ? snapshot.device.lastSync.slice(11, 16) : "—";
    const act = snapshot.activity.type || "sin actividad abierta";
    watch = `${snapshot.device.name || "Fitbit"} ${bat != null ? `${bat}%` : "sin batería en API"}. Sync ${sync}. Ahora: ${act}.`;
  } else if (q === "alertas") {
    title = "Alertas";
    watch = snapshot.alerts.length
      ? snapshot.alerts.map((a) => a.text).join(" ")
      : "Nada raro. FC, sueño y movimiento dentro de lo esperado.";
  } else {
    title = "Hoy";
    const parts = [`${steps.toLocaleString("es-AR")}/${goal.toLocaleString("es-AR")} pasos`];
    if (rhr != null) parts.push(`FC ${current ?? rhr}`);
    if (snapshot.sleep.minutes) parts.push(`sueño ${minutesToHm(snapshot.sleep.minutes)}`);
    if (snapshot.recovery.hrvRmssd != null) parts.push(`HRV ${Math.round(snapshot.recovery.hrvRmssd)}`);
    if (snapshot.alerts[0]) parts.push(snapshot.alerts[0].text);
    watch = parts.join(". ") + ".";
  }

  return {
    watch: clipWatchText(watch),
    title: clipWatchText(title, 18),
    engine: "local",
    snapshot,
  };
}
