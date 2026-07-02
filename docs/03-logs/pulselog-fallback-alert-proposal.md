# Proposal: a fallback alert sink for pulselog

**Status:** ✅ **delivered in pulselog `0.7.0` (2026-07-02)** — shipped essentially as proposed (`fallback` on `alert`/`digest`/`backup`; no-shell `command`, body on stdin + `PULSELOG_SUBJECT`; `when: always|on-primary-failure`; sole-sink mode; best-effort/never-fatal; redacted digest render; `kind:"alert"` record). addypin adoption tracked in CHANGELOG (2.0.19).
**Author:** addypin ops
**Date:** 2026-07-02
**Origin:** the 2026-07 addypin mail-delivery incident (see [decisions-log](decisions-log.md) and [`ops/homeserver/README.md`](../../ops/homeserver/README.md))

> This lives in addypin's `03-logs/` because it's the design artifact that came
> out of an addypin incident. It's written to be lifted into pulselog's own repo
> (as a PRD section + issue) more or less verbatim — swap "we/addypin" framing
> for pulselog's voice. Nothing here changes addypin code.

---

## 1. Motivation — the circular-alert gap

pulselog's contract is "stay silent on green, **email you** when something
breaks." Every alert and the weekly digest leave via a single transport: plain
`sendmail`. pulselog's own docs already name the weakness:

