import { createEmitter } from './events.js';

export function createClock() {
  const events = createEmitter();
  let granularity = 'off';
  let timer = null;
  let ontick = null;

  function intervalMs() {
    if (granularity === 'seconds') return 1000;
    if (granularity === 'minutes') return 60_000;
    if (granularity === 'hours') return 3_600_000;
    return 0;
  }

  function fire() {
    const event = { date: new Date() };
    ontick?.(event);
    events.emit('tick', event);
  }

  function arm() {
    if (timer) clearInterval(timer);
    timer = null;
    const ms = intervalMs();
    if (!ms) return;
    fire();
    timer = setInterval(fire, ms);
  }

  return {
    get granularity() {
      return granularity;
    },
    set granularity(value) {
      granularity = ['off', 'seconds', 'minutes', 'hours'].includes(value) ? value : 'off';
      arm();
    },
    get ontick() {
      return ontick;
    },
    set ontick(fn) {
      ontick = fn;
    },
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
    tickNow() {
      fire();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      granularity = 'off';
    },
  };
}
