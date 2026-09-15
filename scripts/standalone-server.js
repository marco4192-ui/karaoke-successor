/**
 * Custom standalone server for the Tauri desktop build (production).
 *
 * Replaces the auto-generated Next.js standalone server.js, which boots the
 * Next runtime but has NO Socket.IO — companions in the packaged desktop
 * app got endless "WebSocket connection to 'ws://localhost:3000/socket.io/'
 * failed" console errors and could only use the HTTP polling fallback.
 *
 * This server:
 *   1. loads the build-time Next config (same source the generated
 *      server.js inlines: .next/required-server-files.json)
 *   2. boots the standalone Next.js runtime through the public
 *      `getRequestHandlers` API from next/dist/server/lib/start-server
 *   3. attaches the bundled Socket.IO server (socketio-server.cjs, built
 *      by scripts/prepare-bundle.mjs via esbuild) to the SAME HTTP server
 *   4. degrades gracefully: without socketio-server.cjs the app still
 *      boots — companions just fall back to HTTP polling
 *
 * Mirrors the request/upgrade error handling of Next's own startServer()
 * (500 responses for failed requests, socket.destroy for failed upgrades).
 */
const path = require('path');
const http = require('http');
const fs = require('fs');

const dir = path.join(__dirname);
process.env.NODE_ENV = 'production';
process.chdir(__dirname);

const currentPort = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10);
if (
  Number.isNaN(keepAliveTimeout) ||
  !Number.isFinite(keepAliveTimeout) ||
  keepAliveTimeout < 0
) {
  keepAliveTimeout = undefined;
}

// ─── 1. Build-time Next config (the generated server.js inlines this) ───
// required-server-files.json ships with the standalone output and contains
// the fully resolved config. Without __NEXT_PRIVATE_STANDALONE_CONFIG the
// config loader tries to read webpack hook files that are not traced into
// standalone and throws.
try {
  const requiredServerFiles = path.join(dir, '.next', 'required-server-files.json');
  const nextConfig = JSON.parse(fs.readFileSync(requiredServerFiles, 'utf8')).config;
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
} catch (err) {
  console.warn('[standalone] Could not load .next/required-server-files.json:', err && err.message);
  console.warn('[standalone] Continuing without embedded config — this may fail.');
}

require('next');
const { getRequestHandlers } = require('next/dist/server/lib/start-server');

// ─── 2. Socket.IO (best-effort, bundled by scripts/prepare-bundle.mjs) ───
let initSocketIO = null;
try {
  initSocketIO = require('./socketio-server.cjs').initSocketIO;
} catch (err) {
  console.warn('[standalone] socketio-server.cjs not available — companions will use HTTP polling.');
  console.warn('[standalone] reason:', err && err.message);
}

async function main() {
  // ─── 3. Boot the standalone Next.js runtime ───
  const { requestHandler, upgradeHandler } = await getRequestHandlers({
    dir,
    port: currentPort,
    isDev: false,
    onDevServerCleanup: undefined,
    server: undefined,
    hostname,
    keepAliveTimeout,
  });

  // Same error handling shape as next's startServer():
  // failed requests → 500, failed upgrades → socket.destroy()
  async function requestListener(req, res) {
    try {
      await requestHandler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.end('Internal Server Error');
      console.error(`[standalone] Failed to handle request for ${req.url}`);
      console.error(err);
    }
  }

  const server = http.createServer(requestListener);
  if (keepAliveTimeout) {
    server.keepAliveTimeout = keepAliveTimeout;
  }

  server.on('upgrade', async (req, socket, head) => {
    try {
      await upgradeHandler(req, socket, head);
    } catch (err) {
      socket.destroy();
      console.error(`[standalone] Failed to handle upgrade for ${req.url}`);
      console.error(err);
    }
  });

  // ─── 4. Attach Socket.IO AFTER Next's handlers are registered ───
  // engine.io wraps the existing request/upgrade listeners at attach time
  // and passes all non-/socket.io traffic through to them untouched.
  if (initSocketIO) {
    try {
      initSocketIO(server);
      console.log('[standalone] Socket.IO attached on path /socket.io');
    } catch (err) {
      console.warn('[standalone] Socket.IO init failed — HTTP polling fallback active.');
      console.warn('[standalone] reason:', err && err.message);
    }
  }

  server.listen(currentPort, hostname, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  🎤 Karaoke ZERO Server (standalone + Socket.IO) ║');
    console.log(`║  Next.js:   http://${hostname}:${currentPort}`);
    console.log(`║  Socket.IO: ws://${hostname}:${currentPort}/socket.io`);
    console.log('╚══════════════════════════════════════════════════╝');
  });

  // Graceful shutdown (Tauri sends SIGTERM when the window closes)
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[standalone] ${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    // Force exit after 5s if graceful shutdown hangs
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[standalone] Failed to start server:', err);
  process.exit(1);
});
