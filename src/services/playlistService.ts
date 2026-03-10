import { Playlist, ArtSource } from '../domain/artwork';

export const BUILT_IN_PLAYLISTS: Playlist[] = [
  {
    id: 'dutch-golden-age',
    name: 'Dutch Golden Age',
    description: 'Rembrandt, Vermeer, and the masters of 17th-century Netherlands',
    filters: {
      sources: ['rijks', 'met'],
      categories: ['painting'],
      centuryRange: [1600, 1700],
      searchTerms: ['Dutch', 'Golden Age'],
    },
    isBuiltIn: true,
  },
  {
    id: 'impressionism',
    name: 'Impressionism',
    description: 'Monet, Renoir, Degas, and the light of modern Paris',
    filters: {
      sources: ['met', 'chicago'],
      categories: ['painting'],
      centuryRange: [1860, 1910],
      searchTerms: ['Impressionist', 'Impressionism'],
    },
    isBuiltIn: true,
  },
  {
    id: 'japanese-ukiyo-e',
    name: 'Japanese Ukiyo-e',
    description: 'Hokusai, Hiroshige, and the floating world',
    filters: {
      sources: ['met', 'chicago', 'rijks'],
      categories: ['print'],
      searchTerms: ['ukiyo-e', 'Japanese woodblock'],
    },
    isBuiltIn: true,
  },
  {
    id: 'abstract-expressionism',
    name: 'Abstract Expressionism',
    description: 'Pollock, de Kooning, Rothko, and the New York School',
    filters: {
      sources: ['met', 'chicago', 'smithsonian'],
      categories: ['painting'],
      centuryRange: [1940, 1970],
      searchTerms: ['Abstract Expressionism'],
    },
    isBuiltIn: true,
  },
  {
    id: 'portraits-through-ages',
    name: 'Portraits Through the Ages',
    description: 'The human face across centuries and cultures',
    filters: {
      categories: ['painting'],
      searchTerms: ['portrait'],
    },
    isBuiltIn: true,
  },
  {
    id: 'renaissance-masters',
    name: 'Renaissance Masters',
    description: 'Leonardo, Michelangelo, Raphael, and the rebirth of art',
    filters: {
      sources: ['met', 'rijks', 'nga'],
      categories: ['painting'],
      centuryRange: [1400, 1600],
      searchTerms: ['Renaissance'],
    },
    isBuiltIn: true,
  },
  {
    id: 'photography-icons',
    name: 'Photography Icons',
    description: 'Defining moments captured through the lens',
    filters: {
      categories: ['photograph'],
      searchTerms: ['photograph'],
    },
    isBuiltIn: true,
  },
  {
    id: 'sculpture-garden',
    name: 'Sculpture Garden',
    description: 'Three-dimensional masterworks from antiquity to modern',
    filters: {
      categories: ['sculpture'],
    },
    isBuiltIn: true,
  },
];

export function getPlaylist(id: string, custom: Playlist[] = []): Playlist | undefined {
  return [...BUILT_IN_PLAYLISTS, ...custom].find(p => p.id === id);
}

export function createCustomPlaylist(name: string, artworkIds: string[]): Playlist {
  return {
    id: `custom-${Date.now()}`,
    name,
    description: `Custom playlist with ${artworkIds.length} artworks`,
    filters: {},
    artworkIds,
    isBuiltIn: false,
  };
}

export function exportPlaylistConfig(playlist: Playlist): string {
  return JSON.stringify({ type: 'artsaver-playlist', version: 1, playlist }, null, 2);
}

export function importPlaylistConfig(json: string): Playlist | null {
  try {
    const data = JSON.parse(json);
    if (data.type !== 'artsaver-playlist') return null;
    return data.playlist as Playlist;
  } catch {
    return null;
  }
}

export function exportFullConfig(settings: Record<string, unknown>, playlists: Playlist[]): string {
  return JSON.stringify({
    type: 'artsaver-config',
    version: 1,
    settings,
    playlists: playlists.filter(p => !p.isBuiltIn),
  }, null, 2);
}

export function importFullConfig(json: string): { settings: Record<string, unknown>; playlists: Playlist[] } | null {
  try {
    const data = JSON.parse(json);
    if (data.type !== 'artsaver-config') return null;
    return { settings: data.settings, playlists: data.playlists ?? [] };
  } catch {
    return null;
  }
}
