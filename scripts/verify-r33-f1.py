#!/usr/bin/env python3
"""R33-f1 Verify: prüft die 7 Sprachen (es, fr, it, pt, ja, ko, zh) nach der Propagation.

Checks je Sprache:
  1) Brace-Balance (after stripping strings & comments via state machine) für
     mobile.ts / settings.ts / tutorial.ts — PLUS Check, dass keine unterminierten Strings sind.
  2) Alle 143 R33-Keys als exakte `leaf: 'wert',`-Zeilen vorhanden (Wert == erwartete Übersetzung).
  3) Eindeutigkeit: kein Key doppelt, `mobileHelp: {` / `hotkeys: {` genau 1× in mobile.ts.
  4) Platzhalter {n}/{m}/{name} deckungsgleich mit EN-Quelle.
  5) still-EN / still-DE Detection (Wert identisch mit Quelle — Auffälligkeits-Report).
"""
import json, glob, re, sys
from collections import Counter

LANGS = ['es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh']
BASE = 'src/lib/i18n/locales'

# Erwartete Werte: Konstanten + T-Map aus dem Propagate-Skript übernehmen.
# Nur der Kopf (Key-Loading + Übersetzungen) wird exec'iert — die Einfüge-Logik
# beginnt hinter der Marker-Zeile 'EINFÜGE-LOGIK' und bleibt unberührt.
_prop_src = open('scripts/propagate-r33-f1.py', encoding='utf-8').read()
_head = _prop_src.split('EINFÜGE-LOGIK')[0]
_ns = {}
exec(_head, _ns)
T = _ns['T']
entries = _ns['by_key']
order = _ns['ALL_KEYS']

PH = re.compile(r'\{[a-z]+\}')

def strip_strings_comments(text):
    """Entfernt Strings & Kommentare; wirft bei unterminiertem String."""
    out = []
    i, n = 0, len(text)
    state = 'normal'  # normal | sq | dq | lc | bc
    line = 1
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ''
        if state == 'normal':
            if c == '/' and nxt == '/':
                state = 'lc'; i += 2; continue
            if c == '/' and nxt == '*':
                state = 'bc'; i += 2; continue
            if c == "'":
                state = 'sq'; i += 1; continue
            if c == '"':
                state = 'dq'; i += 1; continue
            out.append(c); i += 1
        elif state == 'lc':
            if c == '\n':
                state = 'normal'; out.append(c)
            i += 1
        elif state == 'bc':
            if c == '*' and nxt == '/':
                state = 'normal'; i += 2; continue
            i += 1
        elif state in ('sq', 'dq'):
            if c == '\\':
                i += 2; continue  # Escape überspringen
            if (state == 'sq' and c == "'") or (state == 'dq' and c == '"'):
                state = 'normal'
            i += 1
    if state not in ('normal', 'lc'):
        raise RuntimeError(f'unterminated string/comment (state={state})')
    return ''.join(out)

def companion_span(src):
    m = re.search(r'^    companion: \{', src, re.M)
    if not m:
        raise RuntimeError('companion section missing')
    m2 = re.search(r'^    \},\s*$', src[m.end():], re.M)
    return m.start(), m.end() + (m2.start() if m2 else len(src) - m.end())

def obj_block(src, header_re):
    """Inhalt eines `{...}`-Blocks, dessen Header-Zeile header_re matchet."""
    m = re.search(header_re, src, re.M)
    if not m:
        return None
    depth = 0
    i = src.index('{', m.start())
    start = i
    while i < len(src):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                return src[start:i + 1]
        i += 1
    raise RuntimeError('unbalanced object block')

