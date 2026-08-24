import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractWake,
  parseDurationSeconds,
  parseModelJson,
  routeIntent,
  normalizeRoute,
  formatClock,
  formatTimer,
} from '../shared/router.js';

describe('extractWake', () => {
  it('detects hey gemma and returns the rest', () => {
    const result = extractWake('Hey Gemma, ¿qué hora es?');
    assert.equal(result.woke, true);
    assert.equal(result.rest, 'que hora es');
  });

  it('detects oye gemma without remainder', () => {
    const result = extractWake('oye Gemma');
    assert.equal(result.woke, true);
    assert.equal(result.rest, '');
  });

  it('detects hola gemma', () => {
    const result = extractWake('Hola Gemma pon un timer');
    assert.equal(result.woke, true);
    assert.equal(result.rest, 'pon un timer');
  });

  it('ignores unrelated speech', () => {
    assert.equal(extractWake('hola reloj').woke, false);
  });
});

describe('routeIntent', () => {
  it('routes clock questions', () => {
    assert.equal(routeIntent('qué hora es').intent, 'clock');
  });

  it('routes stats', () => {
    assert.equal(routeIntent('muéstrame mis pasos').intent, 'stats');
  });

  it('routes timers with minutes', () => {
    const routed = routeIntent('pon un timer de 5 minutos');
    assert.equal(routed.intent, 'timer');
    assert.equal(routed.seconds, 300);
  });

  it('routes face commands', () => {
    const routed = routeIntent('ponte feliz');
    assert.equal(routed.intent, 'face');
    assert.equal(routed.emotion, 'happy');
  });

  it('defaults to chat', () => {
    assert.equal(routeIntent('quién descubrió la penicilina').intent, 'chat');
  });
});

describe('parseDurationSeconds', () => {
  it('parses seconds and a single minute', () => {
    assert.equal(parseDurationSeconds('30 segundos'), 30);
    assert.equal(parseDurationSeconds('un minuto'), 60);
  });
});

describe('parseModelJson', () => {
  it('extracts json from noisy model output', () => {
    const parsed = parseModelJson('claro\n{"intent":"chat","emotion":"happy","bounce":0.4}\n');
    assert.equal(parsed.intent, 'chat');
    assert.equal(normalizeRoute(parsed).emotion, 'happy');
  });

  it('returns null when missing', () => {
    assert.equal(parseModelJson('no json here'), null);
  });
});

describe('format helpers', () => {
  it('pads timer values', () => {
    assert.equal(formatTimer(0), '00:00');
    assert.equal(formatTimer(65), '01:05');
    assert.equal(formatTimer(300), '05:00');
  });

  it('formats a clock in es-ES', () => {
    const text = formatClock(new Date('2026-08-24T15:07:00'));
    assert.match(text, /\d{2}:\d{2}/);
  });
});

describe('stop intent', () => {
  it('routes silence commands', () => {
    assert.equal(routeIntent('para').intent, 'stop');
    assert.equal(routeIntent('silencio').intent, 'stop');
  });
});
