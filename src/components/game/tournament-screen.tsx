'use client';

/**
 * Tournament screens — orchestrator (task R12).
 *
 * Public surface unchanged: the three exported screen components keep their
 * exact signatures; consumers keep importing from
 * '@/components/game/tournament-screen'.
 *
 * Split modules (all bodies extracted 1:1 / byte-identical):
 * - tournament/setup-screen.tsx — TournamentSetupScreen: settings cards,
 *   player selection + hall-of-fame view (useTournamentSetup)
 * - tournament/bracket-view.tsx — TournamentBracketView: header badges,
 *   champion display, next-match preview, fan favorites, manual-winner +
 *   abort dialogs, NextPlayerChip (useTournamentBracket)
 * - tournament/results-screen.tsx — TournamentResultsScreen: podium, full
 *   standings, highlights, fan favorites + PlayerResultCard
 *   (useTournamentResults)
 * - tournament/double-elimination-bracket.tsx — DoubleEliminationBracketView
 *   (#4) with DEMatchCard / DESmallPlayer (winners + losers + grand finals)
 */

export { TournamentSetupScreen } from './tournament/setup-screen';
export { TournamentBracketView } from './tournament/bracket-view';
export { TournamentResultsScreen } from './tournament/results-screen';
