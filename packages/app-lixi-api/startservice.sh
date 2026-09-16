#!/bin/sh
# Production entrypoint for the lixi API container.
# Runs DB migrations + seeds, then starts NestJS. Logs append to debug.log.
set -e
mkdir -p /app/packages/app-lixi-api/logs
pnpm db:deploy
# Seeds must not brick the API: keep the historical behavior where a seeds
# failure is logged but the server still starts (e.g. stale seed data).
pnpm db:seeds || echo "WARN: db:seeds failed at $(date -u +%FT%TZ) - starting API anyway"
exec node --no-network-family-autoselection /app/packages/app-lixi-api/dist/main >> /app/packages/app-lixi-api/logs/debug.log 2>&1
