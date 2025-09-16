# Golden Master Backups

This directory contains immutable reference copies of critical configurations.

## Subdirectories

- **postgresql/**: Database schemas, critical data exports, configuration files
- **docker/**: Container definitions, docker-compose files, Dockerfiles
- **nginx/**: Web server configurations, SSL certificates, routing rules
- **monitoring/**: Health check scripts, monitoring configurations, alerting rules
- **system/**: System-level configurations, environment variables, service definitions

## Guidelines

1. Files here should be treated as read-only after creation
2. Changes should create new versions rather than overwriting
3. These serve as the source of truth for disaster recovery
4. Document all changes with timestamps and reasons