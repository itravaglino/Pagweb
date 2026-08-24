export const units = {
  distance: 'metric',
  temperature: 'C',
};

export const preferences = {
  clockDisplay: '24h',
};

export function formatFitbitTime(date, clockDisplay = preferences.clockDisplay) {
  const h24 = date.getHours();
  const hours = clockDisplay === '12h' ? ((h24 + 11) % 12) + 1 : h24;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(date.getMinutes())}`;
}

export function formatFitbitDate(date) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}
