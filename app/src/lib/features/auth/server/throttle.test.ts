import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { lockDuration, lockedUntil, recordFailure, recordSuccess } from './throttle.ts';

const db = createTestDatabase();
const minute = 60 * 1000;
let clock = Date.UTC(2026, 9, 1);

/** One attempt as the sign-in flow makes it: refused while locked, otherwise counted. */
function attempt(username: string, address: string, correct: boolean, now = clock) {
	if (lockedUntil(db, username, address, now)) return 'throttled';
	if (correct) {
		recordSuccess(db, username);
		return 'ok';
	}
	recordFailure(db, username, address, now);
	return 'invalid';
}
const fresh = () => (clock += 60 * minute);

describe('Sign-in throttling', () => {
	it('Too many failures: the username is locked after 5, even for the correct password', () => {
		fresh();
		const results = Array.from({ length: 5 }, () => attempt('ana', '10.0.0.1', false));
		expect(results).toEqual(Array(5).fill('invalid'));
		expect(attempt('ana', '10.0.0.1', true)).toBe('throttled');
		expect(attempt('ana', '10.0.0.2', true)).toBe('throttled');
	});

	it('Unknown usernames are throttled too: the key is the username, account or not', () => {
		fresh();
		for (let i = 0; i < 5; i++) attempt('nobody', '10.0.1.1', false);
		expect(attempt('nobody', '10.0.1.1', false)).toBe('throttled');
	});

	it("Refused attempts don't extend the lock: it ends 15 minutes after the triggering failure", () => {
		fresh();
		for (let i = 0; i < 5; i++) attempt('luis', '10.0.2.1', false, clock + i * minute);
		const trigger = clock + 4 * minute;
		for (let i = 1; i < 15; i++)
			expect(attempt('luis', '10.0.2.1', false, trigger + i * minute)).toBe('throttled');
		expect(attempt('luis', '10.0.2.1', false, trigger + lockDuration - 1)).toBe('throttled');
		expect(attempt('luis', '10.0.2.1', true, trigger + lockDuration)).toBe('ok');
	});

	it('Success resets the counter: of the username, not of the address', () => {
		fresh();
		for (let i = 0; i < 4; i++) attempt('eva', '10.0.3.1', false);
		expect(attempt('eva', '10.0.3.1', true)).toBe('ok');
		for (let i = 0; i < 4; i++) expect(attempt('eva', '10.0.3.1', false)).toBe('invalid');
		// The address kept its 4 earlier failures plus these 4: 12 more lock it.
		for (let i = 0; i < 12; i++) attempt(`guess${i}`, '10.0.3.1', false);
		expect(attempt('eva', '10.0.3.1', true)).toBe('throttled');
	});

	it('Address lock across usernames: 20 failures with different usernames lock the address', () => {
		fresh();
		for (let i = 0; i < 20; i++) expect(attempt(`user${i}`, '10.0.4.1', false)).toBe('invalid');
		expect(attempt('someone', '10.0.4.1', true)).toBe('throttled');
		expect(attempt('someone', '10.0.4.2', true)).toBe('ok');
	});

	it('Shared household address: 5 failures spread across usernames lock nobody', () => {
		fresh();
		for (const name of ['ana', 'luis', 'eva', 'ana', 'luis'])
			attempt(`home-${name}`, '192.168.1.1', false);
		for (const name of ['ana', 'luis', 'eva'])
			expect(attempt(`home-${name}`, '192.168.1.1', true)).toBe('ok');
	});

	it('starts a new window after 15 minutes without a lock', () => {
		fresh();
		for (let i = 0; i < 4; i++) attempt('zoe', '10.0.5.1', false);
		expect(attempt('zoe', '10.0.5.1', false, clock + 15 * minute)).toBe('invalid');
		expect(attempt('zoe', '10.0.5.1', true, clock + 15 * minute)).toBe('ok');
	});
});
