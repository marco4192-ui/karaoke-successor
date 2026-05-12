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
  /** When true, split events by player — P1 left, P2 right */
  isDuetMode?: boolean;
}

const SCORE_STYLES: Record<ScoreEvent['displayType'], { className: string; boxShadow: string; icon: string; iconSize: string }> = {
  Perfect: {
    className: 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 text-black ring-4 ring-yellow-200/60',
    boxShadow: '0 0 30px rgba(255, 200, 0, 0.7), 0 0 60px rgba(255, 150, 0, 0.4), 0 0 90px rgba(255, 100, 0, 0.2)',
    icon: '⭐',
    iconSize: 'text-3xl animate-bounce',
  },
  Great: {
    className: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white ring-2 ring-green-300/40',
    boxShadow: '0 0 25px rgba(34, 197, 94, 0.6), 0 0 50px rgba(34, 197, 94, 0.3)',
    icon: '✨',
    iconSize: 'text-2xl',
  },
  Good: {
    className: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white ring-2 ring-blue-300/30',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
    icon: '🎵',
    iconSize: 'text-xl',
  },
  Okay: {
    className: 'bg-gradient-to-r from-orange-400 to-amber-500 text-white ring-2 ring-orange-300/30',
    boxShadow: '0 0 15px rgba(249, 115, 22, 0.5)',
    icon: '🎶',
    iconSize: 'text-xl',
  },
  Miss: {
    className: 'bg-gradient-to-r from-gray-500 to-gray-700 text-white ring-2 ring-gray-400/30',
    boxShadow: '0 0 15px rgba(107, 114, 128, 0.5)',
    icon: '❌',
    iconSize: 'text-xl',
  },
};

/** Renders a single score event card */
function ScoreEventCard({ event, index }: { event: ScoreEvent; index: number }) {
  const style = SCORE_STYLES[event.displayType];
  return (
    <div
      key={`${event.time}-${event.player || 'p1'}-${index}`}
      className={`px-4 py-2 rounded-xl font-bold shadow-2xl transform ${style.className}`}
      style={{
        animation: 'scorePopIn 0.4s ease-out, fadeOut 1.5s ease-in-out forwards',
        animationDelay: `${index * 0.05}s`,
        boxShadow: style.boxShadow,
      }}
    >
      <span className="flex items-center gap-1.5">
        <span className={style.iconSize}>{style.icon}</span>
        <span className="text-sm">{event.displayType.toUpperCase()}</span>
        {event.points > 0 && (
          <span className="text-lg font-black">+{event.points}</span>
        )}
      </span>
    </div>
  );
}

/** Column of score events (shared between single and duel/duet layouts) */
function ScoreEventColumn({ events, position }: { events: ScoreEvent[]; position: 'left' | 'right' | 'center' }) {
  const positionClass = position === 'left'
    ? 'fixed top-1/2 left-8 -translate-y-1/2'
    : position === 'right'
      ? 'fixed top-1/2 right-8 -translate-y-1/2'
      : 'fixed top-1/2 right-8 -translate-y-1/2';

  return (
    <div className={`${positionClass} flex flex-col-reverse gap-2 z-50 pointer-events-none`}>
      {events.map((event, i) => (
        <ScoreEventCard key={`${event.time}-${event.player || ''}-${i}`} event={event} index={i} />
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

  // Duel / Duet mode — split by player: P1 left, P2 right
  const p1Events = events.filter(e => e.player === 'P1').slice(-maxVisible);
  const p2Events = events.filter(e => e.player === 'P2').slice(-maxVisible);
  // Events without a player tag default to P1 side
  const untaggedEvents = events.filter(e => !e.player).slice(-Math.max(0, maxVisible - p1Events.length));

  return (
    <>
      {/* P1 events — left side */}
      {(p1Events.length > 0 || untaggedEvents.length > 0) && (
        <ScoreEventColumn events={[...untaggedEvents, ...p1Events].slice(-maxVisible)} position="left" />
      )}
      {/* P2 events — right side */}
      {p2Events.length > 0 && (
        <ScoreEventColumn events={p2Events} position="right" />
      )}
    </>
  );
});
