import { useState, useEffect, useCallback } from 'react';
import { ArtCategory, ArtSource, Playlist } from '../domain/artwork';

export interface AppSettings {
  intervalSeconds: number;
  immersiveMode: boolean;
  idleEnabled: boolean;
  idleThresholdMinutes: number;
  enabledSources: string[];
  localFolderPath: string | null;
  transitionType: TransitionType;
  audioEnabled: boolean;
  audioVolume: number;
  autoStart: boolean;
  activePlaylist: string | null;
  customPlaylists: Playlist[];
  preferredCategory: string;
  sourceWeights: Record<string, number>;
  offlineCacheSize: number;
  offlineCacheEnabled: boolean;
  companionWidgetEnabled: boolean;
  highContrastLabels: boolean;
  screenReaderAnnounce: boolean;
  _settingsVersion: number;
  [key: string]: unknown;
}

export type TransitionType = 'crossfade' | 'kenburns' | 'slide' | 'dissolve' | 'random';

const SETTINGS_VERSION = 2;

const DEFAULTS: AppSettings = {
  intervalSeconds: 60,
  immersiveMode: false,
  idleEnabled: false,
  idleThresholdMinutes: 5,
  enabledSources: ['met', 'chicago', 'rijks'],
  localFolderPath: null,
  transitionType: 'crossfade',
  audioEnabled: false,
  audioVolume: 0.15,
  autoStart: false,
  activePlaylist: null,
  customPlaylists: [],
  preferredCategory: 'any',
  sourceWeights: {},
  offlineCacheSize: 100,
  offlineCacheEnabled: false,
  companionWidgetEnabled: false,
  highContrastLabels: false,
  screenReaderAnnounce: false,
  _settingsVersion: SETTINGS_VERSION,
};

function migrateSettings(saved: Record<string, unknown>): AppSettings {
  const version = (saved._settingsVersion as number) ?? 1;
  const merged = { ...DEFAULTS, ...saved, _settingsVersion: SETTINGS_VERSION };

  if (version < 2) {
    if (!merged.enabledSources || !Array.isArray(merged.enabledSources)) {
      merged.enabledSources = DEFAULTS.enabledSources;
    }
  }

  return merged as AppSettings;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (window.electronAPI) {
          const saved = await window.electronAPI.getSettings();
          setSettings(migrateSettings(saved));
        }
      } catch {}
      setLoaded(true);
    };
    load();
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      if (window.electronAPI) {
        window.electronAPI.saveSettings(next as Record<string, unknown>);
      }
      return next;
    });
  }, []);

  return { settings, updateSettings, loaded };
}

export const ALL_SOURCES: { id: ArtSource; label: string }[] = [
  { id: 'met', label: 'Metropolitan Museum of Art' },
  { id: 'chicago', label: 'Art Institute of Chicago' },
  { id: 'rijks', label: 'Rijksmuseum' },
  { id: 'harvard', label: 'Harvard Art Museums' },
  { id: 'smithsonian', label: 'Smithsonian Open Access' },
  { id: 'nga', label: 'National Gallery of Art' },
];

export const ALL_CATEGORIES: { id: string; label: string }[] = [
  { id: 'any', label: 'All categories' },
  { id: 'painting', label: 'Paintings' },
  { id: 'sculpture', label: 'Sculpture' },
  { id: 'photograph', label: 'Photography' },
  { id: 'drawing', label: 'Drawings' },
  { id: 'print', label: 'Prints' },
  { id: 'textile', label: 'Textiles' },
];

export const TRANSITION_TYPES: { id: TransitionType; label: string }[] = [
  { id: 'crossfade', label: 'Crossfade' },
  { id: 'kenburns', label: 'Ken Burns zoom' },
  { id: 'slide', label: 'Gentle slide' },
  { id: 'dissolve', label: 'Dissolve to black' },
  { id: 'random', label: 'Random' },
];
