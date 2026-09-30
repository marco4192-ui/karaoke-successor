#!/usr/bin/env python3
"""verify-r34-d.py — Verifikation der R34-Propagation (10 Keys × 14 Sprachen).

Prüft je Sprache (es,fr,it,pt,ja,ko,zh,ru,nl,pl,sv,no,da,fi):
  (a) alle 9 unifiedSetup-Keys (deviceConnect + assignDevice*) als Key-Zeilen in
      delta.ts — dem File, in dem der Anker `deviceMicCount` in diesen Sprachen
      liegt (R31-Catch-up-Layer, wird in index.ts ZULETZT gemergt) — und NICHT
      zusätzlich in party.ts (keine Split-Duplikate über den Merge-Chain);
  (b) mobile.ts enthält `profileAssignedToast:` (im mobile-Objekt nach toastControlTaken);
  (c) Brace-Balance beider Dateien via String-/Kommentar-Stripper (inkl. Erkennung
      unterminierter Strings);
  (d) {name}-Platzhalter in assignDeviceAssignedTo, assignDeviceQrHint und
      profileAssignedToast genau 1×, in den übrigen neuen Keys 0×;
  (e) kein Key doppelt (innerhalb einer Datei und über delta.ts+party.ts+mobile.ts).
Zusätzlich: ✓ in assignDeviceDone, 🎤 in profileAssignedToast, keine unescapten
Quotes, Zeilen enden auf ",".
"""
import re, sys, pathlib

ROOT = pathlib.Path('/home/z/my-project/src/lib/i18n/locales')
LANGS = ['es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi']
PARTY_KEYS = ['deviceConnect', 'assignDevicesTitle', 'assignDeviceNoClients',
              'assignDeviceToPlayer', 'assignDeviceUnassigned', 'assignDeviceAssignedTo',
              'assignDeviceQrHint', 'assignDeviceDone', 'assignDeviceError']
NAME_KEYS = ['assignDeviceAssignedTo', 'assignDeviceQrHint', 'profileAssignedToast']
ALL_NEW = PARTY_KEYS + ['profileAssignedToast']

def strip_strings_comments(src: str):
    """Entfernt Strings & Kommentare; returnt (clean_src, unterminated)."""
    out, i, n = [], 0, len(src)
    state = 'normal'  # normal | line | block | sgl | dbl | tpl
    unterminated = False
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ''
        if state == 'normal':
            if c == '/' and nxt == '/':
                state = 'line'; i += 2; continue
            if c == '/' and nxt == '*':
                state = 'block'; i += 2; continue
            if c == "'":
                state = 'sgl'; i += 1; continue
            if c == '"':
                state = 'dbl'; i += 1; continue
            if c == '`':
                state = 'tpl'; i += 1; continue
            out.append(c); i += 1
        elif state == 'line':
            if c == '\n':
                state = 'normal'; out.append(c)
            i += 1
        elif state == 'block':
            if c == '*' and nxt == '/':
                state = 'normal'; i += 2; continue
            i += 1
        else:  # in string
            if c == '\\':
                i += 2; continue
            if (state == 'sgl' and c == "'") or (state == 'dbl' and c == '"') or (state == 'tpl' and c == '`'):
                state = 'normal'
            elif c == '\n' and state != 'tpl':
                unterminated = True  # single/double string across newline = broken
                state = 'normal'
            i += 1
    if state in ('sgl', 'dbl', 'tpl', 'block'):
        unterminated = True
    return ''.join(out), unterminated

def key_lines(lines, key):
    return [l for l in lines if re.match(rf'^\s*{re.escape(key)}:\s*["\']', l)]

