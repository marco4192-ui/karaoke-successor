'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import { getAllSongs } from '@/lib/game/song-library';
import {
  CHALLENGE_MODES,
  getChallengeRequirementStatus,
  createCustomChallenge,
  AVAILABLE_MODIFIERS,
  getExtendedStats,
} from '@/lib/game/player-progression';
import { getCompletedChallengeModes } from '@/lib/game/challenge-mode-progress';
import { matchesDailyCategory } from '@/lib/game/challenge-pools';
import { FlagAwareEmoji } from '@/components/screens/character/country-picker';
import { StorageKeys, setItem } from '@/lib/storage';
import type { PlayerProfile, Song, GameMode } from '@/types/game';
import { shuffleArray } from '@/lib/utils';
import { songToContext, modeMetricLabel } from './daily-helpers';
import { useScrollHighlight } from './use-scroll-highlight';
import { StepHeader } from './step-header';
import { SongChoiceCard } from './song-choice-card';

/** TAB: Challenge Modes (71 modes, filter + completion) — same 3-step
 *  structure: player (step 1, top of the screen) → pick a mode → pick a
 *  song. Challenge modes are played SOLO by the first selected player. */
export function ModesTab({ viewProfile, viewProfileLevel, setupGamePlayers, onPlayChallenge }: {
  viewProfile: PlayerProfile | undefined;
  viewProfileLevel: number;
  setupGamePlayers: (secondPlayer: boolean) => boolean;
  onPlayChallenge: (song: Song, options?: { gameMode?: GameMode; playerIds?: string[] }) => void;
}) {
  const { t, language } = useTranslation();

  // Selected challenge mode (for song selection after picking a mode)
  const [selectedMode, setSelectedMode] = useState<typeof CHALLENGE_MODES[0] | null>(null);
  // Song choices for selected challenge mode
  const [modeSongChoices, setModeSongChoices] = useState<Song[]>([]);
  // Challenge modes difficulty filter
  const [modeFilter, setModeFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'extreme'>('all');
  // Challenge Mixer state
  const [mixerSelected, setMixerSelected] = useState<string[]>([]);

  // Modes tab, step 2 → step 3: picking a challenge mode unfolds the song
  // selection — pull the user down to it.
  const modeSongs = useScrollHighlight();
  const { scrollTo: scrollToModeSongs } = modeSongs;

  // Requirement checks are pure reads — computed once per render for all cards
  const extendedStats = getExtendedStats();
  const completedModes = getCompletedChallengeModes(viewProfile?.id);

  // Handler: play a specific song with a selected challenge mode. Challenge
  // modes are played SOLO by the first selected player (no gameMode override —
  // the mapped challenge mode wins).
  const handlePlayModeSong = useCallback((song: Song) => {
    if (selectedMode) {
      setItem(StorageKeys.CHALLENGE_MODE, selectedMode.id);
    }
    setupGamePlayers(false);
    onPlayChallenge(song);
  }, [selectedMode, setupGamePlayers, onPlayChallenge]);

  return (
    <div className="space-y-4 mb-6">
      {/* ── STEP 2 · Challenge-Modus wählen ── */}
      <StepHeader
        step={2}
        testId="modes-step-2"
        title={t('dailyChallengeScreen.stepChallengeMode')}
        hint={t('dailyChallengeScreen.modesSoloHint')}
        right={
          /* Difficulty filter */
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10 shrink-0">
            {(['all', 'easy', 'medium', 'hard', 'extreme'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setModeFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  modeFilter === f ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {f === 'all' ? t('dailyChallengeScreen.filterAll') : f.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle>{t('dailyChallengeScreen.challengeModes')} ({CHALLENGE_MODES.length})</CardTitle>
          <CardDescription>{t('dailyChallengeScreen.specialModifiers')}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHALLENGE_MODES
          .filter(mode => modeFilter === 'all' || mode.difficulty === modeFilter)
          .map((mode) => {
          // Check if the player meets the challenge requirements
          const isCompleted = completedModes.includes(mode.id);
          const requirementStatus = getChallengeRequirementStatus(
            mode.id,
            viewProfileLevel,
            extendedStats.songsCompleted,
            extendedStats.unlockedTitles,
            extendedStats.totalXP,
            t,
            completedModes,
          );
          const locked = requirementStatus !== null;
          const isSelected = selectedMode?.id === mode.id;

          return (
            <Card
              key={mode.id}
              className={`bg-white/5 border-white/10 transition-all relative ${
                locked ? 'opacity-50 cursor-not-allowed' :
                isSelected ? 'ring-2 ring-cyan-500 cursor-pointer hover:bg-white/10' :
                'cursor-pointer hover:bg-white/10'
              } ${
                isCompleted ? 'border-green-500/40' :
                mode.difficulty === 'extreme' ? 'border-red-500/30' :
                mode.difficulty === 'hard' ? 'border-orange-500/30' :
                mode.difficulty === 'medium' ? 'border-yellow-500/30' : 'border-green-500/30'
              }`}
              onClick={() => {
                if (locked) return;
                if (isSelected) {
                  // Deselect
                  setSelectedMode(null);
                  setModeSongChoices([]);
                } else {
                  // Select mode and generate song choices (category modes get matching songs)
                  setSelectedMode(mode);
                  const songs = getAllSongs();
                  if (mode.category) {
                    const matching = songs.filter(s => matchesDailyCategory(mode.category as { field: never; value?: string | number }, songToContext(s), language));
                    setModeSongChoices((matching.length >= 3 ? shuffleArray(matching).slice(0, 3) : matching.length > 0 ? matching : shuffleArray(songs).slice(0, 3)));
                  } else {
                    setModeSongChoices(shuffleArray(songs).slice(0, 3));
                  }
                  // Anchor point: the song selection (step 3) unfolds
                  // below — pull the user down to it
                  scrollToModeSongs();
                }
              }}
            >
              <CardContent className="pt-4 pb-4">
                {locked && (
                  <div className="absolute top-2 right-2 text-lg" title={requirementStatus || ''}>🔒</div>
                )}
                {isCompleted && !locked && (
                  <div className="absolute top-2 right-2 text-lg" title={t('dailyChallengeScreen.modeCompleted')}>✅</div>
                )}
                <div className="text-3xl mb-2"><FlagAwareEmoji text={mode.icon} flagClassName="h-6 w-8" /></div>
                <h4 className="font-bold text-white mb-1">{t(mode.nameKey)}</h4>
                <p className="text-xs text-white/60 mb-3 line-clamp-2">{t(mode.descriptionKey)}</p>
                {locked && requirementStatus && (
                  <p className="text-xs text-red-400 mb-2">{requirementStatus}</p>
                )}
                {mode.completionTarget && !locked && (
                  <p className="text-[10px] text-white/40 mb-2">
                    🎯 {t('dailyChallengeScreen.modeTarget')}: {mode.completionTarget.direction === 'min' ? '≥' : '≤'}{
                      mode.completionTarget.metric === 'accuracy' ? `${mode.completionTarget.value}%` : mode.completionTarget.value.toLocaleString()
                    } {modeMetricLabel(mode.completionTarget.metric, t)}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-xs ${
                    mode.difficulty === 'extreme' ? 'border-red-500 text-red-400' :
                    mode.difficulty === 'hard' ? 'border-orange-500 text-orange-400' :
                    mode.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' : 'border-green-500 text-green-400'
                  }`}>
                    {mode.difficulty.toUpperCase()}
                  </Badge>
                  <span className="text-cyan-400 font-bold text-sm">+{mode.xpReward} XP</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── STEP 3 · Song wählen — folds out when a mode is picked ── */}
      {selectedMode && modeSongChoices.length > 0 && (
        <div ref={modeSongs.ref} className="mb-4 scroll-mt-28 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="modes-step-3">
          {/* Anchor highlight wrapper — own transition classes so they
              don't clash with the mount animation on the outer div */}
          <div className={`rounded-xl transition-all duration-700 ${modeSongs.highlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''}`}>
            <StepHeader
              step={3}
              className="mb-3"
              title={
                <>
                  {t('dailyChallengeScreen.stepSong')}
                  <span className="ml-2 text-white/60 font-normal">— <FlagAwareEmoji text={selectedMode.icon} flagClassName="h-3.5 w-5" /> {t(selectedMode.nameKey)}</span>
                </>
              }
              hint={t(selectedMode.descriptionKey)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {modeSongChoices.map((song, idx) => (
                <SongChoiceCard key={song.id || idx} song={song} variant="compact" onClick={() => handlePlayModeSong(song)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Challenge Mixer */}
      <Card className="bg-white/5 border-white/10 mt-6">
        <CardHeader>
          <CardTitle>{t('dailyChallengeScreen.challengeMixer')}</CardTitle>
          <CardDescription>{t('dailyChallengeScreen.challengeMixerDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {AVAILABLE_MODIFIERS.map((mod) => (
              <button
                key={mod.type}
                onClick={() => setMixerSelected(prev => prev.includes(mod.type) ? prev.filter(t => t !== mod.type) : [...prev, mod.type])}
                className={`p-2 rounded-lg text-left text-xs transition-all ${
                  mixerSelected.includes(mod.type) ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <div className="font-medium">{mod.label}</div>
                <div className="text-white/40">{mod.difficulty}</div>
              </button>
            ))}
          </div>
          {mixerSelected.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">
                {mixerSelected.length} modifier{mixerSelected.length > 1 ? 's' : ''} — {mixerSelected.length >= 3 ? 'EXTREME' : mixerSelected.length >= 2 ? 'HARD' : 'MEDIUM'}
              </div>
              <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-500" onClick={() => {
                const customChallenge = createCustomChallenge({
                  name: 'Custom Mix',
                  modifiers: AVAILABLE_MODIFIERS.filter(m => mixerSelected.includes(m.type)).map(m => ({
                    type: m.type,
                    description: m.description,
                    value: m.defaultValue,
                  })),
                  difficulty: mixerSelected.length >= 3 ? 'extreme' : mixerSelected.length >= 2 ? 'hard' : 'medium',
                });
                setItem(StorageKeys.CHALLENGE_MODE, customChallenge.id);
                // Fresh random song (previously this reused the daily tab's
                // songChoices which could be stale/empty on the modes tab)
                const mixerSong = shuffleArray(getAllSongs())[0];
                if (!mixerSong) return;
                setupGamePlayers(false);
                onPlayChallenge(mixerSong);
              }}>
                {t('dailyChallengeScreen.playNow')} (+{Math.round((150 + mixerSelected.length * 50) * (mixerSelected.length >= 3 ? 3 : mixerSelected.length >= 2 ? 2 : 1.5))} XP)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
