#!/usr/bin/env python3
"""R91: Extrahiert die Theme-Palette aus den 5 Logo-Farbvarianten.
Methodik wie R88 (AfterTen-Theme): Neon-Farben = gesättigt + hell,
Hintergrund = dunkle Pixel, Text = helle neutrale Pixel."""
import sys
from PIL import Image
from collections import Counter

def analyze(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    samples = []
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            samples.append(px[x, y])

    def hexc(c): return '#%02x%02x%02x' % c
    def is_gray(c):
        mx, mn = max(c), min(c)
        return mx - mn < 25
    def lum(c):
        return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

    # 1) NEON-FARBEN: gesättigt (nicht grau), mittlere bis hohe Helligkeit
    neons = [c for c in samples if not is_gray(c) and lum(c) > 70]
    q = Counter(((r//24*24, g//24*24, b//24*24) for (r, g, b) in neons))
    neon_top = q.most_common(8)

    # 2) HINTERGRUND: dunkle Pixel
    darks = [c for c in samples if lum(c) < 40]
    dq = Counter(((r//8*8, g//8*8, b//8*8) for (r, g, b) in darks))
    dark_top = dq.most_common(5)

    # 3) TEXT/HIGHLIGHT: sehr hell
    brights = [c for c in samples if lum(c) > 200]
    bq = Counter(((r//16*16, g//16*16, b//16*16) for (r, g, b) in brights))
    bright_top = bq.most_common(4)

    print(f"\n===== {path.split('/')[-1]} =====")
    print("NEON (dominant):")
    for c, n in neon_top:
        print(f"  {hexc(c)}  n={n}")
    print("DARK BG:")
    for c, n in dark_top:
        print(f"  {hexc(c)}  n={n}")
    print("BRIGHT (Text/Glow):")
    for c, n in bright_top:
        print(f"  {hexc(c)}  n={n}")

for p in sys.argv[1:]:
    analyze(p)
