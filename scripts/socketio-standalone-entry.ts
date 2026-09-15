/**
 * esbuild entry point for the Socket.IO server in the standalone/Tauri build.
 *
 * WHY THIS EXISTS:
 * The auto-generated Next.js standalone `server.js` boots the Next runtime
 * ONLY — our custom `server.ts` (which attaches Socket.IO in dev/prod via
 * `tsx server.ts`) is NOT part of the standalone output. As a result the
 * packaged desktop app had NO Socket.IO server: companions saw endless
 * "WebSocket connection failed" console errors and silently fell back to
 * HTTP polling.
 *
 * `scripts/prepare-bundle.mjs` runs esbuild on THIS file, inlining
 * `src/lib/socketio-server.ts` plus its whole dependency graph
 * (socket.io, engine.io, ws, mobile-state, socketio-events, ...) into a
 * single self-contained `socketio-server.cjs`. The custom standalone
 * `server.js` then attaches it to the same HTTP server as Next.js.
 *
 * SHARED STATE — CRITICAL DETAIL:
 * The bundle becomes its own module graph, separate from Next's route
 * handler graph. This is safe ONLY because every shared object is anchored
 * on globalThis (`__karaokeMobileShared` in mobile-state, `__karaokeMobileEvents`
 * in socketio-events) — both graphs dereference the SAME instances, so the
 * Socket.IO server pushes live state, never stale copies.
 *
 * `next` / `next/*` stay external: they resolve at runtime from the
 * standalone output's own node_modules.
 */
import {
  initSocketIO,
  getIO,
  getHostSocket,
  getCompanionSocketCount,
} from '@/lib/socketio-server';

export { initSocketIO, getIO, getHostSocket, getCompanionSocketCount };
