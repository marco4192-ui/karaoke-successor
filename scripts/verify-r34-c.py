#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Task r34-c — Verification of the Pass-the-Mic (PTM) tutorial corrections.

Checks for all 16 locale tutorial.ts files:
  (a) file "parses": comments + string literals stripped -> balanced {} [] ()
  (b) the old false statements are gone (no "mixed between phone and physical
      mic" claim, no "works for all modes", no PTM-as-singing-mode in the
      singAlong.body / soloOverview.details step texts)
  (c) the corrected statements are present (PTM = one shared desktop mic,
      phones are remote control + live mirror only, "almost all modes")
  (d) all 5 touched keys still exist (singAlong.body, singAlong.details,
      soloOverview.details, soloParty.body, roles.details)

Also validates src/lib/i18n/pending-keys/r33-e.json (updated EN/DE source
strings for soloOverview.details + soloParty.body).

Exit code 0 = all good, 1 = at least one failure.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCALES_DIR = os.path.join(ROOT, "src", "lib", "i18n", "locales")
LOCALES = ["en", "de", "es", "fr", "it", "pt", "nl", "pl",
           "sv", "no", "da", "fi", "ja", "ko", "zh", "ru"]

# Per-language markers ------------------------------------------------------
# ptm            : how "Pass-the-Mic" is called in this locale's tutorial
# singalong      : how "Companion Singalong" is called
# old_mixed      : substring of the OLD wrong "mix phone + physical mic" claim
# never_mic      : new "never as the microphone" wording (singAlong.details)
# ctrl_word      : word for remote control (singAlong.details)
# solo_ctrl      : new "phones just control" wording (soloParty.body)
# almost_all     : new "works for almost all modes" wording (roles.details)
# old_all        : OLD "works for all modes" wording (roles.details) - regex
DATA = {
    "en": dict(ptm="Pass-the-Mic", singalong="Companion Singalong",
               old_mixed="even mixed between",
               never_mic="never as the microphone", ctrl_word="remote control",
               solo_ctrl="phones just control",
               almost_all="almost all modes",
               old_all=r"Works for all modes"),
    "de": dict(ptm="Pass-the-Mic", singalong="Companion-Singalong",
               old_mixed="auch zwischen Handy und physischem Mikro",
               never_mic="nicht als Mikrofon", ctrl_word="Steuerung",
               solo_ctrl="Handys steuern lediglich",
               almost_all="fast alle Modi",
               old_all=r"Funktioniert für alle Modi"),
    "es": dict(ptm="Pasa el Micrófono", singalong="Companion Sing-A-Long",
               old_mixed="incluso mezclando teléfono y micro físico",
               never_mic="nunca de micrófono", ctrl_word="mando",
               solo_ctrl="los teléfonos únicamente controlan",
               almost_all="casi todos los modos",
               old_all=r"Funciona en todos los modos"),
    "fr": dict(ptm="Passe le Micro", singalong="Companion Sing-A-Long",
               old_mixed="même en mélangeant téléphone et micro physique",
               never_mic="jamais de micro", ctrl_word="télécommande",
               solo_ctrl="les téléphones ne font que piloter",
               almost_all="presque tous les modes",
               old_all=r"Fonctionne pour tous les modes"),
    "it": dict(ptm="Passa il Microfono", singalong="Companion Sing-A-Long",
               old_mixed="perfino in mix tra telefono e microfono fisico",
               never_mic="mai da microfono", ctrl_word="telecomando",
               solo_ctrl="i telefoni si limitano a controllare",
               almost_all="quasi tutte le modalità",
               old_all=r"Funziona in tutte le modalità"),
    "pt": dict(ptm="Passe o Microfone", singalong="Companion Sing-A-Long",
               old_mixed="até misturando celular e microfone físico",
               never_mic="nunca de microfone", ctrl_word="controle remoto",
               solo_ctrl="os celulares apenas controlam",
               almost_all="quase todos os modos",
               old_all=r"Funciona em todos os modos"),
    "nl": dict(ptm="Geef de Mic", singalong="Companion Sing-A-LONG",
               old_mixed="zelfs afgewisseld tussen telefoon en fysieke microfoon",
               never_mic="nooit als microfoon", ctrl_word="besturing",
               solo_ctrl="telefoons sturen alleen",
               almost_all="bijna alle modi",
               old_all=r"Werkt voor alle modi"),
    "pl": dict(ptm="Przekaż mikrofon", singalong="Śpiew z Companionem",
               old_mixed="nawet na zmianę telefon i fizyczny mikrofon",
               never_mic="nigdy jako mikrofon", ctrl_word="sterowanie",
               solo_ctrl="służą wyłącznie do sterowania",
               almost_all="prawie wszystkich trybach",
               old_all=r"Działa we wszystkich trybach"),
    "sv": dict(ptm="Ge över Micen", singalong="Companion Singalong",
               old_mixed="till och med blandat mellan telefon och fysisk mikrofon",
               never_mic="aldrig som mikrofon", ctrl_word="fjärrkontroll",
               solo_ctrl="telefonerna styr bara",
               almost_all="nästan alla lägen",
               old_all=r"Fungerar i alla lägen"),
    "no": dict(ptm="Gi mikrofonen", singalong="Companion Singalong",
               old_mixed="til og med blandet mellom telefon og fysisk mikrofon",
               never_mic="aldri som mikrofon", ctrl_word="fjernkontroll",
               solo_ctrl="telefonene styrer bare",
               almost_all="nesten alle moduser",
               old_all=r"Fungerer i alle moduser"),
    "da": dict(ptm="Pass the Mic", singalong="Companion Sing-A-Long",
               old_mixed="endda blandet mellem telefon og fysisk mikrofon",
               never_mic="aldrig som mikrofon", ctrl_word="fjernbetjening",
               solo_ctrl="telefonerne styrer kun",
               almost_all="næsten alle tilstande",
               old_all=r"Virker i alle tilstande"),
    "fi": dict(ptm="Mikrofonin vaihto", singalong="Companion-mukalaulu",
               old_mixed="jopa sekaisin puhelimen ja fyysisen mikrofonin kesken",
               never_mic="eivät koskaan mikrofonina", ctrl_word="kaukosäätimenä",
               solo_ctrl="puhelimet vain ohjaavat",
               almost_all="lähes kaikissa tiloissa",
               old_all=r"Toimii kaikissa tiloissa"),
    "ja": dict(ptm="マイクパス", singalong="コンパニオン・シング・アロング",
               old_mixed="スマホと物理マイクの混在も可能",
               never_mic="マイクとしては使えません", ctrl_word="リモコン",
               solo_ctrl="スマホは操作専用です",
               almost_all="ほぼ全モード対応",
               old_all=r"(?<!ほぼ)全モード対応"),
    "ko": dict(ptm="마이크 넘기기", singalong="컴패니언 싱얼롱",
               old_mixed="휴대폰과 실물 마이크를 섞어도 돼요",
               never_mic="마이크로는 절대 쓰이지 않아요", ctrl_word="리모컨",
               solo_ctrl="휴대폰은 조작용으로만 쓰여요",
               almost_all="거의 모든 모드 지원",
               old_all=r"(?<!거의 )모든 모드 지원"),
    "zh": dict(ptm="传麦克风", singalong="手机伴唱",
               old_mixed="甚至可以在手机和实体麦克风之间混合",
               never_mic="绝不用作麦克风", ctrl_word="遥控",
               solo_ctrl="手机只负责控制",
               almost_all="几乎所有模式",
               old_all=r"适用于所有模式"),
    "ru": dict(ptm="Передай микрофон", singalong="Компаньон: спой вместе",
               old_mixed="можно даже смешивать телефон и обычный микрофон",
               never_mic="но никак не микрофоном", ctrl_word="пульт",
               solo_ctrl="телефоны лишь управляют",
               almost_all="почти во всех режимах",
               old_all=r"Работает во всех режимах"),
}

