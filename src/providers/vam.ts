import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';
import { apiFetch } from '../services/apiFetch';

const BASE = 'https://api.vam.ac.uk/v2/objects/search';

/** Paintings most often, then works on paper and photographs. */
const DEFAULT_TYPES = ['painting', 'painting', 'oil painting', 'watercolour', 'drawing', 'print', 'photograph'];
const VAM_TYPES: Record<string, string> = {
  painting: 'painting', photograph: 'photograph', drawing: 'drawing', print: 'print', sculpture: 'sculpture', textile: 'textile',
};
const counts = new Map<string, number>();

export const vamProvider: ArtProvider = {
  name: 'Victoria and Albert Museum',
  source: 'vam',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('vam', async () => {
      // By object type, across the whole result set: a free-text search matched only ~500 records,
      // in runs of ten by one photographer.
      const type = options?.category && VAM_TYPES[options.category]
        ? VAM_TYPES[options.category]
        : DEFAULT_TYPES[Math.floor(Math.random() * DEFAULT_TYPES.length)];
      // The API serves the first 10,000 records of a search (1,000 pages of ten).
      const pages = Math.min(1000, Math.ceil((counts.get(type) ?? 1000) / 10));
      const page = Math.floor(Math.random() * pages) + 1;
      const url = `${BASE}?q_object_type=${encodeURIComponent(type)}&images_exist=true&page_size=10&page=${page}`;

      const res = await apiFetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`V&A API returned ${res.status}`);

      const data = await res.json();
      if (data.info?.record_count) counts.set(type, data.info.record_count);
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
