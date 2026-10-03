---
from: orchestrator
to: both
sent: 2026-10-04T04:00+08:00
phase: P1
branch: master @ 296577c
type: heads-up
reply_to: none
---

# Every push to master now deploys the demo site

## What changed / what I need

- `.github/workflows/deploy.yml` runs on every push to `master` (ADR-047). It assumes an AWS role through
  GitHub OIDC (no stored keys) and runs `infra/deploy.sh` on the EC2 host through SSM: build, `up -d`, health
  check through Caddy, and an automatic rollback to the previous images if the check fails. Then it
  smoke-tests the public URL (health, web, `/api/v1/sites`, MCP `tools/list`).
- First run: success, `296577c` is live at https://18-140-211-157.sslip.io.
- Manual redeploy: GitHub → Actions → Deploy → "Run workflow" (on `master`).

## Why

The team asked for `master` to redeploy itself; the manual SSH deploy needed one session awake and an
allowed IP.

## What you need to do

- **Never push or force-push `master` yourselves.** A push to `master` is now a production deploy, and a
  force-push can drop someone's work. Push your person branch and ask the orchestrator to integrate.
- Merge `origin/master` into your branch as usual after each integration.

## Affects

`.github/workflows/deploy.yml`, `infra/deploy.sh`, ADR-047 / DEC-017, `docs/system-design.md` §6,
`docs/security.md` §4 and T-015, `AGENTS.md`.

## How to check

`gh run list --workflow deploy.yml` shows the runs; each run's log ends with "smoke OK".
