import { useState, useEffect, useCallback } from 'react';
import { Artwork, FavoriteEntry, HistoryEntry } from '../domain/artwork';

const MAX_HISTORY = 500;

interface FavoritesData {
  favorites: FavoriteEntry[];
  history: HistoryEntry[];
}

async function loadData(): Promise<FavoritesData> {
  if (!window.electronAPI) return { favorites: [], history: [] };
  try {
    const settings = await window.electronAPI.getSettings();
    return {
      favorites: (settings._favorites as FavoriteEntry[]) ?? [],
      history: (settings._history as HistoryEntry[]) ?? [],
    };
  } catch {
    return { favorites: [], history: [] };
  }
}

async function persistData(data: FavoritesData): Promise<void> {
  if (!window.electronAPI) return;
  const settings = await window.electronAPI.getSettings();
  await window.electronAPI.saveSettings({
    ...settings,
    _favorites: data.favorites,
    _history: data.history,
  });
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData().then(data => {
      setFavorites(data.favorites);
      setHistory(data.history);
      setLoaded(true);
    });
  }, []);

  const addFavorite = useCallback((artwork: Artwork) => {
    setFavorites(prev => {
      if (prev.some(f => f.artwork.id === artwork.id)) return prev;
      const next = [{ artwork, addedAt: Date.now() }, ...prev];
      persistData({ favorites: next, history });
      return next;
    });
  }, [history]);

  const removeFavorite = useCallback((artworkId: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.artwork.id !== artworkId);
      persistData({ favorites: next, history });
      return next;
    });
  }, [history]);

  const isFavorite = useCallback((artworkId: string) => {
    return favorites.some(f => f.artwork.id === artworkId);
  }, [favorites]);

  const addToHistory = useCallback((artwork: Artwork) => {
    setHistory(prev => {
      const entry: HistoryEntry = { artwork, shownAt: Date.now() };
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      persistData({ favorites, history: next });
      return next;
    });
  }, [favorites]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    persistData({ favorites, history: [] });
  }, [favorites]);

  const exportFavorites = useCallback(() => {
    const data = JSON.stringify(favorites, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artsaver-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [favorites]);

  const exportFavoritesHTML = useCallback(() => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ArtSaver Favorites</title>
<style>
  body { font-family: Georgia, serif; background: #0a0a0a; color: #e8e4df; padding: 40px; max-width: 1200px; margin: 0 auto; }
  h1 { font-weight: 300; letter-spacing: 0.1em; border-bottom: 1px solid #333; padding-bottom: 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
  .card { background: #141414; border-radius: 8px; overflow: hidden; }
  .card img { width: 100%; height: 200px; object-fit: cover; }
  .card .info { padding: 16px; }
  .card h2 { font-size: 16px; font-weight: 400; font-style: italic; margin: 0 0 4px; }
  .card p { font-size: 13px; color: #9a948c; margin: 0; }
  .card a { color: #c9a96e; text-decoration: none; font-size: 12px; }
</style></head><body>
<h1>ArtSaver Favorites</h1>
<div class="grid">
${favorites.map(f => `<div class="card">
  <img src="${f.artwork.imageUrl}" alt="${f.artwork.title}" loading="lazy">
  <div class="info">
    <h2>${f.artwork.title}</h2>
    <p>${f.artwork.artist}${f.artwork.year ? ', ' + f.artwork.year : ''}</p>
    <p>${f.artwork.collection}</p>
    ${f.artwork.sourceUrl ? `<a href="${f.artwork.sourceUrl}" target="_blank">View on museum site</a>` : ''}
  </div>
</div>`).join('\n')}
</div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artsaver-favorites-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [favorites]);

  return {
    favorites, history, loaded,
    addFavorite, removeFavorite, isFavorite,
    addToHistory, clearHistory,
    exportFavorites, exportFavoritesHTML,
  };
}