> *Deliverability is your MTA's job, not pulselog's. … keep a secondary signal
> (the JSONL line, or a `file-age` dead-man's-switch on a reachable host) so a
> spam-foldered alert isn't your only notice.*

The failure mode this warns about is not hypothetical. In the addypin incident,
`mail.<domain>` got proxied through a CDN, which broke SPF + reverse DNS, and
**every** outbound message bounced at Gmail — for a month. That included:

- the weekly stats digest (the visible "this stopped arriving" symptom), and
- **every health alert** — so a real outage would also have been silent.

The killer property is **circularity**: the one alert that could tell you "mail
is broken" travels the same broken path and bounces too. pulselog behaved
correctly at every step (it ran, it detected, it tried to email) and you still
got nothing. The current mitigations are real but indirect:

- The **JSONL line** persists — but nothing *pushes* it to you; you have to go
  look.
- The **off-box `file-age` dead-man's-switch** works, but it only covers the
  narrow "did a fresh artifact appear?" case and requires a second host.

The addypin fix was a bespoke off-box `command` check that SSHes in and greps
`maillog` (see the playbook). That works, but it's per-adopter glue for a gap
that is generic to *every* pulselog deployment: **a single mail transport is a
single point of failure for the entire alerting product.**

## 2. Proposal in one sentence

Let `alert` carry an optional **fallback sink** — a second, dependency-free
delivery path (a `command`, or an HTTP webhook) that pulselog uses when the
primary `sendmail` send fails (and optionally always), so a dead MTA can't
silence the tool.

## 3. Goals / non-goals

**Goals**
- Close the circular-alert gap with an out-of-band notification path.
- Keep pulselog's **zero production dependency** posture (vanilla + `node:*`).
- Opt-in and backward compatible — absent config = today's behavior exactly.
- Cover both alert modes: health-check failures **and** the digest email.
- Make it usable as the *only* sink too (a box with no MTA at all).

**Non-goals**
- Not a full pluggable-transport framework or retry/queue engine.
- Not solving deliverability of the primary mail path (still the MTA's job).
- Not a native "maillog/bounce" check type — that stays MTA-specific and belongs
  in `examples/`, not core (see §9).
- No new runtime dependency (no SDKs, no SMTP client library).

## 4. Design

### 4.1 Config schema

Extend the existing `alert` object (and mirror on `digest`, which has its own
`email`/`from`). Two sink shapes, both zero-dep:

```jsonc
"alert": {
  "email": "you@example.com",
  "from":  "alerts@example.com",
  "app":   "myapp",

  "fallback": {
    // WHEN to fire the fallback:
    "when": "on-primary-failure",   // default; or "always"

    // pick ONE transport:

    // (a) command sink — pulselog spawns it, no shell unless you ask,
    //     and pipes the alert body to stdin. Exit 0 = delivered.
    "command": "curl",
    "args": ["-m", "10", "-fsS", "-H", "Title: myapp alert",
             "-d", "@-", "https://ntfy.sh/my-secret-topic"],
    "timeoutMs": 10000

    // (b) OR webhook sink — pulselog POSTs the alert as JSON via node:http(s).
    // "webhook": "https://ntfy.sh/my-secret-topic",
    // "method": "POST",                 // default POST
    // "headers": { "Title": "myapp alert" },
    // "timeoutMs": 10000
  }
}
```

- **Command sink** — the escape hatch that needs nothing pulselog doesn't
  already do (it already spawns `command` checks and `metricsCommand`). Users
  wire ntfy, a Slack/Discord webhook via `curl`, `logger`, an SMS gateway CLI,
  or a second `sendmail -f` through a different relay.
- **Webhook sink** — a first-class convenience for the overwhelmingly common
  "POST to a URL" case, using `node:http`/`node:https` only. Nice-to-have; the
  command sink alone already covers it.

### 4.2 Payload

- **Command sink:** the same rendered plain-text body pulselog would email,
  written to the child's **stdin** (not argv — avoids length limits and quoting
  hazards). The subject is exposed as an env var (e.g. `PULSELOG_SUBJECT`) so a
  wrapper can use it as a title without parsing the body.
- **Webhook sink:** a small JSON object —
  `{ "app", "kind": "alert"|"digest", "subject", "body", "failures": [...] }` —
  where `failures` reuses the JSONL check-result shape pulselog already produces.

### 4.3 Semantics — when it fires

- `when: "on-primary-failure"` (default): pulselog attempts the primary
  `sendmail` send; if that returns non-zero / errors / times out, it fires the
  fallback. "Primary failed" = the local handoff failed (sendmail missing,
  non-zero exit, spawn error). Note: a *bounce* happens asynchronously after
  handoff, so `sendmail` returning 0 does **not** mean delivered — see Open
  Questions §11.1.
- `when: "always"`: fire both, unconditionally (belt-and-suspenders — the paged
  team wants ntfy regardless; email is the archive).
- **No primary at all:** if `email` is omitted but `fallback` is set, the
  fallback is the sole sink (covers a box with no MTA).
- The fallback is **best-effort and never fatal**: its own failure is logged
  (one warn line + a JSONL record) but never changes pulselog's exit code beyond
  what the checks already dictate. Same "never let telemetry crash the app"
  discipline flightlog uses.
- **One JSONL line records the alert attempt(s)** and each sink's outcome, so
  the durable record shows "emailed: fail, fallback: ok" — an operator can
  reconstruct what happened without the journal.

### 4.4 Where it plugs in

Health mode and digest mode both already have a single "send this email" call
site. The fallback is one wrapper around those two call sites — not a new
subsystem. `--dry-run` renders and **skips both** sinks, unchanged.

## 5. Security considerations

pulselog already refuses a group/world-writable or third-party-owned config
(the 0.4.x ownership gate) precisely because the config drives command
execution — that gate now also protects the fallback `command`. Beyond that:

- **Header/argument flattening precedent.** pulselog already strips `\r`/`\n`
  from `to`/`from`/`subject` to prevent mail-header injection from config
  values. The webhook sink must apply the same discipline to any header values
  it sends, and the subject/body it serializes.
- **Command sink runs with no shell by default** (`command` + `args` array,
  like health `command` checks). A shell is opt-in via `sh -c`, and then it's
  the operator's rope — same trust model as existing checks.
- **Webhook = SSRF surface.** The URL comes from a trusted, ownership-gated
  config (not user input), so this is low-risk, but document it: pulselog will
  POST wherever the config says, including internal addresses.
- **Secrets in config.** ntfy topics / webhook tokens are secrets living in the
  config file. The ownership gate + `0600`-ish perms cover this; call it out so
  adopters don't world-read the config.
- **Fallback body carries the same content as the email** — for the digest that
  means the privacy invariant still holds (counts + group names only, never
  messages/stacks). The fallback must reuse the already-redacted render, not the
  raw data.

## 6. Backward compatibility

Purely additive. No `fallback` key → byte-for-byte current behavior. No new
dependency, no default change, no schema break. TypeScript types gain an
optional `fallback` field.

## 7. Testing plan (mirrors pulselog's existing style)

- Command sink fires on simulated primary failure; **not** fired when primary
  succeeds and `when` defaults to `on-primary-failure`.
- `when: "always"` fires both regardless of primary outcome.
- Fallback-only (no `email`) delivers via the sink.
- Fallback failure is logged + recorded but **never** raises the exit code or
  throws (subprocess test, like flightlog's `captureSync`-survives-exit test).
- Body reaches the child via **stdin** intact; `PULSELOG_SUBJECT` set.
- Webhook: a fake local HTTP server asserts method, headers (flattened), and
  JSON body; a non-2xx and a timeout are both handled as "fallback failed".
- Digest fallback carries the redacted render (privacy invariant holds).

## 8. Alternatives considered

- **Native maillog/bounce check** — rejected for core: Postfix-log-format- and
  topology-specific, needs root log access. Belongs in `examples/` (§9).
- **External dead-man's-switch only** (status quo) — works but requires a second
  host and only pushes if that host's *own* mail path is healthy; doesn't help
  single-host deployments.
- **Relay the primary through a signing service (msmtp→Gmail)** — improves
  primary deliverability (recommended regardless) but is still one path; a
  provider outage or credential expiry re-creates the single-point-of-failure.
- **Multiple `email` recipients** — doesn't help; same transport, same failure.

The fallback sink is the smallest change that removes the *single* path, and it
composes with all of the above.

## 9. Companion (docs-only, no code): a mail-delivery recipe

Independent of the feature, ship `examples/mail-delivery-check.sh` (the off-box
"is my VPS still delivering to the operator address?" `command` check) plus a
short "watch your own deliverability from off-box" paragraph in
`pulselog.context.md`. This helps adopters today even before the fallback sink
lands, and documents *why* such a check must live off the sending host
(unprivileged service user can't read `maillog`; circular alerting).

> **This recipe does not exist yet** — it's the proposal. Port it from the two
> concrete sources already in the addypin repo, don't rewrite from memory:
> - **Faithful reference implementation:** [`ops/homeserver/addypin-mail-check.sh`](../../ops/homeserver/addypin-mail-check.sh)
>   — the real, running script (grep-latest-status-over-SSH, stateless).
> - **Generic/placeholder form:** [`observability-playbook.md`](../04-process/observability-playbook.md)
>   §8a, already written with `<APP>` placeholders — closest to what the
>   `examples/` file should be.
>
> POC checklist for the port: keep the *latest-outcome* logic (not a time
> window — avoids stale-bounce stickiness); keep `|| true` so VPS-down reads
> green (that's the `http`/`ssl` checks' job); parameterize host/user/key/
> recipient via env with sane defaults; don't hardcode Postfix — note the
> `maillog` grep is Postfix-specific and other MTAs need a different matcher.

## 10. Rollout / docs impact

- `README.md` + `config.example.json`: the `alert.fallback` block.
- `pulselog.context.md`: a "when your mail path dies" section replacing the
  current "keep a secondary signal" hand-wave with a concrete config.
- CHANGELOG: `Added — opt-in fallback alert sink (command | webhook), zero-dep`.
- SemVer: additive minor.

## 11. Open questions

1. **Detecting real delivery vs. handoff.** `sendmail` exit 0 means "queued,"
   not "delivered." Firing the fallback only on handoff failure won't catch an
   async bounce. Options: (a) accept that limitation and lean on `when: "always"`
   + the off-box recipe for bounce detection; (b) out of scope. Leaning (a).
2. **`when: "always"` noise.** Double-notifying every alert may annoy; maybe a
   third mode `on-primary-failure-or-digest` (fallback for pages, email for the
   weekly). Probably premature — start with the two modes.
3. **Multiple fallbacks** (array) — deferred; one sink covers the need, and a
   fan-out wrapper script can multiplex if someone wants it.
4. **Rate/dedup** across runs — explicitly out of scope (pulselog is stateless
   by design; dedup stays in the JSONL-consuming layer).

---

## 12. Postscript — how 0.7.0 actually shipped (2026-07-02)

Delivered close to this proposal. Notable resolutions of the open questions:

- **§11.1 resolved toward `when: "always"` as the default.** 0.7.0 makes
  `always` the default precisely because it's *the only mode that survives an
  async bounce after a clean handoff* — which is exactly what the addypin
  incident was (Postfix accepted on `:25`, Gmail bounced later). `on-primary-failure`
  only catches a failed local handoff.
- **`fallback` landed on `backup` too** (not just `alert`/`digest`), with a
  `fallback` field on the backup fail record.
- **`sendEmail` now returns `{ transport, ok }`** so `on-primary-failure` can
  observe the handoff result; `digest.delivered` can read `"fallback"`.

addypin's own adoption (2.0.19): `ops/fallback-notify.sh` → an independent
`msmtp` `gmail` account (authenticated Gmail submission), wired as
`alert.fallback.when="always"` (health) and `digest.fallback.when="on-primary-failure"`.
