// The members list (spec household): members with their type, and for administrators their
// linked account. Reading `users` here is the one cross-feature read path ADR 0008 allows.
import { asc, eq, isNull, notExists } from 'drizzle-orm';
import type { Db } from '../../../server/db/client.ts';
import { users } from '../../users/server/schema.ts';
import { members, memberTypes } from './schema.ts';

const memberColumns = {
	id: members.id,
	name: members.name,
	memberTypeId: members.memberTypeId,
	typeName: memberTypes.name,
	baseClass: memberTypes.baseClass,
	archivedAt: members.archivedAt
};

const withAccounts = (db: Db) =>
	db
		.select({
			...memberColumns,
			firstLinkedAt: members.firstLinkedAt,
			account: {
				userId: users.id,
				username: users.username,
				role: users.role,
				active: users.active,
				passwordTemporary: users.passwordTemporary
			}
		})
		.from(members)
		.innerJoin(memberTypes, eq(members.memberTypeId, memberTypes.id))
		.leftJoin(users, eq(members.userId, users.id));

/** Active members, with only what every signed-in user may see. */
export function listActiveMembers(db: Db) {
	return db
		.select(memberColumns)
		.from(members)
		.innerJoin(memberTypes, eq(members.memberTypeId, memberTypes.id))
		.where(isNull(members.archivedAt))
		.orderBy(asc(members.nameKey))
		.all();
}

/** Every member with their linked account, for administrators. */
export function listMembersWithAccounts(db: Db) {
	return withAccounts(db).orderBy(asc(members.nameKey)).all();
}

/** One member with their linked account, for the administrators' member page. */
export function findMemberWithAccount(db: Db, id: string) {
	return withAccounts(db).where(eq(members.id, id)).get();
}

/** Accounts linked to no member, which an administrator may link to one. */
export function listUnlinkedAccounts(db: Db) {
	return db
		.select({ userId: users.id, username: users.username, displayName: users.displayName })
		.from(users)
		.where(notExists(db.select().from(members).where(eq(members.userId, users.id))))
		.orderBy(asc(users.username))
		.all();
}

export function accountExists(db: Db, userId: number): boolean {
	return db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get() !== undefined;
}

export function memberOfAccount(db: Db, userId: number) {
	return db.select({ id: members.id }).from(members).where(eq(members.userId, userId)).get();
}
