// Consistent database backups (D8), shared by scripts/backup.ts and the pre-migration backup at
// startup. VACUUM INTO copies the committed data of a single read transaction; under WAL it
// neither blocks the app's writers nor restarts, unlike SQLite's online backup API.
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { linkSync, rmSync } from 'node:fs';
import path from 'node:path';

const pad = (value: number) => String(value).padStart(2, '0');

/** `<prefix>-YYYYMMDDTHHMMSSZ.db`, in UTC. */
export function backupFileName(prefix: string, at: Date): string {
	const date = `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}`;
	const time = `${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`;
	return `${prefix}-${date}T${time}Z.db`;
}

/**
 * Copies the database at sourcePath to targetPath, verified, without ever overwriting a file:
 * the copy is written to a temporary file next to the target, checked, then linked to the final
 * name, which fails if that name exists. On any failure no file is left under the final name.
 */
export function backupDatabase(sourcePath: string, targetPath: string): void {
	const temporary = path.join(
		path.dirname(targetPath),
		`.${path.basename(targetPath)}.${randomBytes(6).toString('hex')}.tmp`
	);
	try {
		const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
		try {
			source.prepare('VACUUM INTO ?').run(temporary);
		} finally {
			source.close();
		}
		const copy = new Database(temporary, { readonly: true, fileMustExist: true });
		try {
			const result = copy.pragma('integrity_check', { simple: true });
			if (result !== 'ok') throw new Error(`Backup failed the integrity check: ${result}`);
		} finally {
			copy.close();
		}
		linkSync(temporary, targetPath);
	} finally {
		rmSync(temporary, { force: true });
	}
}
