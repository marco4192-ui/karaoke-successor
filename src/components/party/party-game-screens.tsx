'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs, getNonDuetSongs, filterSongs } from '@/lib/game/song-library';
import { recordMatchResult, getEffectiveDifficulty, type CrowdVoteMatch } from '@/lib/game/tournament';
import { useTranslation } from '@/lib/i18n/translations';
import { TournamentSetupScreen, TournamentBracketView, TournamentResultsScreen } from '@/components/game/tournament-screen';
import { BattleRoyaleSetupScreen, BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import { PassTheMicSetupScreen } from '@/components/game/pass-the-mic-screen';
import { PtmGameScreen } from '@/components/game/ptm-game-screen';
import { CompanionSingAlongSetupScreen, CompanionGameView } from '@/components/game/companion-singalong-screen';
import { CptmGameScreen } from '@/components/game/cptm-singalong-screen';
import { MedleySetupScreen } from '@/components/game/medley';
import { MedleyGameScreen } from '@/components/game/medley/medley-game-screen';
import type { MedleyPlayer, MedleySettings, MedleySong, SnippetMatchup} from '@/components/game/medley/medley-types';
import { addMedleyEntry, addDailyMedleyEntry } from '@/lib/game/medley-ranking';
import { CompetitiveSetupScreen, CompetitiveGameView } from '@/components/game/competitive-words-blind-screen';
import { RateMySongSetupScreen, RateMySongRatingScreen, RateMySongResultsScreen, RateMySongSeriesResultsScreen } from '@/components/game/rate-my-song-screen';
import type { RateMySongResult, RateMySongRating } from '@/components/game/rate-my-song-screen';
import { getRandomChallenge } from '@/lib/game/rate-my-song-ranking';
import type { GameSetupResult } from '@/components/game/unified-party-setup';
import { preparePtmNextSong } from '@/lib/game/ptm-next-song';
import { toast } from '@/hooks/use-toast';
import type { Screen } from '@/types/screens';
import { freqNumberToLabel, trimSongToShortMode, pickRandomVotingSongs } from './party-game-helpers';

interface PartyGameScreensProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

// ===================== PARTY GAME MODE SCREENS =====================
export function PartyGameScreens({ screen, setScreen }: PartyGameScreensProps) {
  const { profiles, setGameMode, setSong, resetGame, addPlayer, setPlayers } = useGameStore();
  const rmsGameMode = useGameStore((s) => s.gameState.gameMode);
  const party = usePartyStore();
  const { t, language } = useTranslation();

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

  // ── Tournament mic assignment overlay state ──
  const [micOverlay, setMicOverlay] = useState<{ p1Name: string; p2Name: string; p1Mic: string; p2Mic: string; countdown: number } | null>(null);
  const micOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (micOverlayTimerRef.current) clearTimeout(micOverlayTimerRef.current);
  }, []);

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

    // Show mic assignment overlay with countdown
    setMicOverlay({
      p1Name: match.player1.name,
      p2Name: match.player2.name,
      p1Mic,
      p2Mic,
      countdown: 3,
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

  useEffect(() => {
    if (!micOverlay) return;

    if (micOverlayTimerRef.current) clearTimeout(micOverlayTimerRef.current);

    if (micOverlay.countdown <= 0) {
      // Time's up — actually start the match
      micOverlayTimerRef.current = null;
      const match = party.currentTournamentMatch;
      if (!match) return;

      if (!match.player1 || !match.player2) return;

      setMicOverlay(null);

      // Reset game state for new match
      resetGame();

      // Store mic assignments in unifiedSetupResult for MicIndicator display
      const setupResult: GameSetupResult = {
        mode: 'tournament',
        players: [
          { id: match.player1.id, name: match.player1.name, color: match.player1.color || '#FF6B6B', playerType: micOverlay.p1Mic === t('partyGameScreens.companion') ? 'companion' : 'microphone', micId: 'default', micName: micOverlay.p1Mic },
          { id: match.player2.id, name: match.player2.name, color: match.player2.color || '#4ECDC4', playerType: micOverlay.p2Mic === t('partyGameScreens.companion') ? 'companion' : 'microphone', micId: 'default', micName: micOverlay.p2Mic },
        ],
        settings: { difficulty: party.tournamentBracket?.settings?.difficulty ?? 'medium', filterGenre: 'all', filterLanguage: 'all', filterCombined: true },
        songSelection: 'random',
        difficulty: party.tournamentBracket?.settings?.difficulty ?? 'medium',
        inputMode: 'microphone',
      };
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
      return;
    }

    micOverlayTimerRef.current = setTimeout(() => {
      setMicOverlay(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : null);
    }, 1000);

    return () => { if (micOverlayTimerRef.current) clearTimeout(micOverlayTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- party is a stable Zustand store; getAllSongs is from static import; specific fields used in body
  }, [micOverlay, party.currentTournamentMatch, resetGame, addPlayer, setGameMode, setSong, setScreen, getAllSongs, party.setUnifiedSetupResult, t]);

  return (
    <>
      {/* Tournament Mic Assignment Overlay */}
      {micOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
            <div className="text-4xl mb-4">🎤</div>
            <h2 className="text-xl font-bold text-white mb-6">{t('tournament.micAssignment')}</h2>
            <div className="text-lg font-bold text-amber-400 animate-pulse mb-6">{micOverlay.countdown}</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-lg font-bold text-cyan-400 shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{micOverlay.p1Name}</div>
                  <div className="text-sm text-cyan-400">{t('tournament.singsWith')} <b>{micOverlay.p1Mic}</b></div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400 shrink-0">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{micOverlay.p2Name}</div>
                  <div className="text-sm text-purple-400">{t('tournament.singsWith')} <b>{micOverlay.p2Mic}</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pass the Mic Setup Screen */}
      {screen === 'pass-the-mic' && (
        <PassTheMicSetupScreen
          profiles={profiles}
          onSelectSong={(players, settings) => {
            party.setPassTheMicPlayers(players);
            party.setPassTheMicSettings(settings);
            setGameMode('pass-the-mic');
            setScreen('library');
          }}
          onBack={() => setScreen('party')}
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
                toast({ title: t('common.error') || 'Error', description: t('partyGameSongs.nextSongError') || 'Could not load next song.', variant: 'destructive' });
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
          onPause={() => {
            party.setPauseDialogAction('song-pause');
          }}
        />
      )}

      {/* Tournament Song Voting Overlay (#8) */}
      {tournamentVotingActive && party.tournamentVotingSongs.length > 0 && party.tournamentVotingMatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-pink-500/30 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🗳️</div>
              <h2 className="text-xl font-bold text-white">{t('tournament.songVoteTitle')}</h2>
              <p className="text-sm text-white/60 mt-1">
                {party.tournamentVotingMatch.player1?.name} {t('tournament.vs')} {party.tournamentVotingMatch.player2?.name}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {party.tournamentVotingSongs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => {
                    // Mark as voted and proceed to mic overlay
                    const voted = song;
                    setTournamentVotingActive(false);
                    party.setTournamentVotingSongs([]);
                    party.setTournamentVotedSong(voted);
                    party.addTournamentUsedSongId(song.id);
                    startMatchWithMicOverlay(party.tournamentVotingMatch!, voted);
                  }}
                  className="bg-white/5 hover:bg-white/15 border border-white/10 hover:border-pink-500/50 rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  {song.coverImage ? (
                    <img src={song.coverImage} alt={song.title} className="w-full aspect-square object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg mb-2 flex items-center justify-center text-3xl">🎵</div>
                  )}
                  <div className="font-medium text-sm text-white truncate">{song.title}</div>
                  <div className="text-xs text-white/50 truncate">{song.artist}</div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setTournamentVotingActive(false);
                party.setTournamentVotingSongs([]);
                party.setTournamentVotingMatch(null);
              }}
              className="w-full text-white/40 hover:text-white/70"
            >
              {t('tournament.songVoteSkip')}
            </Button>
          </div>
        </div>
      )}

      {/* Tournament Setup Screen */}
      {screen === 'tournament' && (
        <TournamentSetupScreen
          profiles={profiles}
          onStartTournament={(bracket, songDuration) => {
            party.setTournamentBracket(bracket);
            party.setTournamentSongDuration(songDuration);
            // #2 Reset used songs when a new tournament starts
            party.resetTournamentUsedSongIds();
            // #10 Reset crowd votes when a new tournament starts
            party.resetTournamentCrowdVotes();
            setShowTournamentResults(false);
            setScreen('tournament-game');
          }}
          onBack={() => setScreen('party')}
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
                const shuffled = [...pool].sort(() => Math.random() - 0.5);
                party.setTournamentVotingSongs(shuffled.slice(0, 3));
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
            if (!party.tournamentBracket || !party.currentTournamentMatch) return;
            const match = party.currentTournamentMatch;
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
            party.setTournamentBracket(null);
            setShowTournamentResults(false);
            setScreen('tournament');
          }}
        />
      )}

      {/* Battle Royale Setup Screen */}
      {screen === 'battle-royale' && (
        <BattleRoyaleSetupScreen
          profiles={profiles}
          songs={getNonDuetSongs()}
          onStartGame={(game) => {
            party.setBattleRoyaleGame(game);
            setScreen('battle-royale-game');
          }}
          onBack={() => setScreen('party')}
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
            setScreen('home');
          }}
          onBack={() => {
            party.setBattleRoyaleGame(null);
            setScreen('party');
          }}
        />
      )}

      {/* Companion Sing-A-Long Setup Screen */}
      {screen === 'companion-singalong' && (
        <CompanionSingAlongSetupScreen
          profiles={profiles}
          onSelectSong={(players, settings) => {
            party.setCompanionPlayers(players);
            party.setCompanionSettings(settings);
            setGameMode('companion-singalong');
            setScreen('library');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Companion Sing-A-Long Game Screen */}
      {screen === 'companion-singalong-game' && party.companionSong && party.companionSettings && (
        <CompanionGameView
          players={party.companionPlayers}
          song={party.companionSong}
          settings={party.companionSettings}
          onEndGame={() => {
            party.setCompanionPlayers([]);
            party.setCompanionSong(null);
            party.setCompanionSettings(null);
            setScreen('home');
          }}
        />
      )}

      {/* Companion Pass-the-Mic Game Screen */}
      {screen === 'companion-pass-the-mic-game' && party.cptmSong && party.cptmSegments.length > 0 && (
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
                  setScreen('companion-pass-the-mic-game');
                } else if (action.mode === 'medley') {
                  party.setPtmMedleySnippets(action.result.medleySnippets);
                  party.setCptmSegments(action.result.segments);
                  party.setCptmSong(action.result.song);
                  party.setIsSongPlaying(false);
                  setScreen('companion-pass-the-mic-game');
                } else {
                  setScreen('library');
                }
              } catch (err) {
                console.error('[CPtM] Failed to prepare next song:', err);
                toast({ title: t('common.error') || 'Error', description: t('partyGameSongs.nextSongError') || 'Could not load next song.', variant: 'destructive' });
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
          onPause={() => {
            party.setPauseDialogAction('song-pause');
          }}
        />
      )}

            {/* Medley Contest Setup Screen (redesigned: FFA + Team modes) */}
      {screen === 'medley' && (
        <MedleySetupScreen
          profiles={profiles}
          onStartGame={(players: MedleyPlayer[], medleySongList: MedleySong[], settings: MedleySettings, matchups: SnippetMatchup[]) => {
            party.setMedleyPlayers(players);
            party.setMedleySongs(medleySongList);
            party.setMedleySettings(settings);
            party.setMedleyMatches(matchups);
            party.setMedleySeriesHistory([]);
            // Reset isSongPlaying BEFORE navigating to prevent React #185
            party.setIsSongPlaying(false);
            setScreen('medley-game');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Medley Contest Game Screen — dedicated screen with multi-pitch detection */}
      {screen === 'medley-game' && party.medleySongs.length > 0 && party.medleySettings && (
        <MedleyGameScreen
          players={party.medleyPlayers}
          songs={party.medleySongs}
          settings={party.medleySettings}
          matchups={party.medleyMatches}
          seriesHistory={party.medleySeriesHistory}
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

{/* Missing Words Competitive Setup */}
      {screen === 'missing-words' && (
        <CompetitiveSetupScreen
          profiles={profiles}
          songs={getNonDuetSongs()}
          modeType='missing-words'
          onStartGame={(game) => {
            party.setCompetitiveGame(game);
            setScreen('missing-words-game');
          }}
          onBack={() => setScreen('party')}
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
            const setupResult: GameSetupResult = {
              mode: 'missing-words',
              players: [
                { id: p1Id, name: p1Name, color: p1Color, playerType: 'microphone', micId: 'default', micName: t('partyGameScreens.microphone1') },
                { id: p2Id, name: p2Name, color: p2Color, playerType: 'microphone', micId: 'default', micName: t('partyGameScreens.microphone2') },
              ],
              settings: {
                difficulty: comp.settings.difficulty,
                filterGenre: 'all',
                filterLanguage: 'all',
                filterCombined: true,
                missingWordFrequency: freqNumberToLabel(comp.settings.missingWordFrequency),
                bestOf: comp.settings.bestOf,
                granularity: comp.settings.missingWordsGranularity,
                hardcoreMissingWords: comp.settings.hardcoreMissingWords,
                escalating: comp.settings.escalating,
              },
              songSelection: 'random',
              difficulty: comp.settings.difficulty,
              inputMode: 'microphone',
            };
            party.setUnifiedSetupResult(setupResult);
            // TODO: Add back navigation from competitive game view to setup screen
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
            const setupResult: GameSetupResult = {
              mode: 'missing-words',
              players: [
                { id: pId, name: pName, color: pColor, playerType: 'microphone', micId: 'default', micName: t('partyGameScreens.microphone1') },
              ],
              settings: {
                difficulty: comp.settings.difficulty,
                filterGenre: 'all',
                filterLanguage: 'all',
                filterCombined: true,
                missingWordFrequency: freqNumberToLabel(comp.settings.missingWordFrequency),
                bestOf: comp.settings.bestOf,
                granularity: comp.settings.missingWordsGranularity,
                hardcoreMissingWords: comp.settings.hardcoreMissingWords,
                escalating: comp.settings.escalating,
              },
              songSelection: 'random',
              difficulty: comp.settings.difficulty,
              inputMode: 'microphone',
            };
            party.setUnifiedSetupResult(setupResult);
            setGameMode('missing-words');
            setSong(song);
            setScreen('game');
          }}
        />
      )}

      {/* Blind Karaoke Competitive Setup */}
      {screen === 'blind' && (
        <CompetitiveSetupScreen
          profiles={profiles}
          songs={getNonDuetSongs()}
          modeType='blind'
          onStartGame={(game) => {
            party.setCompetitiveGame(game);
            setScreen('blind-game');
          }}
          onBack={() => setScreen('party')}
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
            const setupResult: GameSetupResult = {
              mode: 'blind',
              players: [
                { id: p1Id, name: p1Name, color: p1Color, playerType: 'microphone', micId: 'default', micName: t('partyGameScreens.microphone1') },
                { id: p2Id, name: p2Name, color: p2Color, playerType: 'microphone', micId: 'default', micName: t('partyGameScreens.microphone2') },
              ],
              settings: {
                difficulty: comp.settings.difficulty,
                filterGenre: 'all',
                filterLanguage: 'all',
                filterCombined: true,
                blindFrequency: freqNumberToLabel(comp.settings.blindFrequency),
                bestOf: comp.settings.bestOf,
                hardcore: comp.settings.hardcore,
                escalating: comp.settings.escalating,
              },
              songSelection: 'random',
              difficulty: comp.settings.difficulty,
              inputMode: 'microphone',
            };
            party.setUnifiedSetupResult(setupResult);
            // TODO: Add back navigation from competitive game view to setup screen
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
            const setupResult: GameSetupResult = {
              mode: 'blind',
              players: [
                { id: pId, name: pName, color: pColor, playerType: 'microphone', micId: 'default', micName: t('partyGameScreens.microphone1') },
              ],
              settings: {
                difficulty: comp.settings.difficulty,
                filterGenre: 'all',
                filterLanguage: 'all',
                filterCombined: true,
                blindFrequency: freqNumberToLabel(comp.settings.blindFrequency),
                bestOf: comp.settings.bestOf,
                hardcore: comp.settings.hardcore,
                escalating: comp.settings.escalating,
              },
              songSelection: 'random',
              difficulty: comp.settings.difficulty,
              inputMode: 'microphone',
            };
            party.setUnifiedSetupResult(setupResult);
            setGameMode('blind');
            setSong(song);
            setScreen('game');
          }}
        />
      )}

      {/* Challenge Pre-Singing Overlay (Rate my Song) */}
      {screen === 'game' && rmsGameMode === 'rate-my-song' && party.rateMySongCurrentChallenge && !challengeOverlayDismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border border-purple-500/30 rounded-2xl p-8 max-w-md text-center animate-fade-in">
            <div className="text-5xl mb-4">{party.rateMySongCurrentChallenge.icon}</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {language === 'de' ? party.rateMySongCurrentChallenge.titleDe : party.rateMySongCurrentChallenge.titleEn}
            </h2>
            <p className="text-white/70 text-sm mb-6">
              {language === 'de' ? party.rateMySongCurrentChallenge.descriptionDe : party.rateMySongCurrentChallenge.descriptionEn}
            </p>
            <p className="text-amber-400 text-xs mb-4">+50 Bonus Points if mastered!</p>
            <button
              onClick={() => setChallengeOverlayDismissed(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:from-purple-400 hover:to-pink-400 transition-all"
            >
              Let&apos;s go! 🎤
            </button>
          </div>
        </div>
      )}

      {/* Rate my Song Setup */}
      {screen === 'rate-my-song' && (
        <RateMySongSetupScreen
          profiles={profiles}
          onStart={(settings, playerIds) => {
            party.setRateMySongSettings(settings);
            party.setRateMySongPlayerIds(playerIds);
            setRateMySongResult(null);
            // Reset challenge overlay so it shows for the new round
            setChallengeOverlayDismissed(false);

            // Reset series state for new game
            if (!party.rateMySongSeriesHistory || party.rateMySongSeriesHistory.length === 0) {
              setRateMySongSeriesRound(1);
              party.resetRateMySongSeries();
            }

            // Draw a challenge if enabled
            if (settings.challengesEnabled) {
              const challenge = getRandomChallenge();
              party.setRateMySongCurrentChallenge(challenge);
            } else {
              party.setRateMySongCurrentChallenge(null);
            }

            const song = getAllSongs().find(s => s.id === settings.songId);
            if (!song) return;

            resetGame();
            setGameMode('rate-my-song');

            // If short mode, trim song to 60 seconds
            if (settings.duration === 'short') {
              setSong(trimSongToShortMode(song));
            } else {
              setSong(song);
            }

            // Add players
            setPlayers([]);
            const setupResult: GameSetupResult = {
              mode: 'rate-my-song',
              players: playerIds.map((id, i) => {
                const p = profiles.find(pr => pr.id === id);
                return {
                  id,
                  name: p?.name || `Player ${i + 1}`,
                  color: p?.color || '#FF6B6B',
                  playerType: 'microphone' as const,
                  micId: 'default',
                  micName: t('partyGameScreens.microphone1').replace('1', String(i + 1)),
                };
              }),
              settings: { difficulty: 'medium', filterGenre: 'all', filterLanguage: 'all', filterCombined: true },
              songSelection: 'library',
              difficulty: 'medium',
              inputMode: 'mixed',
            };
            party.setUnifiedSetupResult(setupResult);
            playerIds.forEach((id, _i) => {
              const p = profiles.find(pr => pr.id === id);
              if (p) addPlayer({ id: p.id, name: p.name, color: p.color });
            });

            setScreen('game');
          }}
          onBack={() => setScreen('party')}
        />
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
            return { id, name: p?.name || 'Player', color: p?.color || '#FF6B6B' };
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
                toast({ title: '💰 Betting Result', description: `${totalBetPoints} total bet points exchanged this round!` });
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
              toast({ title: '🏆 Challenge Mastered!', description: `+${result.challengeBonus} bonus points earned!` });
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
              setScreen('rate-my-song');
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
