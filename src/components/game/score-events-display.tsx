'use client';

import React from 'react';

export interface ScoreEvent {
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
  player?: 'P1' | 'P2';
}

export interface ScoreEventsDisplayProps {
  events: ScoreEvent[];
  maxVisible?: number;
  /** When true, split events by player — P1 top-right, P2 bottom-right */
  isDuetMode?: boolean;
}

const SCORE_STYLES: Record<ScoreEvent['displayType'], { className: string; boxShadow: string; icon: string; iconSize: string }> = {
  Perfect: {
    className: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black ring-2 ring-yellow-200/60',
    boxShadow: '0 0 20px rgba(255, 214, 10, 0.6), 0 0 40px rgba(255, 214, 10, 0.3)',
    icon: '⭐',
    iconSize: 'text-lg animate-bounce',
  },
  Great: {
    className: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white ring-1 ring-green-300/40',
    boxShadow: '0 0 15px rgba(34, 197, 94, 0.5), 0 0 30px rgba(34, 197, 94, 0.2)',
    icon: '✨',
    iconSize: 'text-base',
  },
  Good: {
    className: 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-white ring-1 ring-cyan-300/30',
    boxShadow: '0 0 10px rgba(0, 229, 255, 0.4)',
    icon: '🎵',
    iconSize: 'text-sm',
  },
  Okay: {
    className: 'bg-gradient-to-r from-purple-400 to-purple-500 text-white ring-1 ring-purple-300/30',
    boxShadow: '0 0 10px rgba(191, 90, 242, 0.4)',
    icon: '🎶',
    iconSize: 'text-sm',
  },
  Miss: {
    className: 'bg-gradient-to-r from-red-800 to-red-900 text-white/70 ring-1 ring-red-700/30',
    boxShadow: '0 0 10px rgba(153, 27, 27, 0.4)',
    icon: '❌',
    iconSize: 'text-sm',
  },
};

/** Renders a single score event card */
function ScoreEventCard({ event, index, compact }: { event: ScoreEvent; index: number; compact?: boolean }) {
  const style = SCORE_STYLES[event.displayType];
  return (
    <div
      key={`${event.time}-${event.player || 'p1'}-${index}`}
      className={`${compact ? 'px-2 py-1' : 'px-4 py-2'} rounded-xl font-bold shadow-2xl transform ${style.className}`}
      style={{
        animation: 'scorePopIn 0.4s ease-out, fadeOut 1.5s ease-in-out forwards',
        animationDelay: `${index * 0.05}s`,
        boxShadow: style.boxShadow,
      }}
    >
      <span className="flex items-center gap-1">
        <span className={style.iconSize}>{style.icon}</span>
        <span className={compact ? 'text-xs' : 'text-sm'}>{event.displayType.toUpperCase()}</span>
        {event.points > 0 && (
          <span className={compact ? 'text-sm font-black' : 'text-lg font-black'}>+{event.points}</span>
        )}
      </span>
    </div>
  );
}

/** Column of score events (shared between single and duel/duet layouts) */
function ScoreEventColumn({ events, position, compact }: { events: ScoreEvent[]; position: 'left' | 'right' | 'top-right' | 'bottom-right' | 'center'; compact?: boolean }) {
  const positionClass = position === 'left'
    ? 'fixed top-1/2 left-8 -translate-y-1/2'
    : position === 'top-right'
      ? 'fixed top-[25%] right-6'
      : position === 'bottom-right'
        ? 'fixed bottom-[25%] right-6'
        : 'fixed top-1/2 right-8 -translate-y-1/2';

  return (
    <div className={`${positionClass} flex flex-col-reverse gap-1.5 z-50 pointer-events-none`}>
      {events.map((event, i) => (
        <ScoreEventCard key={`${event.time}-${event.player || ''}-${i}`} event={event} index={i} compact={compact} />
      ))}
    </div>
  );
}

export const ScoreEventsDisplay = React.memo(function ScoreEventsDisplay({
  events,
  maxVisible = 5,
  isDuetMode = false,
}: ScoreEventsDisplayProps) {
  if (!isDuetMode) {
    // Single player / standard mode — centered right (classic position)
    return <ScoreEventColumn events={events.slice(-maxVisible)} position="center" />;
  }

  // Duel / Duet mode — both players on the right side, split top/bottom
  // P1 events in the top-right quadrant (analogous to P1's top half of screen)
  // P2 events in the bottom-right quadrant (analogous to P2's bottom half of screen)
  const p1Events = events.filter(e => e.player === 'P1').slice(-maxVisible);
  const p2Events = events.filter(e => e.player === 'P2').slice(-maxVisible);
  // Events without a player tag default to P1 side
  const untaggedEvents = events.filter(e => !e.player).slice(-Math.max(0, maxVisible - p1Events.length));

  return (
    <>
      {/* P1 events — top-right (matches P1's upper screen half in duet/duel) */}
      {(p1Events.length > 0 || untaggedEvents.length > 0) && (
        <ScoreEventColumn events={[...untaggedEvents, ...p1Events].slice(-maxVisible)} position="top-right" compact />
      )}
      {/* P2 events — bottom-right (matches P2's lower screen half in duet/duel) */}
      {p2Events.length > 0 && (
        <ScoreEventColumn events={p2Events} position="bottom-right" compact />
      )}
    </>
  );
});
