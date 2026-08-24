const DEFAULTS = {
  tapMaxMs: 280,
  tapMaxDist: 22,
  swipeMinDist: 42,
  longPressMs: 520,
  doubleTapMs: 340,
};

export function hypot(dx, dy) {
  return Math.hypot(dx, dy);
}

export function swipeDirection(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export function createGestureRecognizer(options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  let origin = null;
  let longTimer = null;
  let lastTapAt = 0;
  let firedLongPress = false;
  let onGesture = () => {};

  function clearLong() {
    if (longTimer) {
      clearTimeout(longTimer);
      longTimer = null;
    }
  }

  function emit(gesture) {
    onGesture(gesture);
  }

  return {
    setHandler(handler) {
      onGesture = handler || (() => {});
    },
    pointerDown(point, time = Date.now()) {
      clearLong();
      firedLongPress = false;
      origin = { x: point.x, y: point.y, t: time };
      longTimer = setTimeout(() => {
        firedLongPress = true;
        emit({ type: 'longpress', x: origin.x, y: origin.y });
      }, cfg.longPressMs);
    },
    pointerMove(point) {
      if (!origin) return;
      const dist = hypot(point.x - origin.x, point.y - origin.y);
      if (dist > cfg.tapMaxDist) clearLong();
    },
    pointerUp(point, time = Date.now()) {
      if (!origin) return null;
      clearLong();
      const dx = point.x - origin.x;
      const dy = point.y - origin.y;
      const dt = time - origin.t;
      const dist = hypot(dx, dy);
      origin = null;

      if (firedLongPress) {
        firedLongPress = false;
        return { type: 'longpress-end' };
      }

      if (dist >= cfg.swipeMinDist) {
        const gesture = { type: 'swipe', dir: swipeDirection(dx, dy), dx, dy, dist };
        emit(gesture);
        return gesture;
      }

      if (dt <= cfg.tapMaxMs && dist <= cfg.tapMaxDist) {
        const isDouble = time - lastTapAt <= cfg.doubleTapMs;
        lastTapAt = isDouble ? 0 : time;
        const gesture = { type: isDouble ? 'doubletap' : 'tap', x: point.x, y: point.y };
        emit(gesture);
        return gesture;
      }

      return { type: 'none' };
    },
    pointerCancel() {
      clearLong();
      origin = null;
      firedLongPress = false;
    },
  };
}

export function nextScreen(current, dir, screens) {
  const i = screens.indexOf(current);
  if (i < 0) return screens[0];
  if (dir === 'left' || dir === 'up') {
    return screens[(i + 1) % screens.length];
  }
  if (dir === 'right' || dir === 'down') {
    return screens[(i - 1 + screens.length) % screens.length];
  }
  return current;
}
