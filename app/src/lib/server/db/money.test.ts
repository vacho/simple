// Money in SQLite (D7): INTEGER columns read through Drizzle's number mode keep every safe
// amount exact, and sums are checked before they become Money.
import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { currencies } from '../../domain/money/currency.ts';
import { money, MoneyOutOfRange } from '../../domain/money/money.ts';
import { createTestDatabase } from './test-database.ts';

const db = createTestDatabase();
db.$client.exec('CREATE TABLE amounts (id INTEGER PRIMARY KEY, amount_minor INTEGER NOT NULL)');
const amounts = sqliteTable('amounts', {
	id: integer('id').primaryKey(),
	amountMinor: integer('amount_minor', { mode: 'number' }).notNull()
});
const MAX = Number.MAX_SAFE_INTEGER;

describe('money in SQLite', () => {
	it('round-trips MAX_SAFE_INTEGER and -MAX_SAFE_INTEGER exactly', () => {
		db.insert(amounts)
			.values([{ amountMinor: MAX }, { amountMinor: -MAX }])
			.run();
		const read = db
			.select()
			.from(amounts)
			.all()
			.map((row) => row.amountMinor);
		expect(read).toEqual([MAX, -MAX]);
		expect(read.map((amount) => money(amount, currencies.BOB).amountMinor)).toEqual([MAX, -MAX]);
	});

	it('checks SUM() over two large values before using it', () => {
		db.delete(amounts).run();
		db.insert(amounts)
			.values([{ amountMinor: MAX }, { amountMinor: MAX }])
			.run();
		const [{ total }] = db
			.select({ total: sql<number>`sum(${amounts.amountMinor})` })
			.from(amounts)
			.all();
		expect(() => money(total, currencies.BOB)).toThrow(MoneyOutOfRange);
	});
});
