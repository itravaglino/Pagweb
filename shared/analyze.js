/** Motor local de "mejor día": puntúa métricas estilo Fitbit y arma un plan horario. */

import { fitnessMode, normalizeMode } from "./fitness.js";

export function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function minutesToHm(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${String(r).padStart(2, "0")}m`;
}

export function hourInZone(timeZone = "America/Argentina/Buenos_Aires", date = new Date()) {
  try {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "numeric",
        hour12: false,
      }).format(date)
    );
    return Number.isFinite(hour) ? hour : date.getHours();
  } catch {
    return date.getHours();
  }
}

function scoreSleep(metrics, goals) {
  const hours = (metrics.sleepMinutes || 0) / 60;
  const target = goals.sleepHours || 7.5;
  const duration = clamp(100 - (Math.abs(hours - target) / target) * 110);
  const efficiency = clamp(metrics.sleepEfficiency ?? 85);
  const deep = metrics.deepMinutes ?? 0;
  const deepScore = clamp((deep / 70) * 100);
  const awakenings = metrics.awakenings ?? 0;
  const wakePenalty = clamp(awakenings * 6, 0, 25);
  return clamp(duration * 0.5 + efficiency * 0.3 + deepScore * 0.2 - wakePenalty);
}

function scoreMovement(metrics, goals) {
  const steps = metrics.steps || 0;
  const stepGoal = goals.steps || 10000;
  const stepScore = clamp((steps / stepGoal) * 100);
  const active = (metrics.fairlyActiveMinutes || 0) + (metrics.veryActiveMinutes || 0);
  const activeGoal = goals.activeMinutes || 30;
  const activeScore = clamp((active / activeGoal) * 100);
  const floors = metrics.floors || 0;
  const floorScore = clamp((floors / 10) * 100);
  return clamp(stepScore * 0.62 + activeScore * 0.3 + floorScore * 0.08);
}

function scoreRecovery(metrics) {
  const rhr = metrics.restingHeartRate;
  let rhrScore = 70;
  if (typeof rhr === "number") {
    if (rhr <= 55) rhrScore = 96;
    else if (rhr <= 62) rhrScore = 88;
    else if (rhr <= 70) rhrScore = 74;
    else if (rhr <= 78) rhrScore = 55;
    else rhrScore = 38;
  }
  const hrv = metrics.hrvRmssd;
  let hrvScore = 70;
  if (typeof hrv === "number") {
    if (hrv >= 50) hrvScore = 94;
    else if (hrv >= 40) hrvScore = 82;
    else if (hrv >= 30) hrvScore = 68;
    else if (hrv >= 22) hrvScore = 48;
    else hrvScore = 32;
  }
  return clamp(rhrScore * 0.55 + hrvScore * 0.45);
}

function scoreRhythm(metrics, hour) {
  const sedentary = metrics.sedentaryMinutes || 0;
  const expectedSedentary = hour < 12 ? 180 : hour < 18 ? 360 : 520;
  const sedentaryScore = clamp(100 - Math.max(0, sedentary - expectedSedentary) / 4);
  const calories = metrics.calories || 0;
  const calScore = clamp((calories / 2200) * 100);
  return clamp(sedentaryScore * 0.7 + calScore * 0.3);
}

function bandFor(overall) {
  if (overall >= 82) return { id: "excelente", label: "Día en racha" };
  if (overall >= 68) return { id: "bien", label: "Vas bien" };
  if (overall >= 50) return { id: "ajuste", label: "Con ajustes se arma" };
  return { id: "recuperacion", label: "Priorizá recuperar" };
}

function depleted(scores) {
  return (scores.sleep || 0) < 52 || (scores.recovery || 0) < 52;
}

function headlineFor(scores, overall, hour, mode = "general") {
  const resolved = normalizeMode(mode);
  if (resolved === "fitness") {
    return depleted(scores)
      ? "Modo fitness, pero hoy no machacás: el HRV y el sueño piden estímulo suave."
      : "Modo fitness: hay margen para estímulo, volumen y un poco de progresión.";
  }
  if (resolved === "recovery") {
    return "Modo recupero: nada de HIIT. Hoy se baja inflamación y sistema nervioso.";
  }
  if (resolved === "sleep") {
    return "Modo sueño: todo el plan empuja a una noche larga.";
  }
  if (resolved === "focus") {
    return "Modo foco UNC: bloques profundos y movimiento corto entre medio.";
  }
  if (resolved === "wellness") {
    return "Modo wellness: que el día se sienta bien, no que se vea intenso.";
  }
  if (scores.sleep < 50 && scores.recovery < 55) {
    return hour < 16
      ? "El cuerpo pide suavidad: hoy el mejor día es el que te recarga."
      : "Cerrá el día temprano. Mañana se gana esta noche.";
  }
  if (scores.sleep >= 80 && scores.movement < 45) {
    return "Dormiste bien: tenés energía de sobra para mover el cuerpo.";
  }
  if (scores.movement >= 80 && scores.sleep < 60) {
    return "El cuerpo rindió; el sueño no. Hoy el upgrade es apagar a tiempo.";
  }
  if (overall >= 82) return "Estás en un muy buen punto: sostené el ritmo, no lo fuerces.";
  if (hour >= 20) return "Todavía se puede salvar el día: ritual de baja y cama.";
  return "Hay margen real: con 2 o 3 movimientos puntuales, este día sube de nivel.";
}

function summaryFor(metrics, scores, goals) {
  const sleepH = ((metrics.sleepMinutes || 0) / 60).toFixed(1);
  const bits = [];
  bits.push(`Dormiste ${sleepH} h (objetivo ${goals.sleepHours} h) con eficiencia ${Math.round(metrics.sleepEfficiency || 0)}%.`);
  bits.push(`Vas ${metrics.steps || 0} de ${goals.steps} pasos y ${((metrics.fairlyActiveMinutes || 0) + (metrics.veryActiveMinutes || 0))} min activos.`);
  if (metrics.restingHeartRate) {
    bits.push(`FC en reposo ${metrics.restingHeartRate} lpm${metrics.hrvRmssd ? ` · HRV ${Math.round(metrics.hrvRmssd)} ms` : ""}.`);
  }
  const weak = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
  const labels = { sleep: "el sueño", movement: "el movimiento", recovery: "la recuperación", rhythm: "el ritmo del día" };
  bits.push(`El cuello de botella de hoy es ${labels[weak[0]]}.`);
  return bits.join(" ");
}

function buildPlan(metrics, scores, profile, hour) {
  const stepsLeft = Math.max(0, (profile.stepsGoal || 10000) - (metrics.steps || 0));
  const active =
    (metrics.fairlyActiveMinutes || 0) + (metrics.veryActiveMinutes || 0);
  const sleepHours = (metrics.sleepMinutes || 0) / 60;
  const name = profile.name || "vos";
  const focus = profile.focus || "trabajo";
  const plan = [];

  const push = (when, action, why, kind = "accion") => {
    plan.push({ when, action, why, kind });
  };

  if (hour < 11) {
    if (scores.sleep < 55) {
      push(
        "ahora",
        "Desayuno con proteína y luz de afuera 10 min. Evitá arrancar en pila de café.",
        "Con poco sueño, el cortisol ya está alto: un café gigante te va a estrellar a la siesta.",
        "energia"
      );
      push(
        "mañana",
        `Bloque corto de ${focus} (50 min) y nada de decisiones pesadas hasta mediodía.`,
        "Hoy el cerebro no está en modo peak: protegés calidad, no cantidad.",
        "foco"
      );
    } else {
      push(
        "ahora",
        `Hacé el trabajo más difícil de ${focus} en los próximos 90 min.`,
        "Dormiste decente: esa ventana matinal es tu mejor hardware del día.",
        "foco"
      );
    }
    if (scores.movement < 50) {
      push(
        "10:30",
        "Caminata o tramos de escalera 8–10 min entre tareas.",
        "Rompe el sedentarismo temprano y hace más fácil llegar al objetivo de pasos.",
        "movimiento"
      );
    }
  } else if (hour < 16) {
    if (stepsLeft > 4000) {
      push(
        "ahora",
        "Salí 15–20 min a caminar (llamada o podcast). No lo dejes para la noche.",
        `Te faltan ~${stepsLeft.toLocaleString("es-AR")} pasos; a esta hora todavía hay luz y margen.`,
        "movimiento"
      );
    }
    if (sleepHours < 6.5) {
      push(
        "15:00",
        "Último café. Después, agua o té.",
        "La cafeína tarda ~6 h en bajar a la mitad: si dormiste poco, este corte vale más que cualquier suplemento.",
        "sueno"
      );
      push(
        "14:00",
        "Siesta o quietud 12–18 min, alarma dura. No más.",
        "Recupera alerta sin comerse el sueño de esta noche.",
        "recuperacion"
      );
    } else if (focus) {
      push(
        "ahora",
        `Segundo bloque profundo de ${focus} (75 min) y después movimiento.`,
        "Estás en la meseta de la tarde: un sprint ahora rinde más que alargarlo hasta las 21.",
        "foco"
      );
    }
    if (scores.recovery < 50) {
      push(
        "tarde",
        "Entrenamiento suave (zona 2) o yoga. Nada de HIIT hoy.",
        "FC en reposo/HRV dicen que el sistema está cargado: el mejor estímulo es aeróbico fácil.",
        "recuperacion"
      );
    }
  } else if (hour < 20) {
    const depleted = scores.sleep < 52 || scores.recovery < 52;
    if (depleted) {
      push(
        "ahora",
        "Movimiento mínimo: 8–12 min al aire o estirar. No persigas los pasos.",
        "Con sueño corto o HRV/FC cargados, un cardio largo pelearía con la noche.",
        "recuperacion"
      );
    } else if (stepsLeft > 1500 && stepsLeft < 8000) {
      const mins = Math.min(45, Math.max(12, Math.round(stepsLeft / 100)));
      push(
        "ahora",
        `Caminata de ${mins} min. Es el atajo más limpio para cerrar el movimiento.`,
        "A esta hora una caminata también baja el estrés y prepara el sueño.",
        "movimiento"
      );
    } else if (stepsLeft >= 8000) {
      push(
        "ahora",
        "No persigas el 10k. Hacé 20 min suaves y listo.",
        "Forzar un déficit enorme de pasos a la noche pega contra el sueño. Mañana se recupera.",
        "movimiento"
      );
    }
    if (active < 20 && scores.recovery >= 60) {
      push(
        "18:30",
        "10 min de movilidad o un circuito mínimo (sentadillas, flexiones, plancha).",
        "Cierra el anillo de activos sin meterte en un gym de 90 min.",
        "movimiento"
      );
    }
    push(
      "21:00",
      "Luces cálidas, pantalla más tenue, cena liviana si todavía no comiste.",
      "El mejor día de mañana se fabrica en las 90 min previas a dormir.",
      "sueno"
    );
  } else {
    push(
      "ahora",
      "Modo aterrizaje: ducha tibia, celular fuera de la cama, 4–7–8 o lectura papel.",
      hour >= 23
        ? "Ya es tarde: cada minuto de higiene de sueño rinde más que un último scroll."
        : "Esta ventana decide si mañana arrancás en 80 o en 40.",
      "sueno"
    );
    if (stepsLeft > 2000 && hour < 22) {
      push(
        "antes de las 22",
        "Vueltita de 8–10 min alrededor de la manzana, sin teléfono.",
        "Cierra un poco el movimiento y baja la cabeza sin luz azul.",
        "movimiento"
      );
    }
    const bedtime = profile.bedtime || "23:00";
    push(
      bedtime,
      `Apagado. Objetivo: estar en cama a las ${bedtime}.`,
      sleepHours < 6.5
        ? "Hoy el ROI más alto no es producir más: es dormir más."
        : "Mantener el horario es lo que convierte un buen día en una racha.",
      "sueno"
    );
  }

  if (metrics.waterMl && metrics.waterMl < 1500 && hour < 21) {
    push(
      hour >= 16 ? "ahora" : "durante el día",
      "Llegá a 2 L de agua. Un vaso ahora.",
      "La fatiga de la tarde muchas veces es sed disfrazada.",
      "energia"
    );
  }

  if (plan.length < 3) {
    push(
      "hoy",
      `${name}, elegí UNA cosa de ${focus} que si se cumple, el día ya valió.`,
      "El mejor día no es el más ocupado: es el que cierra el asunto que más pesa.",
      "foco"
    );
  }

  return applyModePlan(plan, metrics, scores, profile, hour).slice(0, 5);
}

function applyModePlan(plan, metrics, scores, profile, hour) {
  const mode = normalizeMode(profile.mode);
  if (mode === "general") return plan;

  const extra = [];
  const push = (when, action, why, kind) => extra.push({ when, action, why, kind });
  const bedtime = profile.bedtime || "23:15";
  const focus = profile.focus || "estudio UNC";
  const tired = depleted(scores);

  if (mode === "fitness") {
    if (tired) {
      push(
        "ahora",
        "Hoy no machacás: zona 2, técnica o movilidad. El volumen espera al HRV y al sueño.",
        "Modo fitness con deuda de recupero: la progresión se pausa, no se fuerza un PR.",
        "fitness"
      );
    } else {
      push(
        hour < 18 ? "ahora" : "si todavía no entrenaste",
        "Sesión de estímulo: fuerza o intervalos, con progresión de volumen (sin ir al fallo).",
        "Modo fitness: hay margen. El estímulo de hoy es el que suma kilos o minutos a la semana.",
        "fitness"
      );
    }
  } else if (mode === "recovery") {
    push(
      "ahora",
      "Nada de HIIT. Caminata fácil, movilidad y respiración 10–15 min.",
      "Modo recupero: el objetivo es bajar inflamación y sistema nervioso, no sumar carga.",
      "recuperacion"
    );
  } else if (mode === "sleep") {
    push(
      hour < 16 ? "ahora" : "ya",
      "Corte de cafeína. Luz cálida de acá en más y hora de apagado concreta.",
      "Modo sueño: todo empuja a una noche larga. Mañana se gana esta noche.",
      "sueno"
    );
    push(
      bedtime,
      `Apagado. Objetivo: estar en cama a las ${bedtime}.`,
      "Si el modo es sueño, el ROI más alto es apagar a tiempo, no un último bloque de trabajo.",
      "sueno"
    );
  } else if (mode === "focus") {
    push(
      "ahora",
      `Bloque profundo UNC de 50–75 min (${focus}). Celular en otro cuarto.`,
      "Modo foco: un bloque bien cerrado rinde más que cinco abiertos.",
      "foco"
    );
    push(
      "entre bloques",
      "Movimiento corto 5–8 min (escalera o vuelta a la manzana). Nada de gym largo.",
      "Entre bloques de estudio, el cuerpo se mueve y la cabeza vuelve.",
      "movimiento"
    );
  } else if (mode === "wellness") {
    push(
      "ahora",
      "Día wellness: aire, un vaso de agua y 10 min de movilidad. Sin obsesionarte con el 10k.",
      "Salud integral: que el día se sienta mejor, no más heroico.",
      "wellness"
    );
  }

  const blob = (step) => `${step.action} ${step.why}`.toLowerCase();
  const rest = plan.filter((step) => {
    if (mode === "recovery" && /hiit|intervalos|pr en el gym|al fallo/.test(blob(step))) return false;
    if (mode === "sleep" && /hiit|gym de 90|intervalos/.test(blob(step))) return false;
    if (mode === "focus" && /hiit/.test(blob(step))) return false;
    return !extra.some((lead) => lead.action === step.action);
  });
  return [...extra, ...rest];
}

function watchouts(metrics, scores) {
  const notes = [];
  if ((metrics.sleepMinutes || 0) < 360) {
    notes.push("Menos de 6 h: no es día para déficits agresivos ni para manejar cansado.");
  }
  if ((metrics.restingHeartRate || 0) >= 75) {
    notes.push("FC en reposo alta: priorizá calorías de verdad, hidratación y no te exijas al máximo.");
  }
  if ((metrics.hrvRmssd || 99) < 25) {
    notes.push("HRV bajo: señal clásica de estrés/carga. Movimiento suave > intensity.");
  }
  if ((metrics.sedentaryMinutes || 0) > 700) {
    notes.push("Muchas horas sentado: levantate 2 min cada 45.");
  }
  if (scores.movement > 90 && scores.sleep < 55) {
    notes.push("Alto output con bajo sueño: es el combo que termina en lesión o bajón mañana.");
  }
  return notes.slice(0, 3);
}

export function analyzeDay(metrics = {}, profile = {}, now = new Date()) {
  const goals = {
    steps: profile.stepsGoal || 10000,
    sleepHours: profile.sleepGoal || 7.5,
    activeMinutes: profile.activeGoal || 30,
  };
  const hour = hourInZone(profile.timezone || "America/Argentina/Buenos_Aires", now);
  const scores = {
    sleep: Math.round(scoreSleep(metrics, goals)),
    movement: Math.round(scoreMovement(metrics, goals)),
    recovery: Math.round(scoreRecovery(metrics)),
    rhythm: Math.round(scoreRhythm(metrics, hour)),
  };
  const overall = Math.round(
    scores.sleep * 0.35 + scores.movement * 0.3 + scores.recovery * 0.25 + scores.rhythm * 0.1
  );
  const band = bandFor(overall);
  const mode = normalizeMode(profile.mode);
  return {
    overall,
    band,
    scores,
    headline: headlineFor(scores, overall, hour, mode),
    summary: summaryFor(metrics, scores, goals),
    plan: buildPlan(metrics, scores, { ...profile, stepsGoal: goals.steps, mode }, hour),
    watchouts: watchouts(metrics, scores),
    hour,
    goals,
    mode,
    generatedAt: now.toISOString(),
  };
}

export function energyWindowFor(hour, scores = {}, mode = "general") {
  const resolved = normalizeMode(mode);
  if (resolved === "sleep") {
    return "Ventana de sueño: corte de cafeína, luz cálida y apagado. El rendimiento de mañana se fabrica ahora.";
  }
  if (resolved === "recovery") {
    return "Ventana de recupero: nada de HIIT. Movimiento fácil y bajar el sistema nervioso.";
  }
  if (resolved === "fitness" && !depleted(scores)) {
    return hour < 18
      ? "Ventana de estímulo: si hay margen, entrená con progresión. Después de las 18, no arranques un gym pesado."
      : "Si todavía no entrenaste, que sea corto. No machacés de noche.";
  }
  if (resolved === "focus") {
    return "Ventana de foco UNC: bloques de 50–75 min y movimiento corto entre medio.";
  }
  if (resolved === "wellness") {
    return "Ventana wellness: aire, agua, movilidad. Sin obsesionarte con el 10k.";
  }
  if ((scores.sleep || 0) < 52 || (scores.recovery || 0) < 52) {
    return hour < 15
      ? "Hasta media tarde: esfuerzo liviano. La ventana de calidad es recuperar, no empujar."
      : "Ya no conviene estimular. La mejor ventana que queda es bajar RPM y dormir más temprano.";
  }
  if (hour < 12) return "Ahora–mediodía: trabajo profundo. Movete 8–10 min entre bloques.";
  if (hour < 17) return "Tarde: segundo sprint + caminata. Después de las 18, no arranques nada pesado.";
  if (hour < 21) return "Cierre del día: movimiento suave y luces cálidas. Nada de HIIT.";
  return "Pasó la ventana de rendimiento. Todo lo que sume ahora es higiene de sueño.";
}

export function localNarrative(analysis) {
  const spec = fitnessMode(analysis.mode);
  return {
    headline: analysis.headline,
    dayStory: analysis.summary,
    energyWindow: energyWindowFor(analysis.hour, analysis.scores, analysis.mode),
    closing: spec.localClosing,
    plan: analysis.plan,
    watchouts: analysis.watchouts,
    mode: spec.id,
  };
}

export function extractJsonObject(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}
