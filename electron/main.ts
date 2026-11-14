import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, powerMonitor, shell, dialog, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { loadOriginal, fillsScreen, isBig, BIG_EDGE, roomHtml, wallColours, WALL_CSS, WALL_FONTS, type Original } from './artFeed';
import { createFavourites, type Favourites, type FavouriteEntry } from './favourites';
import { keptPageHtml } from './keptPage';
import { createMovements } from './movement';

let mainWindow: BrowserWindow | null = null;
let companionWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let idleCheckInterval: NodeJS.Timeout | null = null;
interface ArtworkInfo { id: string; title: string; artist: string; year?: string; medium?: string; collection?: string; imageUrl: string; source: string; sourceUrl?: string; size?: { width: number; height: number }; largeImageUrl?: string; wikidata?: { artist?: string; object?: string }; born?: number; period?: string; movement?: string; }
let currentArtworkInfo: ArtworkInfo | null = null;
let currentArtworkTitle = '';
let isPaused = false;

const isDev = !app.isPackaged;

// ArtSaver runs hidden on a TV's media PC. Electron's default for an uncaught error is a modal box that
// freezes the main process, TV server included, until someone at the desk clicks OK; log it instead.
process.on('uncaughtException', err => console.error('Uncaught exception in main process:', err));

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

// ─── Favourites ───
// The main process owns them: the TV keeps pieces too, and the renderer's settings saves carry a copy of
// `_favorites` from whenever it loaded, so save-settings keeps the list on disk instead of theirs.

let favourites: Favourites | null = null;

function initFavourites(): Favourites {
  favourites ??= createFavourites({
    dir: path.join(app.getPath('userData'), 'favourites'),
    read: () => (getSettings()._favorites as FavouriteEntry[] | undefined) ?? [],
    write: list => saveSettings({ ...getSettings(), _favorites: list }),
    changed: list => mainWindow?.webContents.send('favorites-changed', list),
  });
  return favourites;
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

// The file is only opened once the image itself arrives: creating it before a redirect and deleting it
// again left Windows with a pending delete, and reopening that path threw EPERM in the main process.
function downloadImage(url: string, dest: string, redirects = 5): Promise<boolean> {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 15000 }, res => {
      const redir = res.headers.location;
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && redir && redirects > 0) {
        res.resume();
        downloadImage(new URL(redir, url).toString(), dest, redirects - 1).then(resolve);
        return;
      }
      if (res.statusCode !== 200) { res.resume(); resolve(false); return; }
      const file = fs.createWriteStream(dest);
      const fail = () => { res.destroy(); file.destroy(); fs.rm(dest, { force: true }, () => resolve(false)); };
      file.on('error', fail);
      res.on('error', fail);
      file.on('finish', () => resolve(true));
      res.pipe(file);
    }).on('error', () => resolve(false))
      .on('timeout', function (this: http.ClientRequest) { this.destroy(); });
  });
}

