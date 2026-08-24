import './faces.css';

export default function HeartFace({ metrics }) {
  const bpm = metrics.hr || 0;
  const zone =
    bpm >= 150 ? 'Pico' : bpm >= 120 ? 'Cardio' : bpm >= 90 ? 'Quema grasa' : 'Reposo';
  return (
    <div className="heart-face" data-testid="heart-face">
      <p className="today-kicker">Ritmo</p>
      <p className="heart-bpm">
        {bpm}
        <small>ppm</small>
      </p>
      <p className="heart-zone">{zone}</p>
      <div className="heart-bar">
        <i className="z fat" />
        <i className="z cardio" />
        <i className="z peak" />
      </div>
    </div>
  );
}
