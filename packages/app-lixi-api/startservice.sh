#!/bin/sh
# Production entrypoint for the lixi API container.
# Runs DB migrations + seeds, then starts NestJS. Logs append to debug.log.
set -e
mkdir -p /app/packages/app-lixi-api/logs
pnpm db:deploy
pnpm db:seeds
exec node --no-network-family-autoselection /app/packages/app-lixi-api/dist/main >> /app/packages/app-lixi-api/logs/debug.log 2>&1
