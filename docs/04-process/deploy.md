# Deploy

How to ship a change to production (the live VPS at `addypin.com`).

There is no CI/CD pipeline. Deploys are manual on purpose — see
`00-context/vision.md`. The single command path is `./ops/deploy.sh`,
which enforces the pre-flight below and refuses to proceed if any
gate fails. That's the whole point — the script is the runbook in
executable form.

## TL;DR

```bash
./ops/deploy.sh
```

That command does everything in this doc. Run it from the repo root
on your laptop, on `main`, with a clean tree. If pre-flight is green
it'll push to the VPS and restart the service. If anything's off it
fails loudly and tells you what to fix.

For a no-op rehearsal: `./ops/deploy.sh --dry-run`.

## What "deployable" means

An "ok to deploy" state requires **all** of:

1. On branch `main`.
2. Working tree clean (`git status --porcelain` is empty).
3. `HEAD` equals `origin/main` (no unpushed commits, nothing to pull).
4. `npm test` is green (use `--skip-tests` only if you've just run it
   and trust the result — don't make this a habit).

`./ops/deploy.sh` enforces all four. If you're hand-deploying for
some reason (script broken, network weird), check them yourself in
the same order before touching the VPS.

## Pre-deploy checklist

Walk this top-to-bottom **before** running the script.

- [ ] **Test locally.** `./dev.sh` — exercise the change in a real
      browser. Type-check / unit tests don't catch UI regressions or
      copy mistakes. If the change touches mobile UX, test on a
      phone (or at least Chrome devtools' iOS simulation).
- [ ] **`npm test` clean.** All ≈200 tests pass in <3s.
- [ ] **Map links** (only if `server/maplinks.js` changed): click each
      affected link in a browser, confirm it lands on the right
      coordinates. Vendors silently break URL schemes.
- [ ] **Mail pipeline** (only if outbound mail or DNS changed): run a
      [mail-tester.com](https://www.mail-tester.com/) probe. 10/10
      is the bar. Anything lower = regression.
- [ ] **CHANGELOG updated.** Every user-visible change goes under
      `## [Unreleased]` in `CHANGELOG.md`. Group as `Added`,
      `Changed`, `Fixed`, `Security`. Internal-only refactors can
      skip — but if in doubt, write the line.
- [ ] **Commit.** Conventional prefix (`feat:`, `fix:`, `ui:`,
      `docs:`, `feat(ops):`). Subject under 70 chars. Body explains
      *why*, not *what*.
- [ ] **Push.** `git push origin main`. The deploy script refuses if
      `HEAD` differs from `origin/main`.

## Running the deploy

```bash
./ops/deploy.sh
```

What it does, in order:

1. **Pre-flight gates** (above). Fails fast on any miss.
2. **Materializes the SSH key** from `pass addypin/ssh/private_key`
   into a tempfile. Decoded on the fly, `chmod 600`, shredded on
   exit via `trap`. Never written to a real path.
3. **SSH to the VPS** and runs:
   - `git fetch origin main`
   - Refuses if VPS working tree is dirty (someone hot-patched and
     never reconciled — see "Hotfix" below for how to clean up).
   - `git pull --ff-only origin main`
   - `systemctl restart addypin`
   - `systemctl is-active addypin` (must report `active`)
   - Prints the new HEAD so you see what landed.
4. **Smoke test:** `curl https://addypin.com/` must return `200`.

Total time: ~5 seconds on a warm SSH connection.

## After deploying

- [ ] **Click through the change in production.** Don't skip this.
      "It worked locally" is not a deploy receipt.
- [ ] **Watch the journal for 30 seconds:** `ssh root@vps
      'journalctl -u addypin -f'`. Any new errors? Stop and fix.
- [ ] **If you touched mail:** send yourself a magic link from
      production, confirm headers, confirm reply-to behavior.

## Hotfix flow (rare)

When `git push → ./ops/deploy.sh` is too slow — say a one-line
config typo is breaking prod. Fine to hot-patch, but reconcile
within the hour:

```bash
# 1. patch on the VPS
ssh root@vps 'sudoedit -u addypin /opt/addypin/<file>' && \
ssh root@vps 'systemctl restart addypin'

# 2. mirror the same edit on the laptop, commit, push
git add <file> && git commit -m "fix: …" && git push

# 3. reconcile the VPS to origin/main
./ops/deploy.sh
```

If step 3 fails because the VPS working tree is dirty (your patch
wasn't byte-identical to the laptop edit), `ssh` in and:

```bash
sudo -u addypin git status --short        # see the drift
sudo -u addypin git diff origin/main      # confirm it's empty (i.e. content matches)
sudo -u addypin git checkout -f main      # absorb the drift since content == origin/main
```

**Never** leave the VPS ahead of `origin/main` indefinitely. That's
exactly how we ended up on a stale `v2-rewrite` branch with a hot-
patched `web/index.html` for weeks.

## Rollback

`git revert <sha>` on the laptop, commit, push, redeploy. Don't
`reset --hard` on prod or rewrite published history.

If a deploy left the service in a broken state and you need it up
*now*, on the VPS:

```bash
sudo -u addypin git reset --hard HEAD~1   # back up one commit
sudo systemctl restart addypin
```

Then immediately fix the issue locally and redeploy properly.

## Sanity checks worth running periodically

These don't run automatically; budget 5 minutes after a meaningful
deploy or once a week.

- `ssh root@vps 'systemctl status addypin postfix nginx'` — all
  three should be `active (running)`.
- `ssh root@vps '/opt/addypin/ops/health-check.sh'` — exits 0 always,
  but emails `avoidaccess@gmail.com` if anything is degraded
  (units, disk, mail queue, log errors, TLS expiry, DB sanity).
- `ssh root@vps 'mailq | tail -1'` — deferred queue should be small.
- `curl -sS https://addypin.com/api/health` — local health endpoint
  via the public hostname.
- `dig +short MX addypin.com` and `dig +short TXT addypin.com` —
  records still match `00-context/system-state.md`.

## Related

- [`dev-workflow.md`](./dev-workflow.md) — local dev, branch model,
  testing philosophy.
- [`00-context/system-state.md`](../00-context/system-state.md) —
  what's actually running on the VPS.
- [`03-logs/m10-deploy-log.md`](../03-logs/m10-deploy-log.md) —
  the original cutover runbook (still useful for any infra-level
  change, not for code-only deploys).
- [`ops/deploy.sh`](../../ops/deploy.sh) — the script itself.
