'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlayerProfile } from '@/types/game';
import type { CompanionClientInfo } from '@/hooks/use-companion-connections';
import { useQRCode } from '@/hooks/use-qr-code';
import { detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';
import { useTranslation } from '@/lib/i18n/translations';

/**
 * R34 — Companion-Gerät zuweisen (User-Report: "Desktop erkennt nicht, ob ein
 * Spieler per Companion verbunden ist").
 *
 * Ein verbundenes Handy ohne Profil-Claim tauchte in der Spieler-Erkennung
 * NIE auf (connectedProfileIds matcht nur geclaimte Profil-IDs) — der Setup
 * sagte "noch nicht verbunden", obwohl das Gerät online war. Dieses Panel
 * listet ALLE verbundenen Geräte (auch ohne Profil) und bindet sie per
 * Klick an den Spieler (POST assigncharacter). Zusätzlich: ein Profil-QR
 * (?profile=<playerId>) — das Handy adoptiert das Spieler-Profil beim
 * Scannen automatisch und singt sofort für diesen Spieler.
 */
export function CompanionAssignPanel({
  playerProfile,
  clients,
}: {
  playerProfile: PlayerProfile;
  clients: CompanionClientInfo[];
}) {
  const { t } = useTranslation();
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [localIP, setLocalIP] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    detectLocalIP().then(ip => {
      if (!cancelled) setLocalIP(ip);
    }).catch(() => { /* offline — QR stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  const qrCodeSrc = useQRCode(localIP ? buildCompanionUrl(localIP, 3000, playerProfile.id) : '', 140);

  const connected = clients.filter(c => c.connected);

  const handleAssign = useCallback(async (client: CompanionClientInfo) => {
    setAssigningId(client.id);
    setError(false);
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'assigncharacter',
          payload: {
            targetClientId: client.id,
            profile: {
              id: playerProfile.id,
              name: playerProfile.name,
              color: playerProfile.color,
              avatar: playerProfile.avatar,
              createdAt: Date.now(),
            },
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAssignedId(client.id);
      // Status dot in the player row turns green via the 2s connection poll;
      // fade the success marker shortly after.
      setTimeout(() => setAssignedId(null), 2000);
    } catch {
      setError(true);
    } finally {
      setAssigningId(null);
    }
  }, [playerProfile]);

  return (
    <div
      className="w-full rounded-xl border border-white/10 bg-black/25 p-3 space-y-3"
      data-testid={`companion-assign-panel-${playerProfile.name}`}
    >
      {/* ── Connected devices (incl. unassigned!) ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">
          📱 {t('unifiedSetup.assignDevicesTitle')}
        </p>
        {connected.length === 0 ? (
          <p className="text-xs text-white/50">{t('unifiedSetup.assignDeviceNoClients')}</p>
        ) : (
          <div className="space-y-1.5">
            {connected.map(c => {
              const isMine = c.profile?.id === playerProfile.id;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                    isMine ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <span aria-hidden="true" className="text-sm shrink-0">📱</span>
                  <span className="text-xs text-white/85 truncate flex-1 min-w-0">
                    {c.profile ? c.profile.name : `${c.name} ·…${c.id.slice(-4)}`}
                  </span>
                  {!c.profile && (
                    <span className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5 shrink-0">
                      {t('unifiedSetup.assignDeviceUnassigned')}
                    </span>
                  )}
                  {c.profile && !isMine && (
                    <span className="text-[10px] text-white/40 truncate max-w-[110px] shrink-0">
                      {t('unifiedSetup.assignDeviceAssignedTo').replace('{name}', c.profile.name)}
                    </span>
                  )}
                  {isMine ? (
                    <span className="text-xs text-emerald-400 font-semibold shrink-0" aria-label={t('unifiedSetup.connected')}>
                      ✓
                    </span>
                  ) : assignedId === c.id ? (
                    <span className="text-xs text-emerald-400 font-semibold shrink-0">
                      {t('unifiedSetup.assignDeviceDone')}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assigningId !== null}
                      onClick={() => handleAssign(c)}
                      className="h-7 px-2.5 text-[11px] border-white/20 text-white/80 hover:bg-white/10 shrink-0"
                      data-testid={`assign-device-${c.id.slice(-4)}`}
                    >
                      {assigningId === c.id ? '…' : t('unifiedSetup.assignDeviceToPlayer')}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {error && (
          <p className="text-xs text-red-400 mt-2">⚠ {t('unifiedSetup.assignDeviceError')}</p>
        )}
      </div>

      {/* ── Per-player profile QR ── */}
      {localIP && (
        <div className="pt-2.5 border-t border-white/10 flex items-center gap-3">
          {qrCodeSrc ? (
            <img
              src={qrCodeSrc}
              alt={t('unifiedSetup.qrCompanionTitle')}
              className="w-[84px] h-[84px] rounded-lg bg-white p-1 shadow-lg shrink-0"
            />
          ) : (
            <div className="w-[84px] h-[84px] rounded-lg bg-white/10 animate-pulse shrink-0" />
          )}
          <p className="text-xs text-white/50 flex-1 min-w-0">
            {t('unifiedSetup.assignDeviceQrHint').replace('{name}', playerProfile.name)}
          </p>
        </div>
      )}
    </div>
  );
}
