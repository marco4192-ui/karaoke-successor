'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import type { JukeboxWishlistItem, MobileView } from './mobile-types';

interface JukeboxViewProps {
  jukeboxWishlist: JukeboxWishlistItem[];
  onNavigate: (_view: MobileView) => void;
  onRemoveFromWishlist?: (_itemId: string) => Promise<void>;
}

export function MobileJukeboxView({ jukeboxWishlist, onNavigate, onRemoveFromWishlist }: JukeboxViewProps) {
  const { t } = useTranslation();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (item: JukeboxWishlistItem) => {
    if (removingId || !onRemoveFromWishlist) return;
    setRemovingId(item.id);
    try {
      await onRemoveFromWishlist(item.id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">{t('mobileViews.jukeboxWishlist')}</h2>
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
          <span className="text-4xl mb-4 block">🎵</span>
          <p>{t('mobileViews.noSongsWishlist')}</p>
          <p className="text-sm mt-2">{t('mobileViews.songsWillAppear')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jukeboxWishlist.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.songTitle}</p>
                <p className="text-sm text-white/40">{item.songArtist} • {t('mobileViews.addedByMobile').replace('{n}', item.addedBy)}</p>
              </div>
              {onRemoveFromWishlist && (
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={removingId === item.id}
                  className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={t('mobileViews.removeFromWishlist')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
