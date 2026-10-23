# addypin v2 documentation

Location sharing, simplified. Drop a pin → get a short link and an
email address that both resolve to coordinates. No accounts, no
tracking.

## Structure

| Section | Path | What lives here |
|---------|------|-----------------|
| **Product** | [`product/`](product/) | Vision, assumptions, the PRD (scope, data model, threat model), current running state, decisions log |
| **Wiki** | [`wiki/`](wiki/) | How to work with the code: dev workflow, deploy, privacy/SEO, and the observability playbook (core page + 6 split pages) |
| **Logs** | [`logs/03-logs/`](logs/03-logs/) | Deploy journals and design artifacts (m10 deploy log, pulselog fallback-alert proposal) |
| **Archive** | [`archive/`](archive/) | Superseded originals (the unsplit observability playbook) |

Also here: [`index.md`](index.md) (generated page index, do not hand-edit) and
[`log.md`](log.md) (docs change log).

## v1 archive

Original codebase lives on the `v1` branch. Reference only — don't
merge from it. Data is not migrated to v2 (deliberate clean-slate
cutover).

## Start here

1. **New to the project?** → [`product/vision.md`](product/vision.md)
   — what addypin is, who it's for, what it deliberately isn't.
2. **Need the technical spec?** → [`product/prd.md`](product/prd.md)
   — source of truth for scope, data model, endpoints, threat model.
3. **Deploying/operating?** → [`product/system-state.md`](product/system-state.md)
   — what's running right now. [`wiki/dev-workflow.md`](wiki/dev-workflow.md)
   — how to ship a change.
   [`wiki/observability-playbook.md`](wiki/observability-playbook.md)
   — generic, portable pulselog + flightlog ops setup (health, weekly digest,
   error flagging, backups, off-box watchdogs, mail-auth).
4. **Why did we do X?** → [`product/decisions-log.md`](product/decisions-log.md).
   Design artifacts too, e.g.
   [`logs/03-logs/pulselog-fallback-alert-proposal.md`](logs/03-logs/pulselog-fallback-alert-proposal.md)
   — the upstream fix identified after the 2026-07 mail-delivery incident.
5. **What happened during cutover?** →
   [`logs/03-logs/m10-deploy-log.md`](logs/03-logs/m10-deploy-log.md).