# Fix nl singalong (plain, no typo)
DATA["nl"]["singalong"] = "Companion Sing-A-Long"

KEYS = ["singAlong.body", "singAlong.details",
        "soloOverview.details", "soloParty.body", "roles.details"]

# Inflection-tolerant stems for languages with case endings (FI, PL);
# every other locale uses the exact names from DATA.
PTM_FLEX = {"fi": "Mikrofonin vaih"}
SINGALONG_FLEX = {"pl": "z Companionem"}

# Words meaning "phone" in any of the 16 locales (stems, case-tolerant)
PHONE_WORDS = ["phone", "Handy", "telé", "téléphone", "telefon", "telefoo",
               "telefone", "celular", "телефон", "手机", "スマホ", "휴대폰", "puhelim"]


def strip_strings_and_comments(src):
    """Remove comments and string literals (keeps code skeleton)."""
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if c == "/" and nxt == "/":                      # line comment
            j = src.find("\n", i)
            i = n if j == -1 else j
        elif c == "/" and nxt == "*":                    # block comment
            j = src.find("*/", i + 2)
            i = n if j == -1 else j + 2
        elif c in ("'", '"', "`"):                       # string literal
            quote = c
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == quote:
                    i += 1
                    break
                i += 1
            out.append('0')
        else:
            out.append(c)
            i += 1
    return "".join(out)


