import React from 'react';
import { Playlist } from '../domain/artwork';
import { BUILT_IN_PLAYLISTS } from '../services/playlistService';

interface PlaylistPanelProps {
  activePlaylist: string | null;
  customPlaylists: Playlist[];
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

export function PlaylistPanel({ activePlaylist, customPlaylists, onSelect, onClose }: PlaylistPanelProps) {
  const all = [...BUILT_IN_PLAYLISTS, ...customPlaylists];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />

      <div style={{
        position: 'relative', width: 480, maxHeight: '80vh', background: '#141414',
        border: '1px solid var(--color-border)', borderRadius: 12, zIndex: 201,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, letterSpacing: '0.08em', color: 'var(--color-text)' }}>
            Playlists
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 20 }}>&times;</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <PlaylistCard
            name="Shuffle All"
            description="Random artwork from all enabled sources"
            active={!activePlaylist}
            onClick={() => onSelect(null)}
          />

          {all.map(p => (
            <PlaylistCard
              key={p.id}
              name={p.name}
              description={p.description}
              active={activePlaylist === p.id}
              onClick={() => onSelect(p.id)}
              isCustom={!p.isBuiltIn}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaylistCard({ name, description, active, onClick, isCustom }: {
  name: string; description: string; active: boolean; onClick: () => void; isCustom?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 16px',
        marginBottom: 8,
        borderRadius: 8,
        cursor: 'pointer',
        background: active ? 'rgba(201, 169, 110, 0.1)' : hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: active ? '1px solid rgba(201, 169, 110, 0.3)' : '1px solid transparent',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400,
          color: active ? 'var(--color-accent)' : 'var(--color-text)', margin: 0,
        }}>
          {name}
        </h3>
        {active && <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active</span>}
        {isCustom && <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Custom</span>}
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
        {description}
      </p>
    </div>
  );
}
