export function createEmitter() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (typeof fn !== 'function') return;
      const set = listeners.get(type) || new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    emit(type, event) {
      for (const fn of listeners.get(type) || []) fn(event);
    },
  };
}
