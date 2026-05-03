'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Playlist } from '@/types/game';
import { EditPlaylistForm } from './edit-playlist-form';

interface EditPlaylistModalProps {
  show: boolean;
  onClose: (open: boolean) => void;
  onSuccess: () => void;
  playlist: Playlist | null;
}

export function EditPlaylistModal({
  show,
  onClose,
  onSuccess,
  playlist,
}: EditPlaylistModalProps) {
  if (!playlist) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Playlist</DialogTitle>
          <DialogDescription className="text-white/60">
            Update playlist name, description, and tags
          </DialogDescription>
        </DialogHeader>
        <EditPlaylistForm
          playlist={playlist}
          onClose={() => onClose(false)}
          onSuccess={() => {
            onSuccess();
            onClose(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
