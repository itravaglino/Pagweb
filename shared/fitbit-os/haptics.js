/**
 * Fitbit Device API `haptics` vibration patterns.
 * @see https://dev.fitbit.com/build/reference/device-api/haptics/
 */
export const VIBRATION_PATTERNS = {
  bump: [32],
  nudge: [70, 40, 70],
  'nudge-max': [120, 50, 120],
  ping: [24, 40, 24],
  confirmation: [45, 35, 45, 35, 80],
  'confirmation-max': [70, 40, 70, 40, 110],
  alert: [180, 70, 180],
  ring: [280, 140, 280, 140, 280],
};

export function createVibration({ vibrate } = {}) {
  let last = null;
  return {
    get lastPattern() {
      return last;
    },
    start(pattern = 'nudge') {
      const name = VIBRATION_PATTERNS[pattern] ? pattern : 'nudge';
      last = name;
      const seq = VIBRATION_PATTERNS[name];
      const impl =
        vibrate ||
        (typeof navigator !== 'undefined' && navigator.vibrate
          ? (ms) => navigator.vibrate(ms)
          : null);
      impl?.(seq);
      return name;
    },
    stop() {
      last = null;
      const impl =
        vibrate ||
        (typeof navigator !== 'undefined' && navigator.vibrate
          ? (ms) => navigator.vibrate(ms)
          : null);
      impl?.(0);
    },
  };
}

export const vibration = createVibration();
