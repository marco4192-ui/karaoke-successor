#!/usr/bin/env python3
"""R92 — themed logo asset extraction (per color variant).

Runs the proven R88 logo-extract pipeline (public/brand/logo-badge.png +
logo-lockup.png) over each user-provided color variant JPEG in upload/
(Red/Green/Purple/Orange/Pink, all 1376x768 — same layout as the original):

  logo-badge-<variant>.png   — neon clock badge (ring + "10" + hands +
                               soundwave), alpha = color-distance key with
                               elliptical radial falloff.
  logo-lockup-<variant>.png  — full lockup (clock + wordmark + swoosh),
                               alpha = luminance ramp.

The default (cyan) assets stay as-is: logo-badge.png / logo-lockup.png
(no suffix) — they are already VLM-verified and referenced by the
'afterten' base theme.

Usage: python3 tmp-analysis/logo-extract-variants.py
Requires: PIL (pillow), numpy.
"""
from PIL import Image, ImageFilter
import numpy as np

VARIANTS = [
    # (source file, suffix, theme id)
    ('Red.jpeg',    'red'),
    ('Green.jpeg',  'green'),
    ('Purple.jpeg', 'purple'),
    ('Orange.jpeg', 'orange'),
    ('Pink.jpeg',   'pink'),
]


def _trim(i):
    arr = np.asarray(i)
    amax = arr[:, :, 3]
    rows = np.where(amax.max(axis=1) > 10)[0]
    cols = np.where(amax.max(axis=0) > 10)[0]
    if len(rows) == 0 or len(cols) == 0:
        return None
    return i.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1))


def extract(src_path, suffix):
    im = Image.open(src_path).convert('RGB')
    W, H = im.size
    a = np.asarray(im, dtype=np.float32)

    # ── shared: per-variant background color (sampled from corners) ──
    samples = np.concatenate([
        a[0:60, 0:200].reshape(-1, 3),
        a[700:768, 0:200].reshape(-1, 3),
        a[0:60, 1180:1376].reshape(-1, 3),
        a[700:768, 1180:1376].reshape(-1, 3),
    ])
    bg = np.median(samples, axis=0)
    print(f"  bg = #{int(bg[0]):02x}{int(bg[1]):02x}{int(bg[2]):02x}")

    # ────────────────────────────────────────────────────────────────
    # 1) Badge: clock ring + 10 + hands + soundwave (no mic, no letters)
    # ────────────────────────────────────────────────────────────────
    X0, Y0, X1, Y1 = 458, 90, 932, 302
    crop = a[Y0:Y1, X0:X1]
    h, w = crop.shape[:2]

    d = np.sqrt(((crop - bg) ** 2).sum(axis=2))
    key = np.clip((d - 14.0) / 44.0, 0.0, 1.0)

    cx, cy = (700 - X0), (208 - Y0)
    rx, ry = 300.0, 200.0
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    falloff = np.clip((1.0 - r) / 0.35, 0.0, 1.0)

    alpha = key * falloff
    rgba = np.dstack([crop, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba)
    r_, g_, b_, al = img.split()
    al = al.filter(ImageFilter.GaussianBlur(1.1))
    img = Image.merge('RGBA', (r_, g_, b_, al))

    img = _trim(img)
    if img is None:
        print(f"  !! badge: keine sichtbaren Pixel — uebersprungen")
    else:
        out = f'public/brand/logo-badge-{suffix}.png'
        img.save(out)
        print(f"  badge  -> {out} ({img.size[0]}x{img.size[1]})")

    # ────────────────────────────────────────────────────────────────
    # 2) Lockup: clock + wordmark + swoosh
    # ────────────────────────────────────────────────────────────────
    LX0, LY0, LX1, LY1 = 257, 95, 1107, 610
    lcrop = a[LY0:LY1, LX0:LX1]
    lum = lcrop.mean(axis=2)
    lalpha = np.clip((lum - 20.0) / 70.0, 0.0, 1.0) ** 1.15
    lrgba = np.dstack([lcrop, lalpha * 255]).astype(np.uint8)
    limg = Image.fromarray(lrgba)
    limg = _trim(limg)
    if limg is None:
        print(f"  !! lockup: keine sichtbaren Pixel — uebersprungen")
    else:
        out = f'public/brand/logo-lockup-{suffix}.png'
        limg.save(out)
        print(f"  lockup -> {out} ({limg.size[0]}x{limg.size[1]})")


for src, suffix in VARIANTS:
    print(f"===== {src} ({suffix}) =====")
    extract(f'upload/{src}', suffix)
