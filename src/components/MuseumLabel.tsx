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
  local: 'Your own collection',
};

const legible = '0 1px 22px rgba(0, 0, 0, 0.5)';

/** A wall label: a narrow column beside the piece, sentence case, no panel behind it. */
export function MuseumLabel({ artwork, visible, onClick }: MuseumLabelProps) {
  const handleClick = () => {
    if (onClick) onClick();
    else if (artwork.sourceUrl && window.electronAPI) {
      window.electronAPI.openExternal(artwork.sourceUrl);
    }
  };

  const isClickable = !!artwork.sourceUrl || !!onClick;
  const byline = [artwork.artist, artwork.year].filter(Boolean).join(', ');

  return (
    <div
      className="museum-label"
      role="region"
      aria-label={`Now showing: ${artwork.title} by ${artwork.artist}`}
      style={{
        position: 'absolute',
        left: '4.5vw',
        bottom: '7vh',
        width: 'clamp(200px, 21vw, 360px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: visible
          ? 'opacity 1.2s ease-out 0.4s, transform 1.2s ease-out 0.4s'
          : 'opacity 0.4s ease-in, transform 0.4s ease-in',
        zIndex: 10,
        pointerEvents: visible ? 'auto' : 'none',
        cursor: isClickable ? 'pointer' : 'default',
        textShadow: legible,
      }}
      onClick={handleClick}
    >
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 1.9vw, 34px)', fontWeight: 400,
        color: 'var(--color-text)', lineHeight: 1.15, marginBottom: 10,
      }}>
        {artwork.title}
      </h1>

      {byline && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(12px, 0.95vw, 16px)', fontWeight: 400, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
          {byline}
        </p>
      )}

      {artwork.medium && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 0.85vw, 14px)', fontWeight: 300, color: 'rgba(245, 242, 237, 0.42)', marginTop: 4, lineHeight: 1.4 }}>
          {artwork.medium}
        </p>
      )}

      <p style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
        fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 0.85vw, 14px)', fontWeight: 300, color: 'rgba(245, 242, 237, 0.42)',
      }}>
        {artwork.collection || SOURCE_NAMES[artwork.source] || artwork.source}
        {artwork.sourceUrl && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ opacity: 0.7 }}>
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        )}
      </p>
    </div>
  );
}
