/**
 * Resilient polling error logging.
 *
 * Transient network hiccups (dev-server HMR rebuilds, socket reconnection
 * windows, background-tab throttling) cause periodic fetch failures in the
 * companion/remote-control polling loops. Logging every single failure via
 * console.error floods the console and the Next.js dev overlay ("N Issues").
 *
 * This helper logs:
 *  - the FIRST failure of a streak (console.warn — visible but not counted
 *    as app error by the dev overlay)
 *  - every 10th consecutive failure (permanent issues still surface)
 *  - recovery after a streak of >=2 failures (console.info, once)
 */

export interface PollErrorLogger {
  /** Call in the catch block. Returns true if the error was logged. */
  logError: (_error: unknown) => boolean;
  /** Call on success — resets the streak and logs recovery when relevant. */
  logSuccess: () => void;
}

/** Re-log threshold: after this many consecutive failures, log again. */
const REPEAT_EVERY = 10;

export function createPollErrorLogger(tag: string): PollErrorLogger {
  let consecutiveFailures = 0;
  let loggedRecovery = false;

  return {
    logError(error: unknown) {
      consecutiveFailures += 1;
      const shouldLog =
        consecutiveFailures === 1 || consecutiveFailures % REPEAT_EVERY === 0;
      if (shouldLog) {
        const suffix =
          consecutiveFailures > 1 ? ` (${consecutiveFailures}x in a row)` : '';
        // eslint-disable-next-line no-console
        console.warn(`[${tag}] Polling failed${suffix} — retrying:`, error);
      }
      return shouldLog;
    },
    logSuccess() {
      if (consecutiveFailures >= 2 && !loggedRecovery) {
        // eslint-disable-next-line no-console
        console.info(`[${tag}] Polling recovered after ${consecutiveFailures} failures.`);
        loggedRecovery = true;
      }
      consecutiveFailures = 0;
    },
  };
}
