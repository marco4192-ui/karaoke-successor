#!/usr/bin/env node
/**
 * App icon generator — AfterTen Karaoke
 *
 * Regenerates EVERY icon surface of the game from a single master image
 * (default: assets/app-icon.jpeg, or pass a path as first CLI argument):
 *
 *   Web (public/icons):  1024 Apple-standard master (PNG, sRGB, no alpha),
 *                        512 / 192 / 180 apple-touch, 96/32/16 favicons,
 *                        favicon.ico, favicon.svg (embedded-PNG wrapper),
 *                        512 maskable (safe-zone padded) for Android/PWA.
 *   Tauri (src-tauri):   all PNG sizes, Windows Square*Logo + StoreLogo,
 *                        icon.ico (16/32/48/256), icon.icns (macOS),
 *                        iOS AppIcon set, Android mipmap launchers
 *                        (legacy, round + adaptive foreground) and the
 *                        adaptive background color XML.
 *
 * Usage:  bun run icons            (uses assets/app-icon.jpeg)
 *         bun run icons my.png     (uses any other square source image)
 *
 * Apple standard compliance for the 1024 master:
 *   - 1024x1024 px, PNG, sRGB, NO transparency, NO pre-rendered rounded
 *     corners (the OS applies its own mask).
 */

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(ROOT, process.argv[2] ?? 'assets/app-icon.jpeg');

if (!fs.existsSync(SRC)) {
  console.error(`[icons] Source image not found: ${SRC}`);
  process.exit(1);
}

const PUB_ICONS = path.join(ROOT, 'public/icons');
const TAURI_ICONS = path.join(ROOT, 'src-tauri/icons');
for (const dir of [PUB_ICONS, TAURI_ICONS, path.join(TAURI_ICONS, 'ios')]) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Background tone of the master (sampled near a corner, inset to skip
 *  possible edge artifacts) — used for maskable padding + Android layer. */
