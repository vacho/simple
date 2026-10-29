import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { startup } from './startup.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'simple-startup-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const tables = (file: string) =>
	new Database(file, { readonly: true })
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
		.pluck()
		.all();

describe('startup', () => {
	it('creates the tables on a fresh database path', () => {
		const file = path.join(dir, 'fresh', 'app.db');
		startup({ databasePath: file }).$client.close();
		expect(tables(file)).toEqual(expect.arrayContaining(['languages', 'sessions', 'users']));
	});

	it('stops when a migration fails', () => {
		const file = path.join(dir, 'broken.db');
		new Database(file).exec('CREATE TABLE users (id INTEGER PRIMARY KEY)');
		expect(() => startup({ databasePath: file })).toThrow(/users/);
		// Nothing after the failing statement was applied.
		expect(tables(file)).not.toContain('sessions');
	});
});
