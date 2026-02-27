#!/bin/bash
# This script prepares bundled files for Tauri build

echo "Preparing bundled files..."

# Create directories
mkdir -p bundled-server
mkdir -p bundled-node

# Copy Next.js standalone if it exists
if [ -d ".next/standalone" ]; then
    echo "Copying Next.js standalone..."
    cp -r .next/standalone/* bundled-server/
    mkdir -p bundled-server/.next/static
    cp -r .next/static/* bundled-server/.next/static/ 2>/dev/null || true
else
    echo "Warning: .next/standalone not found"
fi

echo "Bundled files prepared!"
ls -la bundled-server/ 2>/dev/null || echo "No bundled-server"
ls -la bundled-node/ 2>/dev/null || echo "No bundled-node"