def check_balanced(code):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in code:
        if ch in "([{":
            stack.append(ch)
        elif ch in ")]}":
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return not stack


def get_step_value(text, step, leaf):
    """Extract the raw single-quoted value of `<step>.<leaf>` (with escapes)."""
    m = re.search(r"\b" + step + r":\s*\{(.*?)\n        \}", text, re.S)
    if not m:
        return None
    block = m.group(1)
    m2 = re.search(r"\b" + leaf + r":\s*'((?:\\.|[^\\'])*)'", block)
    if not m2:
        return None
    return m2.group(1)


def verify_locale(loc):
    errors = []
    info = []
    path = os.path.join(LOCALES_DIR, loc, "tutorial.ts")
    with open(path, encoding="utf-8") as f:
        src = f.read()
    d = DATA[loc]
    ptm_flex = PTM_FLEX.get(loc, d["ptm"])
    sing_flex = SINGALONG_FLEX.get(loc, d["singalong"])

    # (a) parse / brace balance
    code = strip_strings_and_comments(src)
    if not check_balanced(code):
        errors.append("(a) unbalanced braces/parens/brackets after stripping")
    if "'" in code or '"' in code:
        # stray quotes in code skeleton (string stripper left artifacts)
        errors.append("(a) stray quote characters in stripped code")
    if re.search(r"\bimport\b", code) is None and "export const" not in code:
        errors.append("(a) export statement missing")

    # (b) old false claims gone (whole file)
    if d["old_mixed"] in src:
        errors.append("(b) old 'mixed between phone and physical mic' claim still present")
    if re.search(d["old_all"], src):
        errors.append("(b) old 'works for all modes' claim still present")

    # (c)+(d) extract the 5 values and check the corrected statements
    vals = {}
    for key in KEYS:
        step, leaf = key.split(".")
        v = get_step_value(src, step, leaf)
        if v is None:
            errors.append("(d) key %s missing" % key)
            continue
        vals[key] = v

    if "singAlong.body" in vals:
        v = vals["singAlong.body"]
        if ptm_flex in v:
            errors.append("(b) singAlong.body still names PTM as a sing mode")
        if sing_flex not in v:
            errors.append("(c) singAlong.body does not mention %s" % d["singalong"])
        if not any(w in v for w in PHONE_WORDS):
            errors.append("(c) singAlong.body lost the 'sing via phone' statement")

    if "singAlong.details" in vals:
        v = vals["singAlong.details"]
        if ptm_flex not in v:
            errors.append("(c) singAlong.details no longer explains PTM")
        if d["never_mic"] not in v:
            errors.append("(c) singAlong.details missing 'never as the microphone'")
        if d["ctrl_word"] not in v:
            errors.append("(c) singAlong.details missing control/mirror wording")
        if sing_flex not in v:
            errors.append("(c) singAlong.details missing singalong part")
        if d["old_mixed"] in v:
            errors.append("(b) singAlong.details still has the mixed-mic claim")

    if "soloOverview.details" in vals:
        v = vals["soloOverview.details"]
        if ptm_flex in v:
            errors.append("(b) soloOverview.details still names PTM as a sing mode")
        if "🎤" not in v or sing_flex not in v:
            errors.append("(c) soloOverview.details sing bullet broken")
        if "\\n" in v and v.count("•") < 4:
            errors.append("(c) soloOverview.details lost bullets")

    if "soloParty.body" in vals:
        v = vals["soloParty.body"]
        if ptm_flex not in v:
            errors.append("(c) soloParty.body missing the PTM caveat")
        if d["solo_ctrl"] not in v:
            errors.append("(c) soloParty.body missing 'phones just control'")
        if sing_flex not in v:
            errors.append("(c) soloParty.body missing singalong singing part")

    if "roles.details" in vals:
        v = vals["roles.details"]
        if ptm_flex not in v:
            errors.append("(c) roles.details missing PTM exception")
        if d["almost_all"] not in v:
            errors.append("(c) roles.details missing 'almost all modes'")
        if re.search(d["old_all"], v):
            errors.append("(b) roles.details still claims 'all modes'")
        if "duel" not in v.lower() and "Duell" not in v and "duelo" not in v \
           and "duel" not in v and "дуэл" not in v and "デュエル" not in v \
           and "듀얼" not in v and "对决" not in v and "kaksinkamppailu" not in v:
            errors.append("(c) roles.details lost the duel/two-phones note")

    return errors, vals


