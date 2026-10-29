import { describe, expect, it } from 'vitest';
import { currencies } from './currency.ts';
import { allocate, InvalidAllocation, money, type Money } from './money.ts';

const { BOB } = currencies;
const amounts = (parts: Money[]) => parts.map((part) => part.amountMinor);
const sum = (parts: Money[]) => parts.reduce((total, part) => total + part.amountMinor, 0);

describe('allocate', () => {
	it('splits into equal parts, giving the leftover units to the first parts', () => {
		expect(amounts(allocate(money(100, BOB), 3))).toEqual([34, 33, 33]);
		expect(amounts(allocate(money(-100, BOB), 3))).toEqual([-34, -33, -33]);
	});

	it('splits by ratios, giving leftover units to the largest remainders', () => {
		expect(amounts(allocate(money(1001, BOB), [70, 30]))).toEqual([701, 300]);
		expect(amounts(allocate(money(5, BOB), [1, 3]))).toEqual([1, 4]);
		expect(amounts(allocate(money(10, BOB), [0, 1, 1]))).toEqual([0, 5, 5]);
	});

	it('keeps the currency', () => {
		expect(allocate(money(7, BOB), 2).every((part) => part.currency === BOB)).toBe(true);
	});

	it('splits the largest safe amount without losing a unit', () => {
		const parts = allocate(money(Number.MAX_SAFE_INTEGER, BOB), [1, 2, 3, 7]);
		expect(parts.reduce((total, part) => total + BigInt(part.amountMinor), 0n)).toBe(
			BigInt(Number.MAX_SAFE_INTEGER)
		);
	});

	it('always produces parts that sum to the original amount', () => {
		// A small deterministic generator, so a failure is reproducible.
		let seed = 42;
		const next = (limit: number) => {
			seed = (seed * 1103515245 + 12345) % 2 ** 31;
			return seed % limit;
		};
		for (let run = 0; run < 2000; run++) {
			const amount = next(2_000_001) - 1_000_000;
			const ratios = Array.from({ length: 1 + next(7) }, () => next(100));
			if (!ratios.some((ratio) => ratio > 0)) ratios[0] = 1;
			const parts = allocate(money(amount, BOB), run % 2 ? ratios : ratios.length);
			expect(sum(parts)).toBe(amount);
		}
	});

	it.each([
		['no parts', 0],
		['an empty ratio list', []],
		['negative ratios', [1, -1]],
		['fractional ratios', [0.5, 0.5]],
		['ratios adding up to zero', [0, 0]]
	])('rejects %s', (_case, parts) => {
		expect(() => allocate(money(100, BOB), parts)).toThrow(InvalidAllocation);
	});
});
