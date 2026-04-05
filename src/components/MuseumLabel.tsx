import React from 'react';
import { Artwork } from '../domain/artwork';

interface MuseumLabelProps {
  artwork: Artwork;
  visible: boolean;
  onClick?: () => void;
}

const SOURCE_NAMES: Record<string, string> = {
  met: 'The Metropolitan Museum of Art',
  chicago: 'Art Institute of Chicago',
  cleveland: 'Cleveland Museum of Art',
  vam: 'Victoria and Albert Museum',
  local: 'Local Collection',
};

export function MuseumLabel({ artwork, visible, onClick }: MuseumLabelProps) {
  const handleClick = () => {
    if (onClick) onClick();
    else if (artwork.sourceUrl && window.electronAPI) {
      window.electronAPI.openExternal(artwork.sourceUrl);
    }
  };

  const isClickable = !!artwork.sourceUrl || !!onClick;

  return (
    <div
      role="region"
      aria-label={`Now showing: ${artwork.title} by ${artwork.artist}`}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '80px 48px 36px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: visible
          ? 'opacity 0.45s ease-out, transform 0.45s ease-out'
          : 'opacity 0.15s ease-in, transform 0.15s ease-in',
        zIndex: 10,
        pointerEvents: visible ? 'auto' : 'none',
        cursor: isClickable ? 'pointer' : 'default',
      }}
      onClick={handleClick}
    >
      <div style={{ maxWidth: 600 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400,
          fontStyle: 'italic', color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 6,
        }}>
          {artwork.title}
        </h1>

        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500,
          color: 'var(--color-text)', letterSpacing: '0.02em', marginBottom: 4,
        }}>
          {artwork.artist}
          {artwork.year && <span style={{ color: 'var(--color-text-muted)', fontWeight: 300 }}>, {artwork.year}</span>}
        </p>

        {artwork.medium && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 300, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            {artwork.medium}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ width: 24, height: 1, background: 'var(--color-accent)', opacity: 0.5 }} />
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 400,
            color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {artwork.collection || SOURCE_NAMES[artwork.source] || artwork.source}
          </span>
          {artwork.sourceUrl && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" style={{ opacity: 0.5, marginLeft: 4 }}>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
