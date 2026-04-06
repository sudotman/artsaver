import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data: Record<string, unknown>) => ipcRenderer.invoke('save-settings', data),
  getIdleTime: () => ipcRenderer.invoke('get-idle-time'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  readLocalFolder: (path: string) => ipcRenderer.invoke('read-local-folder', path),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('set-auto-start', enabled),
  setCurrentArtwork: (info: { id: string; title: string; artist: string; imageUrl: string; source: string; sourceUrl?: string }) => ipcRenderer.invoke('set-current-artwork', info),
  toggleCompanionWidget: (enabled: boolean) => ipcRenderer.invoke('toggle-companion-widget', enabled),
  getScreensaverInfo: () => ipcRenderer.invoke('get-screensaver-info'),
  startTvServer: (port: number) => ipcRenderer.invoke('start-tv-server', port),
  stopTvServer: () => ipcRenderer.invoke('stop-tv-server'),
  getLanIp: () => ipcRenderer.invoke('get-lan-ip'),

  cacheImage: (id: string, url: string, metadata: any) => ipcRenderer.invoke('cache-image', id, url, metadata),
  getCachedArtworks: () => ipcRenderer.invoke('get-cached-artworks'),
  getCacheStats: () => ipcRenderer.invoke('get-cache-stats'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),

  exportConfig: () => ipcRenderer.invoke('export-config'),
  importConfig: () => ipcRenderer.invoke('import-config'),

  onIdleActivated: (cb: () => void) => {
    ipcRenderer.on('idle-activated', cb);
    return () => ipcRenderer.removeListener('idle-activated', cb);
  },
  onTraySkip: (cb: () => void) => {
    ipcRenderer.on('tray-skip', cb);
    return () => ipcRenderer.removeListener('tray-skip', cb);
  },
  onTrayTogglePause: (cb: () => void) => {
    ipcRenderer.on('tray-toggle-pause', cb);
    return () => ipcRenderer.removeListener('tray-toggle-pause', cb);
  },
  onArtworkChanged: (cb: (info: { id: string; title: string; artist: string; imageUrl: string; source: string; sourceUrl?: string }) => void) => {
    const handler = (_e: any, info: any) => cb(info);
    ipcRenderer.on('artwork-changed', handler);
    return () => ipcRenderer.removeListener('artwork-changed', handler);
  },
});
