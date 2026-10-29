import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { Conflict, Forbidden, Invalid, NotFound, Throttled } from '../core/errors.ts';
import { errorResponse, failForAction, throwForLoad } from './responses.ts';

const caught = (fn: () => unknown) => {
	try {
		fn();
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
};

const issue = { field: 'username', key: 'users.username.too_short', params: { requirement: 3 } };

describe('denials', () => {
	it.each([
		['Forbidden', new Forbidden()],
		['NotFound', new NotFound()]
	])('render %s as the same 403 not-allowed error', (_name, appError) => {
		for (const map of [throwForLoad, failForAction]) {
			const thrown = caught(() => map(appError));
			expect(isHttpError(thrown, 403)).toBe(true);
			expect((thrown as { body: unknown }).body).toMatchObject({
				message: 'Not allowed',
				key: 'errors.not_allowed'
			});
		}
	});

	it('answer endpoints with the same JSON for missing and forbidden records', async () => {
		const forbidden = errorResponse(new Forbidden('profile.denied', { id: 7 }));
		const missing = errorResponse(new NotFound());
		expect(forbidden.status).toBe(403);
		expect(await forbidden.json()).toEqual(await missing.json());
	});
});

describe('form actions', () => {
	it('map Invalid to fail(400) with the issues', () => {
		expect(failForAction(new Invalid([issue]))).toMatchObject({
			status: 400,
			data: { issues: [issue] }
		});
	});

	it('map Throttled to 429 and Conflict to 409, with the message key', () => {
		expect(failForAction(new Throttled('auth.sign_in.locked', { minutes: 15 }))).toMatchObject({
			status: 429,
			data: { error: { key: 'auth.sign_in.locked', params: { minutes: 15 } } }
		});
		expect(failForAction(new Conflict())).toMatchObject({
			status: 409,
			data: { error: { key: 'errors.conflict', params: {} } }
		});
	});

	it('rethrow anything that is not an app error', () => {
		const bug = new TypeError('bug');
		expect(caught(() => failForAction(bug))).toBe(bug);
	});
});

describe('loads and endpoints', () => {
	it('map the other errors to their status', async () => {
		expect(
			isHttpError(
				caught(() => throwForLoad(new Throttled())),
				429
			)
		).toBe(true);
		const response = errorResponse(new Invalid([issue]));
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			code: 'invalid',
			key: 'errors.invalid',
			params: {},
			issues: [issue]
		});
	});
});
