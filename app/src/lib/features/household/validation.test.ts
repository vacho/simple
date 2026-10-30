import * as v from 'valibot';
import { v4, v7 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { baseClasses } from './base-classes.ts';
import { memberTypes } from './server/schema.ts';
import { id, name, nameKey } from './validation.ts';

const issue = (schema: v.GenericSchema, value: unknown) =>
	v.safeParse(schema, value).issues?.[0].message;

describe('household names', () => {
	it('trims and keeps accents: "  Familia Pérez " is "Familia Pérez"', () => {
		expect(v.parse(name, '  Familia Pérez ')).toBe('Familia Pérez');
	});

	it('rejects empty, too long and control characters', () => {
		expect(issue(name, '   ')).toBe('household.name.empty');
		expect(issue(name, 'x'.repeat(65))).toBe('household.name.too_long');
		expect(issue(name, 'Ana\u0007')).toBe('household.name.control_characters');
		expect(v.parse(name, 'é'.repeat(64))).toHaveLength(64);
	});

	it('gives "Lucía" and " lucía" the same key', () => {
		expect(nameKey('Lucía')).toBe(nameKey(' lucía'));
		expect(nameKey('Lucía')).not.toBe(nameKey('Lucia'));
	});
});

describe('household IDs', () => {
	it('accepts a UUIDv7 and rejects a UUIDv4', () => {
		const seven = v7();
		expect(v.parse(id, seven.toUpperCase())).toBe(seven);
		expect(issue(id, v4())).toBe('household.id.invalid');
		expect(issue(id, 'not-a-uuid')).toBe('household.id.invalid');
	});
});

it('stores exactly the base classes the rules know', () => {
	expect(memberTypes.baseClass.enumValues).toEqual([...baseClasses]);
});
