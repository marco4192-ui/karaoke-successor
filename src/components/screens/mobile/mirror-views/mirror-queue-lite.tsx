'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { QueueItem, GameState, MobileView, DesktopSettingsSnapshot } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

/** i18n with a hard fallback (mirror views load a lite dictionary — keys
 *  can be missing; then the German fallback keeps the UI usable). */
function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

// ===================== Props =====================

interface MirrorQueueLiteProps {
  queue: QueueItem[];
  slotsRemaining: number;
  onRemoveFromQueue: (id: string) => void;
  onReorderQueue: (orderedIds: string[]) => Promise<void>;
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  /** Sendet einen Command an den Desktop */
  onSendDesktopCommand: (command: string) => void;
  availableProfiles?: Array<{ id: string; name: string; avatar?: string; color: string }>;
  /** R33/P16: Desktop-Settings-Snapshot — optionale Prop, die der Shell an
   *  alle Mirror-Views durchreicht. Die Queue braucht ihn inhaltlich nicht,
   *  aber die Signatur bleibt so kompatibel (Shell darf ihn immer geben). */
  settingsSnapshot?: DesktopSettingsSnapshot | null;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Mini-Cover-Kachel (R33/P13+P15) =====================

/** Stabiler Farb-Hue aus der Song-ID (fuer die Initialen-Fallback-Kachel —
 *  deterministisch, ueberlebt Reloads & Tabs). */
function songCoverHue(songId: string): number {
  let h = 0;
  for (let i = 0; i < songId.length; i++) h = (h * 31 + songId.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

/** Max. 2 Initialen aus dem Songtitel ("Dancing Queen" → "DQ"). */
function songInitials(title: string): string {
  const parts = (title || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * R33/P13: kleine, wiederverwendbare Cover-Kachel (bewusst KEIN Shared-File —
 * in mirror-library-lite & mirror-queue-lite dupliziert).
 * Lädt das 96px-JPEG-Mini-Cover vom Desktop:
 *   GET /api/mobile?action=songcover&songId=<id> → image/jpeg (Cache 1 Tag) | 404
 * mit loading="lazy" — nur sichtbare Einträge fordern das Cover an (kein
 * Prefetch). Bis das Bild da ist — oder wenn der Desktop keines geliefert
 * hat (404 → onError) — liegt darunter eine farbige Kachel mit den
 * Song-Initialen (Farbe = Hash der Song-ID). React.memo hält die Kachel
 * bei Queue-Updates billig.
 */
const SongCoverTile = React.memo(function SongCoverTile({
  songId,
  title,
  className = '',
}: {
  songId: string;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hue = songCoverHue(songId);
  return (
    <div
      aria-hidden="true"
      className={'relative shrink-0 overflow-hidden ' + className}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 38%), hsl(${(hue + 40) % 360} 50% 22%))` }}
    >
      {/* Initialen-Fallback (liegt UNTER dem Bild — sobald das JPEG da ist,
          ueberdeckt es die Kachel) */}
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tracking-wider text-white/85 select-none">
        {songInitials(title)}
      </span>
      {!failed && (
        <img
          src={'/api/mobile?action=songcover&songId=' + encodeURIComponent(songId)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
});

// ===================== Component =====================

export function MirrorQueueLite({
    queue,
    slotsRemaining,
    onRemoveFromQueue,
    onReorderQueue,
    onSendDesktopCommand,
    availableProfiles,
  }: MirrorQueueLiteProps) {
    const { t } = useTranslation();
    const dragItemRef = useRef<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // R33/P17: Companions starten KEINE Songs mehr. Der bisherige
    // "Naechsten Song spielen"-Button (play_queue) und der ▶-Play-Button
    // pro Queue-Item (reorder + play_queue) sind ENTFERNT — der Desktop
    // entscheidet, wann gesungen wird. Uebrig bleiben: Drag-Reorder,
    // Entfernen (pro Item + komplette Queue leeren), Slots-Anzeige,
    // Partner/Duett-Info und die Mini-Covers (P13).

    const handleRemove = useCallback(
      (id: string) => { haptic(); onRemoveFromQueue(id); },
      [onRemoveFromQueue],
    );

    // Touch-based drag and drop for reordering
    const handleDragStart = useCallback((id: string) => {
      haptic();
      dragItemRef.current = id;
    }, []);

    const handleDragOver = useCallback((index: number) => {
      setDragOverIndex(index);
    }, []);

    const handleDragEnd = useCallback(() => {
      if (dragItemRef.current && dragOverIndex !== null) {
        const activeItems = queue.filter((q) => q.status !== 'completed');
        const fromIndex = activeItems.findIndex((item) => item.id === dragItemRef.current);
        if (fromIndex >= 0 && fromIndex !== dragOverIndex) {
          const newOrder = activeItems.map((item) => item.id);
          const [movedId] = newOrder.splice(fromIndex, 1);
          newOrder.splice(dragOverIndex, 0, movedId);
          onReorderQueue(newOrder);
        }
      }
      dragItemRef.current = null;
      setDragOverIndex(null);
    }, [queue, dragOverIndex, onReorderQueue]);

    const handleCommand = useCallback(
      (cmd: string) => { haptic(); onSendDesktopCommand(cmd); },
      [onSendDesktopCommand],
    );

    const activeItems = queue.filter((q) => q.status !== 'completed');
    const totalSlots = activeItems.length + slotsRemaining;

    // Game-Mode-Label (uebersetzt statt rohem 'duel'/'duet'/'single')
    const modeLabel = useCallback((mode?: string): string => {
      if (mode === 'duel') return t('queueScreen.duel') === 'queueScreen.duel' ? 'Duell' : t('queueScreen.duel');
      if (mode === 'duet') return t('queueScreen.duet') === 'queueScreen.duet' ? 'Duett' : t('queueScreen.duet');
      if (mode === 'single') return t('queueScreen.single') === 'queueScreen.single' ? 'Solo' : t('queueScreen.single');
      return mode || '';
    }, [t]);

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorQueue')}
          </h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
            {activeItems.length} / {totalSlots}
          </span>
        </div>

        {/* Slots-Anzeige (max. 3): Text + gefuellte/freie Slot-Punkte.
            Immer sichtbar — auch "alle belegt" ist ein Info-Zustand. */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-cyan-500/10 px-3 py-2 border border-cyan-400/20">
          <span className="text-xs text-cyan-300">
            {slotsRemaining === 1
              ? `${slotsRemaining} ${t('mobile.queueSlotOne') || 'Platz frei'}`
              : slotsRemaining > 1
                ? `${slotsRemaining} ${t('mobile.queueSlotMany') || 'Plätze frei'}`
                : tOr(t, 'mobile.queueSlotsFull', 'Alle Plätze belegt')}
          </span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: totalSlots }, (_, i) => (
              <span
                key={i}
                className={'h-2 rounded-full transition-all ' + (i < activeItems.length ? 'w-5 bg-cyan-400' : 'w-2 bg-white/15')}
              />
            ))}
          </div>
        </div>

        {/* R33/P17-Hinweis: Start-Kontrolle liegt beim Desktop */}
        {activeItems.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
            <span className="text-xs shrink-0">{'\u{1F5A5}\uFE0F'}</span>
            <span className="text-xs text-white/40">
              {tOr(t, 'mobile.mirrorQueueDesktopControls', 'Der Desktop bestimmt, wann gesungen wird')}
            </span>
          </div>
        )}

        {/* Aktions-Button: nur noch "leeren" — kein Play/Start mehr (P17) */}
        <button
          onClick={() => handleCommand('clear_queue')}
          disabled={activeItems.length === 0}
          className={
            'w-full flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium ' +
            'bg-red-500/10 border border-red-500/30 text-red-400 ' +
            'active:scale-[0.97] transition-transform disabled:opacity-30 disabled:pointer-events-none'
          }
        >
          <span>{'\u{1F5D1}'}</span>
          <span>{tOr(t, 'queue.clearQueue', 'Warteschlange leeren')}</span>
        </button>

        {/* Empty state — huebscher: Initialen-Kachel-Look + klare CTA-Info */}
        {activeItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-gradient-to-b from-white/5 to-transparent p-8 text-center">
            <div
              className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-2xl"
              aria-hidden="true"
            >
              {'\u{1F3A4}'}
            </div>
            <p className="text-sm font-semibold text-white/70">
              {tOr(t, 'mobile.mirrorQueueEmptyTitle', 'Noch keine Wünsche')}
            </p>
            <p className="text-xs text-white/35">
              {tOr(t, 'mobile.mirrorQueueEmptyBrowse', 'Such dir einen Song in der Bibliothek!')}
            </p>
          </div>
        )}

        {/* Queue items: Drag-Reorder + Entfernen + Mini-Cover (P13).
            Eigener Scroll-Bereich (max-h + overflow-y-auto + schlanke
            Custom-Scrollbar); Cover laden lazy nur fuer sichtbare Zeilen. */}
        <div
          className={
            'flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1 ' +
            '[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] ' +
            '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15'
          }
        >
          {activeItems.map((item, index) => {
            const isDragging = dragItemRef.current === item.id;
            const isDragOver = dragOverIndex === index;
            const isPlaying = item.status === 'playing';
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={() => handleDragOver(index)}
                onDragEnd={handleDragEnd}
                onTouchStart={() => handleDragStart(item.id)}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  if (el) {
                    const queueEl = el.closest('[data-queue-index]');
                    if (queueEl) {
                      handleDragOver(Number(queueEl.getAttribute('data-queue-index')));
                    }
                  }
                }}
                onTouchEnd={handleDragEnd}
                data-queue-index={index}
                className={
                  'flex items-center gap-2.5 rounded-xl p-2.5 transition-all ' +
                  (isDragging ? 'opacity-50 scale-95 ' : '') +
                  (isDragOver && !isDragging ? 'border-purple-500/50 bg-purple-500/10' : 'bg-white/5 border-white/10') +
                  (isDragging ? 'border-white/10' : '')
                }
              >
                {/* Drag handle */}
                <span className="text-white/20 text-sm cursor-grab active:text-white/50 select-none">{'\u2805'}</span>

                {/* R33/P13: Mini-Cover (40px, lazy) — Fallback: farbige
                    Initialen-Kachel, solange kein JPEG vom Desktop kommt */}
                <SongCoverTile songId={item.songId} title={item.songTitle} className="w-10 h-10 rounded-lg" />

                {/* Song info */}
                <div className="min-w-0 flex-1">
                  <p className={'truncate text-sm font-medium ' + (isPlaying ? 'text-cyan-300' : 'text-white')}>
                    {item.songTitle}
                  </p>
                  <p className="truncate text-xs text-white/40">
                    {item.songArtist}
                  </p>
                  {item.addedBy && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {(() => {
                        const profile = availableProfiles?.find(p => p.name === item.addedBy);
                        if (profile?.avatar) {
                          return <img src={profile.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />;
                        }
                        const clr = profile?.color || '#06B6D4';
                        return (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ backgroundColor: clr + '60' }}
                          >
                            {(item.addedBy?.[0] || '?').toUpperCase()}
                          </div>
                        );
                      })()}
                      <span className="text-[10px] text-white/40 truncate">{item.addedBy}</span>
                      {item.partnerName ? (
                        <span className="text-[10px] text-white/30 truncate">{'\u00B7 vs ' + item.partnerName}</span>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Laeuft gerade (Desktop hat gestartet) */}
                {isPlaying && (
                  <span
                    className={
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase animate-pulse ' +
                      'text-cyan-300/90 bg-cyan-500/20'
                    }
                  >
                    {t('mobileViews.playing') === 'mobileViews.playing' ? 'Läuft' : t('mobileViews.playing')}
                  </span>
                )}

                {/* Game mode badge (uebersetzt: Solo/Duell/Duett) */}
                {item.gameMode && (
                  <span
                    className={
                      'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ' +
                      'text-purple-300/80 bg-purple-500/20'
                    }
                  >
                    {modeLabel(item.gameMode)}
                  </span>
                )}

                {/* Remove button — Touch-Target 44px (P17: der fruehere
                    ▶-Play-Button hierfuer ist entfallen) */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                  aria-label={t('mobileViews.removeFromQueue') === 'mobileViews.removeFromQueue' ? 'Entfernen' : t('mobileViews.removeFromQueue')}
                  className={
                    'shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ' +
                    'bg-red-500/15 text-red-400/80 ' +
                    'active:scale-95 active:bg-red-500/30 transition-all'
                  }
                >
                  {'\u2715'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
}
MirrorQueueLite.displayName = 'MirrorQueueLite';
