import { useState, useCallback, useRef } from 'react';
import type { MedleyPlayer, SnippetMatchup, TeamBonusResult } from '../medley-types';
import { computeSynergy, computeComebackPreCheck, computeComebackFinalize, computeMVP as computeMVPPure } from '../medley-team-bonuses';

// ===================== PARAMS =====================

export interface UseMedleyTeamBonusesParams {
  isTeam: boolean;
  teamBonusesEnabled: boolean;
  currentSnippetIdx: number;
  totalSnippets: number;
  matchups: SnippetMatchup[];
  playersRef: React.MutableRefObject<MedleyPlayer[]>;
  snippetScoreSnapshotsRef: React.MutableRefObject<Record<string, { score: number; combo: number }>>;
}

// ===================== RETURN =====================

export interface UseMedleyTeamBonusesReturn {
  synergyTriggered: boolean;
  comebackTriggered: boolean;
  comebackTeamId: number | null;
  comebackActiveTeamId: number | null;
  teamBonusResult: TeamBonusResult;
  checkSynergy: () => void;
  preCheckComeback: (snippetIdx: number) => void;
  finalizeComeback: () => void;
  computeMVP: () => void;
  syncTeamBonusResult: () => void;
  /** Ref for comeback team — used in game loop scoring to avoid stale closures & game loop restarts */
  comebackActiveTeamIdRef: React.MutableRefObject<number | null>;
  teamBonusResultRef: React.MutableRefObject<TeamBonusResult>;
}

// ===================== HOOK =====================

/**
 * Feature #18: Team bonus mechanics — synergy, comeback, MVP.
 * All pure computation is delegated to `medley-team-bonuses.ts`.
 */
export function useMedleyTeamBonuses({
  isTeam,
  teamBonusesEnabled,
  currentSnippetIdx,
  totalSnippets,
  matchups,
  playersRef,
  snippetScoreSnapshotsRef,
}: UseMedleyTeamBonusesParams): UseMedleyTeamBonusesReturn {
  const [synergyTriggered, setSynergyTriggered] = useState(false);
  const [comebackTriggered, setComebackTriggered] = useState(false);
  const [comebackTeamId, setComebackTeamId] = useState<number | null>(null);
  const [comebackActiveTeamIdState, setComebackActiveTeamIdState] = useState<number | null>(null);
  /** Ref for comeback team — used in game loop scoring to avoid stale closures & game loop restarts */
  const comebackActiveTeamIdRef = useRef<number | null>(null);
  const [teamBonusResultState, setTeamBonusResultState] = useState<TeamBonusResult>({
    synergyPoints: {},
    comebackTeamId: null,
    comebackMultiplier: 1,
    mvpPlayerId: null,
    teamBonusTotal: {},
  });
  const teamBonusResultRef = useRef<TeamBonusResult>({
    synergyPoints: {},
    comebackTeamId: null,
    comebackMultiplier: 1,
    mvpPlayerId: null,
    teamBonusTotal: {},
  });
  /** Helper to sync teamBonusResult ref to state for UI */
  const syncTeamBonusResult = useCallback(() => {
    setTeamBonusResultState({ ...teamBonusResultRef.current });
  }, []);

  // ── Feature #18: Check for team synergy (delegates to pure function) ──
  const checkSynergy = useCallback(() => {
    const result = computeSynergy({
      isTeam,
      teamBonusesEnabled,
      snippetIdx: currentSnippetIdx,
      matchups,
      players: playersRef.current,
      currentBonusResult: teamBonusResultRef.current,
    });
    if (!result) return;

    // Apply synergy results to refs
    for (const [teamId, pts] of Object.entries(result.synergyPoints)) {
      teamBonusResultRef.current.synergyPoints[teamId] = pts;
      teamBonusResultRef.current.teamBonusTotal[teamId] = (teamBonusResultRef.current.teamBonusTotal[teamId] || 0) + 300;
    }
    for (const bonus of result.playerBonuses) {
      const p = playersRef.current.find(p => p.id === bonus.playerId);
      if (p) p.score += bonus.points;
    }
    setSynergyTriggered(true);
    setTimeout(() => setSynergyTriggered(false), 2000);
  }, [isTeam, teamBonusesEnabled, currentSnippetIdx, matchups]);

  // ── Feature #18: Pre-check comeback boost BEFORE the last snippet starts ──
  const preCheckComeback = useCallback((snippetIdx: number) => {
    const result = computeComebackPreCheck({
      isTeam,
      teamBonusesEnabled,
      snippetIdx,
      totalSnippets,
      players: playersRef.current,
    });
    if (!result) {
      comebackActiveTeamIdRef.current = null;
      setComebackActiveTeamIdState(null);
      return;
    }

    teamBonusResultRef.current.comebackTeamId = result.teamId;
    teamBonusResultRef.current.comebackMultiplier = result.multiplier;
    comebackActiveTeamIdRef.current = result.underdogTeam;
    setComebackActiveTeamIdState(result.underdogTeam);
    setComebackTriggered(true);
    setComebackTeamId(result.underdogTeam);
    setTimeout(() => { setComebackTriggered(false); setComebackTeamId(null); }, 3000);
  }, [isTeam, teamBonusesEnabled, totalSnippets]);

  // ── Feature #18: Calculate comeback bonus AFTER the last snippet ends ──
  const finalizeComeback = useCallback(() => {
    const bonus = computeComebackFinalize({
      isTeam,
      teamBonusesEnabled,
      comebackTeamId: teamBonusResultRef.current.comebackTeamId,
      players: playersRef.current,
      snippetScoreSnapshots: snippetScoreSnapshotsRef.current,
    });
    if (bonus > 0 && teamBonusResultRef.current.comebackTeamId) {
      const teamId = teamBonusResultRef.current.comebackTeamId;
      const currentBonus = teamBonusResultRef.current.teamBonusTotal[teamId] || 0;
      teamBonusResultRef.current.teamBonusTotal[teamId] = currentBonus + bonus;
    }
    comebackActiveTeamIdRef.current = null;
    setComebackActiveTeamIdState(null);
  }, [isTeam, teamBonusesEnabled, snippetScoreSnapshotsRef]);

  // ── Feature #18: Compute MVP (delegates to pure function) ──
  const computeMVPHook = useCallback(() => {
    if (!isTeam || !teamBonusesEnabled) return;
    const mvpId = computeMVPPure(playersRef.current);
    if (mvpId) teamBonusResultRef.current.mvpPlayerId = mvpId;
  }, [isTeam, teamBonusesEnabled]);

  return {
    synergyTriggered,
    comebackTriggered,
    comebackTeamId,
    comebackActiveTeamId: comebackActiveTeamIdState,
    teamBonusResult: teamBonusResultState,
    checkSynergy,
    preCheckComeback,
    finalizeComeback,
    computeMVP: computeMVPHook,
    syncTeamBonusResult,
    comebackActiveTeamIdRef,
    teamBonusResultRef,
  };
}