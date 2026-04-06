import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, powerMonitor, shell, dialog, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

let mainWindow: BrowserWindow | null = null;
let companionWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let idleCheckInterval: NodeJS.Timeout | null = null;
interface ArtworkInfo { id: string; title: string; artist: string; imageUrl: string; source: string; sourceUrl?: string; }
let currentArtworkInfo: ArtworkInfo | null = null;
let currentArtworkTitle = '';
let isPaused = false;

const isDev = !app.isPackaged;

// ─── Settings persistence ───

function getSettings(): Record<string, unknown> {
  const p = path.join(app.getPath('userData'), 'settings.json');
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {}
  return {};
}

function saveSettings(data: Record<string, unknown>): void {
  const p = path.join(app.getPath('userData'), 'settings.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Offline cache ───

function getCacheDir(): string {
  const dir = path.join(app.getPath('userData'), 'image-cache');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getCacheManifestPath(): string {
  return path.join(getCacheDir(), 'manifest.json');
}

interface CacheEntry { id: string; filename: string; metadata: any; cachedAt: number; }

function readCacheManifest(): CacheEntry[] {
  try {
    const p = getCacheManifestPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return [];
}

function writeCacheManifest(entries: CacheEntry[]): void {
  fs.writeFileSync(getCacheManifestPath(), JSON.stringify(entries, null, 2), 'utf-8');
}

function downloadImage(url: string, dest: string): Promise<boolean> {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    mod.get(url, { timeout: 15000 }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redir = res.headers.location;
        if (redir) { file.close(); fs.unlinkSync(dest); downloadImage(redir, dest).then(resolve); return; }
      }
      if (res.statusCode !== 200) { file.close(); resolve(false); return; }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', () => { file.close(); resolve(false); });
  });
}

// ─── Windows ───

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

  // Allow cross-origin requests from file:// in production builds.
  // Required because the renderer fetches from museum APIs directly.
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers: Record<string, string[]> = {};
    // Copy headers, stripping any existing CORS headers (case-insensitive)
    // to avoid duplicates that cause Chromium to reject the response.
    for (const [key, value] of Object.entries(details.responseHeaders ?? {})) {
      const lk = key.toLowerCase();
      if (lk === 'access-control-allow-origin' || lk === 'access-control-allow-headers') continue;
      if (value) headers[key] = Array.isArray(value) ? value : [value];
    }
    headers['Access-Control-Allow-Origin'] = ['*'];
    headers['Access-Control-Allow-Headers'] = ['*'];
    callback({ responseHeaders: headers });
  });

  mainWindow.once('ready-to-show', () => { mainWindow?.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createCompanionWidget(): void {
  if (companionWindow) { companionWindow.show(); return; }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  companionWindow = new BrowserWindow({
    width: 320,
    height: 80,
    x: width - 340,
    y: height - 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    companionWindow.loadURL('http://localhost:5173/#/companion');
  } else {
    companionWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/companion' });
  }

  companionWindow.on('closed', () => { companionWindow = null; });
}

function destroyCompanionWidget(): void {
  if (companionWindow) { companionWindow.close(); companionWindow = null; }
}

// ─── Tray ───

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: currentArtworkTitle || 'ArtSaver', enabled: false },
    { type: 'separator' },
    { label: 'Show', click: () => mainWindow?.show() },
    { label: 'Skip', click: () => mainWindow?.webContents.send('tray-skip') },
    { label: isPaused ? 'Resume' : 'Pause', click: () => {
      isPaused = !isPaused;
      mainWindow?.webContents.send('tray-toggle-pause');
      updateTray();
    }},
    { label: 'Fullscreen', click: () => mainWindow?.setFullScreen(!mainWindow!.isFullScreen()) },
    { type: 'separator' },
    {
      label: 'Idle Mode',
      type: 'checkbox',
      checked: (getSettings().idleEnabled as boolean) ?? false,
      click: (item) => {
        const s = getSettings();
        s.idleEnabled = item.checked;
        saveSettings(s);
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
}

function updateTray(): void {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

function createTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('ArtSaver');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => mainWindow?.show());
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── Idle ───

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

// ─── Auto-start ───

function setAutoStart(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    args: ['--hidden'],
  });
}

// ─── Screensaver registration (best-effort) ───

function getScreensaverInfo(): { supported: boolean; registered: boolean } {
  return { supported: process.platform === 'win32', registered: false };
}

// ─── TV Server (serves current artwork over HTTP for Projectivy etc.) ───

let tvServer: http.Server | null = null;
let currentImageBuffer: Buffer | null = null;

function downloadToBuffer(url: string): Promise<Buffer | null> {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 15000 }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redir = res.headers.location;
        if (redir) { downloadToBuffer(redir).then(resolve); return; }
      }
      if (res.statusCode !== 200) { resolve(null); return; }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

function startTvServer(port: number): void {
  if (tvServer) return;

  tvServer = http.createServer((req, res) => {
    if (req.url === '/current.jpg' || req.url === '/current') {
      if (!currentImageBuffer) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('No artwork loaded yet');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      res.end(currentImageBuffer);
      return;
    }

    if (req.url === '/info.json' || req.url === '/info') {
      const info = currentArtworkInfo
        ? { title: currentArtworkInfo.title, artist: currentArtworkInfo.artist, source: currentArtworkInfo.source, sourceUrl: currentArtworkInfo.sourceUrl }
        : null;
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(info));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found. Use /current.jpg or /info.json');
  });

  tvServer.listen(port, '0.0.0.0', () => {
    console.log(`[TV Server] listening on port ${port}`);
  });

  tvServer.on('error', (err) => {
    console.error('[TV Server] failed to start:', err);
    tvServer = null;
  });
}

