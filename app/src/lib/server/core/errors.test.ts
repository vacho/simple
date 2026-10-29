import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Conflict, Forbidden, Invalid, NotFound, Throttled } from './errors.ts';

describe('application errors', () => {
	it('carry a message key and parameters, never text', () => {
		const throttled = new Throttled('auth.sign_in.locked', { minutes: 15 });
		expect(throttled).toMatchObject({
			code: 'throttled',
			key: 'auth.sign_in.locked',
			params: { minutes: 15 }
		});
		expect(throttled.name).toBe('Throttled');
		expect(throttled).toBeInstanceOf(Error);
	});

	it('have a default key for each kind', () => {
		expect(new Forbidden()).toMatchObject({
			code: 'forbidden',
			key: 'errors.forbidden',
			params: {}
		});
		expect(new NotFound()).toMatchObject({ code: 'not_found', key: 'errors.not_found' });
		expect(new Conflict()).toMatchObject({ code: 'conflict', key: 'errors.conflict' });
		expect(new Throttled()).toMatchObject({ code: 'throttled', key: 'errors.throttled' });
	});

	it('keep the issues of invalid input as keys', () => {
		const issue = { field: 'username', key: 'validation.too_short', params: { min: 3 } };
		expect(new Invalid([issue])).toMatchObject({
			code: 'invalid',
			key: 'errors.invalid',
			issues: [issue]
		});
	});
});

describe('server/core', () => {
	it('imports nothing from SvelteKit', () => {
		const sources = readdirSync(import.meta.dirname)
			.filter((file) => file.endsWith('.ts'))
			.map((file) => readFileSync(new URL(file, `file://${import.meta.dirname}/`), 'utf8'));
		expect(sources.length).toBeGreaterThan(0);
		for (const source of sources) expect(source).not.toMatch(/from ['"](@sveltejs\/kit|\$app\/)/);
	});
});
