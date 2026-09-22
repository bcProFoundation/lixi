#!/usr/bin/env bash
#
# Deploy latest code to the dev VM (dev.localecash.com / dev.lixi.social).
#
# What it does:
#   1. Archives lixi and/or local-ecash at the requested refs (default: master).
#   2. Ships the archives to the prod VM over SSH and builds fresh images there.
#   3. Recreates the lixiapi / localecash containers with the EXACT live config
#      (ports, volumes, network, restart policy, entrypoint) and the live env,
#      plus any net-new vars you export locally (e.g. CMC_API_KEY, OER_APP_ID).
#   4. Health-checks the new containers; on failure it automatically rolls back
#      to the previous containers.
#
# Secrets / vault:
#   No vault access is needed. Runtime secrets never leave prod: they are read
#   from the running containers on the VM itself (docker inspect) and replayed
#   into the new containers. Nothing secret is baked into the images.
#   Only genuinely NEW vars (CMC/OER fiat-rate keys) must be supplied by the
#   operator via environment variables on the machine running this script.
#
# Usage:
#   export DEV_SSH_USER=root DEV_SSH_HOST=<dev-ip> DEV_SSH_PASS=<ssh-pass>
#   export DEV_SSH_PORT=9913                         # dev SSH port (required on dev VM)
#   export CMC_API_KEY=<key>                         # optional; OER stays on live dev env
#   ./scripts/deploy-dev.sh [api|web|all] [--yes] [--dry-run]
#
#   LIXI_REF / ECASH_REF   git refs to deploy (default: origin/master after fetch)
#   LIXI_DIR / ECASH_DIR   local checkouts (default: siblings of the lixi repo)
#   IMAGE_TAG              image tag suffix (default: prod-<timestamp>-<sha>)
#
# Examples:
#   ./scripts/deploy-dev.sh api             # deploy lixi API only (with confirm)
#   ./scripts/deploy-dev.sh all --yes       # deploy API + web without prompting
#   LIXI_REF=cursor/my-fix-3c11 ./scripts/deploy-dev.sh api --dry-run
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIXI_DIR_DEFAULT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LIXI_DIR="${LIXI_DIR:-$LIXI_DIR_DEFAULT}"
ECASH_DIR="${ECASH_DIR:-$(cd "${LIXI_DIR}/../local-ecash" 2>/dev/null && pwd)}"

SERVICES="all"
ASSUME_YES="false"
DRY_RUN="false"
for arg in "$@"; do
  case "$arg" in
    api|web|all) SERVICES="$arg" ;;
    --yes|-y) ASSUME_YES="true" ;;
    --dry-run) DRY_RUN="true" ;;
    -h|--help)
      sed -n '2,/^set -euo/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown argument: $arg (expected api|web|all, --yes, --dry-run)" >&2; exit 1 ;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required tool: $1" >&2; exit 1; }; }
need git; need ssh; need scp; need tar

: "${DEV_SSH_USER:?Set DEV_SSH_USER}"
: "${DEV_SSH_HOST:?Set DEV_SSH_HOST}"
: "${DEV_SSH_PORT:?Set DEV_SSH_PORT}"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -p ${DEV_SSH_PORT}"
SCP_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -P ${DEV_SSH_PORT}"
if [ -n "${DEV_SSH_KEY:-}" ]; then
  SSH="ssh $SSH_OPTS -i $DEV_SSH_KEY"
  SCP="scp $SCP_OPTS -i $DEV_SSH_KEY"
elif [ -n "${DEV_SSH_PASS:-}" ]; then
  need sshpass
  SSH="sshpass -p $DEV_SSH_PASS ssh $SSH_OPTS"
  SCP="sshpass -p $DEV_SSH_PASS scp $SCP_OPTS"
else
  echo "Set DEV_SSH_PASS or DEV_SSH_KEY" >&2; exit 1
fi
SSH_TARGET="${DEV_SSH_USER}@${DEV_SSH_HOST}"

