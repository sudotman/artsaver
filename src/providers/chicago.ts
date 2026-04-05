import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';
import { negotiateImageSize } from '../services/imageUtils';
import { apiFetch } from '../services/apiFetch';

const BASE = 'https://api.artic.edu/api/v1';
const IIIF_BASE = 'https://www.artic.edu/iiif/2';

const FIELDS = ['id', 'title', 'artist_display', 'date_display', 'medium_display', 'image_id', 'artwork_type_title', 'api_link'].join(',');

export const chicagoProvider: ArtProvider = {
  name: 'Art Institute of Chicago',
  source: 'chicago',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('chicago', async () => {
      try {
        const page = Math.floor(Math.random() * 100) + 1;
        let url = `${BASE}/artworks?fields=${FIELDS}&limit=12&page=${page}&query[term][is_public_domain]=true`;

        if (options?.category) {
          const typeMap: Record<string, string> = { painting: 'Painting', sculpture: 'Sculpture', photograph: 'Photograph', drawing: 'Drawing', print: 'Print', textile: 'Textile' };
          if (typeMap[options.category]) url += `&query[term][artwork_type_title]=${typeMap[options.category]}`;
        }

        const res = await apiFetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;

        const data = await res.json();
        const artworks = (data.data ?? []).filter((a: any) => a.image_id && a.title);
        if (artworks.length === 0) return null;

        const pick = artworks[Math.floor(Math.random() * artworks.length)];
        const rawUrl = `${IIIF_BASE}/${pick.image_id}/full/1200,/0/default.jpg`;
        const imageUrl = negotiateImageSize(rawUrl, options?.maxWidth);

        const artistRaw: string = pick.artist_display || 'Unknown Artist';
        const artist = artistRaw.split('\n')[0].trim();

        return {
          id: `chicago-${pick.id}`,
          title: pick.title,
          artist,
          year: pick.date_display || '',
          medium: pick.medium_display || undefined,
          category: classifyChicago(pick.artwork_type_title),
          imageUrl,
          source: 'chicago',
          sourceUrl: `https://www.artic.edu/artworks/${pick.id}`,
          collection: 'Art Institute of Chicago',
        };
      } catch (err) {
        console.error('[CHICAGO] fetch failed:', err);
        return null;
      }
    });
  },
};

function classifyChicago(type?: string): Artwork['category'] {
  if (!type) return 'other';
  const lc = type.toLowerCase();
  if (lc.includes('paint')) return 'painting';
  if (lc.includes('sculpt')) return 'sculpture';
  if (lc.includes('photo')) return 'photograph';
  if (lc.includes('draw')) return 'drawing';
  if (lc.includes('print')) return 'print';
  if (lc.includes('textile')) return 'textile';
  return 'other';
}
