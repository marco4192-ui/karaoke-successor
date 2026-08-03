'use client';

import React, { useCallback } from 'react';
import type { QueueItem, GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorQueueLiteProps {
  queue: QueueItem[];
  slotsRemaining: number;
  onRemoveFromQueue: (id: string) => void;
  onReorderQueue: (orderedIds: string[]) => Promise<void>;
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
}

// ===================== Component =====================

export const MirrorQueueLite = React.memo<MirrorQueueLiteProps>(
  function MirrorQueueLite({
    queue,
    slotsRemaining,
    onRemoveFromQueue,
    onReorderQueue,
  }) {
    const { t } = useTranslation();

    const handleRemove = useCallback(
      (id: string) => {
        onRemoveFromQueue(id);
      },
      [onRemoveFromQueue],
    );

    const handleMoveUp = useCallback(
      (index: number) => {
        if (index <= 0) return;
        const activeItems = queue.filter((q) => q.status !== 'completed');
        const newOrder = activeItems.map((item) => item.id);
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        onReorderQueue(newOrder);
      },
      [onReorderQueue, queue],
    );

    const handleMoveDown = useCallback(
      (index: number) => {
        const activeItems = queue.filter((q) => q.status !== 'completed');
        if (index >= activeItems.length - 1) return;
        const newOrder = activeItems.map((item) => item.id);
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        onReorderQueue(newOrder);
      },
      [onReorderQueue, queue],
    );

    const activeItems = queue.filter((q) => q.status !== 'completed');

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorQueue') || 'Queue'}
          </h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
            {activeItems.length} / {activeItems.length + slotsRemaining}
          </span>
        </div>

        {/* Slots remaining indicator */}
        {slotsRemaining > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 border border-cyan-400/20">
            <span className="text-xs text-cyan-300">
              {slotsRemaining === 1
                ? (t('mobile.queueSlotRemaining') || '1 slot remaining')
                : (t('mobile.queueSlotsRemaining') || `${slotsRemaining} slots remaining`)}
            </span>
          </div>
        )}

        {/* Empty state */}
        {activeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl">📋</span>
            <p className="text-sm text-white/40">
              {t('mobile.mirrorQueueEmpty') || 'Queue is empty'}
            </p>
            <p className="text-xs text-white/25">
              {t('mobile.mirrorQueueEmptyHint') || 'Add songs from the library to get started'}
            </p>
          </div>
        )}

        {/* Queue items */}
        <div className="flex flex-col gap-2">
          {activeItems.map((item, index) => (
            <div
              key={item.id}
              className={
                'flex items-center gap-3 rounded-xl p-3 ' +
                'bg-white/5 border border-white/10'
              }
            >
              {/* Position number */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                {index + 1}
              </span>

              {/* Song info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {item.songTitle}
                </p>
                <p className="truncate text-xs text-white/40">
                  {item.songArtist}
                </p>
              </div>

              {/* Game mode badge */}
              {item.gameMode && (
                <span
                  className={
                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ' +
                    'text-purple-300/80 bg-purple-500/20'
                  }
                >
                  {item.gameMode}
                </span>
              )}

              {/* Reorder buttons */}
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="rounded px-1 py-0.5 text-[10px] text-white/40 disabled:opacity-20 active:text-white/70"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === activeItems.length - 1}
                  className="rounded px-1 py-0.5 text-[10px] text-white/40 disabled:opacity-20 active:text-white/70"
                >
                  ▼
                </button>
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(item.id)}
                className={
                  'shrink-0 rounded-lg px-2 py-1 text-xs font-medium ' +
                  'bg-red-500/15 text-red-400/80 ' +
                  'active:scale-95 transition-transform'
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  },
);
