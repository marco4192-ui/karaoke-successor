'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  createTournament, 
  getPlayableMatches, 
  getTournamentStats,
  getPlayerPlacements,
  addToHallOfFame,
  getHallOfFame,
  getEffectiveDifficulty,
  getFanFavorites,
  type TournamentBracket,
  type TournamentPlayer,
  type TournamentMatch,
  type TournamentSettings,
} from '@/lib/game/tournament';
import { PlayerProfile, PLAYER_COLORS } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';

// ─── Tournament Setup Hook ────────────────────────────────────────

export type MaxPlayers = 2 | 4 | 8 | 16 | 32;

export interface UseTournamentSetupReturn {
  // State
  selectedPlayers: string[];
  maxPlayers: MaxPlayers;
  shortMode: boolean;
  tournamentType: 'single' | 'double';
  tiebreakMode: TournamentSettings['tiebreakMode'];
  dynamicDifficulty: boolean;
  songSelectionMode: 'random' | 'vote';
  seedingMode: 'random' | 'strength';
  error: string | null;
  showHallOfFame: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  // Computed
  activeProfiles: PlayerProfile[];
  hallOfFameEntries: ReturnType<typeof getHallOfFame>;
  // Actions
  handleSetMaxPlayers: (v: MaxPlayers) => void;
  setShortMode: (v: boolean) => void;
  setTournamentType: (v: 'single' | 'double') => void;
  setTiebreakMode: (v: TournamentSettings['tiebreakMode']) => void;
  setDynamicDifficulty: (v: boolean) => void;
  setSongSelectionMode: (v: 'random' | 'vote') => void;
  setSeedingMode: (v: 'random' | 'strength') => void;
  setGlobalDifficulty: (v: 'easy' | 'medium' | 'hard') => void;
  togglePlayer: (playerId: string) => void;
  handleStartTournament: () => void;
  setShowHallOfFame: (v: boolean) => void;
}

export function useTournamentSetup(
  profiles: PlayerProfile[],
  onStartTournament: (_bracket: TournamentBracket, _songDuration: number) => void,
): UseTournamentSetupReturn {
  const { t } = useTranslation();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState<MaxPlayers>(8);
  const [shortMode, setShortMode] = useState(true);
  const [tournamentType, setTournamentType] = useState<'single' | 'double'>('single');
  const [tiebreakMode, setTiebreakMode] = useState<TournamentSettings['tiebreakMode']>('accuracy');
  const [dynamicDifficulty, setDynamicDifficulty] = useState(false);
  const [songSelectionMode, setSongSelectionMode] = useState<'random' | 'vote'>('random');
  const [seedingMode, setSeedingMode] = useState<'random' | 'strength'>('random');
  const [error, setError] = useState<string | null>(null);
  const [showHallOfFame, setShowHallOfFame] = useState(false);

  const handleSetMaxPlayers = (v: MaxPlayers) => {
    setMaxPlayers(v);
    setSelectedPlayers(prev => prev.slice(0, v));
  };

  // Filter to only show active profiles (isActive === true or undefined for backwards compatibility)
  const activeProfiles = useMemo(() => 
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  // Use global difficulty from store instead of local state
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);
  const difficulty = globalDifficulty;

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= maxPlayers) {
        setError(t('tournament.errorMaxPlayers').replace('{n}', String(maxPlayers)));
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleStartTournament = () => {
    if (selectedPlayers.length < 2) {
      setError(t('tournament.errorMinPlayers'));
      return;
    }

    // #9 Calculate player strength for seeding
    const hofEntries = getHallOfFame();
    const playerStrengths: Record<string, number> = {};
    for (const id of selectedPlayers) {
      const profile = profiles.find(p => p.id === id);
      if (!profile) { playerStrengths[id] = 0; continue; }
      // Strength = (HoF championships * 25) + (averageAccuracy * 0.3) + (level * 2) + (totalGames * 0.1)
      const championships = hofEntries.filter(e => e.champion.id === id).length;
      const acc = profile.stats?.averageAccuracy ?? 0;
      const lvl = profile.level ?? 0;
      const games = profile.stats?.totalGamesPlayed ?? 0;
      playerStrengths[id] = (championships * 25) + (acc * 0.3) + (lvl * 2) + (games * 0.1);
    }
    // Sort by strength descending to assign seeds (strength-based seeding)
    const sortedByStrength = seedingMode === 'strength'
      ? [...selectedPlayers].sort((a, b) => (playerStrengths[b] ?? 0) - (playerStrengths[a] ?? 0))
      : selectedPlayers;
    
    const players: TournamentPlayer[] = sortedByStrength.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        eliminated: false,
        lossCount: 0,
        // #9 For strength seeding, seed is set by the sorting (lower index = stronger = better seed)
        // createTournament uses this seed to place players in bracket
        seed: index + 1,
      };
    });

    const settings: TournamentSettings = {
      maxPlayers,
      songDuration: shortMode ? 60 : 180, // 60s for short mode, 3 min for full
      randomSongs: songSelectionMode === 'random',
      difficulty,
      tournamentType,
      tiebreakMode,
      dynamicDifficulty,
      songSelectionMode,
      seedingMode,
      filterGenre: 'all',
      filterLanguage: 'all',
      // TODO: Add genre/language filter UI to tournament setup screen
    };

    try {
      const bracket = createTournament(players, settings);
      onStartTournament(bracket, settings.songDuration);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('tournament.errorCreate');
      setError(msg);
    }
  };

  // Hall of Fame data
  const hallOfFameEntries = useMemo(() => {
    if (!showHallOfFame) return [];
    return getHallOfFame();
  }, [showHallOfFame]);

  return {
    selectedPlayers,
    maxPlayers,
    shortMode,
    tournamentType,
    tiebreakMode,
    dynamicDifficulty,
    songSelectionMode,
    seedingMode,
    error,
    showHallOfFame,
    difficulty,
    activeProfiles,
    hallOfFameEntries,
    handleSetMaxPlayers,
    setShortMode,
    setTournamentType,
    setTiebreakMode,
    setDynamicDifficulty,
    setSongSelectionMode,
    setSeedingMode,
    setGlobalDifficulty,
    togglePlayer,
    handleStartTournament,
    setShowHallOfFame,
  };
}

