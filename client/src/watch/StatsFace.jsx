import './faces.css';

function Ring({ value, max, color, label }) {
  const pct = Math.min(1, value / max);
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="today-ring">
      <svg viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} className="track" />
        <circle
          cx="44"
          cy="44"
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
    <div className="today-face" data-testid="stats-face">
      <p className="today-kicker">Hoy</p>
      <div className="today-rings">
        <Ring value={metrics.steps} max={10000} color="#c5e86c" label="pasos" />
        <Ring value={metrics.calories} max={2200} color="#ff7a59" label="kcal" />
        <Ring value={metrics.zone} max={30} color="#f04771" label="AZM" />
      </div>
      <div className="today-vitals">
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