def js_escape(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')

def check_lang(lang):
    problems = []
    mobile = open(f'{BASE}/{lang}/mobile.ts', encoding='utf-8').read()
    settings = open(f'{BASE}/{lang}/settings.ts', encoding='utf-8').read()
    tutorial = open(f'{BASE}/{lang}/tutorial.ts', encoding='utf-8').read()

    # 1) Brace-Balance + String-Terminierung
    for name, text in (('mobile', mobile), ('settings', settings), ('tutorial', tutorial)):
        try:
            stripped = strip_strings_comments(text)
            o, c = stripped.count('{'), stripped.count('}')
            if o != c:
                problems.append(f'brace-imbalance {name}: {o}{{ vs {c}}}')
        except RuntimeError as e:
            problems.append(f'{name}: {e}')

    # 2+3) Key-Präsenz (exakter Wert) & Eindeutigkeit
    ok = 0
    for key in order:
        dom = key.split('.')[0]
        leafname = key.split('.')[-1]
        expected_line = f"{leafname}: '{js_escape(T[lang][key])}',"
        if dom == 'mobile':
            if key.startswith('mobile.hotkeys.'):
                scope = obj_block(mobile, r'^\s*hotkeys: \{')
            else:
                scope = mobile
        elif dom == 'mobileHelp':
            scope = obj_block(mobile, r'^mobileHelp: \{')
        elif dom == 'mobileViews':
            scope = obj_block(mobile, r'^mobileViews: \{')
        elif dom == 'settings':
            scope = settings
        else:  # tutorial.companion.*
            cs, ce = companion_span(tutorial)
            if key.startswith('tutorial.companion.chapters.'):
                scope = obj_block(tutorial[cs:ce], r'^\s*chapters: \{')
                scope = tutorial[cs:ce][tutorial[cs:ce].index(scope):tutorial[cs:ce].index(scope) + len(scope)]
            else:
                step = key.split('.')[3]
                sb = obj_block(tutorial[cs:ce], rf'^\s*{step}: \{{')
                scope = sb
        if scope is None:
            problems.append(f'{lang}: block fehlt für {key}')
            continue
        cnt = len(re.findall(rf'^\s*{re.escape(expected_line)}\s*$', scope, re.M))
        if cnt != 1:
            problems.append(f'{lang}: {key} exakt={cnt} (erwartet 1)')
        else:
            ok += 1

    # 3b) strukturelle Eindeutigkeit
    if len(re.findall(r'^mobileHelp: \{', mobile, re.M)) != 1:
        problems.append(f'{lang}: mobileHelp-Block != 1x')
    if len(re.findall(r'^\s*hotkeys: \{', mobile, re.M)) != 1:
        problems.append(f'{lang}: hotkeys-Block != 1x')
    for step in ('takeControl', 'controlSync', 'controlHandover', 'soloOverview', 'soloQueue',
                 'soloParty', 'soloStats', 'soloLimits', 'helpButton', 'helpLocal'):
        cs, ce = companion_span(tutorial)
        if len(re.findall(rf'^\s*{step}: \{{', tutorial[cs:ce], re.M)) != 1:
            problems.append(f'{lang}: tutorial-Step {step} != 1x')
    for ch in ('control', 'solo', 'help'):
        cs, ce = companion_span(tutorial)
        if len(re.findall(rf'^\s*{ch}: ', tutorial[cs:ce], re.M)) != 1:
            problems.append(f'{lang}: tutorial-Chapter {ch} != 1x')

    # 4) Platzhalter-Konsistenz vs EN
    ph_bad = []
    for key in order:
        want = sorted(PH.findall(entries[key]['en']))
        got = sorted(PH.findall(T[lang][key]))
        if want != got:
            ph_bad.append(f'{key}: EN{want} vs {lang}{got}')
    if ph_bad:
        problems.append(f'{lang}: placeholder-mismatch: {ph_bad}')

    # 5) still-EN / still-DE
    same_en = [k for k in order if T[lang][k] == entries[k]['en']]
    same_de = [k for k in order if T[lang][k] == entries[k]['de']]
    return ok, problems, same_en, same_de

all_ok = True
for lang in LANGS:
    ok, problems, same_en, same_de = check_lang(lang)
    status = 'OK' if not problems else 'FAIL'
    if problems:
        all_ok = False
    print(f'[{lang}] Keys: {len(order)} | exakt-ok: {ok} | {status}'
          + ('' if not problems else f'  Probleme: {problems[:8]}{"..." if len(problems) > 8 else ""}'))
    if same_en:
        print(f'         still-EN ({len(same_en)}): {same_en}')
    if same_de:
        print(f'         still-DE ({len(same_de)}): {same_de}')

print('VERIFY ' + ('PASS — alle 7 Sprachen × 143 Keys vorhanden, Braces balanciert' if all_ok else 'FAIL'))
sys.exit(0 if all_ok else 1)
