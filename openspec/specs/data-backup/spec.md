# data-backup Specification

## Purpose

Protects the household's financial records against loss by producing consistent copies of the database that the operator can schedule and restore from, including a copy taken before every schema upgrade.

## Requirements

### Requirement: Consistent backup command
The system SHALL provide a backup command that writes a complete, consistent copy of the database to the backup directory while the app keeps running, named with the UTC date and time of the backup. The copy SHALL reflect exactly the data committed when the backup started.

#### Scenario: Backup while the app is in use
- **WHEN** the backup command runs while users are writing data
- **THEN** it produces a copy that opens as a valid database, passes an integrity check, and contains every change committed before the backup started and none committed after

#### Scenario: Backup file name
- **WHEN** a backup completes at 2026-10-20 03:00:00 UTC
- **THEN** the backup file is named `app-20261020T030000Z.db`

#### Scenario: Name collision
- **WHEN** a backup file with the same name already exists
- **THEN** the command fails with a non-zero status and leaves the existing file untouched

#### Scenario: Backup failure is reported
- **WHEN** the backup cannot be written (for example, the directory is missing or the disk is full)
- **THEN** the command exits with a non-zero status, reports the reason, and leaves no partial file under a final backup name

#### Scenario: Run by a scheduler
- **WHEN** the backup command is started by cron or a systemd timer from any working directory, using the documented command line
- **THEN** it reads the same configuration as the app and writes to the configured backup directory

### Requirement: Bounded retention
The system SHALL keep the most recent scheduled backups (`app-*.db`) up to a configurable count (default 14) and delete older ones only after the new backup was created and verified. Retention SHALL NOT touch any other file. A retention failure SHALL keep the new backup and be reported as distinct from a backup failure.

#### Scenario: Old backups are pruned
- **WHEN** a backup succeeds and more than the configured number of scheduled backups exist
- **THEN** the oldest scheduled backups are deleted until only the configured number remain

#### Scenario: Failed backup prunes nothing
- **WHEN** creating or verifying the new backup fails
- **THEN** retention does not start and no existing backup is deleted

#### Scenario: Retention fails part-way
- **WHEN** the new backup was created and verified, and deleting an old backup fails after earlier deletions succeeded
- **THEN** the new backup is kept, the command exits with the retention-failure status and names the file it could not delete, and the backups already deleted stay deleted

#### Scenario: Other files are left alone
- **WHEN** retention runs and the backup directory also holds pre-migration backups or unrelated files
- **THEN** those files are not deleted or counted

### Requirement: Backup before schema upgrades
The system SHALL take a backup named after the target schema version before applying pending migrations at startup to a database that already has a schema, and SHALL keep the three most recent of them. If that backup fails, the app SHALL not apply the migrations and SHALL not start.

#### Scenario: Upgrade with pending migrations
- **WHEN** the app starts with migrations pending
- **THEN** it first writes a `pre-migrate-<version>-<timestamp>.db` backup, then applies the migrations

#### Scenario: First start of a new installation
- **WHEN** the app starts with a new, empty database
- **THEN** it applies the migrations without taking a pre-migration backup

#### Scenario: No pending migrations
- **WHEN** the app starts with no migrations pending
- **THEN** no pre-migration backup is taken

#### Scenario: Pre-migration backup fails
- **WHEN** the pre-migration backup cannot be written
- **THEN** the app reports the reason, applies no migration and does not start

### Requirement: Restorable backups
A backup SHALL be restorable while the app is stopped by removing the database's write-ahead log files and replacing the database file with the backup. After a restore, the app SHALL start with exactly the data in the backup.

#### Scenario: Restore
- **WHEN** the operator follows the documented restore steps and starts the app
- **THEN** the app starts normally and shows the data as it was at backup time

#### Scenario: Stale write-ahead log
- **WHEN** a restore is done on a database directory that still holds write-ahead log files from the replaced database
- **THEN** the documented steps remove them first, and no change from the replaced database appears after the restore

#### Scenario: Rolling back an upgrade
- **WHEN** an upgrade must be undone
- **THEN** restoring the matching pre-migration backup and starting the previous build gives a working app with the data as it was before the upgrade
