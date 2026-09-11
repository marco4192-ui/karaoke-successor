/**
 * Custom Next.js server with Socket.IO integration.
 *
 * This server wraps the standard Next.js HTTP handler and attaches
 * a Socket.IO server to the same HTTP server instance. This allows
 * real-time WebSocket communication between Desktop and Companion
 * clients on the same port (3000) as the web app.
 *
 * Usage:
 *   Dev:  tsx server.ts
 *   Prod: node server.js  (compiled via build step)
 *
 * The Socket.IO server uses the path /socket.io/ for WebSocket upgrades.
 * All existing Next.js routes continue to work unchanged.
 */
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketIO } from './src/lib/socketio-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
// Next 16's custom-server path (NextCustomServer) reuses the full `next dev`
// router-server machinery — including the Turbopack dev bundler, hot reloader,
// and HMR upgrade handling. Turbopack is the right bundler here: it compiles
// faster and with far less memory than webpack on this huge module graph
// (webpack peaked >2 GB RSS and its react-refresh entry silently stalled).
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // ─── Attach Socket.IO to the same HTTP server ───
  initSocketIO(server);

  // NOTE: no manual 'upgrade' wiring needed here. Next 16's NextCustomServer
  // auto-wires its own upgrade handler onto this HTTP server on the first
  // request (via req.socket.server), which routes /_next/l HMR websocket
  // upgrades to the Turbopack hot reloader. Adding a second listener here
  // would double-handle upgrades and break the HMR connection.

  server.listen(port, hostname, () => {
    // eslint-disable-next-line no-console
    console.log(`
╔══════════════════════════════════════════════════╗
║  🎤 Karaoke ZERO Server                          ║
║  Next.js:   http://${hostname}:${port}                    ║
║  Socket.IO: ws://${hostname}:${port}/socket.io          ║
║  Mode:      ${dev ? 'DEVELOPMENT' : 'PRODUCTION'}                         ║
╚══════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = () => {
    // eslint-disable-next-line no-console
    console.log('[Server] Shutting down...');
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
    // Force exit after 5s if graceful shutdown fails
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
