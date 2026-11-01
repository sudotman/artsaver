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
  /** The object's own size in centimetres, when the museum publishes it. */
  size?: ArtSize;
  /** A higher-resolution image than imageUrl, for big pieces shown full screen on the TV. */
  largeImageUrl?: string;
  /** What finds the artist's art movement on Wikidata: ids when the museum links them, else a birth year. */
  wikidata?: { artist?: string; object?: string };
  born?: number;
  /** The museum's own period, for work no movement claims ("Edo period (1615–1868)"). */
  period?: string;
}

export interface ArtSize { width: number; height: number; }

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
