import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';
import { apiFetch } from '../services/apiFetch';

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

const HIGHLIGHT_DEPARTMENTS = [11, 21, 6, 15, 9, 3, 13, 17, 19];

let cachedObjectIds: number[] | null = null;

async function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await apiFetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function getObjectIds(): Promise<number[]> {
  if (cachedObjectIds && cachedObjectIds.length > 0) return cachedObjectIds;
  const dept = HIGHLIGHT_DEPARTMENTS[Math.floor(Math.random() * HIGHLIGHT_DEPARTMENTS.length)];
  const res = await fetchWithTimeout(`${BASE}/search?departmentId=${dept}&hasImages=true&q=*`);
  if (!res.ok) throw new Error(`MET search failed: ${res.status}`);
  const data = await res.json();
  cachedObjectIds = (data.objectIDs ?? []) as number[];
  return cachedObjectIds;
}

function classifyMet(classification?: string): Artwork['category'] {
  if (!classification) return 'other';
  const lc = classification.toLowerCase();
  if (lc.includes('paint')) return 'painting';
  if (lc.includes('sculpt')) return 'sculpture';
  if (lc.includes('photo')) return 'photograph';
  if (lc.includes('draw')) return 'drawing';
  if (lc.includes('print')) return 'print';
  if (lc.includes('textile') || lc.includes('costume')) return 'textile';
  return 'other';
}

export const metProvider: ArtProvider = {
  name: 'Metropolitan Museum of Art',
  source: 'met',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('met', async () => {
      const ids = await getObjectIds();
      if (ids.length === 0) return null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const objectId = ids[Math.floor(Math.random() * ids.length)];
        const res = await fetchWithTimeout(`${BASE}/objects/${objectId}`);
        if (!res.ok) continue;

        const obj = await res.json();
        const imageUrl = obj.primaryImage || obj.primaryImageSmall;
        if (!imageUrl) continue;

        const cat = classifyMet(obj.classification);
        if (options?.category && cat !== options.category) continue;

        return {
          id: `met-${obj.objectID}`,
          title: obj.title || 'Untitled',
          artist: obj.artistDisplayName || 'Unknown Artist',
          year: obj.objectDate || '',
          medium: obj.medium || undefined,
          category: cat,
          imageUrl,
          source: 'met',
          sourceUrl: obj.objectURL || undefined,
          collection: 'The Metropolitan Museum of Art',
        };
      }
      return null;
    });
  },
};
