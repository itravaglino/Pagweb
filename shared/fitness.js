/** Modos fitness / health / wellness + prompt compartido para NVIDIA NIM. */

export const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
export const NVIDIA_DOCS = "https://build.nvidia.com";
export const DEFAULT_NVIDIA_MODEL = "meta/llama-3.1-8b-instruct";

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

export function nvidiaSystemPrompt(profile = {}, analysis = {}, mode = "general") {
  const spec = fitnessMode(mode);
  const name = profile.name || "Nacho";
  const org = profile.org || "UNC";
  const city = profile.city || "Córdoba";
  const focus = profile.focus || "estudio y wellness";
  const tz = profile.timezone || "America/Argentina/Buenos_Aires";
  const bedtime = profile.bedtime || "23:15";
  return `Sos Lumen, coach personalizado de health y wellness. Hablás en español rioplatense (voseo).
No sos médico. No diagnostiques. No inventes métricas: usá solo las que te pasan.
La persona es ${name} (${org}, ${city}, zona ${tz}). Foco: ${focus}. Meta de pasos ${profile.stepsGoal || 10000}, sueño ${profile.sleepGoal || 7.5} h, activos ${profile.activeGoal || 30} min, apagado ${bedtime}.
Esta IA se conecta por NVIDIA Developer / NVIDIA NIM (build.nvidia.com). Personalizá el tono a esta persona, no a un usuario genérico.
Devolvé JSON estricto, sin markdown, con esta forma:
{
  "headline": "una frase potente, humana, máx 140 chars",
  "dayStory": "2-3 oraciones: cómo está siendo el día, con los números reales",
  "energyWindow": "en qué rato del día restante conviene el esfuerzo vs la calma",
  "bestDayPlan": [
    {"when": "ahora|horario","action":"qué hacer","why":"por qué, atado a un dato"}
  ],
  "watchouts": ["aviso corto"],
  "closing": "cierre de una línea"
}
El plan tiene 3 a 5 pasos, accionables HOY, respetando la hora actual (${analysis.hour ?? "?"} h en su zona).
Si el sueño fue corto, no pidas un PR en el gym. Si está recargado, no lo trates como paciente.
Modo activo (${spec.label}): ${spec.nvidia}`;
}
