# notes/ — messages between David and Ethan

Rule (ADR-040): **every message you send the other builder about a change, a request, a question or
context comes with a note in this folder.** The note is the record; the chat message just points to it.

## Send a note

1. Copy `TEMPLATE.md` to `notes/<YYYYMMDD-HHMM>-<from>-to-<to>-<slug>.md`, e.g.
   `notes/20261004-0120-ethan-to-david-dossier-endpoint-live.md`. Use Manila time (UTC+8).
2. Fill every section. Write "none" rather than deleting one.
3. Commit the note **on its own** (touch nothing but `notes/`) and push your branch:
   ```sh
   git add notes/<file>
   git commit -m "note(ethan->david): dossier endpoint is live"
   git push
   ```
4. Ask the orchestrator to deliver it. It cherry-picks the note commit onto the other person's branch.
5. Send the chat message with the file name.

## Read your notes

- After the orchestrator delivers a note, `git pull` on your branch and open it in `notes/`.
- To read a note before it is delivered: `git fetch && git show origin/person/<sender>:notes/<file>`.
- List the newest notes addressed to you: `ls notes | grep -- "-to-<you>-" | sort | tail`

## Rules

- Never edit a sent note. Reply with a new note and set `reply_to`.
- A note announces a fact; it does not own it. Contract changes go into `docs/api.md`,
  `docs/data-model.md` or `docs/methods.md` and land on `master` first (ADR-039). The note links to them.
- No secrets in notes. Point at the env var name, never its value.
