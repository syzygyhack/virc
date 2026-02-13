#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start all backend services (ergo, mysql, livekit, virc-files, caddy)
echo "Starting Docker services..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d

# Start client dev server (Vite with HMR)
echo "Starting virc-client dev server..."
cd "$SCRIPT_DIR/virc-client" && npm run dev
