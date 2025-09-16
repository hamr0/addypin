# Versioned Backups Directory

This directory contains timestamped backup versions for point-in-time recovery.

## Naming Convention

Backup directories should follow the format: `YYYY-MM-DD_HH-MM-SS_description/`

Example: `2025-09-13_20-30-45_pre-deployment-backup/`

## Retention Policy

- Keep daily backups for 30 days
- Keep weekly backups for 12 weeks
- Keep monthly backups for 12 months
- Archive yearly backups indefinitely

## Structure

Each versioned backup should contain:
- Complete database export
- All configuration files
- Docker container definitions
- Environment variables (sanitized)
- Metadata file with backup details