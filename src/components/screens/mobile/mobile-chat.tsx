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
}

interface MobileChatProps {
  clientId: string;
  onClose: () => void;
}

export function MobileChat({ clientId, onClose }: MobileChatProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll for new messages every 3 seconds
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/mobile?action=getchat&clientId=${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages || []);
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, [clientId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
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
        body: JSON.stringify({
          type: 'chat',
          clientId,
          payload: { text: trimmed },
        }),
      });
      if (res.ok) {
        setInputText('');
        // Immediately refetch to show the new message
        fetchMessages();
      }
    } catch {
      // Ignore send errors
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, sending, clientId, fetchMessages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-sm"
        >
          {t('mobileClient.back')}
        </button>
        <h2 className="text-lg font-bold flex items-center gap-2">
          💬 {t('mobileChat.title')}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/30 text-sm">{t('mobileChat.noMessages')}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = !msg.isHost;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs ${msg.isHost ? 'text-cyan-400' : 'text-purple-400'}`}>
                  {msg.isHost ? t('mobileChat.host') : msg.fromName}
                </span>
                <span className="text-white/20 text-xs">{formatTime(msg.timestamp)}</span>
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-purple-500/30 text-white rounded-br-md'
                    : 'bg-white/10 text-white/90 rounded-bl-md'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
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
            placeholder={t('mobileChat.placeholder')}
            maxLength={200}
            className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:bg-white/15 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className="px-4 py-2.5 rounded-full bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {t('mobileChat.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