// ─── Windows ───

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const iconPath = path.join(__dirname, '../build',
    process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon.icns' : 'icon.png'
  );

  mainWindow = new BrowserWindow({
    width: Math.round(width * 0.85),
    height: Math.round(height * 0.85),
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    show: false,
    icon: iconPath,
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
  const trayIconPath = path.join(__dirname, '../build/tray-icon.png');
  const icon = fs.existsSync(trayIconPath)
    ? nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();
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

const SLOT_COUNT = 10;
// Each slot keeps the clean original (for /feed.json) and, for older clients, a 1920×1080 composite.
interface ImageSlot { info: ArtworkInfo; at: number; composite?: Buffer; original?: Original; }
const imageSlots: (ImageSlot | null)[] = new Array(SLOT_COUNT).fill(null);
let nextSlotIndex = 0;
// Pieces that fill a TV (a metre or more across, or already screen-shaped) outlast the ring, so a quiet
// wall has several to show. Oldest first; served by id as /art/kept/<id>.jpg, so an address never changes piece.
const KEPT_COUNT = 12;
const keptSlots: ImageSlot[] = [];

function fillsWall(slot: ImageSlot): boolean {
  return !!slot.original && (isBig(slot.info.size) || fillsScreen(slot.original.width, slot.original.height));
}
let tvServerActivePort = 7247;

let tvServer: http.Server | null = null;
let offscreenWin: BrowserWindow | null = null;
let currentImageBuffer: Buffer | null = null;
let renderLock: Promise<void> = Promise.resolve();

// The composite template: the same wall and caption as the gallery page, at 1920×1080.
const OFFSCREEN_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="${WALL_FONTS}" rel="stylesheet">
<style>${WALL_CSS} html,body{width:1920px;height:1080px}</style></head>
<body><div id="stage"></div></body></html>`;

function createOffscreenWin(): void {
  if (offscreenWin) return;
  offscreenWin = new BrowserWindow({
    width: 1920, height: 1080, show: false,
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false },
  });
  offscreenWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(OFFSCREEN_HTML));
  offscreenWin.on('closed', () => { offscreenWin = null; });
}

function destroyOffscreenWin(): void {
  if (offscreenWin) { offscreenWin.close(); offscreenWin = null; }
}

// Art movements from Wikidata, kept in userData so each artist is looked up once.
let movements: ReturnType<typeof createMovements> | null = null;

async function renderOffscreen(info: ArtworkInfo, showLabel: boolean): Promise<void> {
  if (!tvServer) return;
  movements ??= createMovements(path.join(app.getPath('userData'), 'movements.json'));
  // Filled in when Wikidata answers; the feed carries it from then on.
  movements.of(info).then(m => { if (m) info.movement = m; });
  // A big piece gets the museum's larger image when there is one, falling back to the usual.
  const large = isBig(info.size) && info.largeImageUrl
    ? await loadOriginal(info.largeImageUrl, BIG_EDGE).catch(() => null)
    : null;
  const original = large ?? await loadOriginal(info.imageUrl, isBig(info.size) ? BIG_EDGE : undefined).catch((err) => {
    console.warn('[TV] original image failed:', err);
    return null;
  });
  const composite = await renderComposite(info, original, showLabel);
  if (!original && !composite) return;
  const slot = nextSlotIndex;
  nextSlotIndex = (nextSlotIndex + 1) % SLOT_COUNT;
  imageSlots[slot] = { info, at: Date.now(), composite: composite ?? undefined, original: original ?? undefined };
  if (fillsWall(imageSlots[slot]!)) {
    const kept = keptSlots.findIndex(k => k.info.id === info.id);
    if (kept >= 0) keptSlots.splice(kept, 1);
    keptSlots.push(imageSlots[slot]!);
    if (keptSlots.length > KEPT_COUNT) keptSlots.shift();
  }
  // /current.jpg always reflects the latest
  if (composite) currentImageBuffer = composite;
}

async function renderComposite(info: ArtworkInfo, original: Original | null, showLabel: boolean): Promise<Buffer | null> {
  if (!offscreenWin) createOffscreenWin();
  if (!offscreenWin) return null;
  // Wait for the base page to finish loading if it hasn't yet
  if (offscreenWin.webContents.isLoading()) {
    await new Promise<void>(r => offscreenWin!.webContents.once('did-finish-load', r));
  }
  const src = original ? `data:image/jpeg;base64,${original.buffer.toString('base64')}` : info.imageUrl;
  const bleed = original ? fillsScreen(original.width, original.height) : false;
  const html = roomHtml(info, src, original?.palette ?? [], bleed, showLabel);
  try {
    await offscreenWin.webContents.executeJavaScript(`
      new Promise(function(resolve, reject) {
        var timer = setTimeout(function() { reject(new Error('render timeout')); }, 25000);
        var stage = document.getElementById('stage');
        stage.innerHTML = ${JSON.stringify(html)};
        var img = stage.querySelector('img');
        function done() {
          document.fonts.ready.then(function() {
            clearTimeout(timer);
            requestAnimationFrame(function() { requestAnimationFrame(function() { resolve(true); }); });
          });
        }
        if (img.complete && img.naturalWidth) done();
        else {
          img.onload = done;
          img.onerror = function() { clearTimeout(timer); reject(new Error('image load failed')); };
        }
      })
    `);
    const captured = await offscreenWin.webContents.capturePage();
    return captured.toJPEG(92);
  } catch (err) {
    console.warn('[TV offscreen] render failed:', err);
    return null;
  }
}

/** Newest first, with each slot's 1-based number as served under /N.jpg and /art/N.jpg. */
function newestSlots(): { slot: ImageSlot; n: number }[] {
  return imageSlots
    .map((slot, i) => (slot ? { slot, n: i + 1 } : null))
    .filter((x): x is { slot: ImageSlot; n: number } => x !== null)
    .sort((a, b) => b.slot.at - a.slot.at);
}

function showLabelSetting(): boolean {
  return (getSettings().tvServerShowLabel as boolean) ?? true;
}

/** The browser gallery: the newest piece on its wall, crossfading when a new one arrives. */
function buildGalleryPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ArtSaver</title>
  <link href="${WALL_FONTS}" rel="stylesheet">
  <style>${WALL_CSS} .room{opacity:0} .room.on{opacity:1}</style>
</head>
<body>
  <script>
    var current = null;
    function show(next) {
      var holder = document.createElement('div');
      holder.innerHTML = next.html;
      var room = holder.firstElementChild;
      var img = room.querySelector('img');
      img.onload = function() {
        document.body.appendChild(room);
        room.getBoundingClientRect();
        room.classList.add('on');
        document.querySelectorAll('.room').forEach(function(r) {
          if (r === room) return;
          r.classList.remove('on');
          setTimeout(function() { r.remove(); }, 2600);
        });
      };
    }
    function poll() {
      fetch('/room.json?t=' + Date.now())
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(next) { if (next && next.id !== current) { current = next.id; show(next); } })
        .catch(function() {});
    }
    poll();
    setInterval(poll, 4000);
  </script>
</body>
</html>`;
}

// Prefer the Host the client actually used to reach us, so slot URLs stay reachable
// even when getLanIp() guesses an address the client can't route to.
function baseUrl(hostHeader?: string): string {
  const host = hostHeader && /^[\w.-]+(:\d+)?$/.test(hostHeader)
    ? hostHeader
    : `${getLanIp()}:${tvServerActivePort}`;
  return `http://${host}`;
}

function buildOverflightJson(hostHeader?: string): string {
  const base = baseUrl(hostHeader);
  const entries = imageSlots
    .map((slot, i) => slot?.composite ? {
      location: slot.info.collection || slot.info.source,
      title: slot.info.title,
      url_img:     `${base}/${i + 1}.jpg`,
    } : null)
    .filter(Boolean);
  return JSON.stringify(entries, null, 2);
}

/**
 * Clean originals with their metadata and colours, newest first: the ring, then kept wall-filling pieces
 * the ring has moved past. Vitrine draws its own walls.
 */
function buildFeedJson(hostHeader?: string): string {
  const base = baseUrl(hostHeader);
  const ring = newestSlots().filter(({ slot }) => slot.original).map(({ slot, n }) => ({ slot, path: `art/${n}.jpg` }));
  const inRing = new Set(ring.map(({ slot }) => slot.info.id));
  const kept = keptSlots
    .map(slot => ({ slot, path: `art/kept/${encodeURIComponent(slot.info.id)}.jpg` }))
    .filter(({ slot }) => !inRing.has(slot.info.id))
    .reverse();
  const keptIds = new Set(initFavourites().list().map(f => f.artwork.id));
  const pieces = [...ring, ...kept]
    .map(({ slot, path }) => ({
      id: slot.info.id,
      title: slot.info.title,
      artist: slot.info.artist,
      year: slot.info.year ?? '',
      medium: slot.info.medium ?? '',
      collection: slot.info.collection ?? '',
      source: slot.info.source,
      sourceUrl: slot.info.sourceUrl,
      image: `${base}/${path}?v=${encodeURIComponent(slot.info.id)}`,
      width: slot.original!.width,
      height: slot.original!.height,
      palette: slot.original!.palette,
      fillsScreen: fillsScreen(slot.original!.width, slot.original!.height),
      // Centimetres, when the museum says; big pieces get the TV's full-screen close-up tour.
      size: slot.info.size,
      big: isBig(slot.info.size),
      movement: slot.info.movement ?? '',
      kept: keptIds.has(slot.info.id),
    }));
  return JSON.stringify({ version: 2, pieces });
}

/** Favourites, newest first, shaped like feed pieces; [walls] adds each one's wall colours for the kept page. */
function buildKeptJson(hostHeader: string | undefined, walls: boolean): string {
  const base = baseUrl(hostHeader);
  const pieces = initFavourites().list().map(({ artwork: a, addedAt, picture }) => ({
    id: a.id,
    title: a.title,
    artist: a.artist,
    year: a.year ?? '',
    medium: a.medium ?? '',
    collection: a.collection ?? '',
    source: a.source,
    sourceUrl: a.sourceUrl,
    // The museum's own image until the copy on disk exists.
    image: picture ? `${base}/art/favourite/${picture.file}` : a.imageUrl,
    width: picture?.width ?? 0,
    height: picture?.height ?? 0,
    palette: picture?.palette ?? [],
    fillsScreen: picture ? fillsScreen(picture.width, picture.height) : false,
    size: a.size,
    big: isBig(a.size),
    movement: a.movement ?? a.period ?? '',
    kept: true,
    keptAt: addedAt,
    ...(walls ? { wall: wallColours(picture?.palette ?? []) } : {}),
  }));
  return JSON.stringify({ version: 1, pieces });
}

/** A piece the TV can see right now (ring or kept wall-fillers), by id. */
function slotFor(id: string): ImageSlot | undefined {
  return [...imageSlots, ...keptSlots].find((s): s is ImageSlot => !!s && s.info.id === id);
}

function startTvServer(port: number): void {
  if (tvServer) return;
  tvServerActivePort = port;
  createOffscreenWin();

  const JPEG_HEADERS = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  tvServer = http.createServer((req, res) => {
    const urlPath = (req.url ?? '/').split('?')[0];

    if (urlPath === '/' || urlPath === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(buildGalleryPage());
      return;
    }

    if (urlPath === '/current.jpg' || urlPath === '/current') {
      if (!currentImageBuffer) { res.writeHead(503); res.end('No artwork loaded yet'); return; }
      res.writeHead(200, JPEG_HEADERS);
      res.end(currentImageBuffer);
      return;
    }

    // Kept wall-filling pieces, by artwork id (originals only).
    const keptMatch = urlPath.match(/^\/art\/kept\/([^/]+)\.jpg$/);
    if (keptMatch) {
      const id = decodeURIComponent(keptMatch[1]);
      const buffer = keptSlots.find(k => k.info.id === id)?.original?.buffer;
      if (!buffer) { res.writeHead(503); res.end('Slot empty'); return; }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
      res.end(buffer);
      return;
    }

    // Numbered slots: /1.jpg – /10.jpg (composites) and /art/1.jpg – /art/10.jpg (originals)
    const slotMatch = urlPath.match(/^\/(art\/)?(\d+)\.jpg$/);
    if (slotMatch) {
      const idx = parseInt(slotMatch[2], 10) - 1;
      const slot = idx >= 0 && idx < SLOT_COUNT ? imageSlots[idx] : null;
      const buffer = slotMatch[1] ? slot?.original?.buffer : slot?.composite;
      if (!buffer) { res.writeHead(503); res.end('Slot empty'); return; }
      // Originals are addressed with ?v=<artwork id>, so a filled slot never reuses a cached URL.
      res.writeHead(200, slotMatch[1] ? { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } : JPEG_HEADERS);
      res.end(buffer);
      return;
    }

    // Favourite pictures, saved on disk.
    const favMatch = urlPath.match(/^\/art\/favourite\/([^/]+)$/);
    if (favMatch) {
      const file = initFavourites().picturePath(decodeURIComponent(favMatch[1]));
      fs.readFile(file ?? '', (err, buffer) => {
        if (err || !file) { res.writeHead(404); res.end('Not kept'); return; }
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=604800' });
        res.end(buffer);
      });
      return;
    }

    if (urlPath === '/kept' || urlPath === '/kept/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(keptPageHtml());
      return;
    }

    if (urlPath === '/kept.json') {
      const walls = /[?&]walls=1\b/.test(req.url ?? '');
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(buildKeptJson(req.headers.host, walls));
      return;
    }

    // Keeping from the TV: POST /keep?id=<artwork id> for a piece in the feed; /unkeep for any favourite.
    if ((urlPath === '/keep' || urlPath === '/unkeep') && req.method === 'POST') {
      const id = new URL(req.url ?? '', 'http://x').searchParams.get('id') ?? '';
      const reply = (code: number, body?: unknown) => {
        res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(body ?? {}));
      };
      const fav = initFavourites();
      if (urlPath === '/unkeep') {
        fav.unkeep(id).then(gone => reply(gone ? 200 : 404, { kept: false })).catch(() => reply(500));
        return;
      }
      if (fav.has(id)) { reply(200, { kept: true }); return; }
      const slot = slotFor(id);
      if (!slot) { reply(404, { error: 'not on the wall' }); return; }
      fav.keep(slot.info as any, slot.original).then(() => reply(200, { kept: true })).catch(() => reply(500));
      return;
    }

    // Vitrine's remote asks for another piece: the same as Skip in the tray.
    if (urlPath === '/skip' && req.method === 'POST') {
      mainWindow?.webContents.send('tray-skip');
      res.writeHead(202, { 'Cache-Control': 'no-cache' });
      res.end();
      return;
    }

    if (urlPath === '/feed.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(buildFeedJson(req.headers.host));
      return;
    }

    if (urlPath === '/room.json') {
      const newest = newestSlots()[0];
      if (!newest) { res.writeHead(503); res.end('No artwork loaded yet'); return; }
      const { slot, n } = newest;
      const html = slot.original
        ? roomHtml(slot.info, `/art/${n}.jpg?v=${encodeURIComponent(slot.info.id)}`, slot.original.palette,
          fillsScreen(slot.original.width, slot.original.height), showLabelSetting())
        : roomHtml({}, `/${n}.jpg`, [], true, false);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ id: `${slot.info.id}@${slot.at}`, html }));
      return;
    }

    if (urlPath === '/overflight.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(buildOverflightJson(req.headers.host));
      return;
    }

    if (urlPath === '/info.json' || urlPath === '/info') {
      const info = currentArtworkInfo
        ? {
            id: currentArtworkInfo.id,
            title: currentArtworkInfo.title,
            artist: currentArtworkInfo.artist,
            year: currentArtworkInfo.year ?? '',
            collection: currentArtworkInfo.collection ?? '',
            source: currentArtworkInfo.source,
            sourceUrl: currentArtworkInfo.sourceUrl,
          }
        : null;
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(info));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
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
  if (tvServer) { tvServer.close(); tvServer = null; console.log('[TV Server] stopped'); }
  destroyOffscreenWin();
  currentImageBuffer = null;
  imageSlots.fill(null);
  keptSlots.length = 0;
  nextSlotIndex = 0;
}