def verify_pending_keys():
    errors = []
    path = os.path.join(ROOT, "src", "lib", "i18n", "pending-keys", "r33-e.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    entries = {e["key"]: e for e in data}

    so = entries.get("tutorial.companion.steps.soloOverview.details")
    if not so:
        errors.append("pending-keys: soloOverview.details entry missing")
    else:
        if "Pass-the-Mic" in so["en"]:
            errors.append("pending-keys: EN soloOverview.details still names PTM")
        if "e.g. Companion Singalong" not in so["en"]:
            errors.append("pending-keys: EN soloOverview.details not corrected")
        if "Pass-the-Mic" in so["de"]:
            errors.append("pending-keys: DE soloOverview.details still names PTM")
        if "z. B. Companion-Singalong" not in so["de"]:
            errors.append("pending-keys: DE soloOverview.details not corrected")

    sp = entries.get("tutorial.companion.steps.soloParty.body")
    if not sp:
        errors.append("pending-keys: soloParty.body entry missing")
    else:
        if "and Pass-the-Mic guests sing" in sp["en"]:
            errors.append("pending-keys: EN soloParty.body still has old claim")
        if "phones just control" not in sp["en"]:
            errors.append("pending-keys: EN soloParty.body not corrected")
        if "und Pass-the-Mic singen" in sp["de"]:
            errors.append("pending-keys: DE soloParty.body still has old claim")
        if "Handys steuern lediglich" not in sp["de"]:
            errors.append("pending-keys: DE soloParty.body not corrected")
    return errors


def main():
    total_fail = 0
    print("=" * 72)
    print("r34-c verification: Pass-the-Mic tutorial corrections")
    print("=" * 72)
    for loc in LOCALES:
        errors, vals = verify_locale(loc)
        status = "OK" if not errors else "FAIL"
        print("\n[%s] %s" % (loc.upper(), status))
        for k in KEYS:
            if k in vals:
                preview = vals[k][:70].replace("\\n", " | ")
                print("   %-22s %s…" % (k, preview))
        for e in errors:
            print("   !! " + e)
        if errors:
            total_fail += 1

    print("\n" + "=" * 72)
    pk_errors = verify_pending_keys()
    if pk_errors:
        total_fail += 1
        print("[pending-keys r33-e.json] FAIL")
        for e in pk_errors:
            print("   !! " + e)
    else:
        print("[pending-keys r33-e.json] OK (soloOverview.details + soloParty.body corrected, valid JSON)")

    print("=" * 72)
    if total_fail:
        print("RESULT: %d locale(s)/files FAILED" % total_fail)
        sys.exit(1)
    print("RESULT: ALL 16 locales + pending-keys OK")


if __name__ == "__main__":
    main()
