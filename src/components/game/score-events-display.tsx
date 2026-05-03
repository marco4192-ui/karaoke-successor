'use client';

import React from 'react';

export interface ScoreEvent {
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
}

export interface ScoreEventsDisplayProps {
  events: ScoreEvent[];
  maxVisible?: number;
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

export const ScoreEventsDisplay = React.memo(function ScoreEventsDisplay({
  events,
  maxVisible = 5,
}: ScoreEventsDisplayProps) {
  return (
    <div className="fixed top-1/2 right-8 -translate-y-1/2 flex flex-col-reverse gap-3 z-50 pointer-events-none">
      {events.slice(-maxVisible).map((event, i) => {
        const style = SCORE_STYLES[event.displayType];
        return (
          <div
            key={`${event.time}-${i}`}
            className={`px-5 py-3 rounded-xl font-bold text-xl shadow-2xl transform ${style.className}`}
            style={{
              animation: 'scorePopIn 0.4s ease-out, fadeOut 1.5s ease-in-out forwards',
              animationDelay: `${i * 0.05}s`,
              boxShadow: style.boxShadow,
            }}
          >
            <span className="flex items-center gap-2">
              <span className={style.iconSize}>{style.icon}</span>
              <span className="text-lg">{event.displayType.toUpperCase()}</span>
              {event.points > 0 && (
                <span className="text-2xl font-black">+{event.points}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
});
