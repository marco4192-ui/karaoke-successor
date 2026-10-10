'use client';

// ═══════════════════════════════════════════════════════════════════════════
// useMobileScreenSync — QR-Runde (Auslagerung aus karaoke-app.tsx)
//
// Der 2-Sekunden-Companion-Sync: baut den kompletten GameState-Push für die
// Mobile-Mirrors zusammen (Party-Intro-Daten aller Modi, Battle-Royale-Live-
// Daten, Turnier-Bracket, Recent Parties, Motto-Party-Konfig) und pusht ihn
// an /api/mobile. Plus: sofortiger debounced Push bei Bracket-Änderungen.
// Der Block war ~320 Zeilen in karaoke-app.tsx — Logik ist 1:1 unverändert.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, type RefObject } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getAllSongs } from '@/lib/game/song-library';
import { getPlayableMatches } from '@/lib/game/tournament';
import { mottoParty } from '@/lib/game/motto-party';
import type { Screen } from '@/types/screens';
// Mobile-mirror game-state shape (for the recent-parties sync payload)
import type { GameState } from '@/components/screens/mobile/mobile-types';

export interface MobileScreenSyncOptions {
  screen: Screen;
  pauseInitiator: string | null;
  ptmPhase: string | null;
  isPartyActiveDirect: boolean;
  isPartyGameScreen: boolean;
  /** Viral-Charts-Song-IDs (aus useViralCharts) */
  viralSongIds: Set<string>;
  /** Ref, der den Sync-Callback exponiert (wird auch vom Dialog-Push genutzt) */
  syncScreenRef: RefObject<(() => Promise<void>) | null>;
}

