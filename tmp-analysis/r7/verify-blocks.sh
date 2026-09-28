#!/bin/bash
ORIG=medley-game-hook.orig.ts
fail=0

check() {
  local name="$1" startM="$2" endM="$3" newfile="$4" shiftY="$5"
  # extract from orig between markers (inclusive), same from new file
  awk -v s="$startM" -v e="$endM" 'BEGIN{p=0} index($0,s){p=1} p{print} p&&index($0,e){exit}' "$ORIG" > /tmp/orig_block.txt
  awk -v s="$startM" -v e="$endM" 'BEGIN{p=0} index($0,s){p=1} p{print} p&&index($0,e){exit}' "$newfile" > /tmp/new_block.txt
  if diff -q /tmp/orig_block.txt /tmp/new_block.txt > /dev/null 2>&1; then
    echo "OK  : $name ($(wc -l < /tmp/orig_block.txt) lines)"
  else
    echo "DIFF: $name"
    diff /tmp/orig_block.txt /tmp/new_block.txt | head -20
    fail=1
  fi
}

H=../../src/components/game/medley/medley-game-hook.ts
T=../../src/components/game/medley/hooks/medley-hook-types.ts
P=../../src/components/game/medley/hooks/use-medley-phase.ts
PD=../../src/components/game/medley/hooks/use-medley-pitch-detection.ts
S=../../src/components/game/medley/hooks/use-medley-scoring.ts
GL=../../src/components/game/medley/hooks/use-medley-game-loop.ts
TR=../../src/components/game/medley/hooks/use-medley-transition.ts
RA=../../src/components/game/medley/hooks/use-medley-round-actions.ts

