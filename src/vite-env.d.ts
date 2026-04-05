/// <reference types="vite/client" />

import 'react';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

interface ElectronAPI {
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (data: Record<string, unknown>) => Promise<boolean>;
  getIdleTime: () => Promise<number>;
  toggleFullscreen: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  selectFolder: () => Promise<string | null>;
  readLocalFolder: (path: string) => Promise<string[]>;
  openExternal: (url: string) => Promise<void>;
  setAutoStart: (enabled: boolean) => Promise<boolean>;
  setCurrentArtwork: (title: string) => Promise<void>;
  toggleCompanionWidget: (enabled: boolean) => Promise<void>;
  getScreensaverInfo: () => Promise<{ supported: boolean; registered: boolean }>;

  cacheImage: (id: string, url: string, metadata: any) => Promise<boolean>;
  getCachedArtworks: () => Promise<any[]>;
  getCacheStats: () => Promise<{ count: number; totalSizeBytes: number }>;
  clearCache: () => Promise<boolean>;

  exportConfig: () => Promise<boolean>;
  importConfig: () => Promise<Record<string, unknown> | null>;

  onIdleActivated: (cb: () => void) => () => void;
  onTraySkip: (cb: () => void) => () => void;
  onTrayTogglePause: (cb: () => void) => () => void;
  onArtworkChanged: (cb: (title: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
