'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { Song } from '@/types/game';

/** Compact song choice card of the daily/weekly/modes song selections.
 *  'full' (daily + weekly) shows genre/language chips + duration inline;
 *  'compact' (modes tab) only a duration line. */
export function SongChoiceCard({ song, onClick, variant = 'full', testId }: {
  song: Song;
  onClick: () => void;
  variant?: 'full' | 'compact';
  testId?: string;
}) {
  return (
    <Card className="bg-white/5 border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]" onClick={onClick} data-testid={testId}>
      <CardContent className="pt-3 pb-3">
        <div className="text-sm font-medium text-white truncate">{song.title}</div>
        <div className="text-xs text-white/50 truncate">{song.artist}</div>
        {variant === 'full' ? (
          <div className="flex items-center gap-2 mt-1">
            {song.genre && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{song.genre}</span>}
            {song.language && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">{song.language}</span>}
            {song.duration && <span className="text-xs text-white/40">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</span>}
          </div>
        ) : (
          song.duration && <div className="text-xs text-white/40 mt-1">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</div>
        )}
      </CardContent>
    </Card>
  );
}
