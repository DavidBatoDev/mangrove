# ADR-047 — Every push to `master` redeploys the demo host through GitHub Actions and SSM

- **Date:** 2026-10-04
- **Status:** Accepted
- **Owners:** the team
- **Related:** DEC-017, ADR-039, ADR-036, ADR-037

### Context

Until now the orchestrator deployed by hand: SSH to the EC2 host, pull `master`, `docker compose up -d
--build`, smoke-test. That took ten minutes per integration, needed the deployer's IP in the security group,
and depended on one session being awake. The team asked for `master` to redeploy itself on every push.

### Why now

Three integrations remain before the 08:30 code freeze, and the venue IP changes every time someone moves.

### Options considered

1. **SSH from GitHub Actions** — pros: familiar / cons: port 22 open to GitHub's runner IP ranges, and the host's private key stored as a GitHub secret on a public repo.
2. **A self-hosted runner on the host** — pros: no remote call / cons: a public repo with a self-hosted runner lets workflow changes run code on the host; another daemon on a 4 GB machine.
3. **GitHub Actions → AWS OIDC → SSM Run Command on the host** — pros: no inbound port, no stored credentials (a short-lived role from GitHub's OIDC token), the instance already runs the SSM agent / cons: one IAM role to keep narrow; output comes back through SSM.

### Decision

`.github/workflows/deploy.yml` runs on every push to `master` (and on manual dispatch), one run at a time.

- It assumes `bon-mangrove-gha-deploy` through GitHub's OIDC provider. The role trusts only the subject `repo:DavidBatoDev/mangrove:ref:refs/heads/master` and may only `ssm:SendCommand` the `AWS-RunShellScript` document on the demo instance (plus reading command results).
- On the host, as `ubuntu`, the command resets `/opt/bon/mangrove` to the pushed commit and runs `infra/deploy.sh`: tag the running images `:previous`, build, `up -d`, health-check through Caddy (`/api/v1/health` and `/`), and on failure put the previous images back and fail the run. A failed build leaves the running containers untouched.
- The workflow then smoke-tests the public URL: health, the web root, `/api/v1/sites`, and MCP `tools/list`.
- Non-secret settings are repository variables: `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `EC2_INSTANCE_ID`, `DEPLOY_DOMAIN`. The host's `.env` stays on the host and is never in GitHub.

ADR-039's integration step 4 ("pushes `master` … and deploys it") now means: push `master`; the workflow deploys.

### Why this option

It removes the manual step without opening a port or storing a key, and a bad build cannot take the demo
down: the old images stay in place until the new ones pass the health check.

### Overrides

- **Prior ADRs:** ADR-039, integration step 4 (the manual deploy). The rest of ADR-039 stands.
- **Doc or plan truth:** `docs/system-design.md` §6 and `docs/security.md` §4/§5 are updated in the same change.
- **Out of scope:** No tests run in the workflow yet; the build on the host and the smoke test are the gate. Adding `pytest` and the web checks needs the Neon test credentials as GitHub secrets.

### Consequences

- **Easier:** every merge is live about ten minutes later with no one at a terminal; rollbacks are automatic on a failed health check.
- **Harder or owed:** anyone who can push to `master` (including a force-push) can run code on the demo host. Keep `master` to the orchestrator's merges, and consider GitHub branch protection (no force-push, no direct pushes) for `master`.
- **Follow-up:** a CI job for `pytest` and `npm run lint && npx tsc --noEmit` if time allows.
