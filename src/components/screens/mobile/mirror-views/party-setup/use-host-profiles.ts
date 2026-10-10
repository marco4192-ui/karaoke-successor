'use client';

// ===================== Party-Setup-Mirror — Host-Profile-Hook =====================
//
// Lädt ALLE Host-Profile für die Party-Playerauswahl (Join-Logik).
// R6-Auslagerung aus mirror-party-setup-lite.tsx — Effect-Body, Dep-Array
// und Memo unverändert übernommen (Identifier: _availableProfiles →
// fallbackProfiles).

import { useEffect, useMemo, useState } from 'react';
import type { PartyModeInfo, PartySetupProfile } from './types';

/**
 * DO-NOT-CHANGE: Lade ALLE Host-Profile direkt vom hostprofiles-Endpoint,
 * da der availableProfiles-Prop nur unbeanspruchte Profile enthaelt
 * (von getopponents), aber fuer die Party-Playerauswahl alle Profile
 * auf dem Desktop gebraucht werden.
 */
export function useHostProfiles(
  modeInfo: PartyModeInfo | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- public prop is untyped (MirrorPartySetupLiteProps.availableProfiles)
  fallbackProfiles: any[]
): { activeProfiles: PartySetupProfile[]; profilesLoading: boolean } {
    const [allHostProfiles, setAllHostProfiles] = useState<PartySetupProfile[]>([]);
    const [profilesLoading, setProfilesLoading] = useState(false);

    useEffect(() => {
      if (!modeInfo) return;
      let cancelled = false;
      setProfilesLoading(true);
      fetch('/api/mobile?action=hostprofiles')
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d.success) return;
          // hostprofiles gibt alle Desktop-Profile zurueck
          const profiles = (d.profiles || []).map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            isActive: p.isActive !== false,
          }));
          if (!cancelled) setAllHostProfiles(profiles);
        })
        .catch(() => { /* ignore */ })
        .finally(() => { if (!cancelled) setProfilesLoading(false); });
      return () => { cancelled = true; };
    }, [modeInfo?.command]); // eslint-disable-line react-hooks/exhaustive-deps

    // DO-NOT-CHANGE: Nutze die direkt geladenen Host-Profile statt des Props,
    // da der Prop nur unbeanspruchte Profile enthaelt.
    const activeProfiles = useMemo(() => {
      if (allHostProfiles.length > 0) {
        return allHostProfiles.filter((p) => p.isActive !== false);
      }
      // Fallback auf den Prop (sollte selten vorkommen)
      if (!Array.isArray(fallbackProfiles)) return [];
      return fallbackProfiles.filter((p: any) => p.isActive !== false); // eslint-disable-line @typescript-eslint/no-explicit-any
    }, [allHostProfiles, fallbackProfiles]);

    return { activeProfiles, profilesLoading };
}
