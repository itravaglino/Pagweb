import { useEffect, useMemo, useRef, useState } from "react";
import { FitbitViz } from "../components/FitbitViz.jsx";
import { CharacterCalendar, CharacterHeader } from "../components/CharacterCalendar.jsx";
import { CoachAgent } from "../components/CoachAgent.jsx";
import { Field, Ring } from "../components/ui.jsx";
import { minutesToHm } from "@shared/analyze.js";
import { PERSONAS } from "@shared/sampleFitbit.js";
import { CHARACTER, CHARACTER_TO } from "@shared/character.js";
import {
  DEFAULT_NVIDIA_MODEL,
  FITNESS_MODE_ORDER,
  FITNESS_MODES,
  NVIDIA_DOCS,
  NVIDIA_MODELS,
  tileForField,
} from "@shared/fitness.js";
import { fetchCharacter, fetchCharacterDays, fetchCoach, fetchDay, fetchFitbitStatus, fetchNvidiaStatus } from "../lib/api.js";
import { saveCoachEntry } from "../lib/db.js";

const FALLBACK_PERSONAS = [
  { id: "mixto", label: "Martes UNC" },
  { id: "recargado", label: "Sábado gym" },
  { id: "agotado", label: "Post parcial" },
  { id: "examen", label: "Semana de mesas" },
  { id: "barrio", label: "Domingo Güemes" },
];

function subjectProfile(settings, day, personaId) {
  const isCami = personaId === CHARACTER.id || day?.character;
  if (isCami) {
    return {
      name: CHARACTER.nickname,
      nickname: CHARACTER.nickname,
      fullName: CHARACTER.name,
      focus: "facu FCE-UNC, gym Smart Fit y no romper el sueño",
      stepsGoal: CHARACTER.goal.steps,
      sleepGoal: CHARACTER.goal.sleepHours,
      activeGoal: 30,
      bedtime: settings.bedtime,
      timezone: CHARACTER.timezone,
      org: CHARACTER.faculty,
      city: CHARACTER.city,
      barrio: CHARACTER.barrio,
      faculty: CHARACTER.faculty,
      role: "estudiante",
      device: CHARACTER.device,
      mode: settings.fitnessMode || "general",
    };
  }
  return {
    name: settings.name,
    nickname: settings.name,
    focus: settings.focus,
    stepsGoal: Number(settings.stepsGoal),
    sleepGoal: Number(settings.sleepGoal),
    activeGoal: Number(settings.activeGoal),
    bedtime: settings.bedtime,
    timezone: settings.timezone,
    org: "UNC",
    city: "Córdoba",
    barrio: "",
    role: "estudiante",
    device: "Fitbit Charge 6",
    mode: settings.fitnessMode || "general",
  };
}

