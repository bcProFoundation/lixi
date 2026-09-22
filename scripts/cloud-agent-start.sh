#!/usr/bin/env bash
set -euo pipefail

find_repo() {
  local name="$1"
  for base in /workspace /agent/repos "$(pwd)" "$(dirname "$(pwd)")"; do
    if [ -d "${base}/${name}" ]; then
      echo "${base}/${name}"
      return 0
    fi
  done
  return 1
}

LIXI_DIR="$(find_repo lixi)"
LOCAL_ECASH_DIR="$(find_repo local-ecash || true)"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null
  export PATH="$NVM_DIR/versions/node/$(nvm current)/bin:$PATH"
fi

# Ensure infrastructure is running
if command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo pg_ctlcluster 16 main start 2>/dev/null || true
fi
if command -v redis-server >/dev/null 2>&1; then
  pgrep -x redis-server >/dev/null || redis-server --daemonize yes 2>/dev/null || true
fi

# Start MeiliSearch for lixi API search indexing
if command -v meilisearch >/dev/null 2>&1; then
  pgrep -f "meilisearch.*7700" >/dev/null || \
    MEILI_MASTER_KEY=dev-master-key nohup meilisearch --http-addr 127.0.0.1:7700 --env development \
      > /tmp/meilisearch.log 2>&1 &
fi

# Start lixi API in background (prefer prebuilt dist; watch mode may fail on TS errors)
if ! curl -sf -X POST http://localhost:4800/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}' >/dev/null 2>&1; then
  cd "$LIXI_DIR/packages/app-lixi-api"
  corepack prepare pnpm@7.0.0 --activate
  if [ -f dist/main.js ]; then
    NODE_ENV=development nohup pnpm start:prod > /tmp/lixi-api.log 2>&1 &
  else
    NODE_ENV=development nohup pnpm start:dev > /tmp/lixi-api.log 2>&1 &
  fi
  for _ in $(seq 1 60); do
    if curl -sf -X POST http://localhost:4800/graphql \
      -H 'Content-Type: application/json' \
      -d '{"query":"{ __typename }"}' >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

# Start local-ecash Next.js dev server
if [ -n "${LOCAL_ECASH_DIR:-}" ] && ! curl -sf http://localhost:3000 >/dev/null 2>&1; then
  cd "$LOCAL_ECASH_DIR"
  corepack prepare pnpm@10.17.0 --activate
  nohup pnpm dev:next > /tmp/local-ecash.log 2>&1 &
  for _ in $(seq 1 60); do
    if curl -sf http://localhost:3000 >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

echo "Services started. Lixi API: http://localhost:4800  Local eCash: http://localhost:3000"
