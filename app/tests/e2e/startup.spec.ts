// Starts the production build as its own process to check the startup sequence (D3).
import { expect, test } from '@playwright/test';
import Database from 'better-sqlite3';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
let dir: string;
test.beforeEach(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'simple-start-'));
});
test.afterEach(() => rmSync(dir, { recursive: true, force: true }));

function start(databasePath: string, port: number) {
	const server = spawn('node', ['build'], {
		cwd: root,
		env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath }
	});
	let output = '';
	server.stdout.on('data', (chunk) => (output += chunk));
	server.stderr.on('data', (chunk) => (output += chunk));
	const exited = new Promise<number | null>((resolve) => server.on('exit', resolve));
	const listening = new Promise<void>((resolve) =>
		server.stdout.on('data', () => output.includes('Listening') && resolve())
	);
	return { server, exited, listening, output: () => output };
}

const reachable = (port: number) =>
	fetch(`http://localhost:${port}/`).then(
		(response) => response.status,
		() => null
	);

test('a fresh database path gets the tables on first start', async () => {
	const file = path.join(dir, 'data', 'app.db');
	const app = start(file, 4181);
	await app.listening;
	expect(await reachable(4181)).toBe(200);
	app.server.kill();
	const tables = new Database(file, { readonly: true })
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
		.pluck()
		.all();
	expect(tables).toEqual(expect.arrayContaining(['users', 'sessions', 'languages']));
});

test('a broken migration aborts startup', async () => {
	const file = path.join(dir, 'app.db');
	new Database(file).exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
	const app = start(file, 4182);
	expect(await app.exited).not.toBe(0);
	expect(app.output()).not.toContain('Listening');
	expect(await reachable(4182)).toBeNull();
});

test('no request is served before startup completes', async () => {
	const file = path.join(dir, 'app.db');
	const lock = new Database(file);
	lock.pragma('journal_mode = WAL');
	// Migrations wait for this write lock (busy_timeout), so startup can't finish while it's held.
	lock.exec('BEGIN EXCLUSIVE');
	const app = start(file, 4183);
	await new Promise((resolve) => setTimeout(resolve, 2000));
	expect(await reachable(4183)).toBeNull();
	expect(app.output()).not.toContain('Listening');
	lock.exec('COMMIT');
	lock.close();
	await app.listening;
	expect(await reachable(4183)).toBe(200);
	app.server.kill();
});
