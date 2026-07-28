#!/bin/bash
# Build script for standalone Windows app
# This must run BEFORE Tauri build

set -e

echo "========================================="
echo "Preparing standalone bundle for Tauri"
echo "========================================="

# Create bundled directories inside src-tauri
mkdir -p src-tauri/bundled/server
mkdir -p src-tauri/bundled/node

# Check if standalone server exists
if [ -d ".next/standalone" ]; then
    echo "Copying Next.js standalone server..."
    cp -r .next/standalone/* src-tauri/bundled/server/
    
    # Copy static files
    mkdir -p src-tauri/bundled/server/.next/static
    cp -r .next/static/* src-tauri/bundled/server/.next/static/
    
    # Copy public folder
    if [ -d "public" ]; then
        cp -r public src-tauri/bundled/server/
    fi
    
    echo "Server bundle ready!"
else
    echo "ERROR: .next/standalone not found!"
    echo "Run 'bun run next build' first!"
    exit 1
fi

# Check if portable Node.js exists
if [ -d "portable-node" ] && [ -f "portable-node/node" ]; then
    echo "Copying portable Node.js..."
    cp -r portable-node/* src-tauri/bundled/node/
    echo "Node.js bundle ready!"
else
    echo "WARNING: portable-node not found, creating placeholder..."
    echo "Node.js will need to be downloaded during build"
fi

echo "========================================="
echo "Bundle preparation complete!"
echo "========================================="
ls -la src-tauri/bundled/
