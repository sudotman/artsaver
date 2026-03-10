import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';

const BASE = 'https://api.si.edu/openaccess/api/v1.0';
const API_KEY = 'nMfBQmCpSCsKGIliNjJYUf6fJ0bqmLzfiCMOhqmP';

export const smithsonianProvider: ArtProvider = {
  name: 'Smithsonian Open Access',
  source: 'smithsonian',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('smithsonian', async () => {
      try {
        const start = Math.floor(Math.random() * 500);
        let query = 'art AND online_media_type:Images';

        if (options?.category === 'painting') query = 'painting AND online_media_type:Images';
        if (options?.category === 'sculpture') query = 'sculpture AND online_media_type:Images';
        if (options?.category === 'photograph') query = 'photograph AND online_media_type:Images';

        const res = await fetch(
          `${BASE}/search?api_key=${API_KEY}&q=${encodeURIComponent(query)}&rows=10&start=${start}&sort=random`,
          { signal: AbortSignal.timeout(12000) }
        );
        if (!res.ok) return null;

        const data = await res.json();
        const rows = data.response?.rows ?? [];

        for (const row of rows) {
          const content = row.content;
          if (!content) continue;

          const desc = content.descriptiveNonRepeating;
          const freetext = content.freetext;
          const indexed = content.indexedStructured;

          const media = desc?.online_media?.media;
          if (!media || media.length === 0) continue;

          const img = media.find((m: any) =>
            m.type === 'Images' && m.content && (m.content.includes('http') || m.content.includes('ids.si.edu'))
          );
          if (!img) continue;

          const imageUrl = img.content || img.thumbnail;
          if (!imageUrl) continue;

          const title = desc?.title?.content || 'Untitled';
          const artist = freetext?.name?.[0]?.content || indexed?.name?.[0] || 'Unknown Artist';
          const date = freetext?.date?.[0]?.content || indexed?.date?.[0] || '';
          const medium = freetext?.physicalDescription?.[0]?.content || '';
          const unitCode = desc?.unit_code || '';
          const guid = desc?.guid;

          const collectionMap: Record<string, string> = {
            SAAM: 'Smithsonian American Art Museum',
            NPG: 'National Portrait Gallery',
            HMSG: 'Hirshhorn Museum',
            FSG: 'Freer Gallery of Art',
            ACM: 'Archives of American Art',
          };

          return {
            id: `smithsonian-${row.id}`,
            title,
            artist: typeof artist === 'string' ? artist : 'Unknown Artist',
            year: typeof date === 'string' ? date : '',
            medium: medium || undefined,
            imageUrl,
            source: 'smithsonian',
            sourceUrl: guid || undefined,
            collection: collectionMap[unitCode] || 'Smithsonian Institution',
          };
        }
        return null;
      } catch {
        return null;
      }
    });
  },
};
