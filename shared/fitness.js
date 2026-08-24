/** Modos fitness / health / wellness + prompt compartido para NVIDIA NIM. */

export const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
export const NVIDIA_DOCS = "https://build.nvidia.com";
export const DEFAULT_NVIDIA_MODEL = "meta/llama-3.1-8b-instruct";
export const NVIDIA_TEMPERATURE = 0.6;
export const NVIDIA_MAX_TOKENS = 1600;

export const NVIDIA_MODELS = [
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "nvidia/llama-3.1-nemotron-nano-8b-v1",
];

export const FITNESS_MODES = {
  general: {
    id: "general",
    label: "Día completo",
    blurb: "Sueño, movimiento, recupero y foco, con las horas que quedan.",
    nvidia:
      "Modo DÍA COMPLETO: armá el mejor día posible equilibrando sueño, movimiento, recupero y foco. Nada de machacar si el HRV o el sueño están bajos.",
    localClosing: "Motor local, modo día completo. Con NVIDIA NIM el relato se pone más personal.",
  },
  fitness: {
    id: "fitness",
    label: "Fitness",
    blurb: "Estímulo, volumen y progresión. Si el HRV o el sueño están bajos, no machacás.",
    nvidia:
      "Modo FITNESS: priorizá estímulo, volumen y progresión (fuerza, zona 2 o intervalos según margen). Si el HRV o el sueño están bajos, NO machacás: técnica, zona 2 o movilidad. Nunca pidas un PR con deuda de sueño.",
    localClosing: "Motor local, modo fitness. Conectá NVIDIA Developer para un plan más afinado.",
  },
  recovery: {
    id: "recovery",
    label: "Recupero",
    blurb: "Bajar inflamación y sistema nervioso. Nada de HIIT.",
    nvidia:
      "Modo RECUPERO: el objetivo es bajar inflamación y sistema nervioso. Nada de HIIT, nada de series al fallo. Caminata fácil, movilidad, hidratación, comida de verdad, siesta corta si cabe.",
    localClosing: "Motor local, modo recupero. Hoy el mejor entrenamiento es no pelearte con el cuerpo.",
  },
  sleep: {
    id: "sleep",
    label: "Sueño",
    blurb: "Todo empuja a una noche larga: cafeína, luz y hora de apagado.",
    nvidia:
      "Modo SUEÑO: todo el plan empuja a una noche larga. Corte de cafeína, luz cálida, menos pantallas, hora de apagado concreta. El movimiento, si hay, es corto y temprano. No pidas gym nocturno.",
    localClosing: "Motor local, modo sueño. Mañana se gana esta noche.",
  },
  focus: {
    id: "focus",
    label: "Foco UNC",
    blurb: "Bloques profundos de estudio. Movimiento corto entre bloques.",
    nvidia:
      "Modo FOCO / ESTUDIO UNC: bloques profundos (50–75 min) para la facultad, sin overtraining. Movimiento corto entre bloques (5–10 min). Protegé el sueño porque mañana también hay que pensar.",
    localClosing: "Motor local, modo foco UNC. Un bloque bien hecho vale más que cinco abiertos.",
  },
  wellness: {
    id: "wellness",
    label: "Wellness",
    blurb: "Ánimo, aire, hidratación y movilidad. Sin obsesionarte con el 10k.",
    nvidia:
      "Modo WELLNESS: salud integral más que performance. Aire libre, hidratación, movilidad, un rato sin pantalla, comida real. No obsesiones con el 10k ni con un PR. El día tiene que sentirse mejor, no más heroico.",
    localClosing: "Motor local, modo wellness. Que el día se sienta bien, no que se vea intenso.",
  },
};

export const FITNESS_MODE_ORDER = ["general", "fitness", "recovery", "sleep", "focus", "wellness"];

export function normalizeMode(mode) {
  return FITNESS_MODES[mode] ? mode : "general";
}

