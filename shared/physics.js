function lerp(a, b, t) {
  return a + (b - a) * t;
}

function makeBlobState() {
  return {
    x: 0,
    y: 8,
    vx: 36,
    vy: -48,
    squash: 1,
    stretch: 1,
    tilt: 0,
    hopT: 0.4,
  };
}

function advanceBlob(state, dt, options = {}) {
  const gravity = options.gravity ?? 360;
  const arenaR = options.arenaR ?? 118;
  const blobR = options.blobR ?? 54;
  const bounce = options.bounce ?? 0.45;
  const next = { ...state };
  const energy = 0.28 + bounce * 1.05;
  const max = Math.max(8, arenaR - blobR);
  const drag = Math.pow(0.986, dt * 60);

  next.hopT = (next.hopT || 0) + dt;
  next.vy += gravity * dt * (0.42 + bounce * 0.65);
  next.vx *= drag;
  next.vy *= drag * 0.997;
  next.x += next.vx * dt;
  next.y += next.vy * dt;

  let impact = 0;
  let nx = 0;
  let ny = 1;
  const dist = Math.hypot(next.x, next.y);
  if (dist > max) {
    nx = next.x / dist;
    ny = next.y / dist;
    const vdot = next.vx * nx + next.vy * ny;
    const rest = 0.46 + bounce * 0.12;
    if (vdot > 0) {
      next.vx = (next.vx - 1.72 * vdot * nx) * rest - ny * vdot * 0.1;
      next.vy = (next.vy - 1.72 * vdot * ny) * rest + nx * vdot * 0.08;
      impact = Math.min(0.4, Math.abs(vdot) / 260);
    }
    next.x = nx * max;
    next.y = ny * max;
  }

  const nearFloor = next.y > max * 0.28 && next.vy > -12;
  const hopEvery = 0.62 + (1 - bounce) * 0.55;
  if (nearFloor && next.hopT > hopEvery) {
    const sway = Math.sin(next.hopT * 7.3 + next.x * 0.04);
    next.vy = -(78 + bounce * 118) * energy;
    next.vx += sway * 34 * energy;
    next.hopT = 0;
    impact = Math.max(impact, 0.22 + bounce * 0.12);
    nx = 0;
    ny = 1;
  } else if (Math.hypot(next.vx, next.vy) < 16 * energy && next.hopT > 0.85) {
    next.vy -= (42 + bounce * 36) * energy;
    next.vx += Math.sin(next.x * 0.08 + next.hopT * 5) * 18 * energy;
    next.hopT = 0.18;
  }

  const spd = Math.hypot(next.vx, next.vy);
  const cap = 190 + bounce * 150;
  if (spd > cap) {
    next.vx *= cap / spd;
    next.vy *= cap / spd;
  }

  const speed = Math.hypot(next.vx, next.vy);
  let targetSquash = 1 - Math.min(0.12, speed / 1400);
  let targetStretch = 1 + Math.min(0.16, speed / 1100);
  if (impact > 0) {
    targetSquash = 1 - impact * (0.5 + Math.abs(nx) * 0.45);
    targetStretch = 1 + impact * (0.32 + Math.abs(ny) * 0.5);
  }

  next.squash = lerp(next.squash || 1, targetSquash, Math.min(1, dt * 9));
  next.stretch = lerp(next.stretch || 1, targetStretch, Math.min(1, dt * 9));
  next.tilt = lerp(next.tilt || 0, Math.max(-15, Math.min(15, next.vx * 0.05)), Math.min(1, dt * 6));

  const clamped = Math.hypot(next.x, next.y);
  if (clamped > max) {
    next.x *= max / clamped;
    next.y *= max / clamped;
  }

  return next;
}

function isBlobInArena(state, arenaR, blobR) {
  return Math.hypot(state.x, state.y) <= arenaR - blobR + 0.01;
}

export const createBlobState = makeBlobState;
export const stepBlob = advanceBlob;
export const blobInArena = isBlobInArena;
