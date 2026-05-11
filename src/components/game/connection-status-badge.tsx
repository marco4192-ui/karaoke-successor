'use client';

import type { SelectedPlayer } from './unified-party-setup.types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== CONNECTION STATUS BADGE =====================
// Small colored dot showing companion connection status.
// Green = connected, Red = disconnected, Gray = unknown / mic player.

interface ConnectionStatusBadgeProps {
  player: SelectedPlayer;
  /** Override size (default: 10px dot) */
  size?: 'sm' | 'md';
  /** Show as a ring around avatar instead of standalone dot */
  asRing?: boolean;
}

export function ConnectionStatusBadge({
  player,
  size = 'sm',
  asRing = false,
}: ConnectionStatusBadgeProps) {
  const { t } = useTranslation();
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';

  // Only companion players have connection status
  if (player.playerType !== 'companion') {
    // For mic players, show a subtle mic icon or nothing
    return (
      <span className="text-xs opacity-70" title={t('connectionStatus.micPlayer')}>
        🎤
      </span>
    );
  }

  const isConnected = player.isConnected;

  if (asRing) {
    // Ring variant: placed over avatar
    return (
      <div
        className={`absolute -bottom-0.5 -right-0.5 ${dotSize} rounded-full border-2 border-gray-900 ${
          isConnected
            ? 'bg-green-500'
            : 'bg-red-500'
        }`}
        title={
          isConnected
            ? t('connectionStatus.connected').replace('{n}', player.name)
            : t('connectionStatus.disconnected').replace('{n}', player.name)
        }
      />
    );
  }

  // Standalone dot variant
  return (
    <div className="relative flex items-center justify-center" title={
      isConnected
        ? t('connectionStatus.connected').replace('{n}', player.name)
        : t('connectionStatus.disconnected').replace('{n}', player.name)
    }>
      <div
        className={`${dotSize} rounded-full ${
          isConnected
            ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
            : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
        }`}
      />
      {isConnected && (
        <div
          className={`absolute ${dotSize} rounded-full bg-green-500 animate-ping opacity-30`}
        />
      )}
    </div>
  );
}
