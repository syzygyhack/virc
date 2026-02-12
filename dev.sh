#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend services
echo "Starting backend services..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d ergo mysql livekit caddy

# Start virc-files in dev mode
echo "Starting virc-files dev server..."
cd "$SCRIPT_DIR/virc-files" && bun run --watch src/index.ts &

# Start client in dev mode
echo "Starting virc-client dev server..."
cd "$SCRIPT_DIR/virc-client" && npm run dev &

wait
