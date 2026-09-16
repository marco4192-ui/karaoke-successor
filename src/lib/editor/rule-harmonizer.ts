/**
 * Rule-based genre harmonization (user feedback round R2-D / point 1.d).
 *
 * Deterministic, AI-FREE background job: maps sub-genres to the canonical
 * genre list via GENRE_ALIASES ("Bubblegum Pop" → "Pop", "Classic Rock" →
 * "Rock", "Synthpop" → "Pop", …). No network, no LLM, no quota.
 *
 * Contract (points 1.a/1.b):
 *  - TXT FIRST: each song's #GENRE is written to the source txt BEFORE the
 *    library store is touched. A failed txt write leaves the song untouched
 *    and counts as an error — no silent library-only updates.
 *  - Background process: the job lives in a module singleton, so it survives
 *    component unmounts. UIs subscribe via subscribe() / useSyncExternalStore.
 *  - Resource-friendly (1.e): strictly sequential, one song at a time, with a
 *    macrotask yield between songs so the UI thread never starves. No retry
 *    storms — a failed song is reported once.
 */

import { Song } from '@/types/game';
import { canonicalizeGenre, isUnmappableGenre, isSeasonalProtectedGenre } from '@/lib/parsers/meta-normalizer';
import { persistSongMetadataToTxt } from '@/lib/editor/persist-metadata';
import { updateSong } from '@/lib/game/song-library';

export interface RuleHarmonizeItem {
  songId: string;
  title: string;
  artist: string;
  currentGenre: string;
  newGenre: string;
}

/** A song whose genre carries no usable genre information ("AI", "Oldies",
 *  "A Cappella", "Female Vocals", "TV"…) — never auto-mapped; the Metadata
 *  Studio shows these in a manual correction list with a genre dropdown. */
export interface ManualGenreReviewItem {
  songId: string;
  title: string;
  artist: string;
  currentGenre: string;
}

export interface RuleHarmonizeJobState {
  status: 'idle' | 'running' | 'done' | 'aborted';
  done: number;
  total: number;
  errors: number;
  startedAt?: number;
  finishedAt?: number;
}

const INITIAL_STATE: RuleHarmonizeJobState = { status: 'idle', done: 0, total: 0, errors: 0 };

/**
 * Compute the harmonization plan (pure, synchronous, no I/O):
 * every song whose genre changes under canonicalizeGenre() — alias mapping,
 * parenthetical stripping, comma-splitting, casing.
 */
export function planRuleHarmonization(songs: Song[]): RuleHarmonizeItem[] {
  const items: RuleHarmonizeItem[] = [];
  for (const s of songs) {
    if (!s.genre) continue;
    // Seasonal easter-egg genres ("Christmas", "Weihnachten"…) are never
    // auto-mapped — the December-only 🎄 filter relies on the genre value.
    if (isSeasonalProtectedGenre(s.genre)) continue;
    const canonical = canonicalizeGenre(s.genre);
    if (canonical && canonical !== s.genre) {
      items.push({
        songId: s.id,
        title: s.title,
        artist: s.artist,
        currentGenre: s.genre,
        newGenre: canonical,
      });
    }
  }
  return items;
}

/**
 * Songs whose genre is a known pseudo-genre ("AI", "Oldies", "A Cappella"…)
 * — impossible to auto-map logically. Surfaced for MANUAL correction in the
 * Metadata Studio (title + artist + current genre + main-genre dropdown).
 * Pure, synchronous, no I/O.
 */
export function planManualGenreReview(songs: Song[]): ManualGenreReviewItem[] {
  const items: ManualGenreReviewItem[] = [];
  for (const s of songs) {
    if (!s.genre) continue;
    // Seasonal easter-egg genres are excluded here too: a manual correction
    // (e.g. "Christmas" → "Pop") would remove the song from the December
    // 🎄 filter and thereby break the easter egg. They are intentional.
    if (isSeasonalProtectedGenre(s.genre)) continue;
    if (isUnmappableGenre(s.genre)) {
      items.push({
        songId: s.id,
        title: s.title,
        artist: s.artist,
        currentGenre: s.genre,
      });
    }
  }
  return items;
}

class RuleHarmonizer {
  private state: RuleHarmonizeJobState = INITIAL_STATE;
  private listeners = new Set<() => void>();
  private abortRequested = false;

  getState(): RuleHarmonizeJobState {
    return this.state;
  }

  isRunning(): boolean {
    return this.state.status === 'running';
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  /** Request an orderly abort — finishes after the current song. */
  abort(): void {
    if (this.state.status === 'running') this.abortRequested = true;
  }

  reset(): void {
    if (this.state.status === 'running') return; // never reset a live job
    this.state = INITIAL_STATE;
    this.emit();
  }

  /**
   * Run the job (background). Returns when done/aborted — callers may also
   * just fire-and-forget and subscribe to state updates instead.
   */
  async start(items: RuleHarmonizeItem[]): Promise<RuleHarmonizeJobState> {
    if (this.state.status === 'running') return this.state; // no double jobs
    this.abortRequested = false;
    this.state = {
      status: 'running',
      done: 0,
      total: items.length,
      errors: 0,
      startedAt: Date.now(),
    };
    this.emit();

    let done = 0;
    let errors = 0;

    for (const item of items) {
      if (this.abortRequested) {
        this.state = { ...this.state, status: 'aborted', done, errors, finishedAt: Date.now() };
        this.emit();
        return this.state;
      }

      try {
        // TXT FIRST — only touch the library when the txt write succeeded
        const updates: Partial<Song> = { genre: item.newGenre };
        const result = await persistSongMetadataToTxt(item.songId, updates);
        if (result.success) {
          updateSong(item.songId, updates);
        } else {
          errors++;
        }
      } catch {
        errors++;
      }

      done++;
      this.state = { ...this.state, done, errors };
      this.emit();

      // Yield to the event loop (macrotask) — keeps the UI responsive even
      // for libraries with thousands of songs
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.state = { ...this.state, status: 'done', done, errors, finishedAt: Date.now() };
    this.emit();
    return this.state;
  }
}

/** Module singleton — the job survives component unmounts. */
export const ruleHarmonizer = new RuleHarmonizer();
