import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';
import { apiFetch } from '../services/apiFetch';

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
// The Met retired /v1/search on 2026-10-01; v1.1 is paginated with offset and limit.
const SEARCH = 'https://collectionapi.metmuseum.org/public/collection/v1.1/search';
const PAGE = 20;
const MAX_OFFSET = 9_980; // Elasticsearch won't page past 10,000 results

const HIGHLIGHT_DEPARTMENTS = [11, 21, 6, 15, 9, 3, 13, 17, 19];

const totals = new Map<number, number>();

async function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await apiFetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function search(dept: number, offset: number, limit: number): Promise<{ total: number; objectIDs: number[] }> {
  const res = await fetchWithTimeout(`${SEARCH}?q=*&hasImages=true&departmentId=${dept}&limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`MET search failed: ${res.status}`);
  const data = await res.json();
  return { total: data.total ?? 0, objectIDs: (data.objectIDs ?? []) as number[] };
}

/** A random page of object IDs (with images) from a random highlight department. */
async function getObjectIds(): Promise<number[]> {
  const dept = HIGHLIGHT_DEPARTMENTS[Math.floor(Math.random() * HIGHLIGHT_DEPARTMENTS.length)];
  let total = totals.get(dept);
  if (total === undefined) {
    total = (await search(dept, 0, 1)).total;
    totals.set(dept, total);
  }
  if (!total) return [];
  const offset = Math.floor(Math.random() * Math.max(1, Math.min(total, MAX_OFFSET) - PAGE));
  return (await search(dept, offset, PAGE)).objectIDs;
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
          size: metSize(obj.measurements),
          wikidata: { artist: qid(obj.artistWikidata_URL), object: qid(obj.objectWikidata_URL) },
          born: Number(obj.artistBeginDate) || undefined,
          period: obj.period || undefined,
        };
      }
      return null;
    });
  },
};

/** The object's "Overall" height and width (the Met measures in centimetres), or the first part that has both. */
function metSize(measurements?: { elementName?: string; elementMeasurements?: Record<string, number> }[]): Artwork['size'] {
  const parts = (measurements ?? []).filter(m => m.elementMeasurements?.Height && m.elementMeasurements?.Width);
  const m = (parts.find(p => p.elementName === 'Overall') ?? parts[0])?.elementMeasurements;
  return m ? { width: m.Width, height: m.Height } : undefined;
}

/** "https://www.wikidata.org/wiki/Q5582" → "Q5582". */
function qid(url?: string): string | undefined {
  return url?.match(/\/(Q\d+)$/)?.[1];
}
