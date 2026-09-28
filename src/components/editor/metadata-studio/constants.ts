/**
 * Constants for the Metadata Studio.
 *
 * Split out of metadata-studio.tsx (R3 refactor). The orchestrator
 * re-exports STUDIO_RECOMMENDED_BATCH so the old import path keeps working.
 */

/**
 * Recommended batch size for the AI pipeline (user request: real measured
 * value, not a good-will number).
 *
 * Measured in THIS sandbox (full 12-song chunks):
 *  - factual lookup (MusicBrainz ~1 req/s + Deezer): ~65 s per 12 songs ≈ 5.4 s/song
 *  - LLM analysis:                                  ~8.5 s per 12 songs ≈ 0.7 s/song
 *  - txt apply:                                     ~0.1 s/song
 * ⇒ worst case ≈ 6 s per song (fill-missing with empty genre/year/language).
 * 20 songs ≈ 2 min worst case — the accepted waiting-time ceiling.
 */
export const STUDIO_RECOMMENDED_BATCH = 20;

/** Worst-case seconds per song for the estimated-time display. */
export const SECONDS_PER_SONG_WORST_CASE = 6;