async function sampleBackground(buffer) {
  const { data } = await sharp(buffer)
    .extract({ left: 4, top: 4, width: 8, height: 8 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0;
  const px = data.length / 3;
  for (let i = 0; i < data.length; i += 3) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const hex =
    '#' +
    [r, g, b]
      .map((v) => Math.round(v / px).toString(16).padStart(2, '0'))
      .join('');
  return hex;
}

/** Full-bleed opaque RGB PNG at an exact square size. */
async function fullBleed(master, size, out, { rgba = false } = {}) {
  let img = master.clone().resize(size, size, { fit: 'fill', kernel: 'lanczos3' });
  if (rgba) img = img.ensureAlpha(); // opaque alpha channel (matches existing assets)
  await img.png({ compressionLevel: 9, palette: false }).toFile(out);
}

/** Maskable/adaptive variant: content scaled into the safe zone, centered
 *  on the master's own background tone (seamless for circular OS masks). */
async function safeZone(master, canvasSize, contentRatio, out, { transparent = false } = {}) {
  const content = Math.round(canvasSize * contentRatio);
  const offset = Math.round((canvasSize - content) / 2);
  const scaled = await master
    .clone()
    .resize(content, content, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();
  let base;
  if (transparent) {
    base = { create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  } else {
    base = { create: { width: canvasSize, height: canvasSize, channels: 4, background: BG_HEX } };
  }
  await sharp(base)
    .composite([{ input: scaled, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toFile(out);
}

/** Classic .ico container with PNG-compressed entries (Vista+). */
async function buildIco(entries, out) {
  // entries: [{ size, buffer }] sorted ascending
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  const dirSize = 16 * entries.length;
  let offset = 6 + dirSize;
  const dirs = [];
  const blobs = [];
  for (const { size, buffer } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0);
    dir.writeUInt8(size >= 256 ? 0 : size, 1);
    dir.writeUInt8(0, 2); // colors
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(buffer.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirs.push(dir);
    blobs.push(buffer);
    offset += buffer.length;
  }
  fs.writeFileSync(out, Buffer.concat([header, ...dirs, ...blobs]));
}

/** macOS .icns container (PNG-encoded icon types, 10.7+). */
async function buildIcns(entries, out) {
  // entries: [{ type, buffer }]
  const chunks = [];
  let total = 8; // header
  for (const { type, buffer } of entries) {
    const len = buffer.length + 8;
    total += len;
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(len, 4);
    chunks.push(head, buffer);
  }
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(total, 4);
  fs.writeFileSync(out, Buffer.concat([header, ...chunks]));
}

async function pngBuffer(master, size) {
  return master
    .clone()
    .resize(size, size, { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

let BG_HEX = '#08091a';

async function main() {
  console.log(`[icons] master: ${SRC}`);
  const meta = await sharp(SRC).metadata();
  if (meta.width !== meta.height) {
    console.warn(`[icons] WARNING: source is ${meta.width}x${meta.height} (not square) — cropping to square center.`);
  }
  BG_HEX = await sampleBackground(await sharp(SRC).png().toBuffer());
  console.log(`[icons] sampled background tone: ${BG_HEX}`);

  // Square, opaque master pipeline (center-crop if needed).
  const master = sharp(SRC)
    .rotate() // strip EXIF orientation
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .flatten({ background: BG_HEX }); // guarantees: no alpha (Apple standard)

  // ── 1. Web / PWA icons (public/icons) ─────────────────────────────────
  const web = [
    ['icon-1024x1024.png', 1024], // Apple standard master (no alpha!)
    ['icon-512x512.png', 512],
    ['icon-192x192.png', 192],
    ['apple-touch-icon.png', 180],
    ['favicon-96x96.png', 96],
    ['favicon-32x32.png', 32],
    ['favicon-16x16.png', 16],
  ];
  for (const [name, size] of web) {
    await fullBleed(master, size, path.join(PUB_ICONS, name));
    console.log(`  ✓ public/icons/${name} (${size}x${size})`);
  }

  // Maskable PWA icon: full design inside the 80% safe zone.
  await safeZone(master, 512, 0.8, path.join(PUB_ICONS, 'icon-512x512-maskable.png'));
  console.log('  ✓ public/icons/icon-512x512-maskable.png (safe zone)');

  // favicon.ico (16+32+48+256, PNG-compressed entries)
  const icoEntries = [];
  for (const s of [16, 32, 48, 256]) {
    icoEntries.push({ size: s, buffer: await pngBuffer(master, s) });
  }
  await buildIco(icoEntries, path.join(ROOT, 'public/favicon.ico'));
  console.log('  ✓ public/favicon.ico (16/32/48/256)');

  // favicon.svg — SVG wrapper embedding a 128px PNG (keeps SVG favicon slot
  // working with the raster design).
  const svgPng = await pngBuffer(master, 128);
  const b64 = svgPng.toString('base64');
  fs.writeFileSync(
    path.join(ROOT, 'public/favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">\n  <image href="data:image/png;base64,${b64}" width="128" height="128"/>\n</svg>\n`,
  );
  console.log(`  ✓ public/favicon.svg (embedded 128px PNG, ${(b64.length / 1024) | 0} KB b64)`);

  // Remove the legacy SVG icon (old design, no longer referenced).
  const legacySvg = path.join(PUB_ICONS, 'icon-512x512.svg');
  if (fs.existsSync(legacySvg)) {
    fs.unlinkSync(legacySvg);
    console.log('  ✗ removed legacy public/icons/icon-512x512.svg');
  }

  // ── 2. Tauri root icons (src-tauri/icons) ─────────────────────────────
  const tauri = [
    ['32x32.png', 32],
    ['64x64.png', 64],
    ['128x128.png', 128],
    ['128x128@2x.png', 256],
    ['icon.png', 512],
    ['Square30x30Logo.png', 30],
    ['Square44x44Logo.png', 44],
    ['Square71x71Logo.png', 71],
    ['Square89x89Logo.png', 89],
    ['Square107x107Logo.png', 107],
    ['Square142x142Logo.png', 142],
    ['Square150x150Logo.png', 150],
    ['Square284x284Logo.png', 284],
    ['Square310x310Logo.png', 310],
    ['StoreLogo.png', 50],
  ];
  for (const [name, size] of tauri) {
    await fullBleed(master, size, path.join(TAURI_ICONS, name), { rgba: true });
  }
  console.log('  ✓ src-tauri/icons: 15 PNGs (root + Windows Store logos)');

  // icon.ico + icon.icns
  const tIco = [];
  for (const s of [16, 32, 48, 256]) tIco.push({ size: s, buffer: await pngBuffer(master, s) });
  await buildIco(tIco, path.join(TAURI_ICONS, 'icon.ico'));
  const icnsMap = [
    ['ic07', 128],
    ['ic08', 256],
    ['ic09', 512],
    ['ic10', 1024],
    ['ic11', 32],
    ['ic12', 64],
    ['ic13', 256],
    ['ic14', 512],
  ];
  const tIcns = [];
  for (const [type, s] of icnsMap) tIcns.push({ type, buffer: await pngBuffer(master, s) });
  await buildIcns(tIcns, path.join(TAURI_ICONS, 'icon.icns'));
  console.log('  ✓ src-tauri/icons/icon.ico + icon.icns');

  // ── 3. iOS AppIcon set ────────────────────────────────────────────────
  const ios = [
    ['AppIcon-20x20@1x.png', 20],
    ['AppIcon-20x20@2x.png', 40],
    ['AppIcon-20x20@2x-1.png', 40],
    ['AppIcon-20x20@3x.png', 60],
    ['AppIcon-29x29@1x.png', 29],
    ['AppIcon-29x29@2x.png', 58],
    ['AppIcon-29x29@2x-1.png', 58],
    ['AppIcon-29x29@3x.png', 87],
    ['AppIcon-40x40@1x.png', 40],
    ['AppIcon-40x40@2x.png', 80],
    ['AppIcon-40x40@2x-1.png', 80],
    ['AppIcon-40x40@3x.png', 120],
    ['AppIcon-512@2x.png', 1024],
    ['AppIcon-60x60@2x.png', 120],
    ['AppIcon-60x60@3x.png', 180],
    ['AppIcon-76x76@1x.png', 76],
    ['AppIcon-76x76@2x.png', 152],
    ['AppIcon-83.5x83.5@2x.png', 167],
  ];
  for (const [name, size] of ios) {
    await fullBleed(master, size, path.join(TAURI_ICONS, 'ios', name), { rgba: true });
  }
  console.log(`  ✓ src-tauri/icons/ios: ${ios.length} AppIcon PNGs`);

  // ── 4. Android mipmaps ────────────────────────────────────────────────
  const android = [
    ['mipmap-mdpi', 48, 108],
    ['mipmap-hdpi', 49, 162],
    ['mipmap-xhdpi', 96, 216],
    ['mipmap-xxhdpi', 144, 324],
    ['mipmap-xxxhdpi', 192, 432],
  ];
  for (const [dir, launcher, fg] of android) {
    const base = path.join(TAURI_ICONS, 'android', dir);
    fs.mkdirSync(base, { recursive: true });
    await fullBleed(master, launcher, path.join(base, 'ic_launcher.png'), { rgba: true });
    await fullBleed(master, launcher, path.join(base, 'ic_launcher_round.png'), { rgba: true });
    // Adaptive foreground: whole design scaled to 66% of the 108dp canvas
    // (inside the 72dp safe zone) on transparency.
    await safeZone(master, fg, 0.66, path.join(base, 'ic_launcher_foreground.png'), { transparent: true });
  }
  // Adaptive icon background color = master background tone.
  fs.mkdirSync(path.join(TAURI_ICONS, 'android/values'), { recursive: true });
  fs.writeFileSync(
    path.join(TAURI_ICONS, 'android/values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">${BG_HEX}</color>\n</resources>\n`,
  );
  console.log('  ✓ src-tauri/icons/android: mipmaps + adaptive layers');
  console.log(`[icons] done — background tone ${BG_HEX} written to Android values.`);
}

main().catch((err) => {
  console.error('[icons] FAILED:', err);
  process.exit(1);
});
