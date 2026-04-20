'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PhoneIcon } from '@/components/settings/settings-icons';
import { generateQRCodeUrl, detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';

interface ConnectedClient {
  id: string;
  connectionCode: string;
  name: string;
  hasPitch: boolean;
  profile?: { name: string; avatar?: string; color: string };
  queueCount: number;
}

export function MobileDeviceMicrophoneSection() {
  const [localIP, setLocalIP] = useState<string>('');
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);
  
  // Get local IP address via WebRTC
  useEffect(() => {
    let isMounted = true;
    let detectedIP: string | null = null;
    
    const getLocalIP = async () => {
      try {
        // Check sessionStorage for previously detected IP
        const storedIP = sessionStorage.getItem('karaoke-detected-ip');
        if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost') {
          detectedIP = storedIP;
          setLocalIP(storedIP);
          return;
        }
        
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
                sessionStorage.setItem('karaoke-detected-ip', ip);
                pc.close();
              }
            }
          }
        };
        
        // Also check hostname
        setTimeout(() => {
          if (isMounted && !detectedIP) {
            const hostname = window.location.hostname;
            if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
              detectedIP = hostname;
              setLocalIP(hostname);
              sessionStorage.setItem('karaoke-detected-ip', hostname);
            }
          }
          pc.close();
        }, 3000);
      } catch {
        // Fallback to hostname
        const hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
          setLocalIP(hostname);
        }
      }
    };
    
    getLocalIP();
    return () => { isMounted = false; };
  }, []);
  
  // Poll for connected clients
  useEffect(() => {
    const pollClients = async () => {
      try {
        const res = await fetch('/api/mobile?action=clients');
        const data = await res.json();
        if (data.clients) {
          setConnectedClients(data.clients);
        }
      } catch {
        // Ignore
      }
    };
    
    pollClients();
    const interval = setInterval(pollClients, 3000);
    return () => clearInterval(interval);
  }, []);

  const mobileUrl = localIP ? buildCompanionUrl(localIP) : '/mobile';
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneIcon className="w-5 h-5 text-cyan-400" />
          Mobile Device as Microphone
        </CardTitle>
        <CardDescription>Use your smartphone as a wireless microphone</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg">
            <div className="text-center mb-4">
              <h4 className="font-medium mb-1">Scan to Connect</h4>
              <p className="text-xs text-white/60">Open your phone&apos;s camera app</p>
            </div>
            <div className="w-48 h-48 bg-white rounded-lg p-2 mb-4">
              <img 
                src={generateQRCodeUrl(mobileUrl)}
                alt="QR Code for mobile connection"
                className="w-full h-full"
              />
            </div>
            <p className="text-xs text-white/40 text-center">
              Point your phone camera at this QR code to connect
            </p>
          </div>
          
          {/* Connection Info */}
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium mb-2">Connection URL</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/30 px-3 py-2 rounded text-sm text-cyan-400 overflow-hidden text-ellipsis">
                  {mobileUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(mobileUrl);
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Copy
                </Button>
              </div>
              {localIP && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ Detected IP: {localIP}
                </p>
              )}
              {!localIP && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠ Using localhost - may not work on mobile devices
                </p>
              )}
            </div>
            
            {/* Connected Clients */}
            {connectedClients.length > 0 && (
              <div className="p-4 bg-white/5 rounded-lg">
                <h4 className="font-medium mb-2">Connected Devices ({connectedClients.length})</h4>
                <div className="space-y-2">
                  {connectedClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{client.name || 'Unknown'}</span>
                      {client.hasPitch && <Badge className="text-xs bg-cyan-500/20 text-cyan-400">Mic</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium mb-2">How it works</h4>
              <ul className="text-sm text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">1.</span>
                  Scan the QR code or open the URL on your phone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">2.</span>
                  Create a profile on the mobile app
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">3.</span>
                  Your phone becomes a wireless microphone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">4.</span>
                  Sing wirelessly from anywhere in the room!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
