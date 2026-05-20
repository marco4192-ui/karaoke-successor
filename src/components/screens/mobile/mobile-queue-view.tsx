'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import { GripVertical } from 'lucide-react';
import type { QueueItem, MobileView } from './mobile-types';
import { useMobileDragReorder } from '@/hooks/use-mobile-drag-reorder';

const MAX_QUEUE_SLOTS = 3;

interface QueueViewProps {
  queue: QueueItem[];
  slotsRemaining: number;
  queueError: string | null;
  onNavigate: (_view: MobileView) => void;
  onRemoveFromQueue?: (_itemId: string) => void;
  onReorderQueue?: (_orderedIds: string[]) => void;
  clientId?: string | null;
}

export function MobileQueueView({ queue, slotsRemaining, queueError, onNavigate, onRemoveFromQueue, onReorderQueue, clientId }: QueueViewProps) {
  const { t } = useTranslation();

  // Separate non-completed items and group: playing items (not draggable) + pending items (draggable)
  const nonCompletedItems = queue.filter(q => q.status !== 'completed');
  const playingItems = nonCompletedItems.filter(q => q.status === 'playing');
  const pendingItems = nonCompletedItems.filter(q => q.status !== 'playing');

  // Only items that belong to this user are draggable
  const userPendingItems = pendingItems.filter(q => q.addedBy === clientId);

  // Only enable drag reorder if user has more than 1 own pending item and callback exists
  const canDrag = onReorderQueue && userPendingItems.length > 1;

  const handleReorder = (newItems: QueueItem[]) => {
    if (onReorderQueue) {
      onReorderQueue(newItems.map(q => q.id));
    }
  };

  const { getItemProps, isDragging } = useMobileDragReorder<QueueItem>({
    items: userPendingItems,
    onReorder: handleReorder,
    identifier: (item) => item.id,
  });

  // Build a map from item id to drag props
  const dragPropsMap = new Map<string, ReturnType<typeof getItemProps>>();
  if (canDrag) {
    userPendingItems.forEach((item, index) => {
      dragPropsMap.set(item.id, getItemProps(item, index));
    });
  }

  return (
    <div className="p-4">
      {/* Queue Header with Slots */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('mobileViews.queueTitle')}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">{t('mobileViews.slots')}</span>
          <div className="flex gap-1">
            {Array.from({ length: MAX_QUEUE_SLOTS }, (_, i) => i + 1).map((slot) => (
              <div 
                key={slot}
                className={`w-4 h-4 rounded-full ${slot <= slotsRemaining ? 'bg-cyan-500' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Queue Error */}
      {queueError && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {queueError}
        </div>
      )}
      
      {queue.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">📋</span>
          <p>{t('mobileViews.noSongsQueue')}</p>
          <p className="text-sm mt-2">{t('mobileViews.canAddUpTo3')}</p>
          <Button 
            onClick={() => onNavigate('songs')}
            variant="outline"
            className="mt-4 border-white/20 text-white"
          >
            {t('mobileViews.browseSongs')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Reorder hint — only show when user has draggable items */}
          {canDrag && (
            <p className="text-xs text-white/30 text-center mb-2">
              {t('mobileViews.reorderHint')}
            </p>
          )}

          {/* Playing items (non-draggable) */}
          {playingItems.map((item, i) => (
            <div 
              key={item.id || `playing-${i}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30"
            >
              <span className="text-white/40 font-bold w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.songTitle}</p>
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <span>{item.songArtist}</span>
                  <span>•</span>
                  <span>{t('mobileViews.addedBy').replace('{n}', item.addedBy)}</span>
                  {item.partnerName && (
                    <>
                      <span>•</span>
                      <span className="text-purple-400">{t('mobileViews.withPartner').replace('{n}', item.partnerName)}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Game Mode Badge */}
              <div className="flex items-center gap-1">
                {item.gameMode === 'duel' && (
                  <Badge className="bg-red-500/80 text-xs">⚔️ {t('mobileViews.gameModeDuel')}</Badge>
                )}
                {item.gameMode === 'duet' && (
                  <Badge className="bg-pink-500/80 text-xs">🎭 {t('mobileViews.gameModeDuet')}</Badge>
                )}
                {(!item.gameMode || item.gameMode === 'single') && (
                  <Badge className="bg-cyan-500/80 text-xs">🎤</Badge>
                )}
              </div>
              
              <Badge className="bg-cyan-500 text-xs">{t('mobileViews.playing')}</Badge>
            </div>
          ))}

          {/* Pending items (draggable for user's own, static for others) */}
          {pendingItems.map((item, i) => {
            const isOwnItem = item.addedBy === clientId;
            const dragProps = isOwnItem ? dragPropsMap.get(item.id) : null;
            const globalIndex = playingItems.length + i + 1;

            return (
              <div 
                key={item.id || `pending-${i}`}
                {...(dragProps ? {
                  onTouchStart: dragProps.onTouchStart,
                  onTouchMove: dragProps.onTouchMove,
                  onTouchEnd: dragProps.onTouchEnd,
                } : {})}
                className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 ${
                  canDrag && isOwnItem ? 'touch-none' : ''
                }`}
                style={dragProps?.style}
              >
                {/* Drag handle (only for user's own items with drag enabled) */}
                {canDrag && isOwnItem && (
                  <div className="text-white/20 flex-shrink-0 cursor-grab active:cursor-grabbing">
                    <GripVertical size={18} />
                  </div>
                )}

                {/* Position number — offset by 1 if drag handle is shown */}
                <span className="text-white/40 font-bold w-6">{globalIndex}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.songTitle}</p>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <span>{item.songArtist}</span>
                    <span>•</span>
                    <span>{t('mobileViews.addedBy').replace('{n}', item.addedBy)}</span>
                    {item.partnerName && (
                      <>
                        <span>•</span>
                        <span className="text-purple-400">{t('mobileViews.withPartner').replace('{n}', item.partnerName)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Game Mode Badge */}
                <div className="flex items-center gap-1">
                  {item.gameMode === 'duel' && (
                    <Badge className="bg-red-500/80 text-xs">⚔️ {t('mobileViews.gameModeDuel')}</Badge>
                  )}
                  {item.gameMode === 'duet' && (
                    <Badge className="bg-pink-500/80 text-xs">🎭 {t('mobileViews.gameModeDuet')}</Badge>
                  )}
                  {(!item.gameMode || item.gameMode === 'single') && (
                    <Badge className="bg-cyan-500/80 text-xs">🎤</Badge>
                  )}
                </div>
                
                {/* Remove button — only shown for items added by this user */}
                {item.addedBy === clientId && onRemoveFromQueue && !isDragging && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(item.id || `${item.songTitle}`); }}
                    className="ml-1 text-white/30 hover:text-red-400 transition-colors p-1"
                    title={t('mobileViews.removeFromQueue')}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
