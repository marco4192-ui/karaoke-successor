#!/usr/bin/env python3
"""Analyze the AFTER TEN KARAOKE logo image: find element bounds + palette.

Elements to locate:
  - clock badge (upper middle, neon ring)  -> navbar/about icon
  - wordmark "AFTER TEN" + "KARAOKE" + swoosh (middle/bottom) -> hero lockup
"""
from PIL import Image
import numpy as np

im = Image.open('upload/Gemini_Generated_Image.jpeg').convert('RGB')
W, H = im.size
a = np.asarray(im, dtype=np.float32)
lum = a.mean(axis=2)

# Row profile: fraction of "neon-bright" pixels (glow > 140) per row
bright = lum > 140
row_frac = bright.mean(axis=1)
col_frac = bright.mean(axis=0)

print(f"size: {W}x{H}")
print("\n-- row bands with bright content (row ranges where row_frac > 0.02) --")
active = row_frac > 0.02
bands = []
start = None
for y in range(H):
    if active[y] and start is None:
        start = y
    elif not active[y] and start is not None:
        bands.append((start, y - 1))
        start = None
if start is not None:
    bands.append((start, H - 1))
# merge bands separated by < 8 px
merged = []
for b in bands:
    if merged and b[0] - merged[-1][1] < 8:
        merged[-1] = (merged[-1][0], b[1])
    else:
        merged.append(list(b))
for b in merged:
    peak = row_frac[b[0]:b[1] + 1].max()
    print(f"  rows {b[0]}-{b[1]} (h={b[1]-b[0]+1}) peakfrac={peak:.3f}")

# Clock band: first merged band containing a strong blob in the top 60%
# Wordmark: bands in lower half
print("\n-- column profile inside top band (clock) --")
top_band = merged[0]
sub = bright[top_band[0]:top_band[1] + 1, :]
cols = sub.mean(axis=0)
active_cols = np.where(cols > 0.03)[0]
print(f"  clock cols: {active_cols.min()}-{active_cols.max()} (w={active_cols.max()-active_cols.min()+1})")

print("\n-- dominant bright colors (quantized) --")
mask = lum > 160
px = a[mask]
q = (px // 24 * 24 + 12).astype(int)
from collections import Counter
cnt = Counter(map(tuple, q))
for rgb, n in cnt.most_common(14):
    print(f"  #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}  n={n}")

print("\n-- background colors (dark, sampled from corners + edges) --")
corners = np.concatenate([
    a[0:40, 0:40].reshape(-1, 3), a[0:40, -40:].reshape(-1, 3),
    a[-40:, 0:40].reshape(-1, 3), a[-40:, -40:].reshape(-1, 3),
    a[0:20, W//2-100:W//2+100].reshape(-1, 3),
])
qc = (corners // 16 * 16 + 8).astype(int)
for rgb, n in Counter(map(tuple, qc)).most_common(8):
    print(f"  #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}  n={n}")
