import { formatClock } from '@shared/router.js';
import './faces.css';

function FitbitDots() {
  return (
    <span className="fitbit-dots" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export default function ClockFace({ now, dimmed, metrics }) {
  const day = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now);

  return (
    <div className={`clock-face os5 ${dimmed ? 'is-dim' : ''}`} data-testid="clock-face">
      <header className="clock-top">
        <FitbitDots />
        <span className="batt">{metrics?.battery ?? 76}%</span>
      </header>
      <p className="clock-time">{formatClock(now)}</p>
      <p className="clock-date">{day}</p>
      <footer className="clock-complications">
        <div>
          <small>FC</small>
          <strong>{metrics?.hr ?? '--'}</strong>
        </div>
        <div>
          <small>Pasos</small>
          <strong>{metrics?.steps ?? 0}</strong>
        </div>
      </footer>
    </div>
  );
}
