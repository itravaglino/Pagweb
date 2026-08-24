import { useMemo, useState } from "react";
import { minutesToHm } from "@shared/analyze.js";

function hourLabel(h) {
  return `${String(h).padStart(2, "0")}h`;
}

export function FitbitViz({ metrics, onSelectHour }) {
  const [tile, setTile] = useState("steps");
  const [hour, setHour] = useState(null);

  const maxHour = useMemo(() => {
    const vals = (metrics?.hourlySteps || []).map((x) => x.value);
    return Math.max(1, ...vals);
  }, [metrics]);

  const maxWeek = useMemo(() => {
    const vals = (metrics?.week || []).map((d) => d.steps);
    return Math.max(1, ...vals);
  }, [metrics]);

  const sleepTotal =
    (metrics?.deepMinutes || 0) +
    (metrics?.remMinutes || 0) +
    (metrics?.lightMinutes || 0) +
    (metrics?.awakeMinutes || 0);

  const tiles = [
    { id: "sleep", label: "Sueño", value: minutesToHm(metrics?.sleepMinutes), hint: `${metrics?.sleepEfficiency || 0}% eficiencia · ${metrics?.awakenings || 0} despertares` },
    { id: "steps", label: "Pasos", value: (metrics?.steps || 0).toLocaleString("es-AR"), hint: `${metrics?.distanceKm || 0} km · ${metrics?.floors || 0} pisos` },
    { id: "heart", label: "FC reposo", value: metrics?.restingHeartRate ? `${metrics.restingHeartRate}` : "—", hint: `HRV ${metrics?.hrvRmssd ? `${Math.round(metrics.hrvRmssd)} ms` : "—"}` },
    { id: "azm", label: "Zonas activas", value: `${metrics?.azmTotal || 0} min`, hint: `fat ${metrics?.azmFat || 0} · cardio ${metrics?.azmCardio || 0} · peak ${metrics?.azmPeak || 0}` },
    { id: "cals", label: "Calorías", value: (metrics?.calories || 0).toLocaleString("es-AR"), hint: `BMR ${metrics?.caloriesBmr || "—"}` },
    { id: "water", label: "Agua", value: `${metrics?.waterMl || 0} ml`, hint: `SpO₂ ${metrics?.spo2 ?? "—"}% · piel ${metrics?.skinTemp ?? "—"} °C` },
  ];

  const detail = {
    sleep: `Anoche: ${minutesToHm(metrics?.sleepMinutes)} dormido de ${minutesToHm(metrics?.timeInBed)}. Profundo ${metrics?.deepMinutes || 0} min, REM ${metrics?.remMinutes || 0} min, ligero ${metrics?.lightMinutes || 0} min, despierto ${metrics?.awakeMinutes || 0} min.`,
    steps: `Hoy ${ (metrics?.steps || 0).toLocaleString("es-AR") } pasos (${metrics?.distanceKm || 0} km). Sedentario ${metrics?.sedentaryMinutes || 0} min · ligero ${metrics?.lightlyActiveMinutes || 0} · fairly ${metrics?.fairlyActiveMinutes || 0} · very ${metrics?.veryActiveMinutes || 0}.`,
    heart: `FC en reposo ${metrics?.restingHeartRate ?? "—"}. HRV RMSSD ${metrics?.hrvRmssd ? `${Math.round(metrics.hrvRmssd)} ms` : "—"}. Es lo que Fitbit usa para recuperación.`,
    azm: `Active Zone Minutes: ${metrics?.azmTotal || 0}. Fat burn ${metrics?.azmFat || 0}, cardio ${metrics?.azmCardio || 0}, peak ${metrics?.azmPeak || 0}.`,
    cals: `${(metrics?.calories || 0).toLocaleString("es-AR")} kcal de las cuales ~${metrics?.caloriesBmr || "—"} son BMR.`,
    water: `Agua ${metrics?.waterMl || 0} ml. SpO₂ media ${metrics?.spo2 ?? "—"}%. Variación de temp. de piel ${metrics?.skinTemp ?? "—"} °C (relativa).`,
  };

  return (
    <div className="fitbit-viz">
      {metrics?.story ? <p className="tagline">{metrics.story}</p> : null}
      <div className="metric-tiles">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`metric-tile ${tile === t.id ? "on" : ""}`}
            onClick={() => setTile(t.id)}
          >
            <span className="muted">{t.label}</span>
            <strong>{t.value}</strong>
            <span className="hint">{t.hint}</span>
          </button>
        ))}
      </div>
      <p className="muted viz-detail">{detail[tile]}</p>

      <div className="viz-grid">
        <section>
          <div className="widget-head">
            <h3>Pasos por hora</h3>
            <span className="muted">
              {hour != null ? `${hourLabel(hour)} · ${metrics.hourlySteps?.[hour]?.value || 0} pasos` : "tocá una barra"}
            </span>
          </div>
          <div className="hour-bars" role="img" aria-label="Pasos por hora">
            {(metrics?.hourlySteps || []).map((row) => (
              <button
                key={row.hour}
                type="button"
                className={`hour-bar ${hour === row.hour ? "on" : ""}`}
                title={`${hourLabel(row.hour)} · ${row.value}`}
                onClick={() => {
                  setHour(row.hour);
                  setTile("steps");
                  onSelectHour?.(row);
                }}
              >
                <i style={{ height: `${Math.max(4, (row.value / maxHour) * 100)}%` }} />
                {row.hour % 3 === 0 ? <em>{row.hour}</em> : null}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="widget-head">
            <h3>Etapas de sueño</h3>
            <span className="muted">{minutesToHm(metrics?.sleepMinutes)}</span>
          </div>
          <div className="stage-bar">
            {[
              ["deep", metrics?.deepMinutes, "Profundo"],
              ["rem", metrics?.remMinutes, "REM"],
              ["light", metrics?.lightMinutes, "Ligero"],
              ["wake", metrics?.awakeMinutes, "Despierto"],
            ].map(([id, mins, label]) => (
              <button
                key={id}
                type="button"
                className={`stage ${id} ${tile === "sleep" ? "live" : ""}`}
                style={{ flex: Math.max(mins || 1, 1) }}
                title={`${label} ${mins || 0} min`}
                onClick={() => setTile("sleep")}
              >
                {sleepTotal > 0 && (mins || 0) / sleepTotal > 0.12 ? label : ""}
              </button>
            ))}
          </div>
          <div className="stage-legend">
            <span>Profundo {metrics?.deepMinutes || 0}m</span>
            <span>REM {metrics?.remMinutes || 0}m</span>
            <span>Ligero {metrics?.lightMinutes || 0}m</span>
            <span>Despierto {metrics?.awakeMinutes || 0}m</span>
          </div>
        </section>
      </div>

      <div className="viz-grid">
        <section>
          <div className="widget-head">
            <h3>Zonas cardíacas</h3>
            <span className="muted">Fitbit heart zones</span>
          </div>
          <div className="zone-list">
            {(metrics?.heartZones || []).map((z) => (
              <button key={z.name} type="button" className="zone-row" onClick={() => setTile("heart")}>
                <span>{z.name}</span>
                <span className="zone-track">
                  <i style={{ width: `${Math.min(100, ((z.minutes || 0) / 800) * 100)}%` }} />
                </span>
                <b>{z.minutes || 0} min</b>
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className="widget-head">
            <h3>Semana</h3>
            <span className="muted">pasos · 7 días sintéticos</span>
          </div>
          <div className="week-bars">
            {(metrics?.week || []).map((d) => (
              <div key={d.date} className="week-col" title={`${d.date} · ${d.steps} pasos · HRV ${d.hrv}`}>
                <i style={{ height: `${Math.max(8, (d.steps / maxWeek) * 100)}%` }} />
                <em>{d.date.slice(8)}</em>
              </div>
            ))}
          </div>
        </section>
      </div>

      {(metrics?.activities || []).length ? (
        <div className="activity-pills">
          {metrics.activities.map((a, i) => (
            <span className="chip" key={`${a.name}-${i}`}>
              {a.name} · {a.duration} min · {a.steps ? `${a.steps} pasos` : `${a.calories} kcal`}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PlanList({ plan = [] }) {
  const [done, setDone] = useState(() => new Set());
  return (
    <ol className="plan">
      {plan.map((step, i) => (
        <li key={i} className={done.has(i) ? "done" : ""}>
          <time>{step.when}</time>
          <label>
            <input
              type="checkbox"
              checked={done.has(i)}
              onChange={() => {
                setDone((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                });
              }}
            />
            <div>
              <strong>{step.action}</strong>
              <div className="muted">{step.why}</div>
            </div>
          </label>
        </li>
      ))}
    </ol>
  );
}
