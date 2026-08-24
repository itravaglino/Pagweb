import { createEmitter } from './events.js';

export function createBodyPresenceSensor() {
  const events = createEmitter();
  let present = true;
  let activated = false;

  return {
    get present() {
      return present;
    },
    get activated() {
      return activated;
    },
    start() {
      activated = true;
    },
    stop() {
      activated = false;
    },
    setPresent(value) {
      const next = Boolean(value);
      if (next === present) return;
      present = next;
      events.emit('reading', { type: 'reading' });
    },
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
  };
}

export class BodyPresenceSensor {
  constructor() {
    return createBodyPresenceSensor();
  }
}
