// Members and their accounts (spec household, spec user-auth; ADR 0026).
import { v7 } from 'uuid';
import { describe, expect, it } from 'vitest';
import type { UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Conflict, Forbidden } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { users } from '../../../server/db/schema.ts';
import { signIn } from '../../auth/server/index.ts';
import {
	createAccountForMember,
	createMember,
	createMemberType,
	deleteMember,
	getMember,
	linkAccount,
	listUnlinkedAccounts,
	unlinkAccount
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
const adminId = db
	.insert(users)
	.values({
		username: 'osvaldo',
		displayName: 'Osvaldo',
		passwordHash: 'h',
		role: 'admin',
		createdAt: new Date()
	})
	.returning()
	.get().id;
const admin = testCtx(db, { actor: actor(adminId, 'admin') });
const typeId = v7();
createMemberType(admin, { id: typeId, name: 'Adulto', baseClass: 'adult' });
const newMember = (name: string) => {
	const id = v7();
	createMember(admin, { id, name, memberTypeId: typeId });
	return id;
};
const details = (username: string) => ({
	displayName: 'Lucía',
	username,
	role: 'member',
	password: 'primer-dia-2026'
});
const caught = (promise: Promise<unknown>) =>
	promise.then(
		() => undefined,
		(error) => error
	);
const accountCount = () => db.select().from(users).all().length;

describe('Administrators create accounts for members', () => {
	it('Create an account for a member: linked, active, temporary password, signs in', async () => {
		const lucia = newMember('Lucía');
		await createAccountForMember(admin, lucia, details('lucia'));
		expect(getMember(admin, lucia).account).toMatchObject({
			username: 'lucia',
			role: 'member',
			active: true
		});
		expect(getMember(admin, lucia).firstLinkedAt).toBeInstanceOf(Date);
		await signIn(testCtx(db), {
			username: 'lucia',
			password: 'primer-dia-2026',
			address: '10.4.0.1'
		});
	});

	it('Duplicate account submission, and Member already has an account: refused, nothing more created', async () => {
		const mateo = newMember('Mateo');
		await createAccountForMember(admin, mateo, details('mateo'));
		const before = accountCount();
		const error = await caught(createAccountForMember(admin, mateo, details('mateo2')));
		expect(error).toEqual(new Conflict('household.member.has_account'));
		expect(accountCount()).toBe(before);
	});

	it('the account and the link are made together or not at all', async () => {
		const sofia = newMember('Sofía');
		const before = accountCount();
		expect(await caught(createAccountForMember(admin, sofia, details('lucia')))).toEqual(
			new Conflict('users.username.taken')
		);
		expect(accountCount()).toBe(before);
		expect(getMember(admin, sofia).account).toBeNull();
	});

	it('a member user cannot create accounts or link them', async () => {
		const member = testCtx(db, { actor: actor(99, 'member') });
		const id = newMember('Nadie');
		expect(await caught(createAccountForMember(member, id, details('nadie')))).toBeInstanceOf(
			Forbidden
		);
		expect(() => linkAccount(member, id, adminId)).toThrow(Forbidden);
		expect(() => unlinkAccount(member, id)).toThrow(Forbidden);
		expect(() => listUnlinkedAccounts(member)).toThrow(Forbidden);
	});
});

describe('Member linked to at most one account', () => {
	it('Link the setup administrator to a member: Osvaldo has an account', () => {
		const osvaldo = newMember('Osvaldo');
		expect(listUnlinkedAccounts(admin).map((account) => account.username)).toContain('osvaldo');
		linkAccount(admin, osvaldo, adminId);
		expect(getMember(admin, osvaldo).account).toMatchObject({ username: 'osvaldo' });
		expect(listUnlinkedAccounts(admin).map((account) => account.username)).not.toContain('osvaldo');
	});

	it('Account already linked: refused, both links unchanged', () => {
		const other = newMember('Otro');
		expect(() => linkAccount(admin, other, adminId)).toThrow(
			new Conflict('household.account.linked')
		);
		expect(getMember(admin, other).account).toBeNull();
	});

	it('Unlink an account: it still exists, signs in, and can be linked again', async () => {
		const osvaldo = getMemberId('Osvaldo');
		const lucia = getMemberId('Lucía');
		unlinkAccount(admin, lucia);
		expect(getMember(admin, lucia).account).toBeNull();
		await signIn(testCtx(db), {
			username: 'lucia',
			password: 'primer-dia-2026',
			address: '10.4.0.2'
		});
		const luciaUser = db
			.select()
			.from(users)
			.all()
			.find((row) => row.username === 'lucia')!.id;
		linkAccount(admin, lucia, luciaUser);
		expect(getMember(admin, lucia).account).toMatchObject({ username: 'lucia' });
		expect(getMember(admin, osvaldo).account).toMatchObject({ username: 'osvaldo' });
	});

	it('Previously linked member cannot be deleted, even after unlinking', () => {
		const lucia = getMemberId('Lucía');
		unlinkAccount(admin, lucia);
		expect(() => deleteMember(admin, lucia)).toThrow(new Conflict('household.member.ever_linked'));
	});
});

function getMemberId(name: string) {
	const row = db.query.members
		.findFirst({ where: (members, { eq }) => eq(members.name, name) })
		.sync();
	return row!.id;
}
