/**
 * Standalone Server Wrapper for Karaoke Successor
 * This script starts the Next.js standalone server with proper configuration
 */

const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOSTNAME || '0.0.0.0';

// Resolve paths relative to this script location
const serverDir = __dirname;
const standaloneServerPath = path.join(serverDir, '.next', 'standalone', 'server.js');

// Check if running as standalone (bundled with Tauri)
const isBundled = process.env.TAURI_BUNDLED === 'true' || 
                  !process.cwd().includes('node_modules');

console.log('='.repeat(50));
console.log('🎤 Karaoke Successor - Standalone Server');
console.log('='.repeat(50));
console.log(`Server directory: ${serverDir}`);
console.log(`Port: ${PORT}`);
console.log(`Host: ${HOST}`);
console.log(`Bundled mode: ${isBundled}`);
console.log('='.repeat(50));

// Check for standalone server
const fs = require('fs');
const possibleServerPaths = [
    path.join(serverDir, 'server.js'),
    path.join(serverDir, '.next', 'standalone', 'server.js'),
    path.join(serverDir, '.next', 'standalone', 'src', 'app', 'server.js'),
];

let serverPath = null;
for (const p of possibleServerPaths) {
    if (fs.existsSync(p)) {
        serverPath = p;
        console.log(`Found server at: ${p}`);
        break;
    }
}

// If standalone server exists, use it
if (serverPath) {
    console.log('Starting Next.js standalone server...');
    
    // Set environment variables
    process.env.PORT = PORT;
    process.env.HOSTNAME = HOST;
    
    // Start the server
    require(serverPath);
} else {
    // Fallback: Create a simple static server for the public folder
    console.log('No standalone server found, starting static file server...');
    
    const publicDir = path.join(serverDir, 'public');
    
    const server = http.createServer((req, res) => {
        let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
        
        // Security: prevent directory traversal
        if (!filePath.startsWith(publicDir)) {
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
