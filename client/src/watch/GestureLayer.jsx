import { useEffect, useRef } from 'react';
import { createGestureRecognizer } from '@shared/gestures.js';

function pointFromEvent(event, el) {
  const rect = el.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export default function GestureLayer({ onGesture, children }) {
  const ref = useRef(null);
  const recRef = useRef(null);

  useEffect(() => {
    const rec = createGestureRecognizer();
    rec.setHandler(onGesture);
    recRef.current = rec;
    return () => rec.pointerCancel();
  }, [onGesture]);

  return (
    <div
      ref={ref}
      className="gesture-layer"
      data-testid="watch-screen"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        recRef.current?.pointerDown(pointFromEvent(e, e.currentTarget), e.timeStamp);
      }}
      onPointerMove={(e) => recRef.current?.pointerMove(pointFromEvent(e, e.currentTarget))}
      onPointerUp={(e) => recRef.current?.pointerUp(pointFromEvent(e, e.currentTarget), e.timeStamp)}
      onPointerCancel={() => recRef.current?.pointerCancel()}
    >
      {children}
    </div>
  );
}
