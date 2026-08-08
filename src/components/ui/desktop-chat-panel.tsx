'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

interface ChatMessage {
  id: string;
  from: string;
  fromName: string;
  text: string;
  timestamp: number;
  isHost: boolean;
  challenge?: {
    songId: string;
    songTitle: string;
    songArtist: string;
    challengerClientId: string;
    challengerName: string;
    accepted: boolean;
    acceptedBy: string | null;
    acceptedByName: string | null;
  };
}

interface DesktopChatPanelProps {
  onClose: () => void;
}

/**
 * Desktop Chat Panel — slide-in panel from the right side.
 * Shows all chat messages with challenge accept buttons.
 */
export function DesktopChatPanel({ onClose }: DesktopChatPanelProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=getchat&clientId=desktop');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMessages(data.messages || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(fetchMessages, 3000);
    return () => clearInterval(iv);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chat_host', payload: { text: trimmed, fromName: 'Host' } }),
      });
      if (res.ok) { setInputText(''); fetchMessages(); }
    } catch { /* ignore */ }
    finally { setSending(false); inputRef.current?.focus(); }
  }, [inputText, sending, fetchMessages]);

  const handleAcceptChallenge = useCallback(async (messageId: string) => {
    // Desktop-Host kann Challenges nicht als Spieler annehmen
    // Der Button dient nur zur Info — Companion-Nutzer nehmen an
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-[#0d0d1a]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-[slide-in-right_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-bold flex items-center gap-2 text-white">
            💬 {(t('desktopChat.title') || 'Chat')}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg leading-none transition-colors p-1">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/30 text-sm">{(t('desktopChat.noMessages') || 'Noch keine Nachrichten')}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isHost ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs ${msg.isHost ? 'text-cyan-400' : 'text-purple-400'}`}>
                  {msg.isHost ? (t('desktopChat.host') || 'Host') : msg.fromName}
                </span>
                <span className="text-white/20 text-xs">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`max-w-[90%] px-3 py-2 rounded-2xl text-sm ${
                msg.isHost
                  ? 'bg-cyan-500/20 text-white/90 rounded-br-md'
                  : 'bg-white/10 text-white/90 rounded-bl-md'
              }`}>
                <p className="leading-snug">{msg.text}</p>
                {msg.challenge && (
                  <div className="mt-2 rounded-lg bg-white/5 border border-white/10 p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">⚔️</span>
                      <span className="text-xs font-semibold text-amber-400">
                        {msg.challenge.songTitle} — {msg.challenge.songArtist}
                      </span>
                    </div>
                    {msg.challenge.accepted ? (
                      <p className="text-xs text-green-400">
                        ✅ {(t('songChallenge.acceptedBy') || 'Angenommen von')} {msg.challenge.acceptedByName}
                      </p>
                    ) : (
                      <p className="text-xs text-white/40">⏳ Warte auf Gegner...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/20">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={(t('desktopChat.placeholder') || 'Nachricht eingeben...')}
              maxLength={200}
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="px-4 py-2 rounded-full bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {(t('desktopChat.send') || 'Senden')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
