#!/usr/bin/env python3
"""R88 — canonical AfterTen Karaoke logo extraction pipeline.

Regenerates the brand assets in public/brand/ from the source logo image
(upload/Gemini_Generated_Image.jpeg, 1376x768):

  logo-badge.png   — neon clock badge (clock ring + "10" + hands + soundwave)
                     for the navbar and the settings About card.
                     Alpha = color-distance key (navy bg -> transparent,
                     neon -> opaque) * elliptical radial falloff so the glow
                     fades out BEFORE the crop edge (no rectangle seam).
                     Crop cut at row ~296: the clock arc is complete there,
                     the microphone (part of the wordmark "TEN") starts at
                     ~300 and stays out of the badge.

  logo-lockup.png  — full lockup (clock + AFTER TEN + KARAOKE + swoosh)
                     for the home hero. Alpha = luminance ramp (bg ~20-90
                     -> 0-1); the residual semi-transparent glow reads as
                     natural neon atmosphere (VLM-verified).

Usage: python3 tmp-analysis/logo-extract.py
Requires: PIL (pillow), numpy.
"""
from PIL import Image, ImageFilter
import numpy as np

SRC = 'upload/Gemini_Generated_Image.jpeg'

im = Image.open(SRC).convert('RGB')
W, H = im.size
a = np.asarray(im, dtype=np.float32)

# ── shared: background color of the source (deep night navy) ──
samples = np.concatenate([
    a[0:60, 0:200].reshape(-1, 3),
    a[700:768, 0:200].reshape(-1, 3),
    a[0:60, 1180:1376].reshape(-1, 3),
    a[700:768, 1180:1376].reshape(-1, 3),
])
bg = np.median(samples, axis=0)

# ────────────────────────────────────────────────────────────────
# 1) Badge: clock ring + 10 + hands + soundwave (no mic, no letters)
# ────────────────────────────────────────────────────────────────
X0, Y0, X1, Y1 = 458, 90, 932, 302          # generous box around the clock
crop = a[Y0:Y1, X0:X1]
h, w = crop.shape[:2]

# color-distance key: navy (wherever glow-lit) -> transparent, neon -> opaque
d = np.sqrt(((crop - bg) ** 2).sum(axis=2))
key = np.clip((d - 14.0) / 44.0, 0.0, 1.0)

# elliptical radial falloff centered on the clock (center ~ (700, 208))
cx, cy = (700 - X0), (208 - Y0)
rx, ry = 300.0, 200.0
yy, xx = np.mgrid[0:h, 0:w]
r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
falloff = np.clip((1.0 - r) / 0.35, 0.0, 1.0)   # 1 inside, 0 at the edge

alpha = key * falloff
rgba = np.dstack([crop, alpha * 255]).astype(np.uint8)
img = Image.fromarray(rgba)
r_, g_, b_, al = img.split()
al = al.filter(ImageFilter.GaussianBlur(1.1))   # kill JPEG speckle
img = Image.merge('RGBA', (r_, g_, b_, al))

def _trim(i):
    arr = np.asarray(i)
    amax = arr[:, :, 3]
    rows = np.where(amax.max(axis=1) > 10)[0]
    cols = np.where(amax.max(axis=0) > 10)[0]
    return i.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1))

img = _trim(img)
img.save('public/brand/logo-badge.png')
print(f"logo-badge.png: {img.size[0]}x{img.size[1]}")

# ────────────────────────────────────────────────────────────────
# 2) Lockup: clock + wordmark + swoosh (home hero)
# ────────────────────────────────────────────────────────────────
LX0, LY0, LX1, LY1 = 257, 95, 1107, 610
lcrop = a[LY0:LY1, LX0:LX1]
lum = lcrop.mean(axis=2)
lalpha = np.clip((lum - 20.0) / 70.0, 0.0, 1.0) ** 1.15
lrgba = np.dstack([lcrop, lalpha * 255]).astype(np.uint8)
limg = Image.fromarray(lrgba)
limg = _trim(limg)
limg.save('public/brand/logo-lockup.png')
print(f"logo-lockup.png: {limg.size[0]}x{limg.size[1]}")
