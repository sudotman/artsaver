import { Artwork, ArtProvider, FetchOptions } from '../domain/artwork';
import { withRateLimit } from '../services/rateLimiter';

const BASE = 'https://api.nga.gov/art/v1';

export const ngaProvider: ArtProvider = {
  name: 'National Gallery of Art',
  source: 'nga',

  async fetchRandom(options?: FetchOptions): Promise<Artwork | null> {
    return withRateLimit('nga', async () => {
      try {
        const skip = Math.floor(Math.random() * 2000);
        let url = `${BASE}/artworks?hasImage=true&limit=10&skip=${skip}`;

        if (options?.category === 'painting') url += '&classification=painting';
        if (options?.category === 'sculpture') url += '&classification=sculpture';
        if (options?.category === 'photograph') url += '&classification=photograph';

        const res = await fetch(url, {
          signal: AbortSignal.timeout(12000),
          headers: { 'Accept': 'application/json' },
        });
        if (!res.ok) return null;

        const data = await res.json();
        const items = (data.data ?? data.artObjects ?? data ?? []);
        const artworks = (Array.isArray(items) ? items : []).filter(
          (a: any) => (a.images?.[0]?.url || a.primaryImage) && a.title
        );

        if (artworks.length === 0) return null;

        const pick = artworks[Math.floor(Math.random() * artworks.length)];
        const imageUrl = pick.images?.[0]?.url || pick.primaryImage;
        if (!imageUrl) return null;

        return {
          id: `nga-${pick.id || pick.objectID}`,
          title: pick.title || 'Untitled',
          artist: pick.artistNames?.[0] || pick.attribution || 'Unknown Artist',
          year: pick.displayDate || pick.dated || '',
          medium: pick.medium || undefined,
          imageUrl,
          source: 'nga',
          sourceUrl: `https://www.nga.gov/collection/art-object-page.${pick.id || pick.objectID}.html`,
          collection: 'National Gallery of Art',
        };
      } catch {
        return null;
      }
    });
  },
};
