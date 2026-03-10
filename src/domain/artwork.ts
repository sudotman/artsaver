export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  medium?: string;
  imageUrl: string;
  source: ArtSource;
  sourceUrl?: string;
  collection: string;
}

export type ArtSource = 'met' | 'chicago' | 'rijks' | 'local';

export interface ArtProvider {
  name: string;
  source: ArtSource;
  fetchRandom(): Promise<Artwork | null>;
}
