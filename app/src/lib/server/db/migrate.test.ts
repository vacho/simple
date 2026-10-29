import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { openDatabase } from './client.ts';
import { runMigrations } from './migrate.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'simple-migrate-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('migrations', () => {
	it('apply to an empty database', () => {
		const db = openDatabase(path.join(dir, 'app.db'));
		runMigrations(db);
		const tables = db.$client
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name"
			)
			.pluck()
			.all();
		expect(tables).toEqual(['languages', 'login_attempts', 'sessions', 'translations', 'users']);
		db.$client.close();
	});
});
