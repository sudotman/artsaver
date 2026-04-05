import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';
import { apiFetch } from '../services/apiFetch';

const BASE = 'https://openaccess-api.clevelandart.org/api/artworks/';

export const clevelandProvider: ArtProvider = {
  name: 'Cleveland Museum of Art',
  source: 'cleveland',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('cleveland', async () => {
      try {
        const skip = Math.floor(Math.random() * 5000);
        let url = `${BASE}?has_image=1&limit=10&skip=${skip}`;

        if (options?.category) {
          const typeMap: Record<string, string> = {
            painting: 'Painting',
            sculpture: 'Sculpture',
            photograph: 'Photograph',
            drawing: 'Drawing',
            print: 'Print',
            textile: 'Textile',
          };
          if (typeMap[options.category]) url += `&type=${typeMap[options.category]}`;
        }

        const res = await apiFetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return null;

        const data = await res.json();
        const artworks = (data.data ?? []).filter(
          (a: any) => a.images?.web?.url && a.title
        );
        if (artworks.length === 0) return null;

        const pick = artworks[Math.floor(Math.random() * artworks.length)];

        const artistRaw = pick.creators?.[0]?.description || 'Unknown Artist';
        const artist = artistRaw.split('(')[0].trim();

        return {
          id: `cleveland-${pick.id}`,
          title: pick.title || 'Untitled',
          artist,
          year: pick.creation_date || '',
          medium: pick.technique || undefined,
          category: classifyCleveland(pick.type),
          imageUrl: pick.images.web.url,
          source: 'cleveland',
          sourceUrl: pick.url || `https://clevelandart.org/art/${pick.accession_number}`,
          collection: 'Cleveland Museum of Art',
        };
      } catch (err) {
        console.error('[CLEVELAND] fetch failed:', err);
        return null;
      }
    });
  },
};

function classifyCleveland(type?: string): Artwork['category'] {
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
