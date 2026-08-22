export function Ring({ value = 0, label, sub, color = "var(--accent)" }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const dash = c - (v / 100) * c;
  return (
    <div className="ring-card">
      <svg viewBox="0 0 110 110" aria-label={`${label} ${v}`}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
          transform="rotate(-90 55 55)"
        />
        <text x="55" y="60" textAnchor="middle" fill="currentColor" fontSize="18" fontFamily="var(--font-display)">
          {Math.round(v)}
        </text>
      </svg>
      <div>{label}</div>
      {sub ? <div className="muted">{sub}</div> : null}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