// Virtual adapters (WSL/Hyper-V, Docker, VMs, VPNs) are often listed first but
// aren't reachable from other devices on the LAN, so rank them last.
const VIRTUAL_IFACE = /vethernet|wsl|hyper-v|docker|^br-|^veth|vbox|virtualbox|vmware|vmnet|^utun|tailscale|zerotier/i;

function getLanIp(): string {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const rank = (name: string, ip: string) =>
    (VIRTUAL_IFACE.test(name) ? 10 : 0) +
    (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : ip.startsWith('169.254.') ? 3 : 2);
  let best: { ip: string; score: number } | null = null;
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      const score = rank(name, iface.address);
      if (!best || score < best.score) best = { ip: iface.address, score };
    }
  }
  return best?.ip ?? '127.0.0.1';
}

// ─── IPC handlers ───

ipcMain.handle('get-settings', () => getSettings());
ipcMain.handle('save-settings', (_e, data: Record<string, unknown>) => {
  const prev = getSettings();
  saveSettings({ ...data, _favorites: prev._favorites ?? [] });
  // Re-render immediately if the label toggle changed while server is running
  if (tvServer && currentArtworkInfo && data.tvServerShowLabel !== prev.tvServerShowLabel) {
    const showLabel = (data.tvServerShowLabel as boolean) ?? true;
    renderLock = renderLock.then(() => renderOffscreen(currentArtworkInfo!, showLabel));
  }
  return true;
});
ipcMain.handle('get-favorites', () => initFavourites().list());
ipcMain.handle('keep-artwork', (_e, artwork) => {
  const slot = slotFor(artwork.id);
  return initFavourites().keep(artwork, slot?.original).then(() => true, () => false);
});
ipcMain.handle('unkeep-artwork', (_e, id: string) => initFavourites().unkeep(id));
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
  if (tvServer) {
    const showLabel = showLabelSetting();
    renderLock = renderLock.then(() => renderOffscreen(info, showLabel));
  }
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

  // Older favourites only point at the museum's image: copy them down, quietly, one at a time.
  setTimeout(() => initFavourites().fill().catch(err => console.warn('[Favourites] fill:', err)), 20_000);

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
