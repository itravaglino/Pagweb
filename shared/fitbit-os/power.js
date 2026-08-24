import { createEmitter } from './events.js';

export function createBattery({ initial = 76 } = {}) {
  const events = createEmitter();
  let chargeLevel = initial;
  let charging = false;
  let native = null;

  async function bind() {
    if (typeof navigator === 'undefined' || !navigator.getBattery) return;
    try {
      native = await navigator.getBattery();
      chargeLevel = Math.round(native.level * 100);
      charging = native.charging;
      native.addEventListener('levelchange', () => {
        chargeLevel = Math.round(native.level * 100);
        events.emit('change', { type: 'change' });
      });
      native.addEventListener('chargingchange', () => {
        charging = native.charging;
        events.emit('change', { type: 'change' });
      });
    } catch {
      /* Battery Status API blocked */
    }
  }

  return {
    get chargeLevel() {
      return chargeLevel;
    },
    get charging() {
      return charging;
    },
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
    bind,
    drain(amount = 0.02) {
      if (charging) return;
      chargeLevel = Math.max(1, chargeLevel - amount);
    },
  };
}
