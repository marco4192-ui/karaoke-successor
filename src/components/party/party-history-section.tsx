'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, History, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import {
  getPartySessions,
  clearPartySessions,
  getSessionWinner,
  formatSessionTimeAgo,
  type PartySessionRecord,
} from '@/lib/game/party-session-history';
import { PARTY_GAME_CONFIGS } from '@/components/game/unified-party-setup.config';

const MAX_SHOWN = 6;

interface ModeMeta {
  icon: string;
  color: string;
  title: string;
}

function getModeMeta(mode: string, t: (_key: string) => string): ModeMeta {
  const config = PARTY_GAME_CONFIGS[mode];
  if (config) {
    return {
      icon: config.icon,
      color: config.color,
      title: config.titleKey ? t(config.titleKey) : config.title,
    };
  }
  return { icon: '🎮', color: 'from-zinc-500 to-zinc-600', title: mode };
}

function SessionCard({ session, locale }: { session: PartySessionRecord; locale: string }) {
  const { t } = useTranslation();
  const meta = getModeMeta(session.mode, t);
  const winner = getSessionWinner(session);
  const soloPlayer = session.players.length === 1 ? session.players[0] : null;

  return (
    <div
      data-testid={`party-history-session-${session.mode}`}
      className="group relative flex-shrink-0 w-64 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 pl-6 overflow-hidden transition-all duration-300 hover:border-white/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30"
    >
      {/* mode gradient accent strip */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${meta.color}`}
        aria-hidden="true"
      />
      {/* subtle mode gradient wash */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.color} opacity-[0.08] transition-opacity duration-300 group-hover:opacity-[0.16]`}
        aria-hidden="true"
      />

      <div className="relative">
        {/* Top row: mode chip + time */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${meta.color} shadow-md shrink-0`}
              aria-hidden="true"
            >
              <span className="text-lg leading-none">{meta.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate tracking-tight">{meta.title}</div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {formatSessionTimeAgo(session.finishedAt, locale)}
              </div>
            </div>
          </div>
          {session.rounds != null && session.rounds > 0 && (
            <Badge className="bg-white/15 text-white/75 border-white/15 text-[10px] font-semibold shrink-0">
              {t(session.rounds === 1 ? 'partyHistory.roundSingular' : 'partyHistory.rounds').replace('{n}', String(session.rounds))}
            </Badge>
          )}
        </div>

        {/* Winner / solo line */}
        {winner ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-2 mb-2.5">
            {winner.avatar ? (
              <img src={winner.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-amber-400/50" />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-amber-400/50 shrink-0"
                style={{ backgroundColor: winner.color || '#b45309' }}
                aria-hidden="true"
              >
                {winner.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-amber-400/90 font-semibold">
                🏆 {t('partyHistory.winner')}
              </div>
              <div className="text-sm font-semibold text-white truncate">{winner.name}</div>
            </div>
            <div className="ml-auto text-sm font-bold text-amber-300 tabular-nums shrink-0">
              {winner.score.toLocaleString()}
            </div>
          </div>
        ) : soloPlayer ? (
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2.5 py-2 mb-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: soloPlayer.color || '#52525b' }}
              aria-hidden="true"
            >
              {soloPlayer.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm text-white/80 truncate">{soloPlayer.name}</div>
          </div>
        ) : null}

        {/* Players footer */}
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <span className="flex items-center gap-1">
            <span className="flex -space-x-1.5" aria-hidden="true">
              {session.players.slice(0, 5).map((p, i) => (
                <span
                  key={i}
                  className="w-4 h-4 rounded-full border border-black/40 inline-block"
                  style={{ backgroundColor: p.color || '#52525b' }}
                />
              ))}
            </span>
            {t(session.players.length === 1 ? 'partyHistory.playerSingular' : 'partyHistory.players').replace('{n}', String(session.players.length))}
          </span>
          {session.songTitle && (
            <span className="truncate max-w-[110px] text-white/40" title={session.songTitle}>
              🎵 {session.songTitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "Recent Parties" section for the party screen.
 * Reads localStorage directly — call `onCleared` to force a parent re-read
 * (the section manages its own sessions state and refreshes on clear).
 */
export function PartyHistorySection() {
  const { t, language } = useTranslation();
  const [sessions, setSessions] = useState<PartySessionRecord[]>(() => getPartySessions());
  const [confirmingClear, setConfirmingClear] = useState(false);

  const shown = useMemo(() => sessions.slice(0, MAX_SHOWN), [sessions]);

  const handleClear = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      window.setTimeout(() => setConfirmingClear(false), 3000);
      return;
    }
    clearPartySessions();
    setSessions([]);
    setConfirmingClear(false);
  };

  if (shown.length === 0) {
    return (
      <section aria-label={t('partyHistory.title')} className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-white/50" aria-hidden="true" />
          <h2 className="text-xl font-bold text-white/85">{t('partyHistory.title')}</h2>
        </div>
        <div
          className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-8 flex flex-col items-center text-center"
          data-testid="party-history-empty"
        >
          <div className="text-4xl mb-3 animate-starting-card-float" aria-hidden="true">🎉</div>
          <p className="text-white/50 text-sm max-w-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/40 shrink-0" aria-hidden="true" />
            {t('partyHistory.empty')}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t('partyHistory.title')} className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-white/50" aria-hidden="true" />
          <h2 className="text-xl font-bold text-white/85">{t('partyHistory.title')}</h2>
          <Badge variant="secondary" className="bg-white/10 text-white/60 text-[10px]">
            {sessions.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className={`h-9 px-3 text-xs gap-1.5 transition-colors ${
            confirmingClear
              ? 'text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-red-500/30'
              : 'text-white/40 hover:text-white/70'
          }`}
          data-testid="party-history-clear"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          {confirmingClear ? t('partyHistory.confirmClear') : t('partyHistory.clear')}
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 party-history-scroll">
        {shown.map(session => (
          <SessionCard key={session.id} session={session} locale={language} />
        ))}
      </div>
    </section>
  );
}
