/**
 * Generates app icons from build/icon.svg.
 * Outputs:
 *   build/icon.png        — 512×512 (Linux / electron-builder)
 *   build/icon.ico        — Multi-size ICO (Windows)
 *   build/tray-icon.png   — 32×32 (system tray, all platforms)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const sharp = (await import('sharp')).default;
const pngToIco = (await import('png-to-ico')).default;

const svg = readFileSync(join(root, 'build', 'icon.svg'));

// 512×512 PNG for Linux / general use
const png512 = await sharp(svg).resize(512, 512).png().toBuffer();
writeFileSync(join(root, 'build', 'icon.png'), png512);
console.log('✓ build/icon.png (512×512)');

// 32×32 tray icon
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
writeFileSync(join(root, 'build', 'tray-icon.png'), png32);
console.log('✓ build/tray-icon.png (32×32)');

// Multi-size ICO: 16, 24, 32, 48, 64, 128, 256
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoBuffers = await Promise.all(
  icoSizes.map(size => sharp(svg).resize(size, size).png().toBuffer())
);
const ico = await pngToIco(icoBuffers);
writeFileSync(join(root, 'build', 'icon.ico'), ico);
console.log(`✓ build/icon.ico (${icoSizes.join(', ')}px)`);

console.log('\nDone. Icons ready in build/');
