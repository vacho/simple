import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { canonicalTimeZone, displayName, password, username } from './validation.ts';

const keys = (schema: v.GenericSchema, input: unknown) =>
	v.safeParse(schema, input).issues?.map((issue) => issue.message) ?? [];

describe('Username rules', () => {
	it('Valid username after normalization: " Ana.Perez " is stored as "ana.perez"', () => {
		expect(v.parse(username, ' Ana.Perez ')).toBe('ana.perez');
		expect(v.parse(username, 'ＡＮＡ_1')).toBe('ana_1');
	});

	it('Non-ASCII letters are rejected: "toño"', () => {
		expect(keys(username, 'toño')).toEqual(['users.username.invalid']);
	});

	it('rejects usernames shorter than 3 or longer than 32 characters, or with spaces', () => {
		expect(keys(username, 'ab')).toEqual(['users.username.invalid']);
		expect(keys(username, 'a'.repeat(33))).toEqual(['users.username.invalid']);
		expect(keys(username, 'ana perez')).toEqual(['users.username.invalid']);
		expect(v.parse(username, 'a'.repeat(32))).toBe('a'.repeat(32));
	});
});

describe('Display name rules', () => {
	it('Accented display name: "  María José Ñuflo " is stored as "María José Ñuflo"', () => {
		expect(v.parse(displayName, '  María José Ñuflo ')).toBe('María José Ñuflo');
	});

	it('Empty or invalid display name', () => {
		expect(keys(displayName, '   ')).toEqual(['users.display_name.empty']);
		expect(keys(displayName, 'ñ'.repeat(65))).toEqual(['users.display_name.too_long']);
		expect(keys(displayName, 'Ana\u0007')).toEqual(['users.display_name.control_characters']);
		expect(v.parse(displayName, '😀'.repeat(64))).toHaveLength(128);
	});
});

describe('Password rules', () => {
	it('Too short or too long, counted in code points', () => {
		expect(keys(password, 'seven77')).toEqual(['users.password.length']);
		expect(keys(password, 'x'.repeat(129))).toEqual(['users.password.length']);
		expect(keys(password, '😀'.repeat(8))).toEqual([]);
		expect(keys(password, '😀'.repeat(129))).toEqual(['users.password.length']);
	});

	it('Spaces are significant: the password is never trimmed', () => {
		expect(v.parse(password, '  secret phrase  ')).toBe('  secret phrase  ');
	});
});

describe('canonicalTimeZone', () => {
	it('accepts IANA zones, UTC and aliases in their canonical form', () => {
		expect(canonicalTimeZone('America/La_Paz')).toBe('America/La_Paz');
		expect(canonicalTimeZone('UTC')).toBe('UTC');
		expect(canonicalTimeZone('Asia/Kolkata')).toBe('Asia/Calcutta');
	});

	it('rejects numeric offsets and unknown names', () => {
		expect(canonicalTimeZone('+02:00')).toBeUndefined();
		expect(canonicalTimeZone('-0400')).toBeUndefined();
		expect(canonicalTimeZone('Nowhere/City')).toBeUndefined();
	});
});
