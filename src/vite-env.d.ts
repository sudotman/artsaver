/// <reference types="vite/client" />

interface ElectronAPI {
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (data: Record<string, unknown>) => Promise<boolean>;
  getIdleTime: () => Promise<number>;
  toggleFullscreen: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  selectFolder: () => Promise<string | null>;
  readLocalFolder: (path: string) => Promise<string[]>;
  onIdleActivated: (callback: () => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
