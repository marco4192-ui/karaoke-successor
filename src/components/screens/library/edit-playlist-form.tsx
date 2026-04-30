'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updatePlaylist } from '@/lib/playlist-manager';
import { Playlist } from '@/types/game';

interface EditPlaylistFormProps {
  playlist: Playlist;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPlaylistForm({ playlist, onClose, onSuccess }: EditPlaylistFormProps) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || '');
  const [tags, setTags] = useState(playlist.tags?.join(', ') || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    updatePlaylist(playlist.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onSuccess();
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="text-sm text-white/60 mb-2 block">Playlist Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Playlist"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm text-white/60 mb-2 block">Description (optional)</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this playlist about?"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      <div>
        <label className="text-sm text-white/60 mb-2 block">Tags (comma-separated, optional)</label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. party, chill, workout"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
