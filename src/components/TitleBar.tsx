import React from 'react';

interface TitleBarProps {
  visible: boolean;
  onSettings: () => void;
}

export function TitleBar({ visible, onSettings }: TitleBarProps) {
  const api = window.electronAPI;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 100,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
        opacity: visible ? 1 : 0,
        transition: 'opacity var(--transition-medium)',
        pointerEvents: visible ? 'auto' : 'none',
        WebkitAppRegion: 'drag' as any,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 400,
          letterSpacing: '0.12em',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        ArtSaver
      </span>

      <div style={{ display: 'flex', gap: 8, WebkitAppRegion: 'no-drag' as any }}>
        <TitleButton onClick={onSettings} title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </TitleButton>
        {api && (
          <>
            <TitleButton onClick={() => api.toggleFullscreen()} title="Fullscreen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
              </svg>
            </TitleButton>
            <TitleButton onClick={() => api.minimizeWindow()} title="Minimize">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14" />
              </svg>
            </TitleButton>
            <TitleButton onClick={() => api.closeWindow()} title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </TitleButton>
          </>
        )}
      </div>
    </div>
  );
}

function TitleButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: 'none',
        borderRadius: 6,
        width: 32,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
        transition: 'all var(--transition-fast)',
      }}
    >
      {children}
    </button>
  );
}
