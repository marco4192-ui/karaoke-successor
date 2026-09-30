#!/usr/bin/env python3
"""R33: Merge pending-keys JSONs into EN/DE locale files (mobile.ts, settings.ts).
v2: fixes v1's truncation bug (missing tail append) + trailing commas.
Idempotent: skips keys that already exist. tsc afterwards catches duplicates."""
import json, glob, re

def js_str(s: str) -> str:
    out = s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n').replace('\r', '')
    return f"'{out}'"

def insert_after_open(path: str, obj_pattern: str, lines_to_add: list[str], indent_unit: str) -> bool:
    """Insert block right after the opening line matched by obj_pattern.
    v2: appends the untouched file tail (v1 truncated the file!)."""
    with open(path, encoding='utf-8') as f:
        src = f.read()
    m = re.search(obj_pattern, src, re.M)
    if not m:
        print(f"  !! pattern not found in {path}: {obj_pattern}")
        return False
    base_indent = m.group(1) if m.groups() else ''
    inner = base_indent + indent_unit
    block = '\n'.join(inner + l for l in lines_to_add)
    end = m.end()
    # v1 BUG: src[:end] + block DROPPED everything after the opening line.
    src = src[:end] + '\n' + block + '\n' + src[end:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    return True

def key_exists(path: str, key: str) -> bool:
    with open(path, encoding='utf-8') as f:
        return re.search(rf"^\s*{re.escape(key)}\s*:", f.read(), re.M) is not None

# ── load all pending keys ──
entries = {}
for f in sorted(glob.glob('src/lib/i18n/pending-keys/r33-*.json')):
    for e in json.load(open(f, encoding='utf-8')):
        entries[e['key']] = e

flat, hotkeys, mobile_help, mobile_views, settings_keys, skip = [], [], [], [], [], []
for key, e in entries.items():
    if key.startswith('tutorial.'):
        skip.append(key)          # r33-e already wrote tutorial.ts (en/de) directly
    elif key.startswith('mobile.hotkeys.'):
        hotkeys.append((key[len('mobile.hotkeys.'):], e))
    elif key.startswith('mobileViews.'):
        mobile_views.append((key.split('.', 1)[1], e))
    elif key == 'settings.loudnessNormalization':
        settings_keys.append((key.split('.', 1)[1], e))
    elif key.startswith('mobileHelp.'):
        mobile_help.append((key.split('.', 1)[1], e))
    elif key.startswith('mobile.'):
        flat.append((key.split('.', 1)[1], e))
    else:
        print('  ?? unclassified:', key)

print(f"flat={len(flat)} hotkeys={len(hotkeys)} mobileHelp={len(mobile_help)} "
      f"mobileViews={len(mobile_views)} settings={len(settings_keys)} skip(tutorial)={len(skip)}")

for lang in ('en', 'de'):
    mobile_path = f'src/lib/i18n/locales/{lang}/mobile.ts'
    settings_path = f'src/lib/i18n/locales/{lang}/settings.ts'
    print(f"— {lang}")

    # 1) flat keys + hotkeys sub-object into `mobile: {`
    parts = []
    todo_flat = [(k, e) for k, e in flat if not key_exists(mobile_path, k)]
    if todo_flat:
        parts.append('// ── R33: Companion-Neubau (P1-P19) ──')
        parts += [f"{k}: {js_str(e[lang])}," for k, e in todo_flat]
    todo_hk = [(k, e) for k, e in hotkeys if not key_exists(mobile_path, k)]
    if todo_hk:
        parts.append('// ── R33-e (P3): Hotkeys-Karte (Desktop-Home + Companion-Startseite) ──')
        parts.append('hotkeys: {')
        parts += [f"  {k}: {js_str(e[lang])}," for k, e in todo_hk]
        parts.append('},')
    if parts:
        ok = insert_after_open(mobile_path, r"^( *)mobile: \{", parts, '  ')
        print(f"  mobile: flat={len(todo_flat)} hotkeys={len(todo_hk)} inserted={ok}")
    else:
        print("  mobile: nothing to do")

    # 2) mobileHelp top-level object (new namespace)
    if mobile_help and not key_exists(mobile_path, 'mobileHelp'):
        parts = ['// ── R33/P19: Companion-Hilfe-View (rein lokal, keine Desktop-Befehle) ──',
                 'mobileHelp: {']
        parts += [f"  {k}: {js_str(e[lang])}," for k, e in mobile_help]
        parts.append('},')
        ok = insert_after_open(mobile_path, r"^export const mobileTranslations = \{", parts, '  ')
        print(f"  mobileHelp: {len(mobile_help)} inserted={ok}")
    else:
        print(f"  mobileHelp: skipped (exists={key_exists(mobile_path, 'mobileHelp')})")

    # 3) mobileViews keys
    todo_mv = [(k, e) for k, e in mobile_views if not key_exists(mobile_path, k)]
    if todo_mv:
        parts = ['// ── R33: Companion-Neubau ──'] + [f"{k}: {js_str(e[lang])}," for k, e in todo_mv]
        ok = insert_after_open(mobile_path, r"^( *)mobileViews: \{", parts, '  ')
        print(f"  mobileViews: {len(todo_mv)} inserted={ok}")
    else:
        print("  mobileViews: nothing to do")

    # 4) settings key
    todo_st = [(k, e) for k, e in settings_keys if not key_exists(settings_path, k)]
    if todo_st:
        parts = ['// ── R33/P5: Loudness-Normalisierung (89 dB Ziel) ──'] + [f"{k}: {js_str(e[lang])}," for k, e in todo_st]
        ok = insert_after_open(settings_path, r"^( *)settings: \{", parts, '  ')
        print(f"  settings: {len(todo_st)} inserted={ok}")
    else:
        print("  settings: nothing to do")

print("done")
