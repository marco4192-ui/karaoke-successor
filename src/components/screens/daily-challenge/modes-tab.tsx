'use client';

// Daily Challenge Screen — TAB: Challenge Modes (71 modes, filter + completion)
//
// Same 3-step structure: player (step 1, top) → pick a mode → pick a song.

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StorageKeys, setItem } from '@/lib/storage';
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
import { Song, GameMode } from '@/types/game';
import { shuffleArray } from '@/lib/utils';
import type { DailyChallengeScreenData } from './use-daily-challenge-data';

interface ModesTabProps {
  data: DailyChallengeScreenData;
  onPlayChallenge: (_song: Song, _options?: { gameMode?: GameMode; playerIds?: string[] }) => void;
}

export function ModesTab({ data, onPlayChallenge }: ModesTabProps) {
  const { t } = useTranslation();
  const {
    modeFilter,
    setModeFilter,
    selectedMode,
    modeSongChoices,
    handlePlayModeSong,
    modeSongsRef,
    modeSongsHighlighted,
    mixerSelected,
    setMixerSelected,
    setupGamePlayers,
    selectMode,
    viewProfile,
    viewProfileLevel,
  } = data;

  return (
    <div className="space-y-4 mb-6">
      {/* ── STEP 2 · Challenge-Modus wählen ── */}
      <div className="flex items-start gap-3" data-testid="modes-step-2">
        <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-purple-500/20 border border-purple-500 text-purple-300 shrink-0" aria-hidden>2</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white/90">{t('dailyChallengeScreen.stepChallengeMode')}</h2>
          <p className="text-xs text-white/50">{t('dailyChallengeScreen.modesSoloHint')}</p>
        </div>
        {/* Difficulty filter */}
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
      </div>

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
          const extendedStats = getExtendedStats();
          const completedModes = getCompletedChallengeModes(viewProfile?.id);
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
                selectMode(mode);
              }}
            >
              <CardContent className="pt-4 pb-4">
                {locked && (
                  <div className="absolute top-2 right-2 text-lg" title={requirementStatus || ''}>🔒</div>
                )}
                {isCompleted && !locked && (
                  <div className="absolute top-2 right-2 text-lg" title={t('dailyChallengeScreen.modeCompleted')}>✅</div>
                )}
                <div className="text-3xl mb-2">{mode.icon}</div>
                <h4 className="font-bold text-white mb-1">{t(mode.nameKey)}</h4>
                <p className="text-xs text-white/60 mb-3 line-clamp-2">{t(mode.descriptionKey)}</p>
                {locked && requirementStatus && (
                  <p className="text-xs text-red-400 mb-2">{requirementStatus}</p>
                )}
                {mode.completionTarget && !locked && (
                  <p className="text-[10px] text-white/40 mb-2">
                    🎯 {t('dailyChallengeScreen.modeTarget')}: {mode.completionTarget.direction === 'min' ? '≥' : '≤'}{
                      mode.completionTarget.metric === 'accuracy' ? `${mode.completionTarget.value}%` : mode.completionTarget.value.toLocaleString()
                    } {mode.completionTarget.metric === 'notesHit' ? t('dailyChallengeScreen.notesHitLabel')
                      : mode.completionTarget.metric === 'perfectNotes' ? t('dailyChallengeScreen.perfectNotesLabel')
                      : mode.completionTarget.metric === 'goldenNotes' ? t('dailyChallengeScreen.goldenNotesLabel')
                      : mode.completionTarget.metric === 'maxCombo' ? t('dailyChallengeScreen.comboLabel')
                      : mode.completionTarget.metric === 'notesMissed' ? t('dailyChallengeScreen.missedNotesLabel')
                      : t('dailyChallengeScreen.points')}
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
        <div ref={modeSongsRef} className="mb-4 scroll-mt-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="modes-step-3">
          {/* Anchor highlight wrapper — own transition classes so they
              don't clash with the mount animation on the outer div */}
          <div className={`rounded-xl transition-all duration-700 ${modeSongsHighlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''}`}>
            <div className="flex items-start gap-3 mb-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-fuchsia-500/20 border border-fuchsia-500 text-fuchsia-300 shrink-0" aria-hidden>3</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-white/90">
                  {t('dailyChallengeScreen.stepSong')}
                  <span className="ml-2 text-white/60 font-normal">— {selectedMode.icon} {t(selectedMode.nameKey)}</span>
                </h2>
                <p className="text-xs text-white/50">{t(selectedMode.descriptionKey)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {modeSongChoices.map((song, idx) => (
                <Card key={song.id || idx} className="bg-white/5 border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => handlePlayModeSong(song)}>
                  <CardContent className="pt-3 pb-3">
                    <div className="text-sm font-medium text-white truncate">{song.title}</div>
                    <div className="text-xs text-white/50 truncate">{song.artist}</div>
                    {song.duration && <div className="text-xs text-white/40 mt-1">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</div>}
                  </CardContent>
                </Card>
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
