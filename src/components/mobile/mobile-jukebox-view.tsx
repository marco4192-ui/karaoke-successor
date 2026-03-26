'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface JukeboxWishlistItem {
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
}

interface MobileJukeboxViewProps {
  jukeboxWishlist: JukeboxWishlistItem[];
  onNavigate: (view: 'songs') => void;
}

/**
 * Jukebox wishlist view for mobile companion app
 * Shows songs added to jukebox playlist
 */
export function MobileJukeboxView({ jukeboxWishlist, onNavigate }: MobileJukeboxViewProps) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Jukebox Wishlist</h2>
      <p className="text-sm text-white/40 mb-4">Add songs to the jukebox playlist</p>

      {/* Quick Add */}
      <Button
        onClick={() => onNavigate('songs')}
        variant="outline"
        className="w-full border-white/20 mb-4"
      >
        + Add Songs to Wishlist
      </Button>

      {jukeboxWishlist.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">🎵</span>
          <p>No songs in wishlist</p>
          <p className="text-sm mt-2">Songs you add will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jukeboxWishlist.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <span className="text-white/40 font-bold w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.songTitle}</p>
                <p className="text-sm text-white/40">
                  {item.songArtist} • Added by {item.addedBy}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileJukeboxView;
