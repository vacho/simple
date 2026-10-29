import Database from 'better-sqlite3';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { backupDatabase, backupFileName } from './backup.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'simple-backup-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function database(name: string) {
	const file = path.join(dir, name);
	const db = new Database(file);
	db.pragma('journal_mode = WAL');
	db.exec('CREATE TABLE IF NOT EXISTS rows (id INTEGER PRIMARY KEY)');
	return { file, db };
}

const ids = (file: string) =>
	new Database(file, { readonly: true })
		.prepare('SELECT id FROM rows ORDER BY id')
		.pluck()
		.all() as number[];

describe('Consistent backup command', () => {
	it('Backup file name: app-20261020T030000Z.db for 2026-10-20 03:00:00 UTC', () => {
		expect(backupFileName('app', new Date(Date.UTC(2026, 9, 20, 3, 0, 0)))).toBe(
			'app-20261020T030000Z.db'
		);
	});

	it('Backup while the app is in use: a valid, consistent copy of what was committed', async () => {
		const { file, db } = database('busy.db');
		for (let i = 1; i <= 1000; i++) db.prepare('INSERT INTO rows VALUES (?)').run(i);
		// Another process keeps writing, one row per transaction, while the backup runs.
		const writer = spawn(
			process.execPath,
			[
				'-e',
				`const db = new (require('better-sqlite3'))(${JSON.stringify(file)});
				db.pragma('busy_timeout = 5000');
				const insert = db.prepare('INSERT INTO rows VALUES (?)');
				let id = 1001;
				process.stdout.write('ready\\n');
				for (;;) insert.run(id++);`
			],
			{ cwd: process.cwd() }
		);
		await new Promise((resolve) => writer.stdout.once('data', resolve));
		await new Promise((resolve) => setTimeout(resolve, 100));
		const before = db.prepare('SELECT max(id) FROM rows').pluck().get() as number;
		const target = path.join(dir, 'busy-backup.db');
		backupDatabase(file, target);
		const after = db.prepare('SELECT max(id) FROM rows').pluck().get() as number;
		writer.kill();

		const copy = new Database(target, { readonly: true });
		expect(copy.pragma('integrity_check', { simple: true })).toBe('ok');
		copy.close();
		const saved = ids(target);
		// Every row committed before the backup started, none after it ended, and no gap: a snapshot.
		expect(saved.length).toBeGreaterThanOrEqual(before);
		expect(saved.length).toBeLessThanOrEqual(after);
		expect(saved[saved.length - 1]).toBe(saved.length);
		expect(after).toBeGreaterThan(before);
		db.close();
	});

	it('Name collision: fails and leaves the existing file untouched', () => {
		const { file, db } = database('collide.db');
		db.close();
		const target = path.join(dir, 'existing.db');
		writeFileSync(target, 'precious');
		expect(() => backupDatabase(file, target)).toThrow(/EEXIST/);
		expect(readFileSync(target, 'utf8')).toBe('precious');
		expect(readdirSync(dir).filter((name) => name.endsWith('.tmp'))).toEqual([]);
	});

	it('Backup failure is reported: a missing directory leaves no file under the final name', () => {
		const { file, db } = database('missing.db');
		db.close();
		const target = path.join(dir, 'no-such-dir', 'app.db');
		expect(() => backupDatabase(file, target)).toThrow();
		expect(existsSync(target)).toBe(false);
	});
});
