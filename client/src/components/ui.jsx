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

export function FolioMark({ className = "mark" }) {
  return (
    <svg className={className} viewBox="0 0 36 44" aria-hidden="true">
      <path fill="var(--bg-elev)" stroke="currentColor" strokeWidth="1.5" d="M4 2h20l8 8v32H4z" />
      <path fill="var(--accent)" d="M24 2l8 8h-8z" />
      <path fill="none" stroke="var(--accent-2)" strokeWidth="1.8" d="M9 26h18" />
    </svg>
  );
}
