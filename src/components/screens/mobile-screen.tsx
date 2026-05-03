'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { buildCompanionUrl } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';

// ===================== ICONS =====================
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

// ===================== MOBILE SCREEN =====================
export function MobileScreen() {
  const [localIP, setLocalIP] = useState<string>('');
  const [connectedClients, setConnectedClients] = useState<Array<{ 
    id: string; 
    connectionCode: string;
    name: string; 
    hasPitch: boolean;
    profile?: { name: string; avatar?: string; color: string };
    queueCount: number;
  }>>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [ipDetectionAttempts, setIpDetectionAttempts] = useState(0);
  const [mobileQueue, setMobileQueue] = useState<Array<{ id: string; songTitle: string; songArtist: string; companionCode: string; status: string }>>([]);
  
  // Get local IP address via WebRTC - FIXED: Store detected IP, don't fallback to localhost
  useEffect(() => {
    let isMounted = true;
    let detectedIP: string | null = null;
    
    const getLocalIP = async () => {
      try {
        // Try to get local IP via RTCPeerConnection
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        pc.onicecandidate = (event) => {
          if (event?.candidate && isMounted && !detectedIP) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch && ipMatch[1]) {
              const ip = ipMatch[1];
              // Filter out mDNS addresses and localhost
              if (!ip.endsWith('.local') && ip !== '0.0.0.0' && !ip.startsWith('127.')) {
                detectedIP = ip;
                setLocalIP(ip);
                // Store in sessionStorage for persistence across re-renders
                sessionStorage.setItem('karaoke-detected-ip', ip);
                pc.close();
              }
            }
          }
        };
        
        // Check sessionStorage for previously detected IP
        const storedIP = sessionStorage.getItem('karaoke-detected-ip');
        if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost') {
          detectedIP = storedIP;
          setLocalIP(storedIP);
          pc.close();
          return;
        }
        
        // Wait for ICE candidates, but don't fallback to localhost
        setTimeout(() => {
          if (isMounted && !detectedIP) {
            const hostname = window.location.hostname;
            // Only use hostname if it's a valid IP or non-localhost hostname
            if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
              detectedIP = hostname;
              setLocalIP(hostname);
              sessionStorage.setItem('karaoke-detected-ip', hostname);
            } else {
              // Increment attempts to show retry option
              setIpDetectionAttempts(prev => prev + 1);
            }
          }
          pc.close();
        }, 5000); // Give more time for ICE candidates
      } catch {
        // Don't set localhost as fallback
        if (isMounted) {
          // Check sessionStorage first
          const storedIP = sessionStorage.getItem('karaoke-detected-ip');
          if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost') {
            setLocalIP(storedIP);
          } else {
            const hostname = window.location.hostname;
            if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
              setLocalIP(hostname);
              sessionStorage.setItem('karaoke-detected-ip', hostname);
            } else {
              setIpDetectionAttempts(prev => prev + 1);
            }
          }
        }
      }
    };
    
    getLocalIP();
    
    return () => {
      isMounted = false;
    };
  }, [ipDetectionAttempts]);
  
  // Poll for connected clients
  useEffect(() => {
    // Use queueMicrotask to avoid synchronous setState in effect
    queueMicrotask(() => setIsPolling(true));
    
    const pollClients = async () => {
      try {
        const response = await fetch('/api/mobile?action=status');
        const data = await response.json();
        if (data.success) {
          setConnectedClients(data.clients || []);
          setMobileQueue(data.queue || []);
        }
      } catch {
        // Ignore polling errors
      }
    };
    
    pollClients();
    const interval = setInterval(pollClients, 2000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, []);
  
  // Retry IP detection
  const retryIPDetection = () => {
    sessionStorage.removeItem('karaoke-detected-ip');
    setIpDetectionAttempts(prev => prev + 1);
  };
  
  // Build connection URL with local IP
  const connectionUrl = localIP ? buildCompanionUrl(localIP) : '';
  const qrCodeSrc = useQRCode(connectionUrl);
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mobile Integration</h1>
        <p className="text-white/60">Use your smartphone as a microphone or remote control</p>
      </div>

      {/* Network Info */}
      <Card className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">Your LAN IP Address</p>
              <p className="text-2xl font-mono font-bold text-cyan-400">{localIP || 'Detecting...'}</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <p className="text-xs text-white/60 mb-1">Port</p>
                <p className="text-2xl font-mono font-bold">{typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}</p>
              </div>
              {!localIP && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={retryIPDetection}
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-white/40 mt-2">
            Make sure your phone is connected to the same WiFi network as this computer
          </p>
          {!localIP && ipDetectionAttempts > 0 && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚠️ Could not detect network IP. Try refreshing the page or check your network connection.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Code */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Scan to Connect</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {localIP ? (
              <>
                <div className="bg-white rounded-xl p-4 inline-block mb-4">
                  {qrCodeSrc ? (
                    <img src={qrCodeSrc} alt="QR Code" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 animate-pulse bg-gray-200 rounded-xl" />
                  )}
                </div>
                <p className="text-sm text-white/60 mb-2">Scan this QR code with your phone</p>
                <p className="text-xs text-white/40 break-all font-mono">{connectionUrl}</p>
              </>
            ) : (
              <div className="py-16">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/60 mb-4">Detecting network address...</p>
                <Button 
                  variant="outline"
                  onClick={retryIPDetection}
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Retry Detection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Devices */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connected Companions
              {isPolling && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedClients.length === 0 ? (
              <div className="text-center py-8">
                <PhoneIcon className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <p className="text-white/40">No devices connected</p>
                <p className="text-xs text-white/20 mt-2">Scan the QR code to connect your phone</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectedClients.map((client) => (
                  <div key={client.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: client.profile?.color || '#06B6D4' }}
                    >
                      {client.profile?.avatar ? (
                        <img src={client.profile.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">
                          {(client.profile?.name || client.name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{client.profile?.name || client.name}</p>
                        <Badge variant="outline" className="text-xs font-mono border-cyan-500/50 text-cyan-400">
                          {client.connectionCode}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/40">
                        Queue: {client.queueCount}/3 songs
                      </p>
                    </div>
                    {client.hasPitch && (
                      <div className="flex items-center gap-1 text-green-400">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs">🎤</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Queue */}
      {mobileQueue.length > 0 && (
        <Card className="bg-white/5 border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Mobile Queue
              <Badge className="bg-cyan-500">{mobileQueue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mobileQueue.slice(0, 5).map((item) => (
                <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg ${
                  item.status === 'playing' ? 'bg-cyan-500/20' : 'bg-white/5'
                }`}>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.songTitle}</p>
                    <p className="text-xs text-white/40">{item.songArtist}</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {item.companionCode}
                  </Badge>
                </div>
              ))}
              {mobileQueue.length > 5 && (
                <p className="text-xs text-white/40 text-center">
                  +{mobileQueue.length - 5} more songs
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="pt-6 text-center">
            <MicIcon className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
            <h3 className="font-semibold mb-2">Use as Microphone</h3>
            <p className="text-sm text-white/60">Your phone becomes a high-quality wireless microphone</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="pt-6 text-center">
            <LibraryIcon className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="font-semibold mb-2">Browse Library</h3>
            <p className="text-sm text-white/60">Scroll through songs and add to queue from your phone</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="pt-6 text-center">
            <QueueIcon className="w-12 h-12 mx-auto mb-4 text-orange-400" />
            <h3 className="font-semibold mb-2">Manage Queue</h3>
            <p className="text-sm text-white/60">View and manage the song queue remotely</p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">How to Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/60">
          <p>1. Make sure your phone is connected to the same WiFi network</p>
          <p>2. Open your phone&apos;s camera app and point it at the QR code</p>
          <p>3. Tap the notification to open the link</p>
          <p>4. Grant microphone permission when prompted</p>
          <p>5. Tap the microphone button to start singing!</p>
        </CardContent>
      </Card>
    </div>
  );
}
