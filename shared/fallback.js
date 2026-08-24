import { formatClock, normalizeText, routeIntent } from './router.js';

const CHAT_LINES = [
  'Soy Gemma, tu bolita del reloj. Pregúntame lo que quieras.',
  'Estoy aquí, rebotando y pensando a la vez. Dime.',
  'Buena pregunta. Desde esta muñeca, yo diría que sí.',
  'Si cupiera un café en el reloj, te lo ofrecería. Mientras, te escucho.',
  'Los bits están de mi lado hoy. ¿Seguimos?',
];

function pick(seed, list) {
  const i = Math.abs(hash(seed)) % list.length;
  return list[i];
}

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

export function demoChatReply(text, now = new Date()) {
  const n = normalizeText(text);
  if (!n) return 'Dime algo, aunque sea un hola.';
  if (/\b(quien eres|como te llamas|que eres|quien es gemma)\b/.test(n)) {
    return 'Soy Gemma, una caricatura circular que vive en tu Fitbit. Hablo con un modelo local cuando hay GPU.';
  }
  if (/\b(como estas|que tal|todo bien)\b/.test(n)) {
    return 'Rebotando a mil. Un poco mareada, muy contenta.';
  }
  if (/\b(hora|que hora)\b/.test(n)) {
    return `Son las ${formatClock(now)}. Ni un minuto tarde.`;
  }
  if (/\b(chiste|broma)\b/.test(n)) {
    return '¿Qué le dice un reloj a otro? Me tienes muy cronometrada.';
  }
  if (/\b(gracias|thank)\b/.test(n)) {
    return 'Para eso estoy. Golpecito en la pantalla cuando me necesites.';
  }
  if (/\b(clima|tiempo|llueve)\b/.test(n)) {
    return 'Desde la muñeca no veo nubes, pero lleva el reloj: si se moja, llueve.';
  }
  if (/\b(pasos|camin)\b/.test(n)) {
    return 'Tus pasos van subiendo. Un par de vueltas más y esta bolita hace una fiesta.';
  }
  if (/\b(ayuda|que puedes|que haces)\b/.test(n)) {
    return 'Puedo poner timers, mostrarte la hora o tus stats, cambiar de cara y charlar un rato.';
  }
  return pick(n, CHAT_LINES);
}

export function demoRoute(text) {
  return routeIntent(text);
}

export async function* streamText(text, delayMs = 12) {
  const words = String(text).split(/(\s+)/);
  for (const word of words) {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    yield word;
  }
}
