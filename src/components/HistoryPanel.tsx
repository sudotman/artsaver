import React from 'react';
import { HistoryEntry } from '../domain/artwork';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClear: () => void;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function HistoryPanel({ history, onClear, onClose }: HistoryPanelProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

      <div
        onClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 480, maxHeight: '80vh', background: '#141414',
          border: '1px solid var(--color-border)', borderRadius: 12, zIndex: 201,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, letterSpacing: '0.08em', color: 'var(--color-text)' }}>
            History ({history.length})
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {history.length > 0 && (
              <button onClick={onClear} style={{
                background: 'transparent', border: 'none', color: '#a05050',
                fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
              }}>
                Clear all
              </button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20 }}>&times;</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              No history yet.
            </div>
          ) : (
            history.map((entry, i) => (
              <div key={`${entry.artwork.id}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 24px',
                borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <img src={entry.artwork.imageUrl} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} draggable={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontStyle: 'italic', color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.artwork.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
                    {entry.artwork.artist} &middot; {entry.artwork.collection}
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {formatTime(entry.shownAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