export function fitnessMode(mode) {
  return FITNESS_MODES[normalizeMode(mode)];
}

function hm(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export function compactCharacterHistory(summary) {
  if (!summary) return null;
  return {
    nickname: summary.nickname || "Cami",
    name: summary.name,
    barrio: summary.barrio,
    faculty: summary.faculty,
    device: summary.device,
    from: summary.from,
    to: summary.to,
    days: summary.days,
    goal: summary.goal,
    promedios4semanas: {
      pasos: summary.avgSteps,
      suenoMin: summary.avgSleepMinutes,
      sueno: hm(summary.avgSleepMinutes),
      hrv: summary.avgHrv,
      rhr: summary.avgRhr,
    },
    estaSemana: summary.thisWeek
      ? {
          from: summary.thisWeek.from,
          to: summary.thisWeek.to,
          avgSteps: summary.thisWeek.avgSteps,
          avgSleep: summary.thisWeek.avgSleep,
          avgHrv: summary.thisWeek.avgHrv,
        }
      : null,
    semanaPasada: summary.lastWeek
      ? {
          from: summary.lastWeek.from,
          to: summary.lastWeek.to,
          avgSteps: summary.lastWeek.avgSteps,
          avgSleep: summary.lastWeek.avgSleep,
          avgHrv: summary.lastWeek.avgHrv,
        }
      : null,
    vsSemanaPasada: summary.vsLastWeek,
    peorNocheDeSueno: summary.worstSleepNight,
    peorHrv: summary.worstHrvNight,
    mejorPasos: summary.bestStepsDay,
    semanaMesas: summary.mesasWeek
      ? {
          from: summary.mesasWeek.from,
          to: summary.mesasWeek.to,
          nights: summary.mesasWeek.nights,
          avgSteps: summary.mesasWeek.avgSteps,
          avgSleep: summary.mesasWeek.avgSleep,
          avgHrv: summary.mesasWeek.avgHrv,
        }
      : null,
    rachaGym: summary.gymStreak,
    gymDays: summary.gymDays,
    rachaMeta: summary.streak,
    ultimosDiarios: summary.lastLogs,
    notables: summary.notableDays,
  };
}

export function coachUserPayload({ metrics = {}, profile = {}, analysis = {}, mode = "general", character } = {}) {
  const isCami = /cami/i.test(String(profile.nickname || profile.name || metrics.persona || metrics.source || ""));
  return {
    quien: {
      nombre: profile.nickname || profile.name || "Nacho",
      nombreCompleto: profile.fullName || profile.name,
      org: profile.org || "UNC",
      facultad: profile.faculty || "",
      barrio: profile.barrio || "",
      ciudad: profile.city || "Córdoba",
      foco: profile.focus,
      device: profile.device || "Fitbit Charge 6",
      metas: {
        pasos: profile.stepsGoal || 10000,
        suenoH: profile.sleepGoal || 7.5,
        activosMin: profile.activeGoal || 30,
        apagado: profile.bedtime || "23:15",
      },
      hora: analysis.hour,
      zona: profile.timezone || "America/Argentina/Buenos_Aires",
      esCami: Boolean(isCami || metrics.source === "character"),
    },
    fitbitHoy: {
      date: metrics.date,
      source: metrics.source,
      kind: metrics.kind,
      weekday: metrics.weekday,
      diario: metrics.log || metrics.story || metrics.diario || "",
      sueno: {
        minutos: metrics.sleepMinutes,
        hm: hm(metrics.sleepMinutes),
        enCama: metrics.timeInBed,
        eficiencia: metrics.sleepEfficiency,
        profundoMin: metrics.deepMinutes,
        remMin: metrics.remMinutes,
        ligeroMin: metrics.lightMinutes,
        despiertoMin: metrics.awakeMinutes,
        despertares: metrics.awakenings,
        start: metrics.sleepStart,
        end: metrics.sleepEnd,
        etapas: metrics.sleepStages,
      },
      movimiento: {
        pasos: metrics.steps,
        sedentarioMin: metrics.sedentaryMinutes,
        ligeroMin: metrics.lightlyActiveMinutes,
        fairlyMin: metrics.fairlyActiveMinutes,
        veryMin: metrics.veryActiveMinutes,
        pisos: metrics.floors,
        km: metrics.distanceKm,
        calorias: metrics.calories,
        bmr: metrics.caloriesBmr,
      },
      recupero: {
        rhr: metrics.restingHeartRate,
        hrvRmssd: metrics.hrvRmssd,
        spo2: metrics.spo2,
        skinTemp: metrics.skinTemp,
      },
      azm: {
        total: metrics.azmTotal,
        fat: metrics.azmFat,
        cardio: metrics.azmCardio,
        peak: metrics.azmPeak,
      },
      zonasCardiacas: metrics.heartZones,
      pasosPorHora: metrics.hourlySteps,
      actividades: metrics.activities,
      aguaMl: metrics.waterMl,
      semana: metrics.week,
    },
    archivo4semanasCami: compactCharacterHistory(character),
    analisisLocal: {
      overall: analysis.overall,
      band: analysis.band,
      scores: analysis.scores,
      headline: analysis.headline,
      planBase: analysis.plan,
      watchouts: analysis.watchouts,
      hour: analysis.hour,
      mode: analysis.mode || mode,
    },
  };
}

export function nvidiaSystemPrompt(profile = {}, analysis = {}, mode = "general") {
  const spec = fitnessMode(mode);
  const name = profile.nickname || profile.name || "Nacho";
  const org = profile.org || "UNC";
  const city = profile.city || "Córdoba";
  const barrio = profile.barrio ? `, barrio ${profile.barrio}` : "";
  const focus = profile.focus || "estudio y wellness";
  const tz = profile.timezone || "America/Argentina/Buenos_Aires";
  const bedtime = profile.bedtime || "23:15";
  return `Sos Lumen, el agente de IA de Pagweb. Hablás en español rioplatense (voseo: vos/tenés/hacé). Córdoba, Argentina.
No sos médico. No diagnostiques. NUNCA inventes métricas: citá EXACTAMENTE los números del JSON (pasos, minutos de sueño, HRV en ms, FC, AZM, SpO₂, temp. de piel, etapas).
La persona de HOY es ${name} (${org}${barrio}, ${city}, zona ${tz}). Foco: ${focus}. Meta de pasos ${profile.stepsGoal || 10000}, sueño ${profile.sleepGoal || 7.5} h, activos ${profile.activeGoal || 30} min, apagado ${bedtime}. Device: ${profile.device || "Fitbit Charge 6"}.
Esta lectura la escribe NVIDIA NIM (build.nvidia.com). Tiene que sentirse que leíste EL reloj de ESTA persona, no un template.
Si quien.esCami es true, archivo4semanasCami ES su historial: usá promedios de 4 semanas, vs semana pasada, peor noche, semana de mesas, racha de gym y los últimos diarios. Citá el diario de hoy (fitbitHoy.diario) si viene.
Si NO es Cami (Nacho u otra persona), usá fitbitHoy y fitbitHoy.semana. NO le atribuyas a Nacho los números de Cami; el archivo de Cami es corpus de demo, no su cuerpo.
Devolvé JSON estricto, sin markdown, sin texto fuera del JSON, con ESTA forma:
{
  "headline": "frase personal con el apodo, máx 140 chars",
  "noticing": [
    {"text":"observación concreta que CITA un número exacto","cite":"24 ms","fitbitField":"hrv"}
  ],
  "because": ["vínculo causal métrica → recomendación, con el número"],
  "dayStory": "2 a 4 párrafos separados por \\n\\n. Voseo. Córdoba. Si hay diario, mencionarlo. Números reales.",
  "energyWindow": "en qué rato del día restante conviene el esfuerzo vs la calma",
  "plan": [
    {"when":"ahora|horario","action":"qué hacer","why":"porque + número de Fitbit","from":"nvidia","fitbitField":"sleepMinutes"}
  ],
  "watchouts": ["aviso corto con número si aplica"],
  "tonight": "ritual de esta noche, hora de apagado concreta",
  "tradeoff": "qué se pierde si ignora el plan, atado a una métrica",
  "closing": "cierre de una línea, voseo, con el apodo"
}
noticing: 3 a 6 ítems. fitbitField uno de: sleepMinutes, deepMinutes, hrv, restingHeartRate, steps, sedentaryMinutes, azm, waterMl, spo2, skinTemp.
plan: 3 a 5 pasos HOY. Cada why DEBE citar un número de fitbitHoy. from siempre "nvidia".
Hora actual: ${analysis.hour ?? "?"} h en su zona. Si el sueño fue corto o el HRV está bajo, no pidas un PR.
Modo activo (${spec.label}): ${spec.nvidia}
En modo SUEÑO, noticing y plan hablan de etapas (profundo/REM/ligero), cafeína y apagado.
En modo FITNESS, noticing y plan hablan de AZM, zonas cardíacas y si el HRV da margen.`;
}

export const FITBIT_FIELD_TILE = {
  sleepMinutes: "sleep",
  deepMinutes: "sleep",
  remMinutes: "sleep",
  lightMinutes: "sleep",
  awakeMinutes: "sleep",
  sleepEfficiency: "sleep",
  awakenings: "sleep",
  hrv: "heart",
  hrvRmssd: "heart",
  restingHeartRate: "heart",
  steps: "steps",
  sedentaryMinutes: "steps",
  floors: "steps",
  distanceKm: "steps",
  azm: "azm",
  azmTotal: "azm",
  azmFat: "azm",
  azmCardio: "azm",
  azmPeak: "azm",
  fairlyActiveMinutes: "azm",
  veryActiveMinutes: "azm",
  calories: "cals",
  waterMl: "water",
  spo2: "water",
  skinTemp: "water",
};

export function tileForField(field) {
  return FITBIT_FIELD_TILE[field] || "steps";
}

export function coerceNoticing(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") return { text: item, cite: "", fitbitField: "" };
      const text = item.text || item.observation || item.note || "";
      if (!text) return null;
      return {
        text,
        cite: item.cite || item.metric || "",
        fitbitField: item.fitbitField || item.field || "",
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

export function coercePlan(raw, engine = "local") {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).map((step) => ({
    when: step?.when || "hoy",
    action: step?.action || "",
    why: step?.why || "",
    from: step?.from || engine,
    fitbitField: step?.fitbitField || step?.field || "",
    kind: step?.kind || engine,
  }));
}

export function normalizeCoachNarrative(parsed, local, engine = "local") {
  const noticing = coerceNoticing(parsed?.noticing);
  const because = Array.isArray(parsed?.because) ? parsed.because.filter(Boolean).slice(0, 6) : [];
  const plan = coercePlan(parsed?.plan || parsed?.bestDayPlan, engine);
  return {
    headline: parsed?.headline || local.headline,
    noticing: noticing.length ? noticing : local.noticing,
    because: because.length ? because : local.because,
    dayStory: parsed?.dayStory || local.dayStory,
    energyWindow: parsed?.energyWindow || local.energyWindow,
    plan: plan.length ? plan : local.plan,
    watchouts: Array.isArray(parsed?.watchouts) && parsed.watchouts.length ? parsed.watchouts.slice(0, 4) : local.watchouts,
    tonight: parsed?.tonight || local.tonight,
    tradeoff: parsed?.tradeoff || local.tradeoff,
    closing: parsed?.closing || local.closing,
    mode: parsed?.mode || local.mode,
    engine,
  };
}
