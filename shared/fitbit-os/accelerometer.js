import { createEmitter } from './events.js';

export function createAccelerometer({ frequency = 10, onStep } = {}) {
  const events = createEmitter();
  let activated = false;
  let x = 0;
  let y = 0;
  let z = 9.8;
  let handle = null;
  let lastMag = 9.8;
  let cooldown = 0;

  function apply(nx, ny, nz) {
    x = nx;
    y = ny;
    z = nz;
    const mag = Math.hypot(nx, ny, nz);
    const jerk = Math.abs(mag - lastMag);
    lastMag = mag;
    if (cooldown > 0) cooldown -= 1;
    if (jerk > 1.6 && cooldown <= 0) {
      cooldown = Math.round(frequency * 0.35);
      onStep?.();
    }
    events.emit('reading', { type: 'reading' });
  }

  function onMotion(event) {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;
    apply(acc.x || 0, acc.y || 0, acc.z || 0);
  }

  return {
    get activated() {
      return activated;
    },
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get z() {
      return z;
    },
    start() {
      if (activated) return;
      activated = true;
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.addEventListener('devicemotion', onMotion);
      }
    },
    stop() {
      activated = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', onMotion);
      }
      if (handle) clearInterval(handle);
    },
    simulate(nx, ny, nz) {
      apply(nx, ny, nz);
    },
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
  };
}

export class Accelerometer {
  constructor(options) {
    return createAccelerometer(options);
  }
}
