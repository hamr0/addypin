# Dev workflow

How to work on addypin day-to-day. Extracted from `CLAUDE.md` +
`03-logs/m10-deploy-log.md` so this stays the single source for
"what do I run to …".

## Local dev

```bash
./dev.sh            # starts node --watch, reads secrets from pass
./dev.sh --no-watch # same, no auto-restart
npm test            # 182+ tests, :memory: SQLite, no env needed
npm start           # production-style run; expects env vars set externally
```

`./dev.sh` prompts your GPG agent once per shell session to unlock
the pass-store. On first run it generates any missing keys under
`addypin/server/*` and stashes them back.

## Branch model

- `main` — v2 rewrite, active trunk, what's deployed
- `v1` — frozen pre-rewrite codebase, reference only (do not merge)

No long-lived feature branches. Work on a short-lived topic branch
if you need one, merge-squash into `main`, delete.

## Before committing

1. Run `npm test` — must stay green. Add a test for any new
   behavior, update tests for changed behavior.
2. If you touched `server/maplinks.js`: check the URL still opens
   the right thing in an actual browser. Don't trust research
   papers; map vendors change URL schemes silently.
3. If you touched the mail pipeline or DNS: run a mail-tester
   probe (fresh address from https://www.mail-tester.com/). 10/10
   is the bar. Anything lower means regression.

## Commit style

Follow conventional prefixes that match the existing log:
`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `ui:`,
`feat(ops):`, etc. Subject under 70 chars. Body explains *why* —
the *what* is in the diff.

## Deploy

```bash
ssh -i /dev/shm/addypin-ssh/id root@$(pass show addypin/ssh/host | head -1) \
  'cd /opt/addypin && sudo -u addypin git pull && systemctl restart addypin'
```

That's it. The VPS pulls directly from `github.com/hamr0/addypin`
via a read-only SSH deploy key (DR copy in
`pass addypin/vps/github_deploy_key`). Manual on purpose.

**If the deploy fails:** check `journalctl -u addypin -n 50` on
the VPS first. If it's a migration issue (e.g. schema change),
see `server/db.js applyMigrations` for the pattern — we use
`ALTER TABLE … ADD COLUMN` wrapped in a "swallow duplicate-column"
guard so restarts are idempotent.

## Hotfix that can't wait for a commit+push cycle

Rare, but if it happens:

```bash
rsync -az -e "ssh -i /dev/shm/addypin-ssh/id" \
  server/<file>.js root@vps:/opt/addypin/server/
ssh -i /dev/shm/addypin-ssh/id root@vps \
  'chown addypin:addypin /opt/addypin/server/<file>.js && systemctl restart addypin'
```

Then commit + push so the VPS `git pull` stays a no-op on the next
normal deploy. Don't leave the VPS ahead of `origin/main` — git
will eventually complain about dirty tree.

## Secrets

**Never hardcode anything.** Every credential comes from
`pass show addypin/...` at use-time. See memory
`feedback_keys_from_pass`.

**Never commit a real `.env`.** Shape is documented in
`.env.example`; `data/`, `.env`, `.env.local` are gitignored.

## Testing philosophy

- `npm test` uses `:memory:` SQLite — no env vars, no disk state,
  no order dependencies between tests.
- Tests run in isolation via Node's built-in `node:test`. No jest,
  no mocha, no vitest.
- Write the test first when fixing a bug — it proves the bug
  exists, then proves the fix.
- Don't mock what you can exercise for real. Tests hit an actual
  DB (`:memory:`), an actual router, actual crypto.
- Target: ≈200 tests, <3s wall time. At the wall-time limit,
  split slow tests into a separate file rather than mocking.

## Things that are easy to get wrong

- **`/opt/addypin/ops/inbound-wrapper.sh` path.** If you rename
  `ops/` or move the wrapper, `/etc/postfix/master.cf` on the VPS
  must be updated in lockstep. Mismatch = every inbound email
  defers silently until you notice.
- **`MAIL_FROM_ADDRESS` must be a non-handled local-part.** We use
  `noreply@`. Never use a shortcode-shaped local-part (the inbound
  pipe would pick up replies and try to treat them as SHORTCODE@
  requests).
- **`expires_at` is NULL for confirmed pins.** The schema CHECK
  enforces this. If you add a new status, update `db.js` insertPin
  validation too.
- **Magic-link tokens are single-use.** `consumed_tokens` is
  populated in the `/manage?token=` handler. Don't cache the token
  in tests — each call needs a fresh one.

## Related

- [`04-process/`](./) — this directory (more process docs can live here)
- [`03-logs/m10-deploy-log.md`](../03-logs/m10-deploy-log.md) — full
  cutover runbook
- [`ops/homeserver/README.md`](../../ops/homeserver/README.md) —
  federver backup/monitoring install
