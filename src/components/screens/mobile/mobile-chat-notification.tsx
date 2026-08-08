'use client';

import { useEffect } from 'react';

interface ChatNotificationMessage {
  fromName: string;
  text: string;
  isHost: boolean;
}

interface ChatNotificationPopupProps {
  message: ChatNotificationMessage;
  onDismiss: () => void;
}

/**
 * Zeigt eine Chat-Nachricht kurz als Overlay-Popup an,
 * verschwindet nach 3 Sekunden automatisch.
 */
export function ChatNotificationPopup({ message, onDismiss }: ChatNotificationPopupProps) {
  // Auto-dismiss nach 3s
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed top-16 left-3 right-3 z-40 animate-[slide-in-down_0.3s_ease-out]"
      onClick={onDismiss}
    >
      <div className="flex items-start gap-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 px-3.5 py-2.5 shadow-2xl">
        <span className="text-base leading-none mt-0.5 shrink-0">💬</span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold ${message.isHost ? 'text-cyan-400' : 'text-purple-400'}`}>
            {message.isHost ? 'Host' : message.fromName}
          </p>
          <p className="text-xs text-white/80 mt-0.5 line-clamp-2 leading-snug">{message.text}</p>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-down {
          0% { opacity: 0; transform: translateY(-12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
