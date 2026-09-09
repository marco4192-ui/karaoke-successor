/**
 * Preload for `bun test` (wired via bunfig.toml).
 *
 * Bun's built-in test runner executes in a bare runtime (no DOM), unlike
 * `bun run test` (vitest) which uses the jsdom environment configured in
 * vitest.config.ts. localStorage/window-backed modules therefore fail under
 * `bun test` ("localStorage is not defined", SSR guards short-circuit)
 * even though the suite is green under vitest.
 *
 * This preload installs a spec-compatible in-memory localStorage plus a
 * minimal `window` facade (with just the APIs the unit-tested modules
 * touch) so BOTH runners pass. Under vitest/jsdom the real globals exist
 * and every block below is a no-op.
 *
 * IMPORTANT: it must run BEFORE test files import app modules —
 * `@/lib/storage` snapshots `isBrowser` at module-load time.
 */

/* eslint-disable no-restricted-syntax */

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();

  class MemoryStorage implements Storage {
    get length(): number {
      return store.size;
    }
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    }
    getItem(key: string): string | null {
      const k = String(key);
      return store.has(k) ? (store.get(k) as string) : null;
    }
    setItem(key: string, value: string): void {
      store.set(String(key), String(value));
    }
    removeItem(key: string): void {
      store.delete(String(key));
    }
    clear(): void {
      store.clear();
    }
  }

  const storageInstance = new MemoryStorage();

  Object.defineProperty(globalThis, 'localStorage', {
    value: storageInstance,
    configurable: true,
    writable: true,
    enumerable: true,
  });

  // Minimal `window` facade — SSR guards like `typeof window === 'undefined'`
  // (party-session-history, lib/storage) must take the browser path. Only the
  // APIs actually reachable from unit-tested modules are provided; anything
  // else stays undefined so missing-DOM bugs still surface loudly.
  if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
    type Listener = (event: unknown) => void;
    const listeners = new Map<string, Set<Listener>>();
    const noopWindow = {
      localStorage: storageInstance,
      addEventListener(type: string, cb: Listener): void {
        if (!listeners.has(type)) listeners.set(type, new Set());
        (listeners.get(type) as Set<Listener>).add(cb);
      },
      removeEventListener(type: string, cb: Listener): void {
        (listeners.get(type) as Set<Listener> | undefined)?.delete(cb);
      },
      dispatchEvent(event: { type: string }): boolean {
        (listeners.get(event.type) as Set<Listener> | undefined)?.forEach(cb => cb(event));
        return true;
      },
      // Read-only-ish shims for modules probing the environment
      navigator: { language: 'en', languages: ['en'] },
      location: { search: '', href: 'http://localhost/', origin: 'http://localhost' },
    };

    Object.defineProperty(globalThis, 'window', {
      value: noopWindow,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  }
}
