import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../db/test-database.ts';
import { languages } from '../db/schema.ts';
import { testCtx } from './ctx.ts';
import { withTransaction } from './transaction.ts';

const db = createTestDatabase();
const ctx = testCtx(db);
const insert = (code: string) =>
	db
		.insert(languages)
		.values({ code, status: 'active', preinstalled: false, createdAt: new Date() })
		.run();
const codes = () =>
	db
		.select({ code: languages.code })
		.from(languages)
		.all()
		.map((row) => row.code);

describe('withTransaction', () => {
	it('commits what the callback wrote and returns its result', () => {
		expect(withTransaction(ctx, () => (insert('a'), 'done'))).toBe('done');
		expect(codes()).toEqual(['a']);
	});

	it('joins the outer transaction in a nested call', () => {
		withTransaction(ctx, (outer) => {
			expect(outer.inTransaction).toBe(true);
			withTransaction(outer, (inner) => {
				expect(inner).toBe(outer);
				expect(db.$client.inTransaction).toBe(true);
			});
		});
	});

	it('rolls back the outer writes when the inner call throws', () => {
		expect(() =>
			withTransaction(ctx, (outer) => {
				insert('b');
				withTransaction(outer, () => {
					insert('c');
					throw new Error('inner failure');
				});
			})
		).toThrow('inner failure');
		expect(codes()).toEqual(['a']);
	});

	it('rejects an async callback at compile time', () => {
		// @ts-expect-error a callback returning a promise must not compile
		expect(() => withTransaction(ctx, async () => insert('d'))).toThrow();
		expect(codes()).toEqual(['a']);
	});
});
