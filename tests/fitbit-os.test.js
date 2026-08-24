import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createClock } from '../shared/fitbit-os/clock.js';
import { createVibration, VIBRATION_PATTERNS } from '../shared/fitbit-os/haptics.js';
import { createUserActivity } from '../shared/fitbit-os/user-activity.js';
import { parseHeartRateMeasurement } from '../shared/fitbit-os/heart-rate.js';
import { me } from '../shared/fitbit-os/device.js';
import { createFitbitDevice } from '../shared/fitbit-os/index.js';

describe('Fitbit Device API polyfill', () => {
  it('identifies a Sense 2 (rhea) 336×336', () => {
    assert.equal(me.modelName, 'Sense 2');
    assert.equal(me.modelId, 'rhea');
    assert.equal(me.screen.width, 336);
    assert.equal(me.screen.height, 336);
  });

  it('clock tick respects granularity', async () => {
    const clock = createClock();
    const dates = [];
    clock.addEventListener('tick', (e) => dates.push(e.date));
    clock.granularity = 'seconds';
    assert.ok(dates.length >= 1);
    clock.stop();
  });

  it('exposes official haptic pattern names', () => {
    const fired = [];
    const vibration = createVibration({ vibrate: (seq) => fired.push(seq) });
    assert.equal(vibration.start('confirmation'), 'confirmation');
    assert.deepEqual(fired[0], VIBRATION_PATTERNS.confirmation);
  });

  it('ingests Fitbit Web API activity summaries', () => {
    const activity = createUserActivity();
    activity.ingestFitbitSummary({
      steps: 8123,
      caloriesOut: 1902,
      floors: 12,
      distances: [{ activity: 'total', distance: 6.1 }],
      activeZoneMinutes: 22,
    });
    assert.equal(activity.today.adjusted.steps, 8123);
    assert.equal(activity.today.adjusted.calories, 1902);
    assert.equal(activity.today.adjusted.activeZoneMinutes.total, 22);
    assert.equal(activity.goals.steps, 10000);
  });

  it('parses BLE heart-rate GATT payloads', () => {
    const eight = new DataView(new Uint8Array([0x00, 72]).buffer);
    assert.equal(parseHeartRateMeasurement(eight), 72);
    const sixteen = new DataView(new Uint8Array([0x01, 0x2c, 0x01]).buffer);
    assert.equal(parseHeartRateMeasurement(sixteen), 300);
  });

  it('starts a device runtime with today.adjusted.steps', () => {
    const device = createFitbitDevice();
    device.start();
    assert.ok(device.today.adjusted.steps > 0);
    assert.equal(device.display.on, true);
    device.vibration.start('nudge');
    assert.equal(device.vibration.lastPattern, 'nudge');
    device.stop();
  });
});
