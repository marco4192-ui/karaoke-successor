import { useState, useCallback, useEffect, useRef } from 'react';
import type { MedleyPlayer, MedleySong, MedleyGamePhase, MedleySettings, MedleyHighlight, SnippetMatchup, VoiceModifier } from '../medley-types';
import type { Difficulty } from '@/types/game';
import { getDynamicDifficulty, pickRandomModifier } from '../medley-scoring';
import { buildSnippetHighlight as buildHighlightPure } from '../medley-highlights';

// ===================== PARAMS =====================

export interface UseMedleyFeaturesParams {
  phase: MedleyGamePhase;
  currentSnippetIdx: number;
  totalSnippets: number;
  settings: MedleySettings;
  medleySongs: MedleySong[];
  playersRef: React.MutableRefObject<MedleyPlayer[]>;
  isEliminationMode: boolean;
  isTeam: boolean;
  matchups: SnippetMatchup[];
  /** Called when dynamic difficulty changes, to update the pitch detector */
  setDifficultyOnDetector: (diff: Difficulty) => void;
}

// ===================== RETURN =====================

export interface UseMedleyFeaturesReturn {
  // Feature #9: Dynamic difficulty
  currentDynamicDifficulty: Difficulty | null;

  // Feature #15: Voice modifier
  activeModifier: VoiceModifier;
  modifierJustRevealed: boolean;

  // Feature #16: Mystery mode
  mysteryReveal: boolean;
  mysteryRevealSong: MedleySong | null;
  setMysteryReveal: (v: boolean) => void;
  setMysteryRevealSong: (v: MedleySong | null) => void;

  // Feature #17: Highlights
  highlights: MedleyHighlight[];
  buildSnippetHighlight: (snippetIdx: number) => void;
  highlightsRef: React.MutableRefObject<MedleyHighlight[]>;
  snippetScoreSnapshotsRef: React.MutableRefObject<Record<string, { score: number; combo: number }>>;
}

// ===================== HOOK =====================

/**
 * Feature #9 / #15 / #16 / #17: Per-snippet features.
 *
 * - Dynamic difficulty ramp
 * - Voice modifiers
 * - Mystery mode reveal
 * - Per-snippet highlights
 */
export function useMedleyFeatures({
  phase,
  currentSnippetIdx,
  totalSnippets,
  settings,
  medleySongs,
  playersRef,
  isEliminationMode,
  isTeam,
  matchups,
  setDifficultyOnDetector,
}: UseMedleyFeaturesParams): UseMedleyFeaturesReturn {
  // ── Feature #9: Dynamic difficulty ──
  const [currentDynamicDifficulty, setCurrentDynamicDifficulty] = useState<Difficulty | null>(null);

  // ── Feature #15: Voice modifier ──
  const [activeModifier, setActiveModifier] = useState<VoiceModifier>('none');
  const [modifierJustRevealed, setModifierJustRevealed] = useState(false);

  // ── Feature #16: Mystery mode ──
  const [mysteryReveal, setMysteryReveal] = useState(false);
  const [mysteryRevealSong, setMysteryRevealSong] = useState<MedleySong | null>(null);

  // ── Feature #17: Highlights ──
  const highlightsRef = useRef<MedleyHighlight[]>([]);
  const [highlights, setHighlights] = useState<MedleyHighlight[]>([]);
  // Track per-snippet scores for highlights
  const snippetScoreSnapshotsRef = useRef<Record<string, { score: number; combo: number }>>({});

  // ── Feature #9: Apply dynamic difficulty when snippet changes ──
  useEffect(() => {
    if (settings.dynamicDifficulty && phase === 'playing') {
      const diff = getDynamicDifficulty(currentSnippetIdx, totalSnippets);
      setCurrentDynamicDifficulty(diff);
      setDifficultyOnDetector(diff);
    } else if (!settings.dynamicDifficulty) {
      setCurrentDynamicDifficulty(null);
    }
  }, [currentSnippetIdx, settings.dynamicDifficulty, totalSnippets, phase, setDifficultyOnDetector]);

  // ── Feature #15: Pick modifier when snippet changes ──
  useEffect(() => {
    if (phase === 'playing' && settings.modifiersEnabled) {
      const mod = pickRandomModifier();
      setActiveModifier(mod);
      setModifierJustRevealed(true);
      // Hide modifier reveal after 2 seconds
      const timer = setTimeout(() => setModifierJustRevealed(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setActiveModifier('none');
      setModifierJustRevealed(false);
    }
  }, [currentSnippetIdx, phase, settings.modifiersEnabled]);

  // ── Feature #16: Reset mystery reveal when snippet changes ──
  useEffect(() => {
    setMysteryReveal(false);
    setMysteryRevealSong(null);
  }, [currentSnippetIdx]);

  // ── Snapshot scores at snippet start for highlights ──
  useEffect(() => {
    if (phase === 'playing') {
      const snapshot: Record<string, { score: number; combo: number }> = {};
      for (const p of playersRef.current) {
        snapshot[p.id] = { score: p.score, combo: p.combo };
      }
      snippetScoreSnapshotsRef.current = snapshot;
    }
  }, [currentSnippetIdx, phase, playersRef]);

  // ── Feature #17: Build highlight for a snippet that just ended (delegates to pure function) ──
  const buildSnippetHighlight = useCallback((snippetIdx: number) => {
    const song = medleySongs[snippetIdx];
    if (!song) return;

    const highlight = buildHighlightPure({
      snippetIdx,
      song,
      players: playersRef.current,
      isEliminationMode,
      isTeam,
      matchups,
      snippetScoreSnapshots: snippetScoreSnapshotsRef.current,
    });
    highlightsRef.current.push(highlight);
    setHighlights([...highlightsRef.current]);
  }, [isEliminationMode, isTeam, matchups, medleySongs, playersRef]);

  return {
    currentDynamicDifficulty,
    activeModifier,
    modifierJustRevealed,
    mysteryReveal,
    mysteryRevealSong,
    setMysteryReveal,
    setMysteryRevealSong,
    highlights,
    buildSnippetHighlight,
    highlightsRef,
    snippetScoreSnapshotsRef,
  };
}
