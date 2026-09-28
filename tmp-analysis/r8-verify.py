#!/usr/bin/env python3
"""R8 verification: prove byte-identity of extracted handler bodies.

For every SPEC entry, re-indent the generated function body (+6 spaces)
and diff it against the original case-body lines. Case-adjacent comment
lines must appear byte-identically above the function signature.
"""
import re
import sys

spec_src = open('/home/z/my-project/tmp-analysis/r8-split.py', encoding='utf-8').read()
m = re.search(r"^SPEC = \[.*?^\]$", spec_src, re.M | re.S)
ns = {'R': (lambda *ranges: [tuple(r) for r in ranges])}
exec(m.group(0), ns)
SPEC = ns['SPEC']

ORIG = open('/home/z/my-project/tmp-analysis/r8-post-handlers-ORIG.ts', encoding='utf-8').read().split('\n')


def extract_orig(ranges):
    out = []
    for a, b in ranges:
        out.extend(ORIG[a - 1:b])
    return out


def dedent6(line):
    if line.startswith('      '):
        return line[6:]
    if line.strip() == '':
        return line
    sys.exit(f'BAD ORIG LINE: {line!r}')


ok = 0
with_comments = 0
for mod, case, func, params, ranges in SPEC:
    path = f'/home/z/my-project/src/app/api/mobile/handlers/{mod}.ts'
    lines = open(path, encoding='utf-8').read().split('\n')
    sig = f'export function {func}({params}): Response {{'
    try:
        i = lines.index(sig)
    except ValueError:
        sys.exit(f'{mod}: signature not found: {sig!r}')
    j = i + 1
    while lines[j] != '}':
        j += 1
    body = lines[i + 1:j]

    # split original ranges into comment-header (above `case`) and body
    comment_ranges, body_ranges = [], ranges
    if len(ranges) > 1 and all(
        ORIG[k].strip().startswith('//') for k in range(ranges[0][0] - 1, ranges[0][1])
    ):
        comment_ranges, body_ranges = [ranges[0]], ranges[1:]

    # 1) comment lines above the signature must match the original comment range
    if comment_ranges:
        n_comment = ranges[0][1] - ranges[0][0] + 1
        gen_comment = lines[i - n_comment:i]
        orig_comment = [dedent6(x) for x in extract_orig(comment_ranges)]
        if gen_comment != orig_comment:
            sys.exit(f'COMMENT MISMATCH {mod}/{func}:\n  gen={gen_comment!r}\n  orig={orig_comment!r}')
        with_comments += 1

    # 2) body must match original body ranges (re-indent +6)
    reindented = ['' if ln == '' else '      ' + ln for ln in body]
    original = extract_orig(body_ranges)
    if reindented != original:
        print(f'MISMATCH {mod}/{func} (case {case!r}):')
        for k, (x, y) in enumerate(zip(reindented, original)):
            if x != y:
                print(f'  line {k}: NEW={x!r} ORIG={y!r}')
        if len(reindented) != len(original):
            print(f'  LENGTH: new={len(reindented)} orig={len(original)}')
        sys.exit(1)
    ok += 1
print(f'BYTE-IDENTITY VERIFIED: {ok}/{len(SPEC)} handler bodies match exactly '
      f'({with_comments} carry their original case-comment above the signature)')
