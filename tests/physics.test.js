import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { blobInArena, createBlobState, stepBlob } from '../shared/physics.js';

describe('physics', () => {
  it('keeps the blob inside the arena', () => {
    let state = createBlobState();
    for (let i = 0; i < 240; i += 1) {
      state = stepBlob(state, 1 / 60, { arenaR: 118, blobR: 54, bounce: 0.5 });
      assert.ok(blobInArena(state, 118, 54), `left arena at step ${i}`);
    }
  });

  it('tilts and squashes as it moves', () => {
    let state = createBlobState();
    state.vx = 120;
    state.vy = 80;
    state = stepBlob(state, 1 / 30, { arenaR: 118, blobR: 54, bounce: 0.7 });
    assert.ok(Number.isFinite(state.tilt));
    assert.ok(state.squash > 0);
    assert.ok(state.stretch > 0);
  });
});
