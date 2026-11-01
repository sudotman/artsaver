import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';
import { apiFetch } from '../services/apiFetch';

const BASE = 'https://api.vam.ac.uk/v2/objects/search';

export const vamProvider: ArtProvider = {
  name: 'Victoria and Albert Museum',
  source: 'vam',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('vam', async () => {
      const page = Math.floor(Math.random() * 200) + 1;
      let query = 'painting OR sculpture OR photograph OR drawing';

      if (options?.category) {
        const typeMap: Record<string, string> = {
          painting: 'Painting',
          sculpture: 'Sculpture',
          photograph: 'Photograph',
          drawing: 'Drawing',
          print: 'Print',
          textile: 'Textile',
        };
        query = typeMap[options.category] || query;
      }

      const url = `${BASE}?q=${encodeURIComponent(query)}&images_exist=true&page_size=10&page=${page}`;

      const res = await apiFetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`V&A API returned ${res.status}`);

      const data = await res.json();
      const records = (data.records ?? []).filter(
        (r: any) => r._images?._iiif_image_base_url && r._primaryTitle
      );
      if (records.length === 0) return null;

      const pick = records[Math.floor(Math.random() * records.length)];

      const iiifBase = pick._images._iiif_image_base_url;
      const imageUrl = `${iiifBase}full/!1200,1200/0/default.jpg`;

      return {
        id: `vam-${pick.systemNumber}`,
        title: pick._primaryTitle || 'Untitled',
        artist: pick._primaryMaker?.name || 'Unknown Artist',
        year: pick._primaryDate || '',
        category: classifyVam(pick.objectType),
        imageUrl,
        source: 'vam',
        sourceUrl: `https://collections.vam.ac.uk/item/${pick.systemNumber}`,
        collection: 'Victoria and Albert Museum',
        size: await vamSize(pick.systemNumber),
        largeImageUrl: `${iiifBase}full/!3200,3200/0/default.jpg`,
      };
    });
  },
};

function classifyVam(type?: string): Artwork['category'] {
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

const UNIT_CM: Record<string, number> = { mm: 0.1, cm: 1, m: 100, in: 2.54 };

/** Search results carry no measurements; the object record does. Unframed or overall over framed. */
async function vamSize(systemNumber: string): Promise<Artwork['size']> {
  try {
    const res = await apiFetch(`https://api.vam.ac.uk/v2/object/${systemNumber}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return undefined;
    const dims: { dimension?: string; value?: string; unit?: string; part?: string }[] = (await res.json()).record?.dimensions ?? [];
    const rank = (part = '') => (/frame|mount|case/i.test(part) ? 1 : 0);
    const cm = (name: string) => dims
      .filter(d => d.dimension === name && UNIT_CM[d.unit ?? ''] && parseFloat(d.value ?? ''))
      .sort((a, b) => rank(a.part) - rank(b.part))
      .map(d => parseFloat(d.value!) * UNIT_CM[d.unit!])[0];
    const width = cm('Width'), height = cm('Height');
    return width && height ? { width, height } : undefined;
  } catch { return undefined; }
}
