'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { useTranslation } from '@/lib/i18n/translations';
import {
  MusicIcon,
  PlayIcon,
  PartyIcon,
  MicIcon,
  PhoneIcon,
  TrophyIcon,
  SettingsIcon,
  UserIcon,
} from '@/components/icons';
import { Radio, Award } from 'lucide-react';
import type { Screen } from '@/types/screens';
import { detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';
import {
  getActiveDailySlot,
  getActiveWeeklySlot,
  getDailyChallengeForSlot,
  getDailyType,
  getPlayerDailySlotProgress,
  getPlayerWeeklySlotProgress,
  getTimeUntilReset,
  getTimeUntilWeeklyReset,
  getWeeklyChallengeForSlot,
  interpolateChallengeText,
  XP_REWARDS,
  DAILY_SLOT_XP_BONUS,
  DAILY_SLOTS_PER_DAY,
  WEEKLY_SLOTS_PER_WEEK,
  WEEKLY_SLOT_XP,
  type DailyTypeDefinition,
  type WeeklyTypeDefinition,
} from '@/lib/game/daily-challenge';

interface HomeScreenProps {
  onNavigate: (_screen: Screen) => void;
}

type Translate = (_key: string) => string;

// Dynamic app stats (reflects actual game modes)
const PARTY_GAME_COUNT = 9; // battle-royale, tournament, pass-the-mic, companion-singalong, medley, rate-my-song, blind, missing-words, online

/** Localized display name of a daily/weekly type (interpolates nameParams). */
function typeName(def: DailyTypeDefinition | WeeklyTypeDefinition, t: Translate): string {
  let name = t(def.nameKey);
  if (def.nameParams) {
    for (const [key, value] of Object.entries(def.nameParams)) {
      name = name.replaceAll(`{${key}}`, value);
    }
  }
  return name;
}

/** Preview of one challenge slot shown on the start screen. */
interface ChallengePreview {
  slot: number;
  icon: string;
  name: string;
  description: string;
  slotXP: number;
}

/** Everything the Daily/Weekly preview cards need (active profile only). */
interface HomeChallengeData {
  daily: ChallengePreview | null;
  dailyDone: number;
  dailyReset: string;
  weekly: ChallengePreview | null;
  weeklyDone: number;
  weeklyReset: string;
}

function formatDailyReset(r: { hours: number; minutes: number }): string {
  return `${r.hours}h ${r.minutes}m`;
}

function formatWeeklyReset(r: { days: number; hours: number }): string {
  return r.days > 0 ? `${r.days}d ${r.hours}h` : `${r.hours}h`;
}

/** Build the Daily/Weekly preview data for the given player.
 *  MUST only be called client-side after mount (reads localStorage). */
function buildChallengeData(playerId: string, level: number, t: Translate): HomeChallengeData {
  // ── Daily: first open slot of today's 5 ──
  const dailySlot = getActiveDailySlot(playerId);
  let daily: ChallengePreview | null = null;
  if (dailySlot !== null) {
    const challenge = getDailyChallengeForSlot(dailySlot, level, 'normal');
    const def = getDailyType(challenge.type);
    daily = {
      slot: dailySlot,
      icon: def.icon,
      name: typeName(def, t),
      description: interpolateChallengeText(
        t(def.descriptionKey), def.descriptionParams, challenge.target, def.metricKey,
      ),
      slotXP: dailySlot === 0
        ? XP_REWARDS.CHALLENGE_COMPLETE
        : DAILY_SLOT_XP_BONUS[Math.min(dailySlot - 1, DAILY_SLOT_XP_BONUS.length - 1)],
    };
  }
  const dailyDone = getPlayerDailySlotProgress(playerId).completedSlots.length;

  // ── Weekly: first open slot of this week's 5 ──
  const weeklySlot = getActiveWeeklySlot(playerId);
  let weekly: ChallengePreview | null = null;
  if (weeklySlot !== null) {
    const slotInfo = getWeeklyChallengeForSlot(weeklySlot, level, 'normal');
    const wDef = slotInfo.def;
    weekly = {
      slot: weeklySlot,
      icon: wDef.icon,
      name: typeName(wDef, t),
      description: interpolateChallengeText(
        t(wDef.descriptionKey), wDef.descriptionParams, slotInfo.target, wDef.metricKey,
      ),
      slotXP: WEEKLY_SLOT_XP[Math.min(weeklySlot, WEEKLY_SLOT_XP.length - 1)],
    };
  }
  const weeklyDone = getPlayerWeeklySlotProgress(playerId).completedSlots.length;

  return {
    daily,
    dailyDone,
    dailyReset: formatDailyReset(getTimeUntilReset()),
    weekly,
    weeklyDone,
    weeklyReset: formatWeeklyReset(getTimeUntilWeeklyReset()),
  };
}

/** One of the two challenge preview cards (Daily or Weekly). */
function ChallengePreviewCard({
  title, preview, doneCount, total, resetLabel, allDoneLabel, progressLabel, ctaLabel, onCta, testId, accent,
}: {
  title: string;
  preview: ChallengePreview | null;
  doneCount: number;
  total: number;
  resetLabel: string;
  allDoneLabel: string;
  progressLabel: string;
  ctaLabel: string;
  onCta: () => void;
  testId: string;
  accent: 'cyan' | 'gold';
}) {
  const pct = Math.min(100, Math.round((doneCount / total) * 100));
  const isCyan = accent === 'cyan';
  const barClass = isCyan ? 'retro-gradient-cyan' : 'retro-gradient-gold';
  const titleClass = isCyan ? 'text-[#00e5ff] retro-glow-cyan' : 'text-[#ffd60a] retro-glow-gold';
  const slotBadgeClass = isCyan
    ? 'border-[#00e5ff]/40 text-[#00e5ff]'
    : 'border-[#ffd60a]/40 text-[#ffd60a]';
  // No `retro-btn-gold` exists in globals.css — the gold variant is composed inline.
  const btnClass = isCyan
    ? 'retro-btn retro-btn-cyan'
    : 'retro-btn bg-gradient-to-r from-[#ffd60a] to-[#ffaa00] border-[#ffd60a] text-[#0a0a1a] shadow-[0_0_12px_rgba(255,214,10,0.5)] hover:shadow-[0_0_24px_rgba(255,214,10,0.7)]';

  return (
    <Card className={`retro-gradient-card ${isCyan ? 'retro-border-cyan retro-box-glow-cyan' : 'retro-border-gold retro-box-glow-gold'} rounded-xl h-full transition-transform duration-200 hover:scale-[1.01]`}>
      <CardContent className="p-6 flex flex-col gap-4 h-full">
        {/* Header: card title + reset countdown */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className={`text-xl font-black ${titleClass}`}>{title}</h3>
          <span className="text-xs text-white/50" data-testid={`${testId}-reset`}>⏳ {resetLabel}</span>
        </div>

        {/* Current challenge (or all-done state) */}
        {preview ? (
          <div className="flex items-start gap-3">
            <span className="text-4xl leading-none flex-shrink-0" aria-hidden>{preview.icon}</span>
            <div className="min-w-0">
              <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                <span className="truncate">{preview.name}</span>
                <Badge variant="outline" className={slotBadgeClass}>
                  {`Slot ${preview.slot + 1}`}
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white/70">
                  +{preview.slotXP} XP
                </Badge>
              </div>
              <p className="text-sm text-[#b8b8d0]/90 mt-1.5 leading-snug line-clamp-3">
                {preview.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <span className="text-4xl leading-none" aria-hidden>🏆</span>
            <p className="font-bold text-green-300">{allDoneLabel}</p>
          </div>
        )}

        {/* Slot progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
            <span>{progressLabel}</span>
            <span className="font-mono">{doneCount}/{total}</span>
          </div>
          <div
            className="h-2 rounded-full bg-white/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={progressLabel}
          >
            <div className={`h-full ${barClass} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* CTA */}
        <Button className={`${btnClass} w-full mt-auto`} onClick={onCta} data-testid={testId}>
          <PlayIcon className="w-4 h-4 mr-2" /> {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { t } = useTranslation();
  const { profiles, activeProfileId } = useGameStore();
  // Track if component is mounted (to avoid hydration mismatch)
  const [isMounted, setIsMounted] = useState(false);

  // Detect local IP for QR code
  const [localIP, setLocalIP] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setIsMounted(true);
    detectLocalIP().then(ip => { if (ip) setLocalIP(ip); });
  }, []);

  // Periodic re-render (every 30s) so the reset countdowns stay fresh
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick(n => (n + 1) % 1_000_000), 30_000);
    return () => clearInterval(id);
  }, []);

  const qrCodeSrc = useQRCode(localIP ? buildCompanionUrl(localIP) : '', 160);

  // Get song count from library — recomputed every render so it stays
  // in sync when songs are added/removed.  getAllSongs() is O(1) when
  // cached (module-level in-memory cache), so this is effectively free.
  const songCount = typeof window === 'undefined' ? 0 : getAllSongs().length;

  // Active profile (used silently for Daily/Weekly personalization — no player UI)
  const activeProfile = profiles.find(p => p.id === activeProfileId && p.isActive !== false);

  // Challenge preview data — ONLY computed after mount (reads localStorage)
  const challengeData = isMounted && activeProfile
    ? buildChallengeData(activeProfile.id, activeProfile.level || 1, t)
    : null;

  // ── Navigation cards (icon, title, 1-line description) ──
  const navItems: Array<{
    screen: Screen;
    testId: string;
    Icon: (_props: { className?: string }) => ReactNode;
    title: string;
    desc: string;
    iconColor: string;
    border: string;
    hoverBorder: string;
    hoverGlow: string;
  }> = [
    {
      screen: 'library',
      testId: 'home-nav-solo',
      Icon: MicIcon,
      title: t('homeScreen.navSoloTitle'),
      desc: t('homeScreen.navSoloDesc'),
      iconColor: 'text-[#00e5ff]',
      border: 'retro-border-cyan',
      hoverBorder: 'hover:border-cyan-300/80',
      hoverGlow: 'hover:shadow-[0_0_24px_rgba(0,229,255,0.25)]',
    },
    {
      screen: 'party',
      testId: 'home-nav-party-modes',
      Icon: PartyIcon,
      title: t('home.partyMode'),
      desc: t('homeScreen.navPartyDesc').replaceAll('{n}', String(PARTY_GAME_COUNT)),
      iconColor: 'text-[#ff2d95]',
      border: 'retro-border-pink',
      hoverBorder: 'hover:border-pink-400/80',
      hoverGlow: 'hover:shadow-[0_0_24px_rgba(255,45,149,0.25)]',
    },
    {
      screen: 'jukebox',
      testId: 'home-nav-jukebox',
      Icon: Radio,
      title: t('homeScreen.navJukeboxTitle'),
      desc: t('homeScreen.navJukeboxDesc'),
      iconColor: 'text-[#ffd60a]',
      border: 'retro-border-gold',
      hoverBorder: 'hover:border-yellow-300/80',
      hoverGlow: 'hover:shadow-[0_0_24px_rgba(255,214,10,0.25)]',
    },
    {
      screen: 'highscores',
      testId: 'home-nav-highscores',
      Icon: TrophyIcon,
      title: t('homeScreen.navHighscoresTitle'),
      desc: t('homeScreen.navHighscoresDesc'),
      iconColor: 'text-[#00e5ff]',
      border: 'retro-border-cyan',
      hoverBorder: 'hover:border-cyan-300/80',
      hoverGlow: 'hover:shadow-[0_0_24px_rgba(0,229,255,0.25)]',
    },
    {
      screen: 'achievements',
      testId: 'home-nav-achievements',
      Icon: Award,
      title: t('homeScreen.navAchievementsTitle'),
      desc: t('homeScreen.navAchievementsDesc'),
      iconColor: 'text-[#ff2d95]',
      border: 'retro-border-pink',
      hoverBorder: 'hover:border-pink-400/80',
      hoverGlow: 'hover:shadow-[0_0_24px_rgba(255,45,149,0.25)]',
    },
    {
      screen: 'settings',
      testId: 'home-nav-settings',
      Icon: SettingsIcon,
      title: t('homeScreen.navSettingsTitle'),
      desc: t('homeScreen.navSettingsDesc'),
      iconColor: 'text-[#ffd60a]',
      border: 'retro-border-gold',
      hoverBorder: 'hover:border-yellow-300/80',
      hoverGlow: 'hover:shadow-[0_0_24px_rgba(255,214,10,0.25)]',
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">
      {/* ═══ HERO SECTION — Retro Karaoke Vibe ═══ */}
      <div className="relative text-center py-16 retro-scanlines">
        {/* Animated rainbow bar behind title */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 retro-gradient-rainbow rounded-full" />

        {/* Logo icon — neon pink glow ring */}
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-gradient-to-br from-[#ff2d95] via-[#bf5af2] to-[#00e5ff] mb-6 retro-box-glow-pink relative">
          <MusicIcon className="w-16 h-16 text-white drop-shadow-lg" />
          {/* Corner sparkles */}
          <span className="absolute -top-2 -right-2 text-[#ffd60a] text-xs animate-pulse">&#10022;</span>
          <span className="absolute -bottom-2 -left-2 text-[#00e5ff] text-xs animate-pulse" style={{ animationDelay: '0.5s' }}>&#10022;</span>
        </div>

        {/* Title — retro neon glow */}
        <h1 className="text-6xl font-black mb-3 tracking-tight">
          <span className="bg-gradient-to-r from-[#ff2d95] via-[#ff00ff] to-[#bf5af2] bg-clip-text text-transparent">
            Karaoke
          </span>{' '}
          <span className="bg-gradient-to-r from-[#00e5ff] via-[#00ffff] to-[#00ff88] bg-clip-text text-transparent">
            ZERO
          </span>
        </h1>

        {/* Rainbow divider line */}
        <div className="mx-auto w-48 h-0.5 retro-gradient-rainbow rounded-full mb-4" />

        <p className="text-lg text-[#b8b8d0] mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('home.subtitle')}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            className="retro-btn retro-btn-cyan px-10 py-6 text-lg rounded-lg"
            onClick={() => onNavigate('library')}
            data-testid="home-nav-library"
          >
            <PlayIcon className="w-5 h-5 mr-2" /> {t('home.startSinging')}
          </Button>
          <Button
            size="lg"
            className="retro-btn retro-btn-pink px-10 py-6 text-lg rounded-lg"
            onClick={() => onNavigate('party')}
            data-testid="home-nav-party"
          >
            <PartyIcon className="w-5 h-5 mr-2" /> {t('home.partyMode')}
          </Button>
        </div>
      </div>

      {/* ═══ DAILY & WEEKLY — LIVE PREVIEW (centerpiece) ═══ */}
      {!isMounted ? (
        // Pre-mount skeleton (avoids hydration mismatch — data comes from localStorage)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12" data-testid="home-challenge-skeleton">
          {[0, 1].map(i => (
            <Card key={i} className="retro-gradient-card retro-border-cyan rounded-xl">
              <CardContent className="p-6 space-y-4">
                <div className="h-6 w-1/2 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                <div className="h-2 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-10 w-full bg-white/5 rounded animate-pulse" />
                <p className="text-center text-white/40 text-sm pt-1">{t('homeScreen.challengeLoading')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !challengeData ? (
        // No active profile → friendly prompt instead of challenge cards
        <Card className="retro-gradient-card retro-border-pink rounded-xl retro-box-glow-pink mb-12" data-testid="home-need-profile">
          <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-8 h-8 text-[#ff2d95]" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">{t('homeScreen.needProfileTitle')}</h3>
              <p className="text-[#b8b8d0] text-sm leading-relaxed">
                {t('homeScreen.needProfileDesc')}
              </p>
            </div>
            <Button
              className="retro-btn retro-btn-pink flex-shrink-0"
              onClick={() => onNavigate('profile')}
              data-testid="home-nav-profile"
            >
              <UserIcon className="w-4 h-4 mr-2" /> {t('homeScreen.needProfileCta')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <ChallengePreviewCard
            title={t('homeScreen.dailyTitle')}
            preview={challengeData.daily}
            doneCount={challengeData.dailyDone}
            total={DAILY_SLOTS_PER_DAY}
            resetLabel={t('homeScreen.resetIn').replaceAll('{time}', challengeData.dailyReset)}
            allDoneLabel={t('homeScreen.allDailyDone')}
            progressLabel={t('homeScreen.dailyProgress')
              .replaceAll('{done}', String(challengeData.dailyDone))
              .replaceAll('{total}', String(DAILY_SLOTS_PER_DAY))}
            ctaLabel={t('homeScreen.dailyCta')}
            onCta={() => onNavigate('dailyChallenge')}
            testId="home-nav-daily"
            accent="cyan"
          />
          <ChallengePreviewCard
            title={t('homeScreen.weeklyTitle')}
            preview={challengeData.weekly}
            doneCount={challengeData.weeklyDone}
            total={WEEKLY_SLOTS_PER_WEEK}
            resetLabel={t('homeScreen.resetIn').replaceAll('{time}', challengeData.weeklyReset)}
            allDoneLabel={t('homeScreen.allWeeklyDone')}
            progressLabel={t('homeScreen.dailyProgress')
              .replaceAll('{done}', String(challengeData.weeklyDone))
              .replaceAll('{total}', String(WEEKLY_SLOTS_PER_WEEK))}
            ctaLabel={t('homeScreen.weeklyCta')}
            onCta={() => onNavigate('dailyChallenge')}
            testId="home-nav-weekly"
            accent="gold"
          />
        </div>
      )}

      {/* ═══ QUICK STATS — Neon Card Style ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <Card className="retro-gradient-card retro-border-cyan backdrop-blur-sm rounded-xl">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-3xl font-black text-[#00e5ff] retro-glow-cyan">{isMounted ? songCount : 0}</div>
              <div className="text-[#b8b8d0] text-sm mt-1">{t('home.songsAvailable')}</div>
            </div>
            <MusicIcon className="w-8 h-8 text-[#00e5ff]/40 flex-shrink-0" />
          </CardContent>
        </Card>
        <Card className="retro-gradient-card retro-border-pink backdrop-blur-sm rounded-xl">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div>
              <div className="text-3xl font-black text-[#ff2d95] retro-glow-pink">{PARTY_GAME_COUNT}</div>
              <div className="text-[#b8b8d0] text-sm mt-1">{t('home.partyGames')}</div>
            </div>
            <PartyIcon className="w-8 h-8 text-[#ff2d95]/40 flex-shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* ═══ NAVIGATION — Explaining cards to all areas ═══ */}
      <section aria-labelledby="home-nav-heading" className="mb-12">
        <h2
          id="home-nav-heading"
          className="text-xs font-bold uppercase tracking-[0.2em] text-[#b8b8d0]/70 mb-4"
        >
          {t('homeScreen.navSectionTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {navItems.map(({ screen, testId, Icon, title, desc, iconColor, border, hoverBorder, hoverGlow }) => (
            <button
              key={screen}
              type="button"
              onClick={() => onNavigate(screen)}
              data-testid={testId}
              aria-label={title}
              className={`group text-left retro-gradient-card ${border} ${hoverBorder} ${hoverGlow} rounded-xl transition-all duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`}
            >
              <div className="p-5">
                <Icon className={`w-8 h-8 mb-3 ${iconColor} transition-transform duration-200 group-hover:scale-110`} />
                <div className="font-bold text-white mb-1">{title}</div>
                <div className="text-sm text-[#b8b8d0]/80 leading-snug">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ MOBILE COMPANION — QR-Code ═══ */}
      <Card className="bg-gradient-to-br from-[#ffd60a]/10 to-[#ffaa00]/5 retro-border-gold rounded-xl retro-box-glow-gold mb-4">
        <CardHeader>
          <CardTitle className="text-[#ffd60a] flex items-center gap-2 font-bold">
            <PhoneIcon className="w-6 h-6" /> {t('homeScreen.mobileCompanion')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70 mb-4">
            {t('homeScreen.mobileCompanionDesc')}
          </p>
          {localIP ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-white rounded-lg p-2 flex-shrink-0 mx-auto sm:mx-0">
                {qrCodeSrc ? <img src={qrCodeSrc} alt={t('home.qrCodeAlt')} className="w-32 h-32" /> : <div className="w-32 h-32 animate-pulse bg-gray-200 rounded" />}
              </div>
              <div className="text-xs text-white/50 space-y-1 text-center sm:text-left">
                <p>{t('homeScreen.wifiStep1')}</p>
                <p>{t('homeScreen.wifiStep2')}</p>
                <p>{t('homeScreen.wifiStep3')}</p>
                <p className="font-mono mt-2 break-all text-orange-400/70">{buildCompanionUrl(localIP)}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40">{t('homeScreen.detectingNetwork')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
