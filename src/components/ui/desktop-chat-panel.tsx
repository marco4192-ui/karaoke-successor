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

interface ChatPlayer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
}

interface DesktopChatPanelProps {
  onClose: () => void;
}

export function DesktopChatPanel({ onClose }: DesktopChatPanelProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [players, setPlayers] = useState<ChatPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Nachrichten abrufen
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=getchat&clientId=desktop');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMessages(data.messages || []);
      }
    } catch { /* ignore */ }
  }, []);

  // Aktive Player für Dropdown abrufen
  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=getchatplayers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.players)) {
          setPlayers(data.players);
          // Automatisch ersten Player wählen wenn keiner gewählt
          setSelectedPlayerId((prev) => {
            if (!prev && data.players.length > 0) return data.players[0].id;
            // Prüfen ob der gewählte Player noch existiert
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
    fetchMessages();
    fetchPlayers();
    const ivMsg = setInterval(fetchMessages, 3000);
    const ivPl = setInterval(fetchPlayers, 5000);
    return () => { clearInterval(ivMsg); clearInterval(ivPl); };
  }, [fetchMessages, fetchPlayers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Name des gewählten Players ermitteln
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

  // Herausforderung annehmen (als Host/ausgewaehlter Profile)
  const handleAcceptChallenge = useCallback(async (messageId: string) => {
    if (acceptingId || !selectedPlayerId) return;
    const player = players.find((p) => p.id === selectedPlayerId);
    if (!player) return;
    setAcceptingId(messageId);
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'accept_challenge_host',
          payload: { messageId, profileId: player.id, profileName: player.name },
        }),
      });
      if (res.ok) fetchMessages();
    } catch { /* ignore */ }
    setAcceptingId(null);
  }, [acceptingId, selectedPlayerId, players, fetchMessages]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Farb-Punkt für den Player im Dropdown
  const colorDot = (color: string) => (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color || '#888' }}
    />
  );

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
                    ) : msg.challenge.challengerClientId === 'host' ? (
                      <p className="text-xs text-white/40">⏳ {(t('desktopChat.waitingForOpponent') || 'Warte auf Gegner...')}</p>
                    ) : (
                      <button
                        onClick={() => handleAcceptChallenge(msg.id)}
                        disabled={!!acceptingId || !selectedPlayerId || msg.challenge.challengerClientId === 'host'}
                        className="w-full py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!selectedPlayerId
                          ? (t('desktopChat.selectPlayerFirst') || 'Zuerst einen Player auswählen')
                          : msg.challenge.challengerClientId === 'host'
                            ? (t('songChallenge.cannotAcceptOwn') || 'Du kannst deine eigene Herausforderung nicht annehmen')
                            : undefined}
                      >
                        {acceptingId === msg.id ? '...' : (t('songChallenge.acceptBtn') || 'Herausforderung annehmen')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input mit Player-Dropdown */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/20 space-y-2">
          {/* Player-Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-white/40 shrink-0">
              {(t('desktopChat.sendAs') || 'Senden als')}
            </label>
            <div className="relative flex-1">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full appearance-none bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 pr-7 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
              >
                {players.length === 0 && (
                  <option value="">{(t('desktopChat.noPlayers') || 'Keine Player')}</option>
                )}
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isHost ? '🖥️ ' : '📱 '}{p.name}
                  </option>
                ))}
              </select>
              {/* Custom dropdown arrow */}
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            {selectedPlayerId && colorDot(players.find((p) => p.id === selectedPlayerId)?.color || '')}
          </div>

          {/* Nachricht + Senden */}
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
              disabled={!inputText.trim() || sending || !selectedPlayerId}
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
