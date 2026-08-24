import { useEffect, useRef } from 'react';
import { expressionFor } from '@shared/expressions.js';
import { createBlobState, stepBlob } from '@shared/physics.js';
import './GemmaBlob.css';

export default function GemmaBlob({ emotion = 'idle', bounce = 0.45, talking = false, dimmed = false }) {
  const wrapRef = useRef(null);
  const blobRef = useRef(null);
  const faceRef = useRef(null);
  const stateRef = useRef(createBlobState());
  const blinkRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let blinkUntil = 0;
    let nextBlink = performance.now() + 2200;

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
      blob.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.squash}, ${s.stretch})`;

      if (now > nextBlink) {
        blinkUntil = now + 120;
        nextBlink = now + 1800 + Math.random() * 2600;
      }
      blinkRef.current = now < blinkUntil ? 1 : 0;

      const face = faceRef.current;
      if (face) {
        const expr = expressionFor(emotion);
        const eyeH = blinkRef.current ? 1.6 : expr.eyeHeight;
        const mouthOpen = talking ? 0.35 + Math.abs(Math.sin(now / 90)) * 0.7 : expr.mouthOpen;
        face.style.setProperty('--eye-w', `${expr.eyeWidth}`);
        face.style.setProperty('--eye-h', `${eyeH}`);
        face.style.setProperty('--eye-gap', `${expr.eyeGap}`);
        face.style.setProperty('--pupil', `${expr.pupil}`);
        face.style.setProperty('--blush', `${expr.blush}`);
        face.style.setProperty('--brow', `${expr.brow}px`);
        face.style.setProperty('--sparkle', `${expr.sparkle}`);
        face.style.setProperty('--mouth-open', `${mouthOpen}`);
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
        <div className="gemma-face" ref={faceRef} data-mouth="smile">
          <span className="sparkle s1" />
          <span className="sparkle s2" />
          <span className="brow left" />
          <span className="brow right" />
          <span className="eye left"><i /></span>
          <span className="eye right"><i /></span>
          <span className="blush left" />
          <span className="blush right" />
          <span className="mouth" />
        </div>
      </div>
    </div>
  );
}
