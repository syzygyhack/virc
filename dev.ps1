$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start all backend services (ergo, mysql, livekit, virc-files, caddy)
Write-Host "Starting Docker services..."
docker compose -f "$ScriptDir\docker-compose.yml" up -d

# Start client dev server (Vite with HMR)
Write-Host "Starting virc-client dev server..."
Set-Location "$ScriptDir\virc-client"
npm run dev
