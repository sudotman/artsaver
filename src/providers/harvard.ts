import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';

const BASE = 'https://api.harvardartmuseums.org';
const API_KEY = 'a9284980-a037-11ea-8a73-f5e867fad490';

export const harvardProvider: ArtProvider = {
  name: 'Harvard Art Museums',
  source: 'harvard',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('harvard', async () => {
      try {
        const page = Math.floor(Math.random() * 80) + 1;
        let url = `${BASE}/object?apikey=${API_KEY}&size=10&page=${page}&hasimage=1&sort=random`;

        if (options?.category) {
          const classMap: Record<string, string> = {
            painting: 'Paintings',
            sculpture: 'Sculpture',
            photograph: 'Photographs',
            drawing: 'Drawings',
            print: 'Prints',
          };
          if (classMap[options.category]) {
            url += `&classification=${encodeURIComponent(classMap[options.category])}`;
          }
        }

        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return null;

        const data = await res.json();
        const records = (data.records ?? []).filter(
          (r: any) => r.primaryimageurl && r.title
        );
        if (records.length === 0) return null;

        const pick = records[Math.floor(Math.random() * records.length)];

        return {
          id: `harvard-${pick.objectid}`,
          title: pick.title || 'Untitled',
          artist: pick.people?.[0]?.name || 'Unknown Artist',
          year: pick.dated || '',
          medium: pick.medium || undefined,
          category: classifyHarvard(pick.classification),
          imageUrl: pick.primaryimageurl,
          source: 'harvard',
          sourceUrl: pick.url || undefined,
          collection: 'Harvard Art Museums',
        };
      } catch {
        return null;
      }
    });
  },
};

function classifyHarvard(c?: string): Artwork['category'] {
  if (!c) return 'other';
  const lc = c.toLowerCase();
  if (lc.includes('paint')) return 'painting';
  if (lc.includes('sculpt')) return 'sculpture';
  if (lc.includes('photo')) return 'photograph';
  if (lc.includes('draw')) return 'drawing';
  if (lc.includes('print')) return 'print';
  return 'other';
}
