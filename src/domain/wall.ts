// The wall a piece hangs on, from its own colours. Mirrors electron/artFeed.ts (the TV composites)
// and Vitrine's Atmosphere.kt, so a painting reads the same on the desktop, the web and the TV.

const cache = new Map<string, Promise<string[]>>();

/** The few colours an image is made of, most common first (k-means over a 32×32 thumbnail). */
export function paletteOf(url: string): Promise<string[]> {
  let hit = cache.get(url);
  if (!hit) {
    hit = new Promise<string[]>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 32;
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0, 32, 32);
          resolve(kmeans(ctx.getImageData(0, 0, 32, 32).data));
        } catch {
          resolve([]); // a tainted canvas just means a plain wall
        }
      };
      img.onerror = () => resolve([]);
      img.src = url;
    });
    cache.set(url, hit);
    if (cache.size > 40) cache.delete(cache.keys().next().value!);
  }
  return hit;
}

function kmeans(rgba: Uint8ClampedArray, k = 5): string[] {
  const px: number[][] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) if (rgba[i + 3] >= 128) px.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  if (!px.length) return [];
  const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const byLum = [...px].sort((a, b) => lum(a) - lum(b));
  let centres = Array.from({ length: Math.min(k, px.length) }, (_, i) => [...byLum[Math.floor(((i + 0.5) / k) * byLum.length)]]);
  let counts: number[] = [];
  for (let iter = 0; iter < 8; iter++) {
    const sums = centres.map(() => [0, 0, 0]);
    counts = centres.map(() => 0);
    for (const p of px) {
      let best = 0, bestD = Infinity;
      centres.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      });
      counts[best]++;
      sums[best][0] += p[0]; sums[best][1] += p[1]; sums[best][2] += p[2];
    }
    centres = centres.map((c, j) => (counts[j] ? sums[j].map((s) => s / counts[j]) : c));
  }
  const hex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  return centres.map((c, j) => ({ c, n: counts[j] })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map((x) => hex(x.c));
}

function hsl(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hue / 6, s, l];
}

const css = ([h, s, l]: number[], a = 1) => `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;

/** CSS custom properties for `.wall` (and the accent colour) from a palette. */
export function wallVars(palette: string[]): Record<string, string> {
  const tones = (palette.length ? palette : ['#1b1a19']).map(hsl);
  const [h, s] = tones[0];
  const vivid = [...tones].sort((a, b) => b[1] * (1 - Math.abs(b[2] - 0.5)) - a[1] * (1 - Math.abs(a[2] - 0.5)));
  const pool = (t: number[], a: number) => css([t[0], Math.min(0.75, t[1] * 1.1), 0.32], a);
  return {
    '--wall-base': css([h, Math.min(0.35, s * 0.6), 0.075]),
    '--wall-pool-a': pool(vivid[0], 0.62),
    '--wall-pool-b': pool(vivid[1] || vivid[0], 0.46),
    '--wall-light': css([h, Math.min(0.3, s * 0.5), 0.55], 0.2),
    '--color-accent': css([vivid[0][0], Math.min(0.6, vivid[0][1]), 0.68]),
  };
}