export function Wellness({ settings, setSettings }) {
  const [personas, setPersonas] = useState(Object.values(PERSONAS));
  const [persona, setPersona] = useState("mixto");
  const [day, setDay] = useState(null);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [fitbit, setFitbit] = useState({ configured: false, connected: false });
  const [nvidia, setNvidia] = useState({ connected: false, source: "none" });
  const [showKeys, setShowKeys] = useState(false);
  const [character, setCharacter] = useState({ identity: CHARACTER, summary: null });
  const [characterDays, setCharacterDays] = useState([]);
  const [camiDate, setCamiDate] = useState(CHARACTER_TO);
  const [highlightField, setHighlightField] = useState("");
  const pickSeq = useRef(0);
  const writeTimer = useRef(null);

  const metrics = day?.metrics;
  const sources = useMemo(
    () => [
      { id: CHARACTER.id, label: `Hoy · ${CHARACTER.nickname}` },
      ...(personas.length ? personas : FALLBACK_PERSONAS),
      { id: "mio", label: "Mis números" },
    ],
    [personas]
  );

  async function loadDay(nextPersona = persona, source, seq, date) {
    const opts = nextPersona === CHARACTER.id || date ? { date: date || camiDate || CHARACTER_TO } : {};
    const data = await fetchDay(nextPersona, source, settings, opts);
    if (seq != null && seq !== pickSeq.current) return data;
    setDay(data);
    if (data.personas) setPersonas(data.personas);
    if (data.date && nextPersona === CHARACTER.id) setCamiDate(data.date);
    return data;
  }

  async function loadStatus() {
    const [fitbitStatus, nvidiaStatus] = await Promise.all([fetchFitbitStatus(), fetchNvidiaStatus()]);
    setFitbit(fitbitStatus);
    setNvidia(nvidiaStatus);
  }

  async function runCoach(fromDay, nextSettings = settings, { persist = true, personaId = persona, seq } = {}) {
    setLoading(true);
    setPhase("reading");
    setError("");
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => setPhase("writing"), 480);
    try {
      const payload = fromDay || day || (await loadDay());
      if (seq != null && seq !== pickSeq.current) return;
      const mode = nextSettings.fitnessMode || "general";
      const profile = subjectProfile(nextSettings, payload, personaId);
      const data = await fetchCoach({
        metrics: payload.metrics,
        persona: personaId,
        nvidiaKey: nextSettings.nvidiaKey || undefined,
        model: nextSettings.model || DEFAULT_NVIDIA_MODEL,
        mode,
        profile,
        history: character.summary,
      });
      if (seq != null && seq !== pickSeq.current) return;
      setCoach({ ...data, writtenFor: data.writtenFor || profile.nickname || profile.name });
      setPhase("ready");
      if (persist) {
        saveCoachEntry({
          persona: personaId,
          label: profile.nickname || profile.name,
          metrics: payload.metrics,
          analysis: data.analysis,
          narrative: data.narrative,
          engine: data.engine,
          mode,
        }).catch(() => {});
      }
    } catch (err) {
      if (seq != null && seq !== pickSeq.current) return;
      setError(err.message);
      setPhase("ready");
    } finally {
      if (writeTimer.current) clearTimeout(writeTimer.current);
      if (seq == null || seq === pickSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadStatus();
      fetchCharacter()
        .then((info) => {
          if (!cancelled) setCharacter(info);
        })
        .catch(() => {});
      fetchCharacterDays()
        .then((info) => {
          if (!cancelled) setCharacterDays(info.days || []);
        })
        .catch(() => {});
      const data = await loadDay();
      if (cancelled) return;
      await runCoach(data, settings, { persist: false });
    })();
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    if (params.get("fitbit") === "error") {
      setError(params.get("reason") || "Fitbit no autorizó");
    }
    return () => {
      cancelled = true;
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
    // Primera lectura al entrar a Mejor Día.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickPersona(id) {
    const seq = ++pickSeq.current;
    setPersona(id);
    setCoach(null);
    setHighlightField("");
    if (id === "mio") setShowKeys(true);
    const data = await loadDay(id, id === "mio" ? undefined : "demo", seq);
    if (seq !== pickSeq.current) return;
    await runCoach(data, settings, { persist: true, personaId: id, seq });
  }

  async function pickCharacterHoy() {
    await pickPersona(CHARACTER.id);
  }

  async function pickCamiDay(entry) {
    const seq = ++pickSeq.current;
    setPersona(CHARACTER.id);
    setCamiDate(entry.date);
    setCoach(null);
    setHighlightField("");
    const data = await loadDay(CHARACTER.id, "demo", seq, entry.date);
    if (seq !== pickSeq.current) return;
    await runCoach(data, settings, { persist: true, personaId: CHARACTER.id, seq });
  }

  async function pickMode(id) {
    const next = { ...settings, fitnessMode: id };
    setSettings(next);
    setCoach(null);
    await runCoach(day, next);
  }

  function focusMetric(field) {
    if (!field) return;
    setHighlightField(field);
    const tile = tileForField(field);
    const node = document.getElementById(`fitbit-tile-${tile}`) || document.getElementById("fitbit-reloj");
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const nvidiaReady =
    nvidia.connected || Boolean(settings.nvidiaKey && String(settings.nvidiaKey).startsWith("nvapi-"));
  const activeMode = FITNESS_MODES[settings.fitnessMode] || FITNESS_MODES.general;
  const scores = coach?.analysis?.scores;
  const who = persona === CHARACTER.id ? CHARACTER.nickname : settings.name || "Nacho";

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
      <CoachAgent
        coach={coach}
        loading={loading}
        phase={phase}
        nvidiaReady={nvidiaReady}
        writtenFor={who}
        modeLabel={activeMode.label}
        onNoticing={focusMetric}
        highlightField={highlightField}
      />

      <article className="card wellness-hero">
        <div>
          <div className="kicker">Fitbit Charge 6 × el agente</div>
          <h2>El reloj de {who}</h2>
          <p className="tagline">
            Tocá un día o un modo. El agente lee sueño, HRV, pasos, AZM y el diario, y te escribe el plan arriba.
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
              {loading ? "Escribiendo…" : "Recalcular el día"}
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
          <div className="swatches" style={{ marginTop: 12 }}>
            {FITNESS_MODE_ORDER.map((id) => (
              <button
                key={id}
                className={`swatch ${(settings.fitnessMode || "general") === id ? "on" : ""}`}
                type="button"
                onClick={() => pickMode(id)}
              >
                {FITNESS_MODES[id].label}
              </button>
            ))}
          </div>
          <p className="muted mode-hint">{activeMode.blurb}</p>
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
          <span className="muted">
            {day?.connected
              ? "Fitbit en vivo"
              : persona === "mio"
                ? "Tus números"
                : persona === CHARACTER.id
                  ? `${camiDate} · ${CHARACTER.nickname} en ${CHARACTER.barrio}`
                  : PERSONAS[persona]?.blurb || "Demo Fitbit"}
          </span>
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
          Post parcial, mesas o un día de {CHARACTER.nickname}: el agente tiene que cambiar lo que nota. También hay cinco
          personas sintéticas de Córdoba (Charge 6).
        </p>
        {persona === CHARACTER.id && characterDays.length ? (
          <div style={{ marginTop: 16 }}>
            <CharacterCalendar days={characterDays} selectedDate={camiDate} onSelect={pickCamiDay} />
          </div>
        ) : null}
      </article>

      {metrics ? (
        <article className="card" id="fitbit-reloj">
          <div className="widget-head">
            <h2>El reloj, en números</h2>
            <span className="muted">{metrics.date}</span>
          </div>
          <FitbitViz metrics={metrics} highlightTile={highlightField ? tileForField(highlightField) : undefined} />
        </article>
      ) : null}

      <CharacterHeader
        identity={character.identity || CHARACTER}
        summary={character.summary}
        onLoadHoy={pickCharacterHoy}
        loading={loading && persona === CHARACTER.id}
      />

      <article className="card nvidia-card">
        <div className="widget-head">
          <h2>NVIDIA Developer (clave)</h2>
          <span className={`chip ${nvidiaReady ? "good" : ""}`}>
            {nvidiaReady
              ? nvidia.connected
                ? "conectado (servidor)"
                : "clave en este navegador"
              : "sin clave · motor local"}
          </span>
        </div>
        <p className="muted">
          El agente de arriba es Lumen. Si hay{" "}
          <a href={NVIDIA_DOCS} target="_blank" rel="noreferrer">
            NVIDIA NIM
          </a>{" "}
          (clave <code>nvapi-</code> en{" "}
          <a href={NVIDIA_DOCS} target="_blank" rel="noreferrer">
            build.nvidia.com
          </a>
          ), escribe él. Si no, el motor local cita los mismos números para que la demo no se caiga.
        </p>
        {showKeys ? (
          <div className="kpi-grid">
            <Field label="API key (nvapi-…) — queda en este navegador">
              <input
                type="password"
                placeholder="nvapi-…"
                value={settings.nvidiaKey}
                onChange={(e) => setSettings({ ...settings, nvidiaKey: e.target.value })}
              />
            </Field>
            <Field label="Modelo NIM">
              <select
                value={settings.model || DEFAULT_NVIDIA_MODEL}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              >
                {NVIDIA_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <button className="btn" type="button" onClick={() => setShowKeys(true)}>
            Mostrar clave y modelo
          </button>
        )}
      </article>

      {showKeys || persona === "mio" ? (
        <article className="card">
          <h2>Tus números de Fitbit</h2>
          <p className="muted">
            Los copiás de la app (sueño de anoche, pasos de hoy, FC en reposo, HRV). El agente local arma el plan al
            toque; con clave NVIDIA, el relato lo escribe Llama.
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

          <h2 style={{ marginTop: 24 }}>Metas (van al prompt de NVIDIA)</h2>
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
                {NVIDIA_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </article>
      ) : null}

      {error ? <div className="banner">{error}</div> : null}

      <p className="footer-note">
        No es consejo médico. Las métricas de demo imitan la Web API de Fitbit. NVIDIA NIM:{" "}
        <code>https://integrate.api.nvidia.com/v1</code>.
      </p>
    </div>
  );
}
