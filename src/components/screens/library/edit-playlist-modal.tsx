'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Playlist } from '@/types/game';
import { EditPlaylistForm } from './edit-playlist-form';
import { useTranslation } from '@/lib/i18n/translations';

interface EditPlaylistModalProps {
  show: boolean;
  onClose: (_open: boolean) => void;
  onSuccess: () => void;
  playlist: Playlist | null;
}

export function EditPlaylistModal({
  show,
  onClose,
  onSuccess,
  playlist,
}: EditPlaylistModalProps) {
  const { t } = useTranslation();
  if (!playlist) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{t('libraryPlaylist.editTitle')}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t('libraryPlaylist.editDesc')}
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
