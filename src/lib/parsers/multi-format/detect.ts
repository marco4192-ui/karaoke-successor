/**
 * Multi-Format Import — Format Detection
 *
 * Auto-detects the karaoke format of an imported file by extension and
 * content heuristics (.txt disambiguation: SingStar vs. UltraStar vs.
 * StepMania).
 *
 * Extracted from multi-format-import.ts (R11) — byte-identical blocks,
 * orchestrator re-exports keep the public import path stable.
 */
// ─── Format Detection ────────────────────────────────────────────────

export type DetectedFormat = 'karaoke-mugen' | 'midi' | 'singstar' | 'stepmania' | 'ultrastar' | 'unknown';

/**
 * Auto-detect the karaoke format of a file.
 *
 * Detection strategy for .txt files (ordered by specificity):
 *
 * 1. **SingStar** — Very distinct `KEY=VALUE` format (no `#` prefix) with `NOTE=` lines.
 * 2. **UltraStar** — Multiple heuristic checks:
 *    a. Note lines: `[P1|P2:] <type><space?> <beat> <duration> <pitch> <lyric>`
 *       Supports all 5 note types (: * F R G), compact notation (:0 not just : 0),
 *       and duet prefixes (P1: / P2:).
 *    b. Line-break markers (`- <beat>`) combined with UltraStar headers.
 *    c. End marker `E` combined with UltraStar headers.
 *    d. Header-only files (no notes, just #TITLE / #ARTIST / #BPM / #GAP etc.)
 *    e. Ambiguous `#BPM:` resolved via companion headers (#GAP / #MP3 = UltraStar,
 *       #STEPS / #DIFFICULTY = StepMania).
 * 3. **StepMania** — `#BPMS:` (plural), `#NOTES:` tag, or measure data patterns.
 *    `#BPM:` alone is NOT used for StepMania (ambiguous with UltraStar).
 */
export function detectFileFormat(filename: string, content: string | ArrayBuffer): DetectedFormat {
  const ext = filename.split('.').pop()?.toLowerCase();

  // ── KaraokeMugen (.json) ──────────────────────────────────────────
  if (ext === 'json') {
    try {
      const parsed = JSON.parse(content as string);
      if (parsed.title && parsed.artist && parsed.lyrics) return 'karaoke-mugen';
    } catch { /* not JSON */ }
  }

  // ── KaraokeMugen ASS subtitles (.ass/.ssa) — the lyric track Mugen
  //    ships alongside its media files ───────────────────────────────
  if ((ext === 'ass' || ext === 'ssa') && typeof content === 'string' && /\[Events\]/i.test(content)) {
    return 'karaoke-mugen';
  }

  // ── MIDI (.kar / .mid) ───────────────────────────────────────────
  if (ext === 'kar' || ext === 'mid') return 'midi';

  // ── StepMania by extension ───────────────────────────────────────
  if (ext === 'sm' || ext === 'ssc') return 'stepmania';

  // ── .txt heuristics ──────────────────────────────────────────────
  if (ext === 'txt' && typeof content === 'string') {

    // 1. SingStar — uses KEY=VALUE (no #) and NOTE= lines
    if (/\b(TITLE|ARTIST)=/i.test(content) && content.includes('NOTE=')) {
      return 'singstar';
    }

    // 2a. UltraStar — note lines (all types, compact + standard, duet prefixes)
    //     Pattern: [P1|P2:] <noteType> [space?] <beat> <duration> <pitch>
    //     Handles: :0, : 0, *4, F 12, R 0, G 0, P1: : 0, P2: * 4, etc.
    if (/^(?:P[12]:\s*)?[:*FGR]\s*-?\d+\s+\d+\s+-?\d+/m.test(content)) {
      return 'ultrastar';
    }

    // 2b. UltraStar — line-break markers combined with any UltraStar header
    if (/^-\s*-?\d+/m.test(content) &&
        /#(BPM|GAP|MP3|COVER|BACKGROUND|EDITION|GENRE|LANGUAGE|CREATOR|VERSION):/i.test(content)) {
      return 'ultrastar';
    }

    // 2c. UltraStar — end marker E combined with #TITLE / #ARTIST / #BPM / #GAP
    if (/^E\s*$/m.test(content) &&
        /#(TITLE|ARTIST|BPM|GAP):/i.test(content) &&
        !content.includes('#NOTES:')) {
      return 'ultrastar';
    }

    // 2d. UltraStar — header-only (no notes, but multiple UltraStar-specific headers)
    if (/#(TITLE|ARTIST):\s*\S/im.test(content) &&
        /#(BPM|GAP|MP3):\s*\S/im.test(content) &&
        !content.includes('#BPMS:') && !content.includes('#NOTES:')) {
      return 'ultrastar';
    }

    // 3. StepMania — patterns that DON'T overlap with UltraStar
    //    #BPMS: (plural, values like 0=120.000) is StepMania-specific
    //    #NOTES: tag and measure data (4-digit measure number + note rows) are unique
    if (content.includes('#BPMS:') ||
        content.includes('#NOTES:') ||
        /\d{4}[\n\r]*\n[1234]+/m.test(content)) {
      return 'stepmania';
    }

    // 4. Ambiguous #BPM: — disambiguate via companion headers
    //    #BPM: alone could be UltraStar OR StepMania single-BPM
    if (content.includes('#BPM:') && !content.includes('#BPMS:')) {
      // UltraStar typically has #GAP: and/or #MP3: alongside #BPM:
      if (content.includes('#GAP:') || content.includes('#MP3:')) {
        return 'ultrastar';
      }
      // StepMania typically has #STEPS: or #DIFFICULTY:
      if (content.includes('#STEPS:') || content.includes('#DIFFICULTY:')) {
        return 'stepmania';
      }
      // If we have #TITLE: or #ARTIST: but no other distinguishing markers,
      // default to UltraStar (vastly more common in .txt files)
      if (content.includes('#TITLE:') || content.includes('#ARTIST:')) {
        return 'ultrastar';
      }
    }
  }

  return 'unknown';
}
