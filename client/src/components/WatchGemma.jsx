import { useEffect, useMemo, useState } from "react";
import { BatteryCharging, Cpu, DeviceMobile, Watch } from "@phosphor-icons/react";
import {
  DEFAULT_GEMMA_VARIANT,
  LIGHT_GEMMA_VARIANT,
  listGemmaModels,
  resolveGemmaVariant,
} from "@shared/gemma.js";
import { WATCH_QUESTIONS } from "@shared/watchMetrics.js";
import { Field } from "./ui.jsx";
import {
  askGemmaWatch,
  gemmaIsReady,
  loadGemmaOnDevice,
  postWatchReply,
  sendWatchNotification,
  unloadGemma,
} from "../lib/gemmaRuntime.js";

function formatBytes(loaded, total) {
  if (!total) return `${Math.round((loaded || 0) / 1048576)} MB`;
  const pct = Math.round((loaded / total) * 100);
  return `${Math.round(loaded / 1048576)} / ${Math.round(total / 1048576)} MB (${pct}%)`;
}

export function WatchGemma({ metrics, settings, setSettings, onReply }) {
  const models = useMemo(() => listGemmaModels(), []);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState(null);
  const [ready, setReady] = useState(false);
  const [busyAsk, setBusyAsk] = useState(false);

  const variant = resolveGemmaVariant({
    variant: settings.gemmaVariant || DEFAULT_GEMMA_VARIANT,
    batterySaver: settings.gemmaBatterySaver,
    deviceMemory: typeof navigator !== "undefined" ? navigator.deviceMemory : undefined,
  });
  const spec = models.find((m) => m.id === variant) || models[1];

  useEffect(() => {
    setReady(gemmaIsReady());
  }, [variant]);

  async function loadModel(file) {
    setError("");
    setStatus("loading");
    try {
      await unloadGemma();
      await loadGemmaOnDevice(variant, {
        hfToken: settings.hfToken,
        file,
        onProgress: setProgress,
      });
      setReady(true);
      setStatus("ready");
    } catch (err) {
      setReady(false);
      setStatus("error");
      setError(err.message);
    }
  }

  async function ask(questionId) {
    if (!metrics) return;
    setBusyAsk(true);
    setError("");
    try {
      const q = WATCH_QUESTIONS.find((item) => item.id === questionId) || WATCH_QUESTIONS[0];
      const result = await askGemmaWatch({
        question: q.ask,
        questionId: q.id,
        metrics,
        variantId: variant,
        profile: {
          name: settings.name,
          focus: settings.focus,
          stepsGoal: Number(settings.stepsGoal),
          sleepGoal: Number(settings.sleepGoal),
          timezone: settings.timezone,
          mode: settings.fitnessMode,
        },
      });
      setReply(result);
      onReply?.(result);
      await postWatchReply({
        text: result.watch,
        title: result.title,
        model: result.model,
        variant: result.variant || variant,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAsk(false);
    }
  }

  async function sendToWatch() {
    if (!reply?.watch) return;
    try {
      await sendWatchNotification(reply.title || "Lumen", reply.watch);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <article className="card gemma-card">
      <div className="widget-head">
        <h2>Gemma en el celular</h2>
        <span className={`chip ${ready ? "good" : ""}`}>
          {ready ? spec.name : "sin modelo cargado · motor local corto"}
        </span>
      </div>
      <p className="muted">
        El Fitbit no corre IA. El teléfono infiere con Gemma (MediaPipe / WebGPU) y le manda una frase a la pantalla
        del reloj. Charge 6 la ve como notificación del teléfono.
      </p>

      <div className="gemma-pick">
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            className={`swatch ${variant === model.id && !settings.gemmaBatterySaver ? "on" : ""}`}
            onClick={() =>
              setSettings({
                ...settings,
                gemmaVariant: model.id,
                gemmaBatterySaver: model.id === LIGHT_GEMMA_VARIANT ? settings.gemmaBatterySaver : false,
              })
            }
          >
            {model.label}
            <small>{model.name}</small>
          </button>
        ))}
        <button
          type="button"
          className={`swatch ${settings.gemmaBatterySaver ? "on" : ""}`}
          onClick={() =>
            setSettings({
              ...settings,
              gemmaBatterySaver: !settings.gemmaBatterySaver,
              gemmaVariant: !settings.gemmaBatterySaver ? LIGHT_GEMMA_VARIANT : settings.gemmaVariant,
            })
          }
        >
          Ahorro de batería
          <small>fuerza 270M</small>
        </button>
      </div>
      <p className="muted">{spec.blurb} Pesa {spec.sizeHint}, RAM ~{spec.ramHint}.</p>

      <div className="kpi-grid">
        <Field label="Token Hugging Face (hf_…)">
          <input
            type="password"
            placeholder="hf_… (licencia Gemma)"
            value={settings.hfToken || ""}
            onChange={(e) => setSettings({ ...settings, hfToken: e.target.value })}
          />
        </Field>
        <Field label="O cargá el archivo .task / .litertlm">
          <input
            type="file"
            accept=".task,.litertlm,.bin"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadModel(file);
            }}
          />
        </Field>
      </div>

      <div className="actions" style={{ marginTop: 12 }}>
        <button className="btn primary" type="button" disabled={status === "loading"} onClick={() => loadModel()}>
          {status === "loading" ? "Bajando Gemma…" : `Cargar ${spec.label} en el teléfono`}
        </button>
      </div>
      {progress && status === "loading" ? (
        <p className="muted" style={{ marginTop: 8 }}>
          {progress.cached ? "Ya estaba en caché." : formatBytes(progress.loaded, progress.total)}
        </p>
      ) : null}

      <h3 style={{ marginTop: 22 }}>Preguntale al reloj</h3>
      <div className="swatches" style={{ marginTop: 8 }}>
        {WATCH_QUESTIONS.map((q) => (
          <button key={q.id} className="swatch" type="button" disabled={busyAsk || !metrics} onClick={() => ask(q.id)}>
            {q.label}
          </button>
        ))}
      </div>

      {reply ? (
        <div className="watch-reply">
          <div className="watch-reply-face">
            <Watch size={18} weight="regular" />
            <strong>{reply.title}</strong>
            <p>{reply.watch}</p>
          </div>
          <p className="muted">
            Motor: {reply.engine === "gemma" ? reply.model : "local (números del reloj, sin Gemma cargado)"}
            {reply.fallbackReason ? ` · ${reply.fallbackReason}` : ""}
          </p>
          <div className="actions">
            <button className="btn primary" type="button" onClick={sendToWatch}>
              Enviar al Fitbit
            </button>
          </div>
        </div>
      ) : null}

      <ul className="gemma-loop">
        <li>
          <DeviceMobile size={16} /> Teléfono: baja y corre {spec.name}
        </li>
        <li>
          <Cpu size={16} /> Recibe métricas vivas del Fitbit (no inventa sensores)
        </li>
        <li>
          <Watch size={16} /> Respuesta de ≤180 caracteres para la pantalla
        </li>
        <li>
          <BatteryCharging size={16} /> Notificación del celular → el Charge 6 la muestra
        </li>
      </ul>

      {error ? <div className="banner" style={{ marginTop: 12 }}>{error}</div> : null}
    </article>
  );
}
