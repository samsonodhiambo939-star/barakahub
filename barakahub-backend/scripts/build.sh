#!/bin/bash
# Render build script - npm install with dev dependencies
set -e

cd barakahub-backend

echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "PWD: $(pwd)"

# Install all dependencies (including dev) regardless of NODE_ENV
npm install --include=dev

echo "--- npm install done ---"

# Generate Prisma client
npx prisma generate

echo "--- prisma generate done ---"

# Build TypeScript
npm run build

echo "--- build complete ---"
