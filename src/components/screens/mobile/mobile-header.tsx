'use client';

import { useTranslation } from '@/lib/i18n/translations';
import { tOr } from '@/lib/i18n/t-or';
import type { MobileProfile } from './mobile-types';
import type { PitchData } from './mobile-types';

// ===================== R54: Companion-Header =====================
// Aus mobile-client-view.tsx ausgelagert (Refactoring). Sticky Header mit
// Profil-Button, Hilfe/Chat, Verbindungsstatus, Mic-Pegel + Now-Playing-
// Ticker. Rein präsentativ — alle Callbacks kommen von oben.

export interface MobileHeaderProps {
  profile: MobileProfile;
  connectionCode: string | null;
  isConnected: boolean;
  isListening: boolean;
  currentPitch: PitchData;
  currentSong: { title: string; artist: string } | null;
  isPlaying: boolean;
  gameMode: string | null;
  showChat: boolean;
  onOpenProfile: () => void;
  onOpenHelp: () => void;
  onOpenChat: () => void;
  onDisconnect: () => void;
}

export function MobileHeader({
  profile, connectionCode, isConnected, isListening, currentPitch,
  currentSong, isPlaying, gameMode, showChat,
  onOpenProfile, onOpenHelp, onOpenChat, onDisconnect,
}: MobileHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-3 py-2.5">
        {/* Links: Profil-Button (eigenes Profil — auch ohne Steuerung erlaubt, P2) */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 active:opacity-70 transition-opacity"
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: profile.color }}
          >
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              : profile.name[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm font-medium text-white/80 max-w-[100px] truncate">{profile.name}</span>
        </button>

        {/* Rechts: Hilfe, Chat, Verbindung-Info + Abmelden */}
        <div className="flex items-center gap-2">
          {/* R33/P19: Hilfe-Button — für JEDEN jederzeit (steuernd oder nicht) */}
          <button
            onClick={onOpenHelp}
            className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 active:scale-90 transition-transform font-bold text-sm"
            title={tOr(t, 'mobileHelp.title', 'Hilfe')}
            aria-label={tOr(t, 'mobileHelp.title', 'Hilfe')}
          >
            ?
          </button>
          {/* Chat-Button im Header */}
          <button
            onClick={onOpenChat}
            className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 active:scale-90 transition-transform"
            title={t('mobile.mirrorChat')}
            aria-label={t('mobile.mirrorChat')}
          >
            <span className="text-sm leading-none">💬</span>
          </button>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connectionCode && (
            <span className="text-[10px] font-mono text-white/30">{connectionCode}</span>
          )}
          <button
            onClick={onDisconnect}
            className="text-white/30 hover:text-red-400 text-lg leading-none transition-colors p-1"
            title={t('mobileClient.disconnect')}
            aria-label={t('mobileClient.disconnect')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mic-Status-Leiste wenn aktiv */}
      {isListening && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(0, currentPitch.volume * 100))}%` }}
            />
          </div>
          {currentPitch.note !== null && (
            <span className="text-xs font-mono text-cyan-400">
              {(() => { const n = Math.round(currentPitch.note); const n2 = n % 12; const o = Math.floor(n / 12) - 1; const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']; return `${names[n2 < 0 ? n2 + 12 : n2]}${o}`; })()}
            </span>
          )}
        </div>
      )}

      {/* Now-Playing Ticker direkt unter dem Header */}
      {currentSong && !showChat && (
        <div className="relative overflow-hidden border-t border-white/5 bg-black/30">
          <div className="flex items-center h-7 px-3 min-w-0">
            {isPlaying ? (
              <span className="shrink-0 mr-2 flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </span>
            ) : (
              <span className="shrink-0 mr-2 text-white/30 text-[10px]">⏸</span>
            )}
            <div className="overflow-hidden flex-1">
              <div
                className="whitespace-nowrap animate-[marquee_12s_linear_infinite]"
              >
                <span className="text-xs text-white/60">
                  {currentSong.title} — {currentSong.artist}
                </span>
                {gameMode && (
                  <span className="ml-2 text-[10px] text-purple-300/60 uppercase tracking-wider">{gameMode}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
