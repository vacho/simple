// Test helper: a temporary, migrated database for the calling test file, removed after its tests.
// Each test file gets its own file, so files running in parallel never share data (D11).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll } from 'vitest';
import { openDatabase, type Db } from './client.ts';
import { runMigrations } from './migrate.ts';

export function createTestDatabase(): Db {
	const dir = mkdtempSync(path.join(tmpdir(), 'simple-test-'));
	const db = openDatabase(path.join(dir, 'app.db'));
	runMigrations(db);
	afterAll(() => {
		db.$client.close();
		rmSync(dir, { recursive: true, force: true });
	});
	return db;
}
