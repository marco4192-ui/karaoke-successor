/**
 * Shared retry helper for API routes.
 * Executes an async function up to maxRetries+1 times with exponential backoff.
 * Skips retrying on 429 (rate-limit) — the error is thrown immediately so the
 * caller can surface a user-friendly "rate limited" message instead of burning
 * through retries that will all fail anyway.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 1500): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry 429 rate-limit errors — they need a longer cool-down
      if (isRateLimitError(lastError)) break;

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/** Check if an error is a 429 rate-limit response. */
export function isRateLimitError(err: Error): boolean {
  const msg = err.message ?? '';
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('weekly usage limit');
}
