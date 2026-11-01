import { Artwork, ArtProvider, FetchOptions, ArtSource, Playlist } from '../domain/artwork';
import { metProvider } from '../providers/met';
import { chicagoProvider } from '../providers/chicago';
import { clevelandProvider } from '../providers/cleveland';
import { vamProvider } from '../providers/vam';
import { createLocalProvider } from '../providers/localFolder';
import { canCall, resetSource } from './rateLimiter';
import { preloadImage, negotiateImageSize } from './imageUtils';
import { AppSettings } from './settingsStore';
import { getPlaylist } from './playlistService';

const API_PROVIDERS: Record<string, ArtProvider> = {
  met: metProvider,
  chicago: chicagoProvider,
  cleveland: clevelandProvider,
  vam: vamProvider,
};

const BUFFER_SIZE = 5;
const FETCH_TIMEOUT_MS = 20_000;

let buffer: Artwork[] = [];
let filling = false;
let lastSettingsKey = '';
const lastErrors: Record<string, string> = {};

export type FetchStatus = {
  phase: 'idle' | 'fetching' | 'preloading' | 'retrying' | 'done' | 'error';
  message: string;
  attempt?: number;
  maxAttempts?: number;
  providersTried?: string[];
};

type StatusCallback = (status: FetchStatus) => void;
let statusCallback: StatusCallback | null = null;

export function onFetchStatus(cb: StatusCallback): () => void {
  statusCallback = cb;
  return () => { if (statusCallback === cb) statusCallback = null; };
}

function emitStatus(status: FetchStatus) {
  statusCallback?.(status);
}

function settingsKey(s: AppSettings): string {
  return `${(s.enabledSources ?? []).sort().join(',')}|${s.localFolderPath ?? ''}|${s.activePlaylist ?? ''}|${s.preferredCategory ?? ''}`;
}

function getProviders(settings: AppSettings): ArtProvider[] {
  const playlist = settings.activePlaylist ? getPlaylist(settings.activePlaylist, settings.customPlaylists as Playlist[] ?? []) : null;
  const sources: string[] = playlist?.filters.sources ?? settings.enabledSources ?? ['met', 'chicago', 'cleveland'];

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

function timeoutPromise<T>(ms: number, label: string): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
  );
}

// Pieces come back too alike when a collection holds long runs of one thing: an artist's hundred
// photographs, a manuscript's leaves. Each accepted piece leaves a key (its artist, or for anonymous
// work the start of its title); a key seen in the last VARIETY_SPAN pieces is passed over.
const VARIETY_SPAN = 30;
const recentKeys: string[] = [];
const ANONYMOUS = /^(unknown|anonymous|unidentified|-)/i;

