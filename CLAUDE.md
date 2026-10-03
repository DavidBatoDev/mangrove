always see @AGENTS.md

# Claude Code notes for this repo

`AGENTS.md` is the project guide; follow it first. This file only adds what is specific to running
Claude Code on the team's Windows machines. Facts have one home (`docs/index.md` §0); point to them, do not copy them here.

## Where things live

- Build contract: start at `docs/index.md`. Kiro specs in `.kiro/specs/` are the task tracker.
- Infrastructure ids (AWS account, EC2, Elastic IP, domain, S3 bucket, IAM role, Neon): `docs/ledger.md` §1.
- Database is Neon (ADR-036); photos are in S3 through the EC2 instance role (ADR-037).
- Pre-event prep lives **outside** this repo in `~/bon-prep/` (`C:\Users\huawei\bon-prep`): smoke tests,
  research notes, the EC2 rebuild runbook (`infra/PROVISIONING.md`), sketched demo sites (`sites/`). Read it for
  reference; never copy smoke-test code into this repo.
- Secrets: `~/bon-prep/secrets/.env.local` and the git-ignored `.env` here. Never print, log or commit a value.

## Orchestrator role (ADR-039, ADR-040)

In this repo Claude Code is the integration orchestrator, working in the main checkout on `master`.

- **Before each phase:** ask the user who owns the frontend and who owns the backend this phase. The split
  can swap between David and Ethan. Do not assume the previous phase's split.
- **Integrate:** fetch, merge the backend branch then the frontend branch into `master` (`--no-ff`), run
  the checks listed in ADR-039, push `master` only if they pass, deploy, then merge `master` back into
  `person/david` and `person/ethan`. State the phase's owner split in the merge commit message.
- **Deliver notes:** when a builder pushes a `note(...)` commit, cherry-pick it onto the recipient's branch
  and push. Check at each phase end that every `request`/`question` note has an `answer`.
- **Scope:** merges, conflict resolution, glue, verification, deploy. Do not author features; feature code is
  written by David and Ethan in Kiro. Send larger fixes back to the layer owner, with a note.

## Windows environment

- Python is `py -3.12`. `python3` is the Microsoft Store stub, so `hooks/pre-commit` reports a false
  "BLOCKED". Run the checkers directly instead:
  `py -3.12 tools/check-doc-status.py docs` and
  `py -3.12 tools/check-context-overlay.py --index docs/index.md --ledger docs/ledger.md`.
- Git Bash rewrites arguments that start with `/` (e.g. `/aws/service/...`): prefix with `MSYS_NO_PATHCONV=1`.
  Windows `aws.exe` reads `file://C:/...`, not `file:///c/...`.
- Python `open(..., "w")` writes CRLF on Windows. Write with `newline="\n"`; `.gitattributes` forces LF.
- EC2 access: `ssh -i ~/bon-prep/secrets/bon-mangrove-key.pem ubuntu@<Elastic IP>`. If SSH is blocked,
  use `aws ssm start-session`. To allow a new IP, run `~/bon-prep/infra/allow-my-ip.sh`.

## Commits

- Never add a Claude co-author line or a "Generated with" trailer (ADR-035).
- Commit or push only when a teammate asks. The trailer rule for Kiro is in `AGENTS.md`. Don't put
  `Co-authored-by: Kiro` on work Kiro did not do without the teammate's explicit say-so; judges read the history.
