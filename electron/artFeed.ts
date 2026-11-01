// The TV feed's source material: each artwork as a clean image (no baked-in label or
// blurred letterbox) plus its colours, so clients can present it however they like.
import { nativeImage, net } from 'electron';
import * as fs from 'fs';

export interface Original { buffer: Buffer; width: number; height: number; palette: string[]; }

const MAX_EDGE = 2400;
/** Big pieces are shown full screen and in close-up on the TV, so they keep more of their detail. */
export const BIG_EDGE = 3200;

/** A metre or more on its long side: hung small, a piece like this loses what it is. */
export function isBig(size?: { width: number; height: number }): boolean {
  return !!size && Math.max(size.width, size.height) >= 100;
}

/** Downloads (or reads) the artwork, caps its long edge (2400px unless told), and samples its colours. */
export async function loadOriginal(url: string, maxEdge = MAX_EDGE): Promise<Original | null> {
  let data: Buffer;
  if (/^https?:/i.test(url)) {
    const res = await net.fetch(url);
    if (!res.ok) throw new Error(`image ${res.status}`);
    data = Buffer.from(await res.arrayBuffer());
  } else if (/^file:/i.test(url)) {
    // file://C:/… (how ArtSaver builds Windows paths) and file:///C:/… both end up as C:/…
    let p = decodeURIComponent(url.replace(/^file:\/*/i, ''));
    if (!/^[a-z]:/i.test(p)) p = '/' + p;
    data = fs.readFileSync(p);
  } else {
    return null;
  }
  let img = nativeImage.createFromBuffer(data);
  if (img.isEmpty()) return null;
  const { width, height } = img.getSize();
  if (Math.max(width, height) > maxEdge) {
    img = img.resize(width >= height ? { width: maxEdge, quality: 'good' } : { height: maxEdge, quality: 'good' });
  }
  const size = img.getSize();
  const small = img.resize({ width: 32, height: 32, quality: 'good' });
  return { buffer: img.toJPEG(90), width: size.width, height: size.height, palette: paletteFromBgra(small.toBitmap()) };
}

/** k-means over a small BGRA bitmap; the most common colours first. */
export function paletteFromBgra(bgra: Buffer, k = 5): string[] {
  const px: number[][] = [];
  for (let i = 0; i + 3 < bgra.length; i += 4) {
    if (bgra[i + 3] < 128) continue;
    px.push([bgra[i + 2], bgra[i + 1], bgra[i]]);
  }
  if (px.length === 0) return [];
  // Seed with luminance quantiles so dark, mid and light tones all get a centre.
  const byLum = [...px].sort((a, b) => lum(a) - lum(b));
  let centres = Array.from({ length: Math.min(k, px.length) }, (_, i) => [...byLum[Math.floor(((i + 0.5) / k) * byLum.length)]]);
  let counts = new Array(centres.length).fill(0);
  for (let iter = 0; iter < 8; iter++) {
    const sums = centres.map(() => [0, 0, 0]);
    counts = new Array(centres.length).fill(0);
    for (const p of px) {
      let best = 0, bestD = Infinity;
      centres.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      });
      counts[best]++;
      sums[best][0] += p[0]; sums[best][1] += p[1]; sums[best][2] += p[2];
    }
    centres = centres.map((c, j) => counts[j] ? sums[j].map(s => s / counts[j]) : c);
  }
  return centres
    .map((c, j) => ({ c, n: counts[j] }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map(x => hex(x.c));
}

const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const hex = (c: number[]) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hsl([r, g, b]: number[]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function css([h, s, l]: number[], a = 1): string {
  return `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;
}

/**
 * The wall a piece hangs on: a dark ground in its own dominant hue, warmed by two pools of
 * its other colours, with a soft light from above.
 */
export function wallColours(palette: string[]) {
  const tones = (palette.length ? palette : ['#1b1a19']).map(p => hsl(rgb(p)));
  const [h, s] = tones[0];
  const vivid = [...tones].sort((a, b) => b[1] * (1 - Math.abs(b[2] - 0.5)) - a[1] * (1 - Math.abs(a[2] - 0.5)));
  const pool = (t: number[], a: number) => css([t[0], Math.min(0.75, t[1] * 1.1), 0.32], a);
  return {
    base: css([h, Math.min(0.35, s * 0.6), 0.075]),
    poolA: pool(vivid[0] || tones[0], 0.62),
    poolB: pool(vivid[1] || vivid[0] || tones[0], 0.46),
    light: css([h, Math.min(0.3, s * 0.5), 0.55], 0.2),
  };
}

/** Photographs and paintings close to the screen's shape fill it; everything else is hung. */
export function fillsScreen(width: number, height: number): boolean {
  const r = width / Math.max(1, height);
  return r > 1.5 && r < 2.0 && width >= 1600;
}

export const WALL_FONTS = 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300..500&family=Geist:wght@300..500&display=swap';

/** Shared by the offscreen renderer (the JPEG composites) and the browser gallery page. */
export const WALL_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#0b0a0a;color:#f5f2ed}
.room{position:absolute;inset:0;transition:opacity 2.4s cubic-bezier(.4,0,.2,1)}
.wall{position:absolute;inset:0;background:
  radial-gradient(90% 70% at 50% -10%, var(--light) 0%, transparent 70%),
  radial-gradient(55% 60% at 12% 92%, var(--poolA) 0%, transparent 72%),
  radial-gradient(50% 55% at 92% 78%, var(--poolB) 0%, transparent 70%),
  var(--base)}
.grain{position:absolute;inset:-20%;opacity:.07;mix-blend-mode:overlay;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.piece{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%);max-width:82%;max-height:78%;display:block;
  box-shadow:0 2px 6px rgba(0,0,0,.35),0 24px 60px rgba(0,0,0,.45),0 60px 140px rgba(0,0,0,.35)}
.bleed .piece{left:0;top:0;transform:none;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover;box-shadow:none}
.bleed .wall{display:none}
.shade{position:absolute;inset:auto 0 0 0;height:42%;background:linear-gradient(to top,rgba(0,0,0,.55),transparent)}
.room:not(.bleed) .shade{display:none}
.caption{position:absolute;left:4.2vw;bottom:5vh;max-width:46vw;text-shadow:0 1px 18px rgba(0,0,0,.45)}
.caption .t{font-family:'Newsreader',Georgia,serif;font-optical-sizing:auto;font-weight:400;font-size:clamp(20px,2.3vw,44px);line-height:1.12;letter-spacing:-.01em}
.caption .a{font-family:'Geist',system-ui,sans-serif;font-weight:400;font-size:clamp(12px,1.05vw,20px);opacity:.72;margin-top:.55em}
.caption .c{font-family:'Geist',system-ui,sans-serif;font-weight:300;font-size:clamp(11px,.9vw,17px);opacity:.46;margin-top:.25em}
.caption.off{display:none}
`;

export interface Labelled { title?: string; artist?: string; year?: string; collection?: string; }

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One hung (or full-bleed) piece with its caption, as HTML. */
export function roomHtml(info: Labelled, src: string, palette: string[], bleed: boolean, showLabel: boolean): string {
  const w = wallColours(palette);
  const byline = [info.artist, info.year].filter(Boolean).join(', ');
  return `<div class="room${bleed ? ' bleed' : ''}" style="--base:${w.base};--poolA:${w.poolA};--poolB:${w.poolB};--light:${w.light}">
<div class="wall"></div><img class="piece" src="${esc(src)}"/><div class="shade"></div><div class="grain"></div>
<div class="caption${showLabel ? '' : ' off'}"><div class="t">${esc(info.title)}</div>${byline ? `<div class="a">${esc(byline)}</div>` : ''}${info.collection ? `<div class="c">${esc(info.collection)}</div>` : ''}</div></div>`;
}
