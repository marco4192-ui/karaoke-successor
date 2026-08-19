'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

interface ChatMsg {
  id: string;
  fromName: string;
  text: string;
  isHost: boolean;
}

interface DesktopChatNotificationProps {
  onOpenChat?: () => void;
}

/**
 * Small notification banner that polls for new companion chat messages
 * and displays a dismissable toast at the top of the page below the navbar.
 */
export function DesktopChatNotification({ onOpenChat }: DesktopChatNotificationProps) {
  const { t } = useTranslation();
  const [popup, setPopup] = useState<{ fromName: string; text: string; isHost: boolean } | null>(null);
  const prevLatestIdRef = useRef('');
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setPopup(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const pollChat = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=getchat&clientId=desktop-poll');
      if (!res.ok) return;
      const d = await res.json();
      if (d.success && Array.isArray(d.messages)) {
        const msgs: ChatMsg[] = d.messages;
        const latest = msgs[msgs.length - 1];
        // Only show notification for new non-host messages
        if (latest && latest.id !== prevLatestIdRef.current && !latest.isHost) {
          setPopup({ fromName: latest.fromName, text: latest.text, isHost: latest.isHost });
          // Auto-dismiss after 5 seconds
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(dismiss, 5000);
        }
        prevLatestIdRef.current = latest?.id || '';
      }
    } catch { /* ignore */ }
  }, [dismiss]);

  useEffect(() => {
    pollChat();
    const iv = setInterval(pollChat, 4000);
    return () => { clearInterval(iv); if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); };
  }, [pollChat]);

  if (!popup) return null;

  return (
    <div
      className="fixed top-16 left-4 z-[100] animate-[slide-in-down_0.3s_ease-out]"
    >
      <div
        className="flex items-center gap-3 rounded-lg bg-black/90 backdrop-blur-md border border-white/15 px-4 py-2.5 shadow-2xl cursor-pointer max-w-xs"
        onClick={() => { dismiss(); onOpenChat?.(); }}
      >
        <span className="text-sm leading-none shrink-0">💬</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-cyan-400">
            {t('desktopChat.notificationNew').replace('{name}', popup.fromName)}
          </p>
          <p className="text-xs text-white/80 mt-0.5 line-clamp-1 leading-snug">{popup.text}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="shrink-0 text-white/40 hover:text-white text-xs p-1 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
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
