import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Artwork } from './domain/artwork';
import { getRandomArtwork, startPreloading, onFetchStatus, FetchStatus } from './services/shuffleScheduler';
import { useFavorites } from './services/favoritesStore';
import { startAmbience, stopAmbience, setVolume } from './services/audioService';
import { ArtworkStage } from './components/ArtworkStage';
import { TitleBar } from './components/TitleBar';
import { SettingsPanel } from './components/SettingsPanel';
import { ShortcutsOverlay, ShortcutHint } from './components/ShortcutsOverlay';
import { PauseIndicator } from './components/PauseIndicator';
import { FavoriteButton } from './components/FavoriteButton';
import { FavoritesPanel } from './components/FavoritesPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { PlaylistPanel } from './components/PlaylistPanel';
import { AmbientMode } from './components/AmbientMode';
import { CompanionWidget } from './components/CompanionWidget';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSettings } from './services/settingsStore';

const isCompanionRoute = window.location.hash === '#/companion';

function AppMain() {
  const { settings, updateSettings, loaded } = useSettings();
  const favStore = useFavorites();

  const [current, setCurrent] = useState<Artwork | null>(null);
  const [next, setNext] = useState<Artwork | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showTitleBar, setShowTitleBar] = useState(true);
  const [labelVisible, setLabelVisible] = useState(true);
  const [ambientMode, setAmbientMode] = useState(false);

  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ phase: 'idle', message: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideUITimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<string[]>([]);
  const backStackRef = useRef<Artwork[]>([]);
  const forwardStackRef = useRef<Artwork[]>([]);
  const fetchingRef = useRef(false);

  const interval = settings.intervalSeconds ?? 60;
  const immersive = settings.immersiveMode ?? false;
  const anyPanelOpen = showSettings || showShortcuts || showFavorites || showHistory || showPlaylists || showDiagnostics;

  const addToHistory = useCallback((id: string) => {
    historyRef.current.push(id);
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, []);

  const pushToBackStack = useCallback((artwork: Artwork) => {
    backStackRef.current.push(artwork);
    if (backStackRef.current.length > 30) backStackRef.current.shift();
  }, []);

  const finishTransition = useCallback((artwork: Artwork) => {
    setCurrent(artwork);
    addToHistory(artwork.id);
    favStore.addToHistory(artwork);
    setNext(null);
    setTransitioning(false);
    window.electronAPI?.setCurrentArtwork({ id: artwork.id, title: artwork.title, artist: artwork.artist, imageUrl: artwork.imageUrl, source: artwork.source, sourceUrl: artwork.sourceUrl });

    if (settings.offlineCacheEnabled) {
      window.electronAPI?.cacheImage(artwork.id, artwork.imageUrl, {
        id: artwork.id, title: artwork.title, artist: artwork.artist,
        year: artwork.year, medium: artwork.medium, source: artwork.source,
        sourceUrl: artwork.sourceUrl, collection: artwork.collection,
      });
    }
  }, [addToHistory, favStore, settings.offlineCacheEnabled]);

  const cancelPending = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (transitionTimer.current) { clearTimeout(transitionTimer.current); transitionTimer.current = null; }
  }, []);

  // ─── Core advance (forward) ───

  const advance = useCallback(async () => {
    cancelPending();

    if (fetchingRef.current && !transitioning) return;

    let activeCurrent = current;

    if (transitioning && next) {
      finishTransition(next);
      activeCurrent = next;
      fetchingRef.current = false;
      setFetching(false);
    }

    // If there's a forward stack entry, use it instead of fetching
    if (forwardStackRef.current.length > 0) {
      const restored = forwardStackRef.current.shift()!;
      if (activeCurrent) pushToBackStack(activeCurrent);
      setCurrent(restored);
      setNext(null);
      setTransitioning(false);
      window.electronAPI?.setCurrentArtwork({ id: restored.id, title: restored.title, artist: restored.artist, imageUrl: restored.imageUrl, source: restored.source, sourceUrl: restored.sourceUrl });
      return;
    }

    // Otherwise fetch a fresh artwork
    forwardStackRef.current = [];
    fetchingRef.current = true;
    setFetching(true);

    try {
      const artwork = await getRandomArtwork(settings, historyRef.current);
      setFetching(false);
      if (!artwork) { fetchingRef.current = false; return; }

      if (activeCurrent) pushToBackStack(activeCurrent);

      setNext(artwork);
      setTransitioning(true);
      fetchingRef.current = false;

      transitionTimer.current = setTimeout(() => {
        finishTransition(artwork);
      }, 2000);
    } catch { fetchingRef.current = false; setFetching(false); }
  }, [settings, current, next, transitioning, pushToBackStack, finishTransition, cancelPending]);

  // ─── Go back ───

  const goBack = useCallback(() => {
    if (backStackRef.current.length === 0) return;

    cancelPending();

    let effectiveCurrent = current;

    if (transitioning && next) {
      finishTransition(next);
      effectiveCurrent = next;
    }

    // Push current onto forward stack so next brings it back
    if (effectiveCurrent) {
      forwardStackRef.current.unshift(effectiveCurrent);
      if (forwardStackRef.current.length > 30) forwardStackRef.current.pop();
    }

    const prev = backStackRef.current.pop()!;
    setCurrent(prev);
    setNext(null);
    setTransitioning(false);
    fetchingRef.current = false;
    setFetching(false);
    window.electronAPI?.setCurrentArtwork({ id: prev.id, title: prev.title, artist: prev.artist, imageUrl: prev.imageUrl, source: prev.source, sourceUrl: prev.sourceUrl });
  }, [cancelPending, transitioning, next, current, finishTransition]);

  // ─── Status subscription ───

  useEffect(() => onFetchStatus(setFetchStatus), []);

  // ─── Init ───

  useEffect(() => {
    if (!loaded) return;
    startPreloading(settings, historyRef.current);
    const init = async () => {
      const artwork = await getRandomArtwork(settings, historyRef.current, true);
      if (artwork) {
        setCurrent(artwork);
        addToHistory(artwork.id);
        favStore.addToHistory(artwork);
        window.electronAPI?.setCurrentArtwork({ id: artwork.id, title: artwork.title, artist: artwork.artist, imageUrl: artwork.imageUrl, source: artwork.source, sourceUrl: artwork.sourceUrl });
      }
    };
    init();
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    startPreloading(settings, historyRef.current);
  }, [settings.enabledSources, settings.localFolderPath, settings.activePlaylist, settings.preferredCategory, loaded]);

  // ─── Auto-advance timer ───

  useEffect(() => {
    if (!current || !loaded || paused) return;
    timerRef.current = setTimeout(() => advance(), interval * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, interval, loaded, paused, advance]);

  // ─── Audio ───

  useEffect(() => {
    if (settings.audioEnabled) startAmbience(settings.audioVolume);
    else stopAmbience();
  }, [settings.audioEnabled]);

  useEffect(() => {
    if (settings.audioEnabled) setVolume(settings.audioVolume);
  }, [settings.audioVolume]);

  // ─── Keyboard ───

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showSettings) { setShowSettings(false); return; }
        if (showFavorites) { setShowFavorites(false); return; }
        if (showHistory) { setShowHistory(false); return; }
        if (showPlaylists) { setShowPlaylists(false); return; }
        if (showDiagnostics) { setShowDiagnostics(false); return; }
        return;
      }

      if (anyPanelOpen) return;

      switch (e.key) {
        case 'ArrowRight': case ' ': case 'n': case 'N':
          e.preventDefault(); advance(); break;
        case 'ArrowLeft': case 'b': case 'B':
          e.preventDefault(); goBack(); break;
        case 'p': case 'P':
          setPaused(p => !p); break;
        case 'f': case 'F':
          window.electronAPI?.toggleFullscreen(); break;
        case 'l': case 'L':
          setLabelVisible(v => !v); break;
        case 's': case 'S':
          setShowSettings(s => !s); break;
        case 'h': case 'H':
          if (current) {
            if (favStore.isFavorite(current.id)) favStore.removeFavorite(current.id);
            else favStore.addFavorite(current);
          }
          break;
        case 'a': case 'A':
          updateSettings({ audioEnabled: !settings.audioEnabled }); break;
        case 'm': case 'M':
          setAmbientMode(a => !a); break;
        case 'i': case 'I':
          if (current?.sourceUrl) window.electronAPI?.openExternal(current.sourceUrl);
          break;
        case 'd': case 'D':
          setShowDiagnostics(s => !s); break;
        case '?':
          setShowShortcuts(s => !s); break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advance, goBack, anyPanelOpen, showSettings, showShortcuts, showFavorites, showHistory, showPlaylists, showDiagnostics, current, settings.audioEnabled, favStore, updateSettings]);

  // ─── Tray IPC ───

  useEffect(() => {
    if (!window.electronAPI) return;
    const unSkip = window.electronAPI.onTraySkip(() => advance());
    const unPause = window.electronAPI.onTrayTogglePause(() => setPaused(p => !p));
    const unIdle = window.electronAPI.onIdleActivated(() => {});
    return () => { unSkip(); unPause(); unIdle(); };
  }, [advance]);

  // ─── Mouse: immersive hides title bar only, label is independent ───

  const handleMouseMove = useCallback(() => {
    setShowTitleBar(true);
    if (hideUITimer.current) clearTimeout(hideUITimer.current);
    if (immersive) hideUITimer.current = setTimeout(() => setShowTitleBar(false), 3000);
  }, [immersive]);

  useEffect(() => {
    if (immersive) hideUITimer.current = setTimeout(() => setShowTitleBar(false), 3000);
    else setShowTitleBar(true);
    return () => { if (hideUITimer.current) clearTimeout(hideUITimer.current); };
  }, [immersive]);

  const handleImageError = useCallback(() => advance(), [advance]);

  const handleAmbientSelect = useCallback((artwork: Artwork) => {
    if (current) pushToBackStack(current);
    setCurrent(artwork);
    addToHistory(artwork.id);
    setAmbientMode(false);
  }, [addToHistory, current, pushToBackStack]);

  const srAnnouncement = current && settings.screenReaderAnnounce
    ? `Now showing: ${current.title} by ${current.artist}, ${current.collection}`
    : '';

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} onMouseMove={handleMouseMove}>
      {srAnnouncement && (
        <div role="status" aria-live="polite" aria-atomic="true"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          {srAnnouncement}
        </div>
      )}

      <TitleBar
        visible={showTitleBar && !ambientMode}
        onSettings={() => setShowSettings(s => !s)}
        onFavorites={() => setShowFavorites(s => !s)}
        onHistory={() => setShowHistory(s => !s)}
        onPlaylists={() => setShowPlaylists(s => !s)}
      />

      {ambientMode ? (
        <AmbientMode active={ambientMode} settings={settings} onSelectArtwork={handleAmbientSelect} />
      ) : (
        <ArtworkStage
          current={current}
          next={next}
          transitioning={transitioning}
          fetching={fetching}
          fetchStatus={fetchStatus}
          showLabel={labelVisible}
          onImageError={handleImageError}
          onRetry={advance}
          transitionType={settings.transitionType}
        />
      )}

      <PauseIndicator paused={paused} />

      {current && !ambientMode && (
        <FavoriteButton
          visible={showTitleBar}
          isFavorite={favStore.isFavorite(current.id)}
          onToggle={() => {
            if (favStore.isFavorite(current.id)) favStore.removeFavorite(current.id);
            else favStore.addFavorite(current);
          }}
        />
      )}

      <ShortcutHint visible={showTitleBar && !anyPanelOpen && !ambientMode} />

      {showShortcuts && <ShortcutsOverlay visible={showShortcuts} onClose={() => setShowShortcuts(false)} />}

      {showSettings && <SettingsPanel settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />}

      {showFavorites && (
        <FavoritesPanel
          favorites={favStore.favorites}
          onRemove={favStore.removeFavorite}
          onSelect={entry => { setCurrent(entry.artwork); setShowFavorites(false); }}
          onExportJSON={favStore.exportFavorites}
          onExportHTML={favStore.exportFavoritesHTML}
          onClose={() => setShowFavorites(false)}
        />
      )}

      {showHistory && (
        <HistoryPanel
          history={favStore.history}
          onClear={favStore.clearHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      <DiagnosticsPanel
        visible={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        onRetryAll={advance}
      />

      {showPlaylists && (
        <PlaylistPanel
          activePlaylist={settings.activePlaylist}
          customPlaylists={settings.customPlaylists ?? []}
          onSelect={id => { updateSettings({ activePlaylist: id }); setShowPlaylists(false); }}
          onClose={() => setShowPlaylists(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  if (isCompanionRoute) {
    return <CompanionWidget />;
  }

  return (
    <ErrorBoundary>
      <AppMain />
    </ErrorBoundary>
  );
}
