// npm run backup as cron or systemd runs it (D8): the documented command lines, started from an
// unrelated directory, against a test app directory with its own .env.
import Database from 'better-sqlite3';
import { spawnSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const appRoot = path.resolve(import.meta.dirname, '..');
const work = mkdtempSync(path.join(tmpdir(), 'simple-backup-cmd-'));
const elsewhere = mkdtempSync(path.join(tmpdir(), 'simple-elsewhere-'));
afterAll(() => {
	rmSync(work, { recursive: true, force: true });
	rmSync(elsewhere, { recursive: true, force: true });
});

let apps = 0;
/** A copy of what the backup command needs, with a .env pointing to a test database. */
function testApp(env: string) {
	const dir = path.join(work, `app${++apps}`);
	for (const file of ['package.json', 'scripts/backup.ts', 'src/lib/server/db/backup.ts']) {
		cpSync(path.join(appRoot, file), path.join(dir, file), { recursive: true });
	}
	symlinkSync(path.join(appRoot, 'node_modules'), path.join(dir, 'node_modules'));
	writeFileSync(path.join(dir, '.env'), env);
	mkdirSync(path.join(dir, 'db'));
	const db = new Database(path.join(dir, 'db/test.db'));
	db.exec(`CREATE TABLE marker (app TEXT); INSERT INTO marker VALUES ('app${apps}')`);
	db.close();
	return dir;
}

// The test runner's own variables must not leak into the command: it reads <app>/.env.
const cleanEnv = Object.fromEntries(
	Object.entries(process.env).filter(
		([name]) => !/^(DATABASE_PATH|BACKUP_DIR|BACKUP_KEEP|npm_)/.test(name)
	)
);
const run = (args: string[], cwd: string) =>
	spawnSync('npm', args, { cwd, env: cleanEnv, encoding: 'utf8' });

const backups = (dir: string) => readdirSync(dir).sort();
const env = 'DATABASE_PATH=./db/test.db\nBACKUP_DIR=./out\nBACKUP_KEEP=3\n';

describe('Run by a scheduler', () => {
	it.each([
		[
			'npm --prefix <app> run backup, from another directory',
			(dir: string) => run(['--prefix', dir, 'run', 'backup'], elsewhere)
		],
		[
			'npm run backup, with the app as working directory',
			(dir: string) => run(['run', 'backup'], dir)
		]
	])('%s backs up the database the app .env names', (_case, command) => {
		const dir = testApp(env);
		mkdirSync(path.join(dir, 'out'));
		const result = command(dir);
		expect(result.status, result.stderr).toBe(0);
		const [written] = backups(path.join(dir, 'out'));
		expect(written).toMatch(/^app-\d{8}T\d{6}Z\.db$/);
		const copy = new Database(path.join(dir, 'out', written), { readonly: true });
		expect(copy.prepare('SELECT app FROM marker').pluck().get()).toBe(path.basename(dir));
		copy.close();
	});
});

describe('Bounded retention', () => {
	const old = (n: number) => `app-202601${String(n).padStart(2, '0')}T000000Z.db`;

	it('Old backups are pruned to BACKUP_KEEP, oldest first; Other files are left alone', () => {
		const dir = testApp(env);
		const out = path.join(dir, 'out');
		mkdirSync(out);
		const others = ['pre-migrate-0.0.1-20260101T000000Z.db', 'notes.txt', 'app-latest.db'];
		for (const name of [old(1), old(2), old(3), old(4), ...others])
			writeFileSync(path.join(out, name), '');
		const result = run(['--prefix', dir, 'run', 'backup'], elsewhere);
		expect(result.status, result.stderr).toBe(0);
		const kept = backups(out).filter((name) => /^app-\d{8}T\d{6}Z\.db$/.test(name));
		expect(kept).toHaveLength(3);
		expect(kept.slice(0, 2)).toEqual([old(3), old(4)]);
		for (const name of others) expect(existsSync(path.join(out, name)), name).toBe(true);
	});

	it('Failed backup prunes nothing: exit 1 and every old backup stays', () => {
		const dir = testApp('DATABASE_PATH=./db/missing.db\nBACKUP_DIR=./out\nBACKUP_KEEP=1\n');
		const out = path.join(dir, 'out');
		mkdirSync(out);
		for (const name of [old(1), old(2), old(3)]) writeFileSync(path.join(out, name), '');
		const result = run(['--prefix', dir, 'run', 'backup'], elsewhere);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('Backup failed');
		expect(backups(out)).toEqual([old(1), old(2), old(3)]);
	});

	it('Retention fails part-way: exit 2 naming the file; the new backup and the rest are kept', () => {
		const dir = testApp('DATABASE_PATH=./db/test.db\nBACKUP_DIR=./out\nBACKUP_KEEP=1\n');
		const out = path.join(dir, 'out');
		mkdirSync(out);
		writeFileSync(path.join(out, old(1)), '');
		mkdirSync(path.join(out, old(2))); // A directory: deleting it as a file fails.
		writeFileSync(path.join(out, old(3)), '');
		const result = run(['--prefix', dir, 'run', 'backup'], elsewhere);
		expect(result.status).toBe(2);
		expect(result.stderr).toContain(`could not delete ${old(2)}`);
		const left = backups(out);
		expect(left).not.toContain(old(1));
		expect(left).toContain(old(2));
		expect(left).toContain(old(3));
		expect(left.filter((name) => !name.startsWith('app-2026010'))).toHaveLength(1);
	});
});
