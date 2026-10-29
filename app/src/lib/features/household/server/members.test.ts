// Members (spec household) against a migrated database, called as each kind of actor.
import { v7 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { anonymous, type UserActor } from '../../../server/core/actor.ts';
import { testCtx } from '../../../server/core/ctx.ts';
import { Conflict, Forbidden, Invalid, NotFound } from '../../../server/core/errors.ts';
import { createTestDatabase } from '../../../server/db/test-database.ts';
import { members, users } from '../../../server/db/schema.ts';
import { eq } from 'drizzle-orm';
import {
	archiveMember,
	archiveMemberType,
	createMember,
	createMemberType,
	deleteMember,
	getMember,
	listMembers,
	unarchiveMember,
	updateMember
} from './service.ts';

const db = createTestDatabase();
const user = (role: UserActor['role'], id: number): UserActor => ({
	kind: 'user',
	id,
	role,
	locale: null,
	timeZone: null,
	passwordTemporary: false
});
const admin = testCtx(db, { actor: user('admin', 1) });
const member = testCtx(db, { actor: user('member', 2) });
const visitor = testCtx(db, { actor: anonymous });

const newType = (name: string, baseClass = 'minor') => {
	const id = v7();
	createMemberType(admin, { id, name, baseClass });
	return id;
};
const hija = newType('Hija');
const adulto = newType('Adulto', 'adult');
const newMember = (name: string, memberTypeId = hija) => {
	const id = v7();
	createMember(admin, { id, name, memberTypeId });
	return id;
};
const names = (ctx = admin) => listMembers(ctx).members.map((entry) => entry.name);
/** An account linked to the member, written directly: linking has its own tests. */
const linkAccount = (memberId: string, active: boolean) => {
	const userId = db
		.insert(users)
		.values({
			username: `u${memberId.slice(-8)}`,
			displayName: 'U',
			passwordHash: 'x',
			role: 'member',
			active,
			createdAt: new Date()
		})
		.returning()
		.get().id;
	db.update(members)
		.set({ userId, firstLinkedAt: new Date() })
		.where(eq(members.id, memberId))
		.run();
	return userId;
};

describe('Members', () => {
	it('Create a member: "Lucía" with the type "Hija"', () => {
		const id = newMember('Lucía');
		expect(listMembers(admin).members.find((entry) => entry.id === id)).toMatchObject({
			name: 'Lucía',
			typeName: 'Hija',
			baseClass: 'minor'
		});
	});

	it('Duplicate member name: "lucía" after "Lucía", by creation or rename', () => {
		expect(() => newMember('lucía')).toThrow(new Conflict('household.name.taken'));
		const other = newMember('Mateo');
		expect(() => updateMember(admin, other, { name: 'LUCÍA' })).toThrow(Conflict);
	});

	it('a duplicate name counts archived members too', () => {
		const id = newMember('Tía Rosa');
		archiveMember(admin, id);
		expect(() => newMember('tía rosa')).toThrow(Conflict);
	});

	it('Duplicate member submission: the same ID and content twice is one member', () => {
		const id = v7();
		createMember(admin, { id, name: 'Sofía', memberTypeId: hija });
		createMember(admin, { id, name: 'Sofía', memberTypeId: hija });
		expect(names().filter((name) => name === 'Sofía')).toHaveLength(1);
	});

	it('Conflicting member submission: the same ID with another name or type is rejected', () => {
		const id = v7();
		createMember(admin, { id, name: 'Pablo', memberTypeId: hija });
		expect(() => createMember(admin, { id, name: 'Pablo', memberTypeId: adulto })).toThrow(
			new Conflict('household.id.conflict')
		);
		expect(() => createMember(admin, { id, name: 'Pedro', memberTypeId: hija })).toThrow(Conflict);
		expect(getMember(admin, id)).toMatchObject({ name: 'Pablo', memberTypeId: hija });
	});

	it('Archived type cannot be chosen: for a new member or a type change', () => {
		const old = newType('Antiguo');
		const id = newMember('Elena', old);
		archiveMemberType(admin, old);
		expect(() => newMember('Raúl', old)).toThrow(Invalid);
		const other = newMember('Raúl');
		expect(() => updateMember(admin, other, { memberTypeId: old })).toThrow(Invalid);
		expect(getMember(admin, other).memberTypeId).toBe(hija);
		// A member keeps an archived type they already have, and can still be renamed.
		updateMember(admin, id, { name: 'Elena M.', memberTypeId: old });
		expect(getMember(admin, id)).toMatchObject({ name: 'Elena M.', typeName: 'Antiguo' });
	});

	it('Members need a member type: an unknown type is refused', () => {
		expect(() => newMember('Nadie', v7())).toThrow(Invalid);
	});

	it('a member changes name and type', () => {
		const id = newMember('Tomás');
		updateMember(admin, id, { name: 'Tomás P.', memberTypeId: adulto });
		expect(getMember(admin, id)).toMatchObject({ name: 'Tomás P.', baseClass: 'adult' });
	});
});

describe('Archiving members', () => {
	it('Archive a member: only administrators still see him, as archived', () => {
		const id = newMember('Tío Carlos', adulto);
		archiveMember(admin, id);
		expect(names(member)).not.toContain('Tío Carlos');
		expect(getMember(admin, id).archivedAt).toBeInstanceOf(Date);
		expect(names(admin)).toContain('Tío Carlos');
	});

	it('Member with an active account cannot be archived', () => {
		const id = newMember('Ana', adulto);
		linkAccount(id, true);
		expect(() => archiveMember(admin, id)).toThrow(new Conflict('household.member.active_account'));
		expect(getMember(admin, id).archivedAt).toBeNull();
	});

	it('a member whose account is deactivated can be archived', () => {
		const id = newMember('Beto', adulto);
		linkAccount(id, false);
		archiveMember(admin, id);
		expect(getMember(admin, id).archivedAt).toBeInstanceOf(Date);
	});

	it('Previously linked member cannot be deleted', () => {
		const id = newMember('Carla', adulto);
		linkAccount(id, false);
		db.update(members).set({ userId: null }).where(eq(members.id, id)).run();
		expect(() => deleteMember(admin, id)).toThrow(new Conflict('household.member.ever_linked'));
		expect(getMember(admin, id)).toBeDefined();
	});

	it('Delete a member never linked: it no longer exists', () => {
		const id = newMember('Temporal');
		deleteMember(admin, id);
		expect(() => getMember(admin, id)).toThrow(NotFound);
	});

	it('Unarchive a member: every signed-in user sees him again', () => {
		const id = listMembers(admin).members.find((entry) => entry.name === 'Tío Carlos')!.id;
		unarchiveMember(admin, id);
		expect(names(member)).toContain('Tío Carlos');
	});
});

describe('Household visible to every signed-in user', () => {
	it('Member views the household: active members with types and base classes, nothing more', () => {
		const list = listMembers(member);
		expect(list.withAccounts).toBe(false);
		expect(list.members.every((entry) => entry.archivedAt === null)).toBe(true);
	});

	it('Account details are hidden from members: no usernames, roles or states', () => {
		for (const entry of listMembers(member).members) {
			expect(Object.keys(entry).sort()).toEqual(
				['archivedAt', 'baseClass', 'id', 'memberTypeId', 'name', 'typeName'].sort()
			);
		}
	});

	it('Administrator views the household: archived members and linked accounts', () => {
		const list = listMembers(admin);
		expect(list.withAccounts).toBe(true);
		const ana = list.members.find((entry) => entry.name === 'Ana');
		expect(ana).toMatchObject({ account: { role: 'member', active: true } });
		expect(list.members.some((entry) => entry.archivedAt !== null)).toBe(true);
	});

	it('Member cannot change members: every change is denied', () => {
		const id = newMember('Intocable');
		const attempts = [
			() => createMember(member, { id: v7(), name: 'X', memberTypeId: hija }),
			() => updateMember(member, id, { name: 'Y' }),
			() => archiveMember(member, id),
			() => unarchiveMember(member, id),
			() => deleteMember(member, id),
			() => getMember(member, id)
		];
		for (const attempt of attempts) expect(attempt).toThrow(Forbidden);
		expect(getMember(admin, id).name).toBe('Intocable');
	});

	it('Visitors cannot see the household', () => {
		expect(() => listMembers(visitor)).toThrow(Forbidden);
	});
});