export function useMobileScreenSync(opts: MobileScreenSyncOptions) {
  const {
    screen,
    pauseInitiator,
    ptmPhase,
    isPartyActiveDirect,
    isPartyGameScreen,
    viralSongIds,
    syncScreenRef,
  } = opts;

  const party = usePartyStore();

  // ── Sync current screen to mobile companions (every 2s) ──
  useEffect(() => {
    const syncScreen = async () => {
      try {
        // ── Build intro data for ALL party game modes ──
        // Read the party store fresh at call time (NOT via closure) — the effect
        // deps intentionally exclude the party store object; otherwise every
        // per-frame score update would re-run this effect and spam the mobile
        // sync endpoint + console log.
        const partyNow = usePartyStore.getState();
        const isPartyIntro = ptmPhase === 'intro' && isPartyGameScreen;
        // Type matches ptmIntroData shape from mobile-types.ts GameState
        type PartyIntroData = {
          songTitle?: string;
          songArtist?: string;
          startPlayerName?: string;
          startPlayerAvatar?: string;
          startPlayerColor?: string;
          playerCount?: number;
          isMedley?: boolean;
          medleySnippetCount?: number;
          roundNumber?: number;
          totalRounds?: number;
          sharedMicName?: string;
          mediaLoaded?: boolean;
          partyGameMode?: string;
          vsPlayerName?: string;
          vsPlayerAvatar?: string;
          vsPlayerColor?: string;
          brPlayers?: { name: string; avatar?: string; color?: string }[];
        } | null;
        let introData: PartyIntroData = null;
        if (isPartyIntro) {
          const gameMode = partyNow.selectedGameMode;
          // Common base fields
          const base = {
            mediaLoaded: true,
            partyGameMode: gameMode || undefined,
          };

          if (screen === 'pass-the-mic-game' || screen === 'companion-singalong-game') {
            introData = {
              ...base,
              songTitle: partyNow.passTheMicSong?.title || partyNow.cptmSong?.title || undefined,
              songArtist: partyNow.passTheMicSong?.artist || partyNow.cptmSong?.artist || undefined,
              startPlayerName: (partyNow.passTheMicPlayers[0] || partyNow.cptmPlayers[0])?.name || undefined,
              startPlayerAvatar: (partyNow.passTheMicPlayers[0] || partyNow.cptmPlayers[0])?.avatar || undefined,
              startPlayerColor: (partyNow.passTheMicPlayers[0] || partyNow.cptmPlayers[0])?.color || undefined,
              playerCount: partyNow.passTheMicPlayers.length || partyNow.cptmPlayers.length || undefined,
              isMedley: partyNow.ptmSongSelection === 'medley' || undefined,
              medleySnippetCount: partyNow.medleySongs?.length || undefined,
              sharedMicName: partyNow.passTheMicSettings?.sharedMicName || undefined,
            };
          } else if (screen === 'medley-game') {
            introData = {
              ...base,
              songTitle: partyNow.medleySongs?.[0]?.song?.title || undefined,
              songArtist: partyNow.medleySongs?.[0]?.song?.artist || undefined,
              startPlayerName: partyNow.medleyPlayers?.[0]?.name || undefined,
              startPlayerAvatar: partyNow.medleyPlayers?.[0]?.avatar || undefined,
              startPlayerColor: partyNow.medleyPlayers?.[0]?.color || undefined,
              playerCount: partyNow.medleyPlayers?.length || undefined,
              isMedley: true,
              medleySnippetCount: partyNow.medleySongs?.length || undefined,
            };
          } else if (screen === 'battle-royale-game') {
            // Battle Royale: badge list of ALL players + round-1 song (if voted)
            const brGame = partyNow.battleRoyaleGame;
            const brPlayers = (brGame?.players || []).map((p) => ({
              name: p.name,
              avatar: p.avatar || undefined,
              color: p.color || undefined,
            }));
            introData = {
              ...base,
              playerCount: brPlayers.length || undefined,
              startPlayerName: brPlayers[0]?.name || undefined,
              startPlayerAvatar: brPlayers[0]?.avatar || undefined,
              startPlayerColor: brPlayers[0]?.color || undefined,
              brPlayers: brPlayers.length > 0 ? brPlayers : undefined,
              // currentRound is 0-based: round 1 = 0
              roundNumber: brGame ? brGame.currentRound + 1 : undefined,
              songTitle: (brGame?.currentRound === 0
                ? brGame?.settings?.firstRoundSongTitle
                : brGame?.rounds?.[brGame.currentRound]?.songName) || undefined,
            };
          } else if (screen === 'rate-my-song-game') {
            introData = {
              ...base,
              playerCount: partyNow.rateMySongPlayerIds?.length || undefined,
            };
          } else if (screen === 'tournament-game') {
            // Tournament: show BOTH duel players + the voted song (if any).
            // Only build data when a match is actually pending
            // (currentTournamentMatch is null while the bracket is on screen).
            const match = partyNow.currentTournamentMatch;
            if (match?.player1 && match?.player2) {
              introData = {
                ...base,
                songTitle: partyNow.tournamentVotedSong?.title || undefined,
                songArtist: partyNow.tournamentVotedSong?.artist || undefined,
                startPlayerName: match.player1.name,
                startPlayerAvatar: match.player1.avatar || undefined,
                startPlayerColor: match.player1.color || undefined,
                vsPlayerName: match.player2.name,
                vsPlayerAvatar: match.player2.avatar || undefined,
                vsPlayerColor: match.player2.color || undefined,
                playerCount: 2,
                roundNumber: partyNow.tournamentBracket?.currentRound || undefined,
                totalRounds: partyNow.tournamentBracket?.totalRounds || undefined,
              };
            }
          } else {
            // Generic competitive modes (missing-words, blind, tournament)
            introData = {
              ...base,
              songTitle: partyNow.competitiveGame?.rounds?.[0]?.songTitle || undefined,
              playerCount: partyNow.competitiveGame?.players?.length || undefined,
              startPlayerName: partyNow.competitiveGame?.players?.[0]?.name || undefined,
              startPlayerColor: partyNow.competitiveGame?.players?.[0]?.color || undefined,
            };
          }
        }

        // ── Item 8.1: Battle Royale LIVE game data ─────────────────────
        // Pushed whenever the BR screen is active (intro AND playing) so the
        // companion BR in-game mirror can show the current (snippet) song,
        // the round number and live player scores. Avatars are stripped to
        // keep the 2s-poll payload small (color + initial only).
        let brGameData: GameState['brGameData'] = null;
        // BR never sets the standard game-store song — keep the companion's
        // gameState.currentSong stable (the 2s spread below would otherwise
        // push null and fight with the BR hook's useMobileGameSync pushes).
        let brSongPayload: { id: string; title: string; artist: string } | null = null;
        if (screen === 'battle-royale-game') {
          const brGame = partyNow.battleRoyaleGame;
          if (brGame) {
            // Current (snippet) song: medley snippet or the round's main song.
            const brSnippet = brGame.medleySnippetList.length > 0
              ? brGame.medleySnippetList[brGame.currentSnippetIndex]
              : null;
            const brSongId = brSnippet?.songId ?? brGame.rounds?.[brGame.currentRound]?.songId ?? null;
            const brSongTitle = brSnippet?.songName
              ?? brGame.rounds?.[brGame.currentRound]?.songName
              ?? (brGame.currentRound === 0 ? brGame.settings?.firstRoundSongTitle : undefined)
              ?? undefined;
            const brSongArtist = brSongId
              ? getAllSongs().find(s => s.id === brSongId)?.artist
              : undefined;
            if (brSongTitle) {
              brSongPayload = { id: brSongId ?? '', title: brSongTitle, artist: brSongArtist ?? '' };
            }
            brGameData = {
              status: brGame.status,
              roundNumber: brGame.currentRound + 1,
              songTitle: brSongTitle,
              songArtist: brSongArtist,
              snippetIndex: brGame.currentSnippetIndex,
              snippetCount: brGame.medleySnippetList.length,
              players: brGame.players.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color || '#EF4444',
                score: p.score,
                eliminated: p.eliminated,
                playerType: p.playerType === 'companion' ? 'companion' : 'microphone',
              })),
              // Voting phase (6.2): push options + live votes so companion
              // apps can vote from their phone — including round 2+ votes.
              voteOptions: brGame.status === 'voting' && brGame.voteOptions
                ? brGame.voteOptions.map(o => ({
                  songName: o.songName,
                  votes: o.votes,
                  votedPlayerIds: o.votedPlayerIds,
                }))
                : undefined,
            };
          }
        }

        // ── Tournament bracket mirror: while the bracket is on screen (no duel
        // pending, intro phase), companions receive the list of OPEN duels so
        // they can display and start them (user request: companion bracket view).
        // Avatars are stripped — colors + initials keep the payload small.
        let tournamentBracketData: GameState['tournamentBracketData'] = null;
        if (screen === 'tournament-game' && isPartyActiveDirect && ptmPhase === 'intro' && !partyNow.currentTournamentMatch) {
          const b = partyNow.tournamentBracket;
          if (b) {
            const openMatches = getPlayableMatches(b)
              .filter(m => m.player1 && m.player2)
              .sort((a, x) => a.round - x.round
                || (a.bracketType === x.bracketType ? 0 : a.bracketType === 'winners' ? -1 : x.bracketType === 'winners' ? 1 : a.bracketType === 'losers' ? -1 : 1)
                || a.position - x.position)
              .map(m => ({
                matchId: m.id,
                round: m.round,
                position: m.position,
                bracketType: m.bracketType,
                player1: m.player1 ? { id: m.player1.id, name: m.player1.name, color: m.player1.color } : null,
                player2: m.player2 ? { id: m.player2.id, name: m.player2.name, color: m.player2.color } : null,
              }));
            tournamentBracketData = {
              visible: true,
              currentRound: b.currentRound,
              totalRounds: b.totalRounds,
              remainingPlayers: b.players.filter(p => !p.eliminated).length,
              tournamentType: b.settings.tournamentType,
              status: b.status === 'completed' ? 'completed' : 'in_progress',
              championName: b.champion?.name ?? null,
              votingActive: !!partyNow.tournamentVotingMatch,
              openMatches,
            };
          }
        }

        // Debug: log party intro sync state
        if (isPartyGameScreen) {
          // eslint-disable-next-line no-console
          console.log('[Party-Sync] screen=%s, ptmPhase=%s, isPartyIntro=%s, hasIntroData=%s',
            screen, ptmPhase, isPartyIntro, !!introData);
        }
        // Party screen: sync the recent-parties history so the mobile mirror
        // can render the same "Recent Parties" section (avatars stripped —
        // data-URL avatars would bloat the 2s-poll payload).
        let recentPartiesPayload: GameState['recentParties'];
        if (screen === 'party') {
          try {
            const { getPartySessions, getSessionWinner } = await import('@/lib/game/party-session-history');
            recentPartiesPayload = getPartySessions().slice(0, 6).map(record => {
              const winner = getSessionWinner(record);
              return {
                id: record.id,
                mode: record.mode,
                finishedAt: record.finishedAt,
                rounds: record.rounds,
                songTitle: record.songTitle,
                winner: winner ? { name: winner.name, color: winner.color, score: winner.score, scoreKind: winner.scoreKind } : null,
                players: record.players.map(p => ({
                  name: p.name,
                  color: p.color,
                  score: p.score,
                  isWinner: p.isWinner,
                  scoreKind: p.scoreKind,
                })),
              };
            });
          } catch {
            // history is best-effort for the mirror
          }
        }
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'gamestate',
            payload: {
              ...useGameStore.getState().gameState,
              // BR: keep the companion's currentSong in sync with the current
              // BR (snippet) song instead of the (unset) standard song.
              ...(brSongPayload ? { currentSong: brSongPayload } : {}),
              currentScreen: screen,
              partyGameMode: partyNow.selectedGameMode || null,
              votingSongs: screen === 'song-voting' ? partyNow.votingSongs : [],
              partyLibrarySong: (screen === 'party-setup' || screen === 'library') && partyNow.librarySelectedSong
                ? { id: partyNow.librarySelectedSong.id, title: partyNow.librarySelectedSong.title, artist: partyNow.librarySelectedSong.artist }
                : null,
              isPartyModeActive: isPartyActiveDirect,
              desktopDialog: partyNow.pauseDialogAction,
              pauseInitiator,
              ptmPhase,
              ptmIntroData: introData,
              // Always send the key (null when not on the BR screen) so a
              // finished BR game doesn't leave stale data on the companions.
              brGameData: screen === 'battle-royale-game' ? brGameData : null,
              tournamentBracketData,
              viralSongIds: viralSongIds.size > 0 ? Array.from(viralSongIds) : [],
              // Motto-Party (R25): full config for the companion library —
              // read FRESH at call time (like partyNow above) so changes
              // propagate with the next 2s tick. Explicit null when disabled
              // so companions never keep a stale motto active.
              mottoParty: (() => {
                const m = mottoParty.getConfig();
                if (!m.enabled) return null;
                return {
                  enabled: true,
                  name: m.name,
                  logic: m.logic,
                  searchFields: m.searchFields.map(f => ({ id: f.id, term: f.term })),
                  filters: { ...m.filters },
                };
              })(),
              difficulty: useGameStore.getState().gameState.difficulty || 'medium',
              recentParties: recentPartiesPayload,
            },
          }),
        });
      } catch {
        // Non-critical — screen sync failure doesn't affect the app
      }
    };
    syncScreenRef.current = syncScreen;
    syncScreen();
    const interval = setInterval(syncScreen, 2000);
    return () => clearInterval(interval);
    // NOTE: `party` store object intentionally NOT in deps — syncScreen reads
    // fresh state via usePartyStore.getState(). Including it re-ran this effect
    // on every per-frame score update (~40/s during competitive games),
    // spamming the mobile sync endpoint and the console log.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, pauseInitiator, ptmPhase, isPartyActiveDirect, isPartyGameScreen]);

  // ── Tournament bracket live push ──
  // Bracket changes (duel started / finished, manual winner, vote started or
  // skipped) must reach the companion "open duels" list quickly — waiting for
  // the 2s interval makes the list feel stale. Push immediately (debounced
  // 250ms so a burst of changes results in a single POST).
  const tournamentBracketObj = party.tournamentBracket;
  const currentTournamentMatchObj = party.currentTournamentMatch;
  const tournamentVotingMatchObj = party.tournamentVotingMatch;
  useEffect(() => {
    const id = setTimeout(() => { void syncScreenRef.current?.(); }, 250);
    return () => clearTimeout(id);
  }, [tournamentBracketObj, currentTournamentMatchObj, tournamentVotingMatchObj, syncScreenRef]);
}
