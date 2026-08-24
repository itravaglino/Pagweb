import { useCallback, useEffect, useRef, useState } from 'react';
import { extractWake, formatClock, formatTimer, routeIntent } from '@shared/router.js';
import { nextScreen } from '@shared/gestures.js';
import { createFitbitDevice } from '@shared/fitbit-os/index.js';
import { createDemoRuntime, createDualRuntime } from '../models/runtime.js';
import { containsWake, createMic, isSpeechSupported, speak, stopSpeaking } from '../speech/speech.js';
import { connectBleHeartRate } from '../fitbit/bleHeartRate.js';

const SCREENS = ['gemma', 'clock', 'stats'];
const ALIASES = { today: 'stats', settings: 'control' };
const IDLE_MS = 22000;

function initialMetrics() {
  return { steps: 6428, hr: 71, calories: 1512, zone: 14, battery: 76 };
}

export function useWatch() {
  const [screen, setScreen] = useState('gemma');
  const [awake, setAwake] = useState(true);
  const [haptic, setHaptic] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [emotion, setEmotion] = useState('idle');
  const [bounce, setBounce] = useState(0.48);
  const [partial, setPartial] = useState('');
  const [bubble, setBubble] = useState('');
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [metrics, setMetrics] = useState(initialMetrics);
  const [timer, setTimer] = useState(null);
  const [modelMode, setModelMode] = useState('demo');
  const [loadProgress, setLoadProgress] = useState(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [statusText, setStatusText] = useState('Modo demo listo');
  const [brightness, setBrightness] = useState(100);

  const runtimeRef = useRef(createDemoRuntime());
  const deviceRef = useRef(null);
  const idleRef = useRef(null);
  const busyRef = useRef(false);
  const listenArmedRef = useRef(false);
  const mutedRef = useRef(muted);
  const metricsRef = useRef(metrics);
  const modelModeRef = useRef(modelMode);
  const screenRef = useRef(screen);
  const menuOpenRef = useRef(menuOpen);
  const awakeRef = useRef(awake);
  const loadingRef = useRef(false);

  mutedRef.current = muted;
  metricsRef.current = metrics;
  modelModeRef.current = modelMode;
  screenRef.current = screen;
  menuOpenRef.current = menuOpen;
  awakeRef.current = awake;

  const buzz = useCallback(() => {
    deviceRef.current?.vibration.start('nudge');
    setHaptic(true);
    window.setTimeout(() => setHaptic(false), 280);
  }, []);

  const wake = useCallback(() => {
    deviceRef.current?.display.poke();
    setAwake(true);
    setEmotion((current) => (current === 'sleepy' ? 'idle' : current));
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      setAwake(false);
      setMenuOpen(false);
      setListening(false);
      listenArmedRef.current = false;
      setEmotion('sleepy');
      setBounce(0.12);
    }, IDLE_MS);
  }, []);

  useEffect(() => {
    const device = createFitbitDevice();
    deviceRef.current = device;
    device.start();

    const onTick = (event) => setNow(event.date);
    const syncMetrics = () => {
      const zone = device.today.adjusted.activeZoneMinutes;
      setMetrics({
        steps: Math.round(device.today.adjusted.steps),
        calories: Math.round(device.today.adjusted.calories),
        zone: typeof zone === 'object' ? zone.total : zone || 0,
        hr: device.hrm.heartRate || 71,
        battery: device.battery.chargeLevel,
      });
    };

    device.clock.addEventListener('tick', onTick);
    device.hrm.addEventListener('reading', syncMetrics);
    device.activity.addEventListener('change', syncMetrics);
    device.battery.addEventListener('change', syncMetrics);
    syncMetrics();
    wake();

    const stroll = setInterval(() => {
      if (Math.random() < 0.45) device.activity.addSteps(1);
    }, 4000);

    return () => {
      clearInterval(stroll);
      device.clock.removeEventListener('tick', onTick);
      device.stop();
      window.clearTimeout(idleRef.current);
      runtimeRef.current?.dispose?.();
    };
  }, [wake]);

  useEffect(() => {
    if (!timer || timer.remaining <= 0) return undefined;
    const id = setInterval(() => {
      setTimer((t) => {
        if (!t) return t;
        if (t.remaining <= 1) return { ...t, remaining: 0, done: true };
        return { ...t, remaining: t.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!timer?.done) return;
    setTimer(null);
    setEmotion('excited');
    setBounce(0.9);
    setBubble('¡Listo! El timer terminó.');
    speak('¡Listo! El timer terminó.', { muted: mutedRef.current });
    buzz();
    wake();
  }, [timer, buzz, wake]);

  const applyRoute = useCallback((routed) => {
    setEmotion(routed.emotion || 'idle');
    setBounce(routed.bounce ?? 0.45);
    if (routed.intent === 'clock') setScreen('clock');
    if (routed.intent === 'stats') setScreen('stats');
    if (routed.intent === 'face' || routed.intent === 'chat') setScreen('gemma');
  }, []);

  const statusForMode = useCallback((mode) => {
    if (mode === 'dual') return 'Gemma 270M + 1B on-device';
    if (mode === 'light') return 'Gemma 3 270M on-device';
    return 'Modo demo';
  }, []);

  const handleUtterance = useCallback(
    async (raw, { requireWake = false } = {}) => {
      const text = String(raw || '').trim();
      if (!text || busyRef.current) return;
      const woken = extractWake(text);
      if (requireWake && !woken.woke && !listenArmedRef.current) return;
      const query = woken.woke ? woken.rest : text;
      if (!query) {
        listenArmedRef.current = true;
        setListening(true);
        setEmotion('listen');
        setBounce(0.35);
        setPartial('');
        setBubble('');
        setStatusText('Te escucho…');
        wake();
        return;
      }

      busyRef.current = true;
      listenArmedRef.current = false;
      setListening(false);
      setThinking(true);
      setSpeaking(false);
      setEmotion('think');
      setPartial(query);
      setBubble('');
      wake();
      buzz();

      try {
        const routed = await runtimeRef.current.route(query);
        applyRoute(routed);

        if (routed.intent === 'stop') {
          stopSpeaking();
          setTimer(null);
          const line = routed.reply || 'Vale.';
          setBubble(line);
          speak(line, { muted: mutedRef.current });
          setEmotion('idle');
          return;
        }

        if (routed.intent === 'timer' && routed.seconds) {
          setTimer({ remaining: routed.seconds, total: routed.seconds });
          setScreen('gemma');
          const line = routed.reply || `Timer de ${formatTimer(routed.seconds)}.`;
          setBubble(line);
          speak(line, { muted: mutedRef.current });
          setEmotion('excited');
          return;
        }

        if (routed.intent === 'clock') {
          const line = routed.reply || `Son las ${formatClock(new Date())}.`;
          setBubble(line);
          speak(line, { muted: mutedRef.current });
          return;
        }

        if (routed.intent === 'stats') {
          const m = metricsRef.current;
          const line = routed.reply || `Llevas ${m.steps} pasos y el corazón a ${m.hr}.`;
          setBubble(line);
          speak(line, { muted: mutedRef.current });
          return;
        }

        if (routed.intent === 'face') {
          const line = routed.reply || 'Cambio de cara.';
          setBubble(line);
          speak(line, { muted: mutedRef.current });
          return;
        }

        setScreen('gemma');
        setEmotion('think');
        let reply = '';
        for await (const token of runtimeRef.current.chat(query)) {
          reply += token;
          setBubble(reply);
        }
        const clean = reply.trim() || 'Estoy aquí.';
        setBubble(clean);
        setEmotion('speak');
        setSpeaking(true);
        speak(clean, { muted: mutedRef.current });
        window.setTimeout(() => {
          setSpeaking(false);
          setEmotion('happy');
        }, Math.min(8000, 900 + clean.length * 40));
      } catch (err) {
        console.warn(err);
        const fallback = routeIntent(query);
        applyRoute(fallback);
        setBubble('Me trabé un segundo, prueba otra vez.');
        setEmotion('confused');
      } finally {
        setThinking(false);
        busyRef.current = false;
        setStatusText(statusForMode(modelModeRef.current));
      }
    },
    [applyRoute, buzz, statusForMode, wake],
  );

  useEffect(() => {
    const mic = createMic({
      onPartial: (text) => {
        if (listenArmedRef.current || containsWake(text)) setPartial(text);
      },
      onFinal: (text) => {
        handleUtterance(text, { requireWake: true });
      },
      onError: (err) => {
        if (err !== 'no-speech' && err !== 'aborted') {
          setStatusText('Micrófono no disponible · usa el teclado');
        }
      },
    });
    if (mic.supported) mic.start();
    else setStatusText((s) => (s.includes('escribe') ? s : `${s} · escribe abajo`));
    return () => mic.stop();
  }, [handleUtterance]);

  const onGesture = useCallback(
    (g) => {
      wake();
      if (g.type === 'swipe') {
        setMenuOpen(false);
        if (g.dir === 'down') {
          setScreen('control');
          buzz();
          return;
        }
        if (g.dir === 'up') {
          setScreen('heart');
          buzz();
          return;
        }
        setScreen((cur) => {
          const base = SCREENS.includes(cur) ? cur : 'gemma';
          return nextScreen(base, g.dir, SCREENS);
        });
        buzz();
        return;
      }
      if (g.type === 'longpress') {
        setMenuOpen(true);
        buzz();
        return;
      }
      if (g.type === 'doubletap') {
        listenArmedRef.current = !listenArmedRef.current;
        setListening(listenArmedRef.current);
        setEmotion(listenArmedRef.current ? 'listen' : 'idle');
        if (listenArmedRef.current) setPartial('');
        buzz();
        return;
      }
      if (g.type === 'tap') {
        if (menuOpenRef.current) {
          setMenuOpen(false);
          return;
        }
        if (screenRef.current === 'gemma' && awakeRef.current) {
          listenArmedRef.current = true;
          setListening(true);
          setEmotion('listen');
          setPartial('');
        }
      }
    },
    [buzz, wake],
  );

  const loadOnDevice = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingModels(true);
    setMenuOpen(false);
    setLoadProgress({ status: 'Buscando WebGPU…', loaded: 0, total: 1 });
    setStatusText('Cargando Gemma on-device…');
    try {
      const runtime = await createDualRuntime({
        onProgress: setLoadProgress,
      });
      runtimeRef.current?.dispose?.();
      runtimeRef.current = runtime;
      setModelMode(runtime.mode);
      if (runtime.mode === 'demo') {
        setStatusText('Sin WebGPU · seguimos en demo');
        setBubble('Sigo en demo, pero lista.');
      } else if (runtime.mode === 'dual') {
        setStatusText('Gemma 270M + 1B on-device');
        setBubble('Modelos listos en tu dispositivo.');
      } else {
        setStatusText('Gemma 3 270M on-device');
        setBubble('Gemma 270M lista en tu dispositivo.');
      }
      setEmotion('happy');
      setBounce(0.7);
    } finally {
      loadingRef.current = false;
      setLoadingModels(false);
    }
  }, []);

  const goTo = useCallback(
    (name) => {
      setScreen(ALIASES[name] || name);
      setMenuOpen(false);
      setListening(false);
      listenArmedRef.current = false;
      wake();
      buzz();
    },
    [buzz, wake],
  );

  const goClock = useCallback(() => goTo('clock'), [goTo]);

  const connectBle = useCallback(async () => {
    setMenuOpen(false);
    setStatusText('Buscando pulsómetro BLE…');
    try {
      await connectBleHeartRate({
        onBpm: (bpm) => deviceRef.current?.hrm.ingestExternal(bpm),
        onStatus: setStatusText,
      });
    } catch (err) {
      setStatusText(err?.message || 'BLE no disponible');
    }
  }, []);

  const connectFitbitApi = useCallback(async () => {
    setMenuOpen(false);
    try {
      const { fetchFitbitStatus, fetchFitbitToday, fitbitLoginUrl } = await import('../fitbit/webClient.js');
      const status = await fetchFitbitStatus();
      if (!status.configured) {
        setStatusText('Configura FITBIT_CLIENT_ID para la Web API');
        return;
      }
      if (!status.connected) {
        window.location.href = fitbitLoginUrl();
        return;
      }
      const today = await fetchFitbitToday();
      if (today?.summary) {
        deviceRef.current?.activity.ingestFitbitSummary(today.summary);
        if (today.restingHeartRate) deviceRef.current?.hrm.setBaseline(today.restingHeartRate);
        setStatusText(`Fitbit Web API · ${today.profile?.name || 'conectado'}`);
      }
    } catch {
      setStatusText('Fitbit Web API no disponible');
    }
  }, []);

  return {
    screen,
    setScreen: goTo,
    awake,
    haptic,
    menuOpen,
    setMenuOpen,
    listening,
    thinking,
    speaking,
    emotion,
    bounce,
    partial,
    bubble,
    muted,
    setMuted,
    now,
    metrics,
    timer,
    modelMode,
    loadProgress,
    loadingModels,
    statusText,
    speechOk: isSpeechSupported(),
    onGesture,
    handleUtterance,
    loadOnDevice,
    goClock,
    goTo,
    wake,
    brightness,
    setBrightness,
    connectBle,
    connectFitbitApi,
  };
}
