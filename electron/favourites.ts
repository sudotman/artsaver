// Favourites: pieces kept from the desktop or from the TV. The list lives in settings.json under
// `_favorites` (the shape the desktop panel has always used); each piece's picture is copied to disk,
// because the TV ring forgets a piece within the hour and a museum can move or drop its image.
import * as fs from 'fs';
import * as path from 'path';
import { loadOriginal, isBig, BIG_EDGE, type Original } from './artFeed';

export interface FavouriteArtwork {
  id: string;
  title: string;
  artist: string;
  year?: string;
  medium?: string;
  collection?: string;
  imageUrl: string;
  source: string;
  sourceUrl?: string;
  size?: { width: number; height: number };
  largeImageUrl?: string;
  movement?: string;
  period?: string;
  [extra: string]: unknown;
}

/** The copy on disk: a file under the favourites folder, its size and colours. */
export interface FavouritePicture { file: string; width: number; height: number; palette: string[]; }

export interface FavouriteEntry { artwork: FavouriteArtwork; addedAt: number; picture?: FavouritePicture; }

export interface Favourites {
  list(): FavouriteEntry[];
  has(id: string): boolean;
  /** Keeps a piece (no-op if it's already kept). [original] saves a download when the caller has the image. */
  keep(artwork: FavouriteArtwork, original?: Original | null): Promise<FavouriteEntry>;
  unkeep(id: string): Promise<boolean>;
  /** Copies down pictures for favourites kept before pictures were saved (the desktop's older ones). */
  fill(): Promise<void>;
  /** The absolute path of a saved picture, or null for a name that isn't one. */
  picturePath(file: string): string | null;
}

export function fileFor(id: string): string {
  return `${id.replace(/[^a-zA-Z0-9-]/g, '_')}.jpg`;
}

export function createFavourites(opts: {
  dir: string;
  read: () => FavouriteEntry[];
  write: (list: FavouriteEntry[]) => void;
  changed: (list: FavouriteEntry[]) => void;
}): Favourites {
  fs.mkdirSync(opts.dir, { recursive: true });

  // One change at a time: each reads the list fresh, so a keep never overwrites another.
  let lock: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const next = lock.then(work, work);
    lock = next.catch(() => {});
    return next;
  }

  function save(list: FavouriteEntry[]) {
    opts.write(list);
    opts.changed(list);
  }

  async function picture(artwork: FavouriteArtwork, original?: Original | null): Promise<FavouritePicture | undefined> {
    let img = original ?? null;
    if (!img) {
      const big = isBig(artwork.size);
      if (big && artwork.largeImageUrl) img = await loadOriginal(artwork.largeImageUrl, BIG_EDGE).catch(() => null);
      img ??= await loadOriginal(artwork.imageUrl, big ? BIG_EDGE : undefined).catch(() => null);
    }
    if (!img) return undefined;
    const file = fileFor(artwork.id);
    await fs.promises.writeFile(path.join(opts.dir, file), img.buffer);
    return { file, width: img.width, height: img.height, palette: img.palette };
  }

  return {
    list: () => opts.read(),
    has: id => opts.read().some(f => f.artwork.id === id),

    keep: (artwork, original) => serial(async () => {
      const existing = opts.read().find(f => f.artwork.id === artwork.id);
      if (existing) return existing;
      const entry: FavouriteEntry = { artwork, addedAt: Date.now(), picture: await picture(artwork, original) };
      save([entry, ...opts.read().filter(f => f.artwork.id !== artwork.id)]);
      return entry;
    }),

    unkeep: id => serial(async () => {
      const list = opts.read();
      const gone = list.find(f => f.artwork.id === id);
      if (!gone) return false;
      save(list.filter(f => f !== gone));
      if (gone.picture) await fs.promises.rm(path.join(opts.dir, gone.picture.file), { force: true });
      return true;
    }),

    fill: async () => {
      for (const missing of opts.read().filter(f => !f.picture)) {
        await serial(async () => {
          const pic = await picture(missing.artwork);
          if (!pic) return;
          const list = opts.read();
          const at = list.findIndex(f => f.artwork.id === missing.artwork.id);
          if (at < 0) { await fs.promises.rm(path.join(opts.dir, pic.file), { force: true }); return; }
          list[at] = { ...list[at], picture: pic };
          save(list);
        });
      }
    },

    picturePath: file => (/^[a-zA-Z0-9_-]+\.jpg$/.test(file) ? path.join(opts.dir, file) : null),
  };
}
