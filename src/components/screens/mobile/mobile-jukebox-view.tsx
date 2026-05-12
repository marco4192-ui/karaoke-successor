'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import type { JukeboxWishlistItem, MobileView } from './mobile-types';

interface JukeboxViewProps {
  jukeboxWishlist: JukeboxWishlistItem[];
  onNavigate: (_view: MobileView) => void;
}

export function MobileJukeboxView({ jukeboxWishlist, onNavigate }: JukeboxViewProps) {
  const { t } = useTranslation();

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
          {jukeboxWishlist.map((item, i) => (
            <div 
              key={i}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
            >
              <span className="text-white/40 font-bold w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.songTitle}</p>
                <p className="text-sm text-white/40">{item.songArtist} • {t('mobileViews.addedByMobile').replace('{n}', item.addedBy)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
