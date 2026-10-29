import { describe, expect, it } from 'vitest';
import { systemActor, type UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Conflict, Forbidden, Invalid } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { users } from '../../../server/db/schema.ts';
import { seed } from '../../languages/server/index.ts';
import { hashPassword } from '../../auth/server/password.ts';
import {
	createAdmin,
	getCredentialsForSignIn,
	getProfile,
	hasAnyUser,
	updateProfile
} from './service.ts';

const db = createTestDatabase();
const system = testCtx(db, { actor: systemActor('users test') });
seed(system);
const as = (actor: UserActor) => testCtx(db, { actor });
const user = (id: number, role: UserActor['role']): UserActor => ({
	kind: 'user',
	id,
	role,
	locale: null,
	timeZone: null
});

const password = '  secret phrase  ';
const passwordHash = await hashPassword(password);
const adminId = createAdmin(system, {
	displayName: '  María José Ñuflo ',
	username: ' Ana ',
	passwordHash,
	timeZone: 'America/La_Paz'
});
// A second account, created directly: admin creation of members comes in a later change.
const memberId = db
	.insert(users)
	.values({
		username: 'luis',
		displayName: 'Luis',
		passwordHash,
		role: 'member',
		createdAt: new Date()
	})
	.returning()
	.get().id;
const admin = user(adminId, 'admin');
const member = user(memberId, 'member');

describe('createAdmin', () => {
	it('creates the administrator with normalized names and no saved language', () => {
		expect(getProfile(as(admin), adminId)).toEqual({
			id: adminId,
			username: 'ana',
			displayName: 'María José Ñuflo',
			role: 'admin',
			locale: null,
			timeZone: 'America/La_Paz'
		});
	});

	it('Username uniqueness ignores case: "ANA" is a duplicate of "ana"', () => {
		expect(() =>
			createAdmin(system, { displayName: 'Other', username: 'ANA', passwordHash, timeZone: null })
		).toThrow(Conflict);
	});

	it('Password is never stored in plain text', () => {
		const row = db
			.select()
			.from(users)
			.all()
			.find((entry) => entry.id === adminId);
		expect(row?.passwordHash).toMatch(/^\$argon2id\$/);
		expect(JSON.stringify(row)).not.toContain(password.trim());
	});

	it('is reserved to the application itself', () => {
		const input = { displayName: 'X', username: 'xavier', passwordHash, timeZone: null };
		expect(() => createAdmin(as(admin), input)).toThrow(Forbidden);
	});
});

describe('profiles', () => {
	it('Own profile is allowed', () => {
		expect(getProfile(as(member), memberId).username).toBe('luis');
		updateProfile(as(member), memberId, { locale: 'es', timeZone: 'Asia/Kolkata' });
		expect(getProfile(as(member), memberId)).toMatchObject({
			locale: 'es',
			timeZone: 'Asia/Calcutta'
		});
	});

	it("Another user's profile is denied", () => {
		expect(() => getProfile(as(member), adminId)).toThrow(Forbidden);
		expect(() => updateProfile(as(member), adminId, { locale: null })).toThrow(Forbidden);
	});

	it('Administrator views another profile', () => {
		expect(getProfile(as(admin), memberId).username).toBe('luis');
		updateProfile(as(admin), memberId, { locale: null });
		expect(getProfile(as(admin), memberId).locale).toBeNull();
	});

	it('rejects a language that is not installed and an invalid time zone', () => {
		expect(() => updateProfile(as(member), memberId, { locale: 'fr' })).toThrow(Invalid);
		expect(() => updateProfile(as(member), memberId, { timeZone: '+02:00' })).toThrow(Invalid);
	});
});

describe('internal operations', () => {
	it('only the application checks whether any account exists', () => {
		expect(hasAnyUser(system)).toBe(true);
		expect(() => hasAnyUser(as(admin))).toThrow(Forbidden);
		expect(() => hasAnyUser(testCtx(db))).toThrow(Forbidden);
	});

	it('Administrator cannot read credentials; the application can', () => {
		expect(() => getCredentialsForSignIn(as(admin), 'luis')).toThrow(Forbidden);
		expect(() => getCredentialsForSignIn(as(member), 'luis')).toThrow(Forbidden);
		expect(getCredentialsForSignIn(system, ' LUIS ')?.passwordHash).toBe(passwordHash);
		expect(getCredentialsForSignIn(system, 'nobody')).toBeUndefined();
	});

	it('never returns a password hash in a profile', () => {
		expect(getProfile(as(admin), memberId)).not.toHaveProperty('passwordHash');
	});
});
