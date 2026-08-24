import './faces.css';

const SPORTS = [
  { id: 'walk', label: 'Caminar', icon: '🚶' },
  { id: 'run', label: 'Correr', icon: '🏃' },
  { id: 'bike', label: 'Bici', icon: '🚴' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
];

export default function ExerciseFace({ onStart }) {
  return (
    <div className="exercise-face" data-testid="exercise-face">
      <p className="today-kicker">Ejercicio</p>
      <ul>
        {SPORTS.map((sport) => (
          <li key={sport.id}>
            <button type="button" onClick={() => onStart?.(sport)}>
              <span>{sport.icon}</span>
              {sport.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
