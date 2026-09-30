'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameState, MobileView, DailyProfileState } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import {
  getDailyType,
  getWeeklyType,
  DAILY_DIFFICULTIES,
  DAILY_BADGES,
} from '@/lib/game/daily-challenge';
import { CHALLENGE_MODES } from '@/lib/game/progression-levels';

// ===================== Props =====================

/** Host profile as pushed by the desktop (POST sethostprofiles). */
interface HostProfileLite {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isActive?: boolean;
}

interface MirrorDailyLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string, data?: unknown) => void;
  /** R33-d2: true when this phone holds the remote-control lock. */
  isControlling?: boolean;
  /** R33-d2: the companion player's own profile id. */
  profileId?: string | null;
  /** R33-d2: Daily-Challenge snapshots per profile (GET getdailystate). */
  dailyState?: Record<string, DailyProfileState> | null;
  /** R33-d2: ask the shell to (re)load the daily snapshots. */
  onLoadDailyState?: () => void;
}

// ===================== i18n-Hilfe =====================

/** t(key) gibt den Key selbst zurück, wenn keine Übersetzung existiert. */
function tOr(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

/** Gemeinsame Scroll-Klasse: schlanke Neon-Scrollbar (globals.css R38). */
const SCROLL_AREA = 'overflow-y-auto overscroll-contain pr-1 kz-scroll';

// ===================== Tabs (exakte Desktop-Struktur) =====================

type DailyTab = 'challenge' | 'weekly' | 'modes' | 'leaderboard' | 'badges';

const DAILY_TABS: { id: DailyTab; icon: string; labelKey: string; fallback: string }[] = [
  { id: 'challenge',  icon: '🎯', labelKey: 'dailyChallengeScreen.challenges',     fallback: 'Herausforderungen' },
  { id: 'weekly',     icon: '📅', labelKey: 'dailyChallengeScreen.weeklyChallenge', fallback: 'Wöchentliche Herausforderung' },
  { id: 'modes',      icon: '🎮', labelKey: 'dailyChallengeScreen.challengeModes',  fallback: 'Challenge-Modi' },
  { id: 'leaderboard',icon: '🏆', labelKey: 'dailyChallengeScreen.leaderboard',    fallback: 'Rangliste' },
  { id: 'badges',     icon: '🎖️', labelKey: 'dailyChallengeScreen.badges',         fallback: 'Abzeichen' },
];

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

/** Localized display name of a daily/weekly type — Desktop-Muster (typeName). */
function typeName(nameKey: string, nameParams: Record<string, string> | undefined, t: (key: string) => string, fallback: string): string {
  let name = t(nameKey);
  if (nameParams) {
    for (const [key, value] of Object.entries(nameParams)) {
      name = name.replaceAll(`{${key}}`, value);
    }
  }
  return name === nameKey ? fallback : name;
}

/** Format a metric value for display (percent types get % — Desktop-Muster). */
function formatDailyValue(metricKey: string, value: number): string {
  if (metricKey === 'accuracy' || metricKey === 'tickAccuracy') {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
  }
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// ===================== Component =====================

export function MirrorDailyLite({
  onSendDesktopCommand,
  isControlling,
  profileId,
  dailyState,
  onLoadDailyState,
}: MirrorDailyLiteProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<DailyTab>('challenge');

    // ── R33/P12: Fallback-Daten — direkt laden, falls die Shell (noch)
    //    keine Daily-Snapshots durchreicht ──
    const [localDaily, setLocalDaily] = useState<Record<string, DailyProfileState> | null>(null);
    const [localError, setLocalError] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
      // Shell-Pfad: Daten über den Hook laden lassen (Props-Aktualisierung)
      onLoadDailyState?.();
      // Eigener Fallback-Pfad, wenn die Shell keine Daten liefert
      if (dailyState) return;
      let cancelled = false;
      setLocalError(false);
      fetch('/api/mobile?action=getdailystate')
        .then((r) => { if (!r.ok) throw new Error('http'); return r.json(); })
        .then((d) => {
          if (cancelled) return;
          if (d?.success && d.daily && typeof d.daily === 'object') {
            setLocalDaily(d.daily as Record<string, DailyProfileState>);
          } else {
            setLocalDaily({});
          }
        })
        .catch(() => { if (!cancelled) setLocalError(true); });
      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadTick]);

    // Host-Profile für die Rangliste (Namen/Farben/Avatare)
    const [hostProfiles, setHostProfiles] = useState<HostProfileLite[]>([]);
    useEffect(() => {
      let cancelled = false;
      fetch('/api/mobile?action=hostprofiles')
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d?.success) return;
          setHostProfiles((d.profiles || []) as HostProfileLite[]);
        })
        .catch(() => { /* Rangliste zeigt dann Initialen */ });
      return () => { cancelled = true; };
    }, []);

    const retry = useCallback(() => {
      haptic();
      setReloadTick((n) => n + 1);
    }, []);

    const handleTab = useCallback(
      (tab: DailyTab) => {
        haptic();
        setActiveTab(tab);
      },
      [],
    );

    // ── Eigene Daily-Daten ──
    const dailyMap = dailyState ?? localDaily;
    const myDaily: DailyProfileState | null = useMemo(
      () => (dailyMap && profileId ? (dailyMap[profileId] ?? null) : null),
      [dailyMap, profileId],
    );
    const loading = dailyState === undefined && localDaily === null && !localError;

    // Challenge-Start (nur steuernd)
    const startSlot = useCallback(
      (slot: number) => {
        haptic();
        onSendDesktopCommand('daily_start', { slot });
      },
      [onSendDesktopCommand],
    );

    // ===================== Render-Hilfen =====================

    const renderSkeleton = () => (
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    );

    const renderError = () => (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-5 text-center">
        <span className="text-3xl" aria-hidden>📡</span>
        <p className="text-sm text-red-300">
          {tOr(t, 'mobile.mirrorLoadError', 'Daten konnten nicht geladen werden.')}
        </p>
        <button
          onClick={retry}
          className="min-h-[44px] rounded-lg border border-red-400/40 bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-300 transition-transform active:scale-95"
        >
          {tOr(t, 'mobile.mirrorRetry', 'Erneut versuchen')}
        </button>
      </div>
    );

    /** Ein Daily-/Weekly-Slot — Desktop-Layout: Icon, Name, Ziel, XP, Häkchen, Schwierigkeiten. */
    const renderSlotCard = (
      slot: { slot: number; type: string; icon: string; target: number; xp: number; completed: boolean; difficultiesMet: string[] },
      weekly: boolean,
    ) => {
      const def = weekly ? getWeeklyType(slot.type) : getDailyType(slot.type);
      const name = typeName(def.nameKey, def.nameParams, t, `${weekly ? 'Weekly' : 'Challenge'} ${slot.slot + 1}`);
      const targetText = formatDailyValue(def.metricKey, slot.target);
      const metSet = new Set(slot.difficultiesMet ?? []);

      return (
        <div
          key={`${weekly ? 'w' : 'd'}${slot.slot}`}
          className={
            'rounded-xl border p-3 ' +
            (slot.completed
              ? 'border-green-500/30 bg-green-500/[0.06] ring-1 ring-green-500/30'
              : 'border-white/[0.08] bg-white/[0.03]')
          }
        >
          {/* Kopf: Icon + Name + Status */}
          <div className="flex items-start gap-3">
            <span className="shrink-0 text-2xl leading-none" aria-hidden>{slot.icon || def.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold text-white">
                  {slot.slot + 1}. {name}
                </h3>
                {slot.completed ? (
                  <span className="shrink-0 rounded border border-green-500/40 bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-300">
                    ✓ {tOr(t, 'dailyChallengeScreen.slotDone', 'Fertig')}
                  </span>
                ) : null}
              </div>
              {/* Ziel + XP */}
              <p className="mt-0.5 text-xs text-white/50">
                {tOr(t, 'dailyChallengeScreen.target', 'Ziel')}:{' '}
                <span className="font-medium text-white/80">{targetText}</span>
                <span className="ml-2 text-cyan-400/80">+{slot.xp} XP</span>
              </p>
              {/* Geschaffte Schwierigkeiten als Badges */}
              {metSet.size > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {DAILY_DIFFICULTIES.filter((d) => metSet.has(d.id)).map((d) => (
                    <span
                      key={d.id}
                      title={tOr(t, 'dailyChallengeScreen.difficultyDoneHint', 'Heute auf dieser Stufe geschafft')}
                      className="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-300"
                    >
                      <span aria-hidden>{d.icon}</span> {tOr(t, d.labelKey, d.id)} ✓
                    </span>
                  ))}
                </div>
              )}
              {/* Start-Button (nur steuernd, nur Daily-Slots, nur wenn offen) */}
              {isControlling && !weekly && !slot.completed && (
                <button
                  onClick={() => startSlot(slot.slot)}
                  className="mt-2 min-h-[44px] w-full rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2.5 text-sm font-semibold text-cyan-300 transition-transform active:scale-[0.97]"
                >
                  ▶ {tOr(t, 'dailyChallengeScreen.slotStart', 'Starten')}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    };

    // ===================== Tab-Inhalte =====================

    const renderChallengeTab = () => {
      if (!myDaily) {
        return (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <span className="text-4xl" aria-hidden>🎯</span>
            <p className="max-w-xs text-sm text-white/50">
              {tOr(t, 'mobile.mirrorDailyNoData', 'Keine Daily-Daten für dein Profil vorhanden.')}
            </p>
          </div>
        );
      }
      const completedCount = myDaily.slots.filter((s) => s.completed).length;
      return (
        <div className="flex flex-col gap-2">
          {/* Fortschritt heute (Bronze 1 / Silber 3 / Gold 5) */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">
                {tOr(t, 'mobile.mirrorSlotsToday', '{n}/{m} Slots heute')
                  .replace('{n}', String(completedCount))
                  .replace('{m}', String(myDaily.slots.length))}
              </span>
              <span className="flex gap-1">
                {(['bronze', 'silver', 'gold'] as const).map((tier, i) => {
                  const thresholds = { bronze: 1, silver: 3, gold: 5 } as const;
                  const reached = completedCount >= thresholds[tier];
                  return (
                    <span
                      key={tier}
                      className={
                        'rounded border px-1.5 py-0.5 text-[10px] font-bold ' +
                        (reached
                          ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
                          : 'border-white/10 bg-white/5 text-white/30')
                      }
                    >
                      {['🥉', '🏅', '🏆'][i]} {thresholds[tier]}
                      {reached ? ' ✓' : ''}
                    </span>
                  );
                })}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-700 to-yellow-400 transition-all"
                style={{ width: `${myDaily.slots.length > 0 ? (completedCount / myDaily.slots.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Die 3 Daily-Slots */}
          {myDaily.slots.map((s) => renderSlotCard(s, false))}
        </div>
      );
    };

    const renderWeeklyTab = () => {
      if (!myDaily) {
        return (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <span className="text-4xl" aria-hidden>📅</span>
            <p className="max-w-xs text-sm text-white/50">
              {tOr(t, 'mobile.mirrorDailyNoData', 'Keine Daily-Daten für dein Profil vorhanden.')}
            </p>
          </div>
        );
      }
      const completedCount = myDaily.weekly.slots.filter((s) => s.completed).length;
      return (
        <div className="flex flex-col gap-2">
          {/* Hinweis wie am Desktop: Weeklys zählen automatisch */}
          <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/50">
            {tOr(t, 'dailyChallengeScreen.weeklyCountsAutomatically', 'Jedes gesungene Lied zählt automatisch für die Weeklys')} ·{' '}
            {tOr(t, 'dailyChallengeScreen.tierProgressWeek', 'Badge-Stufen diese Woche')}:{' '}
            <span className="font-semibold text-white/80">{completedCount}/{myDaily.weekly.slots.length}</span>
          </p>
          {/* Die Weekly-Slots */}
          {myDaily.weekly.slots.map((s) => renderSlotCard(s, true))}
        </div>
      );
    };

    const renderModesTab = () => (
      <div className="flex flex-col gap-2">
        {/* Hinweis: Modi werden am Desktop gespielt */}
        <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-white/50">
          {tOr(t, 'mobile.mirrorDailyModesHint', 'Challenge-Modi werden auf dem Desktop gespielt — hier siehst du den Katalog.')}
        </p>
        {isControlling && (
          <button
            onClick={() => { haptic(); onSendDesktopCommand('dailyChallenge'); }}
            className="min-h-[44px] rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2.5 text-sm font-semibold text-cyan-300 transition-transform active:scale-[0.97]"
          >
            {tOr(t, 'mobile.mirrorOpenOnDesktop', 'Auf Desktop öffnen')}
          </button>
        )}
        {/* Katalog (read-only) */}
        {CHALLENGE_MODES.map((mode) => {
          const name = tOr(t, mode.nameKey, mode.name);
          const description = tOr(t, mode.descriptionKey, mode.description);
          const diffColor =
            mode.difficulty === 'extreme' ? 'border-red-500/40 text-red-400 bg-red-500/10'
            : mode.difficulty === 'hard' ? 'border-orange-500/40 text-orange-400 bg-orange-500/10'
            : mode.difficulty === 'medium' ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
            : 'border-green-500/40 text-green-400 bg-green-500/10';
          return (
            <div key={mode.id} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <span className="shrink-0 text-2xl leading-none" aria-hidden>{mode.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
                  <span className={'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ' + diffColor}>
                    {mode.difficulty}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-white/50">{description}</p>
                <p className="mt-1 text-[10px] font-semibold text-cyan-400/80">+{mode.xpReward} XP</p>
              </div>
            </div>
          );
        })}
      </div>
    );

    const renderLeaderboardTab = () => {
      if (!dailyMap || Object.keys(dailyMap).length === 0) {
        return (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <span className="text-4xl" aria-hidden>🏆</span>
            <p className="max-w-xs text-sm text-white/50">
              {tOr(t, 'dailyChallengeScreen.noLeaderboardEntries', 'Noch keine Einträge! Sei der Erste, der die heutige Herausforderung abschließt!')}
            </p>
          </div>
        );
      }
      // Spieler nach heutigen Abschlüssen + Streak sortieren
      const rows = Object.entries(dailyMap)
        .map(([pid, state]) => {
          const profile = hostProfiles.find((p) => p.id === pid);
          const completedToday = (state.slots ?? []).filter((s) => s.completed).length;
          return {
            pid,
            name: profile?.name ?? tOr(t, 'mobile.mirrorPlayer', 'Spieler'),
            color: profile?.color ?? '#06B6D4',
            avatar: profile?.avatar,
            completedToday,
            streak: state.streak ?? 0,
          };
        })
        .sort((a, b) => b.completedToday - a.completedToday || b.streak - a.streak);

      return (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const isOwn = !!profileId && row.pid === profileId;
            return (
              <div
                key={row.pid}
                className={
                  'flex items-center gap-3 rounded-xl border p-3 ' +
                  (isOwn
                    ? 'border-white/20 bg-white/[0.08]'
                    : 'border-white/[0.08] bg-white/[0.03]')
                }
                style={isOwn ? { borderLeft: `4px solid ${row.color}` } : undefined}
              >
                <div className="flex w-9 shrink-0 items-center justify-center">
                  <span className="text-sm font-bold text-white/40">#{index + 1}</span>
                </div>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: row.color }}
                >
                  {row.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Companion-Spiegel nutzt einfache data-URLs
                    <img src={row.avatar} alt={row.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (row.name?.[0] || '?').toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={'truncate text-sm font-semibold ' + (isOwn ? 'text-cyan-300' : 'text-white')}>
                    {row.name}
                    {isOwn ? (
                      <span className="ml-1.5 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                        {tOr(t, 'mobile.mirrorProfileYou', 'Du')}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-white/50">
                    🔥 {row.streak} {tOr(t, 'dailyChallengeScreen.dayStreak', 'Tage in Folge')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-yellow-400">{row.completedToday}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/40">
                    {tOr(t, 'dailyChallengeScreen.completed', 'Abgeschlossen')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    const renderBadgesTab = () => {
      if (!myDaily) {
        return (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <span className="text-4xl" aria-hidden>🎖️</span>
            <p className="max-w-xs text-sm text-white/50">
              {tOr(t, 'mobile.mirrorDailyNoData', 'Keine Daily-Daten für dein Profil vorhanden.')}
            </p>
          </div>
        );
      }
      const unlockedMap = new Map((myDaily.badges ?? []).map((b) => [b.id, b.unlockedAt]));
      const unlockedCount = unlockedMap.size;

      return (
        <div className="flex flex-col gap-2">
          {/* Streak + Gesamt */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">🔥 {myDaily.streak ?? 0}</p>
              <p className="mt-0.5 text-[11px] text-white/50">
                {tOr(t, 'dailyChallengeScreen.dayStreak', 'Tage in Folge')}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-2xl font-bold text-cyan-400">{myDaily.totalCompleted ?? 0}</p>
              <p className="mt-0.5 text-[11px] text-white/50">
                {tOr(t, 'dailyChallengeScreen.completed', 'Abgeschlossen')}
              </p>
            </div>
          </div>

          {unlockedCount === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-white/40">
              {tOr(t, 'dailyChallengeScreen.completeForBadges', 'Schließe Herausforderungen ab, um Abzeichen zu verdienen!')}
            </p>
          )}

          {/* Alle Daily-Badges: freigeschaltet vs. gesperrt */}
          <div className="grid grid-cols-2 gap-2">
            {Object.values(DAILY_BADGES).map((badge) => {
              const unlockedAt = unlockedMap.get(badge.id);
              const isUnlocked = unlockedAt !== undefined;
              const name = tOr(t, `dailyBadges.${badge.id}.name`, tOr(t, badge.nameKey, badge.name));
              const dateText = (() => {
                if (!isUnlocked) return '';
                const parsed = new Date(unlockedAt);
                return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString();
              })();
              return (
                <div
                  key={badge.id}
                  className={
                    'rounded-xl border p-3 text-center ' +
                    (isUnlocked
                      ? 'border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-yellow-500/10'
                      : 'border-white/[0.08] bg-white/[0.03] opacity-50 grayscale')
                  }
                >
                  <div className="text-2xl leading-none" aria-hidden>{badge.icon}</div>
                  <p className={'mt-1.5 text-xs font-semibold ' + (isUnlocked ? 'text-amber-400' : 'text-white/60')}>{name}</p>
                  {isUnlocked && dateText ? (
                    <p className="mt-1 text-[10px] text-white/40">{dateText}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-white/25" aria-hidden>🔒</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    // ===================== Haupt-Render =====================

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl" aria-hidden>📅</span>
          <h2 className="text-lg font-semibold text-white">
            {tOr(t, 'mobile.mirrorDailyChallenge', 'Tägliche Herausforderung')}
          </h2>
        </div>

        {/* Kein Profil verknüpft */}
        {!profileId && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <span className="text-4xl" aria-hidden>👤</span>
            <p className="max-w-xs text-sm text-white/50">
              {tOr(t, 'mobile.mirrorNoProfileLink', 'Kein Profil verknüpft. Verbinde die Companion-App mit einem Profil, um deine Daten zu sehen.')}
            </p>
          </div>
        )}

        {profileId && loading && renderSkeleton()}
        {profileId && localError && !dailyState && renderError()}

        {profileId && !loading && !localError && (
          <>
            {/* Tab-Bar (exakte Desktop-Tab-Struktur) */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist">
              {DAILY_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const label = tOr(t, tab.labelKey, tab.fallback);
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTab(tab.id)}
                    role="tab"
                    aria-selected={isActive}
                    className={
                      'min-h-[44px] shrink-0 rounded-lg px-3 py-2 text-xs font-semibold active:scale-95 transition-transform ' +
                      (isActive
                        ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-cyan-300'
                        : 'bg-white/5 border border-white/10 text-white/50')
                    }
                  >
                    <span className="mr-1" aria-hidden>{tab.icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab-Inhalt (scrollbar) */}
            <div className={'max-h-[62vh] ' + SCROLL_AREA}>
              {activeTab === 'challenge' && renderChallengeTab()}
              {activeTab === 'weekly' && renderWeeklyTab()}
              {activeTab === 'modes' && renderModesTab()}
              {activeTab === 'leaderboard' && renderLeaderboardTab()}
              {activeTab === 'badges' && renderBadgesTab()}
            </div>

            {/* Steuerungs-Hinweis (nicht-steuerend: nur Anzeige) */}
            {!isControlling && (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center text-[11px] leading-relaxed text-white/40">
                {tOr(t, 'mobile.mirrorDailyControlHint', 'Nur Anzeige — übernimm die Steuerung, um Challenges zu starten.')}
              </p>
            )}
          </>
        )}
      </div>
    );
}
MirrorDailyLite.displayName = 'MirrorDailyLite';
