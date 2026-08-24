import { formatClock } from '@shared/router.js';
import './faces.css';

export default function ClockFace({ now, dimmed }) {
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hourDeg = hours * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const day = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(now);

  return (
    <div className={`clock-face ${dimmed ? 'is-dim' : ''}`} data-testid="clock-face">
      <div className="clock-ring">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className={`tick${i % 3 === 0 ? ' major' : ''}`}
            style={{
              transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-88px)`,
            }}
          />
        ))}
        <span className="hand hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
        <span className="hand minute" style={{ transform: `rotate(${minuteDeg}deg)` }} />
        <span className="cap" />
      </div>
      <div className="clock-digital">
        <strong>{formatClock(now)}</strong>
        <em>{day}</em>
      </div>
    </div>
  );
}
