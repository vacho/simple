// Starts the production build as its own process to check the startup sequence (D3).
import { expect, test } from '@playwright/test';
import Database from 'better-sqlite3';
import { newDatabasePath, startApp } from './app.ts';

const reachable = (url: string) =>
	fetch(`${url}/`, { redirect: 'manual' }).then(
		(response) => response.status,
		() => null
	);

test('a fresh database path gets the tables on first start', async () => {
	const app = startApp(newDatabasePath());
	await app.listening;
	expect(await reachable(app.url)).toBe(303);
	const tables = new Database(app.databasePath, { readonly: true })
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
		.pluck()
		.all();
	expect(tables).toEqual(expect.arrayContaining(['users', 'sessions', 'languages']));
	await app.stop();
});

test('a broken migration aborts startup', async () => {
	const databasePath = newDatabasePath();
	new Database(databasePath).exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
	const app = startApp(databasePath);
	expect(await app.exited).not.toBe(0);
	expect(app.output()).not.toContain('Listening');
	expect(await reachable(app.url)).toBeNull();
	await app.stop();
});

test('no request is served before startup completes', async () => {
	const databasePath = newDatabasePath();
	const lock = new Database(databasePath);
	lock.pragma('journal_mode = WAL');
	// Migrations wait for this write lock (busy_timeout), so startup can't finish while it's held.
	lock.exec('BEGIN EXCLUSIVE');
	const app = startApp(databasePath);
	await new Promise((resolve) => setTimeout(resolve, 2000));
	expect(await reachable(app.url)).toBeNull();
	expect(app.output()).not.toContain('Listening');
	lock.exec('COMMIT');
	lock.close();
	await app.listening;
	expect(await reachable(app.url)).toBe(303);
	await app.stop();
});
