import { createEmitter } from './events.js';

/** BLE GATT Heart Rate Service UUID used by Fitbit and other HRMs. */
export const HEART_RATE_SERVICE = 0x180d;
export const HEART_RATE_MEASUREMENT = 0x2a37;

export function parseHeartRateMeasurement(dataView) {
  const flags = dataView.getUint8(0);
  const hr16 = Boolean(flags & 0x1);
  return hr16 ? dataView.getUint16(1, true) : dataView.getUint8(1);
}

export function createHeartRateSensor({ frequency = 1 } = {}) {
  const events = createEmitter();
  let activated = false;
  let heartRate = null;
  let timestamp = null;
  let timer = null;
  let source = 'simulated';
  let baseline = 68;

  function reading() {
    timestamp = Date.now();
    if (source === 'simulated') {
      const drift = Math.sin(timestamp / 4000) * 4 + (Math.random() - 0.5) * 3;
      heartRate = Math.round(baseline + drift);
    }
    events.emit('reading', { type: 'reading' });
  }

  return {
    get activated() {
      return activated;
    },
    get heartRate() {
      return heartRate;
    },
    get timestamp() {
      return timestamp;
    },
    get source() {
      return source;
    },
    setBaseline(bpm) {
      if (Number.isFinite(bpm) && bpm > 30) baseline = bpm;
    },
    ingestExternal(bpm) {
      source = 'external';
      heartRate = Math.round(bpm);
      timestamp = Date.now();
      events.emit('reading', { type: 'reading' });
    },
    start() {
      if (activated) return;
      activated = true;
      if (source === 'simulated') {
        reading();
        timer = setInterval(reading, Math.max(200, 1000 / frequency));
      }
    },
    stop() {
      activated = false;
      if (timer) clearInterval(timer);
      timer = null;
    },
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
  };
}

export class HeartRateSensor {
  constructor(options) {
    return createHeartRateSensor(options);
  }
}
