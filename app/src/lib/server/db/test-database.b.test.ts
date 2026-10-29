// Runs in parallel with test-database.a.test.ts: each file must see only its own rows.
import { setTimeout as sleep } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import { languages } from './schema.ts';
import { createTestDatabase } from './test-database.ts';

const db = createTestDatabase();

describe('createTestDatabase (b)', () => {
	it('gives this test file a migrated database of its own', async () => {
		db.insert(languages)
			.values({ code: 'b', status: 'active', preinstalled: false, createdAt: new Date() })
			.run();
		await sleep(500);
		expect(
			db
				.select()
				.from(languages)
				.all()
				.map((row) => row.code)
		).toEqual(['b']);
	});
});
