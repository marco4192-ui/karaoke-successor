'use client';

import React from 'react';

export interface ScoreEvent {
  type: string;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
}

export interface ScoreEventsDisplayProps {
  events: ScoreEvent[];
  maxVisible?: number;
}

export function ScoreEventsDisplay({
  events,
  maxVisible = 5,
}: ScoreEventsDisplayProps) {
  return (
    <div className="fixed top-1/2 right-8 -translate-y-1/2 flex flex-col-reverse gap-3 z-50 pointer-events-none">
      {events.slice(-maxVisible).map((event, i) => (
        <div
          key={`${event.time}-${i}`}
          className={`px-5 py-3 rounded-xl font-bold text-xl shadow-2xl transform ${
            event.displayType === 'Perfect' 
              ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 text-black ring-4 ring-yellow-200/60' 
              : event.displayType === 'Great' 
                ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white ring-2 ring-green-300/40' 
                : event.displayType === 'Good' 
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white ring-2 ring-blue-300/30' 
                  : event.displayType === 'Okay' 
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white ring-2 ring-orange-300/30' 
                    : 'bg-gradient-to-r from-gray-500 to-gray-700 text-white ring-2 ring-gray-400/30'
          }`}
          style={{
            animation: 'scorePopIn 0.4s ease-out, fadeOut 1.5s ease-in-out forwards',
            animationDelay: `${i * 0.05}s`,
            boxShadow:
              event.displayType === 'Perfect'
                ? '0 0 30px rgba(255, 200, 0, 0.7), 0 0 60px rgba(255, 150, 0, 0.4), 0 0 90px rgba(255, 100, 0, 0.2)'
                : event.displayType === 'Great'
                  ? '0 0 25px rgba(34, 197, 94, 0.6), 0 0 50px rgba(34, 197, 94, 0.3)'
                  : event.displayType === 'Good'
                    ? '0 0 15px rgba(59, 130, 246, 0.5)'
                    : event.displayType === 'Okay'
                      ? '0 0 15px rgba(249, 115, 22, 0.5)'
                      : '0 0 15px rgba(107, 114, 128, 0.5)',
          }}
        >
          <span className="flex items-center gap-2">
            {event.displayType === 'Perfect' && (
              <span className="text-3xl animate-bounce">⭐</span>
            )}
            {event.displayType === 'Great' && (
              <span className="text-2xl">✨</span>
            )}
            {event.displayType === 'Good' && (
              <span className="text-xl">🎵</span>
            )}
            {event.displayType === 'Okay' && (
              <span className="text-xl">🎶</span>
            )}
            {event.displayType === 'Miss' && (
              <span className="text-xl">❌</span>
            )}
            <span className="text-lg">{event.displayType.toUpperCase()}</span>
            {event.points > 0 && (
              <span className="text-2xl font-black">+{event.points}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
