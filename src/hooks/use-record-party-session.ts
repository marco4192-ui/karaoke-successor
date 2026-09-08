'use client';

import { useEffect, useRef } from 'react';
import { recordPartySession, type PartySessionRecord } from '@/lib/game/party-session-history';

/**
 * Records a party session exactly once per component mount.
 *
 * Pass `null` while the session is not yet final (e.g. tournament bracket
 * not completed) — a later non-null value triggers the record. The ref
 * guard survives React StrictMode's double effect invocation in dev.
 */
export function useRecordPartySession(
  input: Omit<PartySessionRecord, 'id' | 'finishedAt'> | null
): void {
  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current) return;
    if (!input) return;
    recordedRef.current = true;
    recordPartySession(input);
  }, [input]);
}
