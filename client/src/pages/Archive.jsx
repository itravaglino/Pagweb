import { useEffect, useMemo, useState } from "react";
import { fetchArchive } from "../lib/db.js";
import { fetchCharacterDays } from "../lib/api.js";
import { FitbitViz } from "../components/FitbitViz.jsx";
import { CharacterCalendar } from "../components/CharacterCalendar.jsx";
import { CHARACTER, CHARACTER_TO } from "@shared/character.js";

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

export function Archive() {
  const [db, setDb] = useState(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [characterDays, setCharacterDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(CHARACTER_TO);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, character] = await Promise.all([fetchArchive(), fetchCharacterDays()]);
        if (cancelled) return;
        setDb(data);
        const days = character.days || [];
        setCharacterDays(days);
        const last = days.at(-1)?.date || "2026-08-23";
        setSelectedDate(last);
        const match = (data.entries || []).find((e) => e.id === `seed-personaje-${last}`);
        setOpenId(match?.id || data.entries?.[0]?.id || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
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
  const profile = db?.profile;

  function pickCalendarDay(day) {
    setSelectedDate(day.date);
    setOpenId(`seed-personaje-${day.date}`);
  }

  return (
    <div className="grid">
      <article className="card hero">
        <div>
          <div className="kicker">Archivo persistente</div>
          <h1>Diario de {CHARACTER.nickname}</h1>
          <p className="tagline">
            28 días de {CHARACTER.name} ({CHARACTER.faculty}, {CHARACTER.barrio}). Tocá un casillero: ves el Charge 6
            y el diario de esa jornada. Los datos viven en el store y en <code>data/pagweb.json</code>.
          </p>
          <div className="meta-row">
            <span className="chip good">{characterDays.length || entries.length} días</span>
            <span className="chip">{db?.source === "api" ? "servidor + store" : db?.source || "local"}</span>
            <span className="chip">{CHARACTER.device}</span>
            {profile?.email ? <span className="chip">{profile.email}</span> : null}
          </div>
        </div>
        <div>
          <p className="quote">
            Cuatro semanas: campus, gym, Güemes, mesas y un día en cama. El calendario es el archivo.
          </p>
        </div>
      </article>

      {error ? <div className="banner">{error}</div> : null}

      <article className="card">
        <div className="widget-head">
          <h2>Calendario · 4 semanas</h2>
          <span className="muted">27 jul → 23 ago · tocá un día</span>
        </div>
        <CharacterCalendar days={characterDays} selectedDate={selectedDate} onSelect={pickCalendarDay} />
      </article>

      {selectedDay ? (
        <article className="card notes">
          <div className="kicker">
            {selectedDay.weekday} {selectedDay.date} · {selectedDay.kind}
          </div>
          <h2>{selected.label}</h2>
          <p className="quote">{selectedDay.log}</p>
          {selectedDay.metrics?.hourlySteps?.length ? (
            <FitbitViz metrics={{ ...selectedDay.metrics, story: "" }} />
          ) : null}
          {selected.narrative?.energyWindow ? (
            <p>
              <strong>Ventana: </strong>
              {selected.narrative.energyWindow}
            </p>
          ) : null}
          <p className="footer-note">
            Guardado {formatWhen(selected.createdAt)} · id seed-personaje-{selectedDay.date}
          </p>
        </article>
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
