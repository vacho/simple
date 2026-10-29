// Account management by administrators (spec user-auth; ADR 0027), against a migrated database.
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { anonymous, type UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Conflict, Forbidden, Invalid } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { users } from '../../../server/db/schema.ts';
import {
	createAccount,
	listAccounts,
	setActive,
	setOwnPassword,
	setRole,
	setTemporaryPassword
} from './service.ts';

const db = createTestDatabase();
const actor = (id: number, role: UserActor['role']): UserActor => ({
	kind: 'user',
	id,
	role,
	locale: null,
	timeZone: null,
	passwordTemporary: false
});
const insert = (username: string, role: UserActor['role']) =>
	db
		.insert(users)
		.values({ username, displayName: username, passwordHash: 'h', role, createdAt: new Date() })
		.returning()
		.get().id;
const adminId = insert('ana', 'admin');
const admin = testCtx(db, { actor: actor(adminId, 'admin') });
const row = (id: number) => db.select().from(users).where(eq(users.id, id)).get()!;
const account = (username: string, role = 'member') =>
	createAccount(admin, { displayName: 'Lucía', username, role, passwordHash: 'hash' });

describe('Administrators create accounts for members', () => {
	it('Create an account for a member: active, with a temporary password stored as given', () => {
		const id = account(' Lucia ');
		expect(row(id)).toMatchObject({
			username: 'lucia',
			displayName: 'Lucía',
			role: 'member',
			active: true,
			passwordTemporary: true,
			passwordHash: 'hash'
		});
	});

	it('Username already taken: "Lucia" after "lucia"', () => {
		expect(() => account('Lucia')).toThrow(new Conflict('users.username.taken'));
	});

	it('the username, display name and role rules apply', () => {
		expect(() => account('toño')).toThrow(Invalid);
		expect(() => account('valid.name', 'owner')).toThrow(Invalid);
	});

	it('Member cannot create accounts: denied, as is a visitor', () => {
		const member = testCtx(db, { actor: actor(row(account('pedro')).id, 'member') });
		expect(() =>
			createAccount(member, {
				displayName: 'X',
				username: 'xx1',
				role: 'member',
				passwordHash: 'h'
			})
		).toThrow(Forbidden);
		expect(() =>
			createAccount(testCtx(db, { actor: anonymous }), {
				displayName: 'X',
				username: 'xx2',
				role: 'member',
				passwordHash: 'h'
			})
		).toThrow(Forbidden);
	});

	it('accounts are listed for administrators only, without password hashes', () => {
		const list = listAccounts(admin);
		expect(list.map((entry) => entry.username)).toEqual(expect.arrayContaining(['ana', 'lucia']));
		expect(list.every((entry) => !('passwordHash' in entry))).toBe(true);
		expect(() => listAccounts(testCtx(db, { actor: actor(99, 'member') }))).toThrow(Forbidden);
	});
});

describe('Account roles', () => {
	it('Promote a member to administrator, then Demote an administrator', () => {
		const id = account('marta');
		setRole(admin, id, 'admin');
		expect(row(id).role).toBe('admin');
		setRole(admin, id, 'member');
		expect(row(id).role).toBe('member');
	});

	it('Member cannot change roles: not even their own', () => {
		const id = account('nico');
		const nico = testCtx(db, { actor: actor(id, 'member') });
		expect(() => setRole(nico, id, 'admin')).toThrow(Forbidden);
		expect(() => setRole(nico, adminId, 'member')).toThrow(Forbidden);
		expect(row(id).role).toBe('member');
	});
});

describe('At least one active administrator', () => {
	it('Own account cannot be deactivated', () => {
		expect(() => setActive(admin, adminId, false)).toThrow(Forbidden);
		expect(row(adminId).active).toBe(true);
	});

	it('Own role cannot be changed', () => {
		expect(() => setRole(admin, adminId, 'member')).toThrow(Forbidden);
		expect(row(adminId).role).toBe('admin');
	});

	it('Concurrent demotions of the last two administrators: exactly one succeeds', () => {
		// Each request carries the actor it resolved before the other's change committed.
		const other = createTestDatabase();
		const first = other
			.insert(users)
			.values({
				username: 'a1',
				displayName: 'A1',
				passwordHash: 'h',
				role: 'admin',
				createdAt: new Date()
			})
			.returning()
			.get().id;
		const second = other
			.insert(users)
			.values({
				username: 'a2',
				displayName: 'A2',
				passwordHash: 'h',
				role: 'admin',
				createdAt: new Date()
			})
			.returning()
			.get().id;
		const attempts = [
			() => setRole(testCtx(other, { actor: actor(first, 'admin') }), second, 'member'),
			() => setActive(testCtx(other, { actor: actor(second, 'admin') }), first, false)
		];
		const outcomes = attempts.map((attempt) => {
			try {
				attempt();
				return 'ok';
			} catch (error) {
				return error;
			}
		});
		expect(outcomes.filter((outcome) => outcome === 'ok')).toHaveLength(1);
		expect(outcomes).toContainEqual(new Conflict('users.last_admin'));
		const admins = other
			.select()
			.from(users)
			.all()
			.filter((u) => u.role === 'admin' && u.active);
		expect(admins).toHaveLength(1);
	});

	it('deactivating a member account never trips the administrator rule', () => {
		const id = account('olga');
		setActive(admin, id, false);
		expect(row(id).active).toBe(false);
		setActive(admin, id, true);
		expect(row(id).active).toBe(true);
	});
});

describe('passwords', () => {
	it('an administrator sets a temporary password for another user, not for themselves', () => {
		const id = account('raquel');
		db.update(users).set({ passwordTemporary: false }).where(eq(users.id, id)).run();
		setTemporaryPassword(admin, id, 'new-hash');
		expect(row(id)).toMatchObject({ passwordHash: 'new-hash', passwordTemporary: true });
		expect(() => setTemporaryPassword(admin, adminId, 'x')).toThrow(Forbidden);
	});

	it("a user's own password is never temporary", () => {
		const id = account('sara');
		setOwnPassword(
			testCtx(db, { actor: { ...actor(id, 'member'), passwordTemporary: true } }),
			'mine'
		);
		expect(row(id)).toMatchObject({ passwordHash: 'mine', passwordTemporary: false });
		expect(() => setOwnPassword(testCtx(db, { actor: anonymous }), 'x')).toThrow(Forbidden);
	});
});
