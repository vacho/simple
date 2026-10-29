import { describe, expect, it } from 'vitest';
import { currencies } from './currency.ts';
import {
	add,
	CurrencyMismatch,
	format,
	fromDecimalString,
	InvalidAmount,
	isZero,
	money,
	MoneyOutOfRange,
	parse,
	subtract,
	toDecimalString
} from './money.ts';

const { BOB, USD } = currencies;
const BTC = { code: 'BTC', exponent: 8 };
const MAX = Number.MAX_SAFE_INTEGER;

describe('parse', () => {
	it('reads the locale notation', () => {
		expect(parse('45.20', BOB, 'en').amountMinor).toBe(4520);
		expect(parse('45,20', BOB, 'es').amountMinor).toBe(4520);
		expect(parse('1,234.5', BOB, 'en').amountMinor).toBe(123450);
		expect(parse('1.234,5', BOB, 'es').amountMinor).toBe(123450);
		expect(parse(' -7 ', BOB, 'en').amountMinor).toBe(-700);
	});

	it('adds 0.1 and 0.2 exactly', () => {
		const sum = add(parse('0.1', USD, 'en'), parse('0.2', USD, 'en'));
		expect(sum.amountMinor).toBe(30);
		expect(format(sum, 'en')).toBe('0.30');
	});

	it.each([
		['', 'en'],
		['abc', 'en'],
		['1.2.3', 'en'],
		['12,34.5', 'en'],
		['1.234', 'en'], // more decimals than the currency has
		['45.20', 'es'], // a Spanish "45.20" is not 4520
		['1e3', 'en'],
		['--1', 'en']
	])('rejects %j in %s', (text, locale) => {
		expect(() => parse(text, BOB, locale)).toThrow(InvalidAmount);
	});

	it('accepts the largest safe amount and rejects one more', () => {
		expect(parse('90071992547409.91', BOB, 'en').amountMinor).toBe(MAX);
		expect(() => parse('90071992547409.92', BOB, 'en')).toThrow(MoneyOutOfRange);
		expect(() => parse('-90071992547409.92', BOB, 'en')).toThrow(MoneyOutOfRange);
	});
});

describe('money', () => {
	it('accepts Number.MAX_SAFE_INTEGER and rejects MAX_SAFE_INTEGER + 1', () => {
		expect(money(MAX, BOB).amountMinor).toBe(MAX);
		expect(() => money(MAX + 1, BOB)).toThrow(MoneyOutOfRange);
		expect(() => money(0.5, BOB)).toThrow(MoneyOutOfRange);
	});

	it('adds, subtracts and tells zero', () => {
		const a = money(1050, BOB);
		expect(subtract(a, add(a, money(-1050, BOB))).amountMinor).toBe(1050);
		expect(isZero(subtract(a, a))).toBe(true);
	});

	it('rejects an add overflowing the range', () => {
		expect(() => add(money(MAX, BOB), money(1, BOB))).toThrow(MoneyOutOfRange);
		expect(() => subtract(money(-MAX, BOB), money(1, BOB))).toThrow(MoneyOutOfRange);
	});

	it('rejects mismatched currencies, by code or by exponent', () => {
		expect(() => add(money(1, BOB), money(1, USD))).toThrow(CurrencyMismatch);
		expect(() => add(money(1, BOB), money(1, { code: 'BOB', exponent: 3 }))).toThrow(
			CurrencyMismatch
		);
	});
});

describe('format', () => {
	it('formats MAX_SAFE_INTEGER exactly, without dividing', () => {
		expect(format(money(MAX, BOB), 'en')).toBe('90,071,992,547,409.91');
		expect(format(money(MAX, BOB), 'es')).toBe('90.071.992.547.409,91');
		expect(format(money(-MAX, BOB), 'en')).toBe('-90,071,992,547,409.91');
	});

	it('writes the exact decimal string', () => {
		expect(toDecimalString(money(-MAX, BOB))).toBe('-90071992547409.91');
		expect(toDecimalString(money(-1, BOB))).toBe('-0.01');
		expect(toDecimalString(money(5, BTC))).toBe('0.00000005');
		expect(toDecimalString(money(7, { code: 'JPY', exponent: 0 }))).toBe('7');
		expect(fromDecimalString('-0.01', BOB).amountMinor).toBe(-1);
	});
});

describe('parse -> format -> parse round trips', () => {
	const cases = [
		[MAX, BOB],
		[-MAX, BOB],
		[0, BOB],
		[-1, BOB],
		[123456789, BTC],
		[-MAX, BTC]
	] as const;
	it.each(['en', 'es'])('in %s', (locale) => {
		for (const [amountMinor, currency] of cases) {
			const value = money(amountMinor, currency);
			const text = format(value, locale);
			const again = parse(text, currency, locale);
			expect(again.amountMinor).toBe(amountMinor);
			expect(format(again, locale)).toBe(text);
		}
	});
});
