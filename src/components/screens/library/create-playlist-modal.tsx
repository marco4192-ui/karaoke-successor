'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreatePlaylistForm } from './create-playlist-form';

interface CreatePlaylistModalProps {
  show: boolean;
  onClose: (_open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePlaylistModal({
  show,
  onClose,
  onSuccess,
}: CreatePlaylistModalProps) {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Playlist</DialogTitle>
          <DialogDescription className="text-white/60">
            Give your playlist a name and optionally a description
          </DialogDescription>
        </DialogHeader>
        <CreatePlaylistForm 
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
