import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expressionFor, normalizeEmotion, EMOTIONS } from '../shared/expressions.js';

describe('expressions', () => {
  it('maps aliases to canonical emotions', () => {
    assert.equal(normalizeEmotion('feliz'), 'happy');
    assert.equal(normalizeEmotion('dormida'), 'sleepy');
    assert.equal(normalizeEmotion('wow'), 'excited');
  });

  it('falls back to idle', () => {
    assert.equal(normalizeEmotion('xyz'), 'idle');
  });

  it('has a face map for every emotion', () => {
    for (const emotion of EMOTIONS) {
      const face = expressionFor(emotion);
      assert.ok(face.eyeWidth > 0);
      assert.ok(face.mouth);
    }
  });
});
