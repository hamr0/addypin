# AddyPin Documentation

## Structure

```
docs/
├── 00-context/        WHY and WHAT EXISTS
├── 01-product/        WHAT the product must do
├── 02-features/       HOW features are designed & built
├── 03-logs/           MEMORY (what changed over time)
├── 04-process/        HOW to work with this system
└── archive/           Historical docs preserved
```

---

## 00-context/ - System Context

| Document | Description |
|----------|-------------|
| [vision.md](00-context/vision.md) | Product purpose, value proposition, boundaries |
| [system-state.md](00-context/system-state.md) | Current architecture, tech stack, database schema, performance |
| [assumptions.md](00-context/assumptions.md) | Constraints, risks, unknowns |

## 01-product/ - Product Requirements

| Document | Description |
|----------|-------------|
| [prd.md](01-product/prd.md) | Core product requirements and feature specifications |

## 02-features/ - Feature Documentation

| Document | Description |
|----------|-------------|
| [api-documentation.md](02-features/api-documentation.md) | REST API reference with endpoints, examples, error codes |
| [email-system.md](02-features/email-system.md) | Email architecture (Maddy + webhook + Resend), DNS, OTP |
| [monitoring-system.md](02-features/monitoring-system.md) | Health checks, Docker health, VPS monitoring |
| [analytics-umami.md](02-features/analytics-umami.md) | Umami self-hosted analytics setup |
| [testing.md](02-features/testing.md) | Manual testing guide, API testing commands |
| [backup-system.md](02-features/backup-system.md) | Foundation backup system (bi-weekly, VPS scripts) |
| [msmtp-email-alerts.md](02-features/msmtp-email-alerts.md) | MSMTP email alerts for health monitoring & backups |

## 03-logs/ - Change History

| Document | Description |
|----------|-------------|
| [implementation-log.md](03-logs/implementation-log.md) | Features implemented and code changes |
| [decisions-log.md](03-logs/decisions-log.md) | Architectural and design decisions |
| [bug-log.md](03-logs/bug-log.md) | Bugs found and resolutions |
| [validation-log.md](03-logs/validation-log.md) | Testing and validation activities |
| [insights.md](03-logs/insights.md) | Learnings and patterns |

## 04-process/ - Workflows & Operations

| Document | Description |
|----------|-------------|
| [dev-workflow.md](04-process/dev-workflow.md) | Local development setup, commands, project structure |
| [deployment-reference.md](04-process/deployment-reference.md) | Deploy steps, VPS commands, emergency procedures |
| [ci-cd-guide.md](04-process/ci-cd-guide.md) | CI/CD pipeline, Docker build, GitHub Actions |
| [create-prd.md](04-process/create-prd.md) | Process for generating PRDs |
| [generate-tasks.md](04-process/generate-tasks.md) | Process for generating task lists from PRDs |
| [process-tasks.md](04-process/process-tasks.md) | Task list management guidelines |
| [definition-of-done.md](04-process/definition-of-done.md) | Checklist for feature completion |

## archive/ - Historical Documentation

Contains ~100+ historical docs from previous development phases, troubleshooting sessions, and one-time setup reports. Preserved for reference but no longer actively maintained.
