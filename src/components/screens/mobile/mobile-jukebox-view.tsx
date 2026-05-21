'use client';

import { useCallback, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Music as MusicIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import { MobilePullRefresh } from './mobile-pull-refresh';
import type { JukeboxWishlistItem, MobileView } from './mobile-types';
import { MobileSwipeableItem } from './mobile-swipeable-item';

interface JukeboxViewProps {
  jukeboxWishlist: JukeboxWishlistItem[];
  onNavigate: (_view: MobileView) => void;
  onRemoveFromWishlist?: (_itemId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function MobileJukeboxView({ jukeboxWishlist, onNavigate, onRemoveFromWishlist, onRefresh }: JukeboxViewProps) {
  const { t } = useTranslation();
  const [removingId, setRemovingId] = useState<string | null>(null);

  // #16 FIX: Stable handleRemove with useCallback
  const handleRemove = useCallback(async (itemId: string) => {
    if (removingId || !onRemoveFromWishlist) return;
    setRemovingId(itemId);
    try {
      await onRemoveFromWishlist(itemId);
    } catch (error) {
      console.debug('[MobileJukeboxView] remove failed:', error);
    } finally {
      setRemovingId(null);
    }
  }, [removingId, onRemoveFromWishlist]);

  // #16 FIX: Memoize swipe handlers outside of render
  const swipeHandlers = useMemo(() => {
    if (!onRemoveFromWishlist) return new Map<string, () => void>();
    return new Map(
      jukeboxWishlist.map(item => [item.id, () => handleRemove(item.id)])
    );
  }, [jukeboxWishlist, onRemoveFromWishlist, handleRemove]);

  const inner = (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-1">{t('mobileViews.jukeboxWishlist')}</h2>
      <p className="text-sm text-white/40 mb-4">{t('mobileViews.addSongs')}</p>

      {/* Quick Add */}
      <Button
        onClick={() => onNavigate('songs')}
        variant="outline"
        className="w-full border-white/20 mb-4"
      >
        {t('mobileViews.addSongsToWishlistBtn')}
      </Button>

      {jukeboxWishlist.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <MusicIcon className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <p>{t('mobileViews.noSongsWishlist')}</p>
          <p className="text-sm mt-2">{t('mobileViews.songsWillAppear')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jukeboxWishlist.map((item) => (
            <MobileSwipeableItem
              key={item.id}
              onSwipeLeft={onRemoveFromWishlist ? swipeHandlers.get(item.id) : undefined}
              leftAction={onRemoveFromWishlist ? {
                icon: <Trash2 className="w-5 h-5" />,
                color: '#ef4444',
                label: t('mobileViews.swipeToDelete'),
              } : undefined}
              disabled={removingId === item.id}
            >
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                {/* F19: Cover image */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                  {item.coverImage ? (
                    <img src={item.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MusicIcon className="w-6 h-6 text-white/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.songTitle}</p>
                  <p className="text-sm text-white/40 truncate">{item.songArtist}</p>
                  <p className="text-xs text-cyan-400/60">{t('mobileViews.addedByMobile').replace('{n}', item.addedBy)}</p>
                </div>
                {onRemoveFromWishlist && (
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    disabled={removingId === item.id}
                    className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    aria-label={t('mobileViews.removeFromWishlist')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </MobileSwipeableItem>
          ))}
        </div>
      )}
    </div>
  );

  if (onRefresh) {
    return (
      <MobilePullRefresh onRefresh={onRefresh} className="h-full">
        {inner}
      </MobilePullRefresh>
    );
  }

  return inner;
}
