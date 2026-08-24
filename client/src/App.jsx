import { useState } from 'react';
import FitbitShell from './watch/FitbitShell.jsx';
import ClockFace from './watch/ClockFace.jsx';
import StatsFace from './watch/StatsFace.jsx';
import HeartFace from './watch/HeartFace.jsx';
import ExerciseFace from './watch/ExerciseFace.jsx';
import ControlCenter from './watch/ControlCenter.jsx';
import GemmaBlob from './gemma/GemmaBlob.jsx';
import { useWatch } from './watch/useWatch.js';
import { formatTimer } from '@shared/router.js';
import './App.css';

function Screen({ watch }) {
  const layer = watch.layer || 'app';
  const screen = watch.screen === 'today' ? 'stats' : watch.screen;
  return (
    <>
      {layer === 'control' && (
        <ControlCenter
          muted={watch.muted}
          onMute={() => watch.setMuted((v) => !v)}
          onLoad={watch.loadOnDevice}
          onBle={watch.connectBle || watch.connectBleHr}
          onFitbit={watch.connectFitbitApi}
          brightness={watch.brightness}
          onBrightness={watch.setBrightness}
        />
      )}
      {layer === 'widgets' && <StatsFace metrics={watch.metrics} />}
      {layer === 'app' && screen === 'clock' && (
        <ClockFace now={watch.now} dimmed={!watch.awake} metrics={watch.metrics} />
      )}
      {layer === 'app' && screen === 'stats' && <StatsFace metrics={watch.metrics} />}
      {layer === 'app' && screen === 'heart' && <HeartFace metrics={watch.metrics} />}
      {layer === 'app' && screen === 'exercise' && (
        <ExerciseFace
          onStart={(sport) => {
            watch.goTo('gemma');
            watch.handleUtterance(`empiezo ${sport.label}`);
          }}
        />
      )}
      {layer === 'app' && screen === 'control' && (
        <ControlCenter
          muted={watch.muted}
          onMute={() => watch.setMuted((v) => !v)}
          onLoad={watch.loadOnDevice}
          onBle={watch.connectBle || watch.connectBleHr}
          onFitbit={watch.connectFitbitApi}
          brightness={watch.brightness}
          onBrightness={watch.setBrightness}
        />
      )}
      {layer === 'app' && screen === 'gemma' && (
        <GemmaBlob
          emotion={watch.emotion}
          bounce={watch.awake ? watch.bounce : 0.12}
          talking={watch.speaking}
          dimmed={!watch.awake}
        />
      )}

      {watch.listening && (
        <div className="overlay listen" data-testid="listen-overlay">
          <span className="pulse" />
          <p>Hey Gemma</p>
          <small>{watch.partial || 'Te escucho…'}</small>
        </div>
      )}

      {watch.thinking && !watch.listening && (
        <div className="overlay think" data-testid="think-overlay">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          <small>pensando</small>
        </div>
      )}

      {watch.bubble && screen === 'gemma' && layer === 'app' && !watch.listening && (
        <div className="speech-bubble" data-testid="speech-bubble">
          {watch.bubble}
        </div>
      )}

      {watch.timer && (
        <div className="timer-badge" data-testid="timer-badge">
          {formatTimer(watch.timer.remaining)}
        </div>
      )}

      {watch.loadingModels && watch.loadProgress && (
        <div className="overlay load" data-testid="load-overlay">
          <div className="bar">
            <i
              style={{
                width: `${Math.round(
                  ((watch.loadProgress.loaded || 0) / (watch.loadProgress.total || 1)) * 100,
                )}%`,
              }}
            />
          </div>
          <small>{watch.loadProgress.status || 'Cargando…'}</small>
        </div>
      )}

      {watch.menuOpen && (
        <div
          className="overlay menu"
          data-testid="watch-menu"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => {
            if (e.target === e.currentTarget) watch.setMenuOpen(false);
          }}
        >
          <button type="button" onClick={() => watch.goTo('gemma')}>Gemma</button>
          <button type="button" onClick={() => watch.goTo('clock')}>Reloj</button>
          <button type="button" onClick={() => watch.goTo('stats')}>Hoy</button>
          <button type="button" onClick={() => watch.goTo('heart')}>Ritmo</button>
          <button type="button" onClick={() => watch.goTo('exercise')}>Ejercicio</button>
          <button type="button" onClick={() => watch.goTo('control')}>Ajustes</button>
          <button type="button" onClick={watch.loadOnDevice}>Cargar Gemma</button>
          <button type="button" onClick={() => watch.setMuted((v) => !v)}>
            {watch.muted ? 'Activar voz' : 'Silenciar'}
          </button>
        </div>
      )}
    </>
  );
}

export default function App() {
  const watch = useWatch();
  const [draft, setDraft] = useState('');

  return (
    <div className="desk">
      <header className="topbar">
        <p className="brand">Fitbit Sense 2</p>
        <h1>Emulador · Gemma</h1>
        <p className="status" data-testid="model-status">
          {watch.statusText}
        </p>
      </header>

      <main className="stage">
        <aside className="hints">
          <h2>Gestos</h2>
          <ul>
            <li>Tap en Gemma para escuchar</li>
            <li>Doble tap activa el micrófono</li>
            <li>Swipe izq/der cambia Gemma, reloj y stats</li>
            <li>Swipe abajo abre ajustes</li>
            <li>Long press abre el menú</li>
            <li>Botón lateral vuelve al reloj</li>
          </ul>
          <h2>Voz</h2>
          <p>
            Di <em>hey Gemma</em>, <em>oye Gemma</em> o <em>hola Gemma</em>, o escríbelo abajo.
          </p>
        </aside>

        <FitbitShell
          haptic={watch.haptic}
          awake={watch.awake}
          brightness={watch.brightness}
          onGesture={watch.onGesture}
          onSideButton={watch.goClock}
        >
          <Screen watch={watch} />
        </FitbitShell>

        <aside className="hints right">
          <h2>Modelos</h2>
          <p>
            Demo inmediato. On-device: Gemma 3 270M para caras y tareas; Gemma 3 1B para
            preguntas.
          </p>
          <button
            type="button"
            className="pill"
            onClick={watch.loadOnDevice}
            disabled={watch.loadingModels}
          >
            {watch.loadingModels ? 'Cargando…' : 'Activar Gemma on-device'}
          </button>
          <button type="button" className="pill" onClick={watch.connectFitbitApi}>
            Conectar Fitbit Web API
          </button>
          <button type="button" className="pill" onClick={watch.connectBle}>
            Pulsómetro BLE
          </button>
          <p className="tiny">Hace falta Chrome con WebGPU para Gemma on-device. Si no hay GPU, seguimos en demo.</p>
        </aside>
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          watch.handleUtterance(text);
          setDraft('');
        }}
      >
        <input
          data-testid="composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="hey gemma, ¿qué hora es?"
          aria-label="Hablar con Gemma"
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
