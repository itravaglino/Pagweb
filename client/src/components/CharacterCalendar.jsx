import { useMemo } from "react";
import { minutesToHm } from "@shared/analyze.js";
import { CHARACTER, CHARACTER_FROM, CHARACTER_TO } from "@shared/character.js";

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function kSteps(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")}k`;
  return String(n);
}

export function CharacterHeader({ identity = CHARACTER, summary, onLoadHoy, loading }) {
  const last = summary?.lastNight;
  return (
    <article className="card character-head">
      <div>
        <div className="kicker">
          {identity.device} · {identity.barrio}
        </div>
        <h2>
          {identity.name}{" "}
          <span className="muted">({identity.nickname}, {identity.age})</span>
        </h2>
        <p className="tagline">
          {identity.faculty}. Meta: {identity.goal?.label}. Tocá <strong>Cargá el domingo de {identity.nickname}</strong>{" "}
          para ver el último día del archivo, o quedate con las personas sintéticas de siempre.
        </p>
        <div className="meta-row">
          <span className="chip good">Anoche {last ? minutesToHm(last.sleepMinutes) : "—"}</span>
          <span className="chip">Racha {summary?.streak ?? "—"} días en meta</span>
          <span className="chip">{identity.device}</span>
          <span className="chip">
            {identity.from || CHARACTER_FROM} → {identity.to || CHARACTER_TO}
          </span>
        </div>
        {onLoadHoy ? (
          <div className="actions" style={{ marginTop: 14 }}>
            <button className="btn primary" type="button" disabled={loading} onClick={onLoadHoy}>
              {loading ? "Cargando…" : `Cargá el domingo de ${identity.nickname}`}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function CharacterCalendar({ days = [], selectedDate, onSelect }) {
  const weeks = useMemo(() => {
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      const slice = days.slice(i, i + 7);
      rows.push({
        days: slice,
        steps: slice.reduce((a, d) => a + (d.metrics?.steps || d.steps || 0), 0),
        sleep: Math.round(slice.reduce((a, d) => a + (d.metrics?.sleepMinutes || d.sleepMinutes || 0), 0) / (slice.length || 1)),
      });
    }
    return rows;
  }, [days]);

  if (!days.length) {
    return <p className="muted">Todavía no cargó el calendario de Cami.</p>;
  }

  return (
    <div className="char-cal">
      <div className="char-cal-dow">
        {DOW.map((d) => (
          <span key={d}>{d}</span>
        ))}
        <span className="char-cal-total-h">Semana</span>
      </div>
      {weeks.map((week) => (
        <div className="char-cal-week" key={week.days[0]?.date || week.steps}>
          {week.days.map((day) => {
            const date = day.date;
            const steps = day.metrics?.steps ?? day.steps ?? 0;
            const kind = day.kind || day.metrics?.kind || "";
            const on = selectedDate === date;
            return (
              <button
                key={date}
                type="button"
                className={`char-cal-cell ${on ? "on" : ""} kind-${kind}`}
                onClick={() => onSelect?.(day)}
              >
                <em>{String(date).slice(8)}</em>
                <strong>{kSteps(steps)}</strong>
                <span className="muted">{kind}</span>
              </button>
            );
          })}
          <div className="char-cal-total">
            <strong>{kSteps(week.steps)}</strong>
            <span className="muted">{minutesToHm(week.sleep)} sueño</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CharacterPulse({ summary, identity = CHARACTER }) {
  const thisWeek = summary?.thisWeek?.days || [];
  const lastWeek = summary?.lastWeek?.days || [];
  const max = Math.max(1, ...thisWeek.map((d) => d.steps), ...lastWeek.map((d) => d.steps));
  return (
    <article className="card character-pulse">
      <div className="widget-head">
        <h2>Pulso de {identity.nickname}</h2>
        <span className="muted">esta semana vs la de mesas</span>
      </div>
      <p className="tagline">
        {identity.nickname} vs su propia semana de mesas. Los pasos se caen en exámenes y vuelven cuando retoma el gym.
      </p>
      <div className="pulse-compare">
        <div>
          <div className="widget-head">
            <h3>Esta semana</h3>
            <span className="muted">{summary?.thisWeek?.avgSteps?.toLocaleString("es-AR") || "—"} pasos/día</span>
          </div>
          <div className="week-bars mini">
            {thisWeek.map((d) => (
              <div key={d.date} className="week-col" title={`${d.date} · ${d.steps}`}>
                <i style={{ height: `${Math.max(8, (d.steps / max) * 100)}%` }} />
                <em>{d.weekday?.slice(0, 1) || d.date.slice(8)}</em>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="widget-head">
            <h3>Semana de mesas</h3>
            <span className="muted">{summary?.lastWeek?.avgSteps?.toLocaleString("es-AR") || "—"} pasos/día</span>
          </div>
          <div className="week-bars mini">
            {lastWeek.map((d) => (
              <div key={d.date} className="week-col" title={`${d.date} · ${d.steps}`}>
                <i style={{ height: `${Math.max(8, (d.steps / max) * 100)}%` }} />
                <em>{d.weekday?.slice(0, 1) || d.date.slice(8)}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="meta-row">
        <span className="chip good">Racha {summary?.streak ?? 0}</span>
        <span className="chip">Promedio {summary?.avgSteps?.toLocaleString("es-AR")} pasos</span>
        <a className="btn" href="#/archivo">
          Abrí el calendario
        </a>
      </div>
    </article>
  );
}
