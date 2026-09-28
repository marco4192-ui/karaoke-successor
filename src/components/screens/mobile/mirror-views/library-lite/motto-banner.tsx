'use client';

// ===================== Library-Lite-Mirror — Motto-Banner =====================
//
// Motto-Party-Banner (R25): ersetzt aktiv Suchfeld und Filter, zeigt Motto-
// Name und Trefferzahl an (R27a-Auslagerung aus mirror-library-lite.tsx —
// JSX byte-identisch; data-testid unverändert).

import { useTranslation } from '@/lib/i18n/translations';
import { tOr } from './helpers';
import type { GameState, MobileSong } from '../../mobile-types';

export function MottoBanner({ gameState, displaySongs, songs }: { gameState: GameState; displaySongs: MobileSong[]; songs: MobileSong[] }) {
  const { t } = useTranslation();
  // Guard entspricht 1:1 der Render-Bedingung des Orchestrators
  // (`gameState.mottoParty?.enabled ? <MottoBanner/> : <FilterBar/>`) —
  // hier wiederholt, damit TypeScript mottoParty wie im Original als
  // non-null ableitet. Verhalten/DOM identisch: der Orchestrator mountet
  // diese Komponente ausschliesslich bei aktivem Motto.
  if (!gameState.mottoParty?.enabled) return null;
  return (
    <div
      className="rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-amber-500/15 px-3.5 py-3 flex items-center gap-3"
      data-testid="mirror-library-motto-banner"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shrink-0" aria-hidden="true">🎉</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">
          {tOr(t, 'unifiedSetup.mottoPartyLabel', 'Motto-Party')}
        </p>
        <h4 className="text-white font-bold text-base truncate">
          {gameState.mottoParty.name?.trim() || tOr(t, 'unifiedSetup.mottoPartyLabel', 'Motto-Party')}
        </h4>
        <p className="text-white/40 text-[11px] leading-snug">
          {tOr(t, 'unifiedSetup.mottoPartySongs', '{n} von {m} Songs passen zum Motto')
            .replace('{n}', String(displaySongs.length))
            .replace('{m}', String(songs.length))}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-purple-500/25 border border-purple-400/30 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
        🎉 {tOr(t, 'settingsMotto.activeBadge', 'Aktiv')}
      </span>
    </div>
  );
}
