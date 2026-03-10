import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Artwork } from './domain/artwork';
import { getRandomArtwork, startPreloading } from './services/shuffleScheduler';
import { ArtworkStage } from './components/ArtworkStage';
import { TitleBar } from './components/TitleBar';
import { SettingsPanel } from './components/SettingsPanel';
import { useSettings } from './services/settingsStore';

export default function App() {
  const { settings, updateSettings, loaded } = useSettings();
  const [current, setCurrent] = useState<Artwork | null>(null);
  const [next, setNext] = useState<Artwork | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideUITimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<string[]>([]);
  const advancingRef = useRef(false);

  const interval = (settings.intervalSeconds as number) ?? 60;
  const immersive = (settings.immersiveMode as boolean) ?? false;

  const addToHistory = useCallback((id: string) => {
    historyRef.current.push(id);
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, []);

  const advance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      const artwork = await getRandomArtwork(settings, historyRef.current);
      if (!artwork) {
        advancingRef.current = false;
        return;
      }

      setNext(artwork);
      setTransitioning(true);

      setTimeout(() => {
        setCurrent(artwork);
        addToHistory(artwork.id);
        setNext(null);
        setTransitioning(false);
        advancingRef.current = false;
      }, 2000);
    } catch {
      advancingRef.current = false;
    }
  }, [settings, addToHistory]);

  // Initial load + preload buffer
  useEffect(() => {
    if (!loaded) return;

    startPreloading(settings, historyRef.current);

    const init = async () => {
      const artwork = await getRandomArtwork(settings, historyRef.current);
      if (artwork) {
        setCurrent(artwork);
        addToHistory(artwork.id);
      }
    };
    init();
  }, [loaded]);

  // Re-fill buffer when sources change
  useEffect(() => {
    if (!loaded) return;
    startPreloading(settings, historyRef.current);
  }, [settings.enabledSources, settings.localFolderPath, loaded]);

  // Auto-advance timer
  useEffect(() => {
    if (!current || !loaded) return;

    timerRef.current = setTimeout(() => {
      advance();
    }, interval * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, interval, loaded, advance]);

  // Keyboard: skip with ArrowRight or Space
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showSettings) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'n') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advance, showSettings]);

  // Auto-skip on image load failure
  const handleImageError = useCallback(() => {
    advance();
  }, [advance]);

  const handleMouseMove = useCallback(() => {
    setShowUI(true);
    if (hideUITimer.current) clearTimeout(hideUITimer.current);
    if (immersive) {
      hideUITimer.current = setTimeout(() => setShowUI(false), 3000);
    }
  }, [immersive]);

  useEffect(() => {
    if (immersive) {
      hideUITimer.current = setTimeout(() => setShowUI(false), 3000);
    } else {
      setShowUI(true);
    }
    return () => {
      if (hideUITimer.current) clearTimeout(hideUITimer.current);
    };
  }, [immersive]);

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={handleMouseMove}
    >
      <TitleBar
        visible={showUI}
        onSettings={() => setShowSettings(s => !s)}
      />

      <ArtworkStage
        current={current}
        next={next}
        transitioning={transitioning}
        showLabel={!immersive || showUI}
        onImageError={handleImageError}
      />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
