'use client';

import { useCallback, useRef, useState } from 'react';
import type { QueueItem, GameState, MobileView, DesktopSettingsSnapshot } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { SongCoverTile } from './mirror-cover-tile';

/** i18n with a hard fallback (mirror views load a lite dictionary — keys
 * can be missing; then the German fallback keeps the UI usable). */
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
  /** Sendet einen Command an den Desktop (mit optionalem data-Payload). */
  onSendDesktopCommand: (command: string, data?: unknown) => void;
  availableProfiles?: Array<{ id: string; name: string; avatar?: string; color: string }>;
  /** R33/P16: Desktop-Settings-Snapshot — optionale Prop, die die Shell an
   *  alle Mirror-Views durchreicht. Die Queue braucht ihn inhaltlich nicht,
   *  aber die Signatur bleibt so kompatibel (Shell darf ihn immer geben). */
  settingsSnapshot?: DesktopSettingsSnapshot | null;
  /** R39/P7: GENAU remoteLock.lockedByMe — steuert die Kontroll-Features
   *  (Play next / Clear All / Play je Song / Drag&Drop über die GESAMTE
   *  Queue inkl. Desktop-Items). */
  isControlling?: boolean;
  /** R39/P7: Eigener Verbindungscode — nicht-steuernde Companion ordnen per
   *  Drag&Drop nur ihre EIGENEN Items (Server-Validierung verlangt das). */
  ownCompanionCode?: string | null;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export function MirrorQueueLite({
    queue,
    slotsRemaining,
    onRemoveFromQueue,
    onReorderQueue,
    onSendDesktopCommand,
    availableProfiles,
    isControlling,
    ownCompanionCode,
  }: MirrorQueueLiteProps) {
    const { t } = useTranslation();
    const dragItemRef = useRef<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // R39/P7: Kontrollierende Companion starten Songs wieder (Haupt-App-
    // Parität): "Nächsten Song spielen" + ▶-Play-Button pro Item. Nicht-
    // steuernde Companion legen weiterhin NUR Songs ein — der Desktop
    // entscheidet, wann gesungen wird.
    const controlling = isControlling === true;

    const handleRemove = useCallback(
      (item: QueueItem) => {
        haptic();
        if (item.isDesktop) {
          // Desktop-lokales Item → Remote-Command (Desktop entfernt es aus
          // der zustand-Queue und sync't den Server-Spiegel zurück).
          onSendDesktopCommand('queue_remove_local', { itemId: item.id });
        } else {
          // Server-Item → removequeue-API (eigene immer, fremde mit Lock).
          onRemoveFromQueue(item.id);
        }
      },
      [onRemoveFromQueue, onSendDesktopCommand],
    );

    const handlePlayItem = useCallback(
      (item: QueueItem) => {
        haptic();
        onSendDesktopCommand('queue_play_item', { itemId: item.id });
      },
      [onSendDesktopCommand],
    );

    const handlePlayNext = useCallback(() => {
      haptic();
      onSendDesktopCommand('queue_play_next');
    }, [onSendDesktopCommand]);

    const handleClearAll = useCallback(() => {
      haptic();
      // Desktop cleart BEIDE Queues (lokal + Server) — siehe clearAllQueues
      // im QueueScreen + clearqueue-Handler am Server.
      onSendDesktopCommand('clear_queue');
    }, [onSendDesktopCommand]);
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
          if (controlling) {
            // R39/P7: Gesamte Queue neu ordnen — der Desktop wendet die neue
            // Reihenfolge auf seine lokale Queue UND die Server-Queue an.
            const newOrder = activeItems.map((item) => item.id);
            const [movedId] = newOrder.splice(fromIndex, 1);
            newOrder.splice(dragOverIndex, 0, movedId);
            onSendDesktopCommand('queue_reorder_all', { orderedIds: newOrder });
          } else {
            // Nicht-steuernd: NUR die eigenen Items neu ordnen (der Server
            // lehnt fremde Items ohne Lock ab). Die Ziel-Position wird auf
            // die eigene Item-Liste projiziert.
            const ownItems = activeItems.filter(
              (q) => !q.isDesktop && (!ownCompanionCode || q.companionCode === ownCompanionCode),
            );
            const ownFrom = ownItems.findIndex((item) => item.id === dragItemRef.current);
            if (ownFrom >= 0) {
              // Projektion: Anzahl eigener Items VOR der Ziel-Position
              const ownTarget = activeItems
                .slice(0, dragOverIndex)
                .filter((q) => ownItems.some((o) => o.id === q.id)).length;
              if (ownFrom !== ownTarget) {
                const newOrder = ownItems.map((item) => item.id);
                const [movedId] = newOrder.splice(ownFrom, 1);
                newOrder.splice(ownTarget, 0, movedId);
                void onReorderQueue(newOrder);
              }
            }
          }
        }
      }
      dragItemRef.current = null;
      setDragOverIndex(null);
    }, [queue, dragOverIndex, onReorderQueue, onSendDesktopCommand, controlling, ownCompanionCode]);

    const activeItems = queue.filter((q) => q.status !== 'completed');
    // R39/P7: Slots zählen nur die HANDY-Wünsche (3 pro Companion) — die
    // Desktop-Items der gespiegelten lokalen Queue sind davon ausgenommen.
    const companionActiveItems = activeItems.filter((q) => !q.isDesktop);
    const totalSlots = companionActiveItems.length + slotsRemaining;

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
            {activeItems.length}
            {companionActiveItems.length !== activeItems.length && (
              <span className="text-white/35"> · {companionActiveItems.length} 📱</span>
            )}
          </span>
        </div>

        {/* Slots-Anzeige (max. 3 Handy-Wünsche): Text + gefuellte/freie Slot-Punkte */}
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
                className={'h-2 rounded-full transition-all ' + (i < companionActiveItems.length ? 'w-5 bg-cyan-400' : 'w-2 bg-white/15')}
              />
            ))}
          </div>
        </div>

        {/* R39/P7: Kontroll-Aktionen (nur steuernder Companion) —
            Haupt-App-Parität: Play next + Clear All */}
        {controlling && activeItems.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handlePlayNext}
              disabled={activeItems.length === 0}
              data-testid="mirror-queue-play-next"
              className={
                'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold ' +
                'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400/40 text-cyan-300 ' +
                'active:scale-[0.97] transition-transform disabled:opacity-30 disabled:pointer-events-none'
              }
            >
              <span className="text-base">{'\u25B6'}</span>
              <span>{tOr(t, 'queueScreen.playNextSong', 'Nächsten Song spielen')}</span>
            </button>
            <button
              onClick={handleClearAll}
              data-testid="mirror-queue-clear-all"
              className={
                'flex items-center justify-center gap-2 rounded-xl p-3 px-4 text-sm font-medium ' +
                'bg-red-500/10 border border-red-500/30 text-red-400 ' +
                'active:scale-[0.97] transition-transform'
              }
            >
              <span>{'\u{1F5D1}'}</span>
              <span>{tOr(t, 'queueScreen.clearAll', 'Alle entfernen')}</span>
            </button>
          </div>
        )}

        {/* Hinweis: Start-Kontrolle liegt beim Desktop (nur nicht-steuernd) */}
        {!controlling && activeItems.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
            <span className="text-xs shrink-0">{'\u{1F5A5}\uFE0F'}</span>
            <span className="text-xs text-white/40">
              {tOr(t, 'mobile.mirrorQueueDesktopControls', 'Der Desktop bestimmt, wann gesungen wird')}
            </span>
          </div>
        )}

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

        {/* Queue items: Drag-Reorder + Entfernen + Mini-Cover (P13) + Play
            (steuernd, P7). Eigener Scroll-Bereich (max-h + overflow-y-auto +
            schlanke Custom-Scrollbar); Cover laden lazy nur fuer sichtbare Zeilen. */}
        <div
          className={
            'flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1 kz-scroll'
          }
        >
          {activeItems.map((item, index) => {
            const isDragging = dragItemRef.current === item.id;
            const isDragOver = dragOverIndex === index;
            const isPlaying = item.status === 'playing';
            const showPlay = controlling && !isPlaying;
            // Desktop-Items kann nur der steuernde Companion entfernen
            // (Remote-Command); eigene Server-Items jeder, fremde mit Lock.
            const showRemove = !item.isDesktop || controlling;
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

                {/* R33/P13 + R34: Mini-Cover (40px, lazy) — geteilte Tile mit
                    3-Stufen-Fallback + API-Retry; Fallback: farbige
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
                        const clr = profile?.color || (item.isDesktop ? '#A78BFA' : '#06B6D4');
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
                      {item.isDesktop && (
                        <span className="shrink-0 rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-semibold text-violet-300/90" title="Desktop">
                          {'\u{1F5A5}\uFE0F'}
                        </span>
                      )}
                      {item.playerMicSource === 'companion' && (
                        <span className="shrink-0 rounded bg-cyan-500/20 px-1 py-0.5 text-[9px] font-semibold text-cyan-300/90" title="Companion App">
                          {'\u{1F4F1}'}
                        </span>
                      )}
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

                {/* R39/P7: Play-Button pro Song (nur steuernder Companion) */}
                {showPlay && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlayItem(item); }}
                    aria-label={tOr(t, 'queueScreen.play', 'Abspielen')}
                    data-testid="mirror-queue-item-play"
                    className={
                      'shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ' +
                      'bg-cyan-500/15 text-cyan-400 ' +
                      'active:scale-95 active:bg-cyan-500/30 transition-all'
                    }
                  >
                    {'\u25B6'}
                  </button>
                )}

                {/* Remove button — Touch-Target 44px */}
                {showRemove && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(item); }}
                    aria-label={t('mobileViews.removeFromQueue') === 'mobileViews.removeFromQueue' ? 'Entfernen' : t('mobileViews.removeFromQueue')}
                    data-testid="mirror-queue-item-remove"
                    className={
                      'shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ' +
                      'bg-red-500/15 text-red-400/80 ' +
                      'active:scale-95 active:bg-red-500/30 transition-all'
                    }
                  >
                    {'\u2715'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
}
MirrorQueueLite.displayName = 'MirrorQueueLite';
