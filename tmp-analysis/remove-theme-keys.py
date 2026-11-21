#!/usr/bin/env python3
"""R91: Entfernt die 6 toten Theme-Label-Keys (themeNeonNights … themeMinimalLight)
aus allen 16 Locale-Dateien. Die Keys wurden nur vom Mirror-Theme-Picker genutzt,
der jetzt direkt aus der zentralen THEMES-Registry liest."""
import re
import glob
import sys

KEYS = [
    'themeNeonNights', 'themeRetroArcade', 'themeSunsetVibes',
    'themeOceanDeep', 'themeGalaxyPop', 'themeMinimalLight',
]
pattern = re.compile(
    r"^\s*(" + '|'.join(KEYS) + r")\s*:\s*(['\"]).*?\2,?\s*$\n?",
    re.MULTILINE,
)

changed_total = 0
for path in sorted(glob.glob('src/lib/i18n/locales/*/settings.ts')):
    with open(path, encoding='utf-8') as f:
        src = f.read()
    new, n = pattern.subn('', src)
    if n:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new)
    print(f"{path}: {n} Zeilen entfernt")
    changed_total += n

print(f"\nGesamt: {changed_total} Zeilen")
if changed_total == 0:
    sys.exit('WARNUNG: nichts entfernt — Muster pruefen!')
