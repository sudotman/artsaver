import React, { useState } from 'react';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  visible: boolean;
}

export function FavoriteButton({ isFavorite, onToggle, visible }: FavoriteButtonProps) {
  const [pulse, setPulse] = useState(false);

  const handleClick = () => {
    onToggle();
    if (!isFavorite) {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
  };

  return (
    <button
      onClick={handleClick}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        position: 'fixed',
        bottom: 36,
        right: 28,
        zIndex: 15,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: `scale(${pulse ? 1.3 : 1})`,
        transition: 'opacity var(--transition-medium), transform 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
        padding: 8,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={isFavorite ? 'var(--color-accent)' : 'none'} stroke="var(--color-accent)" strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  );
}
