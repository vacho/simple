// Money as integer minor units (D7, ADR 0005). Every amount is a safe integer; anything that
// would leave that range throws MoneyOutOfRange instead of losing precision. No floats: parsing
// reads digits as a string, and formatting builds an exact decimal string, never a division.
import type { Currency } from './currency.ts';

export interface Money {
	amountMinor: number;
	currency: Currency;
}

export class MoneyOutOfRange extends Error {
	constructor(readonly value: string) {
		super(`Amount out of range: ${value}`);
		this.name = 'MoneyOutOfRange';
	}
}

export class CurrencyMismatch extends Error {
	constructor(a: Currency, b: Currency) {
		super(`Different currencies: ${a.code}/${a.exponent} and ${b.code}/${b.exponent}`);
		this.name = 'CurrencyMismatch';
	}
}

export class InvalidAmount extends Error {
	constructor(readonly text: string) {
		super(`Not an amount: ${text}`);
		this.name = 'InvalidAmount';
	}
}

const maxMinor = BigInt(Number.MAX_SAFE_INTEGER);

function inRange(value: bigint): number {
	if (value > maxMinor || value < -maxMinor) throw new MoneyOutOfRange(value.toString());
	return Number(value);
}

export function money(amountMinor: number, currency: Currency): Money {
	if (!Number.isSafeInteger(amountMinor)) throw new MoneyOutOfRange(String(amountMinor));
	// -0 and 0 are the same amount.
	return { amountMinor: amountMinor + 0, currency };
}

function sameCurrency(a: Money, b: Money): void {
	if (a.currency.code !== b.currency.code || a.currency.exponent !== b.currency.exponent) {
		throw new CurrencyMismatch(a.currency, b.currency);
	}
}

export function add(a: Money, b: Money): Money {
	sameCurrency(a, b);
	return money(inRange(BigInt(a.amountMinor) + BigInt(b.amountMinor)), a.currency);
}

export function subtract(a: Money, b: Money): Money {
	sameCurrency(a, b);
	return money(inRange(BigInt(a.amountMinor) - BigInt(b.amountMinor)), a.currency);
}

export function isZero(value: Money): boolean {
	return value.amountMinor === 0;
}

const decimal = /^(-?)(\d+)(?:\.(\d+))?$/;

/** Locale-independent exact decimal: "-90071992547409.91" for -9007199254740991 at exponent 2. */
export function toDecimalString({ amountMinor, currency }: Money): string {
	const digits = Math.abs(amountMinor)
		.toString()
		.padStart(currency.exponent + 1, '0');
	const cut = digits.length - currency.exponent;
	const fraction = currency.exponent > 0 ? `.${digits.slice(cut)}` : '';
	return `${amountMinor < 0 ? '-' : ''}${digits.slice(0, cut)}${fraction}`;
}

/** Reads toDecimalString's form; at most `exponent` fraction digits. */
export function fromDecimalString(text: string, currency: Currency): Money {
	const match = decimal.exec(text);
	if (!match) throw new InvalidAmount(text);
	const [, sign, whole, fraction = ''] = match;
	if (fraction.length > currency.exponent) throw new InvalidAmount(text);
	const minor = BigInt(whole + fraction.padEnd(currency.exponent, '0'));
	return money(inRange(sign ? -minor : minor), currency);
}

function separators(locale: string): { group: string; decimal: string } {
	const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
	return {
		group: parts.find((part) => part.type === 'group')?.value ?? ',',
		decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.'
	};
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Spaces, no-break spaces and narrow no-break spaces all count as a space group separator.
const space = new RegExp('[\\s\\u00a0\\u202f]');
const spaces = new RegExp(space.source, 'g');

/**
 * Reads an amount typed in the locale's notation ("45.20" in en, "45,20" in es). Group
 * separators are accepted only between groups of three digits, so a Spanish "45.20" is
 * rejected instead of being read as 4520.
 */
export function parse(text: string, currency: Currency, locale: string): Money {
	const { group, decimal: point } = separators(locale);
	const spaceGroup = space.test(group);
	let value = text.trim().replace(/^[−-]/, '-');
	if (spaceGroup) value = value.replace(spaces, ' ');
	const groupChar = spaceGroup ? ' ' : group;
	const pattern = new RegExp(
		`^(-?)(\\d{1,3}(?:${escape(groupChar)}\\d{3})+|\\d+)(?:${escape(point)}(\\d+))?$`
	);
	const match = pattern.exec(value);
	if (!match) throw new InvalidAmount(text);
	const [, sign, whole, fraction] = match;
	const normalized = `${sign}${whole.split(groupChar).join('')}${fraction ? `.${fraction}` : ''}`;
	return fromDecimalString(normalized, currency);
}

/** The amount in the locale's notation, with exactly `exponent` fraction digits. */
export function format(value: Money, locale: string): string {
	const digits = value.currency.exponent;
	const formatter = new Intl.NumberFormat(locale, {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
	// Intl formats decimal strings exactly; a division would lose the last digits near the limit.
	return formatter.format(toDecimalString(value) as Intl.StringNumericLiteral);
}

export class InvalidAllocation extends Error {
	constructor(reason: string) {
		super(`Invalid allocation: ${reason}`);
		this.name = 'InvalidAllocation';
	}
}

/**
 * Splits an amount into equal parts (a count) or by integer ratios, never losing a minor unit:
 * the parts always add up to the amount. Leftover units go to the parts with the largest
 * remainders, the earlier part first on ties.
 */
export function allocate(value: Money, parts: number | readonly number[]): Money[] {
	const ratios = typeof parts === 'number' ? Array.from({ length: parts }, () => 1) : parts;
	if (ratios.length === 0) throw new InvalidAllocation('no parts');
	if (!ratios.every((ratio) => Number.isSafeInteger(ratio) && ratio >= 0)) {
		throw new InvalidAllocation('ratios must be non-negative integers');
	}
	const total = ratios.reduce((sum, ratio) => sum + BigInt(ratio), 0n);
	if (total === 0n) throw new InvalidAllocation('ratios add up to zero');

	const amount = BigInt(Math.abs(value.amountMinor));
	const shares = ratios.map((ratio, index) => {
		const exact = amount * BigInt(ratio);
		return { index, share: exact / total, remainder: exact % total };
	});
	let left = amount - shares.reduce((sum, { share }) => sum + share, 0n);
	const byRemainder = [...shares].sort((a, b) =>
		a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1
	);
	for (const entry of byRemainder) {
		if (left === 0n) break;
		entry.share += 1n;
		left -= 1n;
	}
	const sign = value.amountMinor < 0 ? -1 : 1;
	return shares.map(({ share }) => money(sign * Number(share), value.currency));
}
