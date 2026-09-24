#!/usr/bin/env bash
# Sync shared OER settings from production lixiapi into dev lixiapi and refresh fiat cache.
set -euo pipefail

: "${PROD_SSH_USER:?Set PROD_SSH_USER}"
: "${PROD_SSH_HOST:?Set PROD_SSH_HOST}"
: "${DEV_SSH_USER:?Set DEV_SSH_USER}"
: "${DEV_SSH_HOST:?Set DEV_SSH_HOST}"
: "${DEV_SSH_PORT:?Set DEV_SSH_PORT}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }; }
need ssh
need sshpass

prod_ssh() {
  local opts="-o StrictHostKeyChecking=no -o ConnectTimeout=15"
  if [ -n "${PROD_SSH_KEY:-}" ]; then
    ssh $opts -i "$PROD_SSH_KEY" "${PROD_SSH_USER}@${PROD_SSH_HOST}" "$@"
  else
    SSHPASS="${PROD_SSH_PASS:?Set PROD_SSH_PASS}" sshpass -e ssh $opts "${PROD_SSH_USER}@${PROD_SSH_HOST}" "$@"
  fi
}

dev_ssh() {
  local opts="-o StrictHostKeyChecking=no -o ConnectTimeout=15 -p ${DEV_SSH_PORT}"
  if [ -n "${DEV_SSH_KEY:-}" ]; then
    ssh $opts -i "$DEV_SSH_KEY" "${DEV_SSH_USER}@${DEV_SSH_HOST}" "$@"
  else
    SSHPASS="${DEV_SSH_PASS:?Set DEV_SSH_PASS}" sshpass -e ssh $opts "${DEV_SSH_USER}@${DEV_SSH_HOST}" "$@"
  fi
}

OER_LINES="$(prod_ssh 'docker inspect lixiapi --format "{{range .Config.Env}}{{println .}}{{end}}"' | grep -E '^OER_' || true)"
if [ -z "$OER_LINES" ]; then
  echo "Could not read OER_* from production lixiapi" >&2
  exit 1
fi

echo "OER keys from prod: $(echo "$OER_LINES" | cut -d= -f1 | tr '\n' ' ')"

TMP="$(mktemp)"
printf '%s\n' "$OER_LINES" > "$TMP"
dev_ssh "cat > /tmp/oer-from-prod.env" < "$TMP"
rm -f "$TMP"

dev_ssh 'bash -s' <<'REMOTE'
set -euo pipefail
ENV_FILE="/tmp/lixiapi-oer-fix.env"
docker inspect lixiapi --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -v -E '^(APP_VERSION|COMMIT_HASH|GIT_COMMIT)=' \
  | grep -v '^$' > "$ENV_FILE"
while IFS= read -r line; do
  [ -n "$line" ] || continue
  key="${line%%=*}"
  grep -v "^${key}=" "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
done < /tmp/oer-from-prod.env
cat /tmp/oer-from-prod.env >> "$ENV_FILE"
chmod 600 "$ENV_FILE"

IMAGE="$(docker inspect lixiapi --format '{{.Config.Image}}')"
CMD="$(docker inspect lixiapi --format '{{range .Config.Cmd}}{{.}} {{end}}')"
PORTS="$(docker inspect lixiapi --format '{{range $p, $cfg := .NetworkSettings.Ports}}{{range $cfg}} --publish {{.HostIp}}:{{.HostPort}}:{{$p}}{{end}}{{end}}' | sed 's|/tcp||g')"
VOLS="$(docker inspect lixiapi --format '{{range .HostConfig.Binds}} --volume {{.}}{{end}}')"
NET="$(docker inspect lixiapi --format '{{range $k, $v := .NetworkSettings.Networks}} --network {{$k}}{{end}}' | awk '{print $1, $2}')"
RESTART="$(docker inspect lixiapi --format '{{.HostConfig.RestartPolicy.Name}}')"
RESTART_FLAG=""
[ -n "$RESTART" ] && [ "$RESTART" != "no" ] && RESTART_FLAG="--restart $RESTART"

docker rm -f lixiapi-prev-oer >/dev/null 2>&1 || true
docker stop -t 30 lixiapi >/dev/null
docker rename lixiapi lixiapi-prev-oer

# shellcheck disable=SC2086
docker run -d --name lixiapi $PORTS $VOLS $NET $RESTART_FLAG --env-file "$ENV_FILE" "$IMAGE" $CMD >/dev/null

docker exec redis-lixi redis-cli DEL fiat:merged:v1 fiat:oer:latest >/dev/null 2>&1 || true
docker restart lixiapi >/dev/null

for _ in $(seq 1 36); do
  if curl -sf -X POST http://127.0.0.1:4800/graphql \
    -H 'Content-Type: application/json' \
    -d '{"query":"{ __typename }"}' >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

curl -sf -X POST http://127.0.0.1:4800/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ getAllFiatRate { currency } }"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']['getAllFiatRate']; print('getAllFiatRate count:', len(d)); print('VND:', any(x['currency']=='VND' for x in d)); print('EUR:', any(x['currency']=='EUR' for x in d)); import sys; sys.exit(0 if len(d) > 50 else 1)"
REMOTE

echo "Dev lixiapi updated with production OER settings."