export function varietyKey(artwork: Pick<Artwork, 'artist' | 'title'>): string {
  const artist = (artwork.artist || '').trim();
  if (artist && !ANONYMOUS.test(artist)) return `artist:${artist.toLowerCase()}`;
  const stem = (artwork.title || '').toLowerCase()
    .replace(/\([^)]*\)|[\d.,:;'"]/g, ' ')
    .split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
  return `title:${stem}`;
}

function tooAlike(artwork: Artwork): boolean {
  const key = varietyKey(artwork);
  return recentKeys.includes(key) || buffer.some(b => varietyKey(b) === key);
}

function remember(artwork: Artwork): void {
  recentKeys.push(varietyKey(artwork));
  if (recentKeys.length > VARIETY_SPAN) recentKeys.shift();
}

async function tryOneProvider(
  provider: ArtProvider,
  history: string[],
  options: FetchOptions,
): Promise<Artwork | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const artwork = await provider.fetchRandom(options);
      if (!artwork) continue;
      if (history.includes(artwork.id)) continue;
      if (buffer.some(b => b.id === artwork.id)) continue;
      if (tooAlike(artwork)) continue;

      const url = negotiateImageSize(artwork.imageUrl, options.maxWidth);
      artwork.imageUrl = url;

      emitStatus({ phase: 'preloading', message: `Loading image from ${provider.name}...` });
      const loaded = await preloadImage(url);
      if (!loaded) continue;

      artwork.timestamp = Date.now();
      remember(artwork);
      return artwork;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[${provider.source}] attempt ${attempt + 1} failed:`, msg);
      lastErrors[provider.source] = msg;
      continue;
    }
  }
  return null;
}

async function fetchOneValid(
  providers: ArtProvider[],
  history: string[],
  options: FetchOptions,
  weights: Record<string, number>,
  silent = false,
): Promise<Artwork | null> {
  const available = applySourceWeighting(
    providers.filter(p => canCall(p.source)),
    weights,
  );

  if (available.length === 0) {
    if (!silent) emitStatus({ phase: 'error', message: 'Every museum is resting for a moment…' });
    return null;
  }

  // One museum at a time, in weighted random order. Racing them all and keeping the first
  // answer meant the quickest API (Cleveland) won almost every time and the Met never did.
  const order = available.filter((p, i) => available.indexOf(p) === i);
  const tried: string[] = [];
  for (const provider of order) {
    tried.push(provider.name);
    if (!silent) emitStatus({ phase: 'fetching', message: `Asking ${provider.name}…`, providersTried: tried });
    const result = await Promise.race([
      tryOneProvider(provider, history, options),
      timeoutPromise<Artwork | null>(FETCH_TIMEOUT_MS, provider.name).catch(() => null),
    ]);
    if (result) return result;
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
    const artwork = await fetchOneValid(providers, history, options, weights, true);
    if (!artwork) break;
    buffer.push(artwork);
  }

  filling = false;
}

const MAX_INIT_RETRIES = 6;
const RETRY_BASE_MS = 2000;

export async function getRandomArtwork(
  settings: AppSettings,
  history: string[] = [],
  retryOnEmpty = false,
): Promise<Artwork | null> {
  const providers = getProviders(settings);
  if (providers.length === 0) {
    emitStatus({ phase: 'error', message: 'No art sources enabled. Check settings.' });
    return null;
  }

  if (buffer.length > 0) {
    const artwork = buffer.shift()!;
    emitStatus({ phase: 'done', message: '' });
    fillBuffer(settings, history);
    return artwork;
  }

  const options = buildFetchOptions(settings);
  const weights = (settings.sourceWeights as Record<string, number>) ?? {};

  const maxAttempts = retryOnEmpty ? MAX_INIT_RETRIES : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const delay = Math.min(RETRY_BASE_MS * Math.pow(1.5, attempt - 2), 10_000);
      emitStatus({
        phase: 'retrying',
        message: `Retry ${attempt}/${maxAttempts} — waiting ${Math.round(delay / 1000)}s...`,
        attempt,
        maxAttempts,
      });
      providers.forEach(p => resetSource(p.source));
      await new Promise(r => setTimeout(r, delay));
    }

    emitStatus({
      phase: 'fetching',
      message: attempt === 1 ? 'Curating artwork...' : `Attempt ${attempt}/${maxAttempts}...`,
      attempt,
      maxAttempts,
    });

    const artwork = await fetchOneValid(providers, history, options, weights);
    if (artwork) {
      emitStatus({ phase: 'done', message: '' });
      fillBuffer(settings, history);
      return artwork;
    }
  }

  emitStatus({
    phase: 'error',
    message: 'Could not reach any museum. Check your connection and try again.',
  });
  fillBuffer(settings, history);
  return null;
}

export function startPreloading(settings: AppSettings, history: string[]): void {
  fillBuffer(settings, history);
}

export function getBufferSize(): number {
  return buffer.length;
}

export function getDiagnostics(): { bufferSize: number; lastErrors: Record<string, string> } {
  return { bufferSize: buffer.length, lastErrors: { ...lastErrors } };
}
