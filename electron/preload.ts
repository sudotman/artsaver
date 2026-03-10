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
  onIdleActivated: (callback: () => void) => {
    ipcRenderer.on('idle-activated', callback);
    return () => ipcRenderer.removeListener('idle-activated', callback);
  },
});
