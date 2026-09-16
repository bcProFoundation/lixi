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

# Start lixi API in background
if ! curl -sf http://localhost:4800/graphql >/dev/null 2>&1; then
  cd "$LIXI_DIR/packages/app-lixi-api"
  corepack prepare pnpm@7.0.0 --activate
  NODE_ENV=development nohup pnpm start:dev > /tmp/lixi-api.log 2>&1 &
  for _ in $(seq 1 60); do
    if curl -sf http://localhost:4800/graphql >/dev/null 2>&1; then
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
