import { useEffect, useRef, useState } from "react";
import {
  completeByPhrase,
  defaultGoals,
  loadStoredTasks,
  localVoiceReply,
  mergeTasks,
  progressVsGoals,
  saveStoredTasks,
} from "@shared/tasks.js";
import { CHARACTER } from "@shared/character.js";
import { fetchVoice } from "../lib/api.js";
import {
  archiveVoiceDay,
  canUseMic,
  canUseSpeech,
  createRecognizer,
  speakSpanish,
  startRecorder,
  stopSpeaking,
} from "../lib/voice.js";
import "./VoiceCoach.css";

const DEMO_HINT =
  "Hoy me fue bien, dormí decente. Tengo que mandar el TP de macro, pasar por Smart Fit y llamar a mamá.";

export function VoiceCoach({ metrics, persona, settings, character, embedded = false }) {
  const [tasks, setTasks] = useState(() =>
    typeof localStorage === "undefined" ? [] : loadStoredTasks(localStorage)
  );
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [spoken, setSpoken] = useState("");
  const [progressRows, setProgressRows] = useState([]);
  const [noticing, setNoticing] = useState("");
  const [engine, setEngine] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const recRef = useRef(null);
  const micRef = useRef(null);
  const finalBits = useRef("");

  const summary = character?.summary;
  const goals = defaultGoals({
    sleepHours: settings?.sleepGoal,
    steps: persona === CHARACTER.id ? CHARACTER.goal.steps : settings?.stepsGoal,
    gymPerWeek: CHARACTER.goal.gymPerWeek,
  });
  const speechOk = canUseSpeech();
  const micOk = canUseMic();

  useEffect(() => {
    if (typeof localStorage !== "undefined") saveStoredTasks(localStorage, tasks);
  }, [tasks]);

  useEffect(() => {
    if (!metrics) return;
    setProgressRows(progressVsGoals(metrics, goals, summary).rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics, persona, summary]);

  useEffect(
    () => () => {
      stopSpeaking();
      recRef.current?.stop?.();
      micRef.current?.stream?.getTracks?.().forEach((track) => track.stop());
    },
    []
  );

  function playSpoken(text = spoken) {
    if (!text) return;
    setSpeaking(true);
    speakSpanish(text, {
      onend: () => setSpeaking(false),
      onerror: () => setSpeaking(false),
    });
  }

  function stopPlay() {
    stopSpeaking();
    setSpeaking(false);
  }

  function toggleTask(id) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, done: !task.done, doneAt: !task.done ? new Date().toISOString() : null }
          : task
      )
    );
  }

  async function sendTranscript(raw) {
    const text = String(raw || "").trim();
    if (!text) return;
    setStatus("thinking");
    setError("");
    const optimistic = completeByPhrase(tasks, text);
    if (optimistic.completed.length) setTasks(optimistic.tasks);
    const payload = {
      transcript: text,
      metrics,
      openTasks: optimistic.completed.length ? optimistic.tasks : tasks,
      goals,
      persona: persona || CHARACTER.id,
      nvidiaKey: settings?.nvidiaKey,
      model: settings?.model,
      summary,
    };
    try {
      const data = await fetchVoice(payload);
      setTasks((prev) => mergeTasks(prev, data.tasks || []));
      setSpoken(data.spoken || "");
      setProgressRows(data.progressVsGoals || progressVsGoals(metrics, goals, summary).rows);
      setNoticing(data.noticing || "");
      setEngine(data.engine || "nvidia");
      setStatus("done");
      if (data.spoken) playSpoken(data.spoken);
      archiveVoiceDay({
        transcript: text,
        tasks: data.tasks,
        spoken: data.spoken,
        persona: payload.persona,
        engine: data.engine,
      });
    } catch (err) {
      const fallback = localVoiceReply({
        transcript: text,
        metrics,
        openTasks: payload.openTasks,
        goals,
        summary,
        persona: payload.persona,
      });
      setTasks(fallback.tasks);
      setSpoken(fallback.spoken);
      setProgressRows(fallback.progressVsGoals);
      setNoticing(fallback.noticing);
      setEngine("local");
      setError(err.message || "fallback local");
      setStatus("done");
      playSpoken(fallback.spoken);
    }
  }

  async function toggleMic() {
    if (status === "recording") {
      recRef.current?.stop?.();
      recRef.current = null;
      if (micRef.current?.stop) await micRef.current.stop();
      micRef.current = null;
      const text = `${finalBits.current} ${partial}`.trim() || transcript;
      setPartial("");
      setStatus("idle");
      await sendTranscript(text);
      return;
    }
    setError("");
    finalBits.current = "";
    setPartial("");
    setTranscript("");
    try {
      if (micOk) micRef.current = await startRecorder();
    } catch {
      setError("El micrófono no arrancó. Escribí abajo cómo viene el día.");
    }
    const rec = createRecognizer({
      lang: "es-AR",
      onPartial: (value) => setPartial(value),
      onFinal: (value) => {
        finalBits.current = `${finalBits.current} ${value}`.trim();
        setTranscript(finalBits.current);
      },
      onError: (msg) => {
        if (msg !== "no-speech") setError("Sin reconocimiento de voz: usá el recuadro.");
      },
    });
    recRef.current = rec;
    try {
      rec?.start?.();
    } catch {
      /* already started */
    }
    setStatus("recording");
    if (!rec && !micOk) setError("Este navegador no graba. Escribí el día en el recuadro.");
  }

  const openCount = tasks.filter((task) => !task.done).length;
  const doneCount = tasks.filter((task) => task.done).length;
  const rows = progressRows.length
    ? progressRows
    : metrics
      ? progressVsGoals(metrics, goals, summary).rows
      : [];

  const Wrap = embedded ? "section" : "article";

  return (
    <Wrap
      className={embedded ? "voice-slot voice-coach" : "card voice-coach"}
      data-voice-loop="nacho"
      data-testid="voice-coach"
    >
      <div className="widget-head">
        <div>
          {embedded ? null : <div className="kicker">Voz · Nacho</div>}
          <h2>{embedded ? "Voz" : "Decime cómo viene el día"}</h2>
        </div>
        <span className="chip">{engine === "nvidia" ? "NIM" : engine === "local" ? "local" : "mic"}</span>
      </div>
      <p className="muted">
        Grabá o escribí el día. Lumen compara con tus metas y las 4 semanas de {CHARACTER.nickname}.
      </p>

      <div className="voice-coach-controls">
        <button
          className={`btn primary ${status === "recording" ? "voice-rec-on" : ""}`}
          type="button"
          data-testid="voice-mic"
          onClick={toggleMic}
        >
          {status === "recording" ? "Parar y mandar" : "Mic · es-AR"}
        </button>
        <button className="btn" type="button" data-testid="voice-play" disabled={!spoken} onClick={() => playSpoken()}>
          {speaking ? "Reescuchar" : "Play"}
        </button>
        <button className="btn" type="button" data-testid="voice-stop" disabled={!speaking} onClick={stopPlay}>
          Stop
        </button>
        <span className="muted">{speechOk ? "reconocimiento listo" : "sin Web Speech · usá el texto"}</span>
      </div>

      <label className="field">
        <span>Transcripción</span>
        <textarea
          data-testid="voice-transcript"
          value={partial ? `${transcript} ${partial}`.trim() : transcript}
          placeholder={DEMO_HINT}
          onChange={(e) => setTranscript(e.target.value)}
          rows={3}
        />
      </label>
      <div className="actions" style={{ marginTop: 8 }}>
        <button
          className="btn primary"
          type="button"
          data-testid="voice-send"
          disabled={status === "thinking"}
          onClick={() => sendTranscript(transcript || DEMO_HINT)}
        >
          {status === "thinking" ? "Pensando…" : "Mandar"}
        </button>
        <button className="btn" type="button" onClick={() => setTranscript(DEMO_HINT)}>
          Pegar ejemplo
        </button>
      </div>
      {error ? <div className="banner banner-error">{error}</div> : null}

      {spoken ? (
        <blockquote className="voice-spoken" data-testid="voice-spoken">
          {spoken}
        </blockquote>
      ) : null}
      {noticing ? <p className="muted">{noticing}</p> : null}

      <div className="voice-progress" data-testid="voice-progress">
        <h3>Vs metas y vs 4 semanas</h3>
        <ul>
          {rows.map((row) => (
            <li key={row.id || row.label} className={row.metGoal ? "ok" : ""}>
              <strong>{row.label}</strong>
              <span>{row.cite || `${row.today} · meta ${row.goal} · prom. ${row.average}`}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="voice-tasks">
        <div className="widget-head">
          <h3>Para hoy</h3>
          <span className="muted">
            {openCount} abiertas · {doneCount} tachadas
          </span>
        </div>
        <ul data-testid="voice-task-list">
          {tasks.length ? (
            tasks.map((task) => (
              <li key={task.id} className={task.done ? "done" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(task.done)}
                    data-testid={`voice-task-${task.id}`}
                    onChange={() => toggleTask(task.id)}
                  />
                  <span>{task.title}</span>
                </label>
              </li>
            ))
          ) : (
            <li className="muted">Todavía no hay lista. Contá el día o pegá el ejemplo.</li>
          )}
        </ul>
      </div>
    </Wrap>
  );
}
