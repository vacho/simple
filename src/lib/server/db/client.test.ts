import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { openDatabase } from './client.ts';

const dir = mkdtempSync(path.join(tmpdir(), 'simple-db-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('openDatabase', () => {
	it('applies the connection pragmas', () => {
		const db = openDatabase(path.join(dir, 'nested', 'app.db'));
		const pragma = (name: string) => db.$client.pragma(name, { simple: true });
		expect(pragma('journal_mode')).toBe('wal');
		expect(pragma('foreign_keys')).toBe(1);
		expect(pragma('busy_timeout')).toBe(5000);
		// NORMAL is 1.
		expect(pragma('synchronous')).toBe(1);
		db.$client.close();
	});
});
