import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGestureRecognizer, nextScreen, swipeDirection } from '../shared/gestures.js';
import { blobInArena, createBlobState, stepBlob } from '../shared/physics.js';

describe('gestures', () => {
  it('classifies a short tap', () => {
    const g = createGestureRecognizer();
    g.pointerDown({ x: 10, y: 10 }, 1000);
    const result = g.pointerUp({ x: 12, y: 11 }, 1100);
    assert.equal(result.type, 'tap');
  });

  it('classifies a swipe left', () => {
    const g = createGestureRecognizer();
    g.pointerDown({ x: 80, y: 40 }, 1000);
    const result = g.pointerUp({ x: 10, y: 42 }, 1180);
    assert.equal(result.type, 'swipe');
    assert.equal(result.dir, 'left');
  });

  it('classifies double tap', () => {
    const g = createGestureRecognizer();
    g.pointerDown({ x: 0, y: 0 }, 1000);
    g.pointerUp({ x: 0, y: 0 }, 1080);
    g.pointerDown({ x: 1, y: 1 }, 1200);
    const result = g.pointerUp({ x: 2, y: 1 }, 1280);
    assert.equal(result.type, 'doubletap');
  });

  it('fires longpress after the delay', async () => {
    const seen = [];
    const g = createGestureRecognizer({ longPressMs: 25 });
    g.setHandler((ev) => seen.push(ev.type));
    g.pointerDown({ x: 0, y: 0 }, Date.now());
    await new Promise((r) => setTimeout(r, 40));
    assert.ok(seen.includes('longpress'));
    g.pointerCancel();
  });

  it('cycles screens', () => {
    const screens = ['gemma', 'clock', 'stats'];
    assert.equal(nextScreen('gemma', 'left', screens), 'clock');
    assert.equal(nextScreen('gemma', 'right', screens), 'stats');
    assert.equal(swipeDirection(40, 2), 'right');
  });
});

describe('physics', () => {
  it('keeps the blob inside the arena after many steps', () => {
    let state = createBlobState();
    const arenaR = 120;
    const blobR = 50;
    for (let i = 0; i < 240; i++) {
      state = stepBlob(state, 1 / 60, { arenaR, blobR, bounce: 0.8 });
    }
    assert.equal(blobInArena(state, arenaR, blobR), true);
  });
});
