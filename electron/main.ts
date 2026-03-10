import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, powerMonitor } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let idleCheckInterval: NodeJS.Timeout | null = null;

const isDev = !app.isPackaged;

function getSettings(): Record<string, unknown> {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveSettings(data: Record<string, unknown>): void {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf-8');
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.round(width * 0.85),
    height: Math.round(height * 0.85),
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show ArtSaver', click: () => mainWindow?.show() },
    { label: 'Fullscreen', click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip('ArtSaver');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

function startIdleWatcher(): void {
  if (idleCheckInterval) clearInterval(idleCheckInterval);

  idleCheckInterval = setInterval(() => {
    const settings = getSettings();
    const idleEnabled = settings.idleEnabled as boolean ?? false;
    const idleThreshold = (settings.idleThresholdMinutes as number ?? 5) * 60;

    if (!idleEnabled) return;

    const idleTime = powerMonitor.getSystemIdleTime();
    if (idleTime >= idleThreshold && mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.setFullScreen(true);
      mainWindow.webContents.send('idle-activated');
    }
  }, 10_000);
}

ipcMain.handle('get-settings', () => getSettings());
ipcMain.handle('save-settings', (_event, data: Record<string, unknown>) => {
  saveSettings(data);
  return true;
});
ipcMain.handle('get-idle-time', () => powerMonitor.getSystemIdleTime());
ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window', () => mainWindow?.hide());
ipcMain.handle('select-folder', async () => {
  const { dialog } = await import('electron');
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('read-local-folder', async (_event, folderPath: string) => {
  try {
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const files = fs.readdirSync(folderPath)
      .filter(f => extensions.includes(path.extname(f).toLowerCase()))
      .map(f => `file://${path.join(folderPath, f).replace(/\\/g, '/')}`);
    return files;
  } catch {
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  startIdleWatcher();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
