'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs } from '@/lib/game/song-library';
import { recordMatchResult } from '@/lib/game/tournament';
import { TournamentSetupScreen, TournamentBracketView } from '@/components/game/tournament-screen';
import { BattleRoyaleSetupScreen, BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import { PassTheMicSetupScreen } from '@/components/game/pass-the-mic-screen';
import { PtmGameScreen } from '@/components/game/ptm-game-screen';
import { CompanionSingAlongSetupScreen, CompanionGameView } from '@/components/game/companion-singalong-screen';
import { MedleySetupScreen } from '@/components/game/medley';
import { MedleyGameScreen } from '@/components/game/medley/medley-game-screen';
import type { MedleyPlayer, MedleySettings, SnippetMatchup, MedleyRoundResult } from '@/components/game/medley/medley-types';
import { CompetitiveSetupScreen, CompetitiveGameView } from '@/components/game/competitive-words-blind-screen';
import { RateMySongSetupScreen, RateMySongRatingScreen, RateMySongResultsScreen } from '@/components/game/rate-my-song-screen';
import type { RateMySongResult } from '@/components/game/rate-my-song-screen';
import type { GameSetupResult } from '@/components/game/unified-party-setup';
import { preparePtmNextSong } from '@/lib/game/ptm-next-song';
import { toast } from '@/hooks/use-toast';
import type { Screen } from '@/types/screens';

interface PartyGameScreensProps {
  screen: Screen;
  setScreen: (s: Screen) => void;
}

// ===================== PARTY GAME MODE SCREENS =====================
export function PartyGameScreens({ screen, setScreen }: PartyGameScreensProps) {
  const { profiles, setGameMode, setSong, resetGame, addPlayer, setPlayers } = useGameStore();
  const party = usePartyStore();

  // State for Rate my Song results
  const [rateMySongResult, setRateMySongResult] = useState<RateMySongResult | null>(null);

  // State for PTM next-song loading
  const [ptmNextLoading, setPtmNextLoading] = useState(false);

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
  ) => {
    if (!match.player1 || !match.player2) return;

    // Set up mic assignments: check companion connections
    let p1Mic = 'Mikrofon 1';
    let p2Mic = 'Mikrofon 2';

    try {
      const res = await fetch('/api/mobile?action=getprofiles');
      if (res.ok) {
        const data = await res.json();
        const connectedProfiles: Array<{ id: string; name: string; clientId?: string }> = Array.isArray(data) ? data : [];

        const p1Companion = connectedProfiles.find(p =>
          p.id === match.player1.id || p.name === match.player1.name
        );
        const p2Companion = connectedProfiles.find(p =>
          p.id === match.player2.id || p.name === match.player2.name
        );

        // Companion-connected players sing via companion app
        if (p1Companion) p1Mic = 'Companion';
        if (p2Companion) p2Mic = 'Companion';

        // If both players are companions, one still needs a mic (shouldn't happen in 1v1)
        // If both use mics, that's the default
      }
    } catch {
      // Silently fail — default to Mic 1 / Mic 2
    }

    // Show mic assignment overlay with countdown
    setMicOverlay({
      p1Name: match.player1.name,
      p2Name: match.player2.name,
      p1Mic,
      p2Mic,
      countdown: 3,
    });
  }, []);

  // Countdown timer for mic assignment overlay
  useEffect(() => {
    if (!micOverlay) return;

    if (micOverlayTimerRef.current) clearTimeout(micOverlayTimerRef.current);

    if (micOverlay.countdown <= 0) {
      // Time's up — actually start the match
      micOverlayTimerRef.current = null;
      const match = party.currentTournamentMatch;
      if (!match) return;

      setMicOverlay(null);

      // Reset game state for new match
      resetGame();

      // Store mic assignments in unifiedSetupResult for MicIndicator display
      const setupResult: GameSetupResult = {
        players: [
          { id: match.player1!.id, name: match.player1!.name, color: match.player1!.color || '#FF6B6B', playerType: micOverlay.p1Mic === 'Companion' ? 'companion' : 'microphone', micId: 'default', micName: micOverlay.p1Mic },
          { id: match.player2!.id, name: match.player2!.name, color: match.player2!.color || '#4ECDC4', playerType: micOverlay.p2Mic === 'Companion' ? 'companion' : 'microphone', micId: 'default', micName: micOverlay.p2Mic },
        ],
        settings: {},
        songSelection: 'random',
        difficulty: 'medium',
        inputMode: 'microphone',
      };
      party.setUnifiedSetupResult(setupResult);

      // Add both players for the duel
      addPlayer({ id: match.player1.id, name: match.player1.name, avatar: match.player1.avatar, color: match.player1.color });
      addPlayer({ id: match.player2.id, name: match.player2.name, avatar: match.player2.avatar, color: match.player2.color });

      setGameMode('duel');

      const songs = getAllSongs();
      if (songs.length > 0) {
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        setSong(randomSong);
        setScreen('game');
      }
      return;
    }

    micOverlayTimerRef.current = setTimeout(() => {
      setMicOverlay(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : null);
    }, 1000);

    return () => { if (micOverlayTimerRef.current) clearTimeout(micOverlayTimerRef.current); };
  }, [micOverlay, party.currentTournamentMatch, resetGame, addPlayer, setGameMode, setSong, setScreen, getAllSongs, party]);

  return (
    <>
      {/* Tournament Mic Assignment Overlay */}
      {micOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
            <div className="text-4xl mb-4">🎤</div>
            <h2 className="text-xl font-bold text-white mb-6">Mikrofon-Zuweisung</h2>
            <div className="text-lg font-bold text-amber-400 animate-pulse mb-6">{micOverlay.countdown}</div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-lg font-bold text-cyan-400 shrink-0">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{micOverlay.p1Name}</div>
                  <div className="text-sm text-cyan-400">singt mit <b>{micOverlay.p1Mic}</b></div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400 shrink-0">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{micOverlay.p2Name}</div>
                  <div className="text-sm text-purple-400">singt mit <b>{micOverlay.p2Mic}</b></div>
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
              setPtmNextLoading(true);
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
                    ...party.passTheMicSettings,
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
                    ...party.passTheMicSettings,
                    segmentDuration: action.result.segmentDuration,
                  });
                  party.setIsSongPlaying(false);
                  setScreen('pass-the-mic-game');
                } else {
                  // Fallback to library
                  setScreen('library');
                }
              } catch (err) {
                console.error('[PTM] Failed to prepare next song:', err);
                toast({ title: 'Fehler', description: 'Nächstes Lied konnte nicht geladen werden.', variant: 'destructive' });
                setScreen('library');
              } finally {
                setPtmNextLoading(false);
              }
            } else if (targetScreen === 'song-voting') {
              // Re-generate voting songs from filtered pool
              const { filterSongs } = await import('@/lib/game/song-library');
              const songs = getAllSongs();
              const filters = party.unifiedSetupResult?.settings || {};
              const filtered = filterSongs(songs, filters.filterGenre, filters.filterLanguage, filters.filterCombined);
              const suggested = filtered.sort(() => Math.random() - 0.5).slice(0, 5);
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

      {/* Tournament Setup Screen */}
      {screen === 'tournament' && (
        <TournamentSetupScreen
          profiles={profiles}
          songs={getAllSongs()}
          onStartTournament={(bracket, songDuration) => {
            party.setTournamentBracket(bracket);
            party.setTournamentSongDuration(songDuration);
            setScreen('tournament-game');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Tournament Game Screen */}
      {screen === 'tournament-game' && party.tournamentBracket && (
        <TournamentBracketView
          bracket={party.tournamentBracket}
          currentMatch={party.currentTournamentMatch}
          matchAborted={party.tournamentMatchAborted}
          onPlayMatch={(match) => {
            startMatchWithMicOverlay(match);
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
            resetGame();
            addPlayer({
              id: match.player1!.id,
              name: match.player1!.name,
              avatar: match.player1!.avatar,
              color: match.player1!.color,
            });
            addPlayer({
              id: match.player2!.id,
              name: match.player2!.name,
              avatar: match.player2!.avatar,
              color: match.player2!.color,
            });
            setGameMode('duel');
            const songs = getAllSongs();
            if (songs.length > 0) {
              const randomSong = songs[Math.floor(Math.random() * songs.length)];
              setSong(randomSong);
              setScreen('game');
            }
          }}
          onAbortHandled={() => {
            party.setTournamentMatchAborted(false);
          }}
          shortMode={party.tournamentSongDuration === 60}
        />
      )}

      {/* Battle Royale Setup Screen */}
      {screen === 'battle-royale' && (
        <BattleRoyaleSetupScreen
          profiles={profiles}
          songs={getAllSongs()}
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
          songs={getAllSongs()}
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
      {screen === 'companion-singalong-game' && party.companionSong && (
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

            {/* Medley Contest Setup Screen (redesigned: FFA + Team modes) */}
      {screen === 'medley' && (
        <MedleySetupScreen
          profiles={profiles}
          onStartGame={(players: MedleyPlayer[], medleySongList: any[], settings: MedleySettings) => {
            party.setMedleyPlayers(players);
            party.setMedleySongs(medleySongList);
            party.setMedleySettings(settings);
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
          songs={getAllSongs()}
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
          songs={getAllSongs()}
          modeType='missing-words'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            party.setCompetitiveGame(null);
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            // Start duel mode with the two players and the selected song
            resetGame();
            setPlayers([]); // Clear any leftover players from previous games
            const p1Color = party.competitiveGame!.players.find(p => p.id === p1Id)?.color || '#FF6B6B';
            const p2Color = party.competitiveGame!.players.find(p => p.id === p2Id)?.color || '#4ECDC4';
            addPlayer({ id: p1Id, name: p1Name, color: p1Color });
            addPlayer({ id: p2Id, name: p2Name, color: p2Color });
            // Set unifiedSetupResult so MicIndicator can display mic assignments
            const setupResult: GameSetupResult = {
              players: [
                { id: p1Id, name: p1Name, color: p1Color, playerType: 'microphone', micId: 'default', micName: 'Mikrofon 1' },
                { id: p2Id, name: p2Name, color: p2Color, playerType: 'microphone', micId: 'default', micName: 'Mikrofon 2' },
              ],
              settings: {},
              songSelection: 'random',
              difficulty: party.competitiveGame!.settings.difficulty,
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
          songs={getAllSongs()}
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
          songs={getAllSongs()}
          modeType='blind'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            party.setCompetitiveGame(null);
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            resetGame();
            setPlayers([]);
            const p1Color = party.competitiveGame!.players.find(p => p.id === p1Id)?.color || '#FF6B6B';
            const p2Color = party.competitiveGame!.players.find(p => p.id === p2Id)?.color || '#4ECDC4';
            addPlayer({ id: p1Id, name: p1Name, color: p1Color });
            addPlayer({ id: p2Id, name: p2Name, color: p2Color });
            // Set unifiedSetupResult so MicIndicator can display mic assignments
            const setupResult: GameSetupResult = {
              players: [
                { id: p1Id, name: p1Name, color: p1Color, playerType: 'microphone', micId: 'default', micName: 'Mikrofon 1' },
                { id: p2Id, name: p2Name, color: p2Color, playerType: 'microphone', micId: 'default', micName: 'Mikrofon 2' },
              ],
              settings: {},
              songSelection: 'random',
              difficulty: party.competitiveGame!.settings.difficulty,
              inputMode: 'microphone',
            };
            party.setUnifiedSetupResult(setupResult);
            setGameMode('blind');
            setSong(song);
            setScreen('game');
          }}
        />
      )}

      {/* Rate my Song Setup */}
      {screen === 'rate-my-song' && (
        <RateMySongSetupScreen
          profiles={profiles}
          onStart={(settings, playerIds) => {
            party.setRateMySongSettings(settings);
            party.setRateMySongPlayerIds(playerIds);
            setRateMySongResult(null);
            const song = getAllSongs().find(s => s.id === settings.songId);
            if (!song) return;

            resetGame();
            setGameMode('rate-my-song');

            // If short mode, trim song to 60 seconds
            if (settings.duration === 'short') {
              setSong({ ...song, start: song.start, end: Math.min((song.start || 0) + 60000, song.end || song.duration) });
            } else {
              setSong(song);
            }

            // Add players
            setPlayers([]);
            const setupResult: GameSetupResult = {
              players: playerIds.map((id, i) => {
                const p = profiles.find(pr => pr.id === id);
                return {
                  id,
                  name: p?.name || `Player ${i + 1}`,
                  color: p?.color || '#FF6B6B',
                  playerType: 'microphone' as const,
                  micId: 'default',
                  micName: `Mikrofon ${i + 1}`,
                };
              }),
              settings: {},
              songSelection: 'library',
              difficulty: 'medium',
              inputMode: 'mixed',
            };
            party.setUnifiedSetupResult(setupResult);
            playerIds.forEach((id, i) => {
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
        <RateMySongRatingScreen
          songTitle={getAllSongs().find(s => s.id === party.rateMySongSettings.songId)?.title || ''}
          songArtist={getAllSongs().find(s => s.id === party.rateMySongSettings.songId)?.artist || ''}
          singingPlayers={party.rateMySongPlayerIds.map(id => {
            const p = profiles.find(pr => pr.id === id);
            return { id, name: p?.name || 'Player', color: p?.color || '#FF6B6B' };
          })}
          allProfiles={profiles}
          onSubmit={(ratings) => {
            const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
            setRateMySongResult({
              songTitle: getAllSongs().find(s => s.id === party.rateMySongSettings.songId)?.title || '',
              songArtist: getAllSongs().find(s => s.id === party.rateMySongSettings.songId)?.artist || '',
              ratings,
              averageRating: Math.round(avg * 10) / 10,
            });
            setScreen('rate-my-song-results');
          }}
          onBack={() => setScreen('party')}
        />
      )}

      {/* Rate my Song — Results */}
      {screen === 'rate-my-song-results' && rateMySongResult && (
        <RateMySongResultsScreen
          result={rateMySongResult}
          songId={party.rateMySongSettings?.songId}
          onPlayAgain={() => {
            setRateMySongResult(null);
            setScreen('rate-my-song');
          }}
          onEnd={() => {
            party.setRateMySongSettings(null);
            party.setRateMySongPlayerIds([]);
            setRateMySongResult(null);
            setScreen('home');
          }}
        />
      )}
    </>
  );
}
