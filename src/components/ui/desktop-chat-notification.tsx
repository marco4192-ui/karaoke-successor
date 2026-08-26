'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMsg {
  id: string;
  fromName: string;
  text: string;
  isHost: boolean;
  timestamp?: number;
}

/**
 * Desktop Chat-Benachrichtigung – Overlay oben links.
 * Pollt den Chat auf neue Nachrichten und zeigt sie als Popup an.
 */
export function DesktopChatNotification() {
  const [popup, setPopup] = useState<{ id: string; fromName: string; text: string } | null>(null);
  const prevLatestIdRef = useRef('');
  const dismissedRef = useRef<Set<string>>(new Set());

  const pollChat = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=getchat&clientId=desktop-poll');
      if (!res.ok) return;
      const d = await res.json();
      if (d.success && Array.isArray(d.messages)) {
        const msgs: ChatMsg[] = d.messages;
        const latest = msgs[msgs.length - 1];
        // Zeige nur wenn es eine neue Nachricht gibt (nicht vom Host selbst)
        // und die Nachricht noch nicht dismissed wurde
        if (latest && latest.id !== prevLatestIdRef.current && !latest.isHost && !dismissedRef.current.has(latest.id)) {
          setPopup({ id: latest.id, fromName: latest.fromName, text: latest.text });
          // Cleanup: dismiss messages older than 30s
          dismissedRef.current = new Set([...dismissedRef.current].filter((id) => {
            const msg = msgs.find((m) => m.id === id);
            return msg && msg.timestamp && Date.now() - msg.timestamp < 30000;
          }));
        }
        prevLatestIdRef.current = latest?.id || '';
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    pollChat();
    const iv = setInterval(pollChat, 4000);
    return () => clearInterval(iv);
  }, [pollChat]);

  if (!popup) return null;

  return (
    <div
      className="fixed top-4 left-4 z-[100] cursor-pointer animate-[slide-in-down_0.3s_ease-out]"
      onClick={() => { if (popup) dismissedRef.current.add(popup.id); setPopup(null); }}
    >
      <div className="flex items-start gap-2.5 rounded-lg bg-black/90 backdrop-blur-md border border-white/15 px-3 py-2 shadow-2xl max-w-xs">
        <span className="text-sm leading-none mt-0.5 shrink-0">💬</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-cyan-400">{popup.fromName}</p>
          <p className="text-xs text-white/80 mt-0.5 line-clamp-2 leading-snug">{popup.text}</p>
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
