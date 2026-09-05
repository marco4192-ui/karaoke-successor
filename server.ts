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
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // ─── Attach Socket.IO to the same HTTP server ───
  initSocketIO(server);

  server.listen(port, hostname, () => {
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
    console.log('[Server] Shutting down...');
    server.close(() => {
      console.log('[Server] HTTP server closed');
      process.exit(0);
    });
    // Force exit after 5s if graceful shutdown fails
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
