/** Coach profundo: noticing, historia de 4 semanas, relato local con números de Fitbit. */

import { CHARACTER, getCharacterSummary, listCharacterDays } from "./character.js";
import { fitnessMode, normalizeMode } from "./fitness.js";

function hm(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

function pickDay(d) {
  return {
    date: d.date,
    weekday: d.weekday,
    kind: d.kind,
    log: d.log,
    steps: d.metrics.steps,
    sleepMinutes: d.metrics.sleepMinutes,
    hrv: d.metrics.hrvRmssd,
    rhr: d.metrics.restingHeartRate,
  };
}

/** Promedios, tendencias, peor noche, mesas, diarios — para el prompt del agente. */
export function characterSummary() {
  const base = getCharacterSummary();
  const days = listCharacterDays();
  if (base.lastLogs?.length) {
    return { nickname: CHARACTER.nickname, barrio: CHARACTER.barrio, faculty: CHARACTER.faculty, ...base };
  }
  const avgOf = (list, fn) => (list.length ? Math.round(list.reduce((a, d) => a + (fn(d) || 0), 0) / list.length) : 0);
  const worstSleep = days.reduce((a, d) => (d.metrics.sleepMinutes < a.metrics.sleepMinutes ? d : a));
  const worstHrv = days.reduce((a, d) => (d.metrics.hrvRmssd < a.metrics.hrvRmssd ? d : a));
  const bestSteps = days.reduce((a, d) => (d.metrics.steps > a.metrics.steps ? d : a));
  const mesas = days.filter((d) => d.kind === "exam");
  let gymStreak = 0;
  let run = 0;
  for (const d of days) {
    if (d.kind === "gym" || d.kind === "futbol") {
      run += 1;
      gymStreak = Math.max(gymStreak, run);
    } else {
      run = 0;
    }
  }
  const thisWeek = base.thisWeek;
  const lastWeek = base.lastWeek;
  return {
    ...base,
    nickname: CHARACTER.nickname,
    name: CHARACTER.name,
    barrio: CHARACTER.barrio,
    faculty: CHARACTER.faculty,
    device: CHARACTER.device,
    goal: CHARACTER.goal,
    gymStreak,
    vsLastWeek: {
      steps: (thisWeek?.avgSteps || 0) - (lastWeek?.avgSteps || 0),
      sleep: (thisWeek?.avgSleep || 0) - (lastWeek?.avgSleep || 0),
      hrv: (thisWeek?.avgHrv || 0) - (lastWeek?.avgHrv || 0),
    },
    worstSleepNight: pickDay(worstSleep),
    worstHrvNight: pickDay(worstHrv),
    bestStepsDay: pickDay(bestSteps),
    mesasWeek: {
      from: mesas[0]?.date,
      to: mesas.at(-1)?.date,
      nights: mesas.length,
      avgSteps: avgOf(mesas, (d) => d.metrics.steps),
      avgSleep: avgOf(mesas, (d) => d.metrics.sleepMinutes),
      avgHrv: avgOf(mesas, (d) => d.metrics.hrvRmssd),
      logs: mesas.map((d) => ({ date: d.date, log: d.log, hrv: d.metrics.hrvRmssd, sleepMinutes: d.metrics.sleepMinutes })),
    },
    lastLogs: days.slice(-7).map(pickDay),
    notableDays: [pickDay(worstSleep), pickDay(worstHrv), pickDay(bestSteps)].filter(
      (d, i, all) => all.findIndex((x) => x.date === d.date) === i
    ),
  };
}

function weekAverages(metrics = {}) {
  const week = metrics.week || [];
  if (!week.length) return null;
  const n = week.length;
  const avg = (key) => Math.round(week.reduce((a, d) => a + (d[key] || 0), 0) / n);
  return { avgSteps: avg("steps"), avgSleep: avg("sleepMinutes"), avgHrv: avg("hrv") };
}

function historyAverages(metrics, character) {
  if (character?.avgHrv) {
    return {
      avgSteps: character.avgSteps,
      avgSleep: character.avgSleepMinutes,
      avgHrv: character.avgHrv,
      avgRhr: character.avgRhr,
      label: "tu promedio de 4 semanas",
    };
  }
  const week = weekAverages(metrics);
  if (!week) return null;
  return { ...week, label: "tu promedio de la semana" };
}

function fieldForKind(kind) {
  if (kind === "sueno") return "sleepMinutes";
  if (kind === "movimiento") return "steps";
  if (kind === "recuperacion" || kind === "energia") return "hrv";
  if (kind === "fitness") return "azm";
  if (kind === "wellness") return "waterMl";
  if (kind === "foco") return "sleepMinutes";
  return "steps";
}

function citeForField(field, metrics = {}, goals = {}) {
  const hrv = metrics.hrvRmssd != null ? `${Math.round(metrics.hrvRmssd)} ms` : null;
  const rhr = metrics.restingHeartRate != null ? `${metrics.restingHeartRate} lpm` : null;
  if (field === "sleepMinutes" || field === "deepMinutes") {
    return `anoche ${hm(metrics.sleepMinutes)}, ${metrics.deepMinutes || 0} min de profundo (meta ${goals.sleepHours || 7.5}h)`;
  }
  if (field === "hrv" || field === "hrvRmssd") return hrv ? `HRV ${hrv}` : rhr;
  if (field === "restingHeartRate") return rhr;
  if (field === "steps" || field === "sedentaryMinutes") {
    return `${(metrics.steps || 0).toLocaleString("es-AR")} pasos · ${metrics.sedentaryMinutes || 0} min sentado`;
  }
  if (field === "azm" || field === "azmTotal") {
    return `AZM ${metrics.azmTotal || 0} min (fat ${metrics.azmFat || 0} · cardio ${metrics.azmCardio || 0} · peak ${metrics.azmPeak || 0})`;
  }
  if (field === "waterMl") return `${metrics.waterMl || 0} ml de agua`;
  if (field === "spo2") return `SpO₂ ${metrics.spo2 ?? "—"}%`;
  if (field === "skinTemp") return `temp. de piel ${metrics.skinTemp ?? "—"} °C`;
  return citeForField("steps", metrics, goals);
}

function stampPlanWhy(plan, metrics, goals) {
  return (plan || []).map((step) => {
    const fitbitField = step.fitbitField || fieldForKind(step.kind);
    const cite = citeForField(fitbitField, metrics, goals);
    const why = step.why || "";
    const stamped = /\d/.test(why) ? why : `${why} (${cite}).`;
    return { ...step, why: stamped, from: step.from || "local", fitbitField };
  });
}

function depleted(scores = {}) {
  return (scores.sleep || 0) < 52 || (scores.recovery || 0) < 52;
}

export function buildNoticing(metrics = {}, analysis = {}, extras = {}) {
  const goals = analysis.goals || { sleepHours: extras.profile?.sleepGoal || 7.5, steps: extras.profile?.stepsGoal || 10000 };
  const mode = normalizeMode(analysis.mode || extras.profile?.mode);
  const history = historyAverages(metrics, extras.character || extras.history);
  const items = [];
  const push = (text, fitbitField, cite) => {
    if (!text) return;
    items.push({ text, fitbitField, cite: cite || "" });
  };

  const sleepHm = hm(metrics.sleepMinutes);
  push(
    `Anoche ${sleepHm}, ${metrics.deepMinutes || 0} min de profundo y ${metrics.remMinutes || 0} min de REM — tu meta es ${goals.sleepHours}h. Eficiencia ${Math.round(metrics.sleepEfficiency || 0)}%, ${metrics.awakenings || 0} despertares.`,
    "sleepMinutes",
    sleepHm
  );

  if (metrics.hrvRmssd != null) {
    const now = `${Math.round(metrics.hrvRmssd)} ms`;
    if (history?.avgHrv) {
      const verb = metrics.hrvRmssd < history.avgHrv - 3 ? "bajó a" : metrics.hrvRmssd > history.avgHrv + 3 ? "subió a" : "está en";
      push(
        `Tu HRV ${verb} ${now} vs ${history.avgHrv} ms de ${history.label}. FC en reposo ${metrics.restingHeartRate ?? "—"} lpm.`,
        "hrv",
        now
      );
    } else {
      push(`HRV ${now} · FC en reposo ${metrics.restingHeartRate ?? "—"} lpm.`, "hrv", now);
    }
  } else if (metrics.restingHeartRate) {
    push(`FC en reposo ${metrics.restingHeartRate} lpm.`, "restingHeartRate", `${metrics.restingHeartRate} lpm`);
  }

  const stepCite = (metrics.steps || 0).toLocaleString("es-AR");
  const stepGoal = goals.steps || 10000;
  push(
    `Vas ${stepCite} de ${stepGoal.toLocaleString("es-AR")} pasos · ${metrics.sedentaryMinutes || 0} min sentado · ${metrics.distanceKm || 0} km.`,
    "steps",
    stepCite
  );

  if (mode === "sleep") {
    push(
      `Etapas de sueño: profundo ${metrics.deepMinutes || 0} min, ligero ${metrics.lightMinutes || 0} min, despierto ${metrics.awakeMinutes || 0} min. En cama ${hm(metrics.timeInBed)}.`,
      "deepMinutes",
      `${metrics.deepMinutes || 0} min`
    );
  } else if (mode === "fitness") {
    push(
      `AZM ${metrics.azmTotal || 0} min (fat burn ${metrics.azmFat || 0} · cardio ${metrics.azmCardio || 0} · peak ${metrics.azmPeak || 0}). Very active ${metrics.veryActiveMinutes || 0} min.`,
      "azm",
      `${metrics.azmTotal || 0} min`
    );
  } else if (mode === "recovery") {
    push(
      `Recupero: SpO₂ ${metrics.spo2 ?? "—"}% · temp. de piel ${metrics.skinTemp ?? "—"} °C · ${metrics.waterMl || 0} ml de agua.`,
      "spo2",
      `${metrics.spo2 ?? "—"}%`
    );
  } else if (mode === "focus") {
    push(
      `Sedentarismo ${metrics.sedentaryMinutes || 0} min. Con ${sleepHm} de sueño, los bloques UNC tienen que ser cortos y limpios.`,
      "sedentaryMinutes",
      `${metrics.sedentaryMinutes || 0} min`
    );
  } else if (mode === "wellness") {
    push(
      `Agua ${metrics.waterMl || 0} ml · SpO₂ ${metrics.spo2 ?? "—"}%. Hoy no es el 10k: es que el cuerpo se sienta bien.`,
      "waterMl",
      `${metrics.waterMl || 0} ml`
    );
  } else {
    push(
      `Zonas activas ${metrics.azmTotal || 0} min · SpO₂ ${metrics.spo2 ?? "—"}% · agua ${metrics.waterMl || 0} ml.`,
      "azm",
      `${metrics.azmTotal || 0} min`
    );
  }

  const log = metrics.log || metrics.story || "";
  if (log) {
    const snippet = log.length > 140 ? `${log.slice(0, 137)}…` : log;
    push(`Tu diario: «${snippet}»`, metrics.kind === "exam" ? "sleepMinutes" : "steps", sleepHm);
  }

  const mesas = extras.character?.mesasWeek;
  if (mesas?.avgHrv && metrics.source === "character" && (metrics.kind === "exam" || metrics.kind === "sick")) {
    push(
      `En tu semana de mesas el HRV promedió ${mesas.avgHrv} ms y el sueño ${hm(mesas.avgSleep)}. Hoy no está lejos de ese piso.`,
      "hrv",
      `${mesas.avgHrv} ms`
    );
  }

  return items.slice(0, 6);
}

export function buildBecause(metrics = {}, analysis = {}, extras = {}) {
  const links = [];
  const sleepHm = hm(metrics.sleepMinutes);
  const hrv = metrics.hrvRmssd != null ? Math.round(metrics.hrvRmssd) : null;
  const mode = normalizeMode(analysis.mode);
  if ((metrics.sleepMinutes || 0) < 390) {
    links.push(`Dormiste ${sleepHm} con ${metrics.deepMinutes || 0} min de profundo → nada de HIIT ni PR: el plan empuja a cama, no a volumen.`);
  }
  if (hrv != null && hrv < 28) {
    links.push(`HRV ${hrv} ms y FC ${metrics.restingHeartRate ?? "—"} lpm → estímulo suave / zona 2. El sistema nervioso está cargado.`);
  }
  if ((metrics.steps || 0) < 5000 && (metrics.sedentaryMinutes || 0) > 600) {
    links.push(`${(metrics.steps || 0).toLocaleString("es-AR")} pasos y ${metrics.sedentaryMinutes} min sentado → caminatas cortas entre bloques, no persigas el 10k de noche.`);
  }
  if (mode === "sleep") {
    links.push(`Modo sueño: con eficiencia ${Math.round(metrics.sleepEfficiency || 0)}% y ${metrics.awakenings || 0} despertares, el ROI es corte de cafeína y apagado.`);
  }
  if (mode === "fitness" && !depleted(analysis.scores || {})) {
    links.push(`AZM ${metrics.azmTotal || 0} min y HRV ${hrv ?? "—"} ms: hay margen para un estímulo (fuerza o intervalos), sin ir al fallo.`);
  }
  if ((metrics.waterMl || 0) < 1500) {
    links.push(`Vas ${metrics.waterMl || 0} ml de agua → un vaso ahora; la fatiga de la tarde muchas veces es sed.`);
  }
  if (!links.length) {
    links.push(`Con ${sleepHm} y ${(metrics.steps || 0).toLocaleString("es-AR")} pasos, el mejor día es sostener el ritmo, no forzar un extra heroico.`);
  }
  return links.slice(0, 5);
}

function buildDayStory(metrics = {}, analysis = {}, extras = {}, energyWindow = "") {
  const profile = extras.profile || analysis.profile || {};
  const name = profile.nickname || profile.name || "Nacho";
  const character = extras.character || extras.history;
  const goals = analysis.goals || { sleepHours: profile.sleepGoal || 7.5, steps: profile.stepsGoal || 10000 };
  const barrio = profile.barrio || character?.barrio || "Córdoba";
  const log = metrics.log || metrics.story || "";
  const history = historyAverages(metrics, character);
  const sleepHm = hm(metrics.sleepMinutes);
  const hrv = metrics.hrvRmssd != null ? `${Math.round(metrics.hrvRmssd)} ms` : "sin HRV";
  const mode = normalizeMode(analysis.mode);
  const hrvBit = history?.avgHrv ? `HRV ${hrv} (${history.label}: ${history.avgHrv} ms)` : `HRV ${hrv}`;

  const p1 = `${name}, el Charge 6 no te está mintiendo. Anoche dormiste ${sleepHm} — tu meta son ${goals.sleepHours}h — con ${metrics.deepMinutes || 0} min de profundo, ${metrics.remMinutes || 0} de REM y ${metrics.awakenings || 0} despertares (eficiencia ${Math.round(metrics.sleepEfficiency || 0)}%). ${hrvBit}. FC en reposo ${metrics.restingHeartRate ?? "—"} lpm.`;
  const p2 = log
    ? `Tu diario de hoy: «${log}». En ${barrio} eso se siente en el cuerpo. Hoy vas ${(metrics.steps || 0).toLocaleString("es-AR")} pasos, ${metrics.sedentaryMinutes || 0} min sentado, AZM ${metrics.azmTotal || 0} min y ${metrics.waterMl || 0} ml de agua.`
    : `Hoy vas ${(metrics.steps || 0).toLocaleString("es-AR")} de ${(goals.steps || 10000).toLocaleString("es-AR")} pasos en ${barrio}. ${metrics.sedentaryMinutes || 0} min sentado, AZM ${metrics.azmTotal || 0} min, SpO₂ ${metrics.spo2 ?? "—"}%, agua ${metrics.waterMl || 0} ml.`;

  let p3;
  if (mode === "sleep") {
    p3 = `Modo sueño: todo empuja a una noche larga. Con ${sleepHm} y apenas ${metrics.deepMinutes || 0} min de profundo, el café tarde y las pantallas te van a cobrar esta noche. Corte de cafeína, luz cálida, apagado.`;
  } else if (mode === "fitness") {
    p3 = depleted(analysis.scores || {})
      ? `Modo fitness, pero hoy no machacás. Con HRV ${hrv} y ${sleepHm} de sueño, el estímulo es zona 2, técnica o movilidad. El volumen espera.`
      : `Modo fitness: AZM ${metrics.azmTotal || 0} min (cardio ${metrics.azmCardio || 0}, peak ${metrics.azmPeak || 0}) y el HRV da margen. Hacé el estímulo ahora, no un gym a las 21.`;
  } else if (mode === "recovery") {
    p3 = `Modo recupero: nada de HIIT. SpO₂ ${metrics.spo2 ?? "—"}% y temp. de piel ${metrics.skinTemp ?? "—"} °C. Caminata fácil, agua, movilidad. El mejor entrenamiento es no pelearte con el cuerpo.`;
  } else if (mode === "focus") {
    p3 = `Modo foco UNC: con ${sleepHm} el cerebro no está para cinco materias a la vez. Un bloque de 50–75 min y 5–8 min de movimiento (escalera o manzana). Protegé el sueño porque mañana también hay que pensar.`;
  } else if (mode === "wellness") {
    p3 = `Modo wellness: que el día se sienta bien, no más heroico. Aire en ${barrio}, un vaso de agua y 10 min de movilidad. Olvidate del 10k si el reloj pide calma.`;
  } else if ((analysis.scores?.sleep || 0) < 52 || (analysis.scores?.recovery || 0) < 52) {
    p3 = `El cuello de botella es recuperar. En Córdoba, con este combo, el mejor estímulo no es el gym: es bajar RPM y no pelearte con el reloj. ${energyWindow}`.trim();
  } else {
    p3 = `Hay margen real. Con dos o tres movimientos puntuales —un bloque de ${profile.focus || "estudio"}, una caminata y apagar a tiempo— este día sube de nivel.`;
  }

  const mesas = character?.mesasWeek;
  const p4 =
    metrics.source === "character" && mesas?.avgHrv
      ? `En tus 4 semanas el promedio es ${character.avgSteps?.toLocaleString("es-AR")} pasos y HRV ${character.avgHrv} ms. La semana de mesas te dejó el sueño en ${hm(mesas.avgSleep)} y el HRV en ${mesas.avgHrv} ms. Hoy el plan es de esta persona, no de un usuario genérico.`
      : `Esta lectura la arma el motor local de Lumen con tus números exactos. Con NVIDIA NIM el relato se pone todavía más fino; los datos ya son los tuyos.`;

  return [p1, p2, p3, p4].join("\n\n");
}

function buildTonight(metrics = {}, profile = {}, analysis = {}) {
  const bedtime = profile.bedtime || "23:15";
  const sleepHm = hm(metrics.sleepMinutes);
  const goal = profile.sleepGoal || analysis.goals?.sleepHours || 7.5;
  return `Apagá a las ${bedtime}. Objetivo ${goal}h (anoche fueron ${sleepHm}, ${metrics.deepMinutes || 0} min de profundo). Celular fuera de la cama, luz cálida, sin un último scroll.`;
}

function buildTradeoff(metrics = {}, analysis = {}, extras = {}) {
  const name = extras.profile?.nickname || extras.profile?.name || "vos";
  const sleepHm = hm(metrics.sleepMinutes);
  const hrv = metrics.hrvRmssd != null ? `${Math.round(metrics.hrvRmssd)} ms` : null;
  if ((metrics.sleepMinutes || 0) < 360 || (metrics.hrvRmssd || 99) < 25) {
    return `Si ${name} te quedás hasta las 1:00, mañana el HRV sigue en ${hrv || "el piso"} y el sueño no se recupera con un café. Hoy el ROI es dormir, no un último bloque.`;
  }
  if ((metrics.steps || 0) < 4000) {
    return `Si no te movés ahora, cerrás el día en ${(metrics.steps || 0).toLocaleString("es-AR")} pasos y ${metrics.sedentaryMinutes || 0} min sentado. Una vuelta de 15 min cambia el número; un gym a las 21 no.`;
  }
  return `Si ignorás el apagado, ${sleepHm} de anoche se convierte en otra noche corta. El Charge 6 lo va a volver a contar mañana.`;
}

export function buildDeepNarrative(analysis = {}, metrics = {}, extras = {}, energyWindow = "") {
  const spec = fitnessMode(analysis.mode);
  const profile = extras.profile || analysis.profile || {};
  const packed = { ...extras, profile };
  return {
    headline: analysis.headline,
    noticing: buildNoticing(metrics, analysis, packed),
    because: buildBecause(metrics, analysis, packed),
    dayStory: buildDayStory(metrics, analysis, packed, energyWindow),
    energyWindow,
    closing: spec.localClosing,
    plan: stampPlanWhy(analysis.plan || [], metrics, analysis.goals || {}),
    watchouts: analysis.watchouts,
    tonight: buildTonight(metrics, profile, analysis),
    tradeoff: buildTradeoff(metrics, analysis, packed),
    mode: spec.id,
    engine: "local",
  };
}
