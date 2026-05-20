'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PhoneIcon } from '@/components/settings/settings-icons';
import { buildCompanionUrl, detectLocalIP } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';
import { useTranslation } from '@/lib/i18n/translations';

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
  const [copyError, setCopyError] = useState(false);
  const copyErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

  const clearCopyError = useCallback(() => {
    setCopyError(false);
    if (copyErrorTimer.current) clearTimeout(copyErrorTimer.current);
  }, []);

  useEffect(() => () => { if (copyErrorTimer.current) clearTimeout(copyErrorTimer.current); }, []);
  
  // Get local IP address using the shared detection function
  useEffect(() => {
    let isMounted = true;
    detectLocalIP().then(ip => {
      if (isMounted && ip) setLocalIP(ip);
    });
    return () => { isMounted = false; };
  }, []);
  
  // Poll for connected clients
  useEffect(() => {
    const pollClients = async () => {
      try {
        const res = await fetch('/api/mobile?action=clients');
        if (!res.ok) return;
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
  const qrCodeSrc = useQRCode(localIP ? buildCompanionUrl(localIP) : '');
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneIcon className="w-5 h-5 text-cyan-400" />
          {t('settingsMobileDevice.title')}
        </CardTitle>
        <CardDescription>{t('settingsMobileDevice.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg">
            <div className="text-center mb-4">
              <h4 className="font-medium mb-1">{t('settingsMobileDevice.scanToConnect')}</h4>
              <p className="text-xs text-white/60">{t('settingsMobileDevice.openCamera')}</p>
            </div>
            <div className="w-48 h-48 bg-white rounded-lg p-2 mb-4">
              {qrCodeSrc ? (
                <img
                  src={qrCodeSrc}
                  alt={t('settingsMobileDevice.qrCodeAlt')}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full animate-pulse bg-gray-200 rounded" />
              )}
            </div>
            <p className="text-xs text-white/40 text-center">
              {t('settingsMobileDevice.pointCamera')}
            </p>
          </div>
          
          {/* Connection Info */}
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium mb-2">{t('settingsMobileDevice.connectionUrl')}</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/30 px-3 py-2 rounded text-sm text-cyan-400 overflow-hidden text-ellipsis">
                  {mobileUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    clearCopyError();
                    try {
                      await navigator.clipboard.writeText(mobileUrl);
                    } catch {
                      setCopyError(true);
                      copyErrorTimer.current = setTimeout(clearCopyError, 3000);
                    }
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {t('settingsMobileDevice.copy')}
                </Button>
              </div>
              {copyError && (
                <p className="text-xs text-red-400 mt-2">
                  {t('settingsMobileDevice.copyFailed')}
                </p>
              )}
              {localIP && (
                <p className="text-xs text-green-400 mt-2">
                  {t('settingsMobileDevice.ipDetected')} {localIP}
                </p>
              )}
              {!localIP && (
                <p className="text-xs text-yellow-400 mt-2">
                  {t('settingsMobileDevice.localhostWarning')}
                </p>
              )}
            </div>
            
            {/* Connected Clients */}
            {connectedClients.length > 0 && (
              <div className="p-4 bg-white/5 rounded-lg">
                <h4 className="font-medium mb-2">{t('settingsMobileDevice.connectedDevices').replace('{n}', String(connectedClients.length))}</h4>
                <div className="space-y-2">
                  {connectedClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{client.name || t('settingsMobileDevice.unknown')}</span>
                      {client.hasPitch && <Badge className="text-xs bg-cyan-500/20 text-cyan-400">{t('settingsMobileDevice.mic')}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium mb-2">{t('settingsMobileDevice.howItWorks')}</h4>
              <ul className="text-sm text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">1.</span>
                  {t('settingsMobileDevice.step1')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">2.</span>
                  {t('settingsMobileDevice.step2')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">3.</span>
                  {t('settingsMobileDevice.step3')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">4.</span>
                  {t('settingsMobileDevice.step4')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
