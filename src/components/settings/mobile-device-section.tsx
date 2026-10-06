'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PhoneIcon } from '@/components/settings/settings-icons';
import { buildCompanionUrl, detectLocalIP, updateCompanionHttpsInfo } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';
import { QrWlanHint } from '@/components/qr-wlan-hint';
import { useTranslation } from '@/lib/i18n/translations';

interface ConnectedClient {
  id: string;
  connectionCode: string;
  name: string;
  hasPitch: boolean;
  profile?: { name: string; avatar?: string; color: string };
  queueCount: number;
}

/** R55: Status des DuckDNS-/Let's-Encrypt-Features (GET /api/mobile?action=https-domain). */
interface HttpsDomainStatusDto {
  configured: boolean;
  domain: string | null;
  issuing: boolean;
  certActive: boolean;
  certExpiresAt: string | null;
  lastError: string | null;
  dnsIp: string | null;
  lastSyncAt: string | null;
}

/** R54: Zertifikats-Installations-Hinweis (lokal ausklappbar, kein State
 *  im Parent nötig). Einmal pro Handy installiert → keine HTTPS-Warnung
 *  mehr, auch nicht nach IP-Wechseln (lokale Root-CA, siehe R54).
 *  R55: Zur ALTERNATIVE herabgestuft — das echte Let's-Encrypt-Zertifikat
 *  (TrustedCertSection) hat Vorrang, sobald es aktiv ist. */
