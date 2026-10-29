import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { toIssues } from './issues.ts';

const schema = v.object({
	username: v.pipe(v.string(), v.minLength(3, 'users.username.too_short')),
	profile: v.object({ name: v.pipe(v.string(), v.maxLength(4)) })
});

describe('toIssues', () => {
	it('turns a failed schema into message keys with parameters, not English text', () => {
		const result = v.safeParse(schema, { username: 'ab', profile: { name: 'too long' } });
		expect(result.success).toBe(false);
		expect(toIssues(result.issues ?? [])).toEqual([
			{ field: 'username', key: 'users.username.too_short', params: { requirement: 3 } },
			{ field: 'profile.name', key: 'validation.invalid', params: { requirement: 4 } }
		]);
	});

	it('uses an empty field for input that is not an object', () => {
		const result = v.safeParse(schema, 'nope');
		expect(toIssues(result.issues ?? [])).toEqual([
			{ field: '', key: 'validation.invalid', params: {} }
		]);
	});
});

describe('src/lib/validation', () => {
	it('imports nothing from server/', () => {
		const dir = import.meta.dirname;
		const sources = readdirSync(dir)
			.filter((file) => file.endsWith('.ts'))
			.map((file) => readFileSync(path.join(dir, file), 'utf8'));
		for (const source of sources) expect(source).not.toMatch(/from ['"][^'"]*server\//);
	});
});
