/**
 * Standalone Server Wrapper for AfterTen Karaoke
 * This script starts the Next.js standalone server with proper configuration
 */

const path = require('path');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOSTNAME || '0.0.0.0';

// Resolve paths relative to this script location
const serverDir = __dirname;

// Check if running as standalone (bundled with Tauri)
const isBundled = process.env.TAURI_BUNDLED === 'true' ||
                  !process.cwd().includes('node_modules');

console.log('='.repeat(50));
console.log('🎤 AfterTen Karaoke - Standalone Server');
console.log('='.repeat(50));
console.log(`Server directory: ${serverDir}`);
console.log(`Port: ${PORT}`);
console.log(`Host: ${HOST}`);
console.log(`Bundled mode: ${isBundled}`);
console.log('='.repeat(50));

// Set environment variables before the server loads
process.env.PORT = PORT;
process.env.HOSTNAME = HOST;

// If a standalone server exists, start it. The candidates are fixed at
// authoring time and required through static specifiers — no dynamic
// require of computed paths.
const fs = require('fs');

if (fs.existsSync(path.join(serverDir, 'server.js'))) {
    console.log(`Found server at: ${path.join(serverDir, 'server.js')}`);
    console.log('Starting Next.js standalone server...');
    require('./server.js');
} else if (fs.existsSync(path.join(serverDir, '.next', 'standalone', 'server.js'))) {
    console.log(`Found server at: ${path.join(serverDir, '.next', 'standalone', 'server.js')}`);
    console.log('Starting Next.js standalone server...');
    require('./.next/standalone/server.js');
} else if (fs.existsSync(path.join(serverDir, '.next', 'standalone', 'src', 'app', 'server.js'))) {
    console.log(`Found server at: ${path.join(serverDir, '.next', 'standalone', 'src', 'app', 'server.js')}`);
    console.log('Starting Next.js standalone server...');
    require('./.next/standalone/src/app/server.js');
} else {
    // Fallback: Create a simple static server for the public folder
    console.log('No standalone server found, starting static file server...');

    const publicDir = path.join(serverDir, 'public');

    const server = http.createServer((req, res) => {
        let urlPath;
        try {
            // URL parsing normalizes ".." segments in URL space; decode
            // percent-encoding afterwards so "%2e%2e" cannot smuggle a
            // traversal past the containment check below.
            urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        } catch {
            res.writeHead(400);
            res.end('Bad Request');
            return;
        }
        if (urlPath.includes('\0')) {
            res.writeHead(400);
            res.end('Bad Request');
            return;
        }

        const filePath = path.normalize(path.join(publicDir, urlPath));

        // Security: the resolved path must stay inside publicDir
        // (relative path must not escape via '..' or another drive).
        const rel = path.relative(publicDir, filePath);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }

            // Basic content type detection
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
            };

            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
            res.end(data);
        });
    });

    server.listen(PORT, HOST, () => {
        console.log(`Static server running at http://${HOST}:${PORT}`);
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    process.exit(0);
});
