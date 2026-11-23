'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { ACHIEVEMENT_DEFINITIONS, getRarityColor } from '@/lib/game/achievements';

// ===================== Props =====================

/** Host profile as pushed by the desktop (POST sethostprofiles). */
interface HostProfileLite {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isActive?: boolean;
  achievements?: string[];
  xp?: number;
  level?: number;
  songsPlayed?: number;
  gamesPlayed?: number;
}

interface MirrorAchievementsLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string, data?: unknown) => void;
  /** R33-d2: true when this phone holds the remote-control lock. */
  isControlling?: boolean;
  /** R33-d2: the companion player's own profile id (matches a host profile). */
  profileId?: string | null;
}

// ===================== i18n-Hilfe =====================

/** t(key) gibt den Key selbst zurück, wenn keine Übersetzung existiert. */
function tOr(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

// ===================== Filter-Definitionen =====================

type StatusFilter = 'all' | 'unlocked' | 'locked';

type CategoryFilter = 'all' | 'performance' | 'progression' | 'social' | 'special';

const STATUS_FILTERS: { id: StatusFilter; labelKey: string; fallback: string; activeColor: string }[] = [
  { id: 'all',      labelKey: 'achievementsScreen.all',       fallback: 'Alle',        activeColor: 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' },
  { id: 'unlocked', labelKey: 'achievements.unlocked',        fallback: 'Freigeschaltet', activeColor: 'bg-green-500/25 border-green-400/40 text-green-400' },
  { id: 'locked',   labelKey: 'achievementsScreen.locked',    fallback: 'Gesperrt',    activeColor: 'bg-red-500/25 border-red-400/40 text-red-400' },
];

const CATEGORY_FILTERS: { id: CategoryFilter; labelKey: string; fallback: string }[] = [
  { id: 'all',         labelKey: 'achievementsScreen.all',                    fallback: 'Alle' },
  { id: 'performance', labelKey: 'achievementsScreen.categories.performance', fallback: 'Leistung' },
  { id: 'progression', labelKey: 'achievementsScreen.categories.progression', fallback: 'Fortschritt' },
  { id: 'social',      labelKey: 'achievementsScreen.categories.social',      fallback: 'Sozial' },
  { id: 'special',     labelKey: 'achievementsScreen.categories.special',     fallback: 'Speziell' },
];

/** Gemeinsame Scroll-Klasse: schlanke Neon-Scrollbar (globals.css R38). */
const SCROLL_AREA = 'overflow-y-auto overscroll-contain pr-1 kz-scroll';

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export function MirrorAchievementsLite({
  onSendDesktopCommand,
  profileId,
}: MirrorAchievementsLiteProps) {
    const { t } = useTranslation();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

    // ── R33/P9: eigene Achievements — Host-Profile selbst laden ──
    const [hostProfiles, setHostProfiles] = useState<HostProfileLite[] | null>(null);
    const [profilesError, setProfilesError] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
      let cancelled = false;
      setProfilesError(false);
      setHostProfiles(null);
      fetch('/api/mobile?action=hostprofiles')
        .then((r) => { if (!r.ok) throw new Error('http'); return r.json(); })
        .then((d) => {
          if (cancelled) return;
          if (d?.success && Array.isArray(d.profiles)) {
            setHostProfiles(d.profiles as HostProfileLite[]);
          } else {
            setProfilesError(true);
          }
        })
        .catch(() => { if (!cancelled) setProfilesError(true); });
      return () => { cancelled = true; };
    }, [reloadTick]);

    const retry = useCallback(() => {
      haptic();
      setReloadTick((n) => n + 1);
    }, []);

    const handleStatus = useCallback(
      (f: StatusFilter) => {
        haptic();
        setStatusFilter(f);
      },
      [],
    );

    const handleCategory = useCallback(
      (c: CategoryFilter) => {
        haptic();
        setCategoryFilter(c);
      },
      [],
    );

    // ── Eigene Profil-Daten ──
    const ownProfile = useMemo(
      () => (hostProfiles ?? []).find((p) => !!profileId && p.id === profileId) ?? null,
      [hostProfiles, profileId],
    );
    const unlockedIds = useMemo(
      () => new Set(ownProfile?.achievements ?? []),
      [ownProfile],
    );

    const unlockedCount = useMemo(
      () => ACHIEVEMENT_DEFINITIONS.filter((a) => unlockedIds.has(a.id)).length,
      [unlockedIds],
    );
    const totalXP = useMemo(
      () => ACHIEVEMENT_DEFINITIONS
        .filter((a) => unlockedIds.has(a.id))
        .reduce((sum, a) => sum + (a.reward?.xp || 0), 0),
      [unlockedIds],
    );
    const totalCount = ACHIEVEMENT_DEFINITIONS.length;
    const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    const filteredAchievements = useMemo(() => (
      ACHIEVEMENT_DEFINITIONS.filter((a) => {
        if (statusFilter === 'unlocked' && !unlockedIds.has(a.id)) return false;
        if (statusFilter === 'locked' && unlockedIds.has(a.id)) return false;
        if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
        return true;
      })
    ), [statusFilter, categoryFilter, unlockedIds]);

    // ===================== Render-Hilfen =====================

    const renderSkeleton = () => (
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.06]" />
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

    const renderProfileCard = () => {
      if (!ownProfile) return null;
      const levelLabel = tOr(t, 'playerProgression.lv', 'Lv. {n}').replace('{n}', String(ownProfile.level ?? 1));
      return (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/15 to-pink-500/10 p-3">
          {/* Avatar / Initialen */}
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-bold text-white"
            style={{ backgroundColor: ownProfile.color }}
          >
            {ownProfile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Companion-Spiegel nutzt einfache data-URLs
              <img src={ownProfile.avatar} alt={ownProfile.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              (ownProfile.name?.[0] || '?').toUpperCase()
            )}
          </div>
          {/* Name + Level */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{ownProfile.name}</p>
            <p className="text-xs text-cyan-300">
              {levelLabel} · {ownProfile.xp ?? 0} {tOr(t, 'playerProgression.xp', 'XP')}
            </p>
          </div>
          {/* Fortschritt */}
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-yellow-400">{unlockedCount}/{totalCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">
              {tOr(t, 'achievementsScreen.unlocked', 'Freigeschaltet')}
            </p>
          </div>
        </div>
      );
    };

    const renderProgressBar = () => {
      if (!ownProfile) return null;
      return (
        <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-yellow-400">
              {unlockedCount}/{totalCount} {tOr(t, 'achievementsScreen.unlocked', 'Freigeschaltet')}
            </span>
            <span className="text-white/50">
              {totalXP} {tOr(t, 'achievementsScreen.xpEarned', 'XP verdient')}
            </span>
            <span className="text-purple-300">{completionPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-purple-500 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      );
    };

    // ===================== Haupt-Render =====================

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl" aria-hidden>🏅</span>
          <h2 className="text-lg font-semibold text-white">
            {tOr(t, 'mobile.mirrorAchievements', 'Erfolge')}
          </h2>
        </div>

        {/* Lade-/Fehlerzustand */}
        {hostProfiles === null && !profilesError && renderSkeleton()}
        {profilesError && renderError()}

        {hostProfiles !== null && !profilesError && (
          <>
            {/* Kein Profil verknüpft */}
            {!profileId && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <span className="text-4xl" aria-hidden>👤</span>
                <p className="max-w-xs text-sm text-white/50">
                  {tOr(t, 'mobile.mirrorNoProfileLink', 'Kein Profil verknüpft. Verbinde die Companion-App mit einem Profil, um deine Daten zu sehen.')}
                </p>
              </div>
            )}

            {/* Eigenes Profil nicht unter den Host-Profilen */}
            {profileId && !ownProfile && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-6 text-center">
                <span className="text-4xl" aria-hidden>🏅</span>
                <p className="max-w-xs text-sm text-amber-200/80">
                  {tOr(t, 'mobile.mirrorProfileMissing', 'Dein Profil wurde auf dem Desktop nicht gefunden. Deine Erfolge erscheinen hier, sobald das Desktop-Profil synchronisiert ist.')}
                </p>
              </div>
            )}

            {/* Eigene Achievements */}
            {ownProfile && (
              <>
                {renderProfileCard()}
                {renderProgressBar()}

                {/* Status Filters */}
                <div className="flex gap-2">
                  {STATUS_FILTERS.map((f) => {
                    const isActive = statusFilter === f.id;
                    const label = tOr(t, f.labelKey, f.fallback);
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleStatus(f.id)}
                        className={
                          'min-h-[44px] flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold text-center active:scale-95 transition-transform ' +
                          (isActive
                            ? f.activeColor
                            : 'bg-white/5 border border-white/10 text-white/50')
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Category Filters */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {CATEGORY_FILTERS.map((c) => {
                    const isActive = categoryFilter === c.id;
                    const label = tOr(t, c.labelKey, c.fallback);
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleCategory(c.id)}
                        className={
                          'min-h-[36px] shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95 transition-transform ' +
                          (isActive
                            ? 'bg-purple-500/25 border border-purple-400/30 text-purple-300'
                            : 'bg-white/5 border border-white/10 text-white/40')
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Scrollbare Achievements-Liste */}
                <div className={'max-h-[58vh] flex flex-col gap-2 ' + SCROLL_AREA}>
                  {filteredAchievements.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <span className="text-4xl" aria-hidden>🔍</span>
                      <p className="text-sm text-white/40">
                        {tOr(t, 'achievementsScreen.noMatches', 'Keine Erfolge für diese Filter')}
                      </p>
                    </div>
                  ) : (
                    filteredAchievements.map((achievement) => {
                      const isUnlocked = unlockedIds.has(achievement.id);
                      const rarityColor = getRarityColor(achievement.rarity);
                      const name = tOr(t, achievement.nameKey, achievement.name);
                      const description = tOr(t, achievement.descriptionKey, achievement.description);
                      const rarityLabel = tOr(t, `achievements.${achievement.rarity}`, achievement.rarity);
                      return (
                        <div
                          key={achievement.id}
                          className={
                            'flex items-start gap-3 rounded-xl border p-3 ' +
                            (isUnlocked
                              ? 'border-yellow-500/30 bg-white/[0.06] ring-1 ring-yellow-500/30'
                              : 'border-white/[0.08] bg-white/[0.03] opacity-60')
                          }
                        >
                          {/* Icon */}
                          <div className="relative shrink-0">
                            <span
                              className="text-2xl leading-none"
                              style={{ filter: isUnlocked ? 'none' : 'grayscale(100%)' }}
                              aria-hidden
                            >
                              {achievement.icon}
                            </span>
                            {!isUnlocked && (
                              <span className="absolute -bottom-1.5 -right-2 text-[11px]" aria-label={tOr(t, 'achievementsScreen.locked', 'Gesperrt')}>🔒</span>
                            )}
                          </div>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3
                                className="truncate text-sm font-semibold"
                                style={{ color: isUnlocked ? rarityColor : 'rgba(255,255,255,0.75)' }}
                              >
                                {name}
                              </h3>
                              {achievement.reward?.xp ? (
                                <span className="shrink-0 text-xs font-semibold text-yellow-400">
                                  +{achievement.reward.xp} XP
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs leading-snug text-white/50">{description}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span
                                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                style={{ color: rarityColor, backgroundColor: `${rarityColor}22` }}
                              >
                                {rarityLabel}
                              </span>
                              {isUnlocked && (
                                <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">
                                  ✓ {tOr(t, 'achievements.unlocked', 'Freigeschaltet')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Hinweis bei 0 freigeschalteten Erfolgen */}
                {unlockedCount === 0 && (
                  <p className="text-center text-xs text-white/30">
                    {tOr(t, 'achievements.playToUnlock', 'Spiele Songs um Erfolge freizuschalten!')}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* Auf Desktop öffnen (immer möglich — auch ohne Steuerung) */}
        <button
          onClick={() => { haptic(); onSendDesktopCommand('achievements'); }}
          className={
            'w-full rounded-lg p-3 text-center text-sm font-semibold ' +
            'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 ' +
            'active:scale-[0.97] transition-transform'
          }
        >
          {tOr(t, 'mobile.mirrorOpenOnDesktop', 'Auf Desktop öffnen')}
        </button>
      </div>
    );
}
MirrorAchievementsLite.displayName = 'MirrorAchievementsLite';
