import { useEffect, useMemo, useState } from "react";
import { Ring, Field } from "../components/ui.jsx";
import { minutesToHm } from "@shared/analyze.js";
import { PERSONAS } from "@shared/sampleFitbit.js";
import { fetchCoach, fetchDay, fetchFitbitStatus } from "../lib/api.js";

const MODELS = [
  "meta/llama-3.3-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "meta/llama-3.1-70b-instruct",
  "nvidia/llama-3.1-nemotron-nano-8b-v1",
];

const FALLBACK_PERSONAS = [
  { id: "mixto", label: "Hoy realista" },
  { id: "recargado", label: "Día recargado" },
  { id: "agotado", label: "Día en deuda" },
];

export function Wellness({ settings, setSettings }) {
  const [personas, setPersonas] = useState(Object.values(PERSONAS));
  const [persona, setPersona] = useState("mixto");
  const [day, setDay] = useState(null);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fitbit, setFitbit] = useState({ configured: false, connected: false });
  const [showKeys, setShowKeys] = useState(false);

  const metrics = day?.metrics;
  const sources = useMemo(
    () => [
      ...(personas.length ? personas : FALLBACK_PERSONAS),
      { id: "mio", label: "Mis números" },
    ],
    [personas]
  );

  async function loadDay(nextPersona = persona, source) {
    const data = await fetchDay(nextPersona, source, settings);
    setDay(data);
    if (data.personas) setPersonas(data.personas);
    return data;
  }

  async function loadStatus() {
    setFitbit(await fetchFitbitStatus());
  }

  async function runCoach(fromDay) {
    setLoading(true);
    setError("");
    try {
      const payload = fromDay || day || (await loadDay());
      const data = await fetchCoach({
        metrics: payload.metrics,
        persona,
        nvidiaKey: settings.nvidiaKey || undefined,
        model: settings.model,
        profile: {
          name: settings.name,
          focus: settings.focus,
          stepsGoal: Number(settings.stepsGoal),
          sleepGoal: Number(settings.sleepGoal),
          activeGoal: Number(settings.activeGoal),
          bedtime: settings.bedtime,
          timezone: settings.timezone,
        },
      });
      setCoach(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadStatus();
      const data = await loadDay();
      if (cancelled) return;
      await runCoach(data);
    })();
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    if (params.get("fitbit") === "error") {
      setError(params.get("reason") || "Fitbit no autorizó");
    }
    return () => {
      cancelled = true;
    };
    // Primera lectura al entrar a Mejor Día.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickPersona(id) {
    setPersona(id);
    if (id === "mio") setShowKeys(true);
    const data = await loadDay(id, id === "mio" ? undefined : "demo");
    setCoach(null);
    await runCoach(data);
  }

  const scores = coach?.analysis?.scores;
  const narrative = coach?.narrative;

  const metricChips = useMemo(() => {
    if (!metrics) return [];
    return [
      ["Sueño", minutesToHm(metrics.sleepMinutes)],
      ["Pasos", (metrics.steps || 0).toLocaleString("es-AR")],
      ["FC reposo", metrics.restingHeartRate ? `${metrics.restingHeartRate}` : "—"],
      ["HRV", metrics.hrvRmssd ? `${Math.round(metrics.hrvRmssd)} ms` : "—"],
    ];
  }, [metrics]);

  return (
    <div className="grid">
      <article className="card wellness-hero">
        <div>
          <div className="kicker">Fitbit × NVIDIA NIM</div>
          <h1>¿Cómo viene tu día?</h1>
          <p className="tagline">
            {narrative?.headline ||
              "Cargamos un Fitbit de demo (o los números de tu app) y NVIDIA te arma el plan para el mejor día posible con las horas que quedan."}
          </p>
          <div className="meta-row">
            {metricChips.map(([k, v]) => (
              <span className="chip" key={k}>
                {k}: {v}
              </span>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn primary" type="button" disabled={loading} onClick={() => runCoach()}>
              {loading ? "Pensando…" : coach ? "Recalcular el día" : "Leer mi día"}
            </button>
            {fitbit.connected ? (
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  await fetch("/api/fitbit/logout", { method: "POST" });
                  await loadStatus();
                  await loadDay(persona, "demo");
                }}
              >
                Salir de Fitbit
              </button>
            ) : (
              <a
                className="btn"
                href={fitbit.configured ? "/api/fitbit/login" : undefined}
                onClick={(e) => {
                  if (!fitbit.configured) {
                    e.preventDefault();
                    setShowKeys(true);
                  }
                }}
              >
                Conectar Fitbit
              </a>
            )}
            <button className="btn" type="button" onClick={() => setShowKeys((v) => !v)}>
              Claves y metas
            </button>
          </div>
          {coach ? (
            <div className="engine" style={{ marginTop: 12 }}>
              Motor: {coach.engine === "nvidia" ? `NVIDIA · ${coach.model}` : "local (sin clave NIM o fallback)"}
              {coach.fallbackReason ? ` · ${coach.fallbackReason}` : ""}
            </div>
          ) : null}
        </div>
        <div>
          <div className="score-num">{coach?.analysis?.overall ?? "—"}</div>
          <div className="muted">{coach?.analysis?.band?.label || "todavía no leímos el reloj"}</div>
          {scores ? (
            <div className="rings" style={{ marginTop: 12 }}>
              <Ring value={scores.sleep} label="Sueño" color="var(--accent)" />
              <Ring value={scores.movement} label="Movimiento" color="var(--accent-2)" />
              <Ring value={scores.recovery} label="Recupero" color="var(--accent)" />
              <Ring value={scores.rhythm} label="Ritmo" color="var(--accent-2)" />
            </div>
          ) : null}
        </div>
      </article>

      <article className="card">
        <div className="widget-head">
          <h2>Fuente de datos</h2>
          <span className="muted">{day?.connected ? "Fitbit en vivo" : persona === "mio" ? "Tus números" : "Demo local"}</span>
        </div>
        <div className="swatches">
          {sources.map((p) => (
            <button
              key={p.id}
              className={`swatch ${persona === p.id && !day?.connected ? "on" : ""}`}
              type="button"
              onClick={() => pickPersona(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          La demo no necesita cuenta. Pegá los números que ves hoy en Fitbit, o conectá OAuth: app Client en{" "}
          <a href="https://dev.fitbit.com/apps" target="_blank" rel="noreferrer">
            dev.fitbit.com
          </a>{" "}
          con callback <code>/api/fitbit/callback</code>.
        </p>
      </article>

      {showKeys || persona === "mio" ? (
        <article className="card">
          <h2>Tus números de Fitbit</h2>
          <p className="muted">
            Los copiás de la app (sueño de anoche, pasos de hoy, FC en reposo, HRV). El coach local arma el plan al
            toque; con clave NVIDIA, el relato lo escribe Llama 3.3.
          </p>
          <div className="kpi-grid">
            <Field label="Sueño anoche (h)">
              <input
                type="number"
                step="0.1"
                value={settings.mySleepHours}
                onChange={(e) => setSettings({ ...settings, mySleepHours: e.target.value })}
              />
            </Field>
            <Field label="Pasos de hoy">
              <input
                type="number"
                value={settings.mySteps}
                onChange={(e) => setSettings({ ...settings, mySteps: e.target.value })}
              />
            </Field>
            <Field label="FC en reposo">
              <input
                type="number"
                value={settings.myRhr}
                onChange={(e) => setSettings({ ...settings, myRhr: e.target.value })}
              />
            </Field>
            <Field label="HRV (ms)">
              <input
                type="number"
                value={settings.myHrv}
                onChange={(e) => setSettings({ ...settings, myHrv: e.target.value })}
              />
            </Field>
            <Field label="Minutos activos">
              <input
                type="number"
                value={settings.myActiveMinutes}
                onChange={(e) => setSettings({ ...settings, myActiveMinutes: e.target.value })}
              />
            </Field>
            <Field label="Agua (ml)">
              <input
                type="number"
                value={settings.myWaterMl}
                onChange={(e) => setSettings({ ...settings, myWaterMl: e.target.value })}
              />
            </Field>
          </div>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn primary" type="button" disabled={loading} onClick={() => pickPersona("mio")}>
              Leer con estos números
            </button>
          </div>

          <h2 style={{ marginTop: 24 }}>Metas y NVIDIA</h2>
          <div className="kpi-grid">
            <Field label="Cómo te decimos">
              <input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </Field>
            <Field label="El foco de hoy">
              <input value={settings.focus} onChange={(e) => setSettings({ ...settings, focus: e.target.value })} />
            </Field>
            <Field label="Meta de pasos">
              <input
                type="number"
                value={settings.stepsGoal}
                onChange={(e) => setSettings({ ...settings, stepsGoal: e.target.value })}
              />
            </Field>
            <Field label="Horas de sueño">
              <input
                type="number"
                step="0.5"
                value={settings.sleepGoal}
                onChange={(e) => setSettings({ ...settings, sleepGoal: e.target.value })}
              />
            </Field>
            <Field label="Hora de apagar">
              <input value={settings.bedtime} onChange={(e) => setSettings({ ...settings, bedtime: e.target.value })} />
            </Field>
            <Field label="Modelo NIM">
              <select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="NVIDIA API key (nvapi-…) — se queda en este navegador">
            <input
              type="password"
              placeholder="nvapi-…"
              value={settings.nvidiaKey}
              onChange={(e) => setSettings({ ...settings, nvidiaKey: e.target.value })}
            />
          </Field>
          <p className="muted">
            Gratis en{" "}
            <a href="https://build.nvidia.com" target="_blank" rel="noreferrer">
              build.nvidia.com
            </a>
            . Si no hay clave, el motor local igual te arma el plan.
          </p>
          {!fitbit.configured ? (
            <div className="banner" style={{ marginTop: 12 }}>
              Fitbit OAuth se activa con <code>FITBIT_CLIENT_ID</code> en el <code>.env</code> del servidor. Mientras
              tanto, las 3 personas de demo y tus números cubren el flujo completo.
            </div>
          ) : null}
        </article>
      ) : null}

      {error ? <div className="banner">{error}</div> : null}

      {narrative ? (
        <>
          <article className="card">
            <div className="kicker">Cómo está siendo</div>
            <h2>{narrative.headline}</h2>
            <p className="tagline">{narrative.dayStory}</p>
            {narrative.energyWindow ? (
              <p>
                <strong>Ventana de energía: </strong>
                {narrative.energyWindow}
              </p>
            ) : null}
          </article>
          <article className="card">
            <div className="kicker">Para tu mejor día posible</div>
            <h2>Qué tenés que hacer</h2>
            <ol className="plan">
              {(narrative.plan || []).map((step, i) => (
                <li key={i}>
                  <time>{step.when}</time>
                  <div>
                    <strong>{step.action}</strong>
                    <div className="muted">{step.why}</div>
                  </div>
                </li>
              ))}
            </ol>
            {(narrative.watchouts || []).length ? (
              <div style={{ marginTop: 16 }}>
                <h3>Ojo con</h3>
                <ul>
                  {narrative.watchouts.map((w) => (
                    <li key={w} className="muted">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {narrative.closing ? <p className="quote">{narrative.closing}</p> : null}
          </article>
        </>
      ) : (
        <article className="card">
          <p className="muted">
            Tocá <strong>Leer mi día</strong>, cargá tus números de Fitbit o elegí una persona de demo. El coach combina
            sueño + movimiento + recuperación y, si hay clave NVIDIA, escribe el relato.
          </p>
        </article>
      )}

      <p className="footer-note">
        No es consejo médico. Las métricas de demo imitan la Web API de Fitbit (activity, sleep, heart, HRV). NVIDIA
        NIM: <code>https://integrate.api.nvidia.com/v1</code>.
      </p>
    </div>
  );
}
