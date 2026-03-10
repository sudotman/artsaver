import React, { useState } from 'react';
import { FavoriteEntry } from '../domain/artwork';

interface FavoritesPanelProps {
  favorites: FavoriteEntry[];
  onRemove: (id: string) => void;
  onSelect: (entry: FavoriteEntry) => void;
  onExportJSON: () => void;
  onExportHTML: () => void;
  onClose: () => void;
}

export function FavoritesPanel({ favorites, onRemove, onSelect, onExportJSON, onExportHTML, onClose }: FavoritesPanelProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

      <div style={{
        position: 'relative', width: 600, maxHeight: '85vh', background: '#141414',
        border: '1px solid var(--color-border)', borderRadius: 12, zIndex: 201,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, letterSpacing: '0.08em', color: 'var(--color-text)' }}>
            Favorites ({favorites.length})
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {favorites.length > 0 && (
              <>
                <SmallBtn onClick={onExportJSON}>Export JSON</SmallBtn>
                <SmallBtn onClick={onExportHTML}>Export Gallery</SmallBtn>
              </>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20 }}>&times;</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              No favorites yet. Press <kbd style={{ color: 'var(--color-accent)' }}>H</kbd> while viewing an artwork to add it.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {favorites.map(f => (
                <div
                  key={f.artwork.id}
                  onMouseEnter={() => setHovered(f.artwork.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: '#1a1a1a', aspectRatio: '4/3' }}
                >
                  <img
                    src={f.artwork.imageUrl}
                    alt={f.artwork.title}
                    onClick={() => onSelect(f)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    draggable={false}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '16px 8px 6px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                    opacity: hovered === f.artwork.id ? 1 : 0.7,
                    transition: 'opacity 0.2s',
                  }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontStyle: 'italic', color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>{f.artwork.title}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>{f.artwork.artist}</p>
                  </div>
                  {hovered === f.artwork.id && (
                    <button
                      onClick={e => { e.stopPropagation(); onRemove(f.artwork.id); }}
                      style={{
                        position: 'absolute', top: 6, right: 6, width: 24, height: 24,
                        borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none',
                        color: '#a05050', cursor: 'pointer', fontSize: 14, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)',
      borderRadius: 6, padding: '4px 12px', color: 'var(--color-text-muted)',
      fontFamily: 'var(--font-body)', fontSize: 11, cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}
