import Database from 'better-sqlite3';
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { migrationsFolder } from './db/migrate.ts';
import { startup, type StartupOptions } from './startup.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'simple-startup-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// The current migrations, and an upgrade adding one more: the next release's schema.
const current = migrationsFolder;
const upgrade = path.join(dir, 'migrations-next');
cpSync(current, upgrade, { recursive: true });
const journalFile = path.join(upgrade, 'meta/_journal.json');
const journal = JSON.parse(readFileSync(journalFile, 'utf8'));
journal.entries.push({
	idx: 1,
	version: '6',
	when: Date.now(),
	tag: '0001_extra',
	breakpoints: true
});
writeFileSync(journalFile, JSON.stringify(journal));
writeFileSync(path.join(upgrade, '0001_extra.sql'), 'CREATE TABLE `extra` (`id` integer);');

let installations = 0;
function installation() {
	const root = path.join(dir, `install${++installations}`);
	mkdirSync(root);
	return { databasePath: path.join(root, 'app.db'), backupDir: path.join(root, 'backups') };
}
const start = (options: Omit<StartupOptions, 'version'>, version = '1.2.0') =>
	startup({ version, ...options }).$client.close();
const tables = (file: string) => {
	const db = new Database(file, { readonly: true });
	const names = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").pluck().all();
	db.close();
	return names;
};
const backups = (backupDir: string) => (existsSync(backupDir) ? readdirSync(backupDir).sort() : []);

describe('startup', () => {
	it('creates the tables on a fresh database path', () => {
		const { databasePath, backupDir } = installation();
		start({ databasePath, backupDir });
		expect(tables(databasePath)).toEqual(
			expect.arrayContaining(['languages', 'sessions', 'users'])
		);
	});

	it('stops when a migration fails', () => {
		const { databasePath, backupDir } = installation();
		new Database(databasePath).exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
		expect(() => start({ databasePath, backupDir })).toThrow(/users/);
		// Nothing after the failing statement was applied.
		expect(tables(databasePath)).not.toContain('sessions');
	});
});

describe('Backup before schema upgrades', () => {
	it('Upgrade with pending migrations: a pre-migration backup first, then the migrations', () => {
		const { databasePath, backupDir } = installation();
		start({ databasePath, backupDir, migrationsFolder: current });
		start({ databasePath, backupDir, migrationsFolder: upgrade }, '1.3.0');
		const [backup] = backups(backupDir);
		expect(backup).toMatch(/^pre-migrate-1\.3\.0-\d{8}T\d{6}Z\.db$/);
		expect(tables(path.join(backupDir, backup))).not.toContain('extra');
		expect(tables(databasePath)).toContain('extra');
	});

	it('First start of a new installation: no pre-migration backup', () => {
		const { databasePath, backupDir } = installation();
		start({ databasePath, backupDir, migrationsFolder: upgrade });
		expect(backups(backupDir)).toEqual([]);
	});

	it('No pending migrations: no pre-migration backup', () => {
		const { databasePath, backupDir } = installation();
		start({ databasePath, backupDir });
		start({ databasePath, backupDir });
		expect(backups(backupDir)).toEqual([]);
	});

	it('Pre-migration backup fails: no migration is applied and startup stops', () => {
		const { databasePath, backupDir } = installation();
		start({ databasePath, backupDir, migrationsFolder: current });
		writeFileSync(backupDir, 'a file where the backup directory should be');
		expect(() => start({ databasePath, backupDir, migrationsFolder: upgrade })).toThrow();
		expect(tables(databasePath)).not.toContain('extra');
	});

	it('keeps the three most recent pre-migration backups', () => {
		const { databasePath, backupDir } = installation();
		start({ databasePath, backupDir, migrationsFolder: current });
		mkdirSync(backupDir);
		const older = ['20260101T000000Z', '20260201T000000Z', '20260301T000000Z'].map(
			(stamp, index) => `pre-migrate-1.${index}.0-${stamp}.db`
		);
		for (const name of [...older, 'app-20260101T000000Z.db'])
			writeFileSync(path.join(backupDir, name), '');
		start({ databasePath, backupDir, migrationsFolder: upgrade }, '1.3.0');
		const kept = backups(backupDir).filter((name) => name.startsWith('pre-migrate-'));
		expect(kept).toHaveLength(3);
		expect(kept).not.toContain(older[0]);
		expect(backups(backupDir)).toContain('app-20260101T000000Z.db');
	});
});
