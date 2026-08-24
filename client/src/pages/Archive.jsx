import { useEffect, useMemo, useState } from "react";
import { fetchArchive } from "../lib/db.js";
import { fetchCharacterDays, fetchCoach } from "../lib/api.js";
import { FitbitViz } from "../components/FitbitViz.jsx";
import { CharacterCalendar } from "../components/CharacterCalendar.jsx";
import { CoachNote } from "../components/CoachAgent.jsx";
import { CHARACTER, CHARACTER_TO } from "@shared/character.js";

const SERVER_DOWN = "no llegó el servidor";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 16);
  }
}

function camiProfile() {
  return {
    name: CHARACTER.nickname,
    nickname: CHARACTER.nickname,
    timezone: CHARACTER.timezone,
    stepsGoal: CHARACTER.goal.steps,
    sleepGoal: CHARACTER.goal.sleepHours,
    barrio: CHARACTER.barrio,
    faculty: CHARACTER.faculty,
    city: CHARACTER.city,
    device: CHARACTER.device,
    role: "estudiante",
    mode: "general",
  };
}

export function Archive() {
  const [db, setDb] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [characterDays, setCharacterDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(CHARACTER_TO);
  const [coach, setCoach] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");

  async function loadCoach(metrics) {
    if (!metrics) {
      setCoach(null);
      return;
    }
    setCoachLoading(true);
    setCoachError("");
    try {
      const data = await fetchCoach({
        metrics,
        persona: CHARACTER.id,
        profile: camiProfile(),
        mode: "general",
      });
      setCoach(data);
    } catch (err) {
      setCoach(null);
      setCoachError(err.message || SERVER_DOWN);
    } finally {
      setCoachLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, character] = await Promise.all([fetchArchive(), fetchCharacterDays()]);
        if (cancelled) return;
        setDb(data);
        const days = character.days || [];
        setCharacterDays(days);
        const last = days.at(-1)?.date || CHARACTER_TO;
        setSelectedDate(last);
        const match = (data.entries || []).find((e) => e.id === `seed-personaje-${last}`);
        setOpenId(match?.id || data.entries?.[0]?.id || null);
        const day = days.find((d) => d.date === last) || days.at(-1);
        if (day?.metrics) await loadCoach(day.metrics);
      } catch (err) {
        if (!cancelled) setError(err.message || SERVER_DOWN);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => {
    const raw = db?.entries || [];
    const rank = (item) => {
      if (String(item.id).startsWith("seed-personaje-")) return 0;
      if (String(item.id).startsWith("seed-semana-")) return 1;
      if (item.kind === "note") return 2;
      return 3;
    };
    return [...raw].sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d) return d;
      return String(a.date || a.createdAt || "").localeCompare(String(b.date || b.createdAt || ""));
    });
  }, [db]);

  const selectedDay = useMemo(
    () => characterDays.find((d) => d.date === selectedDate) || characterDays[0],
    [characterDays, selectedDate]
  );
  const selected = useMemo(() => {
    if (selectedDay) {
      const fromDb = entries.find((item) => item.id === `seed-personaje-${selectedDay.date}`);
      return {
        ...(fromDb || {}),
        date: selectedDay.date,
        log: selectedDay.log,
        metrics: selectedDay.metrics,
        label: `${selectedDay.weekday} · ${CHARACTER.nickname}`,
        kind: "fitbit-day",
      };
    }
    return entries.find((item) => item.id === openId) || entries[0];
  }, [selectedDay, entries, openId]);

  function pickCalendarDay(day) {
    setSelectedDate(day.date);
    setOpenId(`seed-personaje-${day.date}`);
    loadCoach(day.metrics);
  }

  return (
    <div className="grid archive-page">
      <article className="card hero">
        <div>
          <div className="kicker">Archivo persistente</div>
          <h1>Diario de {CHARACTER.nickname}</h1>
          <p className="tagline">
            28 días de {CHARACTER.name} ({CHARACTER.faculty}, {CHARACTER.barrio}). Tocá un casillero: ves el Charge 6
            y Lumen lee ese día en el servidor.
          </p>
          <div className="meta-row">
            <span className="chip good">{characterDays.length || entries.length} días</span>
            <span className="chip">{db?.source === "api" ? "servidor + store" : db?.source || "local"}</span>
            <span className="chip">{CHARACTER.device}</span>
          </div>
        </div>
      </article>

      {error ? <div className="banner banner-error">{error}</div> : null}

      <article className="card">
        <div className="widget-head">
          <h2>Calendario · 4 semanas</h2>
          <span className="muted">27 jul → 23 ago · tocá un día</span>
        </div>
        <div className="cal-wrap">
          <CharacterCalendar days={characterDays} selectedDate={selectedDate} onSelect={pickCalendarDay} />
        </div>
      </article>

      {selectedDay ? (
        <>
          <article className="card notes">
            <div className="widget-head">
              <h2>{selected.label}</h2>
              <span className="muted">
                {selectedDay.weekday} {selectedDay.date} · {selectedDay.kind}
              </span>
            </div>
            {selectedDay.log ? <p className="quote">{selectedDay.log}</p> : null}
            {selectedDay.metrics?.hourlySteps?.length ? (
              <FitbitViz metrics={{ ...selectedDay.metrics, story: "" }} />
            ) : null}
          </article>

          <article className="card">
            <div className="widget-head">
              <h2>Lumen</h2>
              <span className="muted">{coachLoading ? "leyendo…" : coach?.engine ? `Lumen · ${coach.engine}` : "desde el servidor"}</span>
            </div>
            {coachLoading ? <p className="muted">Lumen está leyendo este día…</p> : null}
            {coachError ? <div className="banner banner-error">{coachError}</div> : null}
            {!coachLoading && coach?.narrative ? (
              <CoachNote narrative={coach.narrative} label="Nota del agente ese día" />
            ) : null}
            {coach?.narrative?.energyWindow ? (
              <p>
                <strong>Ventana: </strong>
                {coach.narrative.energyWindow}
              </p>
            ) : null}
            <p className="footer-note">
              Guardado {formatWhen(selected.createdAt)} · id seed-personaje-{selectedDay.date}
            </p>
          </article>
        </>
      ) : selected ? (
        <article className="card notes">
          <div className="kicker">{selected.kind === "note" ? "Nota" : "Lectura"}</div>
          <h2>{selected.title || selected.narrative?.headline || selected.label || selected.persona}</h2>
          {selected.kind === "note" ? (
            <p className="tagline">{selected.text}</p>
          ) : (
            <>
              <p className="tagline">{selected.narrative?.dayStory}</p>
              {selected.metrics?.hourlySteps?.length ? <FitbitViz metrics={selected.metrics} /> : null}
            </>
          )}
          <p className="footer-note">
            Guardado {formatWhen(selected.createdAt)} · id {selected.id}
          </p>
        </article>
      ) : (
        <article className="card">
          <p className="muted">Todavía no hay entradas. Corré Mejor Día o levantá el servidor para sembrar el archivo.</p>
        </article>
      )}
    </div>
  );
}
