# Decisions Log

Record of architectural and design decisions.

## Historical Decisions

### Docker-First Architecture
- **Decision**: Use Docker containers instead of systemd services
- **Rationale**: Environment consistency, easier deployment, better isolation
- **Impact**: 100% deployment success rate, 2-minute deployments

### `--packages=external` Build Strategy
- **Decision**: Treat ALL node_modules as external in ESBuild
- **Rationale**: Prevents "Dynamic require not supported" errors
- **Impact**: Eliminated bundling issues completely

### Manual CI/CD Triggers
- **Decision**: GitHub Actions workflows are manually triggered
- **Rationale**: Prevents accidental production deployments
- **Impact**: Controlled, auditable deployment process

### Single Container Architecture
- **Decision**: Frontend + backend in single Docker container
- **Rationale**: Simplifies deployment at current scale
- **Impact**: Easier management, faster deployments

### Localhost-Only Container Binding
- **Decision**: All containers bound to 127.0.0.1 only
- **Rationale**: External access only through Nginx reverse proxy
- **Impact**: Stronger security posture

---

## Format for New Entries

```
### [Decision Title]
- **Date**: YYYY-MM-DD
- **Decision**: What was decided
- **Alternatives considered**: What else was evaluated
- **Rationale**: Why this option was chosen
- **Impact**: What changed as a result
```
