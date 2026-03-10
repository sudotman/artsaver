import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Artwork } from '../domain/artwork';
import { getRandomArtwork } from '../services/shuffleScheduler';
import { AppSettings } from '../services/settingsStore';

interface AmbientModeProps {
  active: boolean;
  settings: AppSettings;
  onSelectArtwork: (artwork: Artwork) => void;
}

const GRID_SIZE = 20;
const SWAP_INTERVAL = 4000;

export function AmbientMode({ active, settings, onSelectArtwork }: AmbientModeProps) {
  const [tiles, setTiles] = useState<(Artwork | null)[]>(new Array(GRID_SIZE).fill(null));
  const loadingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTile = useCallback(async (index: number) => {
    const artwork = await getRandomArtwork(settings);
    if (artwork) {
      setTiles(prev => {
        const next = [...prev];
        next[index] = artwork;
        return next;
      });
    }
  }, [settings]);

  useEffect(() => {
    if (!active) return;

    const init = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      for (let i = 0; i < GRID_SIZE; i++) {
        await loadTile(i);
      }
      loadingRef.current = false;
    };
    init();

    intervalRef.current = setInterval(() => {
      const idx = Math.floor(Math.random() * GRID_SIZE);
      loadTile(idx);
    }, SWAP_INTERVAL);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, loadTile]);

  if (!active) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gridTemplateRows: 'repeat(4, 1fr)',
      gap: 3,
      padding: 3,
      background: 'var(--color-bg)',
    }}>
      {tiles.map((tile, i) => (
        <div
          key={i}
          onClick={() => tile && onSelectArtwork(tile)}
          style={{
            position: 'relative',
            overflow: 'hidden',
            cursor: tile ? 'pointer' : 'default',
            background: '#111',
            borderRadius: 2,
          }}
        >
          {tile && (
            <>
              <img
                src={tile.imageUrl}
                alt={tile.title}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  opacity: 1,
                  transition: 'opacity 1.5s ease, transform 0.4s ease',
                }}
                draggable={false}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 8px 6px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
              }}
                className="tile-label"
              >
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontStyle: 'italic', color: 'var(--color-text)', lineHeight: 1.2, margin: 0 }}>
                  {tile.title}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--color-text-muted)', margin: 0 }}>
                  {tile.artist}
                </p>
              </div>
            </>
          )}
        </div>
      ))}

      <style>{`
        div:hover > .tile-label { opacity: 1 !important; }
        div:hover > img { transform: scale(1.05); }
      `}</style>
    </div>
  );
}
