// npm run backup (D8): a verified, timestamped copy of the database, then retention of the
// newest BACKUP_KEEP scheduled backups. Meant for cron or a systemd timer, from any directory.
// Exit codes: 0 done; 1 no backup was made (nothing pruned); 2 the backup was made, but an old
// one could not be deleted (named in the message).
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { backupDatabase, backupFileName } from '../src/lib/server/db/backup.ts';

/** The app directory: the nearest package.json above this file, wherever cron starts us. */
function findAppDirectory(from: string): string {
	for (let dir = from; ; dir = path.dirname(dir)) {
		if (existsSync(path.join(dir, 'package.json'))) return dir;
		if (path.dirname(dir) === dir) throw new Error('No package.json above scripts/backup.ts');
	}
}

const scheduled = /^app-\d{8}T\d{6}Z\.db$/;

/** Deletes the oldest scheduled backups beyond keep; stops at the first one it can't delete. */
function prune(backupDir: string, keep: number): { failed?: string; error?: unknown } {
	const backups = readdirSync(backupDir)
		.filter((name) => scheduled.test(name))
		.sort();
	for (const name of backups.slice(0, Math.max(0, backups.length - keep))) {
		try {
			unlinkSync(path.join(backupDir, name));
		} catch (error) {
			return { failed: name, error };
		}
	}
	return {};
}

function main(): number {
	const appDir = findAppDirectory(import.meta.dirname);
	const envFile = path.join(appDir, '.env');
	if (existsSync(envFile)) process.loadEnvFile(envFile);
	const databasePath = path.resolve(appDir, process.env.DATABASE_PATH || './data/app.db');
	const backupDir = path.resolve(appDir, process.env.BACKUP_DIR || './data/backups');
	const keep = Number(process.env.BACKUP_KEEP || 14);
	if (!Number.isInteger(keep) || keep < 1) {
		console.error(
			`BACKUP_KEEP must be a whole number of 1 or more, not "${process.env.BACKUP_KEEP}"`
		);
		return 1;
	}

	const target = path.join(backupDir, backupFileName('app', new Date()));
	try {
		backupDatabase(databasePath, target);
	} catch (error) {
		console.error(`Backup failed: ${error instanceof Error ? error.message : error}`);
		return 1;
	}
	console.log(`Backup written: ${target}`);

	const { failed, error } = prune(backupDir, keep);
	if (failed) {
		const reason = error instanceof Error ? error.message : String(error);
		console.error(`Backup kept, but retention stopped: could not delete ${failed} (${reason})`);
		return 2;
	}
	return 0;
}

process.exitCode = main();
