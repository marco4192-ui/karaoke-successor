'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

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
import { MirrorPtmIntroLite } from './mirror-ptm-intro-lite';
import { MirrorMedleyIntroLite } from './mirror-medley-intro-lite';
import { MirrorBattleIntroLite } from './mirror-battle-intro-lite';
import { MirrorCompetitiveIntroLite } from './mirror-competitive-intro-lite';
import { MirrorRateMySongIntroLite } from './mirror-rate-my-song-intro-lite';
import { MirrorProfileLite } from './mirror-profile-lite';
import { MirrorPartySetupLite } from './mirror-party-setup-lite';
import { MirrorSongVotingLite } from './mirror-song-voting-lite';

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
  difficulty: 'easy' | 'medium' | 'hard';
  onDifficultyChange: (d: 'easy' | 'medium' | 'hard') => void;
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
 * Per-view error boundary that catches React #300 (undefined return)
 * and any other render errors from individual mirror-lite views.
 * Falls back to null so the parent MirrorView never crashes.
 */
class MirrorViewErrorBoundary extends Component<
  { children: ReactNode; viewName: string },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn(`[MirrorView:${this.props.viewName}] Render error caught:`, err.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Safe wrapper that guarantees a child component never returns undefined.
 * React #300 occurs when a component returns undefined instead of
 * null/JSX. This wrapper catches that at the mirror-view level.
 */
function SafeView({ children, name }: { children: ReactNode; name: string }) {
  return (
    <MirrorViewErrorBoundary viewName={name}>
      {children !== undefined && children !== null ? children : null}
    </MirrorViewErrorBoundary>
  );
}

/**
 * Mirror-View-Container – schaltet automatisch zwischen den
 * Lite-Ansichten um, basierend auf dem aktuellen Desktop-Bildschirm.
 */
export const MirrorView: React.FC<MirrorViewProps> = function MirrorView({
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
          <SafeView name="home">
            <MirrorHomeLite
              gameState={gameState}
              queue={queue}
              onOpenChat={onOpenChat}
              onSendDesktopCommand={onSendDesktopCommand}
              isRemoteLocked={isRemoteLocked}
              remoteLockedBy={remoteLockedBy}
              lockedByMe={!isRemoteLocked}
              onAcquireRemote={onAcquireRemote}
              onReleaseRemote={onReleaseRemote}
            />
          </SafeView>
        </div>
      );

    // ---------- Bibliothek / Liedsuche ----------
    case 'library':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="library">
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
            clientId={clientId}
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
            onOpenChat={onOpenChat}
            {...navBase}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- Warteschlange ----------
    case 'queue':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="queue">
          <MirrorQueueLite
            queue={queue}
            slotsRemaining={slotsRemaining}
            onRemoveFromQueue={onRemoveFromQueue}
            onReorderQueue={onReorderQueue}
            availableProfiles={availableProfiles}
            {...navBase}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- Aktives Spiel ----------
    case 'game':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="game">
          <MirrorGameLite
            gameState={gameState}
            clientId={clientId}
            profileName={profileName}
            onNavigate={onNavigate}
            isRemoteLocked={isRemoteLocked}
            remoteLockedBy={remoteLockedBy}
            onAcquireRemote={onAcquireRemote}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- Einstellungen ----------
    case 'settings':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="settings">
          <MirrorSettingsLite {...navBase} {...desktopMirrorBase} />
          </SafeView>
        </div>
      );

    // ---------- Bestenliste ----------
    case 'highscores':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="highscores">
          <MirrorHighscoresLite {...navBase} {...desktopMirrorBase} />
          </SafeView>
        </div>
      );

    // ---------- Tagesherausforderung ----------
    case 'dailyChallenge':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="dailyChallenge">
          <MirrorDailyLite {...navBase} {...desktopMirrorBase} />
          </SafeView>
        </div>
      );

    // ---------- Party-Modus ----------
    case 'party':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="party">
          <MirrorPartyLite {...navBase} {...desktopMirrorBase} />
          </SafeView>
        </div>
      );

    // ---------- Spielergebnisse ----------
    case 'results':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="results">
          <MirrorResultsLite
            gameResults={gameResults}
            onNavigate={onNavigate}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- Jukebox ----------
    case 'jukebox':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="jukebox">
          <MirrorJukeboxLite
            jukeboxWishlist={jukeboxWishlist}
            onRemoveFromJukebox={onRemoveFromJukebox}
            onRefreshJukebox={onRefreshJukebox}
            {...navBase}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- Erfolge ----------
    case 'achievements':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="achievements">
          <MirrorAchievementsLite {...navBase} {...desktopMirrorBase} />
          </SafeView>
        </div>
      );

    // ---------- Profile-Verwaltung ----------
    case 'profile':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="profile">
          <MirrorProfileLite
            gameState={gameState}
            onNavigate={onNavigate}
            availableProfiles={availableProfiles}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- Party-Mode-Setup ----------
    case 'party-setup':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="party-setup">
          <MirrorPartySetupLite
            gameState={gameState}
            onNavigate={onNavigate}
            availableProfiles={availableProfiles}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- Song-Abstimmung ----------
    case 'song-voting':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="song-voting">
          <MirrorSongVotingLite
            gameState={gameState}
            onNavigate={onNavigate}
            {...desktopMirrorBase}
          />
          </SafeView>
        </div>
      );

    // ---------- PTM/CPTM Intro (Ready Screen) ----------
    case 'ptm-intro':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="ptm-intro">
          <MirrorPtmIntroLite
            gameState={gameState}
            profileName={profileName}
            onNavigate={onNavigate}
            onSendDesktopCommand={onSendDesktopCommand}
          />
          </SafeView>
        </div>
      );

    // ---------- Medley Intro ----------
    case 'medley-intro':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="medley-intro">
          <MirrorMedleyIntroLite
            gameState={gameState}
            profileName={profileName}
            onNavigate={onNavigate}
            onSendDesktopCommand={onSendDesktopCommand}
          />
          </SafeView>
        </div>
      );

    // ---------- Battle Royale / Tournament Intro ----------
    case 'battle-intro':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="battle-intro">
          <MirrorBattleIntroLite
            gameState={gameState}
            profileName={profileName}
            onNavigate={onNavigate}
            onSendDesktopCommand={onSendDesktopCommand}
          />
          </SafeView>
        </div>
      );

    // ---------- Competitive (Missing Words / Blind) Intro ----------
    case 'competitive-intro':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="competitive-intro">
          <MirrorCompetitiveIntroLite
            gameState={gameState}
            profileName={profileName}
            onNavigate={onNavigate}
            onSendDesktopCommand={onSendDesktopCommand}
          />
          </SafeView>
        </div>
      );

    // ---------- Rate My Song Intro ----------
    case 'rate-my-song-intro':
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="rate-my-song-intro">
          <MirrorRateMySongIntroLite
            gameState={gameState}
            profileName={profileName}
            onNavigate={onNavigate}
            onSendDesktopCommand={onSendDesktopCommand}
          />
          </SafeView>
        </div>
      );

    // ---------- Fallback: Startseite ----------
    default:
      return (
        <div className="min-h-[calc(100vh-8rem)]">
          <SafeView name="default">
          <MirrorHomeLite
            gameState={gameState}
            queue={queue}
            onOpenChat={onOpenChat}
            onSendDesktopCommand={onSendDesktopCommand}
            isRemoteLocked={isRemoteLocked}
            remoteLockedBy={remoteLockedBy}
            lockedByMe={!isRemoteLocked}
            onAcquireRemote={onAcquireRemote}
            onReleaseRemote={onReleaseRemote}
          />
          </SafeView>
        </div>
      );
  }
};

MirrorView.displayName = 'MirrorView';