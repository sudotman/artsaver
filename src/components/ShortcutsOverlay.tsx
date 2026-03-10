import React from 'react';

interface ShortcutsOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['→', 'Space', 'N'], action: 'Next artwork' },
  { keys: ['←', 'B'], action: 'Previous artwork' },
  { keys: ['P'], action: 'Pause / Resume' },
  { keys: ['F'], action: 'Toggle fullscreen' },
  { keys: ['L'], action: 'Toggle metadata label' },
  { keys: ['S'], action: 'Open settings' },
  { keys: ['H'], action: 'Favorite (heart)' },
  { keys: ['A'], action: 'Toggle ambient audio' },
  { keys: ['M'], action: 'Toggle ambient mode' },
  { keys: ['I'], action: 'Open artwork in browser' },
  { keys: ['?'], action: 'Show / hide shortcuts' },
  { keys: ['Esc'], action: 'Close panel' },
];

export function ShortcutsOverlay({ visible, onClose }: ShortcutsOverlayProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

      <div
        style={{
          position: 'relative',
          background: '#141414',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '32px 36px',
          zIndex: 301,
          minWidth: 340,
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, letterSpacing: '0.08em', color: 'var(--color-text)', marginBottom: 20 }}>
          Keyboard Shortcuts
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SHORTCUTS.map(s => (
            <div key={s.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text)' }}>
                {s.action}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map(k => (
                  <kbd
                    key={k}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--color-accent)',
                      background: 'rgba(201, 169, 110, 0.1)',
                      border: '1px solid rgba(201, 169, 110, 0.2)',
                      borderRadius: 4,
                      padding: '2px 8px',
                      minWidth: 24,
                      textAlign: 'center',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShortcutHint({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 20,
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        color: 'var(--color-text-muted)',
        opacity: visible ? 0.5 : 0,
        transition: 'opacity var(--transition-medium)',
        pointerEvents: 'none',
        letterSpacing: '0.04em',
      }}
    >
      Press <kbd style={{ color: 'var(--color-accent)', fontWeight: 500 }}>?</kbd> for shortcuts
    </div>
  );
}
