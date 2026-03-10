import React, { useEffect, useState } from 'react';

interface PauseIndicatorProps {
  paused: boolean;
}

export function PauseIndicator({ paused }: PauseIndicatorProps) {
  const [show, setShow] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    setShow(true);
    const t1 = setTimeout(() => setFlash(false), 1200);
    const t2 = setTimeout(() => { if (!paused) setShow(false); }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [paused]);

  if (!show && !paused) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
        opacity: flash ? 0.9 : (paused ? 0.3 : 0),
        transition: 'opacity 0.8s ease',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {paused ? (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="14" y="10" width="7" height="28" rx="2" fill="var(--color-text)" />
          <rect x="27" y="10" width="7" height="28" rx="2" fill="var(--color-text)" />
        </svg>
      ) : (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <polygon points="16,10 38,24 16,38" fill="var(--color-text)" />
        </svg>
      )}
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 400,
        color: 'var(--color-text)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        {paused ? 'Paused' : 'Playing'}
      </span>
    </div>
  );
}
