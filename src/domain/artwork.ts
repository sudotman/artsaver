export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  medium?: string;
  category?: ArtCategory;
  imageUrl: string;
  source: ArtSource;
  sourceUrl?: string;
  collection: string;
  timestamp?: number;
}

export type ArtSource = 'met' | 'chicago' | 'cleveland' | 'vam' | 'local';

export type ArtCategory = 'painting' | 'sculpture' | 'photograph' | 'drawing' | 'print' | 'decorative' | 'textile' | 'other';

export interface ArtProvider {
  name: string;
  source: ArtSource;
  fetchRandom(options?: FetchOptions): Promise<Artwork | null>;
}

export interface FetchOptions {
  maxWidth?: number;
  category?: ArtCategory;
  centuryRange?: [number, number];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  filters: PlaylistFilters;
  artworkIds?: string[];
  isBuiltIn: boolean;
}

export interface PlaylistFilters {
  sources?: ArtSource[];
  categories?: ArtCategory[];
  centuryRange?: [number, number];
  searchTerms?: string[];
}

export interface FavoriteEntry {
  artwork: Artwork;
  addedAt: number;
}

export interface HistoryEntry {
  artwork: Artwork;
  shownAt: number;
}
