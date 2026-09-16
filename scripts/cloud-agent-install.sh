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
  nvm install 20
  nvm use 20
  export PATH="$NVM_DIR/versions/node/$(nvm current)/bin:$PATH"
fi

corepack enable

# System services for lixi backend
if command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo pg_ctlcluster 16 main start 2>/dev/null || sudo service postgresql start 2>/dev/null || true
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'lixi'" | grep -q 1 \
    || sudo -u postgres psql -c "CREATE DATABASE lixi OWNER postgres;"
  sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'atishadbpass';" 2>/dev/null || true
fi
if command -v redis-server >/dev/null 2>&1; then
  pgrep -x redis-server >/dev/null || redis-server --daemonize yes 2>/dev/null || true
fi

cd "$LIXI_DIR"
git lfs pull || true
corepack prepare pnpm@8.15.4 --activate
pnpm install

# Configure lixi env files if missing
if [ ! -f packages/lixi-prisma/.env ]; then
  cp packages/lixi-prisma/.env.example packages/lixi-prisma/.env
  cat > packages/lixi-prisma/.env <<'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=atishadbpass
POSTGRES_DB=lixi
DB_HOST=localhost
DB_PORT=5432
DB_SCHEMA=public
DATABASE_URL=postgresql://postgres:atishadbpass@localhost:5432/lixi?schema=public
EOF
fi

if [ ! -f packages/app-lixi-api/.env ]; then
  cp packages/app-lixi-api/.env.example packages/app-lixi-api/.env
  sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:atishadbpass@localhost:5432/lixi?schema=public|' packages/app-lixi-api/.env
  sed -i 's|DEPLOY_ENVIRONMENT=.*|DEPLOY_ENVIRONMENT=development|' packages/app-lixi-api/.env
  cat >> packages/app-lixi-api/.env <<'EOF'
PORT=4800
LOCAL_ECASH_URL=http://localhost:3000
MEILISEARCH_HOST=http://127.0.0.1:7700
MEILISEARCH_MASTER_KEY=dev-master-key
MEILISEARCH_BUCKET=Default
CHRONIK_XEC_URL=https://chronik.pay2stay.com/xec
CHRONIK_XPI_URL=https://chronik.be.cash/xpi
CHRONIK_XRG_URL=https://chronik.be.cash/xrg
CF_ACCOUNT_ID=dev-placeholder
CF_ACCOUNT_HASH=dev-placeholder
CF_IMAGES_TOKEN=LbfegEIqN2O-4IEOsRtiPmpiWrnx-7MiOEsv_EI3
CF_IMAGES_DELIVERY_URL=https://imagedelivery.net
EOF
  if ! grep -q '^PUBLIC_VAPID_KEY=' packages/app-lixi-api/.env; then
    VAPID_KEYS="$(cd packages/app-lixi-api && node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k.publicKey+' '+k.privateKey)")"
    echo "PUBLIC_VAPID_KEY=${VAPID_KEYS%% *}" >> packages/app-lixi-api/.env
    echo "PRIVATE_VAPID_KEY=${VAPID_KEYS#* }" >> packages/app-lixi-api/.env
  fi
fi

# MeiliSearch for local search indexing
if [ ! -x /usr/local/bin/meilisearch ] && [ ! -x "$HOME/.local/bin/meilisearch" ]; then
  MEILI_VERSION="v1.12.8"
  curl -fsSL "https://github.com/meilisearch/meilisearch/releases/download/${MEILI_VERSION}/meilisearch-linux-amd64" \
    -o /tmp/meilisearch
  chmod +x /tmp/meilisearch
  sudo mv /tmp/meilisearch /usr/local/bin/meilisearch
fi

# Wire fiat-rate API keys from environment secrets (Cloud Agent Secrets inject
# CMC_API_KEY / OER_APP_ID as env vars). Upserts into existing .env as well so
# keys added later still take effect on the next install run.
upsert_env() {
  local file="$1" key="$2" value="$3"
  grep -v "^${key}=" "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  echo "${key}=${value}" >> "$file"
}
if [ -n "${CMC_API_KEY:-}" ]; then
  upsert_env packages/app-lixi-api/.env CMC_API_KEY "${CMC_API_KEY}"
fi
if [ -n "${OER_APP_ID:-}" ]; then
  upsert_env packages/app-lixi-api/.env OER_APP_ID "${OER_APP_ID}"
fi

cd packages/lixi-prisma
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm db:seeds || true

cd "$LIXI_DIR/packages/lixi-models"
npx tsc -p tsconfig.json --skipLibCheck
npx tsc -p tsconfig.module.json --skipLibCheck

cd "$LIXI_DIR/packages/lixi-prisma"
npx tsc -p tsconfig.build.json --skipLibCheck
npx tsc -p tsconfig.module.json --skipLibCheck

# Skip multi-minute Dana block-index queue seeding on first API boot
if command -v redis-cli >/dev/null 2>&1; then
  XEC_TIP="$(cd "$LIXI_DIR/packages/app-lixi-api" && node -e "
    const { ChronikClient } = require('chronik-client');
    new ChronikClient(['https://chronik.pay2stay.com/xec']).blockchainInfo()
      .then(i => console.log(i.tipHeight))
      .catch(() => console.log(0));
  " 2>/dev/null || echo 0)"
  redis-cli SET "lixilotus:items:index-block-highest:XEC" "${XEC_TIP:-0}" >/dev/null 2>&1 || true
  redis-cli SET "lixilotus:items:index-block-highest:XPI" "1" >/dev/null 2>&1 || true
  redis-cli SET "lixilotus:items:index-block-highest:XRG" "1" >/dev/null 2>&1 || true
fi

if [ -n "${LOCAL_ECASH_DIR:-}" ]; then
  cd "$LOCAL_ECASH_DIR"
  corepack prepare pnpm@10.17.0 --activate
  pnpm install

  if [ ! -f apps/telegram-ecash-escrow/.env ]; then
    cp apps/telegram-ecash-escrow/.env.example apps/telegram-ecash-escrow/.env
    sed -i 's|NEXT_PUBLIC_LIXI_API=.*|NEXT_PUBLIC_LIXI_API=http://localhost:4800/|' apps/telegram-ecash-escrow/.env
    sed -i 's|NEXT_PUBLIC_LIXI_URL=.*|NEXT_PUBLIC_LIXI_URL=http://localhost:4800/|' apps/telegram-ecash-escrow/.env
    echo "NEXT_PUBLIC_APPLICATION_URL=http://localhost:3000" >> apps/telegram-ecash-escrow/.env
  fi
fi

echo "Cloud Agent install complete."
