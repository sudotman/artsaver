import { Artwork, ArtProvider } from '../domain/artwork';
import { metProvider } from '../providers/met';
import { chicagoProvider } from '../providers/chicago';
import { rijksProvider } from '../providers/rijks';
import { createLocalProvider } from '../providers/localFolder';
import { AppSettings } from './settingsStore';

const API_PROVIDERS: Record<string, ArtProvider> = {
  met: metProvider,
  chicago: chicagoProvider,
  rijks: rijksProvider,
};

const BUFFER_SIZE = 5;

let buffer: Artwork[] = [];
let filling = false;
let lastSettingsKey = '';

function settingsKey(s: AppSettings): string {
  return `${(s.enabledSources ?? []).sort().join(',')}|${s.localFolderPath ?? ''}`;
}

function getProviders(settings: AppSettings): ArtProvider[] {
  const enabled = settings.enabledSources ?? ['met', 'chicago', 'rijks'];
  return enabled
    .map(id => {
      if (id === 'local') return createLocalProvider(settings.localFolderPath ?? null);
      return API_PROVIDERS[id];
    })
    .filter(Boolean) as ArtProvider[];
}

function preloadImage(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function fetchOneValid(
  providers: ArtProvider[],
  history: string[],
): Promise<Artwork | null> {
  const shuffled = [...providers].sort(() => Math.random() - 0.5);

  for (const provider of shuffled) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const artwork = await provider.fetchRandom();
        if (!artwork) continue;
        if (history.includes(artwork.id)) continue;
        if (buffer.some(b => b.id === artwork.id)) continue;

        const loaded = await preloadImage(artwork.imageUrl);
        if (!loaded) continue;

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
  if (providers.length === 0) {
    filling = false;
    return;
  }

  while (buffer.length < BUFFER_SIZE) {
    const artwork = await fetchOneValid(providers, history);
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

  const artwork = await fetchOneValid(providers, history);
  fillBuffer(settings, history);
  return artwork;
}

export function startPreloading(settings: AppSettings, history: string[]): void {
  fillBuffer(settings, history);
}
