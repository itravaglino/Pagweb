export const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';

export const LIGHT_MODEL_FALLBACKS = ['gemma3:1b', 'gemma3:270m', 'gemma3:4b'];
export const CHAT_MODEL_FALLBACKS = ['gemma3:4b', 'gemma3:1b', 'gemma4:latest', 'gemma4'];

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

export function pickOllamaModel(names, preferred, fallbacks = []) {
  const list = Array.isArray(names) ? names.filter(Boolean) : [];
  if (!list.length) return null;
  const lower = list.map(normalizeName);

  const find = (want) => {
    const target = normalizeName(want);
    if (!target) return null;
    const exact = lower.indexOf(target);
    if (exact >= 0) return list[exact];
    const prefix = lower.findIndex((n) => n === target || n.startsWith(`${target}-`) || n.startsWith(`${target}:`));
    if (prefix >= 0) return list[prefix];
    const [family, tag] = target.split(':');
    if (tag) {
      const i = lower.findIndex((n) => n.startsWith(`${family}:`) && n.includes(tag));
      if (i >= 0) return list[i];
    }
    const familyHit = lower.findIndex((n) => n === family || n.startsWith(`${family}:`));
    return familyHit >= 0 ? list[familyHit] : null;
  };

  return find(preferred) || fallbacks.map(find).find(Boolean) || list.find((n) => /^gemma3/i.test(n)) || list[0] || null;
}

export function parseOllamaStreamLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return { text: '', done: false };
  try {
    const json = JSON.parse(raw);
    const text = json.message?.content || json.response || '';
    return { text, done: Boolean(json.done), error: json.error || null };
  } catch {
    return { text: '', done: false };
  }
}
