# Backup Logs Directory

This directory contains operation logs for all backup and restore activities.

## Log Types

- **backup-operations.log**: All backup creation activities
- **restore-operations.log**: All restore operations
- **error.log**: Backup/restore errors and failures
- **integrity-checks.log**: Backup verification results

## Log Format

Each log entry should include:
- Timestamp (ISO 8601 format)
- Operation type
- Success/failure status
- File paths involved
- Error details (if any)
- Duration of operation