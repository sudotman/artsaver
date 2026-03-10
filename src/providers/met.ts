import { Artwork, ArtProvider } from '../domain/artwork';

const BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

const HIGHLIGHT_DEPARTMENTS = [
  11, // European Paintings
  21, // Modern Art
  6,  // Asian Art
  15, // The Robert Lehman Collection
  9,  // Drawings and Prints
];

let cachedObjectIds: number[] | null = null;

async function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function getObjectIds(): Promise<number[]> {
  if (cachedObjectIds && cachedObjectIds.length > 0) return cachedObjectIds;

  const dept = HIGHLIGHT_DEPARTMENTS[Math.floor(Math.random() * HIGHLIGHT_DEPARTMENTS.length)];
  const res = await fetchWithTimeout(
    `${BASE}/search?departmentId=${dept}&hasImages=true&q=*`
  );
  if (!res.ok) throw new Error(`MET search failed: ${res.status}`);
  const data = await res.json();
  cachedObjectIds = (data.objectIDs ?? []) as number[];
  return cachedObjectIds;
}

export const metProvider: ArtProvider = {
  name: 'Metropolitan Museum of Art',
  source: 'met',

  async fetchRandom(): Promise<Artwork | null> {
    try {
      const ids = await getObjectIds();
      if (ids.length === 0) return null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const objectId = ids[Math.floor(Math.random() * ids.length)];
        const res = await fetchWithTimeout(`${BASE}/objects/${objectId}`);
        if (!res.ok) continue;

        const obj = await res.json();
        const imageUrl = obj.primaryImage || obj.primaryImageSmall;
        if (!imageUrl) continue;

        return {
          id: `met-${obj.objectID}`,
          title: obj.title || 'Untitled',
          artist: obj.artistDisplayName || 'Unknown Artist',
          year: obj.objectDate || '',
          medium: obj.medium || undefined,
          imageUrl,
          source: 'met',
          sourceUrl: obj.objectURL || undefined,
          collection: 'The Metropolitan Museum of Art',
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
