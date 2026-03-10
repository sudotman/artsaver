import { Artwork, ArtProvider } from '../domain/artwork';

const BASE = 'https://www.rijksmuseum.nl/api/en/collection';
const API_KEY = '0fiuZFh4';

export const rijksProvider: ArtProvider = {
  name: 'Rijksmuseum',
  source: 'rijks',

  async fetchRandom(): Promise<Artwork | null> {
    try {
      const page = Math.floor(Math.random() * 50) + 1;
      const res = await fetch(
        `${BASE}?key=${API_KEY}&format=json&ps=10&p=${page}&imgonly=true&toppieces=true`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return null;

      const data = await res.json();
      const objects = (data.artObjects ?? []).filter(
        (o: any) => o.webImage?.url && o.title
      );
      if (objects.length === 0) return null;

      const pick = objects[Math.floor(Math.random() * objects.length)];

      const detailRes = await fetch(
        `${BASE}/${pick.objectNumber}?key=${API_KEY}&format=json`,
        { signal: AbortSignal.timeout(10000) }
      );

      let medium: string | undefined;
      let year = '';
      let artist = pick.principalOrFirstMaker || 'Unknown Artist';

      if (detailRes.ok) {
        const detail = await detailRes.json();
        const art = detail.artObject;
        if (art) {
          medium = art.physicalMedium || art.subTitle || undefined;
          year = art.dating?.presentingDate || '';
          if (art.principalMakers?.[0]?.name) {
            artist = art.principalMakers[0].name;
          }
        }
      }

      return {
        id: `rijks-${pick.objectNumber}`,
        title: pick.title,
        artist,
        year,
        medium,
        imageUrl: pick.webImage.url,
        source: 'rijks',
        sourceUrl: pick.links?.web || `https://www.rijksmuseum.nl/en/collection/${pick.objectNumber}`,
        collection: 'Rijksmuseum',
      };
    } catch {
      return null;
    }
  },
};
