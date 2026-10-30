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
const extraTag = `${String(journal.entries.length).padStart(4, '0')}_extra`;
journal.entries.push({
	idx: journal.entries.length,
	version: '6',
	when: Date.now(),
	tag: extraTag,
	breakpoints: true
});
writeFileSync(journalFile, JSON.stringify(journal));
writeFileSync(path.join(upgrade, `${extraTag}.sql`), 'CREATE TABLE `extra` (`id` integer);');

// The schema of release v0.1.0: only its first migration.
const v010 = path.join(dir, 'migrations-v0.1.0');
cpSync(current, v010, { recursive: true });
const v010Journal = path.join(v010, 'meta/_journal.json');
const firstOnly = JSON.parse(readFileSync(v010Journal, 'utf8'));
firstOnly.entries = firstOnly.entries.filter((entry: { tag: string }) => entry.tag === '0000_init');
writeFileSync(v010Journal, JSON.stringify(firstOnly));

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

describe('upgrade from v0.1.0', () => {
	it('adds the household tables and keeps the administrator active with their own password', () => {
		const { databasePath, backupDir } = installation();
		start({ databasePath, backupDir, migrationsFolder: v010 }, '0.1.0');
		const before = new Database(databasePath);
		before
			.prepare(
				`INSERT INTO users (username, display_name, password_hash, role, created_at)
				 VALUES ('ana', 'Ana', 'hash', 'admin', 0)`
			)
			.run();
		before.close();

		start({ databasePath, backupDir }, '0.2.0');

		expect(backups(backupDir)).toEqual([expect.stringMatching(/^pre-migrate-0\.2\.0-/)]);
		expect(tables(databasePath)).toEqual(
			expect.arrayContaining(['household', 'member_types', 'members'])
		);
		const db = new Database(databasePath);
		expect(db.prepare('SELECT active, password_temporary, password_hash FROM users').get()).toEqual(
			{ active: 1, password_temporary: 0, password_hash: 'hash' }
		);
		const insertType = db.prepare(
			`INSERT INTO member_types (id, name, name_key, base_class, created_at)
			 VALUES ('t1', 'Adult', 'adult', 'adult', 0)`
		);
		insertType.run();
		const insertMember = db.prepare(
			`INSERT INTO members (id, name, name_key, member_type_id, user_id, created_at)
			 VALUES (?, ?, ?, 't1', 1, 0)`
		);
		insertMember.run('m1', 'Ana', 'ana');
		// One member per account.
		expect(() => insertMember.run('m2', 'Ana P', 'ana p')).toThrow(/UNIQUE/);
		db.close();
	});
});
