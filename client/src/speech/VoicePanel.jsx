import { useEffect, useState } from 'react';
import { VOICE_PRESETS } from '@shared/voices.js';
import { listVoices, waitForVoices } from './speech.js';
import './VoicePanel.css';

export default function VoicePanel({ settings, onChange, muted, onMute, onPreview }) {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    let alive = true;
    waitForVoices().then((list) => {
      if (alive) setVoices(list);
    });
    const refresh = () => setVoices(listVoices());
    window.speechSynthesis?.addEventListener?.('voiceschanged', refresh);
    return () => {
      alive = false;
      window.speechSynthesis?.removeEventListener?.('voiceschanged', refresh);
    };
  }, []);

  const spanish = voices.filter((v) => String(v.lang || '').toLowerCase().startsWith('es'));
  const options = spanish.length ? spanish : voices;

  const patch = (partial) => onChange({ ...settings, ...partial });

  return (
    <section className="voice-panel" data-testid="voice-panel">
      <h2>Voz</h2>
      <p>Elige una voz del sistema. Priorizamos voces Neural en español.</p>
      <div className="voice-presets">
        {Object.values(VOICE_PRESETS).map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={settings.preset === preset.id ? 'is-on' : ''}
            onClick={() =>
              onChange({
                ...settings,
                preset: preset.id,
                rate: preset.rate,
                pitch: preset.pitch,
                volume: preset.volume,
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label>
        Voz
        <select
          data-testid="voice-select"
          value={settings.voiceURI}
          onChange={(e) => patch({ voiceURI: e.target.value })}
        >
          <option value="">Automática (mejor español)</option>
          {options.map((v) => (
            <option key={v.voiceURI || v.name} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </label>
      <label>
        Ritmo {settings.rate.toFixed(2)}
        <input
          type="range"
          min="0.7"
          max="1.35"
          step="0.02"
          value={settings.rate}
          onChange={(e) => patch({ rate: Number(e.target.value), preset: 'custom' })}
        />
      </label>
      <label>
        Tono {settings.pitch.toFixed(2)}
        <input
          type="range"
          min="0.7"
          max="1.4"
          step="0.02"
          value={settings.pitch}
          onChange={(e) => patch({ pitch: Number(e.target.value), preset: 'custom' })}
        />
      </label>
      <label>
        Volumen {Math.round(settings.volume * 100)}%
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.volume}
          onChange={(e) => patch({ volume: Number(e.target.value) })}
        />
      </label>
      <div className="voice-actions">
        <button type="button" className="pill ghost" onClick={onMute}>
          {muted ? 'Activar voz' : 'Silenciar'}
        </button>
        <button type="button" className="pill" onClick={onPreview} disabled={muted}>
          Probar voz
        </button>
      </div>
    </section>
  );
}
