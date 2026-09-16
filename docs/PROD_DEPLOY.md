# Production deploy without the build machine

`scripts/deploy-prod.sh` deploys `lixiapi` and/or `localecash` to the prod VM
while the vault-connected build machine is down.

## Key idea

- Images are built **on the prod VM** from `git archive` tarballs shipped over SSH.
- **No vault access needed.** Runtime secrets never leave prod: the script reads
  them from the running containers (`docker inspect`) on the VM itself and
  replays them into the new containers via `--env-file`.
- Nothing secret is baked into images. Only build-args are `APP_VERSION` /
  `GIT_COMMIT`, plus public `NEXT_PUBLIC_*` values for the web build.

## Usage

```bash
export PROD_SSH_USER=root PROD_SSH_HOST=<prod-ip> PROD_SSH_PASS=<ssh-pass>
# First deploy that introduces fiat-rate keys (merged into API env at runtime):
export CMC_API_KEY=<key> OER_APP_ID=<id>

./scripts/deploy-prod.sh api            # API only
./scripts/deploy-prod.sh web            # web only
./scripts/deploy-prod.sh all --yes      # both, no prompt
```

Knobs: `LIXI_REF` / `ECASH_REF` (default `master`), `LIXI_DIR` / `ECASH_DIR`
(default: sibling checkouts), `--dry-run` to print the plan only.

## GitHub Actions (future prod builds)

The same script runs in CI via `.github/workflows/deploy-prod.yml`
("Deploy to production", manual dispatch with `services` / `lixi_ref` /
`ecash_ref` / `dry_run` inputs). One-time setup:

1. Create a `production` environment (repo Settings -> Environments).
   Optionally add yourself as a required reviewer for one-click approvals.
2. Add secrets to it: `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_PASS`
   (or `PROD_SSH_KEY`), plus `CMC_API_KEY` / `OER_APP_ID` for the first
   fiat-rate deploy.
3. Run the workflow from the Actions tab (try `dry_run: true` first).

No image registry or vault is involved: the runner ships source archives to
prod and the VM builds the images, exactly like a local run.

## What happens per service

1. Preflight: SSH + Docker reachable, target containers running.
2. Build image on prod (`lixiapi:prod-<ts>-<sha>` / `localecash:prod-<ts>-<sha>`).
   - API uses `packages/app-lixi-api/Dockerfile.prod` (pinned Node 20, pnpm 9,
     `--frozen-lockfile`; no `prune --prod` because container start needs
     `prisma`/`ts-node` for migrate + seeds — same as the current prod image).
   - Web uses `local-ecash/Dockerfile` with a generated build-time `.env`
     containing public values only (API URLs, bot username, VAPID key copied
     from the live API env).
3. Snapshot live env (minus baked `APP_VERSION`/`COMMIT_HASH`), merge extras.
4. `stop -> rename to *-prev -> run new` with identical ports, volumes,
   network, restart policy, user, workdir and CMD.
5. Health-check (`/graphql` + `/socket.io` for API, `/` for web, plus external
   HTTPS checks). On failure: automatic rollback to `*-prev`.

Previous containers are kept stopped as `lixiapi-prev` / `localecash-prev`.

## Manual rollback (on prod)

```bash
docker stop lixiapi && docker rm lixiapi \
  && docker rename lixiapi-prev lixiapi && docker start lixiapi
```

## Notes

- `localecash.com` currently serves the Feb image; the banner-legibility fix
  needs PR bcProFoundation/local-ecash#409 merged (or `ECASH_REF` pointed at
  its branch) before a web deploy picks it up.
- First API deploy must export `CMC_API_KEY` / `OER_APP_ID`; later deploys
  reuse them from the live env automatically.
- The emergency dist hotfix on prod is replaced by a proper image build as
  soon as this deploys current `master` (which contains the Chronik fix).
