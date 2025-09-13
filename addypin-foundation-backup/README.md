# AddyPin Foundation Backup Infrastructure

This directory contains the complete backup infrastructure for the AddyPin application.

## Directory Structure

```
addypin-foundation-backup/
├── golden/                 # Golden master backups (immutable reference copies)
│   ├── postgresql/         # Database schema and reference data
│   ├── docker/            # Container configurations and images
│   ├── nginx/             # Web server configurations
│   ├── monitoring/        # Health check and monitoring configs
│   └── system/            # System-level configurations
├── versioned/             # Versioned backups with timestamps
├── scripts/               # Backup and restore automation scripts
└── logs/                  # Backup operation logs and history
```

## Security

- Permissions: 750 (owner: read/write/execute, group: read/execute, others: none)
- Owner: Current user (runner in Replit environment)
- Location: Within workspace directory for Replit compatibility

## Usage

This infrastructure is designed to:
1. Store immutable golden master configurations
2. Maintain versioned snapshots for point-in-time recovery
3. Provide automated backup/restore capabilities
4. Track all backup operations with detailed logging

Created: September 13, 2025
Environment: Replit Development Workspace