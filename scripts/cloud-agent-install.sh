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
corepack prepare pnpm@8.15.4 --activate

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
pnpm install --frozen-lockfile

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
  echo "PORT=4800" >> packages/app-lixi-api/.env
  echo "LOCAL_ECASH_URL=http://localhost:3000" >> packages/app-lixi-api/.env
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

if [ -n "${LOCAL_ECASH_DIR:-}" ]; then
  cd "$LOCAL_ECASH_DIR"
  corepack prepare pnpm@10.17.0 --activate
  pnpm install --frozen-lockfile

  if [ ! -f apps/telegram-ecash-escrow/.env ]; then
    cp apps/telegram-ecash-escrow/.env.example apps/telegram-ecash-escrow/.env
    sed -i 's|NEXT_PUBLIC_LIXI_API=.*|NEXT_PUBLIC_LIXI_API=http://localhost:4800/|' apps/telegram-ecash-escrow/.env
    sed -i 's|NEXT_PUBLIC_LIXI_URL=.*|NEXT_PUBLIC_LIXI_URL=http://localhost:4800/|' apps/telegram-ecash-escrow/.env
    echo "NEXT_PUBLIC_APPLICATION_URL=http://localhost:3000" >> apps/telegram-ecash-escrow/.env
  fi
fi

echo "Cloud Agent install complete."