check "props-interface" "export interface MedleyGameScreenProps {" "  onPrepareNextRoundSongs?: () => Promise<MedleySong[] | null>;" "$T"
check "note-sample-type" "export type MedleyNotePerfSample" "playerColor?: string };" "$T"
check "gamestate-interface" "export interface MedleyGameState {" "  forceRender: () => void;" "$T"
check "phase-block" "  // ── Phase ──" "    window.dispatchEvent(new CustomEvent('ptm-phase-changed', { detail: { phase } }));" "$P"
check "phase-ptm-effect-close" "  }, [phase]);" "  }, [phase]);" "$P"
check "pause-effect" "  // ── Pause handling: properly stop game loop when pause is triggered ──" "  }, [pauseDialogAction, isPlaying, phase, setIsSongPlaying]);" "$H"
check "new-round-songs-effect" "  // ── New round's songs arrival (Fix 7) ──" "  }, [medleySongs]);" "$H"
check "pitch-playerconfigs" "  const playerConfigs = useMemo<PlayerPitchConfig[]>" "    [initialPlayers]," "$PD"
check "pitch-multipitch" "  const multiPitch = useMultiPitchDetector({" "    autoStart: false," "$PD"
check "pitch-issongplaying-effects" "  // ── Song playing status (ref-guarded to prevent React #185) ──" "  }, [setIsSongPlaying]);" "$PD"
check "pitch-setdifficulty" "  // ── Callback to set difficulty on the pitch detector (used by features hook) ──" "  }, []);" "$PD"
check "features-composition" "  const features = useMedleyFeatures({" "  });" "$H"
check "audio-composition" "  const audio = useMedleyAudio({" "  });" "$H"
check "teambonuses-composition" "  const teamBonuses = useMedleyTeamBonuses({" "  });" "$H"
check "elimination-composition" "  const elimination = useMedleyElimination({" "  });" "$H"
check "getActivePlayerIds" "  // ── Get active players for current snippet ──" "  }, [isTeam, isEliminationMode, currentSnippetIdx, matchups]);" "$H"
check "scoring-states" "  // ── Feature #5: Scoring events for UI feedback ──" "  const lastSnippetIdxForMetaRef = useRef<number>(-1);" "$S"
check "E4-reset-effect" "  // Reset tick scoring states when snippet changes" "  }, [currentSnippetIdx]);" "$S"
check "finalize-callback" "  // ── Finalize is no longer needed with tick-based scoring" "  }, []);" "$S"
check "visual-section" "  // ── Visual sample vibrato filter (per player) ──" "  return 'normal';" "$S"
check "visual-section-close" "  };" "  };" "$S"
check "scorePlayer" "  // ── Score a single player based on THEIR pitch result" "  }, [audio.snippetNotes, audio.beatDurationRef, currentSnippet, settings.difficulty, settings.dynamicDifficulty, currentSnippetIdx, medleySongs.length, teamBonuses.comebackActiveTeamIdRef]);" "$S"
check "E9-stall-fallback" "  // ── Audio stall fallback timer ──" "  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, medleySongs.length, pauseDialogAction, finalizeSnippetScores]);" "$GL"
check "E10-game-loop" "  // ── Game loop ──" "  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, scorePlayer, getActivePlayerIds, forceRender, isEliminationMode, elimination.eliminateLowestScorer, features.buildSnippetHighlight, teamBonuses.checkSynergy, teamBonuses.finalizeComeback, settings.mysteryMode, medleySongs.length, teamBonuses.syncTeamBonusResult, finalizeSnippetScores]);" "$GL"
check "E11-transition" "  // ── Transition: pulse then next snippet ──" "  }, [phase, currentSnippetIdx]);" "$TR"
check "handleStart" "  // ── Start game ──" "  }, [multiPitch, audio.cancelFallbackTimer, audio.effectiveSnippetRef, audio.lastPlayPhaseRef, elimination.resetFinalFaceOff]);" "$RA"
check "handleNextRound" "  // ── Next round (user item 6.2, Fix 7) ──" "  }, [medleySongs.length, audio.cancelFallbackTimer, audio.effectiveSnippetRef, audio.lastPlayPhaseRef, features.resetRound, elimination.resetRound, isEliminationMode, teamBonuses.syncTeamBonusResult, teamBonuses.teamBonusResultRef, teamBonuses.comebackActiveTeamIdRef, forceRender]);" "$RA"
check "handleRoundComplete" "  // ── Round complete ──" "  }, [medleySongs.length, isTeam, isEliminationMode, onRoundComplete, settings.playMode, settings.teamBonusesEnabled, teamBonuses.computeMVP, teamBonuses.syncTeamBonusResult, teamBonuses.teamBonusResultRef, elimination.eliminationOrderRef, features.highlightsRef]);" "$RA"
check "handleEndEarly" "  // ── End song early ──" "  }, [currentSnippetIdx, medleySongs.length, getActivePlayerIds, finalizeSnippetScores, features.buildSnippetHighlight, teamBonuses.checkSynergy, teamBonuses.finalizeComeback, teamBonuses.syncTeamBonusResult, setIsSongPlaying, forceRender, audio.cancelFallbackTimer, audio.audioRef, audio.fallbackVideoRef]);" "$RA"
check "E12-cleanup" "  // ── Cleanup on unmount ──" "  }, []);" "$RA"
check "helpers-progress" "  // ── Helpers ──" "    : 0;" "$H"
check "currentLyricLine" "  // ── Get current lyric line ──" "  }, [currentTimeMs, audio.snippetLyrics, currentSnippet, audio.effectiveStartMs]);" "$H"
check "currentMatchup" "  // Current matchup (team mode)" "    : null;" "$H"
check "showFinalResults" "  // ── Show final results ──" "  }, [setIsSongPlaying]);" "$H"
check "elimination-helpers" "  // ── Elimination helpers ──" "  const totalPlayerCount = playersRef.current.length;" "$H"
check "return-object" "  return {" "  };" "$H"
check "players-block" "  // ── Players (mutable ref for performance) ──" "  const forceRender = useCallback(() => setPlayersDisplay([...playersRef.current]), []);" "$H"
check "snippet-time-states" "  // ── Current snippet ──" "  const [isPlaying, setIsPlaying] = useState(false);" "$H"
check "store-subscriptions" "  // Subscribe to specific fields only" "  onPrepareNextRoundSongsRef.current = onPrepareNextRoundSongs;" "$H"

exit $fail
