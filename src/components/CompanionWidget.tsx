import React, { useEffect, useState } from 'react';

export function CompanionWidget() {
  const [title, setTitle] = useState('ArtSaver');

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub = window.electronAPI.onArtworkChanged((t: string) => setTitle(t));
    return unsub;
  }, []);

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      padding: '0 16px', background: 'rgba(10, 10, 10, 0.85)', borderRadius: 10,
      border: '1px solid var(--color-border)', backdropFilter: 'blur(12px)',
      WebkitAppRegion: 'drag' as any,
    }}>
      <div style={{
        width: 4, height: 24, background: 'var(--color-accent)',
        borderRadius: 2, marginRight: 12, flexShrink: 0, opacity: 0.7,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Now showing
        </p>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 14, fontStyle: 'italic', color: 'var(--color-text)',
          margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </p>
      </div>
    </div>
  );
}