function CertSetupHint({ localIP }: { localIP: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  // Der CA-Download läuft bewusst über HTTP (Port 3000): Das Handy kann ja
  // genau VOR der Zertifikats-Installation noch keine vertrauenswürdige
  // HTTPS-Verbindung aufbauen.
  const certUrl = `http://${localIP}:3000/api/mobile?action=ca-cert`;
  const certQrSrc = useQRCode(open ? certUrl : '');

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        data-testid="cert-setup-hint"
      >
        <span className="font-medium text-sm">
          🔒 {t('settingsMobileDevice.certAltTitle')}
        </span>
        <span className="text-white/50 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-3 grid md:grid-cols-2 gap-4">
          <div className="text-sm text-white/60 space-y-2">
            <p>{t('settingsMobileDevice.certDesc')}</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>{t('settingsMobileDevice.certStep1')}</li>
              <li>{t('settingsMobileDevice.certStep2')}</li>
              <li>{t('settingsMobileDevice.certStep3')}</li>
            </ol>
            <p className="text-xs text-white/40">{t('settingsMobileDevice.certNote')}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-36 h-36 bg-white rounded-lg p-2">
              {certQrSrc ? (
                <img src={certQrSrc} alt={t('settingsMobileDevice.certQrAlt')} className="w-full h-full" />
              ) : (
                <div className="w-full h-full animate-pulse bg-gray-200 rounded" />
              )}
            </div>
            <p className="text-xs text-white/40 text-center">{t('settingsMobileDevice.certQrCaption')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * R55: Echtes Let's-Encrypt-Zertifikat über eine kostenlose DuckDNS-Subdomain.
 *
 * Antwort auf das Nutzer-Feedback „Die Zertifikats-Installation ist ziemlich
 * komplex — gibt es nicht eine einfachere Lösung?": Einmalig Subdomain + Token
 * von duckdns.org eintragen (≈ 2 Minuten, NUR auf dem Desktop) → der Server
 * holt automatisch ein echtes Zertifikat → JEDES Handy vertraut der Verbindung
 * automatisch. Keine Installation, keine Warnung, keine „Erweitert → Weiter"-
 * Klicks — auch nach WLAN-/IP-Wechseln nicht (DNS-Sync läuft serverseitig).
 *
 * Zustände: (a) nicht konfiguriert → Einrichtungs-Formular, (b) Ausstellung
 * läuft → Fortschritt, (c) aktiv → grüne Status-Karte mit Ablaufdatum +
 * Entfernen. Fehler werden auf verständliche deutsche Meldungen gemappt.
 */
function TrustedCertSection({
  onCertStateChange,
  onChanged,
}: {
  /** Signalisiert dem Parent, ob ein LE-Zertifikat aktiv ist (Option B ausblenden). */
  onCertStateChange?: (active: boolean) => void;
  /** Parent soll QR-/URL-Anzeige aktualisieren (Cache wurde aktualisiert). */
  onChanged?: () => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<HttpsDomainStatusDto | null>(null);
  const [open, setOpen] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [removeArmed, setRemoveArmed] = useState(false);
  const removeArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStatus = useCallback(async (): Promise<HttpsDomainStatusDto | null> => {
    try {
      const res = await fetch('/api/mobile?action=https-domain', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as HttpsDomainStatusDto;
      setStatus(data);
      onCertStateChange?.(!!data.certActive);
      return data;
    } catch {
      return null;
    }
  }, [onCertStateChange]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => () => { if (removeArmTimer.current) clearTimeout(removeArmTimer.current); }, []);

  /** Technische Fehler-Codes des Servers auf verständliche Meldungen mappen. */
  const mapError = (message: string): string => {
    switch (message) {
      case 'EMPTY_DOMAIN': return t('settingsMobileDevice.leErrEmptyDomain');
      case 'INVALID_DOMAIN': return t('settingsMobileDevice.leErrInvalidDomain');
      case 'INVALID_TOKEN': return t('settingsMobileDevice.leErrInvalidToken');
      case 'DUCKDNS_REJECTED': return t('settingsMobileDevice.leErrRejected');
      case 'RATE_LIMITED_RETRY_LATER': return t('settingsMobileDevice.leErrRateLimit');
      case 'ALREADY_ISSUING': return t('settingsMobileDevice.leErrBusy');
      case 'NO_LAN_IP': return t('settingsMobileDevice.leErrNoLanIp');
      default: return t('settingsMobileDevice.leErrGeneric');
    }
  };

  const activate = async () => {
    setBusy(true);
    setErrorKey(null);
    setRawError(null);
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'https-domain',
          payload: { domain: domainInput.trim(), token: tokenInput.trim() },
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string } & HttpsDomainStatusDto;
      if (res.ok && data.success) {
        // Cache sofort auf die Domain umschalten — alle QR-URLs (Settings,
        // Party-Setup, Profil-Karten) bauen ab jetzt die vertrauenswürdige
        // Domain-URL, ohne auf den nächsten Status-Poll zu warten.
        updateCompanionHttpsInfo({
          domain: data.domain ?? null,
          source: data.certActive ? 'letsencrypt' : 'local-ca',
        });
        onCertStateChange?.(!!data.certActive);
        onChanged?.();
        setTokenInput('');
        await loadStatus();
      } else {
        const message = typeof data.message === 'string' ? data.message : '';
        setErrorKey(mapError(message));
        setRawError(message || null);
        if (data.configured !== undefined) {
          setStatus(data);
          onCertStateChange?.(!!data.certActive);
        }
      }
    } catch {
      setErrorKey(t('settingsMobileDevice.leErrNetwork'));
      setRawError(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!removeArmed) {
      // Zwei-Klick-Bestätigung (4 s Fenster) statt confirm()-Dialog.
      setRemoveArmed(true);
      if (removeArmTimer.current) clearTimeout(removeArmTimer.current);
      removeArmTimer.current = setTimeout(() => setRemoveArmed(false), 4000);
      return;
    }
    setRemoveArmed(false);
    setBusy(true);
    setErrorKey(null);
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'https-domain-clear', payload: {} }),
      });
      if (res.ok) {
        updateCompanionHttpsInfo({ domain: null, source: 'local-ca' });
        onCertStateChange?.(false);
        onChanged?.();
        await loadStatus();
      }
    } catch {
      setErrorKey(t('settingsMobileDevice.leErrNetwork'));
    } finally {
      setBusy(false);
    }
  };

  const canActivate = !busy && domainInput.trim().length > 0 && tokenInput.trim().length > 0;
  const issuing = busy || !!status?.issuing;

  // ── (c) Zertifikat aktiv: grüne Status-Karte ──
  if (status?.certActive) {
    const expires = status.certExpiresAt ? new Date(status.certExpiresAt) : null;
    const daysLeft = expires ? Math.ceil((expires.getTime() - Date.now()) / 86_400_000) : null;
    return (
      <div
        className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
        data-testid="le-cert-active"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm text-emerald-300">
                ✅ {t('settingsMobileDevice.leActiveTitle')}
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px]">
                {status.domain}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/60">
              {t('settingsMobileDevice.leActiveDesc')}
            </p>
            <p className="mt-1.5 text-xs text-white/50">
              {t('settingsMobileDevice.leExpiresLabel')}:{' '}
              <span className="text-white/80">
                {expires ? expires.toLocaleDateString() : '—'}
              </span>
              {daysLeft !== null && Number.isFinite(daysLeft) && (
                <span className="text-white/40"> ({daysLeft} d)</span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={remove}
            className={
              removeArmed
                ? 'border-red-400/50 text-red-300 hover:bg-red-500/10 shrink-0'
                : 'border-white/20 text-white/70 hover:bg-white/10 shrink-0'
            }
          >
            {removeArmed ? t('settingsMobileDevice.leRemoveConfirm') : t('settingsMobileDevice.leRemove')}
          </Button>
        </div>
      </div>
    );
  }

  // ── (a)+(b) Einrichtung / Ausstellung läuft ──
  return (
    <div
      className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
      data-testid="le-cert-setup"
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        data-testid="le-cert-toggle"
      >
        <span className="font-medium text-sm">
          ✨ {t('settingsMobileDevice.leTitle')}
        </span>
        <span className="text-white/50 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {!open ? (
        // Zuklappzustand: Ein-Satz-Zusammenfassung, damit der Wert sofort klar ist
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          {status?.configured
            ? t('settingsMobileDevice.leActivating')
            : t('settingsMobileDevice.leIntro')}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-white/60 leading-relaxed">
            {t('settingsMobileDevice.leIntro')}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs text-white/60">
            <li>
              {t('settingsMobileDevice.leStep1')}{' '}
              <a
                href="https://www.duckdns.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                duckdns.org
              </a>
            </li>
            <li>{t('settingsMobileDevice.leStep2')}</li>
            <li>{t('settingsMobileDevice.leStep3')}</li>
          </ol>

          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label htmlFor="le-domain-input" className="block text-xs font-medium text-white/70 mb-1">
                {t('settingsMobileDevice.leDomainLabel')}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="le-domain-input"
                  type="text"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  placeholder="mein-karaoke"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={issuing}
                  data-testid="le-domain-input"
                  className="w-full min-w-0 bg-black/30 border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/60 focus:border-cyan-400/60 disabled:opacity-50"
                />
                <span className="shrink-0 text-sm text-white/40 select-none">.duckdns.org</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="le-token-input" className="block text-xs font-medium text-white/70 mb-1">
              {t('settingsMobileDevice.leTokenLabel')}
            </label>
            <input
              id="le-token-input"
              type="text"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
              disabled={issuing}
              data-testid="le-token-input"
              className="w-full bg-black/30 border border-white/20 rounded-md px-3 py-2 text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-400/60 focus:border-cyan-400/60 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              disabled={!canActivate}
              onClick={activate}
              data-testid="le-activate-button"
              className="bg-emerald-500/90 hover:bg-emerald-400 text-black font-semibold"
            >
              {issuing ? (
                <>
                  <span className="inline-block animate-spin mr-1.5 h-3 w-3 border-2 border-black/30 border-t-black rounded-full" aria-hidden="true" />
                  {t('settingsMobileDevice.leActivating')}
                </>
              ) : (
                <>🔐 {t('settingsMobileDevice.leActivate')}</>
              )}
            </Button>
            <p className="text-xs text-white/40 flex-1 min-w-[200px]">
              {t('settingsMobileDevice.lePrivacyNote')}
            </p>
          </div>

          {errorKey && (
            <div
              className="rounded-md bg-red-500/10 border border-red-400/30 px-3 py-2 text-xs text-red-300"
              role="alert"
              data-testid="le-error"
            >
              {errorKey}
              {rawError && !['EMPTY_DOMAIN', 'INVALID_DOMAIN', 'INVALID_TOKEN', 'DUCKDNS_REJECTED', 'RATE_LIMITED_RETRY_LATER', 'ALREADY_ISSUING', 'NO_LAN_IP'].includes(rawError) && (
                <details className="mt-1 text-red-300/70">
                  <summary className="cursor-pointer select-none">{t('settingsMobileDevice.leErrRaw')}</summary>
                  <code className="block mt-1 break-all">{rawError}</code>
                </details>
              )}
            </div>
          )}

          {status?.lastError && !errorKey && (
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              ⚠️ {mapError(status.lastError)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function MobileDeviceMicrophoneSection() {
  const [localIP, setLocalIP] = useState<string>('');
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);
  const [copyError, setCopyError] = useState(false);
  const [leCertActive, setLeCertActive] = useState(false);
  // R55: Cache-Update nach LE-Aktivierung/-Entfernung → QR + URL neu bauen.
  const [httpsNonce, setHttpsNonce] = useState(0);
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

  // R55: URL + QR neu berechnen, wenn der HTTPS-Cache sich ändert (Nonce).
  const mobileUrl = localIP ? buildCompanionUrl(localIP) : '/mobile';
  const qrCodeSrc = useQRCode(
    localIP ? buildCompanionUrl(localIP) : '',
  );
  void httpsNonce; // bewusste Re-Render-Abhängigkeit (siehe setHttpsNonce)

  return (
    <Card className="bg-white/5 border-white/10" data-testid="mobile-qr-card">
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
          <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg" data-testid="mobile-qr-code">
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
            <QrWlanHint className="justify-center" />
          </div>

          {/* Connection Info */}
          <div className="space-y-4">
            {/* R55: Echtes Let's-Encrypt-Zertifikat (empfohlene Haupt-Option) */}
            <TrustedCertSection
              onCertStateChange={setLeCertActive}
              onChanged={() => setHttpsNonce(n => n + 1)}
            />

            {/* R54: Lokale Root-CA — jetzt Alternative für Betrieb ohne
                Internet. Nur relevant, wenn ein HTTPS-Listener aktiv ist
                (mobileUrl startet dann mit https://) und KEIN echtes
                Zertifikat läuft (installierte CA bleibt trotzdem gültig). */}
            {localIP && mobileUrl.startsWith('https://') && !leCertActive && (
              <CertSetupHint localIP={localIP} />
            )}
            <div className="p-4 bg-white/5 rounded-lg" data-testid="mobile-connection-info">
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
