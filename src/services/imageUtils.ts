export function getScreenMaxWidth(): number {
  return Math.round(Math.max(window.screen.width, 1920) * (window.devicePixelRatio || 1));
}

export function negotiateImageSize(url: string, maxWidth?: number): string {
  const width = maxWidth ?? getScreenMaxWidth();

  if (url.includes('artic.edu/iiif/2')) {
    return url.replace(/\/full\/\d+,\//, `/full/${Math.min(width, 1600)},/`);
  }

  if (url.includes('rijksmuseum.nl')) {
    if (width <= 800) return url.replace(/=s\d+$/, '=s800');
    return url;
  }

  if (url.includes('ids.si.edu')) {
    if (width <= 1200) return url.replace(/max\/\d+,/, `max/${Math.min(width, 1200)},`);
    return url;
  }

  return url;
}

export function preloadImage(url: string, timeoutMs = 15000): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}
