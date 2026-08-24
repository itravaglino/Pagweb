import { useEffect, useRef } from 'react';
import { expressionFor } from '@shared/expressions.js';
import { createBlobState, stepBlob } from '@shared/physics.js';
import './GemmaBlob.css';

export default function GemmaBlob({ emotion = 'idle', bounce = 0.45, talking = false, dimmed = false }) {
  const wrapRef = useRef(null);
  const blobRef = useRef(null);
  const faceRef = useRef(null);
  const stateRef = useRef(createBlobState());
  const blinkRef = useRef({ until: 0, wink: false, next: 0 });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    blinkRef.current.next = performance.now() + 1600;

    const tick = (now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const wrap = wrapRef.current;
      const blob = blobRef.current;
      if (!wrap || !blob) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const size = wrap.clientWidth;
      const arenaR = size * 0.46;
      const blobR = size * 0.2;
      const energy = dimmed ? 0.12 : bounce;
      stateRef.current = stepBlob(stateRef.current, dt, { arenaR, blobR, bounce: energy });
      const s = stateRef.current;
      const breathe = 1 + Math.sin(now / 540) * 0.03;
      const squash = (s.squash || 1) * breathe;
      const stretch = (s.stretch || 1) / breathe;
      blob.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.tilt || 0}deg) scale(${squash}, ${stretch})`;

      const blink = blinkRef.current;
      if (now > blink.next) {
        blink.until = now + (Math.random() < 0.3 ? 170 : 108);
        blink.wink = Math.random() < 0.38;
        blink.next = now + 1500 + Math.random() * 2600;
      }
      const blinking = now < blink.until;

      const face = faceRef.current;
      if (face) {
        const expr = expressionFor(emotion);
        const leftH = blinking ? 1.8 : expr.eyeHeight;
        const rightH = blinking && !blink.wink
          ? 1.8
          : expr.eyeHeight * (expr.derp ? 0.62 : 1);
        const mouthOpen = talking ? 0.35 + Math.abs(Math.sin(now / 90)) * 0.7 : expr.mouthOpen;
        const lookX = Math.max(-0.85, Math.min(0.85, (expr.lookX || 0) + s.vx * 0.01));
        const lookY = Math.max(-0.85, Math.min(0.85, (expr.lookY || 0) + s.vy * 0.008));
        face.style.setProperty('--eye-w', `${expr.eyeWidth}`);
        face.style.setProperty('--eye-h', `${expr.eyeHeight}`);
        face.style.setProperty('--left-h', `${leftH}`);
        face.style.setProperty('--right-h', `${rightH}`);
        face.style.setProperty('--eye-gap', `${expr.eyeGap}`);
        face.style.setProperty('--pupil', `${expr.pupil}`);
        face.style.setProperty('--blush', `${expr.blush}`);
        face.style.setProperty('--brow', `${expr.brow}px`);
        face.style.setProperty('--brow-skew', `${expr.browSkew || 0}deg`);
        face.style.setProperty('--sparkle', `${expr.sparkle}`);
        face.style.setProperty('--mouth-open', `${mouthOpen}`);
        face.style.setProperty('--look-x', `${lookX}`);
        face.style.setProperty('--look-y', `${lookY}`);
        face.style.setProperty('--tongue', talking ? '0' : `${expr.tongue || 0}`);
        face.style.setProperty('--tooth', `${expr.tooth || 0}`);
        face.dataset.mouth = talking ? 'speak' : expr.mouth;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bounce, dimmed, emotion, talking]);

  return (
    <div className={`gemma-arena ${dimmed ? 'is-dim' : ''}`} ref={wrapRef} data-testid="gemma-blob">
      <div className="gemma-blob" ref={blobRef}>
        <div className="gemma-shine" />
        <div className="gemma-face" ref={faceRef} data-mouth="cat">
          <span className="sparkle s1" />
          <span className="sparkle s2" />
          <span className="brow left" />
          <span className="brow right" />
          <span className="eye left"><i /></span>
          <span className="eye right"><i /></span>
          <span className="blush left" />
          <span className="blush right" />
          <span className="mouth">
            <span className="tooth" />
          </span>
          <span className="tongue" />
        </div>
      </div>
    </div>
  );
}
