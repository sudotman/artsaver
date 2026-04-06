import React, { useEffect, useState } from 'react';
import { getDiagnostics } from '../services/shuffleScheduler';
import { getSourceStates, resetAllSources } from '../services/rateLimiter';
import { ALL_SOURCES } from '../services/settingsStore';

interface DiagnosticsPanelProps {
  visible: boolean;
  onClose: () => void;
  onRetryAll: () => void;
}

export function DiagnosticsPanel({ visible, onClose, onRetryAll }: DiagnosticsPanelProps) {
  const [data, setData] = useState<ReturnType<typeof getDiagnostics> | null>(null);
  const [sourceStates, setSourceStates] = useState<ReturnType<typeof getSourceStates>>({});

  useEffect(() => {
    if (!visible) return;
    const refresh = () => {
      setData(getDiagnostics());
      setSourceStates(getSourceStates());
    };
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const handleRetryAll = () => {
    resetAllSources();
    onRetryAll();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 440, maxHeight: '80vh', overflowY: 'auto',
          background: '#141414', border: '1px solid var(--color-border)', borderRadius: 12,
          padding: '28px 24px', zIndex: 201,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, letterSpacing: '0.08em', color: 'var(--color-text)' }}>
            Diagnostics
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
            &times;
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Prefetch Buffer
          </span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text)', margin: '4px 0 0' }}>
            {data?.bufferSize ?? 0} / 5 artworks ready
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Source Status
          </span>
          <div style={{ marginTop: 8 }}>
            {ALL_SOURCES.map(s => {
              const state = sourceStates[s.id];
              const lastErr = data?.lastErrors[s.id];
              const cooldownSec = state?.cooldownUntil ? Math.ceil(state.cooldownUntil / 1000) : 0;
              const isHealthy = !state || (state.failures === 0 && cooldownSec <= 0);
              const isCooling = cooldownSec > 0;

              return (
                <div key={s.id} style={{
                  padding: '8px 10px', marginBottom: 6, borderRadius: 6,
                  background: isCooling ? 'rgba(160,80,80,0.1)' : isHealthy ? 'rgba(80,160,80,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCooling ? 'rgba(160,80,80,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text)' }}>
                      {s.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: isCooling ? 'rgba(160,80,80,0.2)' : isHealthy ? 'rgba(80,160,80,0.15)' : 'rgba(255,200,50,0.15)',
                      color: isCooling ? '#c06060' : isHealthy ? '#60a060' : '#c0a040',
                    }}>
                      {isCooling ? `cooldown ${cooldownSec}s` : isHealthy ? 'ok' : `${state?.failures ?? 0} failures`}
                    </span>
                  </div>
                  {lastErr && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0', wordBreak: 'break-word' }}>
                      {lastErr}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleRetryAll} style={{
          width: '100%', padding: '10px 16px', background: 'rgba(201,169,110,0.12)',
          border: '1px solid rgba(201,169,110,0.3)', borderRadius: 6,
          color: 'var(--color-accent)', fontFamily: 'var(--font-body)', fontSize: 13,
          cursor: 'pointer', letterSpacing: '0.04em',
        }}>
          Reset all sources &amp; retry
        </button>
      </div>
    </div>
  );
}
