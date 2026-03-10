import { Artwork, ArtProvider } from '../domain/artwork';

const BASE = 'https://api.artic.edu/api/v1';
const IIIF_BASE = 'https://www.artic.edu/iiif/2';

const FIELDS = [
  'id',
  'title',
  'artist_display',
  'date_display',
  'medium_display',
  'image_id',
  'api_link',
].join(',');

export const chicagoProvider: ArtProvider = {
  name: 'Art Institute of Chicago',
  source: 'chicago',

  async fetchRandom(): Promise<Artwork | null> {
    try {
      const page = Math.floor(Math.random() * 100) + 1;
      const res = await fetch(
        `${BASE}/artworks?fields=${FIELDS}&limit=12&page=${page}&query[term][is_public_domain]=true`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return null;

      const data = await res.json();
      const artworks = (data.data ?? []).filter(
        (a: any) => a.image_id && a.title
      );
      if (artworks.length === 0) return null;

      const pick = artworks[Math.floor(Math.random() * artworks.length)];
      const imageUrl = `${IIIF_BASE}/${pick.image_id}/full/1200,/0/default.jpg`;

      const artistRaw: string = pick.artist_display || 'Unknown Artist';
      const artist = artistRaw.split('\n')[0].trim();

      return {
        id: `chicago-${pick.id}`,
        title: pick.title,
        artist,
        year: pick.date_display || '',
        medium: pick.medium_display || undefined,
        imageUrl,
        source: 'chicago',
        sourceUrl: `https://www.artic.edu/artworks/${pick.id}`,
        collection: 'Art Institute of Chicago',
      };
    } catch {
      return null;
    }
  },
};
