import { useEffect, useState } from "react";

const RING = {
  steps: { stroke: "var(--fitbit-steps)", track: "var(--fitbit-steps-track)" },
  azm: { stroke: "var(--fitbit-azm)", track: "var(--fitbit-azm-track)" },
  cals: { stroke: "var(--fitbit-cals)", track: "var(--fitbit-cals-track)" },
};

function pct(value, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(1, value / goal));
}

function MiniRing({ value, goal, tone, label }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const p = pct(value, goal);
  const colors = RING[tone];
  return (
    <div className="c6-ring">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke={colors.track} strokeWidth="4.5" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - p * c}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <small>{label}</small>
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Charge6({ metrics, stepsGoal = 10000, sleepLabel, reply, className = "" }) {
  const now = useClock();
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(now);
  const date = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(now);
  const seconds = now.getSeconds();
  const steps = metrics?.steps || 0;
  const azm = metrics?.azmTotal || 0;
  const cals = metrics?.calories || 0;
  const hr = metrics?.restingHeartRate;
  const calGoal = metrics?.caloriesBmr ? Math.round(metrics.caloriesBmr * 1.35) : 2200;

  return (
    <div className={`charge6 ${className}`.trim()} aria-label="Fitbit Charge 6">
      <div className="c6-band c6-band-top" aria-hidden="true" />
      <div className="c6-lugs top" aria-hidden="true" />
      <div className="c6-case">
        <button type="button" className="c6-btn" tabIndex={-1} aria-hidden="true" />
        <div className="c6-bezel">
          <div className="c6-glass">
            <div className="c6-face">
              <header className="c6-status">
                <span className="c6-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span>{metrics?.battery ?? 74}%</span>
              </header>
              <p className="c6-time">
                {time}
                <span className="c6-sec">{String(seconds).padStart(2, "0")}</span>
              </p>
              <p className="c6-date">{date}</p>
              <div className="c6-rings">
                <MiniRing value={steps} goal={stepsGoal} tone="steps" label="pasos" />
                <MiniRing value={azm} goal={30} tone="azm" label="zona" />
                <MiniRing value={cals} goal={calGoal} tone="cals" label="kcal" />
              </div>
              <footer className="c6-complications">
                {reply?.watch ? (
                  <div className="c6-reply">
                    <small>{reply.title || "Lumen"}</small>
                    <p>{reply.watch}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <small>FC</small>
                      <strong>{metrics?.currentHeartRate ?? hr ?? "--"}</strong>
                    </div>
                    <div>
                      <small>Pasos</small>
                      <strong>{steps.toLocaleString("es-AR")}</strong>
                    </div>
                    <div>
                      <small>Sueño</small>
                      <strong>{sleepLabel || "--"}</strong>
                    </div>
                  </>
                )}
              </footer>
            </div>
            <div className="c6-glare" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="c6-lugs bottom" aria-hidden="true" />
      <div className="c6-band c6-band-bottom" aria-hidden="true" />
    </div>
  );
}

export function TodayRings({ steps = 0, stepsGoal = 10000, azm = 0, azmGoal = 30, calories = 0, calGoal = 2200 }) {
  const items = [
    { id: "steps", label: "Pasos", value: steps, goal: stepsGoal, tone: "steps", fmt: (n) => n.toLocaleString("es-AR") },
    { id: "azm", label: "Zona activa", value: azm, goal: azmGoal, tone: "azm", fmt: (n) => `${n} min` },
    { id: "cals", label: "Calorías", value: calories, goal: calGoal, tone: "cals", fmt: (n) => n.toLocaleString("es-AR") },
  ];
  return (
    <div className="today-rings" role="img" aria-label="Anillos de hoy de Fitbit">
      {items.map((item) => {
        const r = 36;
        const c = 2 * Math.PI * r;
        const p = pct(item.value, item.goal);
        const colors = RING[item.tone];
        return (
          <div className="today-ring" key={item.id}>
            <svg viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={r} fill="none" stroke={colors.track} strokeWidth="8" />
              <circle
                cx="44"
                cy="44"
                r={r}
                fill="none"
                stroke={colors.stroke}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - p * c}
                transform="rotate(-90 44 44)"
              />
              <text x="44" y="42" textAnchor="middle" className="today-ring-num">
                {Math.round(p * 100)}
              </text>
              <text x="44" y="56" textAnchor="middle" className="today-ring-pct">
                %
              </text>
            </svg>
            <strong>{item.fmt(item.value)}</strong>
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
