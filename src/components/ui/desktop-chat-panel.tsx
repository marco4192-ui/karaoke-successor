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
    gameMode?: string;
    challengerClientId: string;
    challengerName: string;
    accepted: boolean;
    acceptedBy: string | null;
    acceptedByName: string | null;
    challengedPartnerId?: string | null;
  };
  challengeAccepted?: {
    challengeMessageId: string;
    respondingClientId: string;
    respondingClientName: string;
  };
}

interface ChatPlayer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

interface DesktopChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function DesktopChatPanel({ open, onClose }: DesktopChatPanelProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [players, setPlayers] = useState<ChatPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll chat messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=getchat&clientId=desktop');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMessages(data.messages || []);
      }
    } catch { /* ignore */ }
  }, []);

  // Poll active players for the accept-challenge dropdown
  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=getchatplayers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.players)) {
          setPlayers(data.players);
          setSelectedPlayerId((prev) => {
            if (!prev && data.players.length > 0) return data.players[0].id;
            if (prev && !data.players.some((p: ChatPlayer) => p.id === prev)) {
              return data.players.length > 0 ? data.players[0].id : '';
            }
            return prev;
          });
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchMessages();
    fetchPlayers();
    const ivMsg = setInterval(fetchMessages, 3000);
    const ivPl = setInterval(fetchPlayers, 5000);
    return () => { clearInterval(ivMsg); clearInterval(ivPl); };
  }, [open, fetchMessages, fetchPlayers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selectedPlayerName = players.find((p) => p.id === selectedPlayerId)?.name || 'Host';

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat_host',
          payload: { text: trimmed, fromName: selectedPlayerName },
        }),
      });
      if (res.ok) { setInputText(''); fetchMessages(); }
    } catch { /* ignore */ }
    finally { setSending(false); inputRef.current?.focus(); }
  }, [inputText, sending, fetchMessages, selectedPlayerName]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // Accept a challenge — sends accept_challenge with the selected player profile
  const handleAcceptChallenge = useCallback(async (msgId: string) => {
    if (!selectedPlayerId || acceptingId) return;
    setAcceptingId(msgId);
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'accept_challenge',
          clientId: 'desktop',
          payload: {
            messageId: msgId,
            respondingClientId: selectedPlayerId,
          },
        }),
      });
      fetchMessages();
    } catch { /* ignore */ }
    finally { setAcceptingId(null); }
  }, [selectedPlayerId, acceptingId, fetchMessages]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-[#0d0d1a]/95 backdrop-blur-xl border-l border-white/10 flex flex-col animate-[slide-in-right_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-bold flex items-center gap-2 text-white">
            💬 {t('desktopChat.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-lg leading-none transition-colors p-1"
            aria-label={t('desktopChat.closeChat')}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/30 text-sm">{t('desktopChat.noMessages')}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isHost ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs ${msg.isHost ? 'text-cyan-400' : 'text-purple-400'}`}>
                  {msg.isHost ? t('desktopChat.host') || 'Host' : msg.fromName}
                </span>
                <span className="text-white/20 text-xs">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`max-w-[90%] px-3 py-2 rounded-2xl text-sm ${
                msg.isHost
                  ? 'bg-cyan-500/20 text-white/90 rounded-br-md'
                  : 'bg-white/10 text-white/90 rounded-bl-md'
              }`}>
                <p className="leading-snug">{msg.text}</p>

                {/* Challenge message — show accept button only for incoming (non-host) unaccepted challenges */}
                {msg.challenge && !msg.isHost && !msg.challenge.accepted && (
                  <div className="mt-2 rounded-lg bg-white/5 border border-white/10 p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">
                        {msg.challenge.gameMode === 'duel' ? '⚔️' : '🎭'}
                      </span>
                      <span className="text-xs font-semibold text-amber-400">
                        {msg.challenge.songTitle} — {msg.challenge.songArtist}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 mb-2">
                      {msg.challenge.gameMode === 'duel'
                        ? `${t('desktopChat.challengeDuel')}`
                        : `${t('desktopChat.challengeDuet')}`}{' '}
                      {t('desktopChat.from')} {msg.challenge.challengerName}
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedPlayerId}
                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                        className="flex-1 appearance-none bg-white/10 border border-white/10 rounded-lg px-2 py-1 pr-6 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                      >
                        <option value="">{t('desktopChat.selectPlayer')}</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAcceptChallenge(msg.id)}
                        disabled={!selectedPlayerId || acceptingId === msg.id}
                        className="shrink-0 rounded-lg px-3 py-1 text-xs font-bold bg-gradient-to-r from-amber-500/80 to-orange-500/80 border border-amber-400/50 text-white hover:from-amber-400 hover:to-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {acceptingId === msg.id ? '…' : t('desktopChat.acceptChallenge')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Challenge already accepted (incoming challenge, now accepted) */}
                {msg.challenge && !msg.isHost && msg.challenge.accepted && (
                  <div className="mt-2 rounded-lg bg-white/5 border border-white/10 p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">
                        {msg.challenge.gameMode === 'duel' ? '⚔️' : '🎭'}
                      </span>
                      <span className="text-xs font-semibold text-amber-400">
                        {msg.challenge.songTitle} — {msg.challenge.songArtist}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50">
                      {t('desktopChat.from')} {msg.challenge.challengerName}
                    </p>
                    <p className="text-xs text-green-400 mt-1">
                      ✅ {t('desktopChat.challengeAccepted')}
                    </p>
                  </div>
                )}

                {/* challengeAccepted system message (dedicated message with challengeAccepted field) */}
                {msg.challengeAccepted && (
                  <div className="mt-2 rounded-lg bg-green-500/10 border border-green-400/20 px-3 py-2">
                    <p className="text-xs text-green-400">
                      ✅ {t('desktopChat.challengeAccepted')} — {msg.challengeAccepted.respondingClientName}
                    </p>
                  </div>
                )}

                {/* Fallback: text-only challengeAccepted message */}
                {msg.text === 'challengeAccepted' && !msg.challenge && !msg.challengeAccepted && (
                  <p className="text-xs text-green-400">{t('desktopChat.challengeAccepted')}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/20 space-y-2">
          {/* Player selector for sending as */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-white/40 shrink-0">{t('desktopChat.selectPlayer')}</label>
            <div className="relative flex-1">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full appearance-none bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 pr-7 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
              >
                {players.length === 0 && (
                  <option value="">—</option>
                )}
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isHost ? '🖥️ ' : '📱 '}{p.name}
                  </option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Message input + send */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('desktopChat.placeholder')}
              maxLength={200}
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending || !selectedPlayerId}
              className="px-4 py-2 rounded-full bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {t('desktopChat.send')}
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
