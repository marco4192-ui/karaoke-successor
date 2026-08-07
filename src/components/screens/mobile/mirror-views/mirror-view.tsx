'use client';

import React from 'react';

// ===================== Typen =====================
import type {
  MirrorScreenId,
  GameState,
  QueueItem,
  MobileSong,
  GameResults,
  JukeboxWishlistItem,
  MobileView,
  GameMode,
} from '../mobile-types';

// ===================== Lite-Ansichten =====================
import { MirrorHomeLite } from './mirror-home-lite';
import { MirrorLibraryLite } from './mirror-library-lite';
import { MirrorQueueLite } from './mirror-queue-lite';
import { MirrorGameLite } from './mirror-game-lite';
import { MirrorSettingsLite } from './mirror-settings-lite';
import { MirrorHighscoresLite } from './mirror-highscores-lite';
import { MirrorDailyLite } from './mirror-daily-lite';
import { MirrorPartyLite } from './mirror-party-lite';
import { MirrorResultsLite } from './mirror-results-lite';
import { MirrorJukeboxLite } from './mirror-jukebox-lite';
import { MirrorAchievementsLite } from './mirror-achievements-lite';
import { MirrorSetupWaiting } from './mirror-setup-waiting';
import { MirrorProfileLite } from './mirror-profile-lite';

// ===================== Props-Schnittstelle =====================

export interface MirrorViewProps {
  mirrorScreenId: MirrorScreenId;
  gameState: GameState;
  clientId: string | null;
  profileName: string;

  // Warteschlange & Daten
  queue: QueueItem[];
  slotsRemaining: number;
  onRemoveFromQueue: (id: string) => void;
  onReorderQueue: (orderedIds: string[]) => Promise<void>;

  // Lieder
  songSearch: string;
  onSongSearchChange: (v: string) => void;
  songsLoading: boolean;
  songsError: string | null;
  songs: MobileSong[];
  filteredSongs: MobileSong[];
  showSongOptions: MobileSong | null;
  selectedGameMode: GameMode;
  selectedPartner: { id: string; name: string } | null;
  availablePartners: Array<{ id: string; name: string; code: string }>;
  opponents: any[];
  availableProfiles: any[];
  onShowSongOptions: (s: MobileSong | null) => void;
  onSelectGameMode: (m: GameMode) => void;
  onSelectPartner: (p: { id: string; name: string } | null) => void;
  onAddToQueue: (s: MobileSong) => Promise<void>;
  onLoadPartners: () => void;
  onLoadOpponents: () => void;
  onRefreshSongs: () => void;
  formatDuration: (ms: number) => string;
  difficulty: 'easy' | 'normal' | 'hard';
  onDifficultyChange: (d: 'easy' | 'normal' | 'hard') => void;
  playerMicSource: 'companion' | 'microphone';
  onPlayerMicSourceChange: (s: 'companion' | 'microphone') => void;
  partnerMicSource: 'companion' | 'microphone';
  onPartnerMicSourceChange: (s: 'companion' | 'microphone') => void;
  duetPartsSwapped: boolean;
  onDuetPartsSwappedChange: (v: boolean) => void;
  addedQueuePosition: number;

  // Jukebox
  jukeboxWishlist: JukeboxWishlistItem[];
  onRemoveFromJukebox: (id: string) => void;
  onRefreshJukebox: () => void;

  // Ergebnisse
  gameResults: GameResults | null;

  // Navigation
  onNavigate: (v: MobileView) => void;
  onOpenChat: () => void;

  // Fernsteuerung
  isRemoteLocked: boolean;
  remoteLockedBy: string | null;
  onAcquireRemote: () => void;
  onReleaseRemote: () => void;