want_api="false"; want_web="false"
[ "$SERVICES" = "api" ] || [ "$SERVICES" = "all" ] && want_api="true"
[ "$SERVICES" = "web" ] || [ "$SERVICES" = "all" ] && want_web="true"

[ -d "$LIXI_DIR/.git" ] || { echo "lixi checkout not found at $LIXI_DIR (set LIXI_DIR)" >&2; exit 1; }
if [ "$want_web" = "true" ]; then
  [ -d "$ECASH_DIR/.git" ] || { echo "local-ecash checkout not found at $ECASH_DIR (set ECASH_DIR)" >&2; exit 1; }
fi

resolve_ref() { # <dir> <ref> -> sha
  local dir="$1" ref="$2"
  git -C "$dir" fetch origin -q 2>/dev/null || echo "WARN: fetch failed for $dir, using local refs" >&2
  if git -C "$dir" rev-parse --verify -q "origin/${ref}" >/dev/null && [ "$ref" = "master" ]; then
    ref="origin/master"
  fi
  git -C "$dir" rev-parse --verify "$ref" 2>/dev/null || { echo "Ref not found: $ref in $dir" >&2; exit 1; }
}

LIXI_REF="${LIXI_REF:-cursor/external-payment-goods-services-3c11}"
ECASH_REF="${ECASH_REF:-cursor/external-payment-goods-services-3c11}"
LIXI_SHA=""; ECASH_SHA=""; LIXI_VER=""; ECASH_VER=""
if [ "$want_api" = "true" ]; then
  LIXI_SHA="$(resolve_ref "$LIXI_DIR" "$LIXI_REF")"
  LIXI_VER="$(git -C "$LIXI_DIR" show "${LIXI_SHA}:packages/app-lixi-api/package.json" | grep -o '"version": *"[^"]*"' | head -1 | cut -d'"' -f4)"
fi
if [ "$want_web" = "true" ]; then
  ECASH_SHA="$(resolve_ref "$ECASH_DIR" "$ECASH_REF")"
  ECASH_VER="$(git -C "$ECASH_DIR" show "${ECASH_SHA}:apps/telegram-ecash-escrow/package.json" | grep -o '"version": *"[^"]*"' | head -1 | cut -d'"' -f4)"
fi

TAG_SUFFIX="${IMAGE_TAG:-dev-$(date +%Y%m%d-%H%M%S)}"
API_IMAGE="lixiapi:${TAG_SUFFIX}-${LIXI_SHA:0:8}"
WEB_IMAGE="localecash:${TAG_SUFFIX}-${ECASH_SHA:0:8}"

# Net-new runtime vars to merge into the API container env (optional; only
# needed on the first deploy that introduces them). Add more as KEY=val lines.
WORK_DIR=""
API_EXTRAS_FILE="$(mktemp)"
trap 'rm -rf "${WORK_DIR:-}" "${API_EXTRAS_FILE:-}"' EXIT
for key in CMC_API_KEY FIAT_RATE_PROVIDER FIAT_RATE_LEGACY_FALLBACK_ENABLED \
           CMC_CONVERT_LIMIT CMC_COINS FIAT_RATE_HOT_FIATS FIAT_RATE_MERGED_TTL; do
  if [ -n "${!key:-}" ]; then
    printf '%s=%s\n' "$key" "${!key}" >> "$API_EXTRAS_FILE"
  fi
done
if [ ! -s "$API_EXTRAS_FILE" ]; then
  echo "# no extras" > "$API_EXTRAS_FILE"
fi

echo "=== Dev deploy plan ==="
echo "Target:            $SSH_TARGET (port ${DEV_SSH_PORT})"
[ "$want_api" = "true" ] && echo "API:               lixi @ ${LIXI_REF} (${LIXI_SHA:0:12}) v${LIXI_VER} -> ${API_IMAGE}"
[ "$want_web" = "true" ] && echo "Web:               local-ecash @ ${ECASH_REF} (${ECASH_SHA:0:12}) v${ECASH_VER} -> ${WEB_IMAGE}"
if grep -q -v '^#' "$API_EXTRAS_FILE"; then
  echo "API extra env:     $(grep -v '^#' "$API_EXTRAS_FILE" | cut -d= -f1 | tr '\n' ' ')"
else
  echo "API extra env:     (none - live env reused as-is)"
fi
echo "Secrets:           reused from live dev containers (OER not split; CMC optional extra)"
echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run: exiting before any remote change."
  exit 0
fi

if [ "$ASSUME_YES" != "true" ]; then
  read -r -p "Deploy to DEV ($SERVICES)? [y/N] " answer
  [ "$answer" = "y" ] || [ "$answer" = "Y" ] || { echo "Aborted."; exit 1; }
fi

echo "--- Preflight: dev VM ---"
$SSH "$SSH_TARGET" 'docker --version && df -h / | tail -1 && docker ps --format "{{.Names}} {{.Status}}" | grep -E "lixiapi|localecash"'

WORK_DIR="$(mktemp -d)"
REMOTE_BASE="/root/deploy/${TAG_SUFFIX}"

# NOTE: we deliberately do NOT use `git archive` here: it ships git-lfs
# pointer files instead of real content, which would break the image build
# (e.g. packages/lixi-prisma/prisma/data/worldcities.tar.gz is 57MB via LFS
# and is needed by db:seeds at container start). A detached worktree shares
# the source clone's object store, so LFS blobs need no re-download when the
# operator has fetched before (CI checks out with lfs:true).
make_tarball() { # <repo-dir> <sha> <out.tgz>
  local dir="$1" sha="$2" out="$3" tmp
  tmp="$(mktemp -d)"
  git -C "$dir" worktree add --detach -f "${tmp}/repo" "$sha" >/dev/null
  if git -C "${tmp}/repo" lfs ls-files -n 2>/dev/null | grep -q .; then
    need git-lfs
    echo "fetching git-lfs blobs for $(basename "$dir")..."
    git -C "$dir" lfs fetch --all 2>&1 | tail -1
    git -C "${tmp}/repo" lfs pull 2>&1 | tail -1
    local f
    while IFS= read -r f; do
      if head -c 100 "${tmp}/repo/${f}" 2>/dev/null | grep -q "version https://git-lfs"; then
        echo "ERROR: LFS file not materialized: $f (run 'git lfs pull' in $dir)" >&2
        git -C "$dir" worktree remove --force "${tmp}/repo" >/dev/null
        rm -rf "$tmp"
        exit 1
      fi
    done < <(git -C "${tmp}/repo" lfs ls-files -n)
  fi
  tar -czf "$out" --exclude=.git -C "${tmp}/repo" .
  git -C "$dir" worktree remove --force "${tmp}/repo" >/dev/null
  rm -rf "$tmp"
  echo "packed $out ($(du -h "$out" | cut -f1))"
}

echo "--- Preparing archives ---"
if [ "$want_api" = "true" ]; then
  make_tarball "$LIXI_DIR" "$LIXI_SHA" "${WORK_DIR}/lixi.tgz"
fi
if [ "$want_web" = "true" ]; then
  make_tarball "$ECASH_DIR" "$ECASH_SHA" "${WORK_DIR}/ecash.tgz"
fi

echo "--- Shipping to dev ($REMOTE_BASE) ---"
$SSH "$SSH_TARGET" "mkdir -p ${REMOTE_BASE}"
[ "$want_api" = "true" ] && $SCP "${WORK_DIR}/lixi.tgz" "$SSH_TARGET:${REMOTE_BASE}/"
[ "$want_web" = "true" ] && $SCP "${WORK_DIR}/ecash.tgz" "$SSH_TARGET:${REMOTE_BASE}/"
$SCP "$API_EXTRAS_FILE" "$SSH_TARGET:${REMOTE_BASE}/api-extras.env"
$SSH "$SSH_TARGET" "chmod 600 ${REMOTE_BASE}/api-extras.env"

# ---- Remote runner (everything below runs ON the dev VM) ----
$SSH "$SSH_TARGET" "REMOTE_BASE='${REMOTE_BASE}' API_IMAGE='${API_IMAGE}' WEB_IMAGE='${WEB_IMAGE}' \
  LIXI_SHA='${LIXI_SHA}' ECASH_SHA='${ECASH_SHA}' LIXI_VER='${LIXI_VER}' ECASH_VER='${ECASH_VER}' \
  WANT_API='${want_api}' WANT_WEB='${want_web}' bash -s" <<'REMOTE_EOF'
set -euo pipefail

capture_env() { # <container> <outfile> - snapshot live env minus baked build keys
  local name="$1" out="$2"
  docker inspect "$name" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep -v -E '^(APP_VERSION|COMMIT_HASH|GIT_COMMIT|NEXT_PUBLIC_APP_VERSION|NEXT_PUBLIC_COMMIT_HASH)=' \
    | grep -v '^$' > "$out"
  chmod 600 "$out"
  echo "captured $(wc -l < "$out") env vars from $name"
}

merge_extras() { # <envfile> <extras> - upsert KEY=val lines
  local envfile="$1" extras="$2"
  [ -f "$extras" ] || return 0
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"
    grep -v "^${key}=" "$envfile" > "${envfile}.tmp" && mv "${envfile}.tmp" "$envfile"
    echo "$line" >> "$envfile"
    echo "merged extra: $key"
  done < "$extras"
}

run_flags() { # <container> - print docker-run flags replicating live config (no env, no image)
  local name="$1"
  local flags="" ports nets
  ports="$(docker inspect "$name" --format '{{range $p, $cfg := .NetworkSettings.Ports}}{{range $cfg}} --publish {{.HostIp}}:{{.HostPort}}:{{$p}}{{end}}{{end}}' \
    | sed 's|/tcp||g; s|/udp||g' | grep -oE -- '--publish [0-9.]+:[0-9]+:[0-9]+' | tr '\n' ' ')"
  flags="$flags $ports"
  flags="$flags $(docker inspect "$name" --format '{{range .HostConfig.Binds}} --volume {{.}}{{end}}')"
  nets="$(docker inspect "$name" --format '{{range $k, $v := .NetworkSettings.Networks}} --network {{$k}}{{end}}' | awk '{print $1, $2}')"
  flags="$flags $nets"
  local restart
  restart="$(docker inspect "$name" --format '{{.HostConfig.RestartPolicy.Name}}')"
  [ -n "$restart" ] && [ "$restart" != "no" ] && flags="$flags --restart $restart"
  local user workdir
  user="$(docker inspect "$name" --format '{{.Config.User}}')"
  [ -n "$user" ] && flags="$flags --user $user"
  workdir="$(docker inspect "$name" --format '{{.Config.WorkingDir}}')"
  [ -n "$workdir" ] && flags="$flags --workdir $workdir"
  echo "$flags"
}

container_cmd() { # <container> - print the live CMD as shell args
  docker inspect "$1" --format '{{range .Config.Cmd}}{{.}} {{end}}'
}

swap_container() { # <name> <image> <envfile>
  local name="$1" image="$2" envfile="$3"
  local flags cmd prev="${name}-prev"
  flags="$(run_flags "$name")"
  cmd="$(container_cmd "$name")"
  docker rm -f "$prev" >/dev/null 2>&1 || true
  echo "recreating $name -> $image"
  # shellcheck disable=SC2086
  docker stop -t 30 "$name" >/dev/null
  docker rename "$name" "$prev"
  # shellcheck disable=SC2086
  docker run -d --name "$name" $flags --env-file "$envfile" "$image" $cmd
}

rollback() { # <name> - restore previous container after failed health check
  local name="$1" prev="${name}-prev"
  echo "ROLLBACK $name"
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker rename "$prev" "$name"
  docker start "$name" >/dev/null
}

health_api() {
  local i body
  for i in $(seq 1 36); do
    body="$(curl -sf -X POST http://localhost:4800/graphql -H 'Content-Type: application/json' \
      -d '{"query":"{ __typename }"}' 2>/dev/null || true)"
    if echo "$body" | grep -q '__typename'; then
      curl -sf -o /dev/null "http://localhost:4800/socket.io/?EIO=4&transport=polling" && return 0
    fi
    sleep 5
  done
  return 1
}

health_web() {
  local port="$1" i
  for i in $(seq 1 24); do
    curl -sf -o /dev/null "http://localhost:${port}/" && return 0
    sleep 5
  done
  return 1
}

FAILED=""
mkdir -p "${REMOTE_BASE}/env"

if [ "$WANT_API" = "true" ]; then
  echo "=== API: capture live env ==="
  capture_env lixiapi "${REMOTE_BASE}/env/lixiapi.env"
  merge_extras "${REMOTE_BASE}/env/lixiapi.env" "${REMOTE_BASE}/api-extras.env"
fi
if [ "$WANT_WEB" = "true" ]; then
  echo "=== Web: capture live env ==="
  capture_env localecash "${REMOTE_BASE}/env/localecash.env"
  # lixiapi env supplies dev.lixi.social / dev.localecash.com URLs for the Next.js build.
  capture_env lixiapi "${REMOTE_BASE}/env/lixiapi.env"
fi

if [ "$WANT_API" = "true" ]; then
  echo "=== API: build ${API_IMAGE} ==="
  rm -rf "${REMOTE_BASE}/lixi" && mkdir -p "${REMOTE_BASE}/lixi"
  tar -xzf "${REMOTE_BASE}/lixi.tgz" -C "${REMOTE_BASE}/lixi"
  docker build -f "${REMOTE_BASE}/lixi/packages/app-lixi-api/Dockerfile.prod" \
    --build-arg "APP_VERSION=${LIXI_VER}" --build-arg "GIT_COMMIT=${LIXI_SHA}" \
    -t "$API_IMAGE" "${REMOTE_BASE}/lixi"
fi

if [ "$WANT_WEB" = "true" ]; then
  echo "=== Web: build ${WEB_IMAGE} ==="
  rm -rf "${REMOTE_BASE}/ecash" && mkdir -p "${REMOTE_BASE}/ecash"
  tar -xzf "${REMOTE_BASE}/ecash.tgz" -C "${REMOTE_BASE}/ecash"
  VAPID="$(grep -E '^PUBLIC_VAPID_KEY=' "${REMOTE_BASE}/env/lixiapi.env" 2>/dev/null | cut -d= -f2- || true)"
  if [ -z "$VAPID" ]; then
    VAPID="$(docker inspect lixiapi --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^PUBLIC_VAPID_KEY=' | cut -d= -f2- || true)"
  fi
  # Build-time .env: PUBLIC values baked into the JS bundle. Runtime secrets stay
  # in localecash.env. Derive API/site URLs from lixiapi (localecash runtime env
  # often omits NEXT_PUBLIC_* so grep alone yields NEXT_PUBLIC_LIXI_API="/").
  LIXI_API_URL="$(grep '^LIXI_SOCIAL_URL=' "${REMOTE_BASE}/env/lixiapi.env" | cut -d= -f2- | sed 's|/*$|/|')"
  LOCAL_ECASH_URL="$(grep '^LOCAL_ECASH_URL=' "${REMOTE_BASE}/env/lixiapi.env" | cut -d= -f2- | sed 's|/*$||')"
  BOT_USERNAME="$(grep '^TELEGRAM_LOCAL_ECASH_BOT_NAME=' "${REMOTE_BASE}/env/lixiapi.env" | cut -d= -f2-)"
  LIXI_API_URL="${LIXI_API_URL:-https://dev.lixi.social/}"
  LOCAL_ECASH_URL="${LOCAL_ECASH_URL:-https://dev.localecash.com}"
  cat > "${REMOTE_BASE}/ecash/apps/telegram-ecash-escrow/.env" <<EOF
EXTEND_ESLINT=true
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_XPI_APIS=https://api.sendlotus.com/v4/
NEXT_PUBLIC_XPI_APIS_TEST=https://api.sendlotus.com/v4/
NEXT_PUBLIC_LIXI_API=${LIXI_API_URL}
NEXT_PUBLIC_LIXI_URL=${LIXI_API_URL}
NEXT_PUBLIC_CHRONIK_URL=https://xec.paybutton.io,https://chronik.pay2stay.com/xec,https://chronik.danaverse.org/xec,https://chronik.e.cash,https://chronik.lixi.app/xec
NEXT_PUBLIC_LIXI_CHRONIK_URL=https://chronik.lixi.app/xec
NEXT_PUBLIC_APPLICATION_URL=${LOCAL_ECASH_URL}
NEXT_PUBLIC_BOT_USERNAME=${BOT_USERNAME}
NEXT_PUBLIC_ADDRESS_GNC=ecash:pzcpcz67va9ujyk0pt9e5kj975mmdmd25s3gl5avcx
NEXT_PUBLIC_WEB_LINK=${LOCAL_ECASH_URL}
NEXT_PUBLIC_PUBLIC_VAPID_KEY=${VAPID}
EOF
  docker build \
    --build-arg "APP_VERSION=${ECASH_VER}" --build-arg "GIT_COMMIT=${ECASH_SHA}" \
    -t "$WEB_IMAGE" "${REMOTE_BASE}/ecash"
fi

if [ "$WANT_API" = "true" ]; then
  echo "=== API: swap container ==="
  swap_container lixiapi "$API_IMAGE" "${REMOTE_BASE}/env/lixiapi.env"
  if health_api; then
    echo "API healthy"
    curl -sf -o /dev/null "https://dev.lixi.social/socket.io/?EIO=4&transport=polling" \
      && echo "external dev socket.io OK" || echo "WARN: external dev socket.io check failed"
  else
    echo "API health check FAILED"
    docker logs lixiapi --tail 30 2>&1 | tail -30 || true
    rollback lixiapi
    FAILED="${FAILED} api"
  fi
fi

if [ "$WANT_WEB" = "true" ]; then
  echo "=== Web: swap container ==="
  WEB_PORT="$(docker inspect localecash --format '{{range $p, $cfg := .NetworkSettings.Ports}}{{range $cfg}}{{.HostPort}} {{end}}{{end}}' | grep -oE '[0-9]+' | head -1)"
  WEB_PORT="${WEB_PORT:-5004}"
  swap_container localecash "$WEB_IMAGE" "${REMOTE_BASE}/env/localecash.env"
  if health_web "$WEB_PORT"; then
    echo "Web healthy"
    curl -sf -o /dev/null https://dev.localecash.com/ \
      && echo "external dev.localecash.com OK" || echo "WARN: external dev.localecash.com check failed"
  else
    echo "Web health check FAILED"
    docker logs localecash --tail 30 2>&1 | tail -30 || true
    rollback localecash
    FAILED="${FAILED} web"
  fi
fi

echo ""
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E "NAME|lixiapi|localecash" || true
if [ -n "$FAILED" ]; then
  echo "DEPLOY FAILED for:$FAILED (rolled back to previous containers)"
  exit 1
fi
echo "DEPLOY OK. Previous containers kept as *-prev (stopped) for manual rollback."
REMOTE_EOF

echo ""
echo "=== Deploy finished ==="
[ "$want_api" = "true" ] && echo "API image: $API_IMAGE"
[ "$want_web" = "true" ] && echo "Web image: $WEB_IMAGE"
echo "Manual rollback (on dev): docker stop <name> && docker rm <name> && docker rename <name>-prev <name> && docker start <name>"
