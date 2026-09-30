'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { getJson, StorageKeys } from '@/lib/storage';

// ===================== Props =====================

/** Host profile as pushed by the desktop (POST sethostprofiles) — R33-erweitert. */
interface HostProfileLite {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  connectionCode?: string;
  isActive?: boolean;
  xp?: number;
  level?: number;
  songsPlayed?: number;
  gamesPlayed?: number;
  achievements?: string[];
}

interface MirrorProfileLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  /** Vom Dispatcher durchgereichte Profile (inaktiv genutzt — es gilt der hostprofiles-Endpoint) */
  availableProfiles?: HostProfileLite[];
  /** Sendet einen Command an den Desktop */
  onSendDesktopCommand: (command: string, data?: unknown) => void;
  /** R33-d2: true when this phone holds the remote-control lock. */
  isControlling?: boolean;
  /** R33-d2: the companion player's own profile id. */
  profileId?: string | null;
}

// ===================== i18n-Hilfe =====================

/** t(key) gibt den Key selbst zurück, wenn keine Übersetzung existiert. */
function tOr(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

/** Gemeinsame Scroll-Klasse: schlanke Neon-Scrollbar (globals.css R38). */
const SCROLL_AREA = 'overflow-y-auto overscroll-contain pr-1 kz-scroll';

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export function MirrorProfileLite({
  onSendDesktopCommand,
  isControlling,
  profileId,
}: MirrorProfileLiteProps) {
    const { t } = useTranslation();

    // ── R33/P11: eigene Profil-ID — Fallback aus dem lokalen Companion-Profil
    //    (localStorage), falls der Dispatcher profileId (noch) nicht durchreicht ──
    const [localProfileId, setLocalProfileId] = useState<string | null>(profileId ?? null);
    useEffect(() => {
      if (profileId) {
        setLocalProfileId(profileId);
        return;
      }
      try {
        const own = getJson<{ id?: string } | null>(StorageKeys.MOBILE_PROFILE, null);
        setLocalProfileId(own?.id ?? null);
      } catch {
        setLocalProfileId(null);
      }
    }, [profileId]);
    const ownProfileId = profileId ?? localProfileId;

    // ── R33/P11: ALLE Host-Profile direkt vom hostprofiles-Endpoint laden ──
    const [profiles, setProfiles] = useState<HostProfileLite[] | null>(null);
    const [profilesError, setProfilesError] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);
    // Optimistischer Toggle (bis der Re-Fetch den Desktop-Stand bestätigt)
    const [optimisticActive, setOptimisticActive] = useState<Record<string, boolean>>({});

    const loadProfiles = useCallback((silent = false) => {
      let cancelled = false;
      if (!silent) {
        setProfilesError(false);
        setProfiles(null);
      }
      fetch('/api/mobile?action=hostprofiles')
        .then((r) => { if (!r.ok) throw new Error('http'); return r.json(); })
        .then((d) => {
          if (cancelled) return;
          if (d?.success && Array.isArray(d.profiles)) {
            setProfiles(d.profiles as HostProfileLite[]);
            setOptimisticActive({});
          } else if (!silent) {
            setProfilesError(true);
          }
        })
        .catch(() => { if (!cancelled && !silent) setProfilesError(true); });
      return () => { cancelled = true; };
    }, []);

    useEffect(() => {
      const cleanup = loadProfiles();
      return cleanup;
    }, [loadProfiles, reloadTick]);

    const retry = useCallback(() => {
      haptic();
      setReloadTick((n) => n + 1);
    }, []);

    // ── Toggle (nur steuernd) ──
    const handleToggle = useCallback(
      (profileIdToToggle: string, currentActive: boolean) => {
        haptic();
        // Optimistisch umschalten, Command an den Desktop senden …
        setOptimisticActive((prev) => ({ ...prev, [profileIdToToggle]: !currentActive }));
        onSendDesktopCommand(`profile_toggle:${profileIdToToggle}:${currentActive ? '0' : '1'}`);
        // … und nach kurzer Zeit den echten Desktop-Stand nachziehen
        window.setTimeout(() => loadProfiles(true), 1500);
      },
      [onSendDesktopCommand, loadProfiles],
    );

    const activeCount = useMemo(
      () => (profiles ?? []).filter((p) => (optimisticActive[p.id] ?? (p.isActive !== false))).length,
      [profiles, optimisticActive],
    );

    // ===================== Render-Hilfen =====================

    const renderHeader = () => (
      <div className="flex items-center gap-2 py-2">
        <span className="text-2xl" aria-hidden>👤</span>
        <h2 className="text-lg font-semibold text-white">
          {tOr(t, 'characterScreen.title', 'Profiles')}
        </h2>
      </div>
    );

    const renderSkeleton = () => (
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white/[0.06]" />
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

    const renderProfileRow = (profile: HostProfileLite) => {
      const isActive = optimisticActive[profile.id] ?? (profile.isActive !== false);
      const isOwn = !!ownProfileId && profile.id === ownProfileId;
      const levelLabel = tOr(t, 'playerProgression.lv', 'Lv. {n}').replace('{n}', String(profile.level ?? 1));

      // Innerer Zeilen-Inhalt (für Button UND reine Anzeige identisch)
      const content = (
        <>
          {/* Avatar / Initialen */}
          <div
            className={
              'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-bold text-white ' +
              (isActive ? '' : 'opacity-40')
            }
            style={{ backgroundColor: profile.color }}
          >
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Companion-Spiegel nutzt einfache data-URLs
              <img src={profile.avatar} alt={profile.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              (profile.name?.[0] || '?').toUpperCase()
            )}
          </div>

          {/* Name, Level/XP, Status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={'truncate text-sm font-semibold ' + (isActive ? 'text-white' : 'text-white/40')}>
                {profile.name}
              </p>
              {isOwn && (
                <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                  {tOr(t, 'mobile.mirrorProfileYou', 'Du')}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-white/40">
              {levelLabel}
              {typeof profile.xp === 'number' ? ` · ${profile.xp} ${tOr(t, 'playerProgression.xp', 'XP')}` : ''}
              {typeof profile.songsPlayed === 'number' && profile.songsPlayed > 0
                ? ` · ${profile.songsPlayed} ${tOr(t, 'mobile.mirrorSongsShort', 'Songs')}`
                : ''}
            </p>
            <p className={'text-[11px] ' + (isActive ? 'text-green-400/70' : 'text-white/25')}>
              {isActive
                ? tOr(t, 'mobile.mirrorProfileActive', 'Aktiv')
                : tOr(t, 'mobile.mirrorProfileInactive', 'Inaktiv')}
            </p>
          </div>

          {/* Toggle-Switch (steuernd) bzw. Status-Punkt (anzeigend) */}
          {isControlling ? (
            <span
              role="switch"
              aria-checked={isActive}
              className={
                'relative block h-7 w-12 shrink-0 rounded-full transition-colors ' +
                (isActive ? 'bg-cyan-500' : 'bg-white/20')
              }
            >
              <span
                className={
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ' +
                  (isActive ? 'left-6' : 'left-1')
                }
              />
            </span>
          ) : (
            <span
              className={
                'h-2.5 w-2.5 shrink-0 rounded-full ' +
                (isActive ? 'bg-green-400' : 'bg-white/20')
              }
              aria-hidden
            />
          )}
        </>
      );

      const rowClass =
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-transform ' +
        (isActive
          ? 'border-white/[0.14] bg-white/[0.07] '
          : 'border-white/[0.06] bg-white/[0.03] ') +
        (isControlling ? 'active:scale-[0.98] ' : '');

      if (isControlling) {
        // Steuernd: Tap schaltet aktiv/inaktiv am Desktop um
        return (
          <button
            key={profile.id}
            onClick={() => handleToggle(profile.id, isActive)}
            className={rowClass}
            aria-label={`${profile.name}: ${isActive
              ? tOr(t, 'mobile.mirrorProfileActive', 'Aktiv')
              : tOr(t, 'mobile.mirrorProfileInactive', 'Inaktiv')}`}
          >
            {content}
          </button>
        );
      }

      // Nicht steuernd: reine Anzeige
      return (
        <div key={profile.id} className={rowClass}>
          {content}
        </div>
      );
    };

    // ===================== Haupt-Render =====================

    // Fehler
    if (profilesError) {
      return (
        <div className="flex flex-col gap-3 px-4 pb-8">
          {renderHeader()}
          {renderError()}
        </div>
      );
    }

    // Laden
    if (profiles === null) {
      return (
        <div className="flex flex-col gap-3 px-4 pb-8">
          {renderHeader()}
          {renderSkeleton()}
        </div>
      );
    }

    // Leerstand
    if (profiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-4xl" aria-hidden>👤</span>
            <h2 className="text-lg font-semibold text-white">
              {tOr(t, 'characterScreen.title', 'Profiles')}
            </h2>
            <p className="text-sm text-white/40">
              {tOr(t, 'mobile.mirrorProfileNoProfiles', 'Keine Profile auf dem Desktop vorhanden')}
            </p>
          </div>
        </div>
      );
    }

    // ===================== Profil-Liste =====================
    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-3xl" aria-hidden>👤</span>
          <h2 className="text-lg font-semibold text-white">
            {tOr(t, 'characterScreen.title', 'Profiles')}
          </h2>
          <p className="text-center text-xs text-white/40">
            {tOr(t, 'mobile.mirrorProfileActiveCount', '{active} von {total} aktiv')
              .replace('{active}', String(activeCount))
              .replace('{total}', String(profiles.length))}
          </p>
        </div>

        {/* Scrollbare Profil-Liste */}
        <div className={'max-h-[58vh] flex flex-col gap-2 ' + SCROLL_AREA}>
          {profiles.map(renderProfileRow)}
        </div>

        {/* Hinweis */}
        <p className="px-2 text-center text-[11px] leading-relaxed text-white/25">
          {isControlling
            ? tOr(t, 'mobile.mirrorProfileSyncNote', 'Änderungen werden sofort auf dem Desktop übernommen')
            : tOr(t, 'mobile.mirrorProfileControlHint', 'Nur Anzeige — übernimm die Steuerung, um Profile zu aktivieren oder zu deaktivieren.')}
        </p>
      </div>
    );
}
MirrorProfileLite.displayName = 'MirrorProfileLite';
