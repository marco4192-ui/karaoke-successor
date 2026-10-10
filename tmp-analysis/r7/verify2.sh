#!/bin/bash
ORIG=medley-game-hook.orig.ts
H=../../src/components/game/medley/medley-game-hook.ts
T=../../src/components/game/medley/hooks/medley-hook-types.ts
S=../../src/components/game/medley/hooks/use-medley-scoring.ts
fail=0

# types module: orig has no `export ` prefix — strip it from new for compare
awk 'index($0,"export interface MedleyGameScreenProps {"){p=1} p{sub(/^export /,""); print} index($0,"  onPrepareNextRoundSongs?: () => Promise<MedleySong\[\] | null>;")&&p{exit}' "$T" > /tmp/new_b.txt
awk 'index($0,"export interface MedleyGameScreenProps {"){p=1} p{sub(/^export /,""); print} index($0,"  onPrepareNextRoundSongs?: () => Promise<MedleySong\[\] | null>;")&&p{exit}' "$ORIG" > /tmp/orig_b.txt
diff /tmp/orig_b.txt /tmp/new_b.txt > /dev/null && echo "OK  : MedleyGameScreenProps" || { echo "DIFF: MedleyGameScreenProps"; diff /tmp/orig_b.txt /tmp/new_b.txt | head; fail=1; }

awk 'index($0,"type MedleyNotePerfSample"){p=1} p{sub(/^export /,""); print} index($0,"playerColor?: string };")&&p{exit}' "$T" > /tmp/new_b.txt
awk 'index($0,"type MedleyNotePerfSample"){p=1} p{sub(/^export /,""); print} index($0,"playerColor?: string };")&&p{exit}' "$ORIG" > /tmp/orig_b.txt
diff /tmp/orig_b.txt /tmp/new_b.txt > /dev/null && echo "OK  : MedleyNotePerfSample" || { echo "DIFF: MedleyNotePerfSample"; diff /tmp/orig_b.txt /tmp/new_b.txt | head; fail=1; }

awk 'index($0,"interface MedleyGameState {"){p=1} p{sub(/^export /,""); print} index($0,"  forceRender: () => void;")&&p{exit}' "$T" > /tmp/new_b.txt
awk 'index($0,"interface MedleyGameState {"){p=1} p{sub(/^export /,""); print} index($0,"  forceRender: () => void;")&&p{exit}' "$ORIG" > /tmp/orig_b.txt
diff /tmp/orig_b.txt /tmp/new_b.txt > /dev/null && echo "OK  : MedleyGameState" || { echo "DIFF: MedleyGameState"; diff /tmp/orig_b.txt /tmp/new_b.txt | head; fail=1; }

# visualKind closing line check
grep -c "^  };" "$S" | xargs echo "scoring 2-space closers:"
# E5 effect — expected delta: only the 2 added comment lines
awk 'index($0,"  // ── New round'"'"'s songs arrival (Fix 7) ──"){p=1} p{print} index($0,"  }, [medleySongs]);")&&p{exit}' "$ORIG" > /tmp/orig_b.txt
awk 'index($0,"  // ── New round'"'"'s songs arrival (Fix 7) ──"){p=1} p{print} index($0,"  }, [medleySongs]);")&&p{exit}' "$H" > /tmp/new_b.txt
d=$(diff /tmp/orig_b.txt /tmp/new_b.txt)
if [ -z "$d" ]; then echo "OK  : E5 new-round-songs-effect"; else
  added=$(echo "$d" | grep -c '^>')
  removed=$(echo "$d" | grep -c '^<')
  echo "E5 delta: +$added -$removed lines (expect +2 -0, comment-only):"
  echo "$d"
  [ "$added" = "2" ] && [ "$removed" = "0" ] || fail=1
fi

# re-check the two fixed blocks
awk 'index($0,"  // ── Visual sample vibrato filter (per player) ──"){p=1} p{print} index($0,"  return '"'"'normal'"'"';")&&p{exit}' "$ORIG" > /tmp/orig_b.txt
awk 'index($0,"  // ── Visual sample vibrato filter (per player) ──"){p=1} p{print} index($0,"  return '"'"'normal'"'"';")&&p{exit}' "$S" > /tmp/new_b.txt
diff /tmp/orig_b.txt /tmp/new_b.txt > /dev/null && echo "OK  : visual-section" || { echo "DIFF: visual-section"; diff /tmp/orig_b.txt /tmp/new_b.txt | head; fail=1; }

awk 'index($0,"  // ── Get current lyric line ──"){p=1} p{print} index($0,"  }, [currentTimeMs, audio.snippetLyrics, currentSnippet, audio.effectiveStartMs]);")&&p{exit}' "$ORIG" > /tmp/orig_b.txt
awk 'index($0,"  // ── Get current lyric line ──"){p=1} p{print} index($0,"  }, [currentTimeMs, audio.snippetLyrics, currentSnippet, audio.effectiveStartMs]);")&&p{exit}' "$H" > /tmp/new_b.txt
diff /tmp/orig_b.txt /tmp/new_b.txt > /dev/null && echo "OK  : currentLyricLine" || { echo "DIFF: currentLyricLine"; diff /tmp/orig_b.txt /tmp/new_b.txt | head; fail=1; }

# visualKind complete (incl. closer)
awk 'index($0,"  /** Note kind for visual tick evaluation"){p=1} p{print} index($0,"  };")&&p{exit}' "$ORIG" > /tmp/orig_b.txt
awk 'index($0,"  /** Note kind for visual tick evaluation"){p=1} p{print} index($0,"  };")&&p{exit}' "$S" > /tmp/new_b.txt
diff /tmp/orig_b.txt /tmp/new_b.txt > /dev/null && echo "OK  : visualKind" || { echo "DIFF: visualKind"; diff /tmp/orig_b.txt /tmp/new_b.txt | head; fail=1; }

exit $fail
