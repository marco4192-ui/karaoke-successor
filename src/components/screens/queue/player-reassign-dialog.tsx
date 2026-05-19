'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PlayerProfile, QueueItem } from '@/types/game';
import { useGameStore } from '@/lib/game/store';

interface PlayerReassignDialogProps {
  /** Queue item IDs that need player re-selection */
  needsPlayerSelection: string[];
  /** All local queue items (to find the target item) */
  queue: QueueItem[];
  /** All player profiles */
  profiles: PlayerProfile[];
  /** Translation function */
  t: (key: string) => string;
  /** Callback to dismiss / remove from the needs-reassignment list */
  onDismiss: (itemId: string) => void;
  /** Callback to remove a queue item entirely */
  onRemoveQueueItem: (id: string) => void;
}

export function PlayerReassignDialog({
  needsPlayerSelection,
  queue,
  profiles,
  t,
  onDismiss,
  onRemoveQueueItem,
}: PlayerReassignDialogProps) {
  const itemId = needsPlayerSelection[0];
  const item = queue.find(q => q.id === itemId);
  const [sel1, setSel1] = useState('');
  const [sel2, setSel2] = useState('');

  // Reset selections when itemId changes
  React.useEffect(() => {
    setSel1('');
    setSel2('');
  }, [itemId]);

  if (!item) return null;

  const activeProfiles = profiles.filter(p => p.isActive !== false);

  return (
    <Card className="bg-yellow-500/10 border-yellow-500/30 mb-6">
      <CardHeader>
        <CardTitle className="text-lg text-yellow-400">
          {t('queueScreen.playerReselectNeeded')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p
          className="text-sm text-white/80"
          dangerouslySetInnerHTML={{
            __html: t('queueScreen.playerReselectDesc')
              .replace('{song}', item.song.title)
              .replace('{mode}', item.gameMode === 'duel' ? 'Duel' : 'Duet'),
          }}
        />
        {activeProfiles.length >= 2 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {activeProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    if (!sel1) setSel1(profile.id);
                    else if (!sel2 && profile.id !== sel1) setSel2(profile.id);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    sel1 === profile.id
                      ? 'bg-pink-500 text-white'
                      : sel2 === profile.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: profile.color }}
                  >
                    {profile.name[0]}
                  </div>
                  <span className="text-sm">{profile.name}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!!sel1 && !!sel2 ? false : true}
                onClick={() => {
                  const p1 = profiles.find(p => p.id === sel1);
                  const p2 = profiles.find(p => p.id === sel2);
                  if (p1 && p2) {
                    onRemoveQueueItem(item.id);
                    useGameStore.getState().addToQueue(item.song, p1.id, p1.name, {
                      partnerId: p2.id,
                      partnerName: p2.name,
                      gameMode: item.gameMode as 'single' | 'duel' | 'duet',
                    });
                  }
                  onDismiss(itemId);
                }}
                className="bg-green-500 hover:bg-green-400 disabled:opacity-50"
              >
                {t('queueScreen.assignPlayers')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onRemoveQueueItem(item.id);
                  onDismiss(itemId);
                }}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {t('queueScreen.deleteSong')}
              </Button>
              <Button
                variant="outline"
                onClick={() => onDismiss(itemId)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {t('queueScreen.later')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{t('queueScreen.notEnoughPlayers')}</p>
            <Button
              variant="outline"
              onClick={() => {
                onRemoveQueueItem(item.id);
                onDismiss(itemId);
              }}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              {t('queueScreen.deleteFromQueue')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
