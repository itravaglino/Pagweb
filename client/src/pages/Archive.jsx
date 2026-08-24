import { useEffect, useMemo, useState } from "react";
import { fetchArchive } from "../lib/db.js";
import { FitbitViz } from "../components/FitbitViz.jsx";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchArchive();
        if (!cancelled) {
          setDb(data);
          const firstSeed = (data.entries || []).find((e) => String(e.id).startsWith("seed-semana-"));
          setOpenId(firstSeed?.id || data.entries?.[0]?.id || null);
        }
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
      if (String(item.id).startsWith("seed-semana-")) return 0;
      if (item.kind === "note") return 1;
      return 2;
    };
    return [...raw].sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d) return d;
      return String(a.date || a.createdAt || "").localeCompare(String(b.date || b.createdAt || ""));
    });
  }, [db]);
  const selected = useMemo(
    () => entries.find((item) => item.id === openId) || entries[0],
    [entries, openId]
  );
  const profile = db?.profile;

  return (
    <div className="grid">
      <article className="card hero">
        <div>
          <div className="kicker">Archivo persistente</div>
          <h1>Días guardados</h1>
          <p className="tagline">
            Datos de prueba de {profile?.fullName || "Nacho"} ({profile?.org || "UNC"} ·{" "}
            {profile?.city || "Córdoba"}). Viven en el store de Cursor y en <code>data/pagweb.json</code>.
            Cada lectura del coach se suma acá.
          </p>
          <div className="meta-row">
            <span className="chip good">{entries.length} registros</span>
            <span className="chip">{db?.source === "api" ? "servidor + store" : db?.source || "local"}</span>
            {profile?.email ? <span className="chip">{profile.email}</span> : null}
          </div>
        </div>
        <div>
          <p className="quote">Una semana sintética de Charge 6: mesas, UNC, gym y Güemes.</p>
        </div>
      </article>

      {error ? <div className="banner">{error}</div> : null}

      <article className="card">
        <div className="widget-head">
          <h2>Entradas</h2>
          <span className="muted">post parcial · mesas · UNC · gym · Güemes</span>
        </div>
        <div className="archive-list">
          {entries.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`archive-item ${selected?.id === item.id ? "on" : ""}`}
              onClick={() => setOpenId(item.id)}
            >
              <header>
                <strong>
                  {item.kind === "note" ? item.title || "Nota" : item.label || item.persona || "Día"}
                </strong>
                <span className="chip">{item.kind === "note" ? "nota" : item.persona || "día"}</span>
              </header>
              <div className="muted">
                {item.date || formatWhen(item.createdAt)}
                {item.analysis?.overall != null ? ` · pulso ${item.analysis.overall}` : ""}
                {item.analysis?.band?.label ? ` · ${item.analysis.band.label}` : ""}
              </div>
            </button>
          ))}
        </div>
      </article>

      {selected ? (
        <article className="card notes">
          <div className="kicker">{selected.kind === "note" ? "Nota" : "Lectura"}</div>
          <h2>{selected.title || selected.narrative?.headline || selected.label || selected.persona}</h2>
          {selected.kind === "note" ? (
            <p className="tagline">{selected.text}</p>
          ) : (
            <>
              <p className="tagline">{selected.narrative?.dayStory}</p>
              {selected.metrics?.hourlySteps?.length ? <FitbitViz metrics={selected.metrics} /> : null}
              {selected.narrative?.energyWindow ? (
                <p>
                  <strong>Ventana: </strong>
                  {selected.narrative.energyWindow}
                </p>
              ) : null}
              {(selected.narrative?.plan || []).length ? (
                <ol className="plan">
                  {selected.narrative.plan.map((step, i) => (
                    <li key={i}>
                      <time>{step.when}</time>
                      <div>
                        <strong>{step.action}</strong>
                        <div className="muted">{step.why}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
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