function stopTvServer(): void {
  if (tvServer) {
    tvServer.close();
    tvServer = null;
    console.log('[TV Server] stopped');
  }
}

async function updateTvImage(imageUrl: string): Promise<void> {
  if (!tvServer) return;
  // Skip local file:// URLs — read from disk instead
  if (imageUrl.startsWith('file://')) {
    try {
      const filePath = decodeURIComponent(imageUrl.replace('file://', ''));
      currentImageBuffer = fs.readFileSync(filePath);
    } catch { currentImageBuffer = null; }
    return;
  }
  const buf = await downloadToBuffer(imageUrl);
  if (buf) currentImageBuffer = buf;
}

function getLanIp(): string {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// ─── IPC handlers ───

ipcMain.handle('get-settings', () => getSettings());
ipcMain.handle('save-settings', (_e, data: Record<string, unknown>) => { saveSettings(data); return true; });
ipcMain.handle('get-idle-time', () => powerMonitor.getSystemIdleTime());
ipcMain.handle('toggle-fullscreen', () => { if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen()); });
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('close-window', () => app.quit());

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('read-local-folder', async (_e, folderPath: string) => {
  try {
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return fs.readdirSync(folderPath)
      .filter(f => extensions.includes(path.extname(f).toLowerCase()))
      .map(f => `file://${path.join(folderPath, f).replace(/\\/g, '/')}`);
  } catch { return []; }
});

ipcMain.handle('open-external', (_e, url: string) => shell.openExternal(url));

ipcMain.handle('set-auto-start', (_e, enabled: boolean) => { setAutoStart(enabled); return true; });

ipcMain.handle('set-current-artwork', (_e, info: ArtworkInfo) => {
  currentArtworkInfo = info;
  currentArtworkTitle = `${info.title} — ${info.artist}`;
  updateTray();
  if (companionWindow) companionWindow.webContents.send('artwork-changed', info);
  updateTvImage(info.imageUrl);
});

ipcMain.handle('toggle-companion-widget', (_e, enabled: boolean) => {
  if (enabled) createCompanionWidget();
  else destroyCompanionWidget();
});

ipcMain.handle('get-screensaver-info', () => getScreensaverInfo());

ipcMain.handle('start-tv-server', (_e, port: number) => { startTvServer(port); return true; });
ipcMain.handle('stop-tv-server', () => { stopTvServer(); return true; });
ipcMain.handle('get-lan-ip', () => getLanIp());

// ─── Offline cache IPC ───

ipcMain.handle('cache-image', async (_e, id: string, url: string, metadata: any) => {
  try {
    const manifest = readCacheManifest();
    if (manifest.some(e => e.id === id)) return true;

    const settings = getSettings();
    const maxSize = (settings.offlineCacheSize as number) ?? 100;

    while (manifest.length >= maxSize) {
      const oldest = manifest.shift()!;
      const filePath = path.join(getCacheDir(), oldest.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `${id.replace(/[^a-zA-Z0-9-]/g, '_')}${ext}`;
    const dest = path.join(getCacheDir(), filename);

    const ok = await downloadImage(url, dest);
    if (!ok) return false;

    manifest.push({ id, filename, metadata, cachedAt: Date.now() });
    writeCacheManifest(manifest);
    return true;
  } catch { return false; }
});

ipcMain.handle('get-cached-artworks', () => {
  const manifest = readCacheManifest();
  return manifest.map(e => ({
    ...e.metadata,
    imageUrl: `file://${path.join(getCacheDir(), e.filename).replace(/\\/g, '/')}`,
  }));
});

ipcMain.handle('get-cache-stats', () => {
  const manifest = readCacheManifest();
  let totalSize = 0;
  for (const entry of manifest) {
    const fp = path.join(getCacheDir(), entry.filename);
    try { totalSize += fs.statSync(fp).size; } catch {}
  }
  return { count: manifest.length, totalSizeBytes: totalSize };
});

ipcMain.handle('clear-cache', () => {
  const dir = getCacheDir();
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) fs.unlinkSync(path.join(dir, f));
  } catch {}
  return true;
});

// ─── Export / import ───

ipcMain.handle('export-config', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `artsaver-config-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return false;
  const settings = getSettings();
  fs.writeFileSync(result.filePath, JSON.stringify({ type: 'artsaver-config', version: 1, settings }, null, 2));
  return true;
});

ipcMain.handle('import-config', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  try {
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
    if (data.type === 'artsaver-config' && data.settings) {
      saveSettings(data.settings);
      return data.settings;
    }
  } catch {}
  return null;
});

// ─── App lifecycle ───

app.whenReady().then(() => {
  const args = process.argv;
  const hidden = args.includes('--hidden');

  createWindow();
  createTray();
  startIdleWatcher();

  if (hidden && mainWindow) {
    mainWindow.hide();
  }

  const settings = getSettings();
  if (settings.companionWidgetEnabled) createCompanionWidget();
  if (settings.tvServerEnabled) startTvServer((settings.tvServerPort as number) ?? 7247);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
