#!/usr/bin/env python3
"""R27-b verification: every non-blank ORIG line (whitespace-stripped) must
appear in the new module set. Facade header comment lines and pure glue
(import/export lines of the facade) are acceptable unmapped.

Documented acceptable deltas (expected unmapped ORIG lines):
  - L51   'interface MicrophoneStatus {'          -> 'export interface ...' (export keyword added)
  - L117  'class MicrophoneInstance {'            -> 'export class ...'     (export keyword added)
  - L351  'private savedMicConfigs: Array<{...}>' -> 'StoredMicConfig[]'    (type-level only)
  - L857  'assignedMics: Array.from(this.assignedMics.values()).map(m => ({' -> 'mics.map' (param)
  - L927  'this.savedMicConfigs = config.assignedMics;' -> 'return config.assignedMics;'
"""
ORIG = 'tmp-analysis/r27b/microphone-manager-ORIG.ts'
NEW_FILES = [
    'src/lib/audio/microphone-manager.ts',
    'src/lib/audio/microphone/types.ts',
    'src/lib/audio/microphone/microphone-instance.ts',
    'src/lib/audio/microphone/mic-config-storage.ts',
    'src/lib/audio/microphone/multi-microphone-manager.ts',
    'src/lib/audio/microphone/singleton.ts',
]

with open(ORIG, encoding='utf-8') as f:
    orig_lines = f.read().split('\n')

new_stripped = set()
for p in NEW_FILES:
    with open(p, encoding='utf-8') as f:
        for l in f.read().split('\n'):
            s = l.strip()
            if s:
                new_stripped.add(s)

total = mapped = 0
unmapped = []
for i, l in enumerate(orig_lines, start=1):
    s = l.strip()
    if not s:
        continue
    total += 1
    if s in new_stripped:
        mapped += 1
    else:
        unmapped.append((i, s))

print(f'Coverage: {mapped}/{total} non-blank ORIG lines mapped '
      f'({mapped / total * 100:.2f}%)')
print(f'Unmapped ({len(unmapped)}):')
for i, s in unmapped:
    print(f'  L{i}: {s}')
