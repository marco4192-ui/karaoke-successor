'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PLAYER_COLORS } from '@/types/game';
import { GuestIcon, SyncIcon } from './profile-icons';

interface ProfileFormFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  avatar: string;
  onAvatarChange: (avatar: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  showTypeSelector?: boolean;
  isGuest?: boolean;
  onGuestChange?: (isGuest: boolean) => void;
}

export function ProfileFormFields({
  name,
  onNameChange,
  avatar,
  onAvatarChange,
  color,
  onColorChange,
  showTypeSelector = false,
  isGuest = true,
  onGuestChange,
}: ProfileFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Profile Type */}
      {showTypeSelector && onGuestChange && (
        <div className="flex gap-2">
          <Button
            variant={isGuest ? 'default' : 'outline'}
            onClick={() => onGuestChange(true)}
            className={isGuest ? 'bg-yellow-500 hover:bg-yellow-600' : 'border-white/20'}
          >
            <GuestIcon className="w-4 h-4 mr-2" /> Guest
          </Button>
          <Button
            variant={!isGuest ? 'default' : 'outline'}
            onClick={() => onGuestChange(false)}
            className={!isGuest ? 'bg-green-500 hover:bg-green-600' : 'border-white/20'}
          >
            <SyncIcon className="w-4 h-4 mr-2" /> Synced
          </Button>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-sm font-medium mb-2 block">Name</label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter your name..."
          className="bg-white/5 border-white/20"
          maxLength={20}
        />
      </div>

      {/* Avatar URL */}
      <div>
        <label className="text-sm font-medium mb-2 block">Avatar URL (optional)</label>
        <Input
          value={avatar}
          onChange={(e) => onAvatarChange(e.target.value)}
          placeholder="https://..."
          className="bg-white/5 border-white/20"
        />
      </div>

      {/* Color */}
      <div>
        <label className="text-sm font-medium mb-2 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {PLAYER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={`w-8 h-8 rounded-full transition-all ${
                color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
