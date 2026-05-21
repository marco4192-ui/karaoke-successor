'use client';

import { useState } from 'react';
import { StorageKeys, getBool, getJson, getNumber, getString, getItem, removeItem } from '@/lib/storage';
import { CHALLENGE_MODES } from '@/lib/game/player-progression';
import { PRACTICE_MODE_DEFAULTS, PracticeModeConfig } from '@/lib/game/practice-mode';

/**
 * Reads all localStorage-backed game settings and manages challenge/practice mode state.
 * Extracted from useGameScreenLogic to reduce the main hook's complexity.
 */
export function useGameScreenSettings() {
  const [showScore] = useState(() => getBool(StorageKeys.SHOW_SCORE, true));
  const [showParticles] = useState(() => getBool(StorageKeys.SHOW_PARTICLES, true));
  const [showCombo] = useState(() => getBool(StorageKeys.SHOW_COMBO, true));
  const [autoFullscreen] = useState(() => getBool(StorageKeys.AUTO_FULLSCREEN, false));
  const [masterVolume] = useState(() => getNumber(StorageKeys.MASTER_VOLUME, 100));
  const [lyricsSize] = useState(() => getString(StorageKeys.LYRICS_SIZE, 'medium'));
  const [youtubeQuality] = useState(() => getString(StorageKeys.YOUTUBE_QUALITY, 'default'));

  // Replay recording: enabled by default, persisted in localStorage
  const [replayEnabled] = useState(() => {
    return getJson<boolean>(StorageKeys.REPLAY_ENABLED, true);
  });

  // Practice mode UI controls
  const [showPracticeControls, setShowPracticeControls] = useState(false);

  // Challenge mode state - read from localStorage when game starts
  const [activeChallenge] = useState<typeof CHALLENGE_MODES[0] | null>(() => {
    const savedChallengeId = getItem(StorageKeys.CHALLENGE_MODE);
    if (savedChallengeId) {
      const challenge = CHALLENGE_MODES.find(c => c.id === savedChallengeId);
      if (challenge) {
        removeItem(StorageKeys.CHALLENGE_MODE); // Clear after reading
        return challenge;
      }
    }
    return null;
  });

  // Time limit from the active challenge (in seconds)
  const challengeTimeLimit = activeChallenge?.timeLimit ?? null;
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Pitch shift modifier from the active challenge
  // TODO: Apply this value to the audio playback engine so the song plays at a shifted pitch.
  //       Currently the AudioEffectSettings.pitch section exists but no Web Audio pitch-shifter
  //       node is wired up. Requires a granular synthesis or WSOLA implementation.
  const challengePitchShift = activeChallenge?.modifiers.find(m => m.type === 'pitch_shift')?.value ?? 0;

  // Derive challenge modifier flags for use throughout the component
  const hasChallengeNoPitchGuide = activeChallenge?.modifiers.some(m => m.type === 'no_pitch_guide') ?? false;
  const challengeSpeedModifier = activeChallenge?.modifiers.find(m => m.type === 'double_speed');

  // Practice mode state - initialize with challenge speed modifier if present
  const [practiceMode, setPracticeMode] = useState<PracticeModeConfig>(() => {
    const speedValue = challengeSpeedModifier?.value;
    if (speedValue && speedValue > 1.0) {
      return { ...PRACTICE_MODE_DEFAULTS, playbackRate: speedValue, enabled: true };
    }
    return { ...PRACTICE_MODE_DEFAULTS };
  });

  return {
    showScore,
    showParticles,
    showCombo,
    autoFullscreen,
    masterVolume,
    lyricsSize,
    youtubeQuality,
    replayEnabled,
    activeChallenge,
    hasChallengeNoPitchGuide,
    challengeModifiers: activeChallenge?.modifiers,
    challengeTimeLimit,
    timeRemaining,
    setTimeRemaining,
    challengePitchShift,
    practiceMode,
    setPracticeMode,
    showPracticeControls,
    setShowPracticeControls,
  };
}
