import React from 'react';
import { Artwork } from '../domain/artwork';

interface MuseumLabelProps {
  artwork: Artwork;
  visible: boolean;
}

const SOURCE_NAMES: Record<string, string> = {
  met: 'The Metropolitan Museum of Art',
  chicago: 'Art Institute of Chicago',
  rijks: 'Rijksmuseum',
  local: 'Local Collection',
};

export function MuseumLabel({ artwork, visible }: MuseumLabelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '80px 48px 36px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: `all var(--transition-medium)`,
        zIndex: 10,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{ maxWidth: 600 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'var(--color-text)',
            lineHeight: 1.3,
            marginBottom: 6,
          }}
        >
          {artwork.title}
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--color-text)',
            letterSpacing: '0.02em',
            marginBottom: 4,
          }}
        >
          {artwork.artist}
          {artwork.year && (
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 300 }}>
              , {artwork.year}
            </span>
          )}
        </p>

        {artwork.medium && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 300,
              color: 'var(--color-text-muted)',
              marginBottom: 8,
            }}
          >
            {artwork.medium}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 24,
              height: 1,
              background: 'var(--color-accent)',
              opacity: 0.5,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 400,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {artwork.collection || SOURCE_NAMES[artwork.source] || artwork.source}
          </span>
        </div>
      </div>
    </div>
  );
}
