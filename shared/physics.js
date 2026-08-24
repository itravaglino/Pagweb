export function createBlobState() {
  return {
    x: 0,
    y: -18,
    vx: 55,
    vy: 10,
    squash: 1,
    stretch: 1,
  };
}

export function stepBlob(state, dt, options = {}) {
  const gravity = options.gravity ?? 520;
  const arenaR = options.arenaR ?? 118;
  const blobR = options.blobR ?? 54;
  const bounce = options.bounce ?? 0.45;
  const damping = options.damping ?? 0.992;
  const next = { ...state };
  const energy = 0.35 + bounce * 1.4;

  next.vy += gravity * dt * (0.55 + bounce);
  next.vx *= damping;
  next.vy *= damping;
  next.x += next.vx * dt;
  next.y += next.vy * dt;

  next.squash += (1 - next.squash) * Math.min(1, dt * 12);
  next.stretch += (1 - next.stretch) * Math.min(1, dt * 12);

  const max = Math.max(8, arenaR - blobR);
  const dist = Math.hypot(next.x, next.y);
  if (dist > max) {
    const nx = next.x / dist;
    const ny = next.y / dist;
    const vdot = next.vx * nx + next.vy * ny;
    next.vx = (next.vx - 2 * vdot * nx) * (0.72 + bounce * 0.2);
    next.vy = (next.vy - 2 * vdot * ny) * (0.72 + bounce * 0.2);
    next.x = nx * max;
    next.y = ny * max;
    const impact = Math.min(0.35, Math.abs(vdot) / 420);
    next.squash = 1 - impact * Math.abs(nx) * 1.4;
    next.stretch = 1 + impact * Math.abs(ny) * 1.2;
    if (Math.hypot(next.vx, next.vy) < 40 * energy) {
      next.vx += -ny * 30 * energy;
      next.vy += nx * 18 * energy;
    }
  }

  if (Math.hypot(next.vx, next.vy) < 28 * energy) {
    next.vx += (Math.random() - 0.5) * 16 * energy;
    next.vy -= 8 * energy * dt * 60;
  }

  return next;
}

export function blobInArena(state, arenaR, blobR) {
  return Math.hypot(state.x, state.y) <= arenaR - blobR + 0.01;
}
