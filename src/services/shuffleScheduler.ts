import { Artwork, ArtProvider, FetchOptions, ArtSource, Playlist } from '../domain/artwork';
import { metProvider } from '../providers/met';
import { chicagoProvider } from '../providers/chicago';
import { rijksProvider } from '../providers/rijks';
import { harvardProvider } from '../providers/harvard';
import { smithsonianProvider } from '../providers/smithsonian';
import { ngaProvider } from '../providers/nga';
import { createLocalProvider } from '../providers/localFolder';
import { canCall } from './rateLimiter';
import { preloadImage, negotiateImageSize } from './imageUtils';
import { AppSettings } from './settingsStore';
import { getPlaylist } from './playlistService';

const API_PROVIDERS: Record<string, ArtProvider> = {
  met: metProvider,
  chicago: chicagoProvider,
  rijks: rijksProvider,
  harvard: harvardProvider,
  smithsonian: smithsonianProvider,
  nga: ngaProvider,
};

const BUFFER_SIZE = 5;

let buffer: Artwork[] = [];
let filling = false;
let lastSettingsKey = '';

function settingsKey(s: AppSettings): string {
  return `${(s.enabledSources ?? []).sort().join(',')}|${s.localFolderPath ?? ''}|${s.activePlaylist ?? ''}|${s.preferredCategory ?? ''}`;
}

function getProviders(settings: AppSettings): ArtProvider[] {
  const playlist = settings.activePlaylist ? getPlaylist(settings.activePlaylist, settings.customPlaylists as Playlist[] ?? []) : null;
  const sources: string[] = playlist?.filters.sources ?? settings.enabledSources ?? ['met', 'chicago', 'rijks'];

  return sources
    .map(id => {
      if (id === 'local') return createLocalProvider(settings.localFolderPath ?? null);
      return API_PROVIDERS[id];
    })
    .filter(Boolean) as ArtProvider[];
}

function buildFetchOptions(settings: AppSettings): FetchOptions {
  const playlist = settings.activePlaylist ? getPlaylist(settings.activePlaylist, settings.customPlaylists as Playlist[] ?? []) : null;
  const opts: FetchOptions = {};

  if (playlist?.filters.categories?.[0]) {
    opts.category = playlist.filters.categories[0];
  } else if (settings.preferredCategory && settings.preferredCategory !== 'any') {
    opts.category = settings.preferredCategory as any;
  }

  if (playlist?.filters.centuryRange) {
    opts.centuryRange = playlist.filters.centuryRange;
  }

  return opts;
}

function applySourceWeighting(providers: ArtProvider[], weights: Record<string, number>): ArtProvider[] {
  if (!weights || Object.keys(weights).length === 0) {
    return [...providers].sort(() => Math.random() - 0.5);
  }

  const weighted: ArtProvider[] = [];
  for (const p of providers) {
    const w = weights[p.source] ?? 1;
    for (let i = 0; i < Math.max(1, Math.round(w)); i++) {
      weighted.push(p);
    }
  }
  return weighted.sort(() => Math.random() - 0.5);
}

async function fetchOneValid(
  providers: ArtProvider[],
  history: string[],
  options: FetchOptions,
  weights: Record<string, number>,
): Promise<Artwork | null> {
  const ordered = applySourceWeighting(
    providers.filter(p => canCall(p.source)),
    weights,
  );

  for (const provider of ordered) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const artwork = await provider.fetchRandom(options);
        if (!artwork) continue;
        if (history.includes(artwork.id)) continue;
        if (buffer.some(b => b.id === artwork.id)) continue;

        const url = negotiateImageSize(artwork.imageUrl, options.maxWidth);
        artwork.imageUrl = url;

        const loaded = await preloadImage(url);
        if (!loaded) continue;

        artwork.timestamp = Date.now();
        return artwork;
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function fillBuffer(settings: AppSettings, history: string[]): Promise<void> {
  if (filling) return;
  filling = true;

  const key = settingsKey(settings);
  if (key !== lastSettingsKey) {
    buffer = [];
    lastSettingsKey = key;
  }

  const providers = getProviders(settings);
  const options = buildFetchOptions(settings);
  const weights = (settings.sourceWeights as Record<string, number>) ?? {};

  if (providers.length === 0) { filling = false; return; }

  while (buffer.length < BUFFER_SIZE) {
    const artwork = await fetchOneValid(providers, history, options, weights);
    if (!artwork) break;
    buffer.push(artwork);
  }

  filling = false;
}

export async function getRandomArtwork(
  settings: AppSettings,
  history: string[] = [],
): Promise<Artwork | null> {
  const providers = getProviders(settings);
  if (providers.length === 0) return null;

  if (buffer.length > 0) {
    const artwork = buffer.shift()!;
    fillBuffer(settings, history);
    return artwork;
  }

  const options = buildFetchOptions(settings);
  const weights = (settings.sourceWeights as Record<string, number>) ?? {};
  const artwork = await fetchOneValid(providers, history, options, weights);
  fillBuffer(settings, history);
  return artwork;
}

export function startPreloading(settings: AppSettings, history: string[]): void {
  fillBuffer(settings, history);
}

export function getBufferSize(): number {
  return buffer.length;
}
