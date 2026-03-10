import { useEffect, useRef } from 'react';

export function useIdleListener(callback: () => void) {
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    cleanup.current = window.electronAPI.onIdleActivated(callback);
    return () => {
      cleanup.current?.();
    };
  }, [callback]);
}