// ─── Tournament Bracket View Hook ──────────────────────────────────

export interface UseTournamentBracketReturn {
  // Computed
  stats: ReturnType<typeof getTournamentStats>;
  playableMatches: TournamentMatch[];
  nextMatch: TournamentMatch | null;
  effectiveDiff: 'easy' | 'medium' | 'hard';
  showDiffBadge: boolean;
  isSeededByStrength: boolean;
  fanFavorites: ReturnType<typeof getFanFavorites>;
  // State
  bracketScale: number;
  /** Measured size of the bracket area — drives the butterfly's responsive spacing */
  availSize: { w: number; h: number } | null;
  manualWinnerMatch: TournamentMatch | null;
  // Refs
  bracketWrapperRef: React.RefObject<HTMLDivElement | null>;
  bracketInnerRef: React.RefObject<HTMLDivElement | null>;
  // Actions
  setManualWinnerMatch: (m: TournamentMatch | null) => void;
}

export function useTournamentBracket(
  bracket: TournamentBracket,
  currentMatch: TournamentMatch | null,
  showResults?: boolean,
): UseTournamentBracketReturn {
  const tournamentCrowdVotes = usePartyStore(s => s.tournamentCrowdVotes);

  // Get next match to play
  const playableMatches = getPlayableMatches(bracket);
  const nextMatch = playableMatches[0] || null;

  const stats = getTournamentStats(bracket);

  // #6 Dynamic difficulty indicator
  const effectiveDiff = getEffectiveDifficulty(
    bracket.settings.difficulty,
    bracket.currentRound,
    bracket.totalRounds,
    bracket.settings.dynamicDifficulty,
  );
  const showDiffBadge = bracket.settings.dynamicDifficulty && effectiveDiff !== bracket.settings.difficulty;

  // #9 Seeding mode indicator
  const isSeededByStrength = bracket.settings.seedingMode === 'strength';

  // #10 Fan favorites from crowd votes
  const fanFavorites = useMemo(() => {
    if (tournamentCrowdVotes.length === 0) return [];
    return getFanFavorites(bracket, tournamentCrowdVotes);
  }, [bracket, tournamentCrowdVotes]);

  // Auto-scale bracket to fit the available viewport — BOTH dimensions,
  // with limited up-scaling. Few matchups → the bracket grows (max ×2.0,
  // big readable cards); many matchups (32 players) → it shrinks to fit.
  const bracketWrapperRef = useRef<HTMLDivElement>(null);
  const bracketInnerRef = useRef<HTMLDivElement>(null);
  const [bracketScale, setBracketScale] = useState(1);
  const [availSize, setAvailSize] = useState<{ w: number; h: number } | null>(null);

  // Manual winner dialog state (for picking a winner without playing)
  const [manualWinnerMatch, setManualWinnerMatch] = useState<TournamentMatch | null>(null);

  const MAX_UPSCALE = 2.5;

  // Pass 1: measure the available area (independent of the bracket content —
  // the wrapper is flex-1/overflow-hidden, so its size never depends on children)
  useEffect(() => {
    const wrapper = bracketWrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      if (w > 0 && h > 0) {
        setAvailSize((prev) => (prev && Math.abs(prev.w - w) < 2 && Math.abs(prev.h - h) < 2 ? prev : { w, h }));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  // Pass 2: compute the uniform scale AFTER the butterfly re-rendered with the
  // spacing derived from availSize (runs on bracket / availSize changes and
  // observes the inner content for natural-size changes)
  //
  // Bug 11b: `inner.scrollWidth/scrollHeight` UNDER-REPORTS the bracket's real
  // extent (cards are absolutely positioned and vertically centred with
  // translateY(-50%), and the inner element itself carries a scale transform),
  // which made the computed scale too large and clipped the right bracket half
  // off-screen for 8/16/32-player brackets. Instead we measure the inner
  // content's box via getBoundingClientRect() and divide out the currently
  // applied scale to recover the NATURAL (untransformed) size, taking the max
  // with scrollWidth/scrollHeight (which still catches bottom/right layout
  // overflow of grown, name-wrapped cards). A small safety factor keeps hover
  // badges / card hover-scale / the final's glow from touching the edges.
  const bracketScaleRef = useRef(1);
  useEffect(() => {
    const wrapper = bracketWrapperRef.current;
    const inner = bracketInnerRef.current;
    if (!wrapper || !inner) return;
    const updateScale = () => {
      const availableW = wrapper.clientWidth;
      const availableH = wrapper.clientHeight;
      if (availableW <= 0 || availableH <= 0) return;

      // Natural size = transformed rect ÷ currently applied scale.
      const prevScale = bracketScaleRef.current || 1;
      const rect = inner.getBoundingClientRect();
      const neededW = Math.max(inner.scrollWidth, rect.width / prevScale);
      const neededH = Math.max(inner.scrollHeight, rect.height / prevScale);

      if (neededW > 0 && neededH > 0) {
        const SAFETY = 1.02; // ~2% margin so nothing clips at the edges
        const scale = Math.min(availableW / (neededW * SAFETY), availableH / (neededH * SAFETY), MAX_UPSCALE);
        if (isFinite(scale) && scale > 0) {
          bracketScaleRef.current = scale;
          setBracketScale((prev) => (Math.abs(prev - scale) < 0.004 ? prev : scale));
        }
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [bracket, showResults, availSize]);

  // #7 Auto-add to Hall of Fame when tournament completes
  const hofRecordedRef = useRef(false);
  useEffect(() => {
    if (bracket.status === 'completed' && bracket.champion && !hofRecordedRef.current) {
      hofRecordedRef.current = true;
      const placements = getPlayerPlacements(bracket);
      addToHallOfFame(bracket, placements);
    }
  }, [bracket.status, bracket.champion]);

  return {
    stats,
    playableMatches,
    nextMatch,
    effectiveDiff,
    showDiffBadge,
    isSeededByStrength,
    fanFavorites,
    bracketScale,
    availSize,
    manualWinnerMatch,
    bracketWrapperRef,
    bracketInnerRef,
    setManualWinnerMatch,
  };
}

// ─── Tournament Results Hook ──────────────────────────────────────

export interface UseTournamentResultsReturn {
  placements: ReturnType<typeof getPlayerPlacements>;
  fanFavorites: ReturnType<typeof getFanFavorites>;
}

export function useTournamentResults(
  bracket: TournamentBracket,
): UseTournamentResultsReturn {
  const tournamentCrowdVotes = usePartyStore(s => s.tournamentCrowdVotes);

  const placements = useMemo(() => getPlayerPlacements(bracket), [bracket]);

  // #10 Fan favorites from crowd votes
  const fanFavorites = useMemo(() => {
    if (tournamentCrowdVotes.length === 0) return [];
    return getFanFavorites(bracket, tournamentCrowdVotes);
  }, [bracket, tournamentCrowdVotes]);

  return { placements, fanFavorites };
}