  // Desktop-Mirroring: sendet einen Navigations-Command an den Desktop
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Hauptkomponente =====================

/**
 * Mirror-View-Container – schaltet automatisch zwischen den
 * Lite-Ansichten um, basierend auf dem aktuellen Desktop-Bildschirm.
 */
export const MirrorView = React.memo<MirrorViewProps>(function MirrorView({
  mirrorScreenId,
  gameState,
  clientId,
  profileName,
  queue,
  slotsRemaining,
  onRemoveFromQueue,
  onReorderQueue,
  songSearch,
  onSongSearchChange,
  songsLoading,
  songsError,
  songs,
  filteredSongs,
  showSongOptions,
  selectedGameMode,
  selectedPartner,
  availablePartners,
  opponents,
  availableProfiles,
  onShowSongOptions,
 onSelectGameMode,
 onSelectPartner,
  onAddToQueue,
  onLoadPartners,
  onLoadOpponents,
  onRefreshSongs,
  formatDuration,
  difficulty,
  onDifficultyChange,
  playerMicSource,
  onPlayerMicSourceChange,
  partnerMicSource,
  onPartnerMicSourceChange,
  duetPartsSwapped,
  onDuetPartsSwappedChange,
  addedQueuePosition,
  jukeboxWishlist,
  onRemoveFromJukebox,
  onRefreshJukebox,
  gameResults,
  onNavigate,
  onOpenChat,
  isRemoteLocked,
  remoteLockedBy,
  onAcquireRemote,
  onReleaseRemote,
  onSendDesktopCommand,
}) {
  const navBase = { onNavigate, gameState };
  const remoteBase = { isRemoteLocked, remoteLockedBy, onAcquireRemote, onReleaseRemote };
  const desktopMirrorBase = { onSendDesktopCommand };

  switch (mirrorScreenId) {
    // ---------- Startseite ----------
    case 'home':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorHomeLite
            gameState={gameState}
            queue={queue}
            onOpenChat={onOpenChat}
            onSendDesktopCommand={onSendDesktopCommand}
          />
        </div>
      );

    // ---------- Bibliothek / Liedsuche ----------
    case 'library':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorLibraryLite
            songSearch={songSearch}
            onSongSearchChange={onSongSearchChange}
            songsLoading={songsLoading}
            songsError={songsError}
            songs={songs}
            filteredSongs={filteredSongs}
            showSongOptions={showSongOptions}
            selectedGameMode={selectedGameMode}
            selectedPartner={selectedPartner}
            availablePartners={availablePartners}
            opponents={opponents}
            availableProfiles={availableProfiles}
            onShowSongOptions={onShowSongOptions}
            onSelectGameMode={onSelectGameMode}
            onSelectPartner={onSelectPartner}
            onAddToQueue={onAddToQueue}
            onLoadPartners={onLoadPartners}
            onLoadOpponents={onLoadOpponents}
            onRefreshSongs={onRefreshSongs}
            formatDuration={formatDuration}
            difficulty={difficulty}
            onDifficultyChange={onDifficultyChange}
            playerMicSource={playerMicSource}
            onPlayerMicSourceChange={onPlayerMicSourceChange}
            partnerMicSource={partnerMicSource}
            onPartnerMicSourceChange={onPartnerMicSourceChange}
            duetPartsSwapped={duetPartsSwapped}
            onDuetPartsSwappedChange={onDuetPartsSwappedChange}
            addedQueuePosition={addedQueuePosition}
            {...navBase}
          />
        </div>
      );

    // ---------- Warteschlange ----------
    case 'queue':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorQueueLite
            queue={queue}
            slotsRemaining={slotsRemaining}
            onRemoveFromQueue={onRemoveFromQueue}
            onReorderQueue={onReorderQueue}
            {...navBase}
            {...desktopMirrorBase}
          />
        </div>
      );

    // ---------- Aktives Spiel ----------
    case 'game':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorGameLite
            gameState={gameState}
            clientId={clientId}
            profileName={profileName}
            onNavigate={onNavigate}
            {...desktopMirrorBase}
          />
        </div>
      );

    // ---------- Einstellungen ----------
    case 'settings':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorSettingsLite {...navBase} {...desktopMirrorBase} />
        </div>
      );

    // ---------- Bestenliste ----------
    case 'highscores':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorHighscoresLite {...navBase} {...desktopMirrorBase} />
        </div>
      );

    // ---------- Tagesherausforderung ----------
    case 'dailyChallenge':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorDailyLite {...navBase} {...desktopMirrorBase} />
        </div>
      );

    // ---------- Party-Modus ----------
    case 'party':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorPartyLite {...navBase} {...desktopMirrorBase} />
        </div>
      );

    // ---------- Spielergebnisse ----------
    case 'results':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorResultsLite
            gameResults={gameResults}
            onNavigate={onNavigate}
            {...desktopMirrorBase}
          />
        </div>
      );

    // ---------- Jukebox ----------
    case 'jukebox':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorJukeboxLite
            jukeboxWishlist={jukeboxWishlist}
            onRemoveFromJukebox={onRemoveFromJukebox}
            onRefreshJukebox={onRefreshJukebox}
            {...navBase}
            {...desktopMirrorBase}
          />
        </div>
      );

    // ---------- Erfolge ----------
    case 'achievements':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorAchievementsLite {...navBase} {...desktopMirrorBase} />
        </div>
      );

    // ---------- Profile-Verwaltung ----------
    case 'profile':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorProfileLite
            gameState={gameState}
            onNavigate={onNavigate}
            availableProfiles={availableProfiles}
            {...desktopMirrorBase}
          />
        </div>
      );

    // ---------- Wartebildschirm ----------
    case 'party-setup':
    case 'setup-waiting':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorSetupWaiting
            gameState={gameState}
            clientId={clientId}
            profileName={profileName}
            onNavigate={onNavigate}
          />
        </div>
      );

    // ---------- Fallback: Startseite ----------
    default:
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <MirrorHomeLite
            gameState={gameState}
            queue={queue}
            onOpenChat={onOpenChat}
            onSendDesktopCommand={onSendDesktopCommand}
          />
        </div>
      );
  }
});