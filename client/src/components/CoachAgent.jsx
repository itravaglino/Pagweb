import { tileForField } from "@shared/fitness.js";

const NUMBER_RE =
  /(\d{1,2}h\s*\d{1,2}m|\d{1,3}(?:[.\u00a0]\d{3})+|\d+(?:[.,]\d+)?\s*(?:ms|lpm|min|kcal|km|ml|h|m|%|pasos)?)/gi;

export function highlightCites(text = "", cite = "") {
  if (!text) return text;
  if (cite && text.includes(cite)) {
    const parts = text.split(cite);
    return parts.flatMap((part, i) =>
      i < parts.length - 1
        ? [part, <mark key={`c-${i}`}>{cite}</mark>]
        : [part]
    );
  }
  const nodes = [];
  let last = 0;
  const re = new RegExp(NUMBER_RE.source, "gi");
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(<mark key={`${match.index}-${match[0]}`}>{match[0]}</mark>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : text;
}

function storyParagraphs(dayStory = "") {
  return String(dayStory)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function CoachAgent({
  coach,
  loading,
  phase,
  nvidiaReady,
  writtenFor = "Nacho",
  modeLabel,
  onNoticing,
  highlightField,
}) {
  const narrative = coach?.narrative;
  const engine = coach?.engine;
  const isNvidia = engine === "nvidia";
  const name = coach?.writtenFor || writtenFor;

  if (loading || (!narrative && phase !== "ready")) {
    const reading = phase !== "writing";
    return (
      <article className={`card coach-agent ${isNvidia || nvidiaReady ? "nvidia" : "local"} writing`}>
        <div className="coach-live" aria-live="polite">
          <span className="coach-pulse" />
          <div>
            <div className="kicker">Agente Lumen</div>
            <h2>{reading ? "Leyendo el Charge 6…" : nvidiaReady ? `NVIDIA NIM está escribiendo para ${name}…` : `Lumen local está armando el día de ${name}…`}</h2>
            <p className="muted">
              {reading
                ? "Sueño, HRV, pasos por hora, zonas, SpO₂ y el diario."
                : "Citando tus números exactos. Esto no es un template."}
            </p>
          </div>
        </div>
      </article>
    );
  }

  if (!narrative) return null;

  const paragraphs = storyParagraphs(narrative.dayStory);
  const noticing = narrative.noticing || [];

  return (
    <article className={`card coach-agent ${isNvidia ? "nvidia" : "local"}`}>
      <div className="coach-badge-row">
        <span className={`coach-badge ${isNvidia ? "on" : "off"}`}>
          <span className={`status-dot ${isNvidia ? "on" : "off"}`} />
          {isNvidia
            ? `NVIDIA NIM · ${coach.model || "Llama"} · escrito para ${name}`
            : `Motor local · Lumen sin NIM · escrito para ${name}`}
        </span>
        {modeLabel ? <span className="chip">modo {modeLabel}</span> : null}
        {coach.fallbackReason ? <span className="chip">{coach.fallbackReason}</span> : null}
      </div>

      <div className="kicker">Agente Lumen {isNvidia ? "· NVIDIA Developer" : "· fallback local"}</div>
      <h1 className="coach-headline">{narrative.headline}</h1>

      {noticing.length ? (
        <section className="coach-noticing">
          <h2>Lo que notó el agente</h2>
          <ul>
            {noticing.map((item, i) => {
              const text = typeof item === "string" ? item : item.text;
              const cite = typeof item === "string" ? "" : item.cite;
              const field = typeof item === "string" ? "" : item.fitbitField;
              const on = highlightField && field && tileForField(highlightField) === tileForField(field);
              return (
                <li key={`${i}-${text.slice(0, 24)}`}>
                  <button
                    type="button"
                    className={`noticing-item ${on ? "on" : ""}`}
                    onClick={() => onNoticing?.(field || "steps")}
                  >
                    {highlightCites(text, cite)}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {paragraphs.length ? (
        <blockquote className="coach-letter">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
          <footer>— Lumen{isNvidia ? " · NVIDIA NIM" : " · motor local"}, para {name}</footer>
        </blockquote>
      ) : null}

      {narrative.energyWindow ? (
        <p className="coach-window">
          <strong>Ventana de energía. </strong>
          {narrative.energyWindow}
        </p>
      ) : null}

      {(narrative.because || []).length ? (
        <section className="coach-because">
          <h3>Por eso hoy</h3>
          <ul>
            {narrative.because.map((line) => (
              <li key={line}>{highlightCites(line)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {(narrative.plan || []).length ? (
        <section className="coach-plan">
          <h2>El plan que te escribió</h2>
          <PlanSteps plan={narrative.plan} onWhyField={onNoticing} />
        </section>
      ) : null}

      <div className="coach-closeout">
        {narrative.tonight ? (
          <div>
            <h3>Esta noche</h3>
            <p>{highlightCites(narrative.tonight)}</p>
          </div>
        ) : null}
        {narrative.tradeoff ? (
          <div>
            <h3>Si no lo hacés</h3>
            <p>{highlightCites(narrative.tradeoff)}</p>
          </div>
        ) : null}
      </div>

      {(narrative.watchouts || []).length ? (
        <div className="coach-watchouts">
          <h3>Ojo con</h3>
          <ul>
            {narrative.watchouts.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {narrative.closing ? <p className="quote coach-closing">{narrative.closing}</p> : null}
    </article>
  );
}

export function PlanSteps({ plan = [], onWhyField }) {
  return (
    <ol className="plan plan-deep">
      {plan.map((step, i) => (
        <li key={`${step.action}-${i}`}>
          <time>{step.when}</time>
          <div>
            <strong>{step.action}</strong>
            {step.why ? (
              <button
                type="button"
                className="plan-why"
                onClick={() => onWhyField?.(step.fitbitField)}
              >
                <span>Porque</span> {highlightCites(step.why)}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CoachNote({ narrative, fallbackMetrics, label = "Así lo leería el agente" }) {
  if (!narrative && !fallbackMetrics) return null;
  const noticing = narrative?.noticing || [];
  const story = storyParagraphs(narrative?.dayStory || "").slice(0, 2);
  return (
    <section className="coach-note">
      <div className="kicker">{label}</div>
      {narrative?.headline ? <h3>{narrative.headline}</h3> : null}
      {noticing.length ? (
        <ul className="coach-note-list">
          {noticing.slice(0, 4).map((item, i) => {
            const text = typeof item === "string" ? item : item.text;
            return <li key={i}>{highlightCites(text, item.cite)}</li>;
          })}
        </ul>
      ) : null}
      {story.map((p) => (
        <p key={p.slice(0, 32)} className="tagline">
          {p}
        </p>
      ))}
    </section>
  );
}
