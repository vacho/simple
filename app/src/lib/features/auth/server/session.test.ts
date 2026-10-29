import { describe, expect, it } from 'vitest';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { users } from '../../../server/db/schema.ts';
import { sessions } from './schema.ts';
import {
	createSession,
	generateSessionToken,
	invalidateSession,
	sessionLifetime,
	validateSession
} from './session.ts';

const db = createTestDatabase();
const userId = db
	.insert(users)
	.values({
		username: 'ana',
		displayName: 'Ana',
		passwordHash: 'x',
		role: 'admin',
		createdAt: new Date()
	})
	.returning()
	.get().id;
const day = 24 * 60 * 60 * 1000;
const t0 = Date.UTC(2026, 9, 1);
const writes = () => db.$client.prepare('SELECT total_changes()').pluck().get() as number;
const start = () => {
	const token = generateSessionToken();
	return { token, expiresAt: createSession(db, token, userId, t0) };
};

describe('Sessions', () => {
	it('stores only the hash of a random token', () => {
		const { token, expiresAt } = start();
		expect(token).toMatch(/^[a-z2-7]{32}$/);
		expect(expiresAt.getTime()).toBe(t0 + sessionLifetime);
		const stored = db
			.select()
			.from(sessions)
			.all()
			.map((row) => row.id);
		expect(stored).not.toContain(token);
		expect(stored.every((id) => /^[0-9a-f]{64}$/.test(id))).toBe(true);
	});

	it('keeps the session without a write while 29 or more days remain', () => {
		const { token } = start();
		const before = writes();
		expect(validateSession(db, token, t0 + 12 * 60 * 60 * 1000)).toMatchObject({
			user: { kind: 'user', id: userId, role: 'admin' },
			session: { action: 'keep' }
		});
		expect(writes()).toBe(before);
	});

	it('extends to 30 days and asks to renew the cookie once fewer than 29 remain', () => {
		const { token } = start();
		const now = t0 + day + 1;
		expect(validateSession(db, token, now).session).toEqual({
			action: 'renew',
			expiresAt: new Date(now + sessionLifetime)
		});
	});

	it('Session persists across visits: valid 29 days after the last use, whatever the history', () => {
		for (const lastUse of [t0, t0 + 1, t0 + day / 2, t0 + day + 1, t0 + 5 * day]) {
			const { token } = start();
			validateSession(db, token, lastUse);
			expect(validateSession(db, token, lastUse + 29 * day - 1).user?.id).toBe(userId);
		}
	});

	it('Tolerance window: between 29 and 30 days, valid or not by when it was last extended', () => {
		// Extended at the last use: still valid 29.5 days later.
		const extended = start();
		validateSession(db, extended.token, t0 + day + 1);
		expect(validateSession(db, extended.token, t0 + day + 1 + 29.5 * day).user?.id).toBe(userId);
		// Not extended at the last use (29 days or more remained): gone 29.5 days later.
		const kept = start();
		validateSession(db, kept.token, t0 + 12 * 60 * 60 * 1000);
		expect(
			validateSession(db, kept.token, t0 + 12 * 60 * 60 * 1000 + 29.5 * day).user
		).toBeUndefined();
	});

	it('Idle session expires: cleared after 30 idle days, and the row is gone', () => {
		const { token } = start();
		expect(validateSession(db, token, t0 + 30 * day)).toEqual({
			user: undefined,
			session: { action: 'clear' }
		});
		expect(validateSession(db, token, t0 + 30 * day - 1).session).toEqual({ action: 'clear' });
	});

	it('Daily use keeps the session alive for 60 days, renewing the cookie', () => {
		const { token } = start();
		let renewals = 0;
		for (let n = 1; n <= 60; n++) {
			const result = validateSession(db, token, t0 + n * day);
			expect(result.user?.id).toBe(userId);
			if (result.session.action === 'renew') renewals++;
		}
		// Exactly a day apart, a renewal leaves 29 days the next day: every other visit renews.
		expect(renewals).toBe(30);
	});

	it('clears signed-out and unknown tokens', () => {
		const { token } = start();
		invalidateSession(db, token);
		expect(validateSession(db, token, t0).session).toEqual({ action: 'clear' });
		expect(validateSession(db, generateSessionToken(), t0).session).toEqual({ action: 'clear' });
	});
});
