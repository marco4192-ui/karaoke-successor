'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';

import { buildCompanionUrl, detectLocalIP } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';
import { PhoneIcon, MicIcon, LibraryIcon, QueueIcon } from '@/components/icons';

// ===================== MOBILE SCREEN =====================
export function MobileScreen() {
  const { t } = useTranslation();
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

  // One-shot IP detection — runs once on mount using shared utility.
  useEffect(() => {
    let cancelled = false;
    detectLocalIP().then(ip => {
      if (!cancelled && ip) {
        setLocalIP(ip);
      } else if (!cancelled) {
        setIpDetectionAttempts(prev => prev + 1);
      }
    });
    return () => { cancelled = true; };
  }, []);
  
  // Poll for connected clients
  useEffect(() => {
    queueMicrotask(() => setIsPolling(true));
    
    const pollClients = async () => {
      try {
        const response = await fetch('/api/mobile?action=status');
        if (!response.ok) return;
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
  
  const retryIPDetection = useCallback(() => {
    sessionStorage.removeItem('karaoke-detected-ip');
    setLocalIP('');
    setIpDetectionAttempts(0);
    detectLocalIP().then(ip => {
      if (ip) setLocalIP(ip);
      else setIpDetectionAttempts(prev => prev + 1);
    });
  }, []);
  
  const connectionUrl = localIP ? buildCompanionUrl(localIP) : '';
  const qrCodeSrc = useQRCode(connectionUrl);
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('mobile.title')}</h1>
        <p className="text-white/60">{t('mobile.subtitle')}</p>
      </div>

      {/* Network Info */}
      <Card className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">{t('mobile.yourLanIp')}</p>
              <p className="text-2xl font-mono font-bold text-cyan-400">{localIP || t('mobile.detecting')}</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <p className="text-xs text-white/60 mb-1">{t('mobile.port')}</p>
                <p className="text-2xl font-mono font-bold">{typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}</p>
              </div>
              {!localIP && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={retryIPDetection}
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {t('mobile.retry')}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-white/40 mt-2">
            {t('mobile.sameWifi')}
          </p>
          {!localIP && ipDetectionAttempts > 0 && (
            <p className="text-xs text-yellow-400 mt-2">
              {t('mobile.warningIp')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Code */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>{t('mobile.scanToConnect')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {localIP ? (
              <>
                <div className="bg-white rounded-xl p-4 inline-block mb-4">
                  {qrCodeSrc ? (
                    <img src={qrCodeSrc} alt={t('mobile.qrCodeAlt')} className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 animate-pulse bg-gray-200 rounded-xl" />
                  )}
                </div>
                <p className="text-sm text-white/60 mb-2">{t('mobile.scanQrCode')}</p>
                <p className="text-xs text-white/40 break-all font-mono">{connectionUrl}</p>
              </>
            ) : (
              <div className="py-16">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/60 mb-4">{t('mobile.detectingNetwork')}</p>
                <Button 
                  variant="outline"
                  onClick={retryIPDetection}
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {t('mobile.retryDetection')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Devices */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('settingsCompanion.title')}
              {isPolling && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedClients.length === 0 ? (
              <div className="text-center py-8">
                <PhoneIcon className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <p className="text-white/40">{t('mobile.noDevices')}</p>
                <p className="text-xs text-white/20 mt-2">{t('mobile.scanQrToConnect')}</p>
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
                        {t('mobile.queueSongs').replace('{n}', client.queueCount.toString())}
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
              📋 {t('mobile.mobileQueue')}
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
                  {t('mobile.moreSongs').replace('{n}', (mobileQueue.length - 5).toString())}
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
            <h3 className="font-semibold mb-2">{t('mobile.useAsMicrophone')}</h3>
            <p className="text-sm text-white/60">{t('mobile.useAsMicrophoneDesc')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="pt-6 text-center">
            <LibraryIcon className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="font-semibold mb-2">{t('mobile.browseLibrary')}</h3>
            <p className="text-sm text-white/60">{t('mobile.browseLibraryDesc')}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="pt-6 text-center">
            <QueueIcon className="w-12 h-12 mx-auto mb-4 text-orange-400" />
            <h3 className="font-semibold mb-2">{t('mobile.manageQueue')}</h3>
            <p className="text-sm text-white/60">{t('mobile.manageQueueDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">{t('mobile.howToConnect')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/60">
          <p>{t('mobile.howToConnect1')}</p>
          <p>{t('mobile.howToConnect2')}</p>
          <p>{t('mobile.howToConnect3')}</p>
          <p>{t('mobile.howToConnect4')}</p>
          <p>{t('mobile.howToConnect5')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
