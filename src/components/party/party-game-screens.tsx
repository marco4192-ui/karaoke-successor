'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs, getNonDuetSongs, filterSongs } from '@/lib/game/song-library';
import { recordMatchResult, getEffectiveDifficulty } from '@/lib/game/tournament';
import { useTranslation } from '@/lib/i18n/translations';
import { shuffleArray } from '@/lib/utils';
import { TournamentBracketView, TournamentResultsScreen } from '@/components/game/tournament-screen';
import { BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import { PtmGameScreen } from '@/components/game/ptm-game-screen';
import { CptmGameScreen } from '@/components/game/cptm-singalong-screen';
import { MedleyGameScreen } from '@/components/game/medley/medley-game-screen';
import { addMedleyEntry, addDailyMedleyEntry } from '@/lib/game/medley-ranking';
import { CompetitiveGameView } from '@/components/game/competitive-words-blind-screen';
import { PartyStartingScreen } from '@/components/game/party-starting-screen';
import { TournamentSongVoteOverlay } from '@/components/game/tournament-song-vote-overlay';
import { RateMySongRatingScreen, RateMySongResultsScreen, RateMySongSeriesResultsScreen } from '@/components/game/rate-my-song-screen';
import type { RateMySongResult } from '@/components/game/rate-my-song-screen';
import { getRandomChallenge } from '@/lib/game/rate-my-song-ranking';
import { toast } from '@/hooks/use-toast';
import { preparePtmNextSong } from '@/lib/game/ptm-next-song';
import type { Screen } from '@/types/screens';
import { freqNumberToLabel, trimSongToShortMode, pickRandomVotingSongs, buildGameSetupResult } from './party-game-helpers';

interface PartyGameScreensProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

// ===================== PARTY GAME MODE SCREENS =====================
export function PartyGameScreens({ screen, setScreen }: PartyGameScreensProps) {
  const { profiles, setGameMode, setSong, resetGame, addPlayer, setPlayers } = useGameStore();
  const rmsGameMode = useGameStore((s) => s.gameState.gameMode);
  const party = usePartyStore();
  const { t } = useTranslation();

  // State for Rate my Song results
  const [rateMySongResult, setRateMySongResult] = useState<RateMySongResult | null>(null);
  // Track current series round (1-based)
  const [rateMySongSeriesRound, setRateMySongSeriesRound] = useState(1);
  // Track whether the challenge pre-singing overlay has been dismissed
  const [challengeOverlayDismissed, setChallengeOverlayDismissed] = useState(true);

  // #7 Tournament results screen
  const [showTournamentResults, setShowTournamentResults] = useState(false);

  // #8 Tournament song voting state
  const [tournamentVotingActive, setTournamentVotingActive] = useState(false);

  // ── Tournament starting-screen state (replaces the old 3-2-1 mic overlay) ──
  // After selecting the next pairing ("Start Next Match"), the mode starting
  // screen shows both players + their mic assignment + the song (if voted).
  // The match starts via the explicit Start button — not via a countdown.
  const [micOverlay, setMicOverlay] = useState<{ p1Name: string; p2Name: string; p1Mic: string; p2Mic: string; votedSong: import('@/types/game').Song | null } | null>(null);

  // Dispatch the intro phase while the tournament starting screen is visible
  // so companion mirrors show the mode intro.
  useEffect(() => {
    if (micOverlay) {
      window.dispatchEvent(new CustomEvent('ptm-phase-changed', { detail: { phase: 'intro' } }));
    }
  }, [micOverlay]);

  // Helper: fetch connected companion profiles and compute mic assignments
  const startMatchWithMicOverlay = useCallback(async (
    match: import('@/lib/game/tournament').TournamentMatch,
    preSelectedSong?: import('@/types/game').Song | null,
  ) => {
    if (!match.player1 || !match.player2) return;

    // Set up mic assignments: check companion connections
    let p1Mic = t('partyGameScreens.microphone1');
    let p2Mic = t('partyGameScreens.microphone2');

    try {
      const res = await fetch('/api/mobile?action=getprofiles');
      if (res.ok) {
        const data = await res.json();
        const connectedProfiles: Array<{ id: string; name: string; clientId?: string }> = Array.isArray(data) ? data : [];

        const p1Companion = connectedProfiles.find(p =>
          match.player1 && (p.id === match.player1.id || p.name === match.player1.name)
        );
        const p2Companion = connectedProfiles.find(p =>
          match.player2 && (p.id === match.player2.id || p.name === match.player2.name)
        );

        // Companion-connected players sing via companion app
        if (p1Companion) p1Mic = t('partyGameScreens.companion');
        if (p2Companion) p2Mic = t('partyGameScreens.companion');
      }
    } catch {
      // Silently fail — default to Mic 1 / Mic 2
    }

    // Store the match and pre-selected song in party store
    party.setCurrentTournamentMatch(match);
    if (preSelectedSong) party.setTournamentVotedSong(preSelectedSong);

    // Show the tournament starting screen (players, mic assignment, song)
    setMicOverlay({
      p1Name: match.player1.name,
      p2Name: match.player2.name,
      p1Mic,
      p2Mic,
      votedSong: preSelectedSong ?? null,
    });
  }, [party.setCurrentTournamentMatch, party.setTournamentVotedSong, t]);

  // #1 #2 #5 #6 Helper: Pick a tournament song (no repeats, filter, trim duration)
  const pickTournamentSong = useCallback((): import('@/types/game').Song | null => {
    const bracket = party.tournamentBracket;
    if (!bracket) return null;

    // #5 Apply genre/language filters
    let pool = getNonDuetSongs();
    const genre = bracket.settings.filterGenre;
    const lang = bracket.settings.filterLanguage;
    if (genre && genre !== 'all' && lang && lang !== 'all') {
      pool = filterSongs(pool, genre, lang, true);
    } else if (genre && genre !== 'all') {
      pool = filterSongs(pool, genre, 'all', true);
    } else if (lang && lang !== 'all') {
      pool = filterSongs(pool, 'all', lang, true);
    }

    // #2 Exclude already-used songs
    const usedIds = new Set(party.tournamentUsedSongIds);
    let available = pool.filter(s => !usedIds.has(s.id));

    // If all songs are used, reset the pool
    if (available.length === 0) {
      party.resetTournamentUsedSongIds();
      available = pool;
    }

    if (available.length === 0) return null;

    const chosen = available[Math.floor(Math.random() * available.length)];

    // #1 Trim song duration for short mode
    if (party.tournamentSongDuration === 60) {
      const trimmed = trimSongToShortMode(chosen);
      party.addTournamentUsedSongId(chosen.id);
      return trimmed;
    }

    party.addTournamentUsedSongId(chosen.id);
    return chosen;
  }, [party]);

  // ── Launch the selected tournament match (invoked by the starting screen's Start button) ──
  const launchTournamentMatch = useCallback(() => {
    if (!micOverlay) return;

    const match = party.currentTournamentMatch;
    if (!match) return;
    if (!match.player1 || !match.player2) return;

    setMicOverlay(null);

    // Reset game state for new match
    resetGame();
    setPlayers([]);

    // Store mic assignments in unifiedSetupResult for MicIndicator display
    const p1IsCompanion = micOverlay.p1Mic === t('partyGameScreens.companion');
    const p2IsCompanion = micOverlay.p2Mic === t('partyGameScreens.companion');
    const setupResult = buildGameSetupResult({
      mode: 'tournament',
      players: [
        { id: match.player1.id, name: match.player1.name, color: match.player1.color || '#FF6B6B', playerType: p1IsCompanion ? 'companion' : 'microphone', micName: micOverlay.p1Mic },
        { id: match.player2.id, name: match.player2.name, color: match.player2.color || '#4ECDC4', playerType: p2IsCompanion ? 'companion' : 'microphone', micName: micOverlay.p2Mic },
      ],
      difficulty: party.tournamentBracket?.settings?.difficulty ?? 'medium',
      settings: {},
    });
    party.setUnifiedSetupResult(setupResult);

    // Add both players for the duel
    if (match.player1) addPlayer({ id: match.player1.id, name: match.player1.name, avatar: match.player1.avatar, color: match.player1.color });
    if (match.player2) addPlayer({ id: match.player2.id, name: match.player2.name, avatar: match.player2.avatar, color: match.player2.color });

    // #6 Set dynamic difficulty if enabled
    const bracket = party.tournamentBracket;
    if (bracket && bracket.settings.dynamicDifficulty) {
      const effectiveDiff = getEffectiveDifficulty(
        bracket.settings.difficulty,
        bracket.currentRound,
        bracket.totalRounds,
        true,
      );
      useGameStore.getState().setDifficulty(effectiveDiff);
    }

    setGameMode('duel');

    // #8 Use voted song if available, otherwise pick randomly
    const votedSong = party.tournamentVotedSong;
    party.setTournamentVotedSong(null);
    const song = votedSong || pickTournamentSong();
    if (song) {
      setSong(song);
      setScreen('game');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- party is a stable Zustand store; specific fields used in body
  }, [micOverlay, party.currentTournamentMatch, resetGame, addPlayer, setGameMode, setSong, setScreen, party.setUnifiedSetupResult, party.tournamentBracket, party.tournamentVotedSong, t, pickTournamentSong]);

  return (
    <>
      {/* Tournament Starting Screen — shown after selecting the next pairing.
          Shows both players with their mic assignment and the voted song (if any).
          The match starts via the explicit Start button.
          NOTE: no "starts first" highlight — a DUEL is sung by both players
          simultaneously, so both duelists are shown equally. */}
      {micOverlay && party.currentTournamentMatch?.player1 && party.currentTournamentMatch?.player2 && (
        <PartyStartingScreen
          overlay
          modeIcon="🏆"
          modeTitle={t('tournament.startingTitle')}
          modeColor="from-amber-500 to-yellow-500"
          players={[
            {
              id: party.currentTournamentMatch.player1.id,
              name: micOverlay.p1Name,
              avatar: party.currentTournamentMatch.player1.avatar,
              color: party.currentTournamentMatch.player1.color || '#FF6B6B',
              micName: micOverlay.p1Mic,
              playerType: micOverlay.p1Mic === t('partyGameScreens.companion') ? 'companion' : 'microphone',
            },
            {
              id: party.currentTournamentMatch.player2.id,
              name: micOverlay.p2Name,
              avatar: party.currentTournamentMatch.player2.avatar,
              color: party.currentTournamentMatch.player2.color || '#4ECDC4',
              micName: micOverlay.p2Mic,
              playerType: micOverlay.p2Mic === t('partyGameScreens.companion') ? 'companion' : 'microphone',
            },
          ]}
          song={micOverlay.votedSong}
          subtitle={t('tournament.roundOfOf').replace('{n}', String(party.tournamentBracket?.currentRound ?? 1)).replace('{m}', String(party.tournamentBracket?.totalRounds ?? 1))}
          onStart={launchTournamentMatch}
          testId="tournament-starting-screen"
        />
      )}

      {/* Pass the Mic Game Screen — dedicated PTM screen with note highway */}
      {screen === 'pass-the-mic-game' && party.passTheMicSong && (
        <PtmGameScreen
          players={party.passTheMicPlayers}
          song={party.passTheMicSong}
          segments={party.passTheMicSegments}
          settings={party.passTheMicSettings}
          onUpdateGame={(players, segments) => {
            party.setPassTheMicPlayers(players);
            party.setPassTheMicSegments(segments);
          }}
          onEndGame={() => {
            party.setPassTheMicSong(null);
            party.setPassTheMicSegments([]);
            party.setIsSongPlaying(false);
            // Correct legacy flow: no series history = first/only song done, go to setup;
            // has series history = more songs to sing, continue to library.
            // NOTE: In the unified flow, series history is never populated via this path.
            if (party.passTheMicSeriesHistory.length === 0) {
              setScreen('party-setup');
            } else {
              setGameMode('pass-the-mic');
              setScreen('library');
            }
          }}
          onNavigate={async (targetScreen) => {
            // Handle special PTM next-song navigation
            if (targetScreen === 'ptm-next-random' || targetScreen === 'ptm-next-medley') {
              try {
                const playerCount = party.passTheMicPlayers.length || 2;
                const segDur = party.passTheMicSettings?.segmentDuration;
                const action = await preparePtmNextSong(
                  targetScreen === 'ptm-next-random' ? 'random' : 'medley',
                  playerCount,
                  segDur,
                );

                if (action.mode === 'random') {
                  party.setPassTheMicSegments(action.result.segments);
                  party.setPassTheMicSong(action.result.song);
                  party.setPassTheMicSettings({
                    ...(party.passTheMicSettings || { segmentDuration: 30, difficulty: 'medium', micId: '', micName: '' }),
                    segmentDuration: action.result.segmentDuration,
                  });
                  party.setPtmMedleySnippets([]);
                  party.setIsSongPlaying(false);
                  setScreen('pass-the-mic-game');
                } else if (action.mode === 'medley') {
                  party.setPtmMedleySnippets(action.result.medleySnippets);
                  party.setPassTheMicSegments(action.result.segments);
                  party.setPassTheMicSong(action.result.song);
                  party.setPassTheMicSettings({
                    ...(party.passTheMicSettings || { segmentDuration: 30, difficulty: 'medium', micId: '', micName: '' }),
                    segmentDuration: action.result.segmentDuration,
                  });
                  party.setIsSongPlaying(false);
                  setScreen('pass-the-mic-game');
                } else {
                  // Fallback to library
                  setScreen('library');
                }
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[PTM] Failed to prepare next song:', err);
                toast({ title: t('common.error') || 'Error', description: t('partyGameScreens.nextSongFailedDesc') || 'Could not load next song.', variant: 'destructive' });
                setScreen('library');
              }
            } else if (targetScreen === 'song-voting') {
              // Re-generate voting songs from filtered pool
              // IMPORTANT: always limit to 3 songs (matching initial setup behavior)
              const filters = party.unifiedSetupResult?.settings;
              const suggested = pickRandomVotingSongs(filters?.filterGenre, filters?.filterLanguage, filters?.filterCombined);
              party.setVotingSongs(suggested);
              setScreen('song-voting');
            } else {
              setScreen(targetScreen as Screen);
            }
          }}

        />
      )}

      {/* Tournament Song Voting Overlay (#8) — unified design (VS header, animated cards, keyboard picking) */}
      {tournamentVotingActive && party.tournamentVotingSongs.length > 0 && party.tournamentVotingMatch && (
        <TournamentSongVoteOverlay
          match={party.tournamentVotingMatch}
          roundLabel={t('tournament.roundOfOf')
            .replace('{n}', String(party.tournamentVotingMatch.round))
            .replace('{m}', String(party.tournamentBracket?.totalRounds ?? 1))}
          songs={party.tournamentVotingSongs}
          onPick={(song) => {
            setTournamentVotingActive(false);
            party.setTournamentVotingSongs([]);
            party.setTournamentVotedSong(song);
            party.addTournamentUsedSongId(song.id);
            startMatchWithMicOverlay(party.tournamentVotingMatch!, song);
          }}
          onSkip={() => {
            setTournamentVotingActive(false);
            party.setTournamentVotingSongs([]);
            party.setTournamentVotingMatch(null);
          }}
        />
      )}

      {/* Tournament Game Screen */}
      {screen === 'tournament-game' && party.tournamentBracket && !showTournamentResults && (
        <TournamentBracketView
          bracket={party.tournamentBracket}
          currentMatch={party.currentTournamentMatch}
          matchAborted={party.tournamentMatchAborted}
          onPlayMatch={(match) => {
            // #8 Check if voting mode — show voting overlay instead of starting directly
            const bracket = party.tournamentBracket;
            if (bracket && bracket.settings.songSelectionMode === 'vote') {
              // TODO: Use filterSongs utility with filterCombined setting for tournament voting
              // Pick 3 random songs for voting (same pool logic as pickTournamentSong)
              const usedIds = new Set(party.tournamentUsedSongIds);
              const pool = getNonDuetSongs().filter(s => {
                if (usedIds.has(s.id)) return false;
                const genre = bracket.settings.filterGenre;
                const lang = bracket.settings.filterLanguage;
                if (genre && genre !== 'all') {
                  if (!s.genre || s.genre !== genre) return false;
                }
                if (lang && lang !== 'all') {
                  if (!s.language || s.language !== lang) return false;
                }
                return true;
              });
              if (pool.length >= 3) {
                const shuffled = shuffleArray(pool).slice(0, 3);
                party.setTournamentVotingSongs(shuffled);
                party.setTournamentVotingMatch(match);
                setTournamentVotingActive(true);
              } else if (pool.length > 0) {
                // Not enough songs for voting, pick randomly
                startMatchWithMicOverlay(match);
              } else {
                startMatchWithMicOverlay(match);
              }
            } else {
              startMatchWithMicOverlay(match);
            }
          }}
          onManualWinner={(matchId, winnerId) => {
            if (!party.tournamentBracket) return;
            // Look up the match from the bracket (works for both abort dialog and manual selection)
            const match = party.tournamentBracket.matches.find(m => m.id === matchId);
            if (!match) return;
            const isP1Winner = winnerId === match.player1?.id;
            // Use 100 for winner, 0 for loser to clearly indicate the choice
            const updated = recordMatchResult(
              party.tournamentBracket,
              matchId,
              isP1Winner ? 100 : 0,
              isP1Winner ? 0 : 100,
            );
            party.setTournamentBracket(updated);
            party.setCurrentTournamentMatch(null);
          }}
          onRepeatMatch={() => {
            if (!party.currentTournamentMatch) return;
            const match = party.currentTournamentMatch;
            if (!match.player1 || !match.player2) return;
            resetGame();
            setPlayers([]);
            addPlayer({
              id: match.player1.id,
              name: match.player1.name,
              avatar: match.player1.avatar,
              color: match.player1.color,
            });
            addPlayer({
              id: match.player2.id,
              name: match.player2.name,
              avatar: match.player2.avatar,
              color: match.player2.color,
            });
            setGameMode('duel');
            const song = pickTournamentSong();
            if (song) setSong(song);
            setScreen('game');
          }}
          onAbortHandled={() => {
            party.setTournamentMatchAborted(false);
          }}
          shortMode={party.tournamentSongDuration === 60}
          showResults={showTournamentResults}
          onShowResults={() => setShowTournamentResults(true)}
        />
      )}

      {/* #7 Tournament Results Screen */}
      {screen === 'tournament-game' && party.tournamentBracket && showTournamentResults && (
        <TournamentResultsScreen
          bracket={party.tournamentBracket}
          onBack={() => setShowTournamentResults(false)}
          onNewTournament={() => {
            // Unified flow: "New Tournament" returns to the unified party setup
            // (same flow as initial mode selection) instead of the legacy setup screen.
            party.setTournamentBracket(null);
            party.setCurrentTournamentMatch(null);
            party.setTournamentVotedSong(null);
            party.resetTournamentUsedSongIds();
            party.setTournamentMatchAborted(false);
            party.setPtmMedleySnippets([]);
            setShowTournamentResults(false);
            party.setSelectedGameMode('tournament');
            setScreen('party-setup');
          }}
        />
      )}

      {/* Battle Royale Game Screen */}
      {screen === 'battle-royale-game' && party.battleRoyaleGame && (
        <BattleRoyaleGameView
          game={party.battleRoyaleGame}
          songs={getNonDuetSongs()}
          onUpdateGame={(game) => party.setBattleRoyaleGame(game)}
          onEndGame={() => {
            party.setBattleRoyaleGame(null);
            party.setUnifiedSetupResult(null);
            party.setSelectedGameMode(null);
            party.setIsSongPlaying(false);
            setScreen('home');
          }}
          onBack={() => {
            party.setBattleRoyaleGame(null);
            setScreen('party');
          }}
        />
      )}

      {/* Companion Sing-A-Long Game Screen (powered by CPTM segment engine) */}
      {screen === 'companion-singalong-game' && party.cptmSong && party.cptmSegments.length > 0 && (
        <CptmGameScreen
          players={party.cptmPlayers}
          song={party.cptmSong}
          segments={party.cptmSegments}
          settings={party.cptmSettings}
          onUpdateGame={(players, segments) => {
            party.setCptmPlayers(players);
            party.setCptmSegments(segments);
          }}
          onEndGame={() => {
            party.setCptmPlayers([]);
            party.setCptmSong(null);
            party.setCptmSegments([]);
            party.setCptmSettings(null);
            party.setIsSongPlaying(false);
            if (party.cptmSeriesHistory.length === 0) {
              setScreen('party-setup');
            } else {
              setScreen('library');
            }
          }}
          onNavigate={async (targetScreen) => {
            // Handle next-song navigation (same pattern as PtM)
            if (targetScreen === 'ptm-next-random' || targetScreen === 'ptm-next-medley') {
              try {
                const playerCount = party.cptmPlayers.length || 2;
                const segDur = party.cptmSettings?.segmentDuration;
                const action = await preparePtmNextSong(
                  targetScreen === 'ptm-next-random' ? 'random' : 'medley',
                  playerCount,
                  segDur,
                );
                if (action.mode === 'random') {
                  party.setCptmSegments(action.result.segments);
                  party.setCptmSong(action.result.song);
                  party.setIsSongPlaying(false);
                  setScreen('companion-singalong-game');
                } else if (action.mode === 'medley') {
                  party.setPtmMedleySnippets(action.result.medleySnippets);
                  party.setCptmSegments(action.result.segments);
                  party.setCptmSong(action.result.song);
                  party.setIsSongPlaying(false);
                  setScreen('companion-singalong-game');
                } else {
                  setScreen('library');
                }
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[CompanionSingAlong] Failed to prepare next song:', err);
                toast({ title: t('common.error') || 'Error', description: t('partyGameScreens.nextSongFailedDesc') || 'Could not load next song.', variant: 'destructive' });
                setScreen('library');
              }
            } else if (targetScreen === 'song-voting') {
              const filters = party.unifiedSetupResult?.settings;
              const suggested = pickRandomVotingSongs(filters?.filterGenre, filters?.filterLanguage, filters?.filterCombined);
              party.setVotingSongs(suggested);
              setScreen('song-voting');
            } else {
              setScreen(targetScreen as Screen);
            }
          }}
        />
      )}

      {/* Medley Contest Game Screen — dedicated screen with multi-pitch detection */}
      {screen === 'medley-game' && party.medleySongs.length > 0 && party.medleySettings && (
        <MedleyGameScreen
          players={party.medleyPlayers}
          songs={party.medleySongs}
          settings={party.medleySettings}
          matchups={party.medleyMatches}
          _seriesHistory={party.medleySeriesHistory}
          onRoundComplete={(result, updatedPlayers) => {
            party.setMedleyPlayers(updatedPlayers);
            party.setMedleySeriesHistory([...party.medleySeriesHistory, result]);
            // Feature #13: Save to leaderboard
            try {
              for (const p of updatedPlayers) {
                const scores = result.playerScores[p.id];
                if (!scores) continue;
                const entry = {
                  playerId: p.id,
                  playerName: p.name,
                  playerColor: p.color,
                  score: scores.score,
                  notesHit: scores.notesHit,
                  notesMissed: scores.notesMissed,
                  maxCombo: scores.maxCombo,
                  snippetsSung: scores.snippetsSung,
                  snippetCount: result.snippetCount,
                  playMode: party.medleySettings?.playMode || 'ffa',
                };
                addMedleyEntry(entry);
                addDailyMedleyEntry(entry);
              }
            } catch { /* ignore storage errors */ }
          }}
          onEndGame={() => {
            party.setMedleyPlayers([]);
            party.setMedleySongs([]);
            party.setMedleySettings(null);
            party.setMedleyMatches([]);
            party.setMedleySeriesHistory([]);
            party.setUnifiedSetupResult(null);
            setScreen('home');
          }}
        />
      )}
      {/* Missing Words Competitive Game */}
      {screen === 'missing-words-game' && party.competitiveGame && (
        <CompetitiveGameView
          game={party.competitiveGame}
          songs={getNonDuetSongs()}
          modeType='missing-words'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            party.setCompetitiveGame(null);
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const p1Color = comp.players.find(p => p.id === p1Id)?.color || '#FF6B6B';
            const p2Color = comp.players.find(p => p.id === p2Id)?.color || '#4ECDC4';
            addPlayer({ id: p1Id, name: p1Name, color: p1Color });
            addPlayer({ id: p2Id, name: p2Name, color: p2Color });
            const setupResult = buildGameSetupResult({
              mode: 'missing-words',
              players: [
                { id: p1Id, name: p1Name, color: p1Color },
                { id: p2Id, name: p2Name, color: p2Color },
              ],
              difficulty: comp.settings.difficulty,
              settings: {
                missingWordFrequency: freqNumberToLabel(comp.settings.missingWordFrequency),
                bestOf: comp.settings.bestOf,
                granularity: comp.settings.missingWordsGranularity,
                hardcoreMissingWords: comp.settings.hardcoreMissingWords,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('missing-words');
            setSong(song);
            setScreen('game');
          }}
          onPlaySolo={(pId, pName, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const pColor = comp.players.find(p => p.id === pId)?.color || '#FF6B6B';
            addPlayer({ id: pId, name: pName, color: pColor });
            const setupResult = buildGameSetupResult({
              mode: 'missing-words',
              players: [{ id: pId, name: pName, color: pColor }],
              difficulty: comp.settings.difficulty,
              settings: {
                missingWordFrequency: freqNumberToLabel(comp.settings.missingWordFrequency),
                bestOf: comp.settings.bestOf,
                granularity: comp.settings.missingWordsGranularity,
                hardcoreMissingWords: comp.settings.hardcoreMissingWords,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('missing-words');
            setSong(song);
            setScreen('game');
          }}
        />
      )}

      {/* Blind Karaoke Competitive Game */}
      {screen === 'blind-game' && party.competitiveGame && (
        <CompetitiveGameView
          game={party.competitiveGame}
          songs={getNonDuetSongs()}
          modeType='blind'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            party.setCompetitiveGame(null);
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const p1Color = comp.players.find(p => p.id === p1Id)?.color || '#FF6B6B';
            const p2Color = comp.players.find(p => p.id === p2Id)?.color || '#4ECDC4';
            addPlayer({ id: p1Id, name: p1Name, color: p1Color });
            addPlayer({ id: p2Id, name: p2Name, color: p2Color });
            const setupResult = buildGameSetupResult({
              mode: 'blind',
              players: [
                { id: p1Id, name: p1Name, color: p1Color },
                { id: p2Id, name: p2Name, color: p2Color },
              ],
              difficulty: comp.settings.difficulty,
              settings: {
                blindFrequency: freqNumberToLabel(comp.settings.blindFrequency),
                bestOf: comp.settings.bestOf,
                hardcore: comp.settings.hardcore,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('blind');
            setSong(song);
            setScreen('game');
          }}
          onPlaySolo={(pId, pName, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const pColor = comp.players.find(p => p.id === pId)?.color || '#FF6B6B';
            addPlayer({ id: pId, name: pName, color: pColor });
            const setupResult = buildGameSetupResult({
              mode: 'blind',
              players: [{ id: pId, name: pName, color: pColor }],
              difficulty: comp.settings.difficulty,
              settings: {
                blindFrequency: freqNumberToLabel(comp.settings.blindFrequency),
                bestOf: comp.settings.bestOf,
                hardcore: comp.settings.hardcore,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('blind');
            setSong(song);
            setScreen('game');
          }}
        />
      )}

      {/* Rate my Song — Mode Starting Screen (before the game screen).
          Shown after "Ready to Play": singers get into position, then press Start. */}
      {screen === 'rate-my-song-game' && party.rateMySongSettings && (
        <RmsStartingScreen
          setScreen={setScreen}
        />
      )}

      {/* Challenge Pre-Singing Overlay (Rate my Song) */}
      {screen === 'game' && rmsGameMode === 'rate-my-song' && party.rateMySongCurrentChallenge && !challengeOverlayDismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border border-purple-500/30 rounded-2xl p-8 max-w-md text-center animate-fade-in">
            <div className="text-5xl mb-4">{party.rateMySongCurrentChallenge.icon}</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {t(`rateMySong.challenges.${party.rateMySongCurrentChallenge.id}.title`)}
            </h2>
            <p className="text-white/70 text-sm mb-6">
              {t(`rateMySong.challenges.${party.rateMySongCurrentChallenge.id}.description`)}
            </p>
            <p className="text-amber-400 text-xs mb-4">{t('rateMySong.bonusPointsIfMastered')}</p>
            <button
              onClick={() => setChallengeOverlayDismissed(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:from-purple-400 hover:to-pink-400 transition-all"
              data-testid="party-rms-challenge-dismiss-button"
            >
              {t('rateMySong.letsGo')}
            </button>
          </div>
        </div>
      )}

      {/* Rate my Song — After song ends, go to rating screen */}
      {screen === 'rate-my-song-rating' && party.rateMySongSettings && (
        (() => {
          const rms = party.rateMySongSettings;
          const rmsSong = getAllSongs().find(s => s.id === rms.songId);
          return (
        <RateMySongRatingScreen
          songTitle={rmsSong?.title || ''}
          songArtist={rmsSong?.artist || ''}
          singingPlayers={party.rateMySongPlayerIds.map(id => {
            const p = profiles.find(pr => pr.id === id);
            return { id, name: p?.name || t('game.player'), color: p?.color || '#FF6B6B' };
          })}
          allProfiles={profiles}
          categoriesEnabled={rms.categoriesEnabled}
          anonymousRating={rms.anonymousRating}
          challengesEnabled={rms.challengesEnabled}
          currentChallenge={party.rateMySongCurrentChallenge}
          onSubmit={(ratings) => {
            const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
            // Resolve spectator bets
            if (party.rateMySongSettings?.bettingEnabled) {
              const totalBetPoints = ratings.reduce((sum, r) => sum + (r.betPoints || 0), 0);
              if (totalBetPoints > 0) {
                toast({ title: t('rateMySong.bettingResultTitle'), description: t('rateMySong.bettingResultDesc').replace('{n}', String(totalBetPoints)) });
              }
            }
            const result: RateMySongResult = {
              songTitle: rmsSong?.title || '',
              songArtist: rmsSong?.artist || '',
              ratings,
              averageRating: Math.round(avg * 10) / 10,
              challengeBonus: ratings.some(r => r.challengeMastered) ? 50 : 0,
            };
            // Notify if challenge bonus earned
            if (result.challengeBonus && result.challengeBonus > 0) {
              toast({ title: '🏆 ' + t('rateMySong.challengeMastered'), description: t('rateMySong.challengeBonusDesc').replace('{n}', String(result.challengeBonus)) });
            }
            setRateMySongResult(result);
            // Save round to series history ONCE at submit time, not during render
            const totalRounds = rms.seriesRounds || 1;
            const isSeries = totalRounds > 1;
            if (isSeries && ratings.length > 0) {
              party.addRateMySongSeriesRound(ratings);
            }
            setScreen('rate-my-song-results');
          }}
          onBack={() => setScreen('party')}
        />
          );
        })()
      )}

      {/* Rate my Song — Results */}
      {screen === 'rate-my-song-results' && (() => {
        if (!rateMySongResult || !party.rateMySongSettings) return null;
        const rms = party.rateMySongSettings;
        const rmsSong = getAllSongs().find(s => s.id === rms.songId);
        const totalRounds = rms.seriesRounds || 1;
        const isLastRound = rateMySongSeriesRound >= totalRounds;
        const isSeries = totalRounds > 1;

        // If last round of a series, show series results
        if (isSeries && isLastRound) {
          return (
            <RateMySongSeriesResultsScreen
              seriesHistory={party.rateMySongSeriesHistory}
              onEnd={() => {
                party.setRateMySongSettings(null);
                party.setRateMySongPlayerIds([]);
                setRateMySongResult(null);
                party.resetRateMySongSeries();
                setRateMySongSeriesRound(1);
                setScreen('home');
              }}
            />
          );
        }

        return (
          <RateMySongResultsScreen
            result={rateMySongResult}
            songId={rms.songId}
            songGenre={rmsSong?.genre}
            categoriesEnabled={rms.categoriesEnabled}
            challengesEnabled={rms.challengesEnabled}
            seriesRound={rateMySongSeriesRound}
            seriesTotalRounds={totalRounds}
            onPlayAgain={() => {
              setRateMySongResult(null);
              // Advance series round
              if (isSeries && !isLastRound) {
                setRateMySongSeriesRound(prev => prev + 1);
              } else {
                setRateMySongSeriesRound(1);
              }
              // Draw new challenge for next round
              if (rms.challengesEnabled) {
                const prevChallenge = party.rateMySongCurrentChallenge;
                const challenge = getRandomChallenge(prevChallenge?.id);
                party.setRateMySongCurrentChallenge(challenge);
              }
              // Unified flow: "Play Again" returns to the unified party setup
              // (mode, players, song selection, "Ready to Play") instead of the
              // legacy setup screen — the flow stays identical every round.
              party.setSelectedGameMode('rate-my-song');
              setScreen('party-setup');
            }}
            onEnd={() => {
              party.setRateMySongSettings(null);
              party.setRateMySongPlayerIds([]);
              setRateMySongResult(null);
              party.resetRateMySongSeries();
              setRateMySongSeriesRound(1);
              setScreen('home');
            }}
          />
        );
      })()}
    </>
  );
}

// ===================== RATE MY SONG STARTING SCREEN =====================
// Mode starting screen between "Ready to Play" and the actual game screen.
// Shows mode name, singers (boxes) and the song (unless randomly selected).
function RmsStartingScreen({ setScreen }: { setScreen: (_s: Screen) => void }) {
  const { t } = useTranslation();
  const party = usePartyStore();
  const profiles = useGameStore((s) => s.profiles);
  const currentSong = useGameStore((s) => s.gameState.currentSong);

  const songSelection = party.unifiedSetupResult?.songSelection;
  // Song name only shown when it was explicitly chosen (library/vote)
  const showSong = (songSelection === 'library' || songSelection === 'vote') ? currentSong : null;

  const players: import('@/components/game/party-starting-screen').PartyStartingPlayer[] = (party.rateMySongPlayerIds ?? [])
    .map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      const setupPlayer = party.unifiedSetupResult?.players?.find(p => p.id === id);
      return {
        id,
        name: profile?.name ?? setupPlayer?.name ?? `P${index + 1}`,
        avatar: profile?.avatar ?? setupPlayer?.avatar,
        color: profile?.color ?? setupPlayer?.color ?? '#FF6B6B',
        micName: setupPlayer?.micName,
        playerType: setupPlayer?.playerType,
        isStartPlayer: index === 0,
      };
    });

  return (
    <PartyStartingScreen
      modeIcon="⭐"
      modeTitle={t('gameModes.rateMySong.title')}
      modeColor="from-amber-500 to-orange-500"
      players={players}
      song={showSong}
      subtitle={party.rateMySongSettings?.duration === 'short' ? t('modeSettings.short60s') : undefined}
      startPlayerLabel={t('partyStarting.startsFirst')}
      onStart={() => setScreen('game')}
      testId="rate-my-song-starting-screen"
    />
  );
}

