import { createEmitter } from './events.js';

export function createUserActivity({
  steps = 6428,
  calories = 1512,
  distance = 4.62,
  elevationGain = 8,
  activeZoneMinutes = 14,
} = {}) {
  const events = createEmitter();
  const adjusted = {
    steps,
    calories,
    distance,
    elevationGain,
    activeZoneMinutes: { total: activeZoneMinutes },
  };

  const goals = {
    steps: 10_000,
    calories: 2200,
    distance: 8,
    elevationGain: 10,
    activeZoneMinutes: 30,
  };

  function emit() {
    events.emit('change', { type: 'change' });
  }

  return {
    today: {
      get adjusted() {
        return adjusted;
      },
      local: adjusted,
    },
    goals,
    addEventListener: events.addEventListener,
    removeEventListener: events.removeEventListener,
    addSteps(n = 1) {
      adjusted.steps += n;
      adjusted.distance = Number((adjusted.steps * 0.00072).toFixed(2));
      adjusted.calories += n * 0.04;
      emit();
    },
    ingestFitbitSummary(summary = {}) {
      if (summary.steps != null) adjusted.steps = Number(summary.steps) || adjusted.steps;
      if (summary.caloriesOut != null) adjusted.calories = Number(summary.caloriesOut) || adjusted.calories;
      if (summary.floors != null) adjusted.elevationGain = Number(summary.floors) || adjusted.elevationGain;
      const dist = summary.distances?.find((d) => d.activity === 'total') || summary.distances?.[0];
      if (dist?.distance != null) adjusted.distance = Number(dist.distance);
      if (summary.activeZoneMinutes != null) {
        adjusted.activeZoneMinutes.total = Number(summary.activeZoneMinutes) || 0;
      }
      emit();
    },
  };
}
