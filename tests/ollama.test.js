import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseOllamaStreamLine, pickOllamaModel } from '../shared/ollama.js';

describe('ollama helpers', () => {
  it('picks gemma3 chat and light models from a local list', () => {
    const names = ['llama2:latest', 'gemma3:1b', 'gemma3:4b', 'qwen3:4b'];
    assert.equal(pickOllamaModel(names, 'gemma3:4b', ['gemma3:1b']), 'gemma3:4b');
    assert.equal(pickOllamaModel(names, 'missing', ['gemma3:1b']), 'gemma3:1b');
  });

  it('parses streamed chat chunks', () => {
    const piece = parseOllamaStreamLine(
      JSON.stringify({ message: { content: 'Hola' }, done: false }),
    );
    assert.equal(piece.text, 'Hola');
    assert.equal(piece.done, false);
    const done = parseOllamaStreamLine(JSON.stringify({ done: true }));
    assert.equal(done.done, true);
  });
});
