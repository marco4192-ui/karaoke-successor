'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlayerProfile } from '@/types/game';
import type { UnifiedQueueItem } from './queue-types';

interface QueueItemCardProps {
  item: UnifiedQueueItem;
  index: number;
  profiles: PlayerProfile[];
  draggedIndex: number | null;
  t: (key: string) => string;
  onPlay: (item: UnifiedQueueItem) => void;
  onRemoveLocal: (id: string) => void;
  onRemoveCompanion: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

function getGameModeBadge(mode?: 'single' | 'duel' | 'duet', t?: (key: string) => string) {
  switch (mode) {
    case 'duel':
      return <Badge className="bg-red-500 text-xs">{t?.('queueScreen.duel') ?? 'Duel'}</Badge>;
    case 'duet':
      return <Badge className="bg-pink-500 text-xs">{t?.('queueScreen.duet') ?? 'Duet'}</Badge>;
    default:
      return <Badge className="bg-cyan-500 text-xs">{t?.('queueScreen.single') ?? 'Single'}</Badge>;
  }
}

export function QueueItemCard({
  item,
  index,
  profiles,
  draggedIndex,
  t,
  onPlay,
  onRemoveLocal,
  onRemoveCompanion,
  onDragStart,
  onDragOver,
  onDragEnd,
}: QueueItemCardProps) {
  return (
    <Card
      key={item.id}
      className={`bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors ${
        draggedIndex === index ? 'opacity-50' : ''
      } ${item.isFromCompanion ? 'border-l-4 border-l-cyan-500' : ''}`}
      draggable={!item.isFromCompanion}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onPlay(item)}
    >
      <CardContent className="p-4 flex items-center gap-4">
        {/* Position */}
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
          {index + 1}
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{item.song.title}</h3>
            {item.isFromCompanion && (
              <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                📱 Companion
              </Badge>
            )}
          </div>
          <p className="text-sm text-white/60 truncate">{item.song.artist}</p>
        </div>

        {/* Game Mode */}
        <div className="flex items-center gap-2">
          {getGameModeBadge(item.gameMode, t)}
        </div>

        {/* Players */}
        <div className="flex items-center gap-2">
          {(() => {
            const mainProfile = profiles.find(p => p.id === item.playerId);
            const isMainInactive = mainProfile && mainProfile.isActive === false;
            return (
              <div className="flex items-center gap-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: mainProfile?.color || '#888', opacity: isMainInactive ? 0.4 : 1 }}
                  title={isMainInactive ? t('queueScreen.playerDeactivated') : ''}
                >
                  {item.playerName?.[0]?.toUpperCase() || '?'}
                </div>
                {isMainInactive && (
                  <span className="text-[10px] text-red-400">⚠</span>
                )}
              </div>
            );
          })()}
          {item.partnerName && (
            <>
              <span className="text-white/40">+</span>
              {(() => {
                const partnerProfile = profiles.find(p => p.id === item.partnerId);
                const isPartnerInactive = partnerProfile && partnerProfile.isActive === false;
                return (
                  <div className="flex items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: partnerProfile?.color || '#888', opacity: isPartnerInactive ? 0.4 : 1 }}
                      title={isPartnerInactive ? t('queueScreen.playerDeactivated') : ''}
                    >
                      {(item.partnerName || '?')[0]?.toUpperCase() || '?'}
                    </div>
                    {isPartnerInactive && (
                      <span className="text-[10px] text-red-400">⚠</span>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
          >
            {t('queueScreen.play')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation();
              if (item.isFromCompanion) {
                onRemoveCompanion(item.id);
              } else {
                onRemoveLocal(item.id);
              }
            }}
          >
            ✕
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
