import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyPreset,
  normalizeVoiceSettings,
  pickBestVoice,
  scoreVoice,
} from '../shared/voices.js';

describe('voices', () => {
  it('prefers a natural Spanish voice over English', () => {
    const voices = [
      { name: 'Microsoft David', lang: 'en-US', voiceURI: 'david' },
      { name: 'Microsoft Elena Online (Natural)', lang: 'es-MX', voiceURI: 'elena' },
      { name: 'Google español', lang: 'es-ES', voiceURI: 'google-es' },
    ];
    const best = pickBestVoice(voices, { lang: 'es-AR' });
    assert.equal(best.voiceURI, 'elena');
    assert.ok(scoreVoice(voices[1], 'es-AR') > scoreVoice(voices[0], 'es-AR'));
  });

  it('honors an explicit voiceURI', () => {
    const voices = [
      { name: 'Google español', lang: 'es-ES', voiceURI: 'google-es' },
      { name: 'Microsoft Elena', lang: 'es-MX', voiceURI: 'elena' },
    ];
    const best = pickBestVoice(voices, { voiceURI: 'google-es' });
    assert.equal(best.voiceURI, 'google-es');
  });

  it('applies presets and clamps settings', () => {
    const next = applyPreset({ voiceURI: 'elena' }, 'baja');
    assert.equal(next.preset, 'baja');
    assert.ok(next.rate < 1);
    const clamped = normalizeVoiceSettings({ rate: 9, pitch: 0.1, volume: 4 });
    assert.equal(clamped.rate, 1.6);
    assert.equal(clamped.pitch, 0.6);
    assert.equal(clamped.volume, 1);
  });
});
