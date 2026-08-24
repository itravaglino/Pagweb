import './faces.css';

export default function ControlCenter({ muted, onMute, onLoad, onBle, onFitbit, brightness, onBrightness }) {
  return (
    <div className="control-center" data-testid="control-center">
      <p className="today-kicker">Ajustes</p>
      <div className="control-grid">
        <button type="button" onClick={onMute}>{muted ? 'Voz off' : 'Voz on'}</button>
        <button type="button" onClick={onLoad}>Gemma</button>
        <button type="button" onClick={onBle}>HR BLE</button>
        <button type="button" onClick={onFitbit}>Fitbit API</button>
      </div>
      <label className="bright">
        Brillo
        <input
          type="range"
          min="40"
          max="100"
          value={brightness}
          onChange={(e) => onBrightness(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
