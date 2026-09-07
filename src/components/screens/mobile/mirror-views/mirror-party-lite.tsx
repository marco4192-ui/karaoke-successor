'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { formatSessionTimeAgo } from '@/lib/game/party-session-history';

// ===================== Props =====================

interface MirrorPartyLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Party-Modi =====================

interface PartyMode {
  command: string;
  icon: string;
  labelKey: string;
  fallback: string;
  players: string;
  color: string;
  isNew?: boolean;
}

const PARTY_MODES: PartyMode[] = [
  { command: 'start_ptm',                icon: '🎤',  labelKey: 'party.passTheMic',           fallback: 'Pass the Mic',       players: '2-8',   color: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/20' },
  { command: 'start_companion_singalong', icon: '📱',  labelKey: 'party.companionSingalong',    fallback: 'Companion Singalong', players: '2-8',   color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/20' },
  { command: 'start_medley',             icon: '🎵',  labelKey: 'party.medleyContest',         fallback: 'Medley Contest',     players: '2-4',   color: 'from-purple-500/20 to-pink-500/20 border-purple-400/20' },
  { command: 'start_missing_words',      icon: '📝',  labelKey: 'party.missingWords',          fallback: 'Missing Words',       players: '1-4',   color: 'from-orange-500/20 to-red-500/20 border-orange-400/20' },
  { command: 'start_blind',              icon: '🙈',  labelKey: 'party.blindKaraoke',          fallback: 'Blind Karaoke',       players: '1-4',   color: 'from-green-500/20 to-teal-500/20 border-green-400/20' },
  { command: 'start_tournament',         icon: '🏆',  labelKey: 'party.tournamentMode',        fallback: 'Tournament',          players: '2-32',  color: 'from-amber-500/20 to-yellow-500/20 border-amber-400/20', isNew: true },
  { command: 'start_br',                 icon: '👑',  labelKey: 'party.battleRoyaleTitle',     fallback: 'Battle Royale',       players: '2-24',  color: 'from-red-600/20 to-pink-600/20 border-red-400/20', isNew: true },
  { command: 'start_rate_my_song',       icon: '⭐',  labelKey: 'party.rateMySongTitle',      fallback: 'Rate My Song',       players: '1-2',   color: 'from-amber-500/20 to-orange-500/20 border-amber-400/20', isNew: true },
];

// ===================== Session-Metadaten (Mirror) =====================

/** Mode icon/gradient for a session-mode key (compact copy of desktop config). */
const SESSION_MODE_META: Record<string, { icon: string; gradient: string; labelKey: string; fallback: string }> = {
  'pass-the-mic':        { icon: '🎤', gradient: 'from-cyan-500 to-blue-500',     labelKey: 'party.passTheMic',        fallback: 'Pass the Mic' },
  'companion-singalong': { icon: '📱', gradient: 'from-emerald-500 to-teal-500',  labelKey: 'party.companionSingalong', fallback: 'Companion Singalong' },
  'medley':              { icon: '🎵', gradient: 'from-purple-500 to-pink-500',   labelKey: 'party.medleyContest',     fallback: 'Medley Contest' },
  'missing-words':       { icon: '📝', gradient: 'from-orange-500 to-red-500',    labelKey: 'party.missingWords',      fallback: 'Missing Words' },
  'blind':               { icon: '🙈', gradient: 'from-green-500 to-teal-500',    labelKey: 'party.blindKaraoke',      fallback: 'Blind Karaoke' },
  'tournament':          { icon: '🏆', gradient: 'from-amber-500 to-yellow-500',  labelKey: 'party.tournamentMode',    fallback: 'Tournament' },
  'battle-royale':       { icon: '👑', gradient: 'from-red-600 to-pink-600',      labelKey: 'party.battleRoyaleTitle', fallback: 'Battle Royale' },
  'rate-my-song':        { icon: '⭐', gradient: 'from-amber-500 to-orange-500',  labelKey: 'party.rateMySongTitle',   fallback: 'Rate My Song' },
};

function getSessionModeMeta(mode: string, t: (k: string) => string) {
  const meta = SESSION_MODE_META[mode];
  if (!meta) return { icon: '🎮', gradient: 'from-zinc-500 to-zinc-600', title: mode };
  const label = t(meta.labelKey);
  return { icon: meta.icon, gradient: meta.gradient, title: label === meta.labelKey ? meta.fallback : label };
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Recent-Parties-Karten (Mirror) =====================

type RecentParty = NonNullable<GameState['recentParties']>[number];

function MirrorSessionCard({ session, locale }: { session: RecentParty; locale: string }) {
  const { t } = useTranslation();
  const meta = getSessionModeMeta(session.mode, t);
  const isRating = session.players.some(p => p.scoreKind === 'rating');
  const fmtScore = (score: number) => isRating
    ? `⭐ ${score.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
    : score.toLocaleString();

  return (
    <div
      data-testid={`mirror-party-history-${session.mode}`}
      className="relative flex-shrink-0 w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-4 overflow-hidden"
    >
      {/* mode gradient accent strip */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${meta.gradient}`}
        aria-hidden="true"
      />
      {/* top row: mode + time + rounds */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${meta.gradient} shadow-md shrink-0`}
            aria-hidden="true"
          >
            <span className="text-base leading-none">{meta.icon}</span>
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white truncate leading-tight">{meta.title}</div>
            <div className="text-[10px] text-white/40 mt-0.5">
              {formatSessionTimeAgo(session.finishedAt, locale)}
            </div>
          </div>
        </div>
        {session.rounds != null && session.rounds > 0 && (
          <span className="bg-white/10 border border-white/10 text-white/70 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 tabular-nums">
            {t(session.rounds === 1 ? 'partyHistory.roundSingular' : 'partyHistory.rounds').replace('{n}', String(session.rounds))}
          </span>
        )}
      </div>

      {/* winner / solo row */}
      {session.winner ? (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2 py-1.5 mb-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-amber-400/50 shrink-0"
            style={{ backgroundColor: session.winner.color || '#b45309' }}
            aria-hidden="true"
          >
            {session.winner.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-amber-400/90 font-semibold shrink-0">🏆</span>
          <span className="text-[12px] font-semibold text-white truncate">{session.winner.name}</span>
          <span className="ml-auto text-[12px] font-bold text-amber-300 tabular-nums shrink-0">
            {fmtScore(session.winner.score)}
          </span>
        </div>
      ) : session.players.length === 1 ? (
        <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 mb-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: session.players[0].color || '#52525b' }}
            aria-hidden="true"
          >
            {session.players[0].name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[12px] text-white/80 truncate">{session.players[0].name}</span>
        </div>
      ) : null}

      {/* song pill */}
      {session.songTitle && (
        <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-2 py-1 mb-2">
          <span className="text-[10px]" aria-hidden="true">🎵</span>
          <span className="truncate text-[11px] text-purple-200/90 font-medium">{session.songTitle}</span>
        </div>
      )}

      {/* players footer */}
      <div className="flex items-center gap-1.5 text-[11px] text-white/50">
        <span className="flex -space-x-1.5" aria-hidden="true">
          {session.players.slice(0, 6).map((p, i) => (
            <span
              key={i}
              className="w-3.5 h-3.5 rounded-full border border-black/40 inline-block"
              style={{ backgroundColor: p.color || '#52525b' }}
            />
          ))}
        </span>
        {t(session.players.length === 1 ? 'partyHistory.playerSingular' : 'partyHistory.players').replace('{n}', String(session.players.length))}
      </div>
    </div>
  );
}

// ===================== Component =====================

export function MirrorPartyLite({ gameState, onSendDesktopCommand }: MirrorPartyLiteProps) {
    const { t, language } = useTranslation();

    const handleStart = useCallback(
      (mode: PartyMode) => {
        haptic();
        onSendDesktopCommand(mode.command);
      },
      [onSendDesktopCommand],
    );

    const recentParties = gameState.recentParties ?? [];

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">🎉</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorPartyMode')}
          </h2>
        </div>

        {/* Game Mode Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {PARTY_MODES.map((mode) => {
            const label = t(mode.labelKey) === mode.labelKey ? mode.fallback : t(mode.labelKey);
            return (
              <button
                key={mode.command}
                onClick={() => handleStart(mode)}
                className={
                  'relative flex flex-col items-center gap-1.5 rounded-xl p-4 text-left ' +
                  'bg-gradient-to-br border active:scale-95 transition-transform '
                  + mode.color
                }
              >
                {mode.isNew && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold bg-white/90 text-black px-1.5 py-0.5 rounded-full">
                    NEW
                  </span>
                )}
                <span className="text-2xl leading-none">{mode.icon}</span>
                <span className="text-sm font-semibold text-white leading-tight">{label}</span>
                <span className="text-[10px] text-white/50">{mode.players} {t('party.players')}</span>
              </button>
            );
          })}
        </div>

        {/* Recent Parties (synced from the desktop party screen) */}
        <section aria-label={t('partyHistory.title')} className="mt-2">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-base" aria-hidden="true">🕘</span>
            <h3 className="text-sm font-bold text-white/85">{t('partyHistory.title')}</h3>
            {recentParties.length > 0 && (
              <span className="bg-white/10 text-white/60 text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums">
                {recentParties.length}
              </span>
            )}
          </div>

          {recentParties.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 flex flex-col items-center text-center">
              <div className="text-2xl mb-1.5" aria-hidden="true">🎉</div>
              <p className="text-white/50 text-xs">{t('partyHistory.empty')}</p>
            </div>
          ) : (
            <div
              className="flex flex-col gap-2 max-h-72 overflow-y-auto party-history-scroll pr-1"
              data-testid="mirror-party-history-list"
            >
              {recentParties.map(session => (
                <MirrorSessionCard key={session.id} session={session} locale={language} />
              ))}
            </div>
          )}
        </section>
      </div>
    );
}
MirrorPartyLite.displayName = 'MirrorPartyLite';
