import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Artwork } from '../domain/artwork';
import { MuseumLabel } from './MuseumLabel';
import { TransitionType } from '../services/settingsStore';
import { FetchStatus } from '../services/shuffleScheduler';

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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {bgArtwork && (
        <div
          style={{
            position: 'absolute',
            inset: -40,
            backgroundImage: `url(${bgArtwork.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) brightness(0.3) saturate(1.4)',
            transition: `all var(--transition-slow)`,
            zIndex: 0,
          }}
        />
      )}

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
            border: '1.5px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
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
          fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 300,
          color: isError ? 'var(--color-accent)' : 'var(--color-text-muted)',
          letterSpacing: '0.15em',
          textAlign: 'center', maxWidth: 340, lineHeight: 1.5,
        }}>
          {status.message || 'Curating...'}
        </span>

        {isRetrying && status.attempt && status.maxAttempts && (
          <div style={{
            width: 120, height: 2, borderRadius: 1, background: 'var(--color-border)',
            overflow: 'hidden', marginTop: 4,
          }}>
            <div style={{
              height: '100%', borderRadius: 1,
              background: 'var(--color-accent)',
              width: `${(status.attempt / status.maxAttempts) * 100}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        )}

        {showElapsed && !isError && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)',
            letterSpacing: '0.06em', opacity: 0.6,
            animation: elapsed >= 10 ? 'pulse 2s ease-in-out infinite' : undefined,
          }}>
            {elapsed}s elapsed
          </span>
        )}
      </div>

      {(isError || elapsed >= 15) && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 8, padding: '8px 24px', borderRadius: 20,
            background: 'rgba(201, 169, 110, 0.15)', border: '1px solid var(--color-accent)',
            color: 'var(--color-accent)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '0.08em',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201, 169, 110, 0.3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201, 169, 110, 0.15)')}
        >
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
      padding: '8px 18px', borderRadius: 20,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
      animation: 'fetchIn 0.3s ease-out',
    }}>
      <div style={{
        width: 14, height: 14,
        border: '1.5px solid rgba(201, 169, 110, 0.3)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <span style={{
        fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 400,
        color: 'var(--color-text-muted)', letterSpacing: '0.06em',
      }}>
        Loading next...
      </span>
    </div>
  );
}

function ArtworkLayer({
  artwork, opacity, zIndex, onError, transition, isOutgoing,
}: {
  artwork: Artwork; opacity: number; zIndex: number; onError: () => void;
  transition: TransitionType; isOutgoing: boolean;
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
        padding: '60px 80px 100px',
        zIndex,
        ...(transition === 'crossfade' || transition === 'dissolve'
          ? { opacity, transition: 'opacity var(--transition-slow)' }
          : animationStyle()),
      }}
    >
      {!imgLoaded && opacity > 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, border: '1.5px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1.4s linear infinite' }} />
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
          borderRadius: 2,
          boxShadow: '0 8px 60px rgba(0,0,0,0.6), 0 2px 20px rgba(0,0,0,0.4)',
          opacity: imgLoaded ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
        draggable={false}
      />
    </div>
  );
}
