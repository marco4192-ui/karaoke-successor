'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPlaylist } from '@/lib/playlist-manager';
import { useTranslation } from '@/lib/i18n/translations';

interface CreatePlaylistFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePlaylistForm({ onClose, onSuccess }: CreatePlaylistFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = () => {
    if (!name.trim()) return;
    createPlaylist(name.trim(), description.trim() || undefined);
    onSuccess();
  };
  
  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="text-sm text-white/60 mb-2 block">{t('libraryPlaylist.playlistName')}</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('libraryPlaylist.playlistNamePlaceholder')}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm text-white/60 mb-2 block">{t('libraryPlaylist.description')}</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('libraryPlaylist.descriptionPlaceholder')}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-white/20 text-white hover:bg-white/10"
        >
          {t('libraryPlaylist.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
        >
          {t('libraryPlaylist.create')}
        </Button>
      </div>
    </div>
  );
}
