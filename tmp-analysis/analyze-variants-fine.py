#!/usr/bin/env python3
"""R91-fein: Getrennte Analyse der Uhr-Region (Ring + Zifferblatt) und
Wortmarken-Region pro Variante, mit feineren Buckets und HSV-Filter."""
import sys
from PIL import Image
from collections import Counter

# Layout-Annahme aus R88 (ursprüngliches 1920x1080-Bild): Uhr war rows 130-296
# von 1080 => 12%-27% der Hoehe, cols 528-873 von 1920 => 27%-45% Breite.
# Variante ist 1376x768 — proportionale Region: rows 92-212, cols 371-615.
# Wir nehmen grosszuegig die obere Bildhaelfte-Mitte.
def regions(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    clock = im.crop((int(w*0.25), int(h*0.10), int(w*0.48), int(h*0.32)))
    wordmark = im.crop((0, int(h*0.42), w, h))
    return clock, wordmark

def top_colors(im, label, n=10, sat_min=0.35, lum_min=50):
    px = im.load()
    w, h = im.size
    out = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            out.append(px[x, y])
    def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
    def hsv_sat(c):
        mx, mn = max(c), min(c)
        return (mx-mn)/mx if mx else 0
    # Nur gesättigte, nicht-dunkle Pixel = echte Neon-Traeger
    sat = [c for c in out if hsv_sat(c) > sat_min and lum(c) > lum_min]
    q = Counter(((r//12*12, g//12*12, b//12*12) for (r, g, b) in sat))
    print(f"  {label} ({len(sat)} sat. Pixel):")
    for c, cnt in q.most_common(n):
        print(f"    #%02x%02x%02x  n=%d" % (c + (cnt,)))

for p in sys.argv[1:]:
    clock, word = regions(p)
    print(f"\n===== {p.split('/')[-1]} =====")
    top_colors(clock, "UHR-RING/ZIFFERBLATT")
    top_colors(word, "WORTMARKE/UNTERE HAELFTE", sat_min=0.30)