def main():
    fails = []
    print(f'{"lang":5} {"keys":>4} {"exact":>5} {"miss":>4} {"dup":>4} {"name-ph":>7} {"braces":>6} {"emoji":>5}')
    for lang in LANGS:
        dt = (ROOT / lang / 'delta.ts').read_text(encoding='utf-8')
        mt = (ROOT / lang / 'mobile.ts').read_text(encoding='utf-8')
        pt = (ROOT / lang / 'party.ts').read_text(encoding='utf-8')
        dl, ml, pl = dt.split('\n'), mt.split('\n'), pt.split('\n')
        miss, dup, ph_err, exact = [], [], [], 0

        # (a) 9 Keys in delta.ts als Zeilen, NICHT in party.ts
        for k in PARTY_KEYS:
            d_hits = key_lines(dl, k)
            p_hits = key_lines(pl, k)
            if len(d_hits) != 1:
                miss.append(f'{k}(delta:{len(d_hits)})')
            elif len(p_hits):
                dup.append(f'{k}:party')
            else:
                exact += 1
                if not d_hits[0].rstrip().endswith(','):
                    miss.append(f'{k}:no-comma')
        # (b) profileAssignedToast in mobile.ts
        m_hits = key_lines(ml, 'profileAssignedToast')
        if len(m_hits) != 1:
            miss.append(f'profileAssignedToast(mobile:{len(m_hits)})')
        else:
            exact += 1
            if not m_hits[0].rstrip().endswith(','):
                miss.append('profileAssignedToast:no-comma')
        # (e) Duplikate innerhalb derselben Datei
        for k in ALL_NEW:
            pool = PARTY_KEYS and (dl if k != 'profileAssignedToast' else ml)
            if len(key_lines(pool, k)) > 1:
                dup.append(f'{k}:in-file')
        # (d) {name} genau 1× in den 3 Keys, 0× in den anderen neuen
        for k in PARTY_KEYS:
            hits = key_lines(dl, k)
            if hits:
                cnt = hits[0].count('{name}')
                want = 1 if k in NAME_KEYS else 0
                if cnt != want:
                    ph_err.append(f'{k}:{cnt}')
        mh = key_lines(ml, 'profileAssignedToast')
        if mh and mh[0].count('{name}') != 1:
            ph_err.append('profileAssignedToast:ph')
        # (c) Brace-Balance + unterminierte Strings
        brace_ok = True
        for name, src in (('delta', dt), ('mobile', mt)):
            clean, unterminated = strip_strings_comments(src)
            if unterminated or clean.count('{') != clean.count('}') or clean.count('[') != clean.count(']'):
                brace_ok = False
                miss.append(f'{name}:braces')
        # Emojis + Reihenfolge (mobile: direkt nach toastControlTaken; delta: nach deviceMicCount)
        emoji_ok = '✓' in (key_lines(dl, 'assignDeviceDone')[0] if key_lines(dl, 'assignDeviceDone') else '') \
                   and '🎤' in (mh[0] if mh else '')
        for fname, lines, anchor, newkey in (('delta', dl, 'deviceMicCount', 'deviceConnect'),
                                             ('mobile', ml, 'toastControlTaken', 'profileAssignedToast')):
            ai = [i for i, l in enumerate(lines) if re.match(rf'^\s*{anchor}:', l)]
            ni = [i for i, l in enumerate(lines) if re.match(rf'^\s*{newkey}:', l)]
            if ai and ni and ni[0] < ai[0]:
                miss.append(f'{fname}:order')

        ok = not miss and not dup and not ph_err and brace_ok and emoji_ok
        status = 'OK' if ok else 'FAIL'
        print(f'{lang:5} {len(ALL_NEW):>4} {exact:>5} {len(miss):>4} {len(dup):>4} '
              f'{len(ph_err):>7} {"bal" if brace_ok else "BAD":>6} {"ok" if emoji_ok else "BAD":>5}  {status}')
        for x in miss + dup + ph_err:
            fails.append(f'{lang}: {x}')
    if fails:
        print('\nDETAIL:'); [print(' -', f) for f in fails]; sys.exit(1)
    print('\nRESULT: ALL 14 locales OK (10/10 keys each, braces balanced, {name}×1, no dupes).')

if __name__ == '__main__':
    main()
