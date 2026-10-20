import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Artwork } from '../domain/artwork';
import { MuseumLabel } from './MuseumLabel';
import { TransitionType } from '../services/settingsStore';
import { FetchStatus } from '../services/shuffleScheduler';
import { paletteOf, wallVars } from '../domain/wall';

interface ArtworkStageProps {
  current: Artwork | null;
  next: Artwork | null;
  transitioning: boolean;
  fetching: boolean;
  fetchStatus: FetchStatus;
  showLabel: boolean;
  onImageError: () => void;
  onRetry: () => void;
  onLabelClick?: () => void;
  transitionType: TransitionType;
}

function resolveTransition(type: TransitionType): TransitionType {
  if (type === 'random') {
    const options: TransitionType[] = ['crossfade', 'kenburns', 'slide', 'dissolve'];
    return options[Math.floor(Math.random() * options.length)];
  }
  return type;
}

export function ArtworkStage({ current, next, transitioning, fetching, fetchStatus, showLabel, onImageError, onRetry, onLabelClick, transitionType }: ArtworkStageProps) {
  const activeTransition = useMemo(() => resolveTransition(transitionType), [transitioning, transitionType]);

  const bgArtwork = transitioning && next ? next : current;
  const [wall, setWall] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!bgArtwork) return;
    let live = true;
    paletteOf(bgArtwork.imageUrl).then((p) => {
      if (!live) return;
      const vars = wallVars(p);
      setWall(vars);
      document.documentElement.style.setProperty('--color-accent', vars['--color-accent']);
    });
    return () => { live = false; };
  }, [bgArtwork?.imageUrl]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div className="wall" style={{ ...(wall as React.CSSProperties), zIndex: 0 }} />

      {activeTransition === 'dissolve' && transitioning && (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)', zIndex: 1, animation: 'dissolveBlack 2s ease-in-out' }} />
      )}

      {current && (
        <ArtworkLayer
          key={current.id}
          artwork={current}
          opacity={transitioning ? 0 : 1}
          zIndex={1}
          onError={onImageError}
          transition={activeTransition}
          isOutgoing={transitioning}
          labelled={showLabel}
        />
      )}

      {next && (
        <ArtworkLayer
          key={next.id}
          artwork={next}
          opacity={transitioning ? 1 : 0}
          zIndex={2}
          onError={onImageError}
          transition={activeTransition}
          isOutgoing={false}
          labelled={showLabel}
        />
      )}

      {!current && <LoadingIndicator status={fetchStatus} onRetry={onRetry} />}

      {current && fetching && <FetchingIndicator />}

      {current && transitioning && (
        <MuseumLabel artwork={current} visible={false} onClick={onLabelClick} />
      )}

      {next && transitioning && (
        <MuseumLabel artwork={next} visible={showLabel} onClick={onLabelClick} />
      )}

      {current && !transitioning && (
        <MuseumLabel artwork={current} visible={showLabel} onClick={onLabelClick} />
      )}

      <div className="grain" style={{ zIndex: 5 }} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes kenburnsIn {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
        @keyframes kenburnsOut {
          from { transform: scale(1.08); opacity: 1; }
          to { transform: scale(1.15); opacity: 0; }
        }
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-40px); opacity: 0; }
        }
        @keyframes dissolveBlack {
          0% { opacity: 0; }
          40% { opacity: 1; }
          60% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fetchIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function LoadingIndicator({ status, onRetry }: { status: FetchStatus; onRetry: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const isError = status.phase === 'error';
  const isRetrying = status.phase === 'retrying';
  const showElapsed = elapsed >= 5;

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 3,
    }}>
      {!isError && (
        <div style={{ position: 'relative', width: 40, height: 40 }}>
          <div style={{
            position: 'absolute', inset: 0,
            border: '1px solid var(--color-border)',
            borderTopColor: 'var(--color-text)',
            borderRadius: '50%',
            animation: 'spin 1.4s linear infinite',
          }} />
        </div>
      )}

      {isError && (
        <div style={{ fontSize: 32, marginBottom: 4, opacity: 0.6 }}>
          &#x26A0;
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 350,
          color: isError ? 'var(--color-text)' : 'var(--color-text-muted)',
          textAlign: 'center', maxWidth: 360, lineHeight: 1.4,
        }}>
          {status.message || 'Finding something to hang…'}
        </span>

        {isRetrying && status.attempt && status.maxAttempts && (
          <div style={{
            width: 120, height: 2, borderRadius: 1, background: 'var(--color-border)',
            overflow: 'hidden', marginTop: 4,
          }}>
            <div style={{
              height: '100%', borderRadius: 1,
              background: 'var(--color-text)',
              width: `${(status.attempt / status.maxAttempts) * 100}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        )}

        {showElapsed && !isError && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)',
            opacity: 0.7,
            animation: elapsed >= 10 ? 'pulse 2s ease-in-out infinite' : undefined,
          }}>
            {elapsed}s elapsed
          </span>
        )}
      </div>

      {(isError || elapsed >= 15) && (
        <button className="pill" onClick={onRetry} style={{ marginTop: 8 }}>
          Try again
        </button>
      )}
    </div>
  );
}

function FetchingIndicator() {
  return (
    <div style={{
      position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 20, display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 18px', borderRadius: 999,
      background: 'rgba(11, 10, 10, 0.5)', backdropFilter: 'blur(10px)',
      animation: 'fetchIn 0.3s ease-out',
    }}>
      <div style={{
        width: 14, height: 14,
        border: '1px solid var(--color-border)',
        borderTopColor: 'var(--color-text)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 400,
        color: 'var(--color-text-muted)',
      }}>
        Fetching the next piece…
      </span>
    </div>
  );
}

function ArtworkLayer({
  artwork, opacity, zIndex, onError, transition, isOutgoing, labelled,
}: {
  artwork: Artwork; opacity: number; zIndex: number; onError: () => void;
  transition: TransitionType; isOutgoing: boolean; labelled: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const animationStyle = (): React.CSSProperties => {
    if (transition === 'kenburns') {
      if (isOutgoing) return { animation: 'kenburnsOut 2s ease-in-out forwards' };
      return { animation: 'kenburnsIn 20s ease-in-out infinite alternate' };
    }
    if (transition === 'slide') {
      if (isOutgoing) return { animation: 'slideOut 1.8s ease-in-out forwards' };
      return { animation: 'slideIn 1.8s ease-in-out forwards' };
    }
    return { opacity, transition: 'opacity var(--transition-slow)' };
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Hung a little above centre; with a label up, the piece steps right to leave it a column.
        padding: labelled ? '9vh 6vw 13vh 28vw' : '9vh 9vw 13vh',
        zIndex,
        transition: 'padding 1.6s cubic-bezier(0.4, 0, 0.2, 1)',
        ...(transition === 'crossfade' || transition === 'dissolve'
          ? { opacity, transition: 'opacity var(--transition-slow), padding 1.6s cubic-bezier(0.4, 0, 0.2, 1)' }
          : animationStyle()),
      }}
    >
      {!imgLoaded && opacity > 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, border: '1px solid var(--color-border)', borderTopColor: 'var(--color-text)', borderRadius: '50%', animation: 'spin 1.4s linear infinite' }} />
        </div>
      )}

      <img
        src={artwork.imageUrl}
        alt={`${artwork.title} by ${artwork.artist}`}
        onLoad={() => setImgLoaded(true)}
        onError={onError}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: 1,
          boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 24px 60px rgba(0,0,0,0.45), 0 60px 140px rgba(0,0,0,0.35)',
          opacity: imgLoaded ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
        draggable={false}
      />
    </div>
  );
}
