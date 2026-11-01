import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';
import { apiFetch } from '../services/apiFetch';

const BASE = 'https://openaccess-api.clevelandart.org/api/artworks/';

// How many images each query matches, learned from the first answer, so offsets reach the whole
// collection rather than its first few thousand (where one Byzantine gospel book's 800 leaves sit).
const totals = new Map<string, number>();

/**
 * Pictures, paintings most often. Across the whole collection most images are objects (lace, spoons,
 * chairs), which a wall of art doesn't want unless a category asks for them.
 */
const PICTURE_TYPES = ['Painting', 'Painting', 'Painting', 'Drawing', 'Drawing', 'Print', 'Print', 'Photograph'];

/** Leaves of bound books (manuscript folios) are text pages, and come in runs of hundreds. */
function isArt(a: any): boolean {
  return a.images?.web?.url && a.title && a.type !== 'Bound Volume' && !/\bfolio\b/i.test(a.title);
}

export const clevelandProvider: ArtProvider = {
  name: 'Cleveland Museum of Art',
  source: 'cleveland',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('cleveland', async () => {
      let query = 'has_image=1';

      if (options?.category) {
        const typeMap: Record<string, string> = {
          painting: 'Painting',
          sculpture: 'Sculpture',
          photograph: 'Photograph',
          drawing: 'Drawing',
          print: 'Print',
          textile: 'Textile',
        };
        if (typeMap[options.category]) query += `&type=${typeMap[options.category]}`;
      } else {
        query += `&type=${PICTURE_TYPES[Math.floor(Math.random() * PICTURE_TYPES.length)]}`;
      }
      const total = totals.get(query) ?? 5000;
      const url = `${BASE}?${query}&limit=10&skip=${Math.floor(Math.random() * Math.max(1, total - 10))}`;

      const res = await apiFetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`Cleveland API returned ${res.status}`);

      const data = await res.json();
      if (data.info?.total) totals.set(query, data.info.total);
      const artworks = (data.data ?? []).filter(isArt);
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
        size: clevelandSize(pick.dimensions),
        // "Jean-Léon Gérôme (French, 1824–1904)": the birth year tells namesakes apart on Wikidata.
        born: Number(artistRaw.match(/(\d{4})\s*[–-]/)?.[1]) || undefined,
        largeImageUrl: pick.images.print?.url,
      };
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

/** Cleveland gives metres; the canvas itself (unframed) when it can. */
function clevelandSize(d?: Record<string, { width?: number; height?: number } | undefined>): Artwork['size'] {
  const part = [d?.unframed, d?.framed, ...Object.values(d ?? {})].find(p => p?.width && p?.height);
  return part ? { width: part.width! * 100, height: part.height! * 100 } : undefined;
}
