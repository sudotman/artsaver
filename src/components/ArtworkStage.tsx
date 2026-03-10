import React, { useState, useMemo } from 'react';
import { Artwork } from '../domain/artwork';
import { MuseumLabel } from './MuseumLabel';
import { TransitionType } from '../services/settingsStore';

interface ArtworkStageProps {
  current: Artwork | null;
  next: Artwork | null;
  transitioning: boolean;
  showLabel: boolean;
  onImageError: () => void;
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

export function ArtworkStage({ current, next, transitioning, showLabel, onImageError, onLabelClick, transitionType }: ArtworkStageProps) {
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

      {!current && <LoadingIndicator />}

      {/* Outgoing label fades out with the outgoing image */}
      {current && transitioning && (
        <MuseumLabel artwork={current} visible={false} onClick={onLabelClick} />
      )}

      {/* Incoming label fades in after the transition */}
      {next && transitioning && (
        <MuseumLabel artwork={next} visible={showLabel} onClick={onLabelClick} />
      )}

      {/* Steady-state label */}
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
      `}</style>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, zIndex: 3 }}>
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        <div style={{ position: 'absolute', inset: 0, border: '1.5px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1.4s linear infinite' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 300, color: 'var(--color-text-muted)', letterSpacing: '0.15em' }}>
        Curating...
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
