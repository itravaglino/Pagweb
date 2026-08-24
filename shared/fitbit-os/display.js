import { createEmitter } from './events.js';

export function createDisplay({ autoOffMs = 15000 } = {}) {
  const events = createEmitter();
  let on = true;
  let aodActive = false;
  let brightnessOverride = undefined;
  let autoOff = true;
  let idleTimer = null;

  function emitChange() {
    events.emit('change', { type: 'change' });
  }

  function armIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    if (!autoOff || !on || !autoOffMs) return;
    idleTimer = setTimeout(() => {
      on = false;
      aodActive = true;
      emitChange();
    }, autoOffMs);
  }

  return {
    get on() {
      return on;
    },
    set on(value) {
      const next = Boolean(value);
      if (next === on) {
        if (next) armIdle();
        return;
      }
      on = next;
      if (on) {
        aodActive = false;
        armIdle();
      } else {
        aodActive = true;
        if (idleTimer) clearTimeout(idleTimer);
      }
      emitChange();
    },
    autoOff,
    aodAvailable: true,
    aodAllowed: true,
    get aodActive() {
      return aodActive;
    },
    get brightnessOverride() {
      return brightnessOverride;
    },
    set brightnessOverride(value) {
      brightnessOverride = value == null ? undefined : Math.min(1, Math.max(0, Number(value)));
    },
    poke() {
      this.on = true;
    },
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
    armIdle,
    stop() {
      if (idleTimer) clearTimeout(idleTimer);
    },
  };
}
