import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  intervalSeconds: number;
  immersiveMode: boolean;
  idleEnabled: boolean;
  idleThresholdMinutes: number;
  enabledSources: string[];
  localFolderPath: string | null;
  [key: string]: unknown;
}

const DEFAULTS: AppSettings = {
  intervalSeconds: 60,
  immersiveMode: false,
  idleEnabled: false,
  idleThresholdMinutes: 5,
  enabledSources: ['met', 'chicago', 'rijks'],
  localFolderPath: null,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (window.electronAPI) {
          const saved = await window.electronAPI.getSettings();
          setSettings({ ...DEFAULTS, ...saved } as AppSettings);
        }
      } catch {
        // Use defaults
      }
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
