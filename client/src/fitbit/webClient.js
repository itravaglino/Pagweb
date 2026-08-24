export async function fetchFitbitStatus() {
  const res = await fetch('/api/fitbit/status');
  if (!res.ok) return { configured: false, connected: false };
  return res.json();
}

export async function fetchFitbitToday() {
  const res = await fetch('/api/fitbit/today');
  if (!res.ok) return null;
  return res.json();
}

export function fitbitLoginUrl() {
  return '/api/fitbit/login';
}
