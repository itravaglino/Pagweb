import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { demoChatReply, streamText } from '../shared/fallback.js';

describe('demoChatReply', () => {
  it('introduces Gemma', () => {
    const reply = demoChatReply('quién eres');
    assert.match(reply, /Gemma/i);
  });

  it('tells the time', () => {
    const reply = demoChatReply('qué hora es', new Date('2026-08-24T12:00:00'));
    assert.match(reply, /Son las/);
  });

  it('answers empty input', () => {
    assert.match(demoChatReply(''), /Dime/);
  });

  it('streams tokens', async () => {
    let out = '';
    for await (const piece of streamText('hola mundo', 0)) out += piece;
    assert.equal(out, 'hola mundo');
  });
});
