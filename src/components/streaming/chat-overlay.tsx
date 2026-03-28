'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStreamingService, ChatMessage, StreamEvent, StreamStats } from '@/lib/streaming/streaming-service';

interface ChatOverlayProps {
  maxHeight?: string;
  showInput?: boolean;
  showEvents?: boolean;
  onEvent?: (event: StreamEvent) => void;
}

export function ChatOverlay({
  maxHeight = '400px',
  showInput = true,
  showEvents = true,
  onEvent,
}: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, events]);

  // Subscribe to chat and events
  useEffect(() => {
    const streaming = getStreamingService();

    const unsubChat = streaming.onChatMessage((msg) => {
      setMessages(prev => [...prev.slice(-99), msg]); // Keep last 100 messages
    });

    const unsubEvents = streaming.onEvent((event) => {
      setEvents(prev => [...prev.slice(-9), event]); // Keep last 10 events
      onEvent?.(event);

      // Auto-remove event after 5 seconds
      setTimeout(() => {
        setEvents(prev => prev.filter(e => e !== event));
      }, 5000);
    });

    const unsubStats = streaming.onStats((stats) => {
      setIsConnected(stats.isLive);
    });

    // Check initial state
    setIsConnected(streaming.getStats().isLive);

    return () => {
      unsubChat();
      unsubEvents();
      unsubStats();
    };
  }, [onEvent]);

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const streaming = getStreamingService();
    await streaming.sendChatMessage(inputMessage.trim());
    setInputMessage('');
  };

  // Get badge color
  const getBadgeColor = (badge: string): string => {
    switch (badge) {
      case 'broadcaster':
      case 'moderator':
        return 'bg-green-500';
      case 'subscriber':
        return 'bg-purple-500';
      case 'vip':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get event icon
  const getEventIcon = (type: StreamEvent['type']): string => {
    switch (type) {
      case 'follow':
        return '❤️';
      case 'subscription':
        return '⭐';
      case 'donation':
        return '💰';
      case 'raid':
        return '⚔️';
      case 'host':
        return '🎬';
      case 'cheer':
        return '💎';
      default:
        return '🎉';
    }
  };

  return (
    <Card className="bg-black/80 border-white/10 text-white">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            💬 Live Chat
            {isConnected && (
              <Badge className="bg-green-500 animate-pulse text-xs">LIVE</Badge>
            )}
          </span>
          <span className="text-xs text-white/50">
            {messages.length} messages
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Events */}
        {showEvents && events.length > 0 && (
          <div className="p-2 space-y-1 border-b border-white/10">
            {events.map((event, i) => (
              <div
                key={i}
                className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-2 rounded-lg text-sm animate-pulse"
              >
                {getEventIcon(event.type)}{' '}
                <strong>{event.user}</strong>
                {event.type === 'follow' && ' followed!'}
                {event.type === 'subscription' && ' subscribed!'}
                {event.type === 'donation' && ` donated $${event.amount}!`}
                {event.type === 'raid' && ` raided with ${event.amount} viewers!`}
                {event.type === 'cheer' && ` cheered ${event.amount} bits!`}
                {event.message && ` - "${event.message}"`}
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <ScrollArea style={{ height: maxHeight }} ref={scrollRef}>
          <div className="p-2 space-y-1">
            {!isConnected && messages.length === 0 && (
              <div className="text-center text-white/40 py-4">
                Connect to a stream to see chat messages
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm p-1 rounded ${
                  msg.isHighlighted ? 'bg-white/5' : ''
                }`}
              >
                <div className="flex items-start gap-1">
                  {msg.badges && msg.badges.length > 0 && (
                    <div className="flex gap-0.5 shrink-0">
                      {msg.badges.slice(0, 3).map((badge, i) => (
                        <Badge
                          key={i}
                          className={`${getBadgeColor(badge)} text-[10px] px-1 py-0`}
                        >
                          {badge.charAt(0).toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <span
                    className="font-medium shrink-0"
                    style={{ color: msg.color || '#fff' }}
                  >
                    {msg.user}:
                  </span>
                  <span className="break-words">{msg.message}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        {showInput && isConnected && (
          <div className="p-2 border-t border-white/10 flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Send a message..."
              className="bg-white/5 border-white/10 text-white text-sm"
            />
            <Button size="sm" onClick={sendMessage}>
              Send
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact overlay for in-game use
export function CompactChatOverlay() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<StreamEvent[]>([]);

  useEffect(() => {
    const streaming = getStreamingService();

    const unsubChat = streaming.onChatMessage((msg) => {
      setMessages(prev => [...prev.slice(-4), msg]);
    });

    const unsubEvents = streaming.onEvent((event) => {
      setEvents(prev => [...prev.slice(-2), event]);
      setTimeout(() => {
        setEvents(prev => prev.filter(e => e !== event));
      }, 3000);
    });

    return () => {
      unsubChat();
      unsubEvents();
    };
  }, []);

  const getEventIcon = (type: StreamEvent['type']): string => {
    switch (type) {
      case 'follow': return '❤️';
      case 'subscription': return '⭐';
      case 'donation': return '💰';
      case 'raid': return '⚔️';
      default: return '🎉';
    }
  };

  return (
    <div className="absolute bottom-4 left-4 w-72 space-y-1 pointer-events-none">
      {/* Events */}
      {events.map((event, i) => (
        <div
          key={i}
          className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 p-2 rounded-lg text-sm text-white animate-pulse"
        >
          {getEventIcon(event.type)} <strong>{event.user}</strong>
          {event.type === 'follow' && ' followed!'}
          {event.type === 'subscription' && ' subscribed!'}
          {event.type === 'raid' && ` raided with ${event.amount} viewers!`}
        </div>
      ))}

      {/* Messages */}
      {messages.map((msg) => (
        <div key={msg.id} className="bg-black/70 p-1.5 rounded text-xs text-white">
          <span style={{ color: msg.color || '#fff' }} className="font-medium">
            {msg.user}:
          </span>{' '}
          {msg.message}
        </div>
      ))}
    </div>
  );
}

// Stream stats display
export function StreamStatsDisplay() {
  const [stats, setStats] = useState<StreamStats>({
    isLive: false,
    duration: 0,
    viewerCount: 0,
    chatMessages: 0,
    startTime: null,
  });

  useEffect(() => {
    const streaming = getStreamingService();
    const unsub = streaming.onStats(setStats);
    setStats(streaming.getStats());
    return unsub;
  }, []);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!stats.isLive) return null;

  return (
    <div className="flex items-center gap-4 text-sm">
      <Badge className="bg-red-500 animate-pulse">🔴 LIVE</Badge>
      <span className="text-white/80">⏱️ {formatDuration(stats.duration)}</span>
      <span className="text-white/80">👥 {stats.viewerCount} viewers</span>
      <span className="text-white/80">💬 {stats.chatMessages} messages</span>
    </div>
  );
}
