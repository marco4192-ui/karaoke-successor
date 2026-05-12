'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreatePlaylistForm } from './create-playlist-form';
import { useTranslation } from '@/lib/i18n/translations';

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
  const { t } = useTranslation();

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{t('libraryPlaylist.createTitle')}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t('libraryPlaylist.createDesc')}
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
