// Restorable backups (D8, Migration Plan): the documented restore and rollback steps, followed
// literally, give back exactly the backed-up data.
import Database from 'better-sqlite3';
import {
	copyFileSync,
	cpSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { backupDatabase } from './db/backup.ts';
import { migrationsFolder } from './db/migrate.ts';
import { startup } from './startup.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'simple-restore-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const databasePath = (name: string) => path.join(dir, name, 'app.db');

const open = (file: string, folder = migrationsFolder) =>
	startup({
		databasePath: file,
		backupDir: path.join(path.dirname(file), 'backups'),
		version: '1.0.0',
		migrationsFolder: folder
	});

const addUser = (db: Database.Database, username: string) =>
	db
		.prepare(
			"INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, 'x', 'member', 0)"
		)
		.run(username, username);
const usernames = (file: string) => {
	const db = new Database(file, { readonly: true });
	const names = db.prepare('SELECT username FROM users ORDER BY username').pluck().all();
	db.close();
	return names;
};

/** The documented steps, with the app stopped: drop the WAL files, copy the backup, start. */
function restore(file: string, backup: string) {
	rmSync(`${file}-wal`, { force: true });
	rmSync(`${file}-shm`, { force: true });
	copyFileSync(backup, file);
}

describe('Restorable backups', () => {
	it('Restore, with a Stale write-ahead log: exactly the backed-up data comes back', () => {
		const file = databasePath('restore');
		const app = open(file);
		addUser(app.$client, 'before');
		const backup = path.join(dir, 'restore', 'backup.db');
		backupDatabase(file, backup);

		// Changes after the backup, still in the write-ahead log when the app stops.
		app.$client.pragma('wal_autocheckpoint = 0');
		addUser(app.$client, 'after');
		const staleWal = path.join(dir, 'restore', 'stale-wal');
		copyFileSync(`${file}-wal`, staleWal);
		app.$client.close();
		copyFileSync(staleWal, `${file}-wal`);

		restore(file, backup);
		open(file).$client.close();
		expect(usernames(file)).toEqual(['before']);
	});

	it('Rolling back an upgrade: the pre-migration backup with the previous build', () => {
		// The next release's schema: one more migration.
		const next = path.join(dir, 'migrations-next');
		cpSync(migrationsFolder, next, { recursive: true });
		const journalFile = path.join(next, 'meta/_journal.json');
		const journal = JSON.parse(readFileSync(journalFile, 'utf8'));
		journal.entries.push({
			idx: 1,
			version: '6',
			when: Date.now(),
			tag: '0001_extra',
			breakpoints: true
		});
		writeFileSync(journalFile, JSON.stringify(journal));
		writeFileSync(path.join(next, '0001_extra.sql'), 'CREATE TABLE `extra` (`id` integer);');

		const file = databasePath('rollback');
		const previous = open(file);
		addUser(previous.$client, 'pre-upgrade');
		previous.$client.close();
		const upgraded = open(file, next);
		addUser(upgraded.$client, 'post-upgrade');
		upgraded.$client.close();

		const backups = path.join(dir, 'rollback', 'backups');
		const [preMigration] = readdirSync(backups).filter((name) => name.startsWith('pre-migrate-'));
		restore(file, path.join(backups, preMigration));
		// The previous build: its own migrations, nothing pending, so it starts on the restored file.
		const rolledBack = open(file);
		const tables = rolledBack.$client
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
			.pluck()
			.all();
		rolledBack.$client.close();
		expect(tables).not.toContain('extra');
		expect(usernames(file)).toEqual(['pre-upgrade']);
	});
});
