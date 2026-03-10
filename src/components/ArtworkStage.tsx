import React, { useState } from 'react';
import { Artwork } from '../domain/artwork';
import { MuseumLabel } from './MuseumLabel';

interface ArtworkStageProps {
  current: Artwork | null;
  next: Artwork | null;
  transitioning: boolean;
  showLabel: boolean;
  onImageError: () => void;
}

export function ArtworkStage({ current, next, transitioning, showLabel, onImageError }: ArtworkStageProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {current && (
        <div
          style={{
            position: 'absolute',
            inset: -40,
            backgroundImage: `url(${current.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) brightness(0.3) saturate(1.4)',
            transition: `all var(--transition-slow)`,
            zIndex: 0,
          }}
        />
      )}

      {current && (
        <ArtworkLayer
          key={current.id}
          artwork={current}
          opacity={transitioning ? 0 : 1}
          zIndex={1}
          onError={onImageError}
        />
      )}

      {next && (
        <ArtworkLayer
          key={next.id}
          artwork={next}
          opacity={transitioning ? 1 : 0}
          zIndex={2}
          onError={onImageError}
        />
      )}

      {!current && <LoadingIndicator />}

      {current && (
        <MuseumLabel artwork={current} visible={showLabel} />
      )}
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        zIndex: 3,
      }}
    >
      <div style={{ position: 'relative', width: 40, height: 40 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '1.5px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1.4s linear infinite',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 300,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.15em',
        }}
      >
        Curating...
      </span>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ArtworkLayer({
  artwork, opacity, zIndex, onError,
}: {
  artwork: Artwork; opacity: number; zIndex: number; onError: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 80px 100px',
        opacity,
        transition: `opacity var(--transition-slow)`,
        zIndex,
      }}
    >
      {!imgLoaded && opacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '1.5px solid var(--color-border)',
              borderTopColor: 'var(--color-accent)',
              borderRadius: '50%',
              animation: 'spin 1.4s linear infinite',
            }}
          />
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
