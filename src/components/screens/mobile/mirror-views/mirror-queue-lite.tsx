'use client';

import React, { useCallback, useRef, useState } from 'react';
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
  /** Sendet einen Command an den Desktop */
  onSendDesktopCommand: (command: string) => void;
  availableProfiles?: Array<{ id: string; name: string; avatar?: string; color: string }>;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export function MirrorQueueLite({
    queue,
    slotsRemaining,
    onRemoveFromQueue,
    onReorderQueue,
    onSendDesktopCommand,
    availableProfiles,
  }: MirrorQueueLiteProps) {
    const { t } = useTranslation();
    const dragItemRef = useRef<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleRemove = useCallback(
      (id: string) => { onRemoveFromQueue(id); },
      [onRemoveFromQueue],
    );

    const handlePlayItem = useCallback(
      (id: string) => {
        haptic();
        // Move the target item to position 0, then play
        const activeItems = queue.filter((q) => q.status !== 'completed');
        const currentIndex = activeItems.findIndex((item) => item.id === id);
        if (currentIndex < 0) return;
        const newOrder = activeItems.map((item) => item.id);
        // Move target to front
        const [targetId] = newOrder.splice(currentIndex, 1);
        newOrder.unshift(targetId);
        onReorderQueue(newOrder).then(() => {
          onSendDesktopCommand('play_queue');
        });
      },
      [queue, onReorderQueue, onSendDesktopCommand],
    );

    // Touch-based drag and drop for reordering
    const handleDragStart = useCallback((id: string) => {
      haptic();
      dragItemRef.current = id;
    }, []);

    const handleDragOver = useCallback((index: number) => {
      setDragOverIndex(index);
    }, []);

    const handleDragEnd = useCallback(() => {
      if (dragItemRef.current && dragOverIndex !== null) {
        const activeItems = queue.filter((q) => q.status !== 'completed');
        const fromIndex = activeItems.findIndex((item) => item.id === dragItemRef.current);
        if (fromIndex >= 0 && fromIndex !== dragOverIndex) {
          const newOrder = activeItems.map((item) => item.id);
          const [movedId] = newOrder.splice(fromIndex, 1);
          newOrder.splice(dragOverIndex, 0, movedId);
          onReorderQueue(newOrder);
        }
      }
      dragItemRef.current = null;
      setDragOverIndex(null);
    }, [queue, dragOverIndex, onReorderQueue]);

    const handleCommand = useCallback(
      (cmd: string) => { haptic(); onSendDesktopCommand(cmd); },
      [onSendDesktopCommand],
    );

    const activeItems = queue.filter((q) => q.status !== 'completed');

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorQueue')}
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
                ? `${slotsRemaining} ${t('mobile.queueSlotOne') || 'Platz frei'}`
                : `${slotsRemaining} ${t('mobile.queueSlotMany') || 'Plätze frei'}`}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCommand('play_queue')}
            disabled={activeItems.length === 0}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold ' +
              'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-white ' +
              'active:scale-[0.97] transition-transform disabled:opacity-30 disabled:pointer-events-none'
            }
          >
            <span>{t('queueScreen.playNextSong')}</span>
          </button>
          <button
            onClick={() => handleCommand('clear_queue')}
            disabled={activeItems.length === 0}
            className={
              'flex items-center justify-center gap-2 rounded-xl p-3 px-4 text-sm font-medium ' +
              'bg-red-500/10 border border-red-500/30 text-red-400 ' +
              'active:scale-[0.97] transition-transform disabled:opacity-30 disabled:pointer-events-none'
            }
          >
            <span>{'\u{1F5D1}'}</span>
          </button>
        </div>

        {/* Empty state */}
        {activeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl">{'\u{1F4CB}'}</span>
            <p className="text-sm text-white/40">
              {t('mobile.mirrorQueueEmpty')}
            </p>
            <p className="text-xs text-white/25">
              {t('mobile.mirrorQueueEmptyHint')}
            </p>
          </div>
        )}

        {/* Queue items with drag-and-drop reorder + per-item play button */}
        <div className="flex flex-col gap-2">
          {activeItems.map((item, index) => {
            const isDragging = dragItemRef.current === item.id;
            const isDragOver = dragOverIndex === index;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={() => handleDragOver(index)}
                onDragEnd={handleDragEnd}
                onTouchStart={() => handleDragStart(item.id)}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  if (el) {
                    const queueEl = el.closest('[data-queue-index]');
                    if (queueEl) {
                      handleDragOver(Number(queueEl.getAttribute('data-queue-index')));
                    }
                  }
                }}
                onTouchEnd={handleDragEnd}
                data-queue-index={index}
                className={
                  'flex items-center gap-3 rounded-xl p-3 transition-all ' +
                  (isDragging ? 'opacity-50 scale-95' : '') +
                  (isDragOver && !isDragging ? 'border-purple-500/50 bg-purple-500/10' : 'bg-white/5 border-white/10') +
                  (isDragging ? 'border-white/10' : '')
                }
              >
                {/* Drag handle */}
                <span className="text-white/20 text-sm cursor-grab active:text-white/50 select-none">{'\u2805'}</span>

                {/* Song info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {item.songTitle}
                  </p>
                  <p className="truncate text-xs text-white/40">
                    {item.songArtist}
                  </p>
                  {item.addedBy && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {(() => {
                        const profile = availableProfiles?.find(p => p.name === item.addedBy);
                        if (profile?.avatar) {
                          return <img src={profile.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />;
                        }
                        const clr = profile?.color || '#06B6D4';
                        return (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ backgroundColor: clr + '60' }}
                          >
                            {(item.addedBy?.[0] || '?').toUpperCase()}
                          </div>
                        );
                      })()}
                      <span className="text-[10px] text-white/40 truncate">{item.addedBy}</span>
                    </div>
                  )}
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

                {/* Play button per item */}
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlayItem(item.id); }}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400 active:scale-90 active:bg-cyan-500/30 transition-all"
                  title={t('queueScreen.playNextSong') || 'Play'}
                >
                  {'\u25B6'}
                </button>

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                  className={
                    'shrink-0 rounded-lg px-2 py-1 text-xs font-medium ' +
                    'bg-red-500/15 text-red-400/80 ' +
                    'active:scale-95 transition-transform'
                  }
                >
                  {'\u2715'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
}MirrorQueueLite.displayName = 'MirrorQueueLite';
