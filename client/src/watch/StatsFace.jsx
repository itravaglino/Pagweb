import './faces.css';

function Ring({ value, max, color, label }) {
  const pct = Math.min(1, value / max);
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="stat-ring">
      <svg viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} className="track" />
        <circle
          cx="36"
          cy="36"
          r={r}
          className="meter"
          style={{
            stroke: color,
            strokeDasharray: `${c * pct} ${c}`,
          }}
        />
      </svg>
      <b>{Math.round(value)}</b>
      <span>{label}</span>
    </div>
  );
}

export default function StatsFace({ metrics }) {
  return (
    <div className="stats-face" data-testid="stats-face">
      <p className="stats-kicker">Hoy</p>
      <div className="rings">
        <Ring value={metrics.steps} max={10000} color="#7dffb3" label="pasos" />
        <Ring value={metrics.calories} max={2200} color="#ffb86b" label="kcal" />
        <Ring value={metrics.zone} max={30} color="#ff6b9d" label="zona" />
      </div>
      <div className="vitals">
        <div>
          <small>FC</small>
          <strong>{metrics.hr}</strong>
        </div>
        <div>
          <small>Batería</small>
          <strong>{metrics.battery}%</strong>
        </div>
      </div>
    </div>
  );
}
