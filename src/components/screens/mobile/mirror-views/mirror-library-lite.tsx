'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { MobileSong, GameMode } from '../mobile-types';

// ===================== Types =====================

interface MirrorLibraryLiteProps {
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
}

// ===================== Helpers =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

const MODE_CONFIG = {
  single: { icon: '\uD83C\uDFA4', labelKey: 'mobileViews.gameModeSingle', color: 'cyan' as const },
  duel:   { icon: '\u2694\uFE0F', labelKey: 'mobileViews.gameModeDuel',   color: 'red' as const },
  duet:   { icon: '\uD83C\uDFAD', labelKey: 'mobileViews.gameModeDuet',   color: 'pink' as const },
};

type WizardStep = 0 | 1 | 2 | 3;
// 0 = mode + difficulty, 1 = overview + mic, 2 = opponent selection, 3 = feedback

// ===================== Component =====================

export const MirrorLibraryLite = React.memo<MirrorLibraryLiteProps>(
  function MirrorLibraryLite({
    songSearch,
    onSongSearchChange,
    songsLoading,
    songsError,
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
  }) {
    const { t } = useTranslation();
    const listRef = useRef<HTMLDivElement>(null);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [step, setStep] = useState<WizardStep>(0);
    const isBattleMode = selectedGameMode === 'duel' || selectedGameMode === 'duet';

    // Reset wizard when song options change
    useEffect(() => {
      if (showSongOptions) setStep(0);
    }, [showSongOptions]);

    // Auto-dismiss feedback after 2 s
    useEffect(() => {
      if (step === 3) {
        feedbackTimer.current = setTimeout(() => {
          setStep(0);
          onShowSongOptions(null);
        }, 2000);
      }
      return () => {
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      };
    }, [step, onShowSongOptions]);

    // Load opponents when opening duel/duet wizard
    useEffect(() => {
      if (showSongOptions && isBattleMode) {
        onLoadOpponents();
      }
    }, [showSongOptions, selectedGameMode, onLoadOpponents]);

    // Scroll list to top on search change
    useEffect(() => {
      listRef.current?.scrollTo(0, 0);
    }, [songSearch]);

    // ---- handlers ----

    const close = useCallback(() => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      setStep(0);
      onShowSongOptions(null);
      onSelectPartner(null);
      onSelectGameMode('single');
    }, [onShowSongOptions, onSelectPartner, onSelectGameMode]);

    const handleAdd = useCallback(async () => {
      if (!showSongOptions) return;
      haptic();
      await onAddToQueue(showSongOptions);
      setStep(3);
    }, [showSongOptions, onAddToQueue]);

    const handleSongTap = useCallback((song: MobileSong) => {
      haptic();
      onShowSongOptions(song);
      onLoadPartners();
    }, [onShowSongOptions, onLoadPartners]);

    const handleSearchClear = useCallback(() => {
      onSongSearchChange('');
    }, [onSongSearchChange]);

    // ---- render helpers ----

    const badge = (label: string, hue: string) => (
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${hue}`}
      >
        {label}
      </span>
    );

    // ---- main render ----

    return (
      <>
        {/* ===== Search Bar ===== */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            {/* Search icon */}
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
            <input
              type="text"
              value={songSearch}
              onChange={(e) => onSongSearchChange(e.target.value)}
              placeholder={t('mobileViews.searchPlaceholder') || 'Song suchen...'}
              className="w-full rounded-lg bg-white/5 border border-white/10 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
            />
            {/* Clear button */}
            {songSearch.length > 0 && (
              <button
                onClick={handleSearchClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/50 hover:text-white active:scale-90 transition-all"
                aria-label="Clear"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* ===== Error Banner ===== */}
        {songsError && (
          <div className="mx-4 mb-3 flex items-center justify-between rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2.5">
            <span className="text-xs text-red-400">{songsError}</span>
            <button
              onClick={() => { haptic(); onRefreshSongs(); }}
              className="shrink-0 rounded-md bg-red-500/25 px-2.5 py-1 text-[10px] font-semibold text-red-300 active:scale-95 transition-transform"
            >
              {t('mobileViews.retry') || 'Erneut versuchen'}
            </button>
          </div>
        )}

        {/* ===== Song List ===== */}
        {songsLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <span className="text-xs text-white/50">{t('common.loading') || 'Laden...'}</span>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <span className="text-2xl">\uD83C\uDFB5</span>
            <p className="text-sm text-white/40">{t('mobileViews.noSongsFound') || 'Keine Lieder gefunden'}</p>
            {songSearch && (
              <button
                onClick={() => { haptic(); onRefreshSongs(); }}
                className="mt-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/60 active:scale-95 transition-transform"
              >
                {t('mobileViews.retry') || 'Erneut versuchen'}
              </button>
            )}
          </div>
        ) : (
          <div ref={listRef} className="flex flex-col gap-2 overflow-y-auto px-4 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
            {filteredSongs.map((song) => (
              <button
                key={song.id || `${song.title}-${song.artist}`}
                onClick={() => handleSongTap(song)}
                className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5 text-left active:scale-[0.98] transition-transform"
              >
                {/* Cover */}
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50">
                  {song.coverImage ? (
                    <img
                      src={song.coverImage}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-4 w-4 text-white/25" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" /></svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-white">
                    {song.title || t('common.unknown') || 'Unbekannt'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {song.artist || t('common.unknown') || 'Unbekannt'}
                  </p>
                  {/* Badges row */}
                  {(song.genre || song.language) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {song.genre && badge(song.genre, 'bg-white/10 text-white/50')}
                      {song.language && badge(song.language, 'bg-cyan-500/15 text-cyan-400/70')}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <span className="shrink-0 text-[11px] tabular-nums text-white/30">
                  {song.duration > 0 ? formatDuration(song.duration) : '--:--'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ===== Bottom Sheet: Queue Wizard ===== */}
        {showSongOptions && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          >
            <div
              className="mx-auto w-full max-w-sm overflow-hidden rounded-t-2xl border border-white/15 bg-gray-900/95 shadow-2xl sm:rounded-2xl"
              style={{ maxHeight: '75dvh' }}
            >
              {/* ── Step 3: Feedback ── */}
              {step === 3 && (
                <div className="px-6 py-8 text-center">
                  <div className="mb-2 text-4xl">\u2713</div>
                  <p className="text-sm font-bold text-white">
                    {t('mobileViews.songAddedToQueue') || 'Song zur Warteschlange hinzugef\u00FCgt'}
                  </p>
                  {addedQueuePosition > 0 && (
                    <p className="mt-1 text-xs text-white/50">
                      {t('mobileViews.positionInQueue')?.replace('{n}', String(addedQueuePosition))
                        || `Position ${addedQueuePosition}`}
                    </p>
                  )}
                </div>
              )}

              {/* ── Step 0: Mode + Difficulty ── */}
              {step === 0 && (
                <div className="flex max-h-[75dvh] flex-col">
                  {/* Header */}
                  <div className="shrink-0 px-4 pb-2 pt-3">
                    <p className="truncate text-sm font-bold text-white">{showSongOptions.title}</p>
                    <p className="truncate text-xs text-white/40">{showSongOptions.artist}</p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3">
                    {/* Game Mode */}
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                        {t('mobileViews.gameMode') || 'Spielmodus'}
                      </label>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {(['single', 'duel', 'duet'] as const).map((mode) => {
                          const cfg = MODE_CONFIG[mode];
                          const active = selectedGameMode === mode;
                          return (
                            <button
                              key={mode}
                              onClick={() => { haptic(); onSelectGameMode(mode); }}
                              className={`rounded-lg px-2 py-2 text-center text-xs transition-all ${
                                active
                                  ? `bg-${cfg.color}-500/30 text-white border border-${cfg.color}-500/50`
                                  : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
                              }`}
                              style={
                                active
                                  ? {
                                      backgroundColor: mode === 'single' ? 'rgba(6,182,212,0.3)' : mode === 'duel' ? 'rgba(239,68,68,0.3)' : 'rgba(236,72,153,0.3)',
                                      borderColor: mode === 'single' ? 'rgba(6,182,212,0.5)' : mode === 'duel' ? 'rgba(239,68,68,0.5)' : 'rgba(236,72,153,0.5)',
                                    }
                                  : undefined
                              }
                            >
                              <span className="mb-0.5 block text-lg">{cfg.icon}</span>
                              <span className="text-[10px]">{t(cfg.labelKey)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                        {t('mobileViews.difficulty') || 'Schwierigkeit'}
                      </label>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {(['easy', 'normal', 'hard'] as const).map((d) => {
                          const active = difficulty === d;
                          return (
                            <button
                              key={d}
                              onClick={() => { haptic(); onDifficultyChange(d); }}
                              className={`rounded-lg px-2 py-1.5 text-center text-xs transition-all ${
                                active
                                  ? 'border border-purple-500/50 bg-purple-500/30 text-white'
                                  : 'border border-transparent bg-white/5 text-white/60 hover:bg-white/10'
                              }`}
                            >
                              <span className="text-[11px] font-medium">{t(`mobileViews.${d}`)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-4 pt-2">
                    <button
                      onClick={close}
                      className="flex-1 rounded-lg bg-white/5 py-2 text-xs font-medium text-white/60 active:scale-95 transition-transform"
                    >
                      {t('mobileViews.cancel') || 'Abbrechen'}
                    </button>
                    <button
                      onClick={() => {
                        haptic();
                        if (isBattleMode) {
                          onLoadOpponents();
                          setStep(2);
                        } else {
                          setStep(1);
                        }
                      }}
                      className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 py-2 text-xs font-bold text-white active:scale-95 transition-transform"
                    >
                      {t('mobileViews.next') || 'Weiter'} →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 1: Overview + Mic Selection ── */}
              {step === 1 && (
                <div className="flex max-h-[75dvh] flex-col">
                  {/* Back link */}
                  <div className="shrink-0 px-4 pb-1 pt-3">
                    <button
                      onClick={() => { haptic(); setStep(isBattleMode ? 2 : 0); }}
                      className="text-xs text-white/40 hover:text-white/70"
                    >
                      ← {isBattleMode ? (t('mobileViews.selectOpponent') || 'Gegner w\u00E4hlen') : (t('mobileViews.gameMode') || 'Spielmodus')}
                    </button>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3">
                    {/* Song overview card */}
                    <div className="space-y-1.5 rounded-lg bg-white/5 p-3">
                      <p className="truncate text-sm font-medium text-white">{showSongOptions.title}</p>
                      <p className="truncate text-xs text-white/40">{showSongOptions.artist}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            selectedGameMode === 'single'
                              ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
                              : selectedGameMode === 'duel'
                                ? 'border-red-500/30 bg-red-500/20 text-red-400'
                                : 'border-pink-500/30 bg-pink-500/20 text-pink-400'
                          }`}
                        >
                          {MODE_CONFIG[selectedGameMode].icon} {t(MODE_CONFIG[selectedGameMode].labelKey)}
                        </span>
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">
                          {t(`mobileViews.${difficulty}`)}
                        </span>
                      </div>

                      {/* VS display for duel/duet */}
                      {isBattleMode && selectedPartner && (
                        <div className="mt-2 flex items-center justify-center gap-3 rounded-lg bg-white/5 py-1.5">
                          <div className="min-w-[60px] text-center">
                            <p className="text-[10px] text-white/40">{t('mobileViews.gameModeSingle') || 'Einzeln'}</p>
                          </div>
                          <span className="text-sm font-black text-red-400">VS</span>
                          <div className="min-w-[60px] text-center">
                            <p className="max-w-[80px] truncate text-xs font-medium text-white">{selectedPartner.name}</p>
                          </div>
                        </div>
                      )}

                      {/* Duet parts swap */}
                      {selectedGameMode === 'duet' && selectedPartner && (
                        <div className="mt-1 flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-medium text-cyan-400">
                              {t('mobileViews.part1') || 'Teil 1'}
                            </span>
                            <span className="text-[10px] text-white/30">·</span>
                            <span className="text-[10px] text-white/40">{t('mobileViews.gameModeSingle') || 'Einzeln'}</span>
                          </div>
                          <button
                            onClick={() => { haptic(); onDuetPartsSwappedChange(!duetPartsSwapped); }}
                            className="rounded border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/20 active:scale-95 transition-all"
                          >
                            🔄 {t('mobileViews.switchParts') || 'Teile tauschen'}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/40">{selectedPartner.name}</span>
                            <span className="text-[10px] text-white/30">·</span>
                            <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-medium text-pink-400">
                              {t('mobileViews.part2') || 'Teil 2'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mic selection — Player */}
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                        {t('mobileViews.micSelection') || 'Mikrofon'} —{' '}
                        {isBattleMode && !duetPartsSwapped
                          ? (t('mobileViews.part1') || 'Teil 1')
                          : isBattleMode && duetPartsSwapped
                            ? (t('mobileViews.part2') || 'Teil 2')
                            : (t('mobileViews.gameModeSingle') || 'Einzeln')}
                      </label>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <MicButton
                          icon="\uD83D\uDCF1"
                          label={t('mobileViews.singViaCompanion') || '\u00DCber Companion'}
                          active={playerMicSource === 'companion'}
                          color="cyan"
                          onClick={() => { haptic(); onPlayerMicSourceChange('companion'); }}
                        />
                        <MicButton
                          icon="\uD83C\uDFA4"
                          label={t('mobileViews.singViaMic') || '\u00DCber Mikrofon'}
                          active={playerMicSource === 'microphone'}
                          color="cyan"
                          onClick={() => { haptic(); onPlayerMicSourceChange('microphone'); }}
                        />
                      </div>
                    </div>

                    {/* Mic selection — Partner (duel/duet only) */}
                    {isBattleMode && selectedPartner && (
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                          {t('mobileViews.micSelection') || 'Mikrofon'} — {selectedPartner.name}
                        </label>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                          <MicButton
                            icon="\uD83D\uDCF1"
                            label={t('mobileViews.singViaCompanion') || '\u00DCber Companion'}
                            active={partnerMicSource === 'companion'}
                            color="pink"
                            onClick={() => { haptic(); onPartnerMicSourceChange('companion'); }}
                          />
                          <MicButton
                            icon="\uD83C\uDFA4"
                            label={t('mobileViews.singViaMic') || '\u00DCber Mikrofon'}
                            active={partnerMicSource === 'microphone'}
                            color="pink"
                            onClick={() => { haptic(); onPartnerMicSourceChange('microphone'); }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-4 pt-2">
                    <button
                      onClick={close}
                      className="flex-1 rounded-lg bg-white/5 py-2 text-xs font-medium text-white/60 active:scale-95 transition-transform"
                    >
                      {t('mobileViews.cancel') || 'Abbrechen'}
                    </button>
                    <button
                      onClick={handleAdd}
                      className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 py-2 text-xs font-bold text-white active:scale-95 transition-transform"
                    >
                      + {t('mobileViews.addToQueueBtn') || 'Zur Warteschlange'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Opponent Selection ── */}
              {step === 2 && (
                <div className="flex max-h-[75dvh] flex-col">
                  {/* Back link */}
                  <div className="shrink-0 px-4 pb-1 pt-3">
                    <button
                      onClick={() => { haptic(); setStep(0); }}
                      className="text-xs text-white/40 hover:text-white/70"
                    >
                      ← {t('mobileViews.gameMode') || 'Spielmodus'}
                    </button>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-3">
                    {/* Song info */}
                    <div className="rounded-lg bg-white/5 p-2.5">
                      <p className="truncate text-xs font-medium text-white">{showSongOptions.title}</p>
                      <p className="truncate text-[10px] text-white/40">{showSongOptions.artist}</p>
                    </div>

                    {/* Opponents list */}
                    {opponents.length > 0 || availableProfiles.length > 0 ? (
                      <div className="space-y-1">
                        {opponents.length > 0 && (
                          <>
                            <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-green-400/80">
                              <span className="h-1 w-1 animate-pulse rounded-full bg-green-400" />
                              {t('mobileViews.onlineNow') || 'Jetzt online'} ({opponents.length})
                            </p>
                            <div className="max-h-[35vh] space-y-1 overflow-y-auto">
                              {opponents.map((opp: any) => {
                                const oppId = opp.connectionCode || opp.id;
                                const isSelected = selectedPartner?.id === oppId;
                                return (
                                  <button
                                    key={opp.id}
                                    onClick={() => { haptic(); onSelectPartner(isSelected ? null : { id: oppId, name: opp.name }); }}
                                    className={`flex w-full items-center gap-2.5 rounded-lg p-2 transition-all ${
                                      isSelected
                                        ? 'border border-red-500/40 bg-red-500/20'
                                        : 'border border-transparent bg-white/5 hover:bg-white/8'
                                    }`}
                                  >
                                    {/* Avatar */}
                                    {opp.avatar ? (
                                      <img src={opp.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    ) : (
                                      <div
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold text-[11px] text-white"
                                                style={{ backgroundColor: opp.color || '#6366f1' }}
                                      >
                                        {opp.name?.[0]?.toUpperCase()}
                                      </div>
                                    )}
                                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-white">{opp.name}</p>
                                    {isSelected && (
                                      <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">VS</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {availableProfiles.length > 0 && (
                          <>
                            <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                              {t('mobileViews.availableProfiles') || 'Verf\u00FCgbare Profile'} ({availableProfiles.length})
                            </p>
                            <div className="max-h-[25vh] space-y-1 overflow-y-auto">
                              {availableProfiles.map((prof: any) => {
                                const isSelected = selectedPartner?.id === prof.id;
                                return (
                                  <button
                                    key={prof.id}
                                    onClick={() => { haptic(); onSelectPartner(isSelected ? null : { id: prof.id, name: prof.name }); }}
                                    className={`flex w-full items-center gap-2.5 rounded-lg p-2 transition-all ${
                                      isSelected
                                        ? 'border border-red-500/40 bg-red-500/20'
                                        : 'border border-transparent bg-white/3 hover:bg-white/8'
                                    }`}
                                  >
                                    {prof.avatar ? (
                                      <img src={prof.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    ) : (
                                      <div
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                        style={{ backgroundColor: prof.color || '#6366f1' }}
                                      >
                                        {prof.name?.[0]?.toUpperCase()}
                                      </div>
                                    )}
                                    <p className="min-w-0 flex-1 truncate text-[11px] text-white/70">{prof.name}</p>
                                    {isSelected && (
                                      <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">VS</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    ) : availablePartners.length > 0 ? (
                      <div className="space-y-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          {t('mobileViews.onlineNow') || 'Jetzt online'}
                        </p>
                        <div className="max-h-[35vh] space-y-1 overflow-y-auto">
                          {availablePartners.map((p) => {
                            const isSelected = selectedPartner?.id === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => { haptic(); onSelectPartner(isSelected ? null : p); }}
                                className={`flex w-full items-center gap-2.5 rounded-lg p-2 transition-all ${
                                  isSelected
                                    ? 'border border-purple-500/40 bg-purple-500/20'
                                    : 'border border-transparent bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500 text-[11px] font-bold text-white">
                                  {p.name[0]}
                                </div>
                                <span className="min-w-0 flex-1 text-left text-xs">{p.name}</span>
                                <span className="text-[10px] text-white/30">#{p.code}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="py-3 text-center text-xs text-white/40">
                        {t('mobileViews.noOpponents') || 'Keine Gegner verf\u00FCgbar'}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-4 pt-2">
                    <button
                      onClick={() => { haptic(); setStep(0); }}
                      className="flex-1 rounded-lg bg-white/5 py-2 text-xs font-medium text-white/60 active:scale-95 transition-transform"
                    >
                      {t('mobileViews.cancel') || 'Abbrechen'}
                    </button>
                    {selectedPartner ? (
                      <button
                        onClick={() => { haptic(); setStep(1); }}
                        className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 py-2 text-xs font-bold text-white active:scale-95 transition-transform"
                      >
                        {t('mobileViews.next') || 'Weiter'} →
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 rounded-lg bg-white/5 py-2 text-xs font-bold text-white/30 opacity-40"
                      >
                        {t('mobileViews.next') || 'Weiter'} →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  },
);

// ===================== Mic Button Sub-Component =====================

interface MicButtonProps {
  icon: string;
  label: string;
  active: boolean;
  color: 'cyan' | 'pink';
  onClick: () => void;
}

const MicButton = React.memo<MicButtonProps>(function MicButton({
  icon,
  label,
  active,
  color,
  onClick,
}) {
  const colorMap = {
    cyan: active
      ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
      : 'border-transparent bg-white/5 text-white/50 hover:bg-white/10',
    pink: active
      ? 'border-pink-500/40 bg-pink-500/20 text-pink-300'
      : 'border-transparent bg-white/5 text-white/50 hover:bg-white/10',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-all ${colorMap[color]}`}
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
    </button>
  );
});
