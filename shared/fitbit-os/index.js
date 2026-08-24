import { createClock } from './clock.js';
import { createDisplay } from './display.js';
import { createVibration } from './haptics.js';
import { createHeartRateSensor } from './heart-rate.js';
import { createAccelerometer } from './accelerometer.js';
import { createBattery } from './power.js';
import { createUserActivity } from './user-activity.js';
import { createBodyPresenceSensor } from './body-presence.js';
import { me } from './device.js';
import { preferences } from './user-settings.js';

export function createFitbitDevice() {
  const activity = createUserActivity();
  const clock = createClock();
  const display = createDisplay({ autoOffMs: 0 });
  const vibration = createVibration();
  const hrm = createHeartRateSensor({ frequency: 1 });
  const body = createBodyPresenceSensor();
  const battery = createBattery();
  const accel = createAccelerometer({
    frequency: 10,
    onStep: () => {
      if (body.present && display.on) activity.addSteps(1);
    },
  });

  function syncHeartWithPresence() {
    if (body.present && display.on) hrm.start();
    else hrm.stop();
  }

  display.addEventListener('change', syncHeartWithPresence);
  body.addEventListener('reading', syncHeartWithPresence);

  return {
    device: me,
    clock,
    display,
    vibration,
    hrm,
    accel,
    battery,
    today: activity.today,
    goals: activity.goals,
    activity,
    body,
    preferences,
    start() {
      clock.granularity = 'seconds';
      body.start();
      body.setPresent(true);
      battery.bind();
      hrm.start();
      accel.start();
      display.poke();
    },
    stop() {
      clock.stop();
      display.stop();
      hrm.stop();
      accel.stop();
      body.stop();
    },
  };
}

export { me } from './device.js';
export { VIBRATION_PATTERNS } from './haptics.js';
export { HEART_RATE_SERVICE, parseHeartRateMeasurement } from './heart-rate.js';


