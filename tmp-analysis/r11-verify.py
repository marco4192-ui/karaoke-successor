#!/usr/bin/env python3
"""R11 byte-identity verifier.

Compares the moved blocks in src/lib/parsers/multi-format/*.ts against the
ORIGINAL multi-format-import.ts (git HEAD). Allowed deltas (documented,
type-level only):
  - module doc headers + import block prepended by the split (stripped here)
  - `export ` keyword added to the 3 previously module-private interfaces
    (KaraokeMugenSong, SingStarSongData, StepManiaData) — required so
    convert.ts can name the parameter types
Everything else must match byte-for-byte.
"""
import subprocess
import sys

ORIG = "src/lib/parsers/multi-format-import.ts"

# module -> orig_block_range (1-based, inclusive); the module doc/import
# header is located dynamically by finding the block's first line (the
# `// ─── …` section banner) inside the new module.
MODULES = {
    "detect": (17, 126),
    "karaoke-mugen": (128, 333),
    "midi": (335, 863),
    "singstar": (865, 902),
    "stepmania": (904, 946),
    "convert": (948, 1221),
}

EXPECTED_EXPORT_PREFIX = {
    "karaoke-mugen": ["interface KaraokeMugenSong {"],
    "singstar": ["interface SingStarSongData {"],
    "stepmania": ["interface StepManiaData {"],
}

orig = subprocess.run(
    ["git", "show", f"HEAD:{ORIG}"], capture_output=True, text=True, check=True
).stdout.split("\n")

failures = 0
for name, (start, end) in MODULES.items():
    with open(f"src/lib/parsers/multi-format/{name}.ts", encoding="utf-8") as f:
        mod = f.read().split("\n")
    block = orig[start - 1 : end]  # 1-based inclusive → python slice
    # locate the original block's first line (section banner) inside the module
    banner = block[0]
    strip = next((i for i, line in enumerate(mod) if line == banner), None)
    if strip is None:
        print(f"[FAIL] {name}: banner {banner!r} not found in module")
        failures += 1
        continue
    body = mod[strip:]
    print(f"[info] {name}: module header = {strip} lines, body starts at module line {strip + 1}")
    # trim trailing empties from both sides (files end with newline → last '')
    while block and block[-1] == "":
        block.pop()
    while body and body[-1] == "":
        body.pop()

    if len(block) != len(body):
        print(f"[FAIL] {name}: line count {len(body)} != original block {len(block)}")
        failures += 1
        continue

    diffs = 0
    for i, (o, n) in enumerate(zip(block, body)):
        if o == n:
            continue
        allowed = any(
            o == pat and n == "export " + pat
            for pat in EXPECTED_EXPORT_PREFIX.get(name, [])
        )
        if allowed:
            print(f"[ok]   {name}:{start + i}: added `export` keyword (documented delta): {n.strip()}")
            continue
        print(f"[FAIL] {name}:{start + i}:\n  orig: {o!r}\n  new : {n!r}")
        diffs += 1
    if diffs == 0:
        print(f"[OK]   {name}: {len(block)} lines byte-identical (incl. section banners/comments)")
    failures += diffs

print()
if failures == 0:
    print(f"ALL {len(MODULES)} MODULES VERIFIED: byte-identical (only documented deltas).")
    sys.exit(0)
print(f"{failures} MISMATCH(ES) — NOT byte-identical.")
sys.exit(1)
