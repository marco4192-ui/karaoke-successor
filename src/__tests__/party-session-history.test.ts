import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Party session history — pure localStorage module.
 * jsdom provides a real localStorage implementation.
 */

import {
  recordPartySession,
  getPartySessions,
  getPartyModePlayCounts,
  clearPartySessions,
  getSessionWinner,
  formatSessionTimeAgo,
} from '@/lib/game/party-session-history';

describe('party-session-history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records a session and returns it with id + finishedAt', () => {
    const record = recordPartySession({
      mode: 'pass-the-mic',
      players: [
        { name: 'Anna', color: '#ff0000', score: 120 },
        { name: 'Ben', color: '#00ff00', score: 90 },
      ],
      rounds: 3,
    });
    expect(record).not.toBeNull();
    expect(record!.id).toBeTruthy();
    expect(record!.finishedAt).toBeGreaterThan(0);
    expect(getPartySessions()).toHaveLength(1);
  });

  it('stores newest first and caps at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      recordPartySession({ mode: 'medley', players: [{ name: `P${i}`, score: i }] });
    }
    const sessions = getPartySessions();
    expect(sessions).toHaveLength(50);
    // newest first: the last inserted (P54) leads
    expect(sessions[0].players[0].name).toBe('P54');
  });

  it('computes per-mode play counts', () => {
    recordPartySession({ mode: 'medley', players: [{ name: 'A', score: 1 }] });
    recordPartySession({ mode: 'medley', players: [{ name: 'A', score: 2 }] });
    recordPartySession({ mode: 'battle-royale', players: [{ name: 'B', score: 3 }] });
    const counts = getPartyModePlayCounts();
    expect(counts['medley']).toBe(2);
    expect(counts['battle-royale']).toBe(1);
    expect(counts['pass-the-mic']).toBeUndefined();
  });

  it('clears all sessions', () => {
    recordPartySession({ mode: 'duel', players: [{ name: 'A', score: 1 }] });
    clearPartySessions();
    expect(getPartySessions()).toHaveLength(0);
  });

  it('winner = highest distinct score; tie or solo → null', () => {
    const solo = { mode: 'rate-my-song', players: [{ name: 'Solo', score: 5 }] } as const;
    expect(getSessionWinner({ ...solo, id: 'x', finishedAt: 0 })).toBeNull();

    const tie = {
      mode: 'duel',
      id: 'x',
      finishedAt: 0,
      players: [
        { name: 'A', score: 100 },
        { name: 'B', score: 100 },
      ],
    };
    expect(getSessionWinner(tie)).toBeNull();

    const clear = {
      mode: 'duel',
      id: 'x',
      finishedAt: 0,
      players: [
        { name: 'A', score: 100 },
        { name: 'B', score: 80 },
      ],
    };
    expect(getSessionWinner(clear)?.name).toBe('A');
  });

  it('explicit isWinner flag beats score comparison (tournament champion)', () => {
    const tournament = {
      mode: 'tournament',
      id: 'x',
      finishedAt: 0,
      players: [
        { name: 'Champ', score: 0, isWinner: true },
        { name: 'Other', score: 0 },
      ],
    };
    expect(getSessionWinner(tournament)?.name).toBe('Champ');
  });

  it('survives corrupted localStorage content', () => {
    localStorage.setItem('karaoke-party-session-history', '{not json');
    expect(getPartySessions()).toHaveLength(0);
    // recording still works after corruption
    recordPartySession({ mode: 'blind', players: [{ name: 'A', score: 1 }] });
    expect(getPartySessions()).toHaveLength(1);
  });

  it('formats relative time labels via Intl', () => {
    const now = Date.now();
    const justNow = formatSessionTimeAgo(now, 'en');
    expect(typeof justNow).toBe('string');
    expect(justNow.length).toBeGreaterThan(0);
    // one minute ago → contains "1"
    const oneMin = formatSessionTimeAgo(now - 60_000, 'en');
    expect(oneMin).toMatch(/1|minute/i);
  });
});
