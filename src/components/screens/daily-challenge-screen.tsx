'use client';

// Daily Challenge Screen — orchestrator
//
// Delegates all state/derived data to {@link useDailyChallengeData} and all
// rendering to the tab components in ./daily-challenge/. Same public API as
// before: `export function DailyChallengeScreen({ onPlayChallenge })`.

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import { Song, GameMode } from '@/types/game';
import { useDailyChallengeData } from './daily-challenge/use-daily-challenge-data';
import { PlayerSelectionCard } from './daily-challenge/player-selection-card';
import { DailyTab } from './daily-challenge/daily-tab';
import { WeeklyTab } from './daily-challenge/weekly-tab';
import { ModesTab } from './daily-challenge/modes-tab';
import { LeaderboardTab } from './daily-challenge/leaderboard-tab';
import { BadgesTab } from './daily-challenge/badges-tab';
import { PlayerProgressSection } from './daily-challenge/player-progress-section';

// ===================== DAILY CHALLENGE SCREEN =====================
export function DailyChallengeScreen({ onPlayChallenge }: { onPlayChallenge: (_song: Song, _options?: { gameMode?: GameMode; playerIds?: string[] }) => void }) {
  const { t } = useTranslation();
  const data = useDailyChallengeData(onPlayChallenge);
  const {
    activeTab,
    setActiveTab,
    tabsRef,
    tabsHighlighted,
    hasPlayer,
  } = data;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('dailyChallengeScreen.title')}</h1>
        <p className="text-white/60">{t('dailyChallengeScreen.description')}</p>
      </div>

      {/* ═══ STEP 1 · Spieler wählen — the guided flow starts here. Without a
          player everything below stays hidden. The FIRST selected player also
          owns the statistics section at the bottom (no duplicate selection). ═══ */}
      <PlayerSelectionCard data={data} />

      {/* Without a player the challenge selection (and everything below) stays hidden */}
      {!hasPlayer ? (
        <div className="text-center py-14 text-white/40" data-testid="daily-player-gate">
          <div className="text-5xl mb-3" aria-hidden>🎤</div>
          <p className="text-sm max-w-md mx-auto">{t('dailyChallengeScreen.selectPlayerFirst')}</p>
        </div>
      ) : (
        <>
      {/* ── Tab navigation (top) — anchor point after the first player pick:
          scrolled into view + highlight pulse (see togglePlayer) ── */}
      <div
        ref={tabsRef}
        className={`flex gap-2 mb-6 flex-wrap scroll-mt-4 rounded-xl transition-all duration-700 ${
          tabsHighlighted ? 'ring-2 ring-cyan-400 shadow-[0_0_36px_rgba(34,211,238,0.35)]' : ''
        }`}
        role="tablist"
        aria-label={t('dailyChallengeScreen.title')}
      >
        {([
          ['challenge', 'dailyChallengeScreen.challenges'],
          ['weekly', 'dailyChallengeScreen.weeklyChallenge'],
          ['modes', 'dailyChallengeScreen.challengeModes'],
          ['leaderboard', 'dailyChallengeScreen.leaderboard'],
          ['badges', 'dailyChallengeScreen.badges'],
        ] as const).map(([tab, key]) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
          >
            {t(key)}
          </Button>
        ))}
      </div>

      {/* ══ TAB: Daily Challenges (5 slots) ══ */}
      {activeTab === 'challenge' && <DailyTab data={data} />}

      {/* ══ TAB: Weekly Challenges (5 slots, own difficulty) — same
          3-step structure as the daily tab: player (step 1, top) → pick a
          weekly slot → pick a song. Weekly slots count every sung song
          automatically, so playing from here is pure convenience. ══ */}
      {activeTab === 'weekly' && <WeeklyTab data={data} />}

      {/* ══ TAB: Challenge Modes (71 modes, filter + completion) — same
          3-step structure: player (step 1, top) → pick a mode → pick a song ══ */}
      {activeTab === 'modes' && <ModesTab data={data} onPlayChallenge={onPlayChallenge} />}

      {/* ══ TAB: Leaderboard ══ */}
      {activeTab === 'leaderboard' && <LeaderboardTab data={data} />}

      {/* ══ TAB: Badges ══ */}
      {activeTab === 'badges' && <BadgesTab data={data} />}

      {/* ── Player progress section (bottom): ALWAYS follows the FIRST
          selected player — no duplicate statistics player selection.
          Renders nothing until a player is picked (see hook: viewProfile). ── */}
      <PlayerProgressSection data={data} />
        </>
      )}
    </div>
  );
}
