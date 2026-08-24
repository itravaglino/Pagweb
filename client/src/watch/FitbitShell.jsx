import GestureLayer from './GestureLayer.jsx';
import './FitbitShell.css';

export default function FitbitShell({
  children,
  haptic = false,
  awake = true,
  brightness = 100,
  onGesture,
  onSideButton,
}) {
  return (
    <div className="watch-stack">
      <div className="band band-top" />
      <div className={`watch-body ${haptic ? 'is-haptic' : ''} ${awake ? 'is-awake' : 'is-sleep'}`}>
        <button
          type="button"
          className="side-btn"
          aria-label="Botón lateral"
          data-testid="side-button"
          onClick={onSideButton}
        />
        <div className="watch-bezel">
          <GestureLayer onGesture={onGesture}>
            <div
              className="watch-glass"
              style={{
                filter: `brightness(${Math.max(0.35, (awake ? brightness : Math.min(brightness, 45)) / 100)})`,
              }}
            >
              {children}
            </div>
          </GestureLayer>
        </div>
        <div className="lugs top" />
        <div className="lugs bottom" />
      </div>
      <div className="band band-bottom" />
    </div>
  );
}
